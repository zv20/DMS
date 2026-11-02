using Microsoft.UI.Xaml;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Services;
using System.IO;


namespace DMS;

public partial class App : Application
{
    public static IServiceProvider Services { get; private set; } = null!;
    public static ILogger<App> Logger { get; private set; } = null!;
    public static Window CurrentWindow { get; private set; } = null!;
    public static LocalLogStore LogStore { get; } = LocalLogStore.CreateDefault();

    public App()
    {
        // Record unexpected failures without marking them handled: continuing
        // after an unknown UI or process error could leave data inconsistent.
        UnhandledException += (_, e) => LogStore.Write(LogLevel.Critical, "UI", "Unhandled UI exception", e.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, e) => LogStore.Write(LogLevel.Critical, "Process", "Unhandled process exception", e.ExceptionObject as Exception);
        TaskScheduler.UnobservedTaskException += (_, e) => LogStore.Write(LogLevel.Error, "Task", "Unobserved background task exception", e.Exception);
        this.InitializeComponent();
    }

    protected override async void OnLaunched(LaunchActivatedEventArgs args)
    {
        var services = ConfigureServices();
        Services = services;
        Logger = services.GetRequiredService<ILogger<App>>();

        Logger.LogInformation("DMS starting...");

        var startup = new StartupWindow();
        CurrentWindow = startup;
        startup.RetryRequested += async (_, _) => await InitializeAndOpenAsync(startup);
        startup.Activate();
        await Task.Delay(50); // Give the window a chance to paint before database work begins.
        if (startup.IsClosed) return;
        await InitializeAndOpenAsync(startup);
    }

    private static async Task InitializeAndOpenAsync(StartupWindow startup)
    {
        var began = System.Diagnostics.Stopwatch.StartNew();
        var language = "bg";
        var fatalRecovery = false;
        startup.ShowLoading("Preparing your kitchen... / Подготвяме приложението...");
        try
        {
            var database = Services.GetRequiredService<IDatabaseService>();
            var requestPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DMS", "installer-request.ini");
            if (File.Exists(requestPath))
            {
                var request = InstallerRequest.Read(requestPath);
                language = request.Language ?? language;
                if (!string.IsNullOrWhiteSpace(request.Backup) && await startup.ConfirmInstallerRestoreAsync(request.Backup, language))
                {
                    while (true)
                    {
                        try { await database.RestoreFromAsync(request.Backup); break; }
                        catch (Exception ex)
                        {
                            Logger.LogError(ex, "Installer backup restore failed");
                            // If automatic recovery failed, do not reopen or initialize
                            // the database until the recovery backup is handled.
                            if (ex is DatabaseRecoveryRequiredException || ex.InnerException is AggregateException) { fatalRecovery = true; throw; }
                            if (!await startup.RetryInstallerRestoreAsync(ex.Message, language)) break;
                        }
                    }
                }
                if (startup.IsClosed) return;
                if (request.Language != null) await Services.GetRequiredService<ISettingsService>().SetLanguageAsync(request.Language);
                File.Delete(requestPath);
            }
            var settings = await Services.GetRequiredService<ISettingsService>().LoadAsync();
            if (startup.IsClosed) return;
            language = settings.Language;
            Localization.Apply(language);
            AppearanceService.ApplyAccent(settings.AccentColor);
            startup.ShowLoading(Localization.Get("StartupRecipes"));
            await database.GetAllRecipesAsync();
            if (startup.IsClosed) return;
            startup.ShowLoading(Localization.Get("StartupIngredients"));
            await database.GetAllIngredientsAsync();
            if (startup.IsClosed) return;
            var remaining = TimeSpan.FromMilliseconds(600) - began.Elapsed;
            if (remaining > TimeSpan.Zero) await Task.Delay(remaining);
            if (startup.IsClosed) return;

            var window = new MainWindow();
            CurrentWindow = window;
            window.Activate();
            startup.Close();
            Logger.LogInformation("MainWindow activated");
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Unable to start DMS");
            if (!startup.IsClosed)
            {
                if (fatalRecovery || ex is DatabaseRecoveryRequiredException)
                    startup.ShowFatalRecoveryError(language == "en" ? "Database recovery needs attention. Close DMS and restore the recovery backup shown below." : "Възстановяването на базата данни изисква внимание. Затворете DMS и възстановете посочения по-долу резервен архив.",
                        ex is DatabaseRecoveryRequiredException recovery ? RecoveryGuidance.Format(recovery, language) : ex.Message,
                        language == "en" ? "Close DMS" : "Затвори DMS");
                else
                    startup.ShowError(language == "en" ? "DMS could not start." : "DMS не успя да се стартира.", ex.Message,
                        language == "en" ? "Try again" : "Опитайте отново");
            }
        }
    }

    public static void ReloadLanguage()
    {
        var previous = CurrentWindow;
        CurrentWindow = new MainWindow(openSettings: true);
        CurrentWindow.Activate();
        previous.Close();
    }

    /// <summary>
    /// Restores data behind the startup screen, then replaces every page with a
    /// fresh main window so no old database-backed view remains in memory.
    /// </summary>
    public static async Task RestoreAndReloadAsync(string backupPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(backupPath);
        var previous = CurrentWindow;
        var startup = new StartupWindow();
        var databaseRestored = false;
        try
        {
            previous.AppWindow.Hide();
            CurrentWindow = startup;
            startup.ShowRestoreLoading(Localization.Get("StartupRestoringBackup"));
            startup.Activate();
            await Task.Delay(50); // Let the restore screen paint before database work starts.

            await Services.GetRequiredService<IDatabaseService>().RestoreFromAsync(backupPath);
            databaseRestored = true;
            startup.ShowRestoreLoading(Localization.Get("StartupReloading"));

            var settings = await Services.GetRequiredService<ISettingsService>().LoadAsync();
            Localization.Apply(settings.Language);
            AppearanceService.ApplyAccent(settings.AccentColor);
            await Services.GetRequiredService<IDatabaseService>().GetAllRecipesAsync();
            await Services.GetRequiredService<IDatabaseService>().GetAllIngredientsAsync();

            var window = new MainWindow();
            CurrentWindow = window;
            window.Activate();
            previous.Close();
            startup.AllowClose();
            startup.Close();
            Logger.LogInformation("Database restored and MainWindow reloaded");
        }
        catch (Exception ex) when (!databaseRestored)
        {
            Logger.LogError(ex, "Database restore failed before data replacement");
            CurrentWindow = previous;
            startup.AllowClose();
            startup.Close();
            previous.AppWindow.Show();
            throw;
        }
        catch (Exception ex)
        {
            // The data is restored, so never return to the old, stale pages.
            Logger.LogError(ex, "Database restored but the fresh application window could not be opened");
            previous.Close();
            CurrentWindow = startup;
            startup.RetryRequested += async (_, _) => await InitializeAndOpenAsync(startup);
            startup.ShowError(Localization.Get("RestoreReloadFailed"), ex.Message, Localization.Get("RetryAction"));
        }
    }

    private static IServiceProvider ConfigureServices()
    {
        var services = new ServiceCollection();

        // Logging
        services.AddLogging(builder =>
        {
            builder.AddDebug();
            builder.AddProvider(new LocalLogProvider(LogStore));
            builder.SetMinimumLevel(LogLevel.Information);
        });

        // Core services
        services.AddSingleton<IDatabaseService, DatabaseService>();
        services.AddSingleton<ISettingsService, SettingsService>();
        services.AddSingleton<INavigationService, NavigationService>();

        return services.BuildServiceProvider();
    }
}

using Microsoft.UI.Xaml;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Services;


namespace DMS;

public partial class App : Application
{
    public static IServiceProvider Services { get; private set; } = null!;
    public static ILogger<App> Logger { get; private set; } = null!;
    public static Window CurrentWindow { get; private set; } = null!;

    public App()
    {
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
        startup.ShowLoading("Preparing your kitchen... / Подготвяме приложението...");
        try
        {
            var settings = await Services.GetRequiredService<ISettingsService>().LoadAsync();
            if (startup.IsClosed) return;
            language = settings.Language;
            Localization.Apply(language);
            var database = Services.GetRequiredService<IDatabaseService>();
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
                startup.ShowError(language == "en" ? "DMS could not start." : "DMS не успя да се стартира.", ex.Message,
                    language == "en" ? "Try again" : "Опитайте отново");
        }
    }

    public static void ReloadLanguage()
    {
        var previous = CurrentWindow;
        CurrentWindow = new MainWindow(openSettings: true);
        CurrentWindow.Activate();
        previous.Close();
    }

    private static IServiceProvider ConfigureServices()
    {
        var services = new ServiceCollection();

        // Logging
        services.AddLogging(builder =>
        {
            builder.AddDebug();
            builder.SetMinimumLevel(LogLevel.Information);
        });

        // Core services
        services.AddSingleton<IDatabaseService, DatabaseService>();
        services.AddSingleton<ISettingsService, SettingsService>();
        services.AddSingleton<INavigationService, NavigationService>();

        return services.BuildServiceProvider();
    }
}

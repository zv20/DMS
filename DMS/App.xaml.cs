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

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        var services = ConfigureServices();
        Services = services;
        Logger = services.GetRequiredService<ILogger<App>>();

        Logger.LogInformation("DMS starting...");

        var window = new MainWindow();
        CurrentWindow = window;
        window.Activate();

        Logger.LogInformation("MainWindow activated");
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
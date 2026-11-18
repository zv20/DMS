using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Windowing;
using Microsoft.UI.Input;
using Windows.Graphics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Services;
using DMS.Views;

namespace DMS;

public sealed partial class MainWindow : Window
{
    private readonly bool _openSettings;
    private bool _navigationPending;
    private ToggleButton[] _navigationItems = [];
    private TextBlock[] _navigationLabels = [];
    private bool? _compactNavigation;
    private readonly WindowSizeLimits _sizeLimits;
    private RectInt32? _normalPlacement;
    private bool _placementLoaded, _closing, _allowClose;
    private DispatcherTimer? _performanceNavigationTimer;

    public MainWindow(bool openSettings = false)
    {
        _openSettings = openSettings;
        this.InitializeComponent();
        _navigationItems = [NavMenu, NavRecipes, NavIngredients, NavAllergens, NavTemplates, NavSettings];
        _navigationLabels = [LabelMenu, LabelRecipes, LabelIngredients, LabelAllergens, LabelTemplates, LabelSettings];
        for (var i = 0; i < _navigationItems.Length; i++)
        {
            var item = _navigationItems[i];
            var label = _navigationLabels[i].Text;
            ToolTipService.SetToolTip(item, label);
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(item, label);
        }
        NavArea.SizeChanged += (_, _) => { UpdateNavigationLayout(); UpdateTitleBarRegions(); };
        AppTitleBar.SizeChanged += (_, _) => UpdateTitleBarRegions();
        WindowIcon.Apply(this);
        CloseOutputButton.Content = Localization.Get("OutputClose");
        this.ExtendsContentIntoTitleBar = true;
        this.SetTitleBar(AppTitleBar);
        this.SystemBackdrop = new MicaBackdrop();
        _sizeLimits = new WindowSizeLimits(this, RootGrid);
        WindowPlacement.Center(AppWindow);
        AppWindow.Changed += WindowPlacementChanged;
        AppWindow.Closing += MainWindow_Closing;
    }

    private void UpdateNavigationLayout()
    {
        var compact = NavArea.ActualWidth < 800;
        if (_compactNavigation != compact)
        {
            _compactNavigation = compact;
            foreach (var label in _navigationLabels)
                label.Visibility = compact ? Visibility.Collapsed : Visibility.Visible;
        }
    }

    private void UpdateTitleBarRegions()
    {
        if (AppTitleBar.XamlRoot == null || NavArea.ActualWidth <= 0 || NavArea.ActualHeight <= 0) return;
        var scale = AppTitleBar.XamlRoot.RasterizationScale;
        var left = AppWindow.TitleBar.LeftInset / scale;
        var right = AppWindow.TitleBar.RightInset / scale;
        if (Math.Abs(TitleBarLeftInset.Width.Value - left) > 0.5) TitleBarLeftInset.Width = new GridLength(left);
        if (Math.Abs(TitleBarRightInset.Width.Value - right) > 0.5) TitleBarRightInset.Width = new GridLength(right);
        var bounds = NavArea.TransformToVisual(null).TransformBounds(new Windows.Foundation.Rect(0, 0, NavArea.ActualWidth, NavArea.ActualHeight));
        var area = new RectInt32((int)Math.Round(bounds.X * scale), (int)Math.Round(bounds.Y * scale),
            (int)Math.Round(bounds.Width * scale), (int)Math.Round(bounds.Height * scale));
        InputNonClientPointerSource.GetForWindowId(AppWindow.Id).SetRegionRects(NonClientRegionKind.Passthrough, [area]);
    }

    private async void RootGrid_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            RootGrid.XamlRoot.Changed += (_, _) => UpdateTitleBarRegions();
            UpdateTitleBarRegions();
            var settings = await App.Services.GetRequiredService<DatabaseService>().GetSettingsAsync();
            if (settings != null) WindowPlacement.RestoreOrCenter(AppWindow, settings);
            _placementLoaded = true;
            CaptureNormalPlacement();
            AppearanceService.ApplyTheme(this, settings?.Theme ?? "light", settings?.AccentColor ?? "blue");
            if (!ContentFrame.Navigate(_openSettings ? typeof(SettingsPage) : typeof(MenuPage)))
                throw new InvalidOperationException("The initial page could not be opened.");
            RestoreNavigationSelection();
            var database = App.Services.GetRequiredService<DatabaseService>();
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("DMS_QA_READY_FILE")) && !await database.IsSetupCompleteAsync())
            {
                if (await SetupWizard.ShowAsync(RootGrid.XamlRoot, database))
                {
                    await App.Services.GetRequiredService<SettingsService>().LoadAsync();
                    var configured = await database.GetSettingsAsync();
                    Localization.Apply(configured!.Language);
                    App.ReloadLanguage();
                    return;
                }
            }
            StartPerformanceNavigation();
            // An opt-in signal lets the packaging check verify that the installed
            // app reached its main window and loaded application resources.
            var readyFile = Environment.GetEnvironmentVariable("DMS_QA_READY_FILE");
            if (!string.IsNullOrWhiteSpace(readyFile))
            {
                RootGrid.UpdateLayout();
                if (_navigationItems.Any(item => !item.IsLoaded || item.ActualWidth <= 0 || item.ActualHeight <= 0))
                    throw new InvalidOperationException("Title-bar navigation did not render its items.");
                System.IO.File.WriteAllText(readyFile, Localization.Get("MenuViewSelected"));
            }
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Unable to load the initial application page");
            await ShowNavigationErrorAsync();
        }
    }

    private void WindowPlacementChanged(AppWindow sender, AppWindowChangedEventArgs args)
    {
        if (_placementLoaded && (args.DidSizeChange || args.DidPositionChange || args.DidPresenterChange))
            CaptureNormalPlacement();
    }

    private void CaptureNormalPlacement()
    {
        if (AppWindow.Presenter is not OverlappedPresenter { State: OverlappedPresenterState.Restored }) return;
        var position = AppWindow.Position;
        var size = AppWindow.Size;
        if (size.Width > 0 && size.Height > 0)
            _normalPlacement = new RectInt32(position.X, position.Y, size.Width, size.Height);
    }

    private async void MainWindow_Closing(AppWindow sender, AppWindowClosingEventArgs args)
    {
        if (_allowClose) return;
        args.Cancel = true;
        if (_closing) return;
        _closing = true;
        if (App.CurrentWindow == this && ContentFrame.Content is SettingsPage settingsPage)
        {
            try { if (!await settingsPage.CanLeaveAsync()) { _closing = false; return; } }
            catch (Exception ex) { _closing = false; App.Logger.LogError(ex, "Unable to confirm unsaved settings"); return; }
        }
        try
        {
            // A replaced window must not overwrite settings loaded from a restored backup.
            if (App.CurrentWindow == this && _normalPlacement is RectInt32 placement)
            {
                var database = App.Services.GetRequiredService<DatabaseService>();
                var settings = await database.GetSettingsAsync() ?? new DMS.Models.AppSettings();
                settings.WindowX = placement.X; settings.WindowY = placement.Y;
                settings.WindowWidth = placement.Width; settings.WindowHeight = placement.Height;
                await database.SaveSettingsAsync(settings);
            }
        }
        catch (Exception ex) { App.Logger.LogWarning(ex, "Unable to save window placement"); }
        try
        {
            if (App.CurrentWindow == this && _placementLoaded)
                await AutomaticBackup.CreateAsync(App.Services.GetRequiredService<DatabaseService>());
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Unable to create automatic backup");
            try
            {
                await new ContentDialog { XamlRoot = RootGrid.XamlRoot, Title = Localization.Get("AutomaticBackupFailedTitle"),
                    Content = Localization.Get("AutomaticBackupFailedMessage"), CloseButtonText = Localization.Get("Text_OK_9ce3bd") }.ShowAsync();
            }
            catch (Exception dialogError) { App.Logger.LogWarning(dialogError, "Unable to show automatic backup warning"); }
        }
        finally
        {
            _performanceNavigationTimer?.Stop();
            _allowClose = true;
            Close();
        }
    }

    private void RestoreNavigationSelection()
    {
        var pageType = ContentFrame.CurrentSourcePageType;
        foreach (var item in _navigationItems)
            item.IsChecked = PageForTag(item.Tag as string) == pageType;
    }

    private static Type? PageForTag(string? tag) => tag switch
    {
        "menu" => typeof(MenuPage),
        "recipes" => typeof(RecipesPage),
        "ingredients" => typeof(IngredientsPage),
        "allergens" => typeof(AllergensPage),
        "templateBuilder" => typeof(TemplateBuilderPage),
        "settings" => typeof(SettingsPage),
        _ => null
    };

    private async Task ShowNavigationErrorAsync()
    {
        try
        {
            var dialog = new ContentDialog { XamlRoot = RootGrid.XamlRoot, Title = Localization.Get("ErrorTitle"),
                Content = Localization.Get("ErrorNavigation"), CloseButtonText = Localization.Get("Text_OK_9ce3bd") };
            await dialog.ShowAsync();
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to show the navigation error"); }
    }

    private async void Navigation_Click(object sender, RoutedEventArgs args)
    {
        var pageType = PageForTag((sender as ToggleButton)?.Tag as string);

        if (pageType != null)
            await NavigateToAsync(pageType);
    }

    private async Task NavigateToAsync(Type pageType)
    {
        if (ContentFrame != null)
        {
            try
            {
            if (ContentFrame.CurrentSourcePageType == pageType) { RestoreNavigationSelection(); return; }
            if (ContentFrame.Content is IUnsavedEditor editor)
            {
                if (_navigationPending)
                {
                    RestoreNavigationSelection();
                    return;
                }
                _navigationPending = true;
                try
                {
                    if (!await editor.CanLeaveAsync())
                    {
                        RestoreNavigationSelection();
                        return;
                    }
                }
                finally { _navigationPending = false; }
            }
            if (!ContentFrame.Navigate(pageType)) throw new InvalidOperationException("The selected page could not be opened.");
            RestoreNavigationSelection();
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, "Unable to navigate to {Page}", pageType.Name);
                RestoreNavigationSelection();
                await ShowNavigationErrorAsync();
            }
        }
    }

    private void StartPerformanceNavigation()
    {
        var path = Environment.GetEnvironmentVariable("DMS_QA_NAVIGATION_FILE");
        if (string.IsNullOrWhiteSpace(path)) return;
        _performanceNavigationTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(50) };
        _performanceNavigationTimer.Tick += async (_, _) =>
        {
            if (!System.IO.File.Exists(path)) return;
            try
            {
                var tag = System.IO.File.ReadAllText(path).Trim();
                System.IO.File.Delete(path);
                if (tag == "output") { OpenMenuOutput(new DateTime(2026, 1, 5), false); return; }
                if (tag == "closeOutput")
                {
                    CloseMenuOutput();
                    if (OutputOverlay.Visibility == Visibility.Collapsed) PerformancePageSignal.Write("closeOutput", 1);
                    return;
                }
                if (tag is "pdf" or "png")
                {
                    var output = Environment.GetEnvironmentVariable(tag == "pdf" ? "DMS_QA_PDF_PATH" : "DMS_QA_PNG_PATH");
                    if (OutputFrame.Content is TemplateOutputPage preview && !string.IsNullOrWhiteSpace(output))
                        await preview.ExportPerformanceAsync(tag, output);
                    return;
                }
                if (tag is not ("recipes" or "ingredients" or "templateBuilder")) return;
                var pageType = PageForTag(tag);
                if (pageType == null) return;
                await NavigateToAsync(pageType);
            }
            catch (Exception ex) { App.Logger.LogWarning(ex, "Unable to process performance navigation command"); }
        };
        _performanceNavigationTimer.Start();
    }

    public void OpenMenuOutput(DateTime date, bool print)
    {
        if (OutputOverlay.Visibility == Visibility.Visible) return;
        foreach (var item in _navigationItems) item.IsEnabled = false;
        OutputOverlay.Visibility = Visibility.Visible;
        try
        {
            if (!OutputFrame.Navigate(typeof(TemplateOutputPage), Tuple.Create(date, print))) throw new InvalidOperationException("Unable to open the output preview.");
            if (OutputFrame.Content is TemplateOutputPage page)
            {
                page.CloseAvailabilityChanged += OutputCloseAvailabilityChanged;
                CloseOutputButton.IsEnabled = page.CanClose;
            }
            CloseOutputButton.Focus(FocusState.Programmatic);
        }
        catch
        {
            OutputFrame.Content = null;
            OutputOverlay.Visibility = Visibility.Collapsed;
            foreach (var item in _navigationItems) item.IsEnabled = true;
            throw;
        }
    }

    private void OutputCloseAvailabilityChanged(bool available) => CloseOutputButton.IsEnabled = available;

    private void CloseOutput_Click(object sender, RoutedEventArgs e) => CloseMenuOutput();

    private void OutputOverlay_KeyDown(object sender, Microsoft.UI.Xaml.Input.KeyRoutedEventArgs e)
    {
        if (e.Key != Windows.System.VirtualKey.Escape || !CloseOutputButton.IsEnabled) return;
        e.Handled = true;
        CloseMenuOutput();
    }

    private void CloseMenuOutput()
    {
        if (OutputFrame.Content is TemplateOutputPage page)
        {
            if (!page.CanClose) return;
            page.CloseAvailabilityChanged -= OutputCloseAvailabilityChanged;
        }
        OutputFrame.Content = null;
        OutputOverlay.Visibility = Visibility.Collapsed;
        foreach (var item in _navigationItems) item.IsEnabled = true;
        if (ContentFrame.Content is MenuPage menu) menu.FocusOutputButton();
    }

}

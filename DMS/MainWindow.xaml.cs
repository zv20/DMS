using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Services;
using DMS.Views;

namespace DMS;

public sealed partial class MainWindow : Window
{
    private readonly bool _openSettings;
    private bool _navigationPending;
    private bool _paneCollapsedForSize;
    private readonly WindowSizeLimits _sizeLimits;

    public MainWindow(bool openSettings = false)
    {
        _openSettings = openSettings;
        this.InitializeComponent();
        WindowIcon.Apply(this);
        if (NavView.SettingsItem is NavigationViewItem settingsItem)
            settingsItem.Content = Localization.Get("Text_Settings_c7f73b");
        CloseOutputButton.Content = Localization.Get("OutputClose");
        this.ExtendsContentIntoTitleBar = true;
        this.SetTitleBar(AppTitleBar);
        this.SystemBackdrop = new MicaBackdrop();
        RootGrid.SizeChanged += RootGrid_SizeChanged;
        _sizeLimits = new WindowSizeLimits(this, RootGrid);
    }

    private void RootGrid_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        var paneMode = e.NewSize.Width < 600 ? NavigationViewPaneDisplayMode.LeftMinimal : NavigationViewPaneDisplayMode.LeftCompact;
        if (NavView.PaneDisplayMode != paneMode) NavView.PaneDisplayMode = paneMode;
        // Preserve enough content width for planners and editors on narrow windows.
        if (e.NewSize.Width < 850 && NavView.IsPaneOpen)
        {
            NavView.IsPaneOpen = false;
            _paneCollapsedForSize = true;
        }
        else if (e.NewSize.Width >= 1050 && _paneCollapsedForSize)
        {
            NavView.IsPaneOpen = true;
            _paneCollapsedForSize = false;
        }
    }

    private async void RootGrid_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            var settings = await App.Services.GetRequiredService<IDatabaseService>().GetSettingsAsync();
            AppearanceService.ApplyTheme(this, settings?.Theme ?? "default", settings?.AccentColor ?? "blue");
            NavView.SelectedItem = _openSettings ? NavView.SettingsItem : NavView.MenuItems[0];
            if (!ContentFrame.Navigate(_openSettings ? typeof(SettingsPage) : typeof(MenuPage)))
                throw new InvalidOperationException("The initial page could not be opened.");
            // An opt-in signal lets the packaging check verify that the installed
            // app reached its main window and loaded application resources.
            var readyFile = Environment.GetEnvironmentVariable("DMS_QA_READY_FILE");
            if (!string.IsNullOrWhiteSpace(readyFile))
                System.IO.File.WriteAllText(readyFile, Localization.Get("MenuViewSelected"));
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Unable to load the initial application page");
            await ShowNavigationErrorAsync();
        }
    }

    private void RestoreNavigationSelection()
    {
        if (ContentFrame.CurrentSourcePageType == typeof(SettingsPage)) { NavView.SelectedItem = NavView.SettingsItem; return; }
        var tag = ContentFrame.CurrentSourcePageType == typeof(MenuPage) ? "menu" :
            ContentFrame.CurrentSourcePageType == typeof(RecipesPage) ? "recipes" :
            ContentFrame.CurrentSourcePageType == typeof(IngredientsPage) ? "ingredients" :
            ContentFrame.CurrentSourcePageType == typeof(AllergensPage) ? "allergens" :
            ContentFrame.CurrentSourcePageType == typeof(TemplateBuilderPage) ? "templateBuilder" : null;
        NavView.SelectedItem = NavView.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(item => Equals(item.Tag, tag));
    }

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

    private async void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        var tag = (args.InvokedItemContainer as NavigationViewItem)?.Tag as string;
        Type? pageType = args.IsSettingsInvoked ? typeof(SettingsPage) : tag switch
        {
            "menu" => typeof(MenuPage),
            "recipes" => typeof(RecipesPage),
            "ingredients" => typeof(IngredientsPage),
            "allergens" => typeof(AllergensPage),
            "templateBuilder" => typeof(TemplateBuilderPage),
            "settings" => typeof(SettingsPage),
            _ => null
        };

        if (pageType != null && ContentFrame != null)
        {
            try
            {
            if (ContentFrame.CurrentSourcePageType == pageType) return;
            if (ContentFrame.Content is IUnsavedEditor editor)
            {
                var currentTag = ContentFrame.Content switch
                {
                    MenuPage => "menu",
                    RecipesPage => "recipes",
                    IngredientsPage => "ingredients",
                    AllergensPage => "allergens",
                    TemplateBuilderPage => "templateBuilder",
                    _ => ""
                };
                if (_navigationPending)
                {
                    NavView.SelectedItem = NavView.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(item => Equals(item.Tag, currentTag));
                    return;
                }
                _navigationPending = true;
                try
                {
                    if (!await editor.CanLeaveAsync())
                    {
                        NavView.SelectedItem = NavView.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(item => Equals(item.Tag, currentTag));
                        return;
                    }
                }
                finally { _navigationPending = false; }
            }
            NavView.SelectedItem = args.IsSettingsInvoked ? NavView.SettingsItem : args.InvokedItemContainer;
            if (!ContentFrame.Navigate(pageType)) throw new InvalidOperationException("The selected page could not be opened.");
            }
            catch (Exception ex)
            {
                App.Logger.LogError(ex, "Unable to navigate to {Page}", pageType.Name);
                RestoreNavigationSelection();
                await ShowNavigationErrorAsync();
            }
        }
    }

    public void OpenMenuOutput(DateTime date)
    {
        if (OutputOverlay.Visibility == Visibility.Visible) return;
        NavView.IsEnabled = false;
        OutputOverlay.Visibility = Visibility.Visible;
        try
        {
            if (!OutputFrame.Navigate(typeof(TemplateOutputPage), date)) throw new InvalidOperationException("Unable to open the print preview.");
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
            NavView.IsEnabled = true;
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
        NavView.IsEnabled = true;
        if (ContentFrame.Content is MenuPage menu) menu.FocusOutputButton();
    }

}

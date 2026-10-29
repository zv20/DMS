using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.DependencyInjection;
using DMS.Services;
using DMS.Views;

namespace DMS;

public sealed partial class MainWindow : Window
{
    private readonly bool _openSettings;
    private bool _navigationPending;
    private bool _paneCollapsedForSize;

    public MainWindow(bool openSettings = false)
    {
        _openSettings = openSettings;
        this.InitializeComponent();
        WindowIcon.Apply(this);
        if (NavView.SettingsItem is NavigationViewItem settingsItem)
            settingsItem.Content = Localization.Get("Text_Settings_c7f73b");
        this.ExtendsContentIntoTitleBar = true;
        this.SetTitleBar(AppTitleBar);
        this.SystemBackdrop = new MicaBackdrop();
        RootGrid.SizeChanged += RootGrid_SizeChanged;
    }

    private void RootGrid_SizeChanged(object sender, SizeChangedEventArgs e)
    {
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
        var settings = await App.Services.GetRequiredService<IDatabaseService>().GetSettingsAsync();
        AppearanceService.ApplyTheme(this, settings?.Theme ?? "system");
        // Navigate to Menu by default - ensure ContentFrame is ready
        if (ContentFrame != null)
        {
            NavView.SelectedItem = _openSettings ? NavView.SettingsItem : NavView.MenuItems[0];
            ContentFrame.Navigate(_openSettings ? typeof(SettingsPage) : typeof(MenuPage));
        }
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
            "templateBuilder" => typeof(TemplateBuilderV2Page),
            "templateV2Output" => typeof(TemplateV2OutputPage),
            "settings" => typeof(SettingsPage),
            _ => null
        };

        if (pageType != null && ContentFrame != null)
        {
            if (ContentFrame.CurrentSourcePageType == pageType) return;
            if (ContentFrame.Content is IUnsavedEditor editor)
            {
                var currentTag = ContentFrame.Content switch
                {
                    RecipesPage => "recipes",
                    IngredientsPage => "ingredients",
                    AllergensPage => "allergens",
                    TemplateBuilderV2Page => "templateBuilder",
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
            ContentFrame.Navigate(pageType);
        }
    }

    public void OpenMenuOutput(DateTime date)
    {
        NavView.SelectedItem = NavView.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(item => Equals(item.Tag, "templateV2Output"));
        ContentFrame.Navigate(typeof(TemplateV2OutputPage), date);
    }

}

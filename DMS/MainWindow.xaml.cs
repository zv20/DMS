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
            "templateBuilder" => typeof(TemplateBuilderPage),
            "settings" => typeof(SettingsPage),
            _ => null
        };

        if (pageType != null && ContentFrame != null)
        {
            if (ContentFrame.CurrentSourcePageType == pageType) return;
            if (ContentFrame.Content is RecipesPage recipes && pageType != typeof(RecipesPage))
            {
                if (_navigationPending)
                {
                    NavView.SelectedItem = NavView.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(item => Equals(item.Tag, "recipes"));
                    return;
                }
                _navigationPending = true;
                try
                {
                    if (!await recipes.CanLeaveAsync())
                    {
                        NavView.SelectedItem = NavView.MenuItems.OfType<NavigationViewItem>().FirstOrDefault(item => Equals(item.Tag, "recipes"));
                        return;
                    }
                }
                finally { _navigationPending = false; }
            }
            ContentFrame.Navigate(pageType);
        }
    }

}

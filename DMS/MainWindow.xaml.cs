using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.DependencyInjection;
using DMS.Services;
using DMS.Views;

namespace DMS;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        this.InitializeComponent();
        this.ExtendsContentIntoTitleBar = true;
        this.SetTitleBar(AppTitleBar);
        this.SystemBackdrop = new MicaBackdrop();

        Loaded += MainWindow_Loaded;
    }

    private void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        // Set default language from settings
        var settings = App.Services.GetRequiredService<ISettingsService>();
        var lang = settings.GetLanguage();
        LanguageSelector.SelectedIndex = lang == "en" ? 1 : 0;
    }

    private void NavView_Loaded(object sender, RoutedEventArgs e)
    {
        // Navigate to Menu by default
        NavView.SelectedItem = NavView.MenuItems[0];
        ContentFrame.Navigate(typeof(MenuPage));
    }

    private void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        if (args.InvokedItemContainer is not NavigationViewItem item) return;
        if (item.Tag is not string tag) return;

        Type? pageType = tag switch
        {
            "menu" => typeof(MenuPage),
            "recipes" => typeof(RecipesPage),
            "ingredients" => typeof(IngredientsPage),
            "allergens" => typeof(AllergensPage),
            "templateBuilder" => typeof(TemplateBuilderPage),
            "settings" => typeof(SettingsPage),
            _ => null
        };

        if (pageType != null)
        {
            ContentFrame.Navigate(pageType);
        }
    }

    private void LanguageSelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (LanguageSelector.SelectedItem is ComboBoxItem item && item.Tag is string lang)
        {
            var settings = App.Services.GetRequiredService<ISettingsService>();
            settings.SetLanguage(lang);
            // TODO: Apply language change (reload resources)
        }
    }
}
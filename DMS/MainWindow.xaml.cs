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
        
        // Debug: Verify ContentFrame exists after InitializeComponent
        System.Diagnostics.Debug.WriteLine($"[MainWindow] Constructor - ContentFrame: {ContentFrame?.GetType().Name}");
    }

    private void RootGrid_Loaded(object sender, RoutedEventArgs e)
    {
        System.Diagnostics.Debug.WriteLine($"[MainWindow] RootGrid_Loaded fired");
        
        // Set default language from settings
        var settings = App.Services.GetRequiredService<ISettingsService>();
        var lang = settings.GetLanguage();
        LanguageSelector.SelectedIndex = lang == "en" ? 1 : 0;

        // Navigate to Menu by default - ensure ContentFrame is ready
        if (ContentFrame != null)
        {
            System.Diagnostics.Debug.WriteLine($"[MainWindow] ContentFrame ready, navigating to MenuPage");
            NavView.SelectedItem = NavView.MenuItems[0];
            var result = ContentFrame.Navigate(typeof(MenuPage));
            System.Diagnostics.Debug.WriteLine($"[MainWindow] Navigate result: {result}");
        }
        else
        {
            System.Diagnostics.Debug.WriteLine($"[MainWindow] ERROR: ContentFrame is NULL!");
        }
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

        if (pageType != null && ContentFrame != null)
        {
            System.Diagnostics.Debug.WriteLine($"[MainWindow] NavView_ItemInvoked - navigating to {pageType.Name}");
            var result = ContentFrame.Navigate(pageType);
            System.Diagnostics.Debug.WriteLine($"[MainWindow] Navigate result: {result}");
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
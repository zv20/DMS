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
    }

    private void RootGrid_Loaded(object sender, RoutedEventArgs e)
    {
        // Navigate to Menu by default - ensure ContentFrame is ready
        if (ContentFrame != null)
        {
            NavView.SelectedItem = NavView.MenuItems[0];
            ContentFrame.Navigate(typeof(MenuPage));
        }
    }

    private void NavView_ItemInvoked(NavigationView sender, NavigationViewItemInvokedEventArgs args)
    {
        if (args.IsSettingsInvoked)
        {
            ContentFrame?.Navigate(typeof(SettingsPage));
            return;
        }
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
            ContentFrame.Navigate(pageType);
        }
    }

}

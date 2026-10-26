using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using System.Diagnostics;

namespace DMS.Views;

public sealed partial class MenuPage : Page
{
    public MenuPage()
    {
        Debug.WriteLine("[MenuPage] Constructor called");
        InitializeComponent();
        Debug.WriteLine("[MenuPage] InitializeComponent completed");
        this.Loaded += MenuPage_Loaded;
    }

    private void MenuPage_Loaded(object sender, RoutedEventArgs e)
    {
        Debug.WriteLine("[MenuPage] Loaded event fired");
    }
}
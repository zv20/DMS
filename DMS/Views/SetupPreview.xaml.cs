using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

public sealed partial class SetupPreview : UserControl
{
    public SetupPreview(MenuPage planner)
    {
        InitializeComponent();
        PreviewNavigation.SelectedItem = PreviewNavigation.MenuItems[0];
        PreviewContent.Content = planner;
    }
}

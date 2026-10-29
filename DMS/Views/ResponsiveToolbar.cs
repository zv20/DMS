using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class ResponsiveToolbar
{
    public static void Attach(Grid toolbar, FrameworkElement search)
    {
        var compact = false;
        toolbar.SizeChanged += (_, e) =>
        {
            var next = e.NewSize.Width < 480;
            if (next == compact) return;
            compact = next;
            toolbar.RowDefinitions.Clear();
            toolbar.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            if (compact) toolbar.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            toolbar.RowSpacing = compact ? 8 : 0;
            Grid.SetRow(search, compact ? 1 : 0);
            Grid.SetColumn(search, compact ? 0 : 1);
            Grid.SetColumnSpan(search, compact ? 2 : 1);
        };
    }
}

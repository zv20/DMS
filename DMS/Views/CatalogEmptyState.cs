using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class CatalogEmptyState
{
    public static void Update(int itemCount, int matchCount, FrameworkElement list, FrameworkElement panel,
        TextBlock title, FrameworkElement hint, FrameworkElement clearSearch, string emptyTitleKey, string noMatchesTitleKey)
    {
        var hasItems = itemCount > 0;
        var hasMatches = matchCount > 0;
        title.Text = Localization.Get(hasItems ? noMatchesTitleKey : emptyTitleKey);
        hint.Visibility = hasItems ? Visibility.Collapsed : Visibility.Visible;
        clearSearch.Visibility = hasItems && !hasMatches ? Visibility.Visible : Visibility.Collapsed;
        panel.Visibility = hasMatches ? Visibility.Collapsed : Visibility.Visible;
        list.Visibility = hasMatches ? Visibility.Visible : Visibility.Collapsed;
    }
}

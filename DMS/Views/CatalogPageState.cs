using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class CatalogPageState
{
    public static bool HasDuplicateName(string candidate, IEnumerable<string> otherNames)
    {
        var trimmed = candidate.Trim();
        return trimmed.Length > 0 && otherNames.Any(name => string.Equals(name.Trim(), trimmed, StringComparison.OrdinalIgnoreCase));
    }

    public static void SetStatus(TextBlock status, string? key)
    {
        status.Text = key == null ? "" : Localization.Get(key);
        status.Visibility = key == null ? Visibility.Collapsed : Visibility.Visible;
    }

    public static void UpdateEmptyState(int itemCount, int matchCount, FrameworkElement list, FrameworkElement panel,
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

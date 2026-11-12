using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class SearchPicker
{
    public static void Attach(AutoSuggestBox box, Func<string, object> suggestions)
    {
        void Update() => box.ItemsSource = suggestions(box.Text?.Trim() ?? "");
        box.TextChanged += (_, _) => Update();
        box.GotFocus += (_, _) => { Update(); box.IsSuggestionListOpen = true; };
        box.QuerySubmitted += (_, args) => { if (args.ChosenSuggestion == null) { Update(); box.IsSuggestionListOpen = true; } };
    }

    public static void ClearAfterSelection(AutoSuggestBox box)
        => box.DispatcherQueue.TryEnqueue(() => box.Text = "");
}

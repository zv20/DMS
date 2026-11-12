using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;

namespace DMS.Views;

internal static class SearchPicker
{
    public static void Attach(AutoSuggestBox box, Func<string, object> suggestions)
    {
        void Update() => box.ItemsSource = suggestions(box.Text?.Trim() ?? "");
        box.TextChanged += (_, _) => Update();
        box.GotFocus += (_, _) => { Update(); box.IsSuggestionListOpen = true; };
        box.QuerySubmitted += (_, args) => { if (args.ChosenSuggestion == null) { Update(); box.IsSuggestionListOpen = true; } };
        ReopenOnClick(box, Update);
        UIElement? root = null;
        PointerEventHandler dismiss = (_, args) =>
        {
            if (!box.IsSuggestionListOpen) return;
            for (var element = args.OriginalSource as DependencyObject; element != null; element = VisualTreeHelper.GetParent(element))
                if (element == box) return;
            box.IsSuggestionListOpen = false;
        };
        box.Loaded += (_, _) =>
        {
            root = box.XamlRoot?.Content as UIElement;
            root?.AddHandler(UIElement.PointerPressedEvent, dismiss, true);
        };
        box.Unloaded += (_, _) =>
        {
            root?.RemoveHandler(UIElement.PointerPressedEvent, dismiss);
            root = null;
        };
    }

    public static void ReopenOnClick(AutoSuggestBox box, Action update)
        => box.AddHandler(UIElement.PointerPressedEvent, new PointerEventHandler((_, _) =>
        {
            if (!box.IsSuggestionListOpen) { update(); box.IsSuggestionListOpen = true; }
        }), true);

    public static void ClearAfterSelection(AutoSuggestBox box)
        => box.DispatcherQueue.TryEnqueue(() => { box.Text = ""; box.IsSuggestionListOpen = false; });
}

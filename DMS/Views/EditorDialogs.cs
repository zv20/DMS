using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class EditorDialogs
{
    public static Task<bool> ConfirmDiscardAsync(XamlRoot root, string messageKey = "SideEditorDiscardMessage") =>
        ConfirmAsync(root, Localization.Get("RecipeDiscardTitle"), Localization.Get(messageKey), "RecipeDiscardButton");

    public static async Task<bool> ConfirmAsync(XamlRoot root, string title, object content, string actionKey)
    {
        var dialog = new ContentDialog
        {
            XamlRoot = root,
            Title = title,
            Content = content,
            PrimaryButtonText = Localization.Get(actionKey),
            CloseButtonText = Localization.Get("Text_Cancel_77dfd2"),
            DefaultButton = ContentDialogButton.Close
        };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
    }
}

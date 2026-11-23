using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class AppTour
{
    public static async Task ShowAsync(XamlRoot root, Func<string, Task> navigateAsync)
    {
        for (var index = 0; index < AppTourPlan.Steps.Count;)
        {
            var step = AppTourPlan.Steps[index];
            await navigateAsync(step.NavigationTag);
            var isLast = index == AppTourPlan.Steps.Count - 1;
            var dialog = new ContentDialog
            {
                XamlRoot = root,
                Title = $"{Localization.Get(step.TitleKey)} ({index + 1}/{AppTourPlan.Steps.Count})",
                Content = new TextBlock { Text = Localization.Get(step.DescriptionKey), TextWrapping = TextWrapping.Wrap },
                PrimaryButtonText = Localization.Get(isLast ? "TourFinish" : "TourNext"),
                SecondaryButtonText = index == 0 ? null : Localization.Get("TourBack"),
                CloseButtonText = Localization.Get("TourSkip"),
                DefaultButton = ContentDialogButton.Primary
            };
            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary) { index++; continue; }
            if (result == ContentDialogResult.Secondary) { index--; continue; }
            return;
        }
    }
}

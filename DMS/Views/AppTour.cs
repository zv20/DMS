using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace DMS.Views;

internal static class AppTour
{
    public static async Task ShowAsync(Grid host, IReadOnlyList<FrameworkElement> targets)
    {
        for (var index = 0; index < AppTourPlan.Steps.Count; index++)
        {
            var step = AppTourPlan.Steps[index];
            var isLast = index == AppTourPlan.Steps.Count - 1;
            var completed = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var tip = new TeachingTip
            {
                Title = $"{Localization.Get(step.TitleKey)} ({index + 1}/{AppTourPlan.Steps.Count})",
                Content = new TextBlock { Text = Localization.Get(step.DescriptionKey), TextWrapping = TextWrapping.Wrap },
                Target = targets[index],
                ActionButtonContent = Localization.Get(isLast ? "TourFinish" : "TourNext"),
                CloseButtonContent = Localization.Get("TourSkip")
            };
            tip.ActionButtonClick += (_, _) => completed.TrySetResult(true);
            tip.CloseButtonClick += (_, _) => completed.TrySetResult(false);
            host.Children.Add(tip);
            tip.IsOpen = true;
            var continueTour = await completed.Task;
            tip.IsOpen = false;
            host.Children.Remove(tip);
            if (!continueTour) return;
        }
    }
}

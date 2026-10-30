using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using DMS.Services;

namespace DMS;

public sealed partial class StartupWindow : Window
{
    public event EventHandler? RetryRequested;
    public bool IsClosed { get; private set; }

    public StartupWindow()
    {
        InitializeComponent();
        WindowIcon.Apply(this);
        Closed += (_, _) => IsClosed = true;
        AppWindow.Resize(new Windows.Graphics.SizeInt32 { Width = 620, Height = 560 });
    }

    public void ShowLoading(string message)
    {
        Subtitle.Text = message;
        LoadingIndicator.Visibility = Visibility.Visible;
        LoadingIndicator.IsActive = true;
        ErrorDetails.Visibility = Visibility.Collapsed;
        RetryButton.Visibility = Visibility.Collapsed;
    }

    public void ShowError(string message, string details, string retry)
    {
        Subtitle.Text = message;
        ErrorDetails.Text = details;
        ErrorDetails.Visibility = Visibility.Visible;
        LoadingIndicator.IsActive = false;
        LoadingIndicator.Visibility = Visibility.Collapsed;
        RetryButton.Content = retry;
        RetryButton.Visibility = Visibility.Visible;
    }

    public async Task<bool> ConfirmInstallerRestoreAsync(string path, string language)
    {
        var english = language == "en";
        var dialog = new ContentDialog
        {
            XamlRoot = ((FrameworkElement)Content).XamlRoot,
            Title = english ? "Restore selected backup?" : "Възстановяване на избрания архив?",
            Content = english
                ? $"Restore this backup? It will replace the current DMS data. A recovery backup will be kept before replacement. Close any other DMS windows before continuing.\n\n{path}"
                : $"Да се възстанови ли този архив? Текущите данни на DMS ще бъдат заменени. Преди това ще бъде запазен архив за възстановяване. Затворете другите прозорци на DMS, преди да продължите.\n\n{path}",
            PrimaryButtonText = english ? "Restore backup" : "Възстанови архива",
            CloseButtonText = english ? "Skip" : "Пропусни",
            DefaultButton = ContentDialogButton.Close
        };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
    }

    public async Task<bool> RetryInstallerRestoreAsync(string error, string language)
    {
        var english = language == "en";
        var dialog = new ContentDialog
        {
            XamlRoot = ((FrameworkElement)Content).XamlRoot,
            Title = english ? "Could not restore backup" : "Архивът не може да бъде възстановен",
            Content = english ? $"You can try again or continue without restoring.\n\n{error}" : $"Можете да опитате отново или да продължите без възстановяване.\n\n{error}",
            PrimaryButtonText = english ? "Try again" : "Опитайте отново",
            CloseButtonText = english ? "Skip restore" : "Пропусни възстановяването",
            DefaultButton = ContentDialogButton.Close
        };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
    }

    private void RetryButton_Click(object sender, RoutedEventArgs e) => RetryRequested?.Invoke(this, EventArgs.Empty);
}

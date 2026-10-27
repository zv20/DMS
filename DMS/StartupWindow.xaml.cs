using Microsoft.UI.Xaml;
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

    private void RetryButton_Click(object sender, RoutedEventArgs e) => RetryRequested?.Invoke(this, EventArgs.Empty);
}

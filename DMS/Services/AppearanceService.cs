using DMS.Models;
using Microsoft.UI.Xaml;
using Windows.UI;

namespace DMS.Services;

public static class AppearanceService
{
    public static void ApplyAccent(string accent)
    {
        var color = accent switch
        {
            "green" => Color.FromArgb(255, 16, 124, 16),
            "purple" => Color.FromArgb(255, 117, 49, 166),
            "orange" => Color.FromArgb(255, 194, 88, 0),
            "red" => Color.FromArgb(255, 196, 43, 28),
            "teal" => Color.FromArgb(255, 0, 122, 120),
            _ => Color.FromArgb(255, 0, 103, 192)
        };
        Application.Current.Resources["SystemAccentColor"] = color;
    }

    public static void ApplyTheme(Window window, string theme)
    {
        if (window.Content is FrameworkElement root)
            root.RequestedTheme = theme switch { "light" => ElementTheme.Light, "dark" => ElementTheme.Dark, _ => ElementTheme.Default };
    }
}

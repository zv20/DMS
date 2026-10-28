using DMS.Models;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;
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
        var resources = Application.Current.Resources;
        SetBrush(resources, "DmsAccentBrush", color);
        SetBrush(resources, "DmsAccentHoverBrush", Lighten(color, 0.12));
        SetBrush(resources, "DmsAccentPressedBrush", Darken(color, 0.12));

        // Keep WinUI controls that use the system accent in sync as well.
        resources["SystemAccentColor"] = color;
    }

    private static void SetBrush(ResourceDictionary resources, string key, Color color)
    {
        if (resources[key] is SolidColorBrush brush) brush.Color = color;
        else resources[key] = new SolidColorBrush(color);
    }

    private static Color Lighten(Color color, double amount) => Color.FromArgb(color.A,
        (byte)(color.R + (255 - color.R) * amount),
        (byte)(color.G + (255 - color.G) * amount),
        (byte)(color.B + (255 - color.B) * amount));

    private static Color Darken(Color color, double amount) => Color.FromArgb(color.A,
        (byte)(color.R * (1 - amount)),
        (byte)(color.G * (1 - amount)),
        (byte)(color.B * (1 - amount)));

    public static void ApplyTheme(Window window, string theme)
    {
        if (window.Content is FrameworkElement root)
            root.RequestedTheme = theme switch { "light" => ElementTheme.Light, "dark" => ElementTheme.Dark, _ => ElementTheme.Default };
    }
}

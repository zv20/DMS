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
        var hover = Lighten(color, 0.12);
        var pressed = Darken(color, 0.12);
        SetBrush(resources, "DmsAccentHoverBrush", hover);
        SetBrush(resources, "DmsAccentPressedBrush", pressed);
        SetBrush(resources, "DmsNavForeground", NavigationForeground(color));
        SetBrush(resources, "DmsNavHoverForeground", NavigationForeground(hover));
        SetBrush(resources, "DmsNavPressedForeground", NavigationForeground(pressed));
        SetBrush(resources, "DmsAccentSubtleBrush", color);
        SetBrush(resources, "DmsAccentSubtlePressedBrush", color);

        // Keep WinUI controls that use the system accent in sync as well.
        resources["SystemAccentColor"] = color;
    }

    private static Color NavigationForeground(Color background)
    {
        static double Linear(byte channel)
        {
            var s = channel / 255.0;
            return s <= 0.04045 ? s / 12.92 : Math.Pow((s + 0.055) / 1.055, 2.4);
        }
        var luminance = 0.2126 * Linear(background.R) + 0.7152 * Linear(background.G) + 0.0722 * Linear(background.B);
        return 1.05 / (luminance + 0.05) >= 4.5 ? Microsoft.UI.Colors.White : Microsoft.UI.Colors.Black;
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

    public static void ApplyTheme(Window window, string theme, string accent)
    {
        ApplyAccent(accent);
        if (window.Content is FrameworkElement root)
            root.RequestedTheme = theme switch { "default" or "light" => ElementTheme.Light, "dark" => ElementTheme.Dark, _ => ElementTheme.Default };
    }
}

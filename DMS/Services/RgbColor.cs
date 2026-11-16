using System.Globalization;
using Windows.UI;

namespace DMS.Services;

internal static class RgbColor
{
    public static bool TryParse(string? value, out Color color)
    {
        if (value is { Length: 7 } && value[0] == '#' &&
            uint.TryParse(value.AsSpan(1), NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out var rgb))
        {
            color = Color.FromArgb(255, (byte)(rgb >> 16), (byte)(rgb >> 8), (byte)rgb);
            return true;
        }

        color = default;
        return false;
    }

    public static Color ParseOrDefault(string? value, Color fallback) =>
        TryParse(value, out var color) ? color : fallback;
}

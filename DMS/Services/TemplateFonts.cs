using DMS.Models;
using Microsoft.UI.Xaml.Media;

namespace DMS.Services;

internal static class TemplateFonts
{
    private static readonly Dictionary<string, bool> Bundled = new()
    {
        // True when regular and italic files each contain a variable weight axis.
        ["Sofia Sans"] = true, ["PT Sans"] = false, ["Lora"] = true, ["PT Serif"] = false,
        ["Fira Sans"] = false, ["IBM Plex Sans"] = true, ["Literata"] = true, ["Alegreya"] = true
    };

    internal static readonly string[] Families =
        ["Arial", "Times New Roman", "Georgia", "Verdana", "Tahoma", "Courier New", .. Bundled.Keys];

    internal static FontFamily Resolve(TemplateTextStyle style)
    {
        var family = string.IsNullOrWhiteSpace(style.FontFamily) ? "Arial" : style.FontFamily;
        if (!Bundled.TryGetValue(family, out var variableWeight)) return new FontFamily(family);

        var face = (style.Bold && !variableWeight, style.Italic) switch
        {
            (true, true) => "BoldItalic",
            (true, false) => "Bold",
            (false, true) => "Italic",
            _ => "Regular"
        };
        var folder = family.Replace(" ", "").ToLowerInvariant();
        return new FontFamily($"ms-appx:///Assets/Fonts/{folder}/{face}.ttf#{family}");
    }
}

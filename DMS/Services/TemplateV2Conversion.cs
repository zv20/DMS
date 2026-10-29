using System.Text.Json;
using DMS.Models;

namespace DMS.Services;

/// <summary>Creates an approximate V2 copy without changing the original template.</summary>
public static class TemplateV2Conversion
{
    public static MenuTemplate ToV2Copy(MenuTemplate source)
    {
        ArgumentNullException.ThrowIfNull(source);
        var copy = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(source))
            ?? throw new InvalidOperationException("Could not copy the template.");
        if (copy.V2 != null) return copy;

        TemplateCompatibility.ApplyLegacyDefaults(copy);
        var font = string.IsNullOrWhiteSpace(copy.FontFamily) ? "Arial" : copy.FontFamily;
        var mealSize = SafeSize(copy.MealFontSize, 11, 10, 18);
        var v2 = new TemplateV2Document
        {
            HeaderText = copy.ShowHeader ? PlainText(copy.HeaderRichText, copy.HeaderText) : "",
            FooterText = copy.ShowFooter ? PlainText(copy.FooterRichText, copy.FooterText) : "",
            FontFamily = font,
            FontSize = mealSize,
            MinimumFontSize = Math.Min(14, mealSize),
            HeaderColor = copy.HeaderColor,
            BackgroundColor = copy.BackgroundColor,
            BackgroundImageDataUri = copy.BackgroundImageDataUri,
            BackgroundImageOpacity = double.IsFinite(copy.BackgroundImageOpacity) ? Math.Clamp(copy.BackgroundImageOpacity, 0, 1) : 1
        };
        v2.TextStyles["header"] = new TemplateTextStyle
        {
            FontFamily = font, FontSize = SafeSize(copy.HeaderFontSize, 24, 7, 48), Color = copy.HeaderColor,
            Alignment = copy.HeaderAlignment, Bold = copy.HeaderBold, Italic = copy.HeaderItalic, Underline = copy.HeaderUnderline
        };
        v2.TextStyles["footer"] = new TemplateTextStyle
        {
            FontFamily = font, FontSize = SafeSize(copy.FooterFontSize, 9, 7, 48), Color = v2.FooterColor,
            Alignment = copy.FooterAlignment
        };
        // Shared keys have the same meaning in both editors. Slot-specific and
        // independently positioned V1 objects cannot be represented exactly.
        if (copy.TextStyles != null)
        {
            foreach (var (key, style) in copy.TextStyles)
            {
                if (style == null) continue;
                var parts = key.Split(':');
                if (parts.Length == 1 && parts[0] is ("header" or "date" or "footer") ||
                    parts.Length == 2 && parts[0] is ("heading" or "menu" or "ingredients" or "allergens") &&
                    int.TryParse(parts[1], out var day) && day is >= 0 and < 7)
                    v2.TextStyles[key] = new TemplateTextStyle
                    {
                        FontFamily = style.FontFamily, FontSize = SafeSize(style.FontSize, 11, 7, 48), Color = style.Color,
                        Bold = style.Bold, Italic = style.Italic, Underline = style.Underline, Alignment = style.Alignment
                    };
            }
        }
        copy.V2 = v2;
        return copy;
    }

    private static double SafeSize(double value, double fallback, double min, double max)
        => Math.Clamp(double.IsFinite(value) ? value : fallback, min, max);

    private static string PlainText(TemplateRichTextContent? rich, string? fallback)
        => rich?.Runs is { Count: > 0 } runs ? string.Concat(runs.Where(run => run != null).Select(run => run.Text)) : fallback ?? "";
}

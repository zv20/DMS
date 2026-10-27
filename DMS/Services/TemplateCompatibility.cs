using System.Text.Json;
using System.Text.RegularExpressions;
using DMS.Models;

namespace DMS.Services;

public static class TemplateCompatibility
{
    // Browser JSON may contain features this editor cannot render. Keep the original
    // JSON intact and map only values supported by the native editor, once.
    public static void ApplyLegacyDefaults(MenuTemplate template)
    {
        if (template.NativeStyleInitialized || string.IsNullOrWhiteSpace(template.LegacyDataJson)) return;
        try
        {
            using var doc = JsonDocument.Parse(template.LegacyDataJson);
            var root = doc.RootElement;
            string ReadString(string key, string fallback) => root.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? fallback : fallback;
            bool ReadBool(string key, bool fallback) => root.TryGetProperty(key, out var value) && (value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.False) ? value.GetBoolean() : fallback;
            double ReadNumber(string key, double fallback) => root.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) ? number : fallback;
            template.TemplateStyle = ReadString("templateStyle", template.TemplateStyle);
            template.FontFamily = ReadString("mealFontFamily", template.FontFamily).Split(',')[0].Trim(' ', '\'','"');
            template.HeaderFontSize = ReadNumber("headerFontSize", template.HeaderFontSize);
            template.MealFontSize = ReadNumber("mealFontSize", template.MealFontSize);
            template.FooterFontSize = ReadNumber("footerFontSize", template.FooterFontSize);
            template.HeaderColor = ReadString("headerColor", template.HeaderColor);
            template.HeaderAlignment = ReadString("headerAlignment", template.HeaderAlignment);
            template.FooterAlignment = ReadString("footerAlignment", template.FooterAlignment);
            template.ShowHeader = ReadBool("showHeader", template.ShowHeader); template.ShowFooter = ReadBool("showFooter", template.ShowFooter);
            template.ShowDateRange = ReadBool("showDateRange", template.ShowDateRange); template.ShowIngredients = ReadBool("showIngredients", template.ShowIngredients);
            template.ShowCalories = ReadBool("showCalories", template.ShowCalories); template.ShowPortions = ReadBool("showPortions", template.ShowPortions);
            template.HeaderText = System.Net.WebUtility.HtmlDecode(Regex.Replace(template.HeaderText, "<[^>]+>", ""));
            template.FooterText = System.Net.WebUtility.HtmlDecode(Regex.Replace(template.FooterText, "<[^>]+>", ""));
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException or FormatException) { }
        template.NativeStyleInitialized = true;
    }

}

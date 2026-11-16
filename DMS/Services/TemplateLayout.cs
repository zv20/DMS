using DMS.Models;

namespace DMS.Services;

/// <summary>Default A4 layout. Existing flowing templates are changed only when explicitly enabled.</summary>
public static class TemplateLayout
{
    public const double PageWidth = 794;
    public const double PageHeight = 1123;

    /// <summary>
    /// Create a balanced seven-day grid after the user explicitly chooses a seven-day
    /// layout. Existing day positions are replaced; callers should capture undo first.
    /// Header, date, footer, and image positions are left unchanged.
    /// </summary>
    public static void InitializeSevenDayLayout(MenuTemplate template)
    {
        EnsureInitialized(template);
        for (var day = 0; day < 7; day++)
        {
            var left = 40 + (day % 2) * 365;
            var top = 135 + (day / 2) * 218;
            template.LayoutElements[$"heading:{day}"] = new TemplateLayoutElement { X = left, Y = top, Width = 349, Height = 28 };
            template.LayoutElements[$"menu:{day}"] = new TemplateLayoutElement { X = left, Y = top + 30, Width = 349, Height = 178 };
        }
        template.IncludeWeekend = true;
    }

    public static void EnsureInitialized(MenuTemplate template)
    {
        template.LayoutElements ??= new();
        template.ImageLayers ??= new();
        template.TextLayers ??= new();
        void Add(string key, double x, double y, double width, double height)
        {
            if (!template.LayoutElements.TryGetValue(key, out var existing) || existing == null)
                template.LayoutElements[key] = new TemplateLayoutElement { X = x, Y = y, Width = width, Height = height };
        }
        Add("header", 40, 35, 714, 48);
        Add("date", 40, 90, 714, 30);
        for (var day = 0; day < 5; day++)
        {
            var top = 135 + day * 174;
            Add($"heading:{day}", 40, top, 714, 28);
            Add($"menu:{day}", 40, top + 30, 714, 135);
        }
        if (template.IncludeWeekend)
        {
            for (var day = 5; day < 7; day++)
            {
                var left = 40 + (day % 2) * 365;
                var top = 135 + (day / 2) * 218;
                Add($"heading:{day}", left, top, 349, 28);
                Add($"menu:{day}", left, top + 30, 349, 178);
            }
        }
        Add("footer", 40, 1045, 714, 38);
        template.LayoutEnabled = true;
    }
}

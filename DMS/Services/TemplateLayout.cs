using DMS.Models;

namespace DMS.Services;

/// <summary>Default A4 layout. Existing flowing templates are changed only when explicitly enabled.</summary>
public static class TemplateLayout
{
    public const double PageWidth = 794;
    public const double PageHeight = 1123;

    public static void EnsureInitialized(MenuTemplate template)
    {
        template.LayoutElements ??= new();
        template.ImageLayers ??= new();
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
        Add("footer", 40, 1045, 714, 38);
        template.LayoutEnabled = true;
    }
}

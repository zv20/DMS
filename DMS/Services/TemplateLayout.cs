using DMS.Models;

namespace DMS.Services;

/// <summary>Default A4 layout. Existing flowing templates are changed only when explicitly enabled.</summary>
public static class TemplateLayout
{
    public const double PageWidth = 794;
    public const double PageHeight = 1123;

    public readonly record struct ResolvedMenuHeight(double Height, bool Overflowed);

    /// <summary>Resolves an opt-in menu height without reflowing saved objects.</summary>
    public static ResolvedMenuHeight ResolveMenuHeight(MenuTemplate template, TemplateLayoutElement element, double requiredHeight)
    {
        var saved = Finite(element.Height, 20, PageHeight);
        var policy = template.MenuBlockSizing;
        if (policy == null || !policy.Enabled) return new(saved, false);

        var minimum = Finite(policy.MinimumHeight, 20, PageHeight);
        var maximum = Finite(policy.MaximumHeight, minimum, PageHeight);
        if (maximum < minimum) maximum = minimum;
        var required = Finite(requiredHeight, minimum, PageHeight);
        var resolved = Math.Clamp(required, minimum, maximum);
        return new(resolved, required > maximum + .5);
    }

    /// <summary>A conservative, platform-independent estimate used before WebView rendering.</summary>
    public static double EstimateTextHeight(IEnumerable<(string Text, double FontSize)> lines, double width)
    {
        var usableWidth = Math.Max(20, width);
        var total = 0d;
        foreach (var (text, fontSize) in lines)
        {
            var size = Finite(fontSize, 11, 72);
            var charactersPerLine = Math.Max(1, (int)Math.Floor(usableWidth / Math.Max(3, size * .55)));
            var visualLines = Math.Max(1, (int)Math.Ceiling((text?.Length ?? 0) / (double)charactersPerLine));
            total += visualLines * (size * 1.3 + 3);
        }
        return Math.Max(20, total + 4);
    }

    private static double Finite(double value, double fallback, double max) => double.IsFinite(value) ? Math.Clamp(value, 1, max) : fallback;

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

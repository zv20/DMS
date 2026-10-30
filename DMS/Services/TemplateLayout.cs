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

    public readonly record struct ResolvedMenuHeight(double Height, bool Overflowed);
    public readonly record struct MenuFitResult(double Height, double FontScale, bool Overflowed);

    /// <summary>Available height before another visible text block or the page edge.</summary>
    public static double AvailableHeight(TemplateLayoutElement element, IEnumerable<TemplateLayoutElement> otherElements)
    {
        var x = double.IsFinite(element.X) ? Math.Clamp(element.X, 0, PageWidth) : 0;
        var y = double.IsFinite(element.Y) ? Math.Clamp(element.Y, 0, PageHeight - 1) : 0;
        var width = Finite(element.Width, 100, PageWidth);
        var available = PageHeight - y;
        foreach (var other in otherElements)
        {
            if (other == null || !double.IsFinite(other.X) || !double.IsFinite(other.Y) || !double.IsFinite(other.Width)) continue;
            if (other.Y > y && other.X < x + width && other.X + other.Width > x)
                available = Math.Min(available, other.Y - y);
        }
        return Math.Max(1, available);
    }

    /// <summary>Resolve sizing without changing saved geometry or allowing growth past available space.</summary>
    public static MenuFitResult ResolveMenuFit(MenuTemplate template, TemplateLayoutElement element, double requiredHeight, double availableHeight = PageHeight)
    {
        var saved = Finite(element.Height, 20, PageHeight);
        var required = Finite(requiredHeight, saved, PageHeight);
        var available = Finite(availableHeight, saved, PageHeight);
        var policy = template.MenuBlockSizing;
        var mode = policy?.Mode is "fixed" or "flexible" or "shrink" ? policy.Mode : policy?.Enabled == true ? "flexible" : "fixed";
        if (mode == "shrink")
        {
            var limit = Math.Min(saved, available);
            var minimumScale = double.IsFinite(policy!.MinimumFontScale) ? Math.Clamp(policy.MinimumFontScale, 0.5, 1) : 0.85;
            var scale = Math.Clamp(limit / required, minimumScale, 1);
            return new(saved, scale, required * scale > limit + .5 || saved > available + .5);
        }
        if (mode == "fixed") return new(saved, 1, required > saved + .5 || saved > available + .5);
        var minimum = Finite(policy!.MinimumHeight, 20, PageHeight);
        var maximum = Math.Max(minimum, Finite(policy.MaximumHeight, minimum, PageHeight));
        var upper = Math.Min(maximum, available);
        var height = Math.Min(Math.Max(required, minimum), upper);
        return new(height, 1, required > height + .5 || minimum > available + .5);
    }

    /// <summary>Resolves an opt-in menu height without reflowing saved objects.</summary>
    public static ResolvedMenuHeight ResolveMenuHeight(MenuTemplate template, TemplateLayoutElement element, double requiredHeight)
    {
        var resolved = ResolveMenuFit(template, element, requiredHeight);
        return new(resolved.Height, resolved.Overflowed);
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

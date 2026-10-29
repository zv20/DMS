using DMS.Models;
using Microsoft.UI;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Foundation;
using Windows.Storage.Streams;

namespace DMS.Services;

public sealed record TemplateV2PageResult(FrameworkElement Page, bool Overflowed, Task ImagesReady, bool HasMeals, DateTime? FirstDay, DateTime? LastDay);

/// <summary>The same native page is used for the editor and output.</summary>
public static class TemplateV2Renderer
{
    public static TemplateV2PageResult Create(TemplateV2Document template, DateTime monday, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient> ingredients, Action<string, FrameworkElement>? onSelected = null)
    {
        const double width = 714;
        const double dayArea = 1123 - 80 - 60 - 36 - 70;
        var recipeMap = recipes.GroupBy(r => r.Id).ToDictionary(g => g.Key, g => g.First());
        var populated = TemplateV2Layout.VisibleDayIndexes(monday, entries, recipes, true);
        var visible = TemplateV2Layout.VisibleDayIndexes(monday, entries, recipes, template.HideEmptyDays);
        var fixedHeights = visible.Select(day => template.DayHeights != null && day < template.DayHeights.Length ? template.DayHeights[day] : null).ToArray();
        var daySpace = dayArea - Math.Max(0, visible.Length - 1) * 6;
        var ingredientMap = ingredients.GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase).ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        var floor = double.IsFinite(template.MinimumFontSize) ? Math.Clamp(template.MinimumFontSize, 10, 36) : 14;
        var ceiling = double.IsFinite(template.MaximumFontSize) ? Math.Clamp(template.MaximumFontSize, floor, 48) : Math.Max(18, floor);
        var start = double.IsFinite(template.FontSize) ? Math.Clamp(template.FontSize, floor, ceiling) : floor;
        StackPanel[] panels = [];
        double[] required = [];
        TemplateV2Layout.Result fit = new(new double[visible.Length], true);
        for (var font = start; ; font = Math.Max(floor, font - .5))
        {
            panels = visible.Select(day => BuildDay(monday.AddDays(day), day, entries, recipeMap, ingredientMap, font, template, onSelected)).ToArray();
            required = panels.Select((panel, index) => { var inset = DayPadding(template, visible[index]) + DayBorderThickness(template, visible[index]); panel.Measure(new Size(Math.Max(20, width - 2 * inset), double.PositiveInfinity)); return panel.DesiredSize.Height + 2 * inset; }).ToArray();
            fit = TemplateV2Layout.Resolve(required, fixedHeights, daySpace);
            if (!fit.Overflowed || font <= floor || !template.AllowFontShrink) break;
        }
        var header = StyledText(template.HeaderText ?? "", GetTextStyle(template, "header"));
        var footer = StyledText(template.FooterText ?? "", GetTextStyle(template, "footer"));
        footer.VerticalAlignment = VerticalAlignment.Bottom;
        header.Measure(new Size(width, double.PositiveInfinity));
        footer.Measure(new Size(width, double.PositiveInfinity));
        // Detect wrapped footer text as well as explicit line breaks. Keep a
        // three-line allowance; do not silently truncate the supplied content.
        var overflow = fit.Overflowed || header.DesiredSize.Height > 60 || footer.DesiredSize.Height > Math.Min(70, 3 * footer.FontSize * 1.4) || (template.FooterText ?? "").Split('\n').Length > 3;
        var days = new Grid { RowSpacing = 6 };
        for (var i = 0; i < visible.Length; i++)
        {
            days.RowDefinitions.Add(new RowDefinition { Height = new GridLength(fit.DayHeights[i]) });
            var dayOverflow = required[i] > fit.DayHeights[i] + .5;
            var scroller = new ScrollViewer { Content = panels[i], VerticalScrollMode = dayOverflow ? ScrollMode.Auto : ScrollMode.Disabled, VerticalScrollBarVisibility = dayOverflow ? ScrollBarVisibility.Auto : ScrollBarVisibility.Disabled, HorizontalScrollMode = ScrollMode.Disabled };
            var appearance = DayAppearance(template, visible[i]);
            var border = new Border { Child = scroller, Padding = new Thickness(DayPadding(template, visible[i])), BorderThickness = new Thickness(DayBorderThickness(template, visible[i])), BorderBrush = new SolidColorBrush(dayOverflow ? Colors.Red : ParseColor(appearance?.BorderColor, Colors.LightGray)), Background = new SolidColorBrush(ParseColor(appearance?.BackgroundColor, Colors.Transparent)), CornerRadius = new CornerRadius(appearance != null && double.IsFinite(appearance.CornerRadius) ? Math.Clamp(appearance.CornerRadius, 0, 100) : 4) };
            Selectable(border, $"day:{visible[i]}", onSelected);
            Grid.SetRow(border, i); days.Children.Add(border);
        }
        var grid = new Grid();
        foreach (var height in new[] { 60d, 36d, dayArea, 70d }) grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(height) });
        var headerCell = new Border { Background = new SolidColorBrush(Colors.Transparent), Child = header };
        Selectable(headerCell, "header", onSelected);
        grid.Children.Add(headerCell);
        DateTime? first = populated.Length > 0 ? monday.AddDays(template.HideEmptyDays ? populated[0] : 0) : null;
        DateTime? last = populated.Length > 0 ? monday.AddDays(template.HideEmptyDays ? populated[^1] : 4) : null;
        var date = StyledText(first is DateTime startDate && last is DateTime endDate ? startDate == endDate ? $"{startDate:d}" : $"{startDate:d} – {endDate:d}" : "", GetTextStyle(template, "date"));
        date.Measure(new Size(width, double.PositiveInfinity));
        overflow |= date.DesiredSize.Height > 36;
        var dateCell = new Border { Background = new SolidColorBrush(Colors.Transparent), Child = date };
        Selectable(dateCell, "date", onSelected);
        Grid.SetRow(dateCell, 1); grid.Children.Add(dateCell);
        Grid.SetRow(days, 2); grid.Children.Add(days);
        var footerCell = new Border { Background = new SolidColorBrush(Colors.Transparent), Child = footer };
        Selectable(footerCell, "footer", onSelected);
        Grid.SetRow(footerCell, 3); grid.Children.Add(footerCell);
        var backgroundImage = new Image { Stretch = Stretch.UniformToFill, Opacity = double.IsFinite(template.BackgroundImageOpacity) ? Math.Clamp(template.BackgroundImageOpacity, 0, 1) : 1, IsHitTestVisible = false };
        var content = new Grid();
        content.Children.Add(backgroundImage);
        var inset = new Border { Padding = new Thickness(40), Child = grid };
        content.Children.Add(inset);
        var page = new Border { Width = 794, Height = 1123, Background = new SolidColorBrush(ParseColor(template.BackgroundColor, Colors.White)), Child = content };
        return new TemplateV2PageResult(page, overflow, LoadImageAsync(backgroundImage, template.BackgroundImageDataUri), populated.Length > 0, first, last);
    }

    public static TemplateTextStyle GetTextStyle(TemplateV2Document template, string key)
    {
        var group = key.Split(':')[0];
        TemplateTextStyle? style = null;
        if (template.TextStyles != null && (!template.TextStyles.TryGetValue(key, out style) || style == null))
            template.TextStyles.TryGetValue(group, out style);
        style ??= new TemplateTextStyle
        {
            FontFamily = template.FontFamily, FontSize = group switch { "header" => 24, "footer" => 13, "date" => 14, "heading" => template.FontSize + 1, _ => template.FontSize },
            Color = group == "header" ? template.HeaderColor : group == "footer" ? template.FooterColor : template.BodyColor,
            Bold = group is "header" or "heading", Alignment = group is "header" or "footer" or "date" ? "center" : "left"
        };
        return new TemplateTextStyle { FontFamily = style.FontFamily, FontSize = style.FontSize, Color = style.Color, Bold = style.Bold, Italic = style.Italic, Underline = style.Underline, Alignment = style.Alignment };
    }

    private static TextBlock StyledText(string text, TemplateTextStyle style, double scale = 1)
        => new() { Text = text, FontFamily = new FontFamily(string.IsNullOrWhiteSpace(style.FontFamily) ? "Arial" : style.FontFamily), FontSize = Math.Clamp(double.IsFinite(style.FontSize) ? style.FontSize * scale : 14, 6, 72), FontWeight = style.Bold ? FontWeights.Bold : FontWeights.Normal, FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal, TextDecorations = style.Underline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None, Foreground = new SolidColorBrush(ParseColor(style.Color, Colors.Black)), TextAlignment = style.Alignment switch { "center" => TextAlignment.Center, "right" => TextAlignment.Right, _ => TextAlignment.Left }, TextWrapping = TextWrapping.Wrap };

    private static void Selectable(FrameworkElement element, string key, Action<string, FrameworkElement>? onSelected)
    {
        element.Tag = key;
        if (onSelected == null) return;
        element.PointerPressed += (_, e) => { onSelected(key, element); e.Handled = true; };
    }

    private static TemplateBlockAppearance? DayAppearance(TemplateV2Document template, int day)
    {
        if (template.BlockAppearances == null) return null;
        if (template.BlockAppearances.TryGetValue($"day:{day}", out var specific) && specific != null) return specific;
        return template.BlockAppearances.TryGetValue("day", out var shared) ? shared : null;
    }

    private static double DayPadding(TemplateV2Document template, int day)
    {
        var padding = DayAppearance(template, day)?.Padding ?? 8;
        return double.IsFinite(padding) ? Math.Clamp(padding, 0, 40) : 8;
    }

    private static double DayBorderThickness(TemplateV2Document template, int day)
    {
        var thickness = DayAppearance(template, day)?.BorderThickness ?? 1;
        return double.IsFinite(thickness) ? Math.Clamp(thickness, 0, 20) : 1;
    }

    private static StackPanel BuildDay(DateTime day, int dayIndex, IReadOnlyList<MenuEntry> entries, Dictionary<int, Recipe> recipes, Dictionary<string, Ingredient> ingredients, double size, TemplateV2Document template, Action<string, FrameworkElement>? onSelected)
    {
        var panel = new StackPanel { Spacing = 2 };
        var scale = double.IsFinite(template.FontSize) && template.FontSize > 0 ? size / template.FontSize : 1;
        var heading = StyledText(day.ToString("dddd, d MMMM"), GetTextStyle(template, $"heading:{dayIndex}"), scale);
        Selectable(heading, $"heading:{dayIndex}", onSelected);
        panel.Children.Add(heading);
        foreach (var entry in entries.Where(e => e.Date.Date == day.Date && recipes.ContainsKey(e.RecipeId)).OrderBy(e => MenuOutputService.SlotOrder(e.Slot)))
        {
            var recipe = recipes[entry.RecipeId];
            var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name => ingredients.TryGetValue(name, out var ingredient) ? ingredient.Allergens : []))
                .Distinct(StringComparer.OrdinalIgnoreCase).Select(Localization.Allergen).ToArray();
            var menuStyle = GetTextStyle(template, $"menu:{dayIndex}");
            var ingredientStyle = GetTextStyle(template, $"ingredients:{dayIndex}");
            var allergenStyle = GetTextStyle(template, $"allergens:{dayIndex}");
            var meal = StyledText("", menuStyle, scale);
            // Each inline owns its underline, including allergen-bearing ingredients.
            meal.TextDecorations = Windows.UI.Text.TextDecorations.None;
            Selectable(meal, $"menu:{dayIndex}", onSelected);
            var title = $"{MenuOutputService.SlotOrder(entry.Slot)}. {recipe.Name}";
            if (!string.IsNullOrWhiteSpace(recipe.PortionSize)) title += $" ({recipe.PortionSize.Trim()})";
            if (recipe.Calories > 0) title += $" · {recipe.Calories} kcal";
            AddRun(meal, title, menuStyle, scale, false);
            if (recipe.Ingredients.Count > 0) AddRun(meal, " — ", ingredientStyle, scale, false);
            for (var i = 0; i < recipe.Ingredients.Count; i++)
            {
                var name = recipe.Ingredients[i];
                if (i > 0) AddRun(meal, ", ", ingredientStyle, scale, false);
                AddRun(meal, name, ingredientStyle, scale, ingredients.TryGetValue(name, out var ingredient) && ingredient.Allergens.Count > 0);
            }
            if (allergens.Length > 0) AddRun(meal, " · " + string.Join(", ", allergens), allergenStyle, scale, false);
            panel.Children.Add(meal);
        }
        return panel;
    }

    private static void AddRun(TextBlock block, string text, TemplateTextStyle style, double scale, bool ingredientAllergen)
    {
        var run = new Run { Text = text, FontFamily = new FontFamily(string.IsNullOrWhiteSpace(style.FontFamily) ? "Arial" : style.FontFamily), FontSize = Math.Clamp(double.IsFinite(style.FontSize) ? style.FontSize * scale : 14, 6, 72), FontWeight = style.Bold ? FontWeights.Bold : FontWeights.Normal, FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal, Foreground = new SolidColorBrush(ParseColor(style.Color, Colors.Black)) };
        if (ingredientAllergen || style.Underline) { var underline = new Underline(); underline.Inlines.Add(run); block.Inlines.Add(underline); }
        else block.Inlines.Add(run);
    }

    private static Windows.UI.Color ParseColor(string? value, Windows.UI.Color fallback)
    {
        if (value == null || !System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-fA-F]{6}$")) return fallback;
        return Windows.UI.Color.FromArgb(255, Convert.ToByte(value.Substring(1, 2), 16), Convert.ToByte(value.Substring(3, 2), 16), Convert.ToByte(value.Substring(5, 2), 16));
    }

    private static async Task LoadImageAsync(Image target, string? dataUri)
    {
        if (string.IsNullOrEmpty(dataUri)) return;
        if (!dataUri.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) && !dataUri.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Unsupported template image.");
        if (dataUri.Length > 14_000_000) throw new InvalidOperationException("Template image is too large.");
        try
        {
            var bytes = Convert.FromBase64String(dataUri[(dataUri.IndexOf(',') + 1)..]);
            if (bytes.Length > 10 * 1024 * 1024) throw new InvalidOperationException("Template image is too large.");
            using var stream = new InMemoryRandomAccessStream();
            using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync(); stream.Seek(0);
            var bitmap = new BitmapImage(); await bitmap.SetSourceAsync(stream); target.Source = bitmap;
        }
        catch (FormatException ex) { throw new InvalidOperationException("Invalid template image.", ex); }
    }
}

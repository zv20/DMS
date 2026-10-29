using DMS.Models;
using Microsoft.UI;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Foundation;
using Windows.Storage.Streams;

namespace DMS.Services;

public sealed record TemplateV2PageResult(FrameworkElement Page, bool Overflowed, Task ImagesReady);

/// <summary>The same native page is used for the editor and output.</summary>
public static class TemplateV2Renderer
{
    public static TemplateV2PageResult Create(TemplateV2Document template, DateTime monday, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient> ingredients)
    {
        const double width = 714;
        const double daySpace = 1123 - 80 - 60 - 36 - 70 - 24;
        var recipeMap = recipes.GroupBy(r => r.Id).ToDictionary(g => g.Key, g => g.First());
        var ingredientMap = ingredients.GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase).ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        var floor = double.IsFinite(template.MinimumFontSize) ? Math.Clamp(template.MinimumFontSize, 10, 36) : 14;
        var ceiling = double.IsFinite(template.MaximumFontSize) ? Math.Clamp(template.MaximumFontSize, floor, 48) : Math.Max(18, floor);
        var start = double.IsFinite(template.FontSize) ? Math.Clamp(template.FontSize, floor, ceiling) : floor;
        StackPanel[] panels = [];
        double[] required = [];
        TemplateV2Layout.Result fit = new(new double[5], true);
        for (var font = start; ; font = Math.Max(floor, font - .5))
        {
            panels = Enumerable.Range(0, 5).Select(day => BuildDay(monday.AddDays(day), entries, recipeMap, ingredientMap, font, template.FontFamily, template.BodyColor)).ToArray();
            required = panels.Select(panel => { panel.Measure(new Size(width - 18, double.PositiveInfinity)); return panel.DesiredSize.Height + 18; }).ToArray();
            fit = TemplateV2Layout.Resolve(required, template.DayHeights, daySpace);
            if (!fit.Overflowed || font <= floor || !template.AllowFontShrink) break;
        }
        var family = new FontFamily(string.IsNullOrWhiteSpace(template.FontFamily) ? "Arial" : template.FontFamily);
        var header = new TextBlock { Text = template.HeaderText ?? "", FontFamily = family, FontSize = 24, FontWeight = FontWeights.Bold, Foreground = new SolidColorBrush(ParseColor(template.HeaderColor, Colors.Black)), TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap };
        var footer = new TextBlock { Text = template.FooterText ?? "", FontFamily = family, FontSize = 13, Foreground = new SolidColorBrush(ParseColor(template.FooterColor, Colors.Black)), TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap, VerticalAlignment = VerticalAlignment.Bottom };
        header.Measure(new Size(width, double.PositiveInfinity));
        footer.Measure(new Size(width, double.PositiveInfinity));
        // Detect wrapped footer text as well as explicit line breaks. Keep a
        // three-line allowance; do not silently truncate the supplied content.
        var overflow = fit.Overflowed || header.DesiredSize.Height > 60 || footer.DesiredSize.Height > 3 * 13 * 1.4 || (template.FooterText ?? "").Split('\n').Length > 3;
        var days = new Grid { RowSpacing = 6 };
        for (var i = 0; i < 5; i++)
        {
            days.RowDefinitions.Add(new RowDefinition { Height = new GridLength(fit.DayHeights[i]) });
            var dayOverflow = required[i] > fit.DayHeights[i] + .5;
            var scroller = new ScrollViewer { Content = panels[i], VerticalScrollMode = dayOverflow ? ScrollMode.Auto : ScrollMode.Disabled, VerticalScrollBarVisibility = dayOverflow ? ScrollBarVisibility.Auto : ScrollBarVisibility.Disabled, HorizontalScrollMode = ScrollMode.Disabled };
            var border = new Border { Child = scroller, Padding = new Thickness(8), BorderThickness = new Thickness(1), BorderBrush = new SolidColorBrush(dayOverflow ? Colors.Red : Colors.LightGray), CornerRadius = new CornerRadius(4) };
            Grid.SetRow(border, i); days.Children.Add(border);
        }
        var grid = new Grid();
        foreach (var height in new[] { 60d, 36d, daySpace + 24, 70d }) grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(height) });
        grid.Children.Add(header);
        var date = new TextBlock { Text = $"{monday:d} – {monday.AddDays(4):d}", FontFamily = family, FontSize = 14, Foreground = new SolidColorBrush(ParseColor(template.BodyColor, Colors.Black)), TextAlignment = TextAlignment.Center };
        Grid.SetRow(date, 1); grid.Children.Add(date);
        Grid.SetRow(days, 2); grid.Children.Add(days);
        Grid.SetRow(footer, 3); grid.Children.Add(footer);
        var backgroundImage = new Image { Stretch = Stretch.UniformToFill, Opacity = double.IsFinite(template.BackgroundImageOpacity) ? Math.Clamp(template.BackgroundImageOpacity, 0, 1) : 1, IsHitTestVisible = false };
        var content = new Grid();
        content.Children.Add(backgroundImage);
        var inset = new Border { Padding = new Thickness(40), Child = grid };
        content.Children.Add(inset);
        var page = new Border { Width = 794, Height = 1123, Background = new SolidColorBrush(ParseColor(template.BackgroundColor, Colors.White)), Child = content };
        return new TemplateV2PageResult(page, overflow, LoadImageAsync(backgroundImage, template.BackgroundImageDataUri));
    }

    private static StackPanel BuildDay(DateTime day, IReadOnlyList<MenuEntry> entries, Dictionary<int, Recipe> recipes, Dictionary<string, Ingredient> ingredients, double size, string family, string color)
    {
        var panel = new StackPanel { Spacing = 2 };
        void Add(string value, bool heading = false) => panel.Children.Add(new TextBlock { Text = value, FontFamily = new FontFamily(string.IsNullOrWhiteSpace(family) ? "Arial" : family), FontSize = heading ? size + 1 : size, FontWeight = heading ? FontWeights.SemiBold : FontWeights.Normal, Foreground = new SolidColorBrush(ParseColor(color, Colors.Black)), TextWrapping = TextWrapping.Wrap });
        Add(day.ToString("dddd, d MMMM"), true);
        foreach (var entry in entries.Where(e => e.Date.Date == day.Date && recipes.ContainsKey(e.RecipeId)).OrderBy(e => MenuOutputService.SlotOrder(e.Slot)))
        {
            var recipe = recipes[entry.RecipeId];
            var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name => ingredients.TryGetValue(name, out var ingredient) ? ingredient.Allergens : []))
                .Distinct(StringComparer.OrdinalIgnoreCase).Select(Localization.Allergen).ToArray();
            var meal = $"{MenuOutputService.SlotOrder(entry.Slot)}. {recipe.Name}";
            if (recipe.Ingredients.Count > 0) meal += " — " + string.Join(", ", recipe.Ingredients);
            if (allergens.Length > 0) meal += " · ⚠ " + string.Join(", ", allergens);
            Add(meal);
        }
        return panel;
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

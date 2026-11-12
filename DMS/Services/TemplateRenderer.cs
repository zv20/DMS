using DMS.Models;
using DMS.Views;
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

public sealed record TemplatePageResult(FrameworkElement Page, bool Overflowed, Task ImagesReady, bool HasMeals, DateTime? FirstDay, DateTime? LastDay, TemplateVisualLifetime Lifetime);

/// <summary>The same native page is used for the editor and output.</summary>
public static class TemplateRenderer
{
    public static TemplatePageResult Create(TemplateDocument template, DateTime monday, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient> ingredients, Action<string, FrameworkElement>? onSelected = null, bool includeWeekend = false, TemplateBitmapCache? bitmapCache = null, int decodeWidth = 0, CancellationToken cancellationToken = default, bool measureOnly = false)
    {
        var lifetime = new TemplateVisualLifetime();
        try
        {
        var canvasImages = template.DecorativeImages ?? [];
        var insets = TemplatePageImages.GetInsets(canvasImages.Where(image => image is { IsCanvasBackground: false }));
        var width = Math.Max(1, 714 - insets.Left - insets.Right);
        const double pageContentHeight = 1123 - 80;
        var recipeMap = recipes.GroupBy(r => r.Id).ToDictionary(g => g.Key, g => g.First());
        var populated = TemplatePageLayout.VisibleDayIndexes(monday, entries, recipes, true, includeWeekend);
        var visible = TemplatePageLayout.VisibleDayIndexes(monday, entries, recipes, template.HideEmptyDays, includeWeekend);
        var fixedHeights = visible.Select(day => template.DayHeights != null && day < template.DayHeights.Length ? template.DayHeights[day] : null).ToArray();
        var dayGap = double.IsFinite(template.DaySpacing) ? Math.Clamp(template.DaySpacing, 0, 40) : 1;
        var ingredientMap = ingredients.GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase).ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        // These values do not depend on the font size. Compute them once even
        // when fitting the page requires several measurement passes.
        var dayEntries = visible.Select(day => entries
            .Where(entry => entry.Date.Date == monday.Date.AddDays(day) && recipeMap.ContainsKey(entry.RecipeId))
            .OrderBy(entry => MenuOutputService.SlotOrder(entry.Slot)).ToArray()).ToArray();
        var recipeAllergens = dayEntries.SelectMany(day => day).Select(entry => entry.RecipeId).Distinct()
            .ToDictionary(id => id, id => recipeMap[id].Allergens
                .Concat(recipeMap[id].Ingredients.SelectMany(name => ingredientMap.TryGetValue(name, out var ingredient) ? ingredient.Allergens : []))
                .Distinct(StringComparer.OrdinalIgnoreCase).Select(Localization.Allergen).ToArray());
        var floor = double.IsFinite(template.MinimumFontSize) ? Math.Clamp(template.MinimumFontSize, 10, 36) : 14;
        var ceiling = double.IsFinite(template.MaximumFontSize) ? Math.Clamp(template.MaximumFontSize, floor, 48) : Math.Max(18, floor);
        var start = double.IsFinite(template.FontSize) ? Math.Clamp(template.FontSize, floor, ceiling) : floor;
        var header = StyledText(template.HeaderText ?? "", GetTextStyle(template, "header"));
        var footer = StyledText(template.FooterText ?? "", GetTextStyle(template, "footer"));
        var notice = StyledText(template.FooterNoticeText ?? "", GetTextStyle(template, "notice"));
        header.Measure(new Size(width, double.PositiveInfinity));
        footer.Measure(new Size(width, double.PositiveInfinity));
        notice.Measure(new Size(width, double.PositiveInfinity));
        var reflectionHeight = template.ShowHeaderReflection && !string.IsNullOrEmpty(template.HeaderText) ? Math.Min(24, header.DesiredSize.Height * .38) : 0;
        var headerHeight = Math.Clamp(header.DesiredSize.Height + reflectionHeight + 8, 60, 160);
        var noticeHeight = string.IsNullOrWhiteSpace(template.FooterNoticeText) ? 0 : notice.DesiredSize.Height + 4;
        var footerNeeded = footer.DesiredSize.Height + noticeHeight;
        var footerHeight = Math.Clamp(footerNeeded, 70, 240);
        var dayArea = Math.Max(0, pageContentHeight - headerHeight - 36 - footerHeight);
        var daySpace = Math.Max(0, dayArea - Math.Max(0, visible.Length - 1) * dayGap);
        StackPanel[] panels = [];
        double[] required = [];
        TemplatePageLayout.Result fit = new(new double[visible.Length], true);
        for (var font = start; ; font = Math.Max(floor, font - .5))
        {
            panels = visible.Select((day, index) => BuildDay(monday.AddDays(day), day, dayEntries[index], recipeMap, ingredientMap, recipeAllergens, font, template, null, lifetime)).ToArray();
            required = panels.Select((panel, index) => { var inset = DayPadding(template, visible[index]) + DayBorderThickness(template, visible[index]); panel.Measure(new Size(Math.Max(20, width - 2 * inset), double.PositiveInfinity)); return panel.DesiredSize.Height + 2 * inset; }).ToArray();
            fit = TemplatePageLayout.Resolve(required, fixedHeights, daySpace);
            if (!fit.Overflowed || font <= floor || !template.AllowFontShrink)
            {
                if (onSelected != null)
                    panels = visible.Select((day, index) => BuildDay(monday.AddDays(day), day, dayEntries[index], recipeMap, ingredientMap, recipeAllergens, font, template, onSelected, lifetime)).ToArray();
                break;
            }
        }
        // Long footers consume available day space but are never silently clipped.
        var overflow = fit.Overflowed || insets.Overflowed || header.DesiredSize.Height + reflectionHeight > headerHeight || footerNeeded > footerHeight + .5;
        if (measureOnly)
            return new TemplatePageResult(new Grid(), overflow, Task.CompletedTask, populated.Length > 0, null, null, lifetime);
        var days = new Grid { RowSpacing = dayGap };
        for (var i = 0; i < visible.Length; i++)
        {
            days.RowDefinitions.Add(new RowDefinition { Height = new GridLength(fit.DayHeights[i]) });
            var dayOverflow = required[i] > fit.DayHeights[i] + .5;
            var scroller = new ScrollViewer { Content = panels[i], VerticalScrollMode = dayOverflow ? ScrollMode.Auto : ScrollMode.Disabled, VerticalScrollBarVisibility = dayOverflow ? ScrollBarVisibility.Auto : ScrollBarVisibility.Disabled, HorizontalScrollMode = ScrollMode.Disabled };
            var appearance = DayAppearance(template, visible[i]);
            var backgroundColor = ParseColor(appearance?.BackgroundColor, Colors.Transparent);
            var backgroundOpacity = appearance != null && double.IsFinite(appearance.Opacity) ? Math.Clamp(appearance.Opacity, 0, 1) : 1;
            // Put the alpha in the color itself. This keeps the text and border fully
            // opaque while making only the block fill transparent on every renderer.
            var background = new SolidColorBrush(Windows.UI.Color.FromArgb(
                (byte)Math.Round(backgroundOpacity * byte.MaxValue), backgroundColor.R, backgroundColor.G, backgroundColor.B));
            var borderColor = dayOverflow ? Colors.Red : ParseColor(appearance?.BorderColor, Colors.LightGray);
            var borderOpacity = appearance != null && double.IsFinite(appearance.BorderOpacity) ? Math.Clamp(appearance.BorderOpacity, 0, 1) : 1;
            var border = new Border { Child = scroller, Padding = new Thickness(DayPadding(template, visible[i])), BorderThickness = new Thickness(dayOverflow ? Math.Max(1, DayBorderThickness(template, visible[i])) : DayBorderThickness(template, visible[i])), BorderBrush = new SolidColorBrush(Windows.UI.Color.FromArgb((byte)Math.Round(borderOpacity * byte.MaxValue), borderColor.R, borderColor.G, borderColor.B)), Background = background, CornerRadius = new CornerRadius(appearance != null && double.IsFinite(appearance.CornerRadius) ? Math.Clamp(appearance.CornerRadius, 0, 100) : 4) };
            Selectable(border, $"day:{visible[i]}", onSelected, lifetime);
            Grid.SetRow(border, i); days.Children.Add(border);
        }
        var grid = new Grid();
        foreach (var height in new[] { headerHeight, 36d, dayArea, footerHeight }) grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(height) });
        var headerPanel = new StackPanel();
        headerPanel.Children.Add(header);
        if (reflectionHeight > 0)
        {
            var reflection = StyledText(template.HeaderText ?? "", GetTextStyle(template, "header"));
            reflection.Opacity = .18;
            reflection.RenderTransformOrigin = new Point(.5, .5);
            reflection.RenderTransform = new ScaleTransform { ScaleY = -1 };
            reflection.IsHitTestVisible = false;
            var reflectionClip = new Border { Height = reflectionHeight, Child = reflection };
            reflectionClip.Clip = new RectangleGeometry { Rect = new Rect(0, 0, width, reflectionHeight) };
            headerPanel.Children.Add(reflectionClip);
        }
        var headerCell = new Border { Background = new SolidColorBrush(Colors.Transparent), Child = headerPanel };
        Selectable(headerCell, "header", onSelected, lifetime);
        grid.Children.Add(headerCell);
        DateTime? first = populated.Length > 0 ? monday.AddDays(template.HideEmptyDays ? populated[0] : 0) : null;
        DateTime? last = populated.Length > 0 ? monday.AddDays(template.HideEmptyDays ? populated[^1] : includeWeekend ? 6 : 4) : null;
        var date = StyledText(first is DateTime startDate && last is DateTime endDate ? startDate == endDate ? $"{startDate:d}" : $"{startDate:d} – {endDate:d}" : "", GetTextStyle(template, "date"));
        date.Measure(new Size(width, double.PositiveInfinity));
        overflow |= date.DesiredSize.Height > 36;
        var dateCell = new Border { Background = new SolidColorBrush(Colors.Transparent), Child = date };
        Selectable(dateCell, "date", onSelected, lifetime);
        Grid.SetRow(dateCell, 1); grid.Children.Add(dateCell);
        Grid.SetRow(days, 2); grid.Children.Add(days);
        var footerPanel = new StackPanel { VerticalAlignment = VerticalAlignment.Bottom, Spacing = 4 };
        footerPanel.Children.Add(footer);
        if (!string.IsNullOrWhiteSpace(template.FooterNoticeText)) { Selectable(notice, "notice", onSelected, lifetime); footerPanel.Children.Add(notice); }
        var footerCell = new Border { Background = new SolidColorBrush(Colors.Transparent), Child = footerPanel };
        Selectable(footerCell, "footer", onSelected, lifetime);
        Grid.SetRow(footerCell, 3); grid.Children.Add(footerCell);
        var backgroundImage = new Image { Stretch = Stretch.UniformToFill, Opacity = double.IsFinite(template.BackgroundImageOpacity) ? Math.Clamp(template.BackgroundImageOpacity, 0, 1) : 1, IsHitTestVisible = false };
        lifetime.AddImage(backgroundImage);
        var content = new Grid();
        content.Children.Add(backgroundImage);
        var canvasBackground = TemplatePageImages.CreateLayer(canvasImages.Where(image => image is { IsCanvasBackground: true }), onSelected, bitmapCache, decodeWidth, cancellationToken, lifetime);
        content.Children.Add(canvasBackground.Layer);
        var decorations = TemplatePageImages.CreateLayer(canvasImages.Where(image => image is { IsCanvasBackground: false, InFrontOfText: false }), onSelected, bitmapCache, decodeWidth, cancellationToken, lifetime);
        content.Children.Add(decorations.Layer);
        var inset = new Border { Padding = new Thickness(40 + insets.Left, 40, 40 + insets.Right, 40), Child = grid };
        content.Children.Add(inset);
        var foreground = TemplatePageImages.CreateLayer(canvasImages.Where(image => image is { IsCanvasBackground: false, InFrontOfText: true }), onSelected, bitmapCache, decodeWidth, cancellationToken, lifetime);
        content.Children.Add(foreground.Layer);
        var pageColor = ParseColor(template.BackgroundColor, Colors.White);
        var pageOpacity = double.IsFinite(template.BackgroundOpacity) ? Math.Clamp(template.BackgroundOpacity, 0, 1) : 1;
        var page = new Border { Width = 794, Height = 1123, Background = new SolidColorBrush(Windows.UI.Color.FromArgb((byte)Math.Round(pageOpacity * byte.MaxValue), pageColor.R, pageColor.G, pageColor.B)), Child = content };
        Selectable(page, "page", onSelected, lifetime);
        return new TemplatePageResult(page, overflow, Task.WhenAll(LoadImageAsync(backgroundImage, template.BackgroundImageDataUri, bitmapCache, decodeWidth, cancellationToken, lifetime), canvasBackground.ImagesReady, decorations.ImagesReady, foreground.ImagesReady), populated.Length > 0, first, last, lifetime);
        }
        catch { lifetime.Dispose(); throw; }
    }

    public static TemplateTextStyle GetTextStyle(TemplateDocument template, string key)
    {
        var group = key.Split(':')[0];
        TemplateTextStyle? style = null;
        if (template.TextStyles != null && (!template.TextStyles.TryGetValue(key, out style) || style == null))
            template.TextStyles.TryGetValue(group, out style);
        style ??= new TemplateTextStyle
        {
            FontFamily = template.FontFamily, FontSize = group switch { "header" => 24, "footer" => 13, "notice" => 13, "date" => 14, "heading" => template.FontSize + 1, _ => template.FontSize },
            Color = group == "header" ? template.HeaderColor : group == "footer" ? template.FooterColor : group == "notice" ? template.AllergenAccentColor : template.BodyColor,
            Bold = group is "header" or "heading" or "notice", Underline = group == "notice", Alignment = group is "header" or "footer" or "date" ? "center" : "left"
        };
        return new TemplateTextStyle { FontFamily = style.FontFamily, FontSize = style.FontSize, Color = style.Color, Opacity = style.Opacity, Bold = style.Bold, Italic = style.Italic, Underline = style.Underline, Alignment = style.Alignment };
    }

    private static TextBlock StyledText(string text, TemplateTextStyle style, double scale = 1)
        => new() { Text = text, FontFamily = new FontFamily(string.IsNullOrWhiteSpace(style.FontFamily) ? "Arial" : style.FontFamily), FontSize = Math.Clamp(double.IsFinite(style.FontSize) ? style.FontSize * scale : 14, 6, 72), FontWeight = style.Bold ? FontWeights.Bold : FontWeights.Normal, FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal, TextDecorations = style.Underline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None, Foreground = Brush(style.Color, style.Opacity), TextAlignment = style.Alignment switch { "center" => TextAlignment.Center, "right" => TextAlignment.Right, _ => TextAlignment.Left }, TextWrapping = TextWrapping.Wrap };

    private static void Selectable(FrameworkElement element, string key, Action<string, FrameworkElement>? onSelected, TemplateVisualLifetime lifetime)
    {
        element.Tag = key;
        if (onSelected == null) return;
        lifetime.AddSelection(element, (_, e) => { onSelected(key, element); e.Handled = true; });
    }

    private static TemplateBlockAppearance? DayAppearance(TemplateDocument template, int day)
    {
        if (template.BlockAppearances == null) return null;
        if (template.BlockAppearances.TryGetValue($"day:{day}", out var specific) && specific != null) return specific;
        return template.BlockAppearances.TryGetValue("day", out var shared) ? shared : null;
    }

    private static double DayPadding(TemplateDocument template, int day)
    {
        var padding = DayAppearance(template, day)?.Padding ?? 8;
        return double.IsFinite(padding) ? Math.Clamp(padding, 0, 40) : 8;
    }

    private static double DayBorderThickness(TemplateDocument template, int day)
    {
        var thickness = DayAppearance(template, day)?.BorderThickness ?? 0;
        return double.IsFinite(thickness) ? Math.Clamp(thickness, 0, 20) : 1;
    }

    private static StackPanel BuildDay(DateTime day, int dayIndex, IReadOnlyList<MenuEntry> entries, Dictionary<int, Recipe> recipes, Dictionary<string, Ingredient> ingredients, Dictionary<int, string[]> recipeAllergens, double size, TemplateDocument template, Action<string, FrameworkElement>? onSelected, TemplateVisualLifetime lifetime)
    {
        var panel = new StackPanel { Spacing = double.IsFinite(template.MealLineSpacing) ? Math.Clamp(template.MealLineSpacing, 0, 20) : 1 };
        var scale = double.IsFinite(template.FontSize) && template.FontSize > 0 ? size / template.FontSize : 1;
        var heading = StyledText(day.ToString("dddd, d MMMM"), GetTextStyle(template, $"heading:{dayIndex}"), scale);
        Selectable(heading, $"heading:{dayIndex}", onSelected, lifetime);
        panel.Children.Add(heading);
        foreach (var entry in entries)
        {
            var recipe = recipes[entry.RecipeId];
            var allergens = recipeAllergens[entry.RecipeId];
            var menuStyle = GetTextStyle(template, $"menu:{dayIndex}");
            var ingredientStyle = GetTextStyle(template, $"ingredients:{dayIndex}");
            var allergenStyle = GetTextStyle(template, $"allergens:{dayIndex}");
            // Keep each editable part as its own element. Runs inside one TextBlock
            // cannot receive pointer input, which made the builder's previous
            // menu/ingredients/allergens selector ambiguous.
            var meal = new WrappingPanel();
            var title = $"{MenuOutputService.SlotOrder(entry.Slot)}. {recipe.Name}";
            if (!string.IsNullOrWhiteSpace(recipe.PortionSize)) title += $" ({recipe.PortionSize.Trim()})";
            if (recipe.Calories > 0) title += $" · {recipe.Calories} kcal";
            var titleBlock = StyledText(title, menuStyle, scale);
            Selectable(titleBlock, $"menu:{dayIndex}", onSelected, lifetime);
            meal.Children.Add(titleBlock);

            if (recipe.Ingredients.Count > 0)
            {
                var ingredientBlock = StyledText("", ingredientStyle, scale);
                ingredientBlock.TextDecorations = Windows.UI.Text.TextDecorations.None;
                AddRun(ingredientBlock, " — ", ingredientStyle, scale, false);
                for (var i = 0; i < recipe.Ingredients.Count; i++)
                {
                    var name = recipe.Ingredients[i];
                    if (i > 0) AddRun(ingredientBlock, ", ", ingredientStyle, scale, false);
                    var hasAllergen = ingredients.TryGetValue(name, out var ingredient) && ingredient.Allergens.Count > 0;
                    if (hasAllergen)
                    {
                        var emphasis = new TemplateTextStyle { FontFamily = ingredientStyle.FontFamily, FontSize = ingredientStyle.FontSize, Color = template.AllergenAccentColor, Opacity = template.AllergenAccentOpacity, Bold = true, Italic = ingredientStyle.Italic, Underline = true };
                        AddRun(ingredientBlock, name, emphasis, scale, true);
                    }
                    else AddRun(ingredientBlock, name, ingredientStyle, scale, false);
                }
                Selectable(ingredientBlock, $"ingredients:{dayIndex}", onSelected, lifetime);
                meal.Children.Add(ingredientBlock);
            }
            if (allergens.Length > 0)
            {
                var allergenBlock = StyledText(" · " + string.Join(", ", allergens), allergenStyle, scale);
                Selectable(allergenBlock, $"allergens:{dayIndex}", onSelected, lifetime);
                meal.Children.Add(allergenBlock);
            }
            panel.Children.Add(meal);
        }
        return panel;
    }

    private static void AddRun(TextBlock block, string text, TemplateTextStyle style, double scale, bool ingredientAllergen)
    {
        var run = new Run { Text = text, FontFamily = new FontFamily(string.IsNullOrWhiteSpace(style.FontFamily) ? "Arial" : style.FontFamily), FontSize = Math.Clamp(double.IsFinite(style.FontSize) ? style.FontSize * scale : 14, 6, 72), FontWeight = style.Bold ? FontWeights.Bold : FontWeights.Normal, FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal, Foreground = Brush(style.Color, style.Opacity) };
        if (ingredientAllergen || style.Underline) { var underline = new Underline(); underline.Inlines.Add(run); block.Inlines.Add(underline); }
        else block.Inlines.Add(run);
    }

    private static Windows.UI.Color ParseColor(string? value, Windows.UI.Color fallback)
    {
        if (value == null || !System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-fA-F]{6}$")) return fallback;
        return Windows.UI.Color.FromArgb(255, Convert.ToByte(value.Substring(1, 2), 16), Convert.ToByte(value.Substring(3, 2), 16), Convert.ToByte(value.Substring(5, 2), 16));
    }

    private static SolidColorBrush Brush(string? value, double opacity)
    {
        var color = ParseColor(value, Colors.Black);
        var alpha = (byte)Math.Round((double.IsFinite(opacity) ? Math.Clamp(opacity, 0, 1) : 1) * byte.MaxValue);
        return new SolidColorBrush(Windows.UI.Color.FromArgb(alpha, color.R, color.G, color.B));
    }

    private static async Task LoadImageAsync(Image target, string? dataUri, TemplateBitmapCache? bitmapCache, int decodeWidth, CancellationToken cancellationToken, TemplateVisualLifetime lifetime)
    {
        if (string.IsNullOrEmpty(dataUri)) return;
        if (!dataUri.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) && !dataUri.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Unsupported template image.");
        if (dataUri.Length > 14_000_000) throw new InvalidOperationException("Template image is too large.");
        try
        {
            if (bitmapCache != null)
            {
                var cached = await bitmapCache.GetAsync(dataUri, decodeWidth, 10 * 1024 * 1024);
                if (!cancellationToken.IsCancellationRequested && !lifetime.IsDisposed) target.Source = cached;
                return;
            }
            var bytes = Convert.FromBase64String(dataUri[(dataUri.IndexOf(',') + 1)..]);
            if (bytes.Length > 10 * 1024 * 1024) throw new InvalidOperationException("Template image is too large.");
            using var stream = new InMemoryRandomAccessStream();
            using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync(); stream.Seek(0);
            var bitmap = new BitmapImage(); if (decodeWidth > 0) bitmap.DecodePixelWidth = decodeWidth;
            await bitmap.SetSourceAsync(stream); if (!cancellationToken.IsCancellationRequested && !lifetime.IsDisposed) target.Source = bitmap;
        }
        catch (FormatException ex) { throw new InvalidOperationException("Invalid template image.", ex); }
    }
}

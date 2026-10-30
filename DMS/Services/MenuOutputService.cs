using System.Globalization;
using System.Net;
using System.Text;
using DMS.Models;

namespace DMS.Services;

/// <summary>Legacy HTML generation retained for template compatibility and its regression tests.</summary>
public static class MenuOutputService
{
    private static readonly string[] SupportedFonts = ["Arial", "Times New Roman", "Georgia", "Comic Sans MS", "Verdana", "Courier New", "Trebuchet MS", "Tahoma"];

    private static DateTime Monday(DateTime date) => date.Date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));

    // Rich content is deliberately rendered from structured text runs, never from
    // imported markup. A missing/empty run list uses the pre-existing plain-text
    // path byte-for-byte so old templates retain their established output.
    private static string RichTextOrPlain(TemplateRichTextContent? content, string? fallbackText)
    {
        if (content?.Runs == null || content.Runs.Count == 0) return WebUtility.HtmlEncode(fallbackText ?? "");

        static string EncodeText(string? value) => WebUtility.HtmlEncode(value ?? "")
            .Replace("\r\n", "<br>", StringComparison.Ordinal)
            .Replace("\n", "<br>", StringComparison.Ordinal)
            .Replace("\r", "<br>", StringComparison.Ordinal);
        static bool IsColor(string? value) => value != null && System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-fA-F]{6}$");
        static string Size(double value) => Math.Clamp(value, 6, 72).ToString(CultureInfo.InvariantCulture);

        var sb = new StringBuilder();
        foreach (var run in content.Runs)
        {
            if (run == null) continue;
            var css = new StringBuilder();
            if (run.FontFamily != null && SupportedFonts.Contains(run.FontFamily, StringComparer.OrdinalIgnoreCase))
                css.Append("font-family:'").Append(WebUtility.HtmlEncode(run.FontFamily)).Append("';");
            if (run.FontSize is double fontSize && double.IsFinite(fontSize)) css.Append("font-size:").Append(Size(fontSize)).Append("px;");
            if (IsColor(run.Color)) css.Append("color:").Append(run.Color).Append(';');
            if (run.Bold is bool bold) css.Append("font-weight:").Append(bold ? "bold" : "normal").Append(';');
            if (run.Italic is bool italic) css.Append("font-style:").Append(italic ? "italic" : "normal").Append(';');
            if (run.Underline is bool underline) css.Append("text-decoration:").Append(underline ? "underline" : "none").Append(';');

            var text = EncodeText(run.Text);
            if (css.Length == 0) sb.Append(text);
            else sb.Append("<span style=\"").Append(css).Append("\">").Append(text).Append("</span>");
        }
        return sb.ToString();
    }

    private static string PageRule(MenuTemplate template)
    {
        // Only A4 variants are currently supported. Keep the literal legacy rule
        // for null/default settings so existing generated documents are unchanged.
        if (template.PageSettings == null ||
            (!string.Equals(template.PageSettings.Size, "a4", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(template.PageSettings.Size)) ||
            string.Equals(template.PageSettings.Orientation, "portrait", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(template.PageSettings.Orientation)) return "size:A4";
        return string.Equals(template.PageSettings.Orientation, "landscape", StringComparison.OrdinalIgnoreCase) ? "size:A4 landscape" : "size:A4";
    }

    private static string ImagePresentation(TemplateImageLayer layer)
    {
        var css = new StringBuilder();
        if (layer.FitMode is "contain" or "cover") css.Append(";object-fit:").Append(layer.FitMode);
        if (double.IsFinite(layer.RotationDegrees))
        {
            var rotation = Math.Clamp(layer.RotationDegrees, -360, 360);
            if (Math.Abs(rotation) > 0.001) css.Append(";transform:rotate(").Append(rotation.ToString(CultureInfo.InvariantCulture)).Append("deg);transform-origin:center");
        }
        return css.ToString();
    }

    private static string ImageAlt(TemplateImageLayer layer)
    {
        // A concise alternate description is useful to assistive technology and
        // cannot become markup because callers HTML-encode it before writing it.
        return layer.AltText?.Length > 300 ? layer.AltText[..300] : layer.AltText ?? string.Empty;
    }

    public static string BuildHtml(MenuTemplate template, DateTime week, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient>? ingredients = null, int marginMm = 10)
    {
        if (template.LayoutEnabled) return BuildPositionedHtml(template, week, entries, recipes, ingredients);
        static string H(string? value) => WebUtility.HtmlEncode(value ?? "");
        static string Color(string? value, string fallback) => value != null && System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-fA-F]{6}$") ? value : fallback;
        static string Align(string? value) => value is "left" or "right" or "center" ? value : "center";
        static string Size(double value, double fallback) => (double.IsFinite(value) ? Math.Clamp(value, 6, 72) : fallback).ToString(CultureInfo.InvariantCulture);
        var fonts = new[] { "Arial", "Times New Roman", "Georgia", "Comic Sans MS", "Verdana", "Courier New", "Trebuchet MS", "Tahoma" };
        var font = fonts.Contains(template.FontFamily, StringComparer.OrdinalIgnoreCase) ? template.FontFamily : "Arial";
        string TextStyle(string key)
        {
            if (template.TextStyles == null || !template.TextStyles.TryGetValue(key, out var style) || style == null) return "";
            var family = fonts.Contains(style.FontFamily, StringComparer.OrdinalIgnoreCase) ? style.FontFamily : "Arial";
            return $"font-family:'{H(family)}';font-size:{Size(style.FontSize, 11)}px;color:{Color(style.Color, "#000000")};font-weight:{(style.Bold ? "bold" : "normal")};font-style:{(style.Italic ? "italic" : "normal")};text-decoration:{(style.Underline ? "underline" : "none")}";
        }
        string DayTextStyle(int day, string element)
        {
            var group = element.StartsWith("day:") ? "heading" : element.StartsWith("ingredients:") ? "ingredient-group" : element.StartsWith("allergens:") ? "allergen-group" : "menu";
            var groupKey = $"{group}:{day}";
            if (template.TextStyles != null && template.TextStyles.ContainsKey(groupKey)) return TextStyle(groupKey);
            if (template.TextStyles != null && template.TextStyles.ContainsKey($"block:{day}")) return TextStyle($"block:{day}");
            return TextStyle(element);
        }
        var background = Color(template.BackgroundColor, "#ffffff");
        var headerColor = Color(template.HeaderColor, "#D2691E");
        var margin = Math.Clamp(marginMm, 0, 25).ToString(CultureInfo.InvariantCulture);
        var image = template.BackgroundImageDataUri;
        var validImage = image != null && System.Text.RegularExpressions.Regex.IsMatch(image, @"\Adata:image/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+\z", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var sb = new StringBuilder();
        sb.Append("<!doctype html><html><head><meta charset='utf-8'><meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'\"><style>");
        sb.Append("@page{").Append(PageRule(template)).Append(";margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:794px;min-height:1123px;color:#222;background:").Append(background).Append(";font-family:'").Append(H(font)).Append("',sans-serif}main{position:relative;min-height:1123px;padding:").Append(margin).Append("mm;overflow-wrap:anywhere}.background{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}.content{position:relative;z-index:1}h1{margin:0 0 6px}h2{font-size:15px;margin:12px 0 4px}.meal{margin:4px 0;break-inside:avoid}.detail{color:#555;font-size:.9em;margin-left:14px}.columns{columns:2;column-gap:24px}footer{margin-top:18px;border-top:1px solid #ddd;padding-top:8px} @media print{body{width:auto;min-height:0}main{min-height:0}}");
        sb.Append("</style></head><body><main>");
        if (validImage) sb.Append("<div class='background' style=\"background-image:url('").Append(H(image)).Append("');opacity:").Append((double.IsFinite(template.BackgroundImageOpacity) ? Math.Clamp(template.BackgroundImageOpacity, 0, 1) : 1).ToString(CultureInfo.InvariantCulture)).Append("\"></div>");
        sb.Append("<div class='content'>");
        if (template.ShowHeader) sb.Append("<h1 style=\"text-align:").Append(Align(template.HeaderAlignment)).Append(";color:").Append(headerColor).Append(";font-size:").Append(Size(template.HeaderFontSize,24)).Append("px;font-weight:").Append(template.HeaderBold ? "bold" : "normal").Append(";font-style:").Append(template.HeaderItalic ? "italic" : "normal").Append(";text-decoration:").Append(template.HeaderUnderline ? "underline" : "none").Append(';').Append(TextStyle("header")).Append("\">").Append(RichTextOrPlain(template.HeaderRichText, template.HeaderText)).Append("</h1>");
        if (template.ShowDateRange) sb.Append("<div style=\"text-align:center;").Append(TextStyle("date")).Append("\">").Append(H($"{week:d} – {week.AddDays(template.IncludeWeekend ? 6 : 4):d}")).Append("</div>");
        sb.Append("<div style='font-size:").Append(Size(template.MealFontSize, 11)).Append("px' class='").Append(template.TemplateStyle == "detailed-2col" ? "columns" : "").Append("'>");
        var byId = recipes.ToDictionary(r => r.Id);
        var ingredientByName = (ingredients ?? Array.Empty<Ingredient>()).GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < (template.IncludeWeekend ? 7 : 5); i++)
        {
            var day = week.Date.AddDays(i);
            var dayEntries = entries.Where(e => e.Date.Date == day && byId.ContainsKey(e.RecipeId)).OrderBy(e => SlotOrder(e.Slot)).ToList();
            if (dayEntries.Count == 0) continue;
            sb.Append("<section><h2 style=\"").Append(DayTextStyle(i, $"day:{i}")).Append("\">").Append(H(day.ToString("dddd, d MMMM"))).Append("</h2>");
            foreach (var entry in dayEntries)
            {
                var recipe = byId[entry.RecipeId];
                var slot = SlotOrder(entry.Slot);
                sb.Append("<div class='meal'><span style=\"").Append(DayTextStyle(i, $"meal:{i}:{slot}")).Append("\">").Append(slot).Append(". ").Append(H(recipe.Name)).Append("</span>");
                if (template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) sb.Append(" <span class='detail' style=\"").Append(DayTextStyle(i, "")).Append("\">").Append(H(recipe.PortionSize)).Append("</span>");
                if (template.TemplateStyle != "compact")
                {
                    if (template.ShowIngredients && recipe.Ingredients.Count > 0) sb.Append("<div class='detail' style=\"").Append(DayTextStyle(i, $"ingredients:{i}:{slot}")).Append("\">").Append(H(string.Join(", ", recipe.Ingredients))).Append("</div>");
                    if (template.ShowCalories && recipe.Calories > 0) sb.Append("<div class='detail' style=\"").Append(DayTextStyle(i, "")).Append("\">").Append(recipe.Calories).Append(" kcal</div>");
                }
                else
                {
                    if (template.ShowIngredients && recipe.Ingredients.Count > 0) sb.Append(" <span class='detail' style=\"").Append(DayTextStyle(i, $"ingredients:{i}:{slot}")).Append("\">").Append(H(string.Join(", ", recipe.Ingredients))).Append("</span>");
                    if (template.ShowCalories && recipe.Calories > 0) sb.Append(" <span class='detail' style=\"").Append(DayTextStyle(i, "")).Append("\">").Append(recipe.Calories).Append(" kcal</span>");
                }
                // The old model flattened inherited and manual allergens. Retain those values and
                // include current ingredient allergens so later ingredient edits cannot hide a risk.
                var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name =>
                    ingredientByName.TryGetValue(name, out var ingredient) ? ingredient.Allergens : []))
                    .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                if (allergens.Count > 0) sb.Append("<div class='detail' style=\"").Append(DayTextStyle(i, $"allergens:{i}:{slot}")).Append("\">⚠ ").Append(H(string.Join(", ", allergens.Select(Localization.Allergen)))).Append("</div>");
                sb.Append("</div>");
            }
            sb.Append("</section>");
        }
        sb.Append("</div>");
        if (template.ShowFooter) sb.Append("<footer style=\"text-align:").Append(Align(template.FooterAlignment)).Append(";font-size:").Append(Size(template.FooterFontSize,9)).Append("px;").Append(TextStyle("footer")).Append("\">").Append(RichTextOrPlain(template.FooterRichText, template.FooterText)).Append("</footer>");
        return sb.Append("</div></main></body></html>").ToString();
    }

    // Canvas coordinates are page-relative. A fixed page origin is essential: the
    // margin dropdown must not shift independently positioned objects in export.
    private static string BuildPositionedHtml(MenuTemplate source, DateTime week, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient>? ingredients)
    {
        var template = source;
        var defaults = new MenuTemplate();
        TemplateLayout.EnsureInitialized(defaults);
        if (template.IncludeWeekend) TemplateLayout.InitializeSevenDayLayout(defaults);
        static string H(string? value) => WebUtility.HtmlEncode(value ?? "");
        static string Color(string? value, string fallback) => value != null && System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-fA-F]{6}$") ? value : fallback;
        static string Num(double value, double fallback, double min, double max) => (double.IsFinite(value) ? Math.Clamp(value, min, max) : fallback).ToString(CultureInfo.InvariantCulture);
        static string Align(string? value) => value is "left" or "right" or "center" ? value : "center";
        static bool ValidImage(string? uri) => uri != null && System.Text.RegularExpressions.Regex.IsMatch(uri, @"\Adata:image/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+\z", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var fonts = new[] { "Arial", "Times New Roman", "Georgia", "Comic Sans MS", "Verdana", "Courier New", "Trebuchet MS", "Tahoma" };
        string Font(string? value) => fonts.Contains(value, StringComparer.OrdinalIgnoreCase) ? value! : "Arial";
        string Appearance(string key)
        {
            if (template.BlockAppearances == null || !template.BlockAppearances.TryGetValue(key, out var appearance) || appearance == null) return "";
            var background = Color(appearance.BackgroundColor, "transparent");
            var borderColor = Color(appearance.BorderColor, "transparent");
            var borderThickness = Num(appearance.BorderThickness, 0, 0, 20);
            var radius = Num(appearance.CornerRadius, 0, 0, 200);
            var padding = Num(appearance.Padding, 0, 0, 100);
            var opacity = Num(appearance.Opacity, 1, 0, 1);
            return $";background-color:{background};border:{borderThickness}px solid {borderColor};border-radius:{radius}px;padding:{padding}px;opacity:{opacity}";
        }
        string Css(TemplateTextStyle style, double scale = 1) => $"font-family:'{H(Font(style.FontFamily))}';font-size:{Num(style.FontSize * scale, 11, 3, 72)}px;color:{Color(style.Color, "#000000")};font-weight:{(style.Bold ? "bold" : "normal")};font-style:{(style.Italic ? "italic" : "normal")};text-decoration:{(style.Underline ? "underline" : "none")}" + (style.Alignment is "left" or "center" or "right" ? $";text-align:{style.Alignment}" : "");
        TemplateTextStyle Style(string key, double size, bool bold = false, string? legacy = null)
        {
            if (template.TextStyles != null && template.TextStyles.TryGetValue(key, out var found) && found != null) return found;
            var split = key.Split(':');
            if (split.Length == 2 && template.TextStyles != null && template.TextStyles.TryGetValue($"block:{split[1]}", out var block) && block != null) return block;
            if (legacy != null && template.TextStyles != null && template.TextStyles.TryGetValue(legacy, out var old) && old != null) return old;
            return new TemplateTextStyle { FontFamily = template.FontFamily, FontSize = size, Bold = bold };
        }
        string Position(TemplateLayoutElement item, double? resolvedHeight = null) => $"position:absolute;left:{Num(item.X, 0, 0, 794)}px;top:{Num(item.Y, 0, 0, 1123)}px;width:{Num(item.Width, 100, 1, 794)}px;min-height:{Num(resolvedHeight ?? item.Height, 20, 1, 1123)}px;z-index:{Math.Clamp(item.ZIndex, 1, 1000)}";
        var sb = new StringBuilder();
        sb.Append("<!doctype html><html><head><meta charset='utf-8'><meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'\"><style>");
        sb.Append("@page{").Append(PageRule(template)).Append(";margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:794px;height:1123px;background:").Append(Color(template.BackgroundColor, "#FFFFFF")).Append(";font-family:'").Append(H(Font(template.FontFamily))).Append("',sans-serif}.page{position:relative;width:794px;min-height:1123px;overflow-wrap:anywhere}.box{white-space:pre-wrap}.line{margin-bottom:3px}img{object-fit:fill} @media print{html,body{width:794px;height:1123px}}");
        sb.Append("</style></head><body><main class='page'>");
        if (ValidImage(template.BackgroundImageDataUri)) sb.Append("<div style=\"position:absolute;inset:0;z-index:0;background-image:url('").Append(H(template.BackgroundImageDataUri)).Append("');background-size:cover;background-position:center;opacity:").Append(Num(template.BackgroundImageOpacity, 1, 0, 1)).Append("\"></div>");
        foreach (var layer in template.ImageLayers ?? [])
        {
            if (layer == null || !ValidImage(layer.DataUri)) continue;
            sb.Append("<img alt='").Append(H(ImageAlt(layer))).Append("' src=\"").Append(H(layer.DataUri)).Append("\" style=\"position:absolute;left:").Append(Num(layer.X, 0, 0, 794)).Append("px;top:").Append(Num(layer.Y, 0, 0, 1123)).Append("px;width:").Append(Num(layer.Width, 100, 1, 794)).Append("px;height:").Append(Num(layer.Height, 100, 1, 1123)).Append("px;z-index:").Append(Math.Clamp(layer.ZIndex, 1, 1000)).Append(";opacity:").Append(Num(layer.Opacity, 1, 0, 1)).Append(ImagePresentation(layer)).Append("\">");
        }
        foreach (var layer in template.TextLayers ?? [])
        {
            if (layer == null) continue;
            var position = new TemplateLayoutElement { X = layer.X, Y = layer.Y, Width = layer.Width, Height = layer.Height, ZIndex = layer.ZIndex };
            sb.Append("<div class='box' data-element=\"").Append(H("text:" + layer.Id)).Append("\" style=\"")
                .Append(Position(position)).Append(';').Append(Css(layer.Style ?? new TemplateTextStyle())).Append(Appearance("text:" + layer.Id))
                .Append("\">").Append(H(layer.Text)).Append("</div>");
        }
        TemplateLayoutElement Element(string key) => template.LayoutElements != null && template.LayoutElements.TryGetValue(key, out var element) && element != null ? element : defaults.LayoutElements[key];
        void Box(string key, string text, TemplateTextStyle style, string align = "left", TemplateRichTextContent? richText = null) => sb.Append("<div class='box' data-element=\"").Append(H(key)).Append("\" style=\"").Append(Position(Element(key))).Append(';').Append(Css(style)).Append(";text-align:").Append(Align(align)).Append(Appearance(key)).Append("\">").Append(RichTextOrPlain(richText, text)).Append("</div>");
        var headerDefault = new TemplateTextStyle { FontFamily = template.FontFamily, FontSize = template.HeaderFontSize, Color = template.HeaderColor, Bold = template.HeaderBold, Italic = template.HeaderItalic, Underline = template.HeaderUnderline };
        var headerStyle = template.TextStyles != null && template.TextStyles.TryGetValue("header", out var header) && header != null ? header : headerDefault;
        if (template.ShowHeader) Box("header", template.HeaderText, headerStyle, headerStyle.Alignment ?? template.HeaderAlignment, template.HeaderRichText);
        if (template.ShowDateRange) Box("date", $"{week:d} – {week.AddDays(template.IncludeWeekend ? 6 : 4):d}", Style("date", 14), "center");
        var byId = recipes.GroupBy(r => r.Id).ToDictionary(g => g.Key, g => g.First());
        var ingredientByName = (ingredients ?? Array.Empty<Ingredient>()).GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase).ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < (template.IncludeWeekend ? 7 : 5); i++)
        {
            var day = week.Date.AddDays(i);
            Box($"heading:{i}", day.ToString("dddd, d MMMM"), Style($"heading:{i}", 15, true, $"day:{i}"));
            var key = $"menu:{i}";
            var menuLines = new List<(string Text, double FontSize)>();
            var menuEntries = entries.Where(e => e.Date.Date == day && byId.ContainsKey(e.RecipeId)).OrderBy(e => SlotOrder(e.Slot)).ToList();
            foreach (var entry in menuEntries)
            {
                var recipe = byId[entry.RecipeId];
                var slot = SlotOrder(entry.Slot);
                var name = $"{slot}. {recipe.Name}";
                if (template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) name += $" ({recipe.PortionSize})";
                if (template.ShowCalories && recipe.Calories > 0) name += $" · {recipe.Calories} kcal";
                menuLines.Add((name, Style(key, template.MealFontSize, legacy: $"meal:{i}:{slot}").FontSize));
                if (template.ShowIngredients && recipe.Ingredients.Count > 0) menuLines.Add((string.Join(", ", recipe.Ingredients), Style($"ingredient-group:{i}", template.MealFontSize, legacy: $"ingredients:{i}:{slot}").FontSize));
                var estimatedAllergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(ingredientName => ingredientByName.TryGetValue(ingredientName, out var ingredient) ? ingredient.Allergens : []))
                    .Distinct(StringComparer.OrdinalIgnoreCase).Select(Localization.Allergen).ToList();
                if (estimatedAllergens.Count > 0) menuLines.Add(("⚠ " + string.Join(", ", estimatedAllergens), Style($"allergen-group:{i}", template.MealFontSize, legacy: $"allergens:{i}:{slot}").FontSize));
            }
            var menuElement = Element(key);
            var neighbors = new List<TemplateLayoutElement>();
            if (template.ShowHeader) neighbors.Add(Element("header"));
            if (template.ShowDateRange) neighbors.Add(Element("date"));
            if (template.ShowFooter) neighbors.Add(Element("footer"));
            for (var neighbor = 0; neighbor < (template.IncludeWeekend ? 7 : 5); neighbor++)
            {
                neighbors.Add(Element($"heading:{neighbor}"));
                if (neighbor != i) neighbors.Add(Element($"menu:{neighbor}"));
            }
            var available = TemplateLayout.AvailableHeight(menuElement, neighbors);
            var resolution = TemplateLayout.ResolveMenuFit(template, menuElement, TemplateLayout.EstimateTextHeight(menuLines, menuElement.Width), available);
            sb.Append("<div class='box").Append(template.MenuBlockSizing?.Enabled == true ? " menu-box" : "").Append(resolution.Overflowed ? " menu-overflow" : "").Append("' data-element=\"").Append(key).Append("\"")
                .Append(resolution.Overflowed ? " data-layout-overflow=\"true\"" : "")
                .Append(" style=\"").Append(Position(menuElement, resolution.Height)).Append(Appearance(key)).Append("\">");
            foreach (var entry in menuEntries)
            {
                var recipe = byId[entry.RecipeId];
                var slot = SlotOrder(entry.Slot);
                var name = $"{slot}. {recipe.Name}";
                if (template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) name += $" ({recipe.PortionSize})";
                if (template.ShowCalories && recipe.Calories > 0) name += $" · {recipe.Calories} kcal";
                sb.Append("<div class='meal'><div class='line' style=\"").Append(Css(Style(key, template.MealFontSize, legacy: $"meal:{i}:{slot}"), resolution.FontScale)).Append("\">").Append(H(name)).Append("</div>");
                if (template.ShowIngredients && recipe.Ingredients.Count > 0) sb.Append("<div class='line' style=\"").Append(Css(Style($"ingredient-group:{i}", template.MealFontSize, legacy: $"ingredients:{i}:{slot}"), resolution.FontScale)).Append("\">").Append(H(string.Join(", ", recipe.Ingredients))).Append("</div>");
                var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name => ingredientByName.TryGetValue(name, out var ingredient) ? ingredient.Allergens : []))
                    .Distinct(StringComparer.OrdinalIgnoreCase).Select(Localization.Allergen).ToList();
                if (allergens.Count > 0) sb.Append("<div class='line' style=\"").Append(Css(Style($"allergen-group:{i}", template.MealFontSize, legacy: $"allergens:{i}:{slot}"), resolution.FontScale)).Append("\">⚠ ").Append(H(string.Join(", ", allergens))).Append("</div>");
                sb.Append("</div>");
            }
            sb.Append("</div>");
        }
        var footerStyle = Style("footer", template.FooterFontSize);
        if (template.ShowFooter) Box("footer", template.FooterText, footerStyle, footerStyle.Alignment ?? template.FooterAlignment, template.FooterRichText);
        return sb.Append("</main></body></html>").ToString();
    }

    public static int SlotOrder(string slot) => slot.ToLowerInvariant() switch
    {
        "slot1" or "soup" or "breakfast" => 1,
        "slot2" or "main" or "lunch" => 2,
        "slot3" or "dessert" or "dinner" => 3,
        "slot4" or "other" or "snack" => 4,
        _ => 5
    };
}

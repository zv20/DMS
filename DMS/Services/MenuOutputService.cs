using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using DMS.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Web.WebView2.Core;
using Windows.Storage;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;

namespace DMS.Services;

/// <summary>Displays and exports the saved menu using the same document for each output.</summary>
public static class MenuOutputService
{
    private static DateTime Monday(DateTime date) => date.Date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));

    public static async Task ShowAsync(XamlRoot root, DateTime preferredDate)
    {
        var database = App.Services.GetRequiredService<IDatabaseService>();
        var entries = await database.GetMenuAsync(DateTime.MinValue, DateTime.MaxValue);
        var recipes = await database.GetAllRecipesAsync();
        var ingredients = await database.GetAllIngredientsAsync();
        var weeks = entries.Where(e => e.Date.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
            .Select(e => Monday(e.Date)).Distinct().OrderByDescending(d => d).ToList();
        if (weeks.Count == 0)
        {
            await new ContentDialog { XamlRoot = root, Title = Localization.Get("OutputTitle"),
                Content = Localization.Get("OutputNoRecipes"), CloseButtonText = Localization.Get("OutputClose") }.ShowAsync();
            return;
        }
        var templates = await database.GetAllTemplatesAsync();
        foreach (var template in templates) TemplateCompatibility.ApplyLegacyDefaults(template);
        templates.Insert(0, new MenuTemplate { Name = Localization.Get("OutputDefaultTemplate"),
            HeaderText = Localization.Get("String_Text_Weekly_Menu_69fa95"), FooterText = Localization.Get("String_Text_Prepared_with_care_by_DMS_082a78") });
        var weekBox = new ComboBox { Header = Localization.Get("OutputWeek"), MinWidth = 230 };
        foreach (var week in weeks) weekBox.Items.Add(new ComboBoxItem { Tag = week, Content = $"{week:d} – {week.AddDays(4):d}" });
        weekBox.SelectedIndex = Math.Max(0, weeks.IndexOf(Monday(preferredDate)));
        var templateBox = new ComboBox { Header = Localization.Get("OutputTemplate"), ItemsSource = templates, DisplayMemberPath = "Name", SelectedIndex = 0, MinWidth = 200 };
        var margins = new ComboBox { Header = Localization.Get("OutputMargins"), ItemsSource = new[] { "5 mm", "10 mm", "15 mm" }, SelectedIndex = 1, MinWidth = 95 };
        // Keep the document's A4-sized viewport fixed so PDF and PNG output are not
        // affected by the size of the preview shown inside the dialog.
        var view = new WebView2 { Width = 794, Height = 1123 };
        var status = new TextBlock { TextWrapping = TextWrapping.Wrap };
        var print = new Button { Content = Localization.Get("OutputPrint"), IsEnabled = false };
        var pdf = new Button { Content = Localization.Get("OutputSavePdf"), IsEnabled = false };
        var png = new Button { Content = Localization.Get("OutputSaveImage"), IsEnabled = false };
        var options = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
        options.Children.Add(weekBox); options.Children.Add(templateBox); options.Children.Add(margins);
        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        actions.Children.Add(print); actions.Children.Add(pdf); actions.Children.Add(png);
        var panel = new Grid { RowSpacing = 10 };
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        var optionScroll = new ScrollViewer { Content = options, HorizontalScrollMode = ScrollMode.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto, VerticalScrollMode = ScrollMode.Disabled };
        var actionScroll = new ScrollViewer { Content = actions, HorizontalScrollMode = ScrollMode.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto, VerticalScrollMode = ScrollMode.Disabled };
        var pagePreview = new Viewbox { Child = view, Stretch = Stretch.Uniform, StretchDirection = StretchDirection.DownOnly,
            HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        var previewArea = new Grid { HorizontalAlignment = HorizontalAlignment.Stretch, VerticalAlignment = VerticalAlignment.Stretch };
        previewArea.Children.Add(pagePreview);
        Grid.SetRow(optionScroll, 0); Grid.SetRow(actionScroll, 1); Grid.SetRow(status, 2); Grid.SetRow(previewArea, 3);
        panel.Children.Add(optionScroll); panel.Children.Add(actionScroll); panel.Children.Add(status); panel.Children.Add(previewArea);
        if (App.CurrentWindow.Content is not Grid windowRoot)
            throw new InvalidOperationException("The app window cannot display the preview.");

        // A regular ContentDialog imposes internal size limits that can clip the
        // document. An in-window overlay gives the preview the actual window space.
        var dismissed = new TaskCompletionSource<bool>();
        var close = new Button { Content = Localization.Get("OutputClose"), HorizontalAlignment = HorizontalAlignment.Right };
        var heading = new Grid { ColumnSpacing = 12 };
        heading.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        heading.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        heading.Children.Add(new TextBlock { Text = Localization.Get("OutputPreviewExport"), FontSize = 20,
            FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, TextWrapping = TextWrapping.Wrap });
        Grid.SetColumn(close, 1);
        heading.Children.Add(close);
        var cardContent = new Grid { RowSpacing = 12, Padding = new Thickness(20) };
        cardContent.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        cardContent.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        Grid.SetRow(panel, 1);
        cardContent.Children.Add(heading);
        cardContent.Children.Add(panel);
        var cardColor = windowRoot.ActualTheme == ElementTheme.Light
            ? Windows.UI.Color.FromArgb(255, 250, 250, 250)
            : Windows.UI.Color.FromArgb(255, 40, 40, 40);
        var card = new Border { Child = cardContent, CornerRadius = new CornerRadius(8),
            Background = new SolidColorBrush(cardColor),
            HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        var overlay = new Grid { Background = new SolidColorBrush(Windows.UI.Color.FromArgb(160, 0, 0, 0)) };
        overlay.Children.Add(card);
        Grid.SetRowSpan(overlay, Math.Max(1, windowRoot.RowDefinitions.Count));
        Grid.SetColumnSpan(overlay, Math.Max(1, windowRoot.ColumnDefinitions.Count));
        Canvas.SetZIndex(overlay, 1000);
        void ResizeOverlay()
        {
            card.Width = Math.Max(0, Math.Min(root.Size.Width - 32, 1100));
            card.Height = Math.Max(0, Math.Min(root.Size.Height - 32, 1000));
        }
        Windows.Foundation.TypedEventHandler<XamlRoot, XamlRootChangedEventArgs> rootChanged = (_, _) => ResizeOverlay();
        var ownerWindow = App.CurrentWindow;
        Windows.Foundation.TypedEventHandler<object, WindowEventArgs> windowClosed = (_, _) => dismissed.TrySetResult(true);
        close.Click += (_, _) => dismissed.TrySetResult(true);
        overlay.KeyDown += (_, args) =>
        {
            if (args.Key == Windows.System.VirtualKey.Escape && close.IsEnabled)
            {
                args.Handled = true;
                dismissed.TrySetResult(true);
            }
        };
        root.Changed += rootChanged;
        ownerWindow.Closed += windowClosed;
        ResizeOverlay();
        bool ready = false;
        void SetReady(bool value) { ready = value; print.IsEnabled = pdf.IsEnabled = png.IsEnabled = value; }
        void Refresh()
        {
            if (view.CoreWebView2 == null || weekBox.SelectedItem is not ComboBoxItem weekItem || weekItem.Tag is not DateTime week || templateBox.SelectedItem is not MenuTemplate template) return;
            SetReady(false);
            status.Text = Localization.Get("OutputPreparing");
            var margin = margins.SelectedIndex switch { 0 => 5, 2 => 15, _ => 10 };
            var html = BuildHtml(template, week, entries, recipes, ingredients, margin);
            if (Encoding.UTF8.GetByteCount(html) > 1_900_000)
            {
                status.Text = Localization.Get("OutputImageTooLarge");
                return;
            }
            view.NavigateToString(html);
        }
        view.NavigationCompleted += (_, args) =>
        {
            SetReady(args.IsSuccess);
            status.Text = args.IsSuccess
                ? (templateBox.SelectedItem is MenuTemplate selected && selected.LegacyDataJson != null ? Localization.Get("TplLegacy") : "")
                : Localization.Get("OutputPreviewFailed");
        };
        view.Loaded += async (_, _) =>
        {
            try
            {
                await view.EnsureCoreWebView2Async();
                view.CoreWebView2.Settings.IsScriptEnabled = false;
                view.CoreWebView2.NewWindowRequested += (_, args) => args.Handled = true;
                Refresh();
            }
            catch (Exception ex) { status.Text = Localization.Get("OutputWebViewRequired") + ex.Message; }
        };
        weekBox.SelectionChanged += (_, _) => Refresh();
        templateBox.SelectionChanged += (_, _) => Refresh();
        margins.SelectionChanged += (_, _) => Refresh();
        print.Click += (_, _) =>
        {
            if (!ready) return;
            try { view.CoreWebView2.ShowPrintUI(CoreWebView2PrintDialogKind.System); }
            catch (Exception ex) { status.Text = ex.Message; }
        };
        pdf.Click += async (_, _) =>
        {
            if (!ready || weekBox.SelectedItem is not ComboBoxItem { Tag: DateTime selectedWeek }) return;
            SetReady(false);
            weekBox.IsEnabled = templateBox.IsEnabled = margins.IsEnabled = close.IsEnabled = false;
            try
            {
                var file = await PickAsync("PDF", ".pdf", selectedWeek);
                if (file == null) return;
                var settings = view.CoreWebView2.Environment.CreatePrintSettings();
                settings.PageWidth = 210.0 / 25.4;
                settings.PageHeight = 297.0 / 25.4;
                settings.MarginTop = settings.MarginBottom = settings.MarginLeft = settings.MarginRight = 0;
                settings.ShouldPrintBackgrounds = true;
                settings.ShouldPrintHeaderAndFooter = false;
                var success = await view.CoreWebView2.PrintToPdfAsync(file.Path, settings);
                status.Text = Localization.Get(success ? "OutputPdfSaved" : "OutputPdfFailed");
            }
            catch (Exception ex) { status.Text = ex.Message; }
            finally { weekBox.IsEnabled = templateBox.IsEnabled = margins.IsEnabled = close.IsEnabled = true; SetReady(true); }
        };
        png.Click += async (_, _) =>
        {
            if (!ready || weekBox.SelectedItem is not ComboBoxItem { Tag: DateTime selectedWeek }) return;
            SetReady(false);
            weekBox.IsEnabled = templateBox.IsEnabled = margins.IsEnabled = close.IsEnabled = false;
            try
            {
                // CapturePreview captures the viewport. Refuse cropped output for an overflowing document.
                var heightJson = await view.CoreWebView2.ExecuteScriptAsync("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)");
                if (JsonSerializer.Deserialize<double>(heightJson) > 1123)
                {
                    status.Text = Localization.Get("OutputImageOverflow");
                    return;
                }
                var file = await PickAsync("PNG", ".png", selectedWeek);
                if (file == null) return;
                using var image = new InMemoryRandomAccessStream();
                await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, image);
                image.Seek(0);
                using var output = await file.OpenAsync(FileAccessMode.ReadWrite);
                output.Size = 0;
                await RandomAccessStream.CopyAsync(image, output);
                await output.FlushAsync();
                status.Text = Localization.Get("OutputImageSaved");
            }
            catch (Exception ex) { status.Text = ex.Message; }
            finally { weekBox.IsEnabled = templateBox.IsEnabled = margins.IsEnabled = close.IsEnabled = true; SetReady(true); }
        };
        try
        {
            // Add only after the WebView's Loaded handler has been registered.
            windowRoot.Children.Add(overlay);
            await dismissed.Task;
        }
        finally
        {
            root.Changed -= rootChanged;
            ownerWindow.Closed -= windowClosed;
            view.Close();
            windowRoot.Children.Remove(overlay);
        }
    }

    private static async Task<StorageFile?> PickAsync(string type, string extension, DateTime selectedWeek)
    {
        var start = Monday(selectedWeek);
        var end = start.AddDays(4);
        var filename = $"{start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)} - {end.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}";
        var picker = new FileSavePicker { SuggestedStartLocation = PickerLocationId.DocumentsLibrary, SuggestedFileName = filename };
        picker.FileTypeChoices.Add(type, new[] { extension });
        WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
        return await picker.PickSaveFileAsync();
    }

    public static string BuildHtml(MenuTemplate template, DateTime week, IReadOnlyList<MenuEntry> entries, IReadOnlyList<Recipe> recipes, IReadOnlyList<Ingredient>? ingredients = null, int marginMm = 10)
    {
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
        var background = Color(template.BackgroundColor, "#ffffff");
        var headerColor = Color(template.HeaderColor, "#D2691E");
        var margin = Math.Clamp(marginMm, 0, 25).ToString(CultureInfo.InvariantCulture);
        var image = template.BackgroundImageDataUri;
        var validImage = image != null && System.Text.RegularExpressions.Regex.IsMatch(image, @"\Adata:image/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+\z", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var sb = new StringBuilder();
        sb.Append("<!doctype html><html><head><meta charset='utf-8'><meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'\"><style>");
        sb.Append("@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:794px;min-height:1123px;color:#222;background:").Append(background).Append(";font-family:'").Append(H(font)).Append("',sans-serif}main{position:relative;min-height:1123px;padding:").Append(margin).Append("mm;overflow-wrap:anywhere}.background{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}.content{position:relative;z-index:1}h1{margin:0 0 6px}h2{font-size:15px;margin:12px 0 4px}.meal{margin:4px 0;break-inside:avoid}.detail{color:#555;font-size:.9em;margin-left:14px}.columns{columns:2;column-gap:24px}footer{margin-top:18px;border-top:1px solid #ddd;padding-top:8px} @media print{body{width:auto;min-height:0}main{min-height:0}}");
        sb.Append("</style></head><body><main>");
        if (validImage) sb.Append("<div class='background' style=\"background-image:url('").Append(H(image)).Append("');opacity:").Append((double.IsFinite(template.BackgroundImageOpacity) ? Math.Clamp(template.BackgroundImageOpacity, 0, 1) : 1).ToString(CultureInfo.InvariantCulture)).Append("\"></div>");
        sb.Append("<div class='content'>");
        if (template.ShowHeader) sb.Append("<h1 style=\"text-align:").Append(Align(template.HeaderAlignment)).Append(";color:").Append(headerColor).Append(";font-size:").Append(Size(template.HeaderFontSize,24)).Append("px;font-weight:").Append(template.HeaderBold ? "bold" : "normal").Append(";font-style:").Append(template.HeaderItalic ? "italic" : "normal").Append(";text-decoration:").Append(template.HeaderUnderline ? "underline" : "none").Append(';').Append(TextStyle("header")).Append("\">").Append(H(template.HeaderText)).Append("</h1>");
        if (template.ShowDateRange) sb.Append("<div style=\"text-align:center;").Append(TextStyle("date")).Append("\">").Append(H($"{week:d} – {week.AddDays(4):d}")).Append("</div>");
        sb.Append("<div style='font-size:").Append(Size(template.MealFontSize, 11)).Append("px' class='").Append(template.TemplateStyle == "detailed-2col" ? "columns" : "").Append("'>");
        var byId = recipes.ToDictionary(r => r.Id);
        var ingredientByName = (ingredients ?? Array.Empty<Ingredient>()).GroupBy(i => i.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < 5; i++)
        {
            var day = week.Date.AddDays(i);
            var dayEntries = entries.Where(e => e.Date.Date == day && byId.ContainsKey(e.RecipeId)).OrderBy(e => SlotOrder(e.Slot)).ToList();
            if (dayEntries.Count == 0) continue;
            sb.Append("<section><h2 style=\"").Append(TextStyle($"day:{i}")).Append("\">").Append(H(day.ToString("dddd, d MMMM"))).Append("</h2>");
            foreach (var entry in dayEntries)
            {
                var recipe = byId[entry.RecipeId];
                var slot = SlotOrder(entry.Slot);
                sb.Append("<div class='meal'><span style=\"").Append(TextStyle($"meal:{i}:{slot}")).Append("\">").Append(slot).Append(". ").Append(H(recipe.Name)).Append("</span>");
                if (template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) sb.Append(" <span class='detail'>").Append(H(recipe.PortionSize)).Append("</span>");
                if (template.TemplateStyle != "compact")
                {
                    if (template.ShowIngredients && recipe.Ingredients.Count > 0) sb.Append("<div class='detail' style=\"").Append(TextStyle($"ingredients:{i}:{slot}")).Append("\">").Append(H(string.Join(", ", recipe.Ingredients))).Append("</div>");
                    if (template.ShowCalories && recipe.Calories > 0) sb.Append("<div class='detail'>").Append(recipe.Calories).Append(" kcal</div>");
                }
                else
                {
                    if (template.ShowIngredients && recipe.Ingredients.Count > 0) sb.Append(" <span class='detail' style=\"").Append(TextStyle($"ingredients:{i}:{slot}")).Append("\">").Append(H(string.Join(", ", recipe.Ingredients))).Append("</span>");
                    if (template.ShowCalories && recipe.Calories > 0) sb.Append(" <span class='detail'>").Append(recipe.Calories).Append(" kcal</span>");
                }
                // The old model flattened inherited and manual allergens. Retain those values and
                // include current ingredient allergens so later ingredient edits cannot hide a risk.
                var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name =>
                    ingredientByName.TryGetValue(name, out var ingredient) ? ingredient.Allergens : []))
                    .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                if (allergens.Count > 0) sb.Append("<div class='detail' style=\"").Append(TextStyle($"allergens:{i}:{slot}")).Append("\">⚠ ").Append(H(string.Join(", ", allergens.Select(Localization.Allergen)))).Append("</div>");
                sb.Append("</div>");
            }
            sb.Append("</section>");
        }
        sb.Append("</div>");
        if (template.ShowFooter) sb.Append("<footer style=\"text-align:").Append(Align(template.FooterAlignment)).Append(";font-size:").Append(Size(template.FooterFontSize,9)).Append("px;").Append(TextStyle("footer")).Append("\">").Append(H(template.FooterText)).Append("</footer>");
        return sb.Append("</div></main></body></html>").ToString();
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

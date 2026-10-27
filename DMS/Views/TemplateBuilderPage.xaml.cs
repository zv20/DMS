using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Input;
using DMS.Models;
using DMS.Services;
using System.Text.Json;
using System.Text.RegularExpressions;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using L = DMS.Services.Localization;

namespace DMS.Views;

public sealed partial class TemplateBuilderPage : Page, IUnsavedEditor
{
    private readonly IDatabaseService _database;
    private MenuTemplate _template = new();
    private List<MenuTemplate> _templates = [];
    private List<Recipe> _recipes = [];
    private List<Ingredient> _ingredients = [];
    private List<MenuEntry> _entries = [];
    private string? _loadedName;
    private bool _binding = true;
    private int _previewGeneration;
    private string? _previewImageRequest;
    private bool _editingHeader;
    private bool _editingFooter;
    private string? _selectedElement;
    private bool _bindingSelection;
    private string? _selectedImageId;
    private bool _bindingLayers;
    private bool _dirty, _confirming, _switching, _saving, _layoutOverflow;
    private static readonly string[] Alignments = ["left", "center", "right"];
    private static readonly string[] Layouts = ["compact", "detailed", "detailed-2col"];
    private static readonly string[] Fonts = ["Arial", "Times New Roman", "Georgia", "Comic Sans MS", "Verdana", "Courier New", "Trebuchet MS", "Tahoma"];

    public TemplateBuilderPage()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        ConfigureControls();
        Loaded += async (_, _) => await LoadAsync();
    }

    private void ConfigureControls()
    {
        TemplateSelector.PlaceholderText = L.Get("TplSelect"); NameBox.PlaceholderText = L.Get("TplName");
        HeaderBox.PlaceholderText = L.Get("TplHeader"); FooterBox.PlaceholderText = L.Get("TplFooter");
        FontBox.Header = L.Get("TplFont"); LayoutBox.Header = L.Get("TplLayout");
        HeaderAlignmentBox.Header = L.Get("TplHeaderAlignment"); FooterAlignmentBox.Header = L.Get("TplFooterAlignment");
        HeaderSizeBox.Header = L.Get("TplHeaderSize"); MealSizeBox.Header = L.Get("TplMealSize"); FooterSizeBox.Header = L.Get("TplFooterSize");
        HeaderColorBox.Header = L.Get("TplHeaderColor"); BackgroundColorBox.Header = L.Get("TplBackgroundColor");
        ImageOpacitySlider.Header = L.Get("TplOpacity");
        ShowHeaderBox.Content = L.Get("TplShowHeader"); ShowDateBox.Content = L.Get("TplShowDate");
        ShowIngredientsBox.Content = L.Get("TplShowIngredients"); ShowCaloriesBox.Content = L.Get("TplShowCalories");
        ShowPortionsBox.Content = L.Get("TplShowPortions"); ShowFooterBox.Content = L.Get("TplShowFooter");
        LegacyNote.Text = L.Get("TplLegacy");
        SelectedElementLabel.Text = L.Get("TplSelectElement");
        NameTool(NewButton, "TplNew"); NameTool(SaveButton, "TplSave"); NameTool(DeleteButton, "TplDelete");
        NameTool(TemplateSelector, "TplSelect"); NameTool(NameBox, "TplName"); NameTool(PreviewDate, "TplPreview");
        NameTool(SelectedFontBox, "TplFont"); NameTool(SelectedSizeBox, "TplSelectedSize"); NameTool(SelectedColorBox, "TplSelectedColor");
        NameTool(SelectedBoldButton, "TplBold"); NameTool(SelectedItalicButton, "TplItalic"); NameTool(SelectedUnderlineButton, "TplUnderline");
        NameTool(ImageButton, "TplImage"); NameTool(ClearImageButton, "TplImageClear");
        NameTool(EnableCanvasButton, "TplEnableCanvas"); NameTool(EditTextButton, "TplEditText");
        NameTool(ForwardButton, "TplBringForward"); NameTool(BackwardButton, "TplSendBackward"); NameTool(RemoveLayerButton, "TplRemoveLayer");
        NameTool(ImageLayerSelector, "TplLayoutImage"); ImageLayerSelector.PlaceholderText = L.Get("TplLayoutImage");
        NameTool(PageOptionsButton, "TplPageOptions"); NameTool(VisibilityButton, "TplVisibilityOptions");
        ToolTipService.SetToolTip(HeaderDisplayButton, L.Get("TplEditHeader"));
        ToolTipService.SetToolTip(FooterDisplayButton, L.Get("TplEditFooter"));
        NameTool(HeaderBoldButton, "TplHeaderBold"); NameTool(HeaderItalicButton, "TplHeaderItalic"); NameTool(HeaderUnderlineButton, "TplHeaderUnderline");
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(HeaderDisplayButton, L.Get("TplEditHeader"));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(FooterDisplayButton, L.Get("TplEditFooter"));
        foreach (var alignment in new[] { "TplLeft", "TplCenter", "TplRight" }) { HeaderAlignmentBox.Items.Add(L.Get(alignment)); FooterAlignmentBox.Items.Add(L.Get(alignment)); }
        foreach (var layout in new[] { "TplCompact", "TplDetailed", "TplTwoColumns" }) LayoutBox.Items.Add(L.Get(layout));
        foreach (var font in Fonts) { FontBox.Items.Add(font); SelectedFontBox.Items.Add(font); }
        SelectedFontBox.SelectionChanged += (_, _) => SelectedStyleChanged();
        SelectedSizeBox.ValueChanged += (_, _) => SelectedStyleChanged();
        SelectedColorBox.TextChanged += (_, _) => SelectedStyleChanged();
        foreach (var toggle in new[] { SelectedBoldButton, SelectedItalicButton, SelectedUnderlineButton })
        {
            toggle.Checked += (_, _) => SelectedStyleChanged();
            toggle.Unchecked += (_, _) => SelectedStyleChanged();
        }
        foreach (var box in new[] { NameBox, HeaderBox, FooterBox, HeaderColorBox, BackgroundColorBox }) box.TextChanged += (_, _) => OnEdited();
        foreach (var box in new[] { HeaderAlignmentBox, FooterAlignmentBox, LayoutBox, FontBox }) box.SelectionChanged += (_, _) => OnEdited();
        foreach (var box in new[] { HeaderSizeBox, MealSizeBox, FooterSizeBox }) box.ValueChanged += (_, _) => OnEdited();
        foreach (var toggle in new Microsoft.UI.Xaml.Controls.Primitives.ToggleButton[] { HeaderBoldButton, HeaderItalicButton, HeaderUnderlineButton, ShowHeaderBox, ShowDateBox, ShowIngredientsBox, ShowCaloriesBox, ShowPortionsBox, ShowFooterBox })
        {
            toggle.Checked += (_, _) => OnEdited();
            toggle.Unchecked += (_, _) => OnEdited();
        }
        ImageOpacitySlider.ValueChanged += (_, _) => OnEdited();
        PreviewDate.Date = DateTimeOffset.Now;
    }

    private static void NameTool(FrameworkElement element, string resourceKey)
    {
        var label = L.Get(resourceKey);
        ToolTipService.SetToolTip(element, label);
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(element, label);
    }

    private async Task LoadAsync()
    {
        try
        {
            _templates = await _database.GetAllTemplatesAsync();
            _recipes = await _database.GetAllRecipesAsync();
            _ingredients = await _database.GetAllIngredientsAsync();
            TemplateSelector.ItemsSource = _templates;
            SetTemplate(new MenuTemplate(), null);
            await LoadWeekAsync();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private void SetTemplate(MenuTemplate template, string? originalName)
    {
        _binding = true;
        _editingHeader = _editingFooter = false;
        _selectedElement = null;
        _template = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template)) ?? new MenuTemplate();
        _template.TextStyles ??= new();
        _template.LayoutElements ??= new(); _template.ImageLayers ??= new();
        if (originalName == null) TemplateLayout.EnsureInitialized(_template);
        else if (_template.LayoutEnabled) TemplateLayout.EnsureInitialized(_template);
        _template.ImageLayers.RemoveAll(layer => layer == null || string.IsNullOrEmpty(layer.DataUri));
        _selectedImageId = null;
        _loadedName = originalName;
        _dirty = false;
        TemplateCompatibility.ApplyLegacyDefaults(_template);
        NameBox.Text = _template.Name; HeaderBox.Text = _template.HeaderText; FooterBox.Text = _template.FooterText;
        HeaderColorBox.Text = _template.HeaderColor; BackgroundColorBox.Text = _template.BackgroundColor;
        FontBox.SelectedIndex = Math.Max(0, Array.FindIndex(Fonts, f => string.Equals(f, _template.FontFamily, StringComparison.OrdinalIgnoreCase)));
        LayoutBox.SelectedIndex = Math.Max(0, Array.IndexOf(Layouts, _template.TemplateStyle));
        HeaderAlignmentBox.SelectedIndex = Math.Max(0, Array.IndexOf(Alignments, _template.HeaderAlignment));
        FooterAlignmentBox.SelectedIndex = Math.Max(0, Array.IndexOf(Alignments, _template.FooterAlignment));
        HeaderSizeBox.Value = _template.HeaderFontSize; MealSizeBox.Value = _template.MealFontSize; FooterSizeBox.Value = _template.FooterFontSize;
        HeaderBoldButton.IsChecked = _template.HeaderBold; HeaderItalicButton.IsChecked = _template.HeaderItalic; HeaderUnderlineButton.IsChecked = _template.HeaderUnderline;
        ShowHeaderBox.IsChecked = _template.ShowHeader; ShowDateBox.IsChecked = _template.ShowDateRange; ShowIngredientsBox.IsChecked = _template.ShowIngredients;
        ShowCaloriesBox.IsChecked = _template.ShowCalories; ShowPortionsBox.IsChecked = _template.ShowPortions; ShowFooterBox.IsChecked = _template.ShowFooter;
        ImageOpacitySlider.Value = Math.Clamp(_template.BackgroundImageOpacity * 100, 0, 100);
        LegacyNote.Visibility = _template.LegacyDataJson == null ? Visibility.Collapsed : Visibility.Visible;
        StatusText.Text = "";
        _binding = false;
        SelectElement(null);
        UpdatePreview();
    }

    private TemplateTextStyle StyleFor(string key, double size, bool bold = false)
    {
        if (_template.TextStyles.TryGetValue(key, out var style) && style != null) return style;
        var parts = key.Split(':');
        if (parts.Length == 2 && (parts[0] is "heading" or "menu" or "ingredient-group" or "allergen-group") &&
            _template.TextStyles.TryGetValue($"block:{parts[1]}", out var inherited) && inherited != null)
            return new TemplateTextStyle { FontFamily = inherited.FontFamily, FontSize = inherited.FontSize, Color = inherited.Color, Bold = inherited.Bold, Italic = inherited.Italic, Underline = inherited.Underline };
        return key switch
        {
            "header" => new TemplateTextStyle { FontFamily = _template.FontFamily, FontSize = _template.HeaderFontSize, Color = _template.HeaderColor, Bold = _template.HeaderBold, Italic = _template.HeaderItalic, Underline = _template.HeaderUnderline },
            "footer" => new TemplateTextStyle { FontFamily = _template.FontFamily, FontSize = _template.FooterFontSize },
            _ => new TemplateTextStyle { FontFamily = _template.FontFamily, FontSize = size, Bold = bold }
        };
    }

    private void SelectElement(string? key, string? legacyKey = null)
    {
        _selectedImageId = null;
        _selectedElement = key;
        _bindingSelection = true;
        var enabled = key != null;
        SelectedFontBox.IsEnabled = SelectedSizeBox.IsEnabled = SelectedColorBox.IsEnabled = enabled;
        SelectedBoldButton.IsEnabled = SelectedItalicButton.IsEnabled = SelectedUnderlineButton.IsEnabled = enabled;
        var kind = key?.Split(':')[0];
        SelectedElementLabel.Text = kind switch
        {
            "heading" => L.Get("TplDayHeading"), "menu" => L.Get("TplMenuNames"),
            "ingredient-group" => L.Get("TplIngredientText"), "allergen-group" => L.Get("TplAllergenText"),
            _ => enabled ? L.Get("TplSelectedElement") : L.Get("TplSelectElement")
        };
        if (key != null)
        {
            var heading = key.StartsWith("heading:");
            var parts = key.Split(':');
            var useLegacy = parts.Length == 2 && legacyKey != null && !_template.TextStyles.ContainsKey(key)
                && !_template.TextStyles.ContainsKey($"block:{parts[1]}") && _template.TextStyles.ContainsKey(legacyKey);
            var style = StyleFor(useLegacy ? legacyKey! : key, heading ? 15 : key == "date" ? 14 : _template.MealFontSize, heading);
            SelectedFontBox.SelectedIndex = Math.Max(0, Array.FindIndex(Fonts, f => string.Equals(f, style.FontFamily, StringComparison.OrdinalIgnoreCase)));
            SelectedSizeBox.Value = style.FontSize;
            SelectedColorBox.Text = style.Color;
            SelectedBoldButton.IsChecked = style.Bold; SelectedItalicButton.IsChecked = style.Italic; SelectedUnderlineButton.IsChecked = style.Underline;
        }
        _bindingSelection = false;
        UpdatePreview();
    }

    private void SelectedStyleChanged()
    {
        if (_binding || _bindingSelection || _selectedElement == null) return;
        var style = StyleFor(_selectedElement, _template.MealFontSize);
        style.FontFamily = SelectedFontBox.SelectedItem as string ?? Fonts[0];
        style.FontSize = SafeNumber(SelectedSizeBox.Value, 11);
        if (IsColor(SelectedColorBox.Text)) style.Color = SelectedColorBox.Text;
        style.Bold = SelectedBoldButton.IsChecked == true; style.Italic = SelectedItalicButton.IsChecked == true; style.Underline = SelectedUnderlineButton.IsChecked == true;
        _template.TextStyles[_selectedElement] = style;
        _dirty = true;
        UpdatePreview();
    }

    private Button SelectableText(string key, string text, double size, bool bold = false, string? legacyKey = null)
    {
        var label = DisplayText(key, text, size, bold, legacyKey);
        var button = new Button { Content = label, HorizontalAlignment = HorizontalAlignment.Stretch, HorizontalContentAlignment = HorizontalAlignment.Stretch,
            Background = new SolidColorBrush(Colors.Transparent), Padding = new Thickness(_template.LayoutEnabled ? 0 : 2), MinHeight = _template.LayoutEnabled ? 0 : 32, MinWidth = 0,
            BorderThickness = new Thickness(!_template.LayoutEnabled && _selectedElement == key ? 1 : 0),
            BorderBrush = new SolidColorBrush(Colors.DodgerBlue) };
        button.Click += (_, _) => SelectElement(key, legacyKey);
        return button;
    }

    private TextBlock DisplayText(string key, string text, double size, bool bold = false, string? legacyKey = null)
    {
        var parts = key.Split(':');
        if (!_template.TextStyles.ContainsKey(key) && parts.Length == 2 && !_template.TextStyles.ContainsKey($"block:{parts[1]}") && legacyKey != null && _template.TextStyles.ContainsKey(legacyKey)) key = legacyKey;
        var style = StyleFor(key, size, bold);
        return new TextBlock { Text = text, FontFamily = new FontFamily(style.FontFamily), FontSize = style.FontSize,
            Foreground = new SolidColorBrush(ParseColor(style.Color, Colors.Black)), FontWeight = style.Bold ? FontWeights.Bold : FontWeights.Normal,
            FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal,
            TextDecorations = style.Underline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None, TextWrapping = TextWrapping.Wrap };
    }

    private void OnEdited()
    {
        if (_binding) return;
        _dirty = true;
        ReadFields();
        UpdatePreview();
    }

    private void ReadFields()
    {
        _template.Name = NameBox.Text.Trim(); _template.HeaderText = HeaderBox.Text; _template.FooterText = FooterBox.Text;
        if (IsColor(HeaderColorBox.Text)) _template.HeaderColor = HeaderColorBox.Text;
        if (IsColor(BackgroundColorBox.Text)) _template.BackgroundColor = BackgroundColorBox.Text;
        _template.FontFamily = FontBox.SelectedItem as string ?? Fonts[0];
        _template.TemplateStyle = Layouts[Math.Clamp(LayoutBox.SelectedIndex, 0, 2)];
        _template.HeaderAlignment = Alignments[Math.Clamp(HeaderAlignmentBox.SelectedIndex, 0, 2)];
        _template.FooterAlignment = Alignments[Math.Clamp(FooterAlignmentBox.SelectedIndex, 0, 2)];
        _template.HeaderFontSize = SafeNumber(HeaderSizeBox.Value, 24); _template.MealFontSize = SafeNumber(MealSizeBox.Value, 11); _template.FooterFontSize = SafeNumber(FooterSizeBox.Value, 9);
        _template.HeaderBold = HeaderBoldButton.IsChecked == true; _template.HeaderItalic = HeaderItalicButton.IsChecked == true; _template.HeaderUnderline = HeaderUnderlineButton.IsChecked == true;
        _template.ShowHeader = ShowHeaderBox.IsChecked == true; _template.ShowDateRange = ShowDateBox.IsChecked == true; _template.ShowIngredients = ShowIngredientsBox.IsChecked == true;
        _template.ShowCalories = ShowCaloriesBox.IsChecked == true; _template.ShowPortions = ShowPortionsBox.IsChecked == true; _template.ShowFooter = ShowFooterBox.IsChecked == true;
        _template.BackgroundImageOpacity = ImageOpacitySlider.Value / 100;
        _template.NativeStyleInitialized = true;
    }

    private static double SafeNumber(double value, double fallback) => double.IsFinite(value) && value > 0 ? value : fallback;
    private static bool IsColor(string value) => Regex.IsMatch(value ?? "", "^#[0-9a-fA-F]{6}$");

    private async void PreviewDate_DateChanged(CalendarDatePicker sender, CalendarDatePickerDateChangedEventArgs args)
    {
        if (!_binding) await LoadWeekAsync();
    }

    private async Task LoadWeekAsync()
    {
        var generation = ++_previewGeneration;
        var date = PreviewDate.Date?.DateTime.Date ?? DateTime.Today;
        var monday = date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));
        try
        {
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(4));
            if (generation != _previewGeneration) return;
            _entries = entries;
            UpdatePreview();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private void UpdatePreview()
    {
        if (_binding) return;
        LegacyPage.Visibility = _template.LayoutEnabled ? Visibility.Collapsed : Visibility.Visible;
        LayoutCanvas.Visibility = _template.LayoutEnabled ? Visibility.Visible : Visibility.Collapsed;
        EnableCanvasButton.IsEnabled = !_template.LayoutEnabled;
        EditTextButton.IsEnabled = _template.LayoutEnabled && (_selectedElement == "header" || _selectedElement == "footer");
        ForwardButton.IsEnabled = BackwardButton.IsEnabled = _template.LayoutEnabled && (_selectedImageId != null || _selectedElement != null);
        RemoveLayerButton.IsEnabled = _template.LayoutEnabled && _selectedImageId != null;
        ImageLayerSelector.Visibility = _template.LayoutEnabled ? Visibility.Visible : Visibility.Collapsed;
        _bindingLayers = true;
        ImageLayerSelector.Items.Clear();
        for (var layerIndex = 0; layerIndex < _template.ImageLayers.Count; layerIndex++)
        {
            var layer = _template.ImageLayers[layerIndex];
            var option = new ComboBoxItem { Content = $"{L.Get("TplLayoutImage")} {layerIndex + 1}", Tag = layer.Id };
            ImageLayerSelector.Items.Add(option);
            if (layer.Id == _selectedImageId) ImageLayerSelector.SelectedItem = option;
        }
        _bindingLayers = false;
        PreviewBorder.Background = new SolidColorBrush(ParseColor(_template.BackgroundColor, Colors.White));
        PreviewImage.Margin = _template.LayoutEnabled ? new Thickness(0) : new Thickness(38);
        PreviewImage.Opacity = _template.BackgroundImageOpacity;
        if (_previewImageRequest != _template.BackgroundImageDataUri)
        {
            _previewImageRequest = _template.BackgroundImageDataUri;
            _ = UpdateImageAsync(_previewImageRequest);
        }
        PreviewPanel.Children.Clear();
        HeaderDisplay.Text = string.IsNullOrEmpty(_template.HeaderText) ? L.Get("TplEditHeader") : _template.HeaderText;
        var headerStyle = StyleFor("header", _template.HeaderFontSize);
        HeaderDisplay.FontFamily = HeaderBox.FontFamily = new FontFamily(headerStyle.FontFamily);
        HeaderDisplay.FontSize = HeaderBox.FontSize = headerStyle.FontSize;
        HeaderDisplay.FontWeight = HeaderBox.FontWeight = headerStyle.Bold ? FontWeights.Bold : FontWeights.Normal;
        HeaderDisplay.FontStyle = HeaderBox.FontStyle = headerStyle.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal;
        HeaderDisplay.TextDecorations = headerStyle.Underline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None;
        HeaderDisplay.Foreground = HeaderBox.Foreground = new SolidColorBrush(ParseColor(headerStyle.Color, Colors.Black));
        HeaderDisplay.TextAlignment = HeaderBox.TextAlignment = TextAlignmentFor(_template.HeaderAlignment);
        HeaderDisplayButton.Visibility = _template.ShowHeader && !_editingHeader ? Visibility.Visible : Visibility.Collapsed;
        HeaderBox.Visibility = _template.ShowHeader && _editingHeader ? Visibility.Visible : Visibility.Collapsed;
        FooterDisplay.Text = string.IsNullOrEmpty(_template.FooterText) ? L.Get("TplEditFooter") : _template.FooterText;
        var footerStyle = StyleFor("footer", _template.FooterFontSize);
        FooterDisplay.FontFamily = FooterBox.FontFamily = new FontFamily(footerStyle.FontFamily);
        FooterDisplay.FontSize = FooterBox.FontSize = footerStyle.FontSize;
        FooterDisplay.FontWeight = FooterBox.FontWeight = footerStyle.Bold ? FontWeights.Bold : FontWeights.Normal;
        FooterDisplay.FontStyle = FooterBox.FontStyle = footerStyle.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal;
        FooterDisplay.TextDecorations = footerStyle.Underline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None;
        FooterDisplay.Foreground = FooterBox.Foreground = new SolidColorBrush(ParseColor(footerStyle.Color, Colors.Black));
        FooterDisplay.TextAlignment = FooterBox.TextAlignment = TextAlignmentFor(_template.FooterAlignment);
        FooterDisplayButton.Visibility = _template.ShowFooter && !_editingFooter ? Visibility.Visible : Visibility.Collapsed;
        FooterBox.Visibility = _template.ShowFooter && _editingFooter ? Visibility.Visible : Visibility.Collapsed;
        var date = PreviewDate.Date?.DateTime.Date ?? DateTime.Today;
        var monday = date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));
        if (_template.ShowDateRange) PreviewPanel.Children.Add(SelectableText("date", $"{monday:d} – {monday.AddDays(4):d}", 14));
        var days = new Grid { ColumnSpacing = 12, RowSpacing = 12 };
        var columns = _template.TemplateStyle == "detailed-2col" ? 2 : 1;
        for (var column = 0; column < columns; column++) days.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        for (var row = 0; row < (5 + columns - 1) / columns; row++) days.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < 5; i++)
        {
            var day = monday.AddDays(i);
            var dayPanel = new StackPanel { Spacing = 3 };
            dayPanel.Children.Add(SelectableText($"heading:{i}", day.ToString("dddd, d MMMM"), 15, true, $"day:{i}"));
            var menuPanel = new StackPanel { Spacing = 3 };
            foreach (var entry in _entries.Where(e => e.Date.Date == day).OrderBy(e => MenuOutputService.SlotOrder(e.Slot)))
            {
                var recipe = _recipes.FirstOrDefault(r => r.Id == entry.RecipeId);
                if (recipe == null) continue;
                var slot = MenuOutputService.SlotOrder(entry.Slot);
                var text = $"{slot}. {recipe.Name}";
                if (_template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) text += $" ({recipe.PortionSize})";
                if (_template.ShowCalories && recipe.Calories > 0) text += $" · {recipe.Calories} kcal";
                menuPanel.Children.Add(SelectableText($"menu:{i}", text, _template.MealFontSize, legacyKey: $"meal:{i}:{slot}"));
                if (_template.ShowIngredients && recipe.Ingredients.Count > 0)
                    menuPanel.Children.Add(SelectableText($"ingredient-group:{i}", string.Join(", ", recipe.Ingredients), _template.MealFontSize, legacyKey: $"ingredients:{i}:{slot}"));
                var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name =>
                    _ingredients.FirstOrDefault(ingredient => string.Equals(ingredient.Name, name, StringComparison.OrdinalIgnoreCase))?.Allergens ?? []))
                    .Distinct(StringComparer.OrdinalIgnoreCase).Select(L.Allergen).ToList();
                if (allergens.Count > 0) menuPanel.Children.Add(SelectableText($"allergen-group:{i}", "⚠ " + string.Join(", ", allergens), _template.MealFontSize, legacyKey: $"allergens:{i}:{slot}"));
            }
            if (menuPanel.Children.Count > 0) dayPanel.Children.Add(new Border { BorderBrush = new SolidColorBrush(Colors.LightGray), BorderThickness = new Thickness(1), Padding = new Thickness(5), Child = menuPanel });
            Grid.SetColumn(dayPanel, i % columns); Grid.SetRow(dayPanel, i / columns); days.Children.Add(dayPanel);
        }
        PreviewPanel.Children.Add(days);
        if (_entries.Count == 0) PreviewPanel.Children.Add(new TextBlock { Text = L.Get("TplNoMeals"), Foreground = new SolidColorBrush(Colors.Gray) });
        if (_template.LayoutEnabled) UpdateLayoutCanvas(monday);
    }

    private void HeaderDisplay_Click(object sender, RoutedEventArgs e)
    {
        SelectElement("header");
        _editingHeader = true;
        UpdatePreview();
        HeaderBox.Focus(FocusState.Programmatic);
    }

    private void HeaderBox_LostFocus(object sender, RoutedEventArgs e)
    {
        _editingHeader = false;
        UpdatePreview();
    }

    private void FooterDisplay_Click(object sender, RoutedEventArgs e)
    {
        SelectElement("footer");
        _editingFooter = true;
        UpdatePreview();
        FooterBox.Focus(FocusState.Programmatic);
    }

    private void FooterBox_LostFocus(object sender, RoutedEventArgs e)
    {
        _editingFooter = false;
        UpdatePreview();
    }

    private void EnableCanvas_Click(object sender, RoutedEventArgs e)
    {
        TemplateLayout.EnsureInitialized(_template);
        _dirty = true;
        UpdatePreview();
        StatusText.Text = L.Get("TplCanvasHint");
    }

    private async void EditText_Click(object sender, RoutedEventArgs e)
    {
        var header = _selectedElement == "header";
        if (!header && _selectedElement != "footer") return;
        var field = new TextBox { Text = header ? HeaderBox.Text : FooterBox.Text, AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinWidth = 300 };
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get(header ? "TplHeader" : "TplFooter"), Content = field,
            PrimaryButtonText = L.Get("TplSave"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
        if (await dialog.ShowAsync() == ContentDialogResult.Primary)
        {
            if (header) HeaderBox.Text = field.Text; else FooterBox.Text = field.Text;
        }
    }

    private void UpdateLayoutCanvas(DateTime monday)
    {
        _layoutOverflow = false;
        LayoutCanvas.Children.Clear();
        foreach (var image in _template.ImageLayers)
        {
            var picture = new Image { Stretch = Stretch.Fill, Opacity = Math.Clamp(double.IsFinite(image.Opacity) ? image.Opacity : 1, 0, 1) };
            _ = LoadCanvasImageAsync(picture, image.DataUri);
            var select = new Button { Content = picture, Background = new SolidColorBrush(Colors.Transparent), Padding = new Thickness(0), HorizontalContentAlignment = HorizontalAlignment.Stretch, VerticalContentAlignment = VerticalAlignment.Stretch };
            select.Click += (_, _) => { SelectElement(null); _selectedImageId = image.Id; UpdatePreview(); };
            PlaceCanvasFrame(image.X, image.Y, image.Width, image.Height, image.ZIndex, select, _selectedImageId == image.Id,
                (x, y, w, h) => { image.X = x; image.Y = y; image.Width = w; image.Height = h; });
        }
        if (_template.ShowHeader)
        {
            var text = string.IsNullOrEmpty(_template.HeaderText) ? L.Get("TplEditHeader") : _template.HeaderText;
            var button = SelectableText("header", text, _template.HeaderFontSize);
            if (button.Content is TextBlock label) label.TextAlignment = TextAlignmentFor(_template.HeaderAlignment);
            PlaceTextFrame("header", button);
        }
        if (_template.ShowDateRange)
        {
            var dateButton = SelectableText("date", $"{monday:d} – {monday.AddDays(4):d}", 14);
            if (dateButton.Content is TextBlock dateLabel) dateLabel.TextAlignment = TextAlignment.Center;
            PlaceTextFrame("date", dateButton);
        }
        for (var i = 0; i < 5; i++)
        {
            var day = monday.AddDays(i);
            PlaceTextFrame($"heading:{i}", SelectableText($"heading:{i}", day.ToString("dddd, d MMMM"), 15, true, $"day:{i}"));
            var panel = new StackPanel { Spacing = 3 };
            foreach (var entry in _entries.Where(e => e.Date.Date == day).OrderBy(e => MenuOutputService.SlotOrder(e.Slot)))
            {
                var recipe = _recipes.FirstOrDefault(r => r.Id == entry.RecipeId);
                if (recipe == null) continue;
                var slot = MenuOutputService.SlotOrder(entry.Slot);
                var name = $"{slot}. {recipe.Name}";
                if (_template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) name += $" ({recipe.PortionSize})";
                if (_template.ShowCalories && recipe.Calories > 0) name += $" · {recipe.Calories} kcal";
                panel.Children.Add(SelectableText($"menu:{i}", name, _template.MealFontSize, legacyKey: $"meal:{i}:{slot}"));
                if (_template.ShowIngredients && recipe.Ingredients.Count > 0)
                    panel.Children.Add(SelectableText($"ingredient-group:{i}", string.Join(", ", recipe.Ingredients), _template.MealFontSize, legacyKey: $"ingredients:{i}:{slot}"));
                var allergens = recipe.Allergens.Concat(recipe.Ingredients.SelectMany(name => _ingredients.FirstOrDefault(ingredient => string.Equals(ingredient.Name, name, StringComparison.OrdinalIgnoreCase))?.Allergens ?? []))
                    .Distinct(StringComparer.OrdinalIgnoreCase).Select(L.Allergen).ToList();
                if (allergens.Count > 0) panel.Children.Add(SelectableText($"allergen-group:{i}", "⚠ " + string.Join(", ", allergens), _template.MealFontSize, legacyKey: $"allergens:{i}:{slot}"));
            }
            if (panel.Children.Count == 0) panel.Children.Add(SelectableText($"menu:{i}", L.Get("TplNoMeals"), _template.MealFontSize));
            PlaceTextFrame($"menu:{i}", panel);
        }
        if (_template.ShowFooter)
        {
            var text = string.IsNullOrEmpty(_template.FooterText) ? L.Get("TplEditFooter") : _template.FooterText;
            var button = SelectableText("footer", text, _template.FooterFontSize);
            if (button.Content is TextBlock label) label.TextAlignment = TextAlignmentFor(_template.FooterAlignment);
            PlaceTextFrame("footer", button);
        }
        if (_layoutOverflow) StatusText.Text = L.Get("TplLayoutOverflow");
        else if (StatusText.Text == L.Get("TplLayoutOverflow")) StatusText.Text = "";
    }

    private void PlaceTextFrame(string key, FrameworkElement content)
    {
        if (!_template.LayoutElements.TryGetValue(key, out var item) || item == null) return;
        var selected = _selectedElement == key || (key.StartsWith("menu:") && (_selectedElement == key.Replace("menu:", "ingredient-group:") || _selectedElement == key.Replace("menu:", "allergen-group:")));
        PlaceCanvasFrame(item.X, item.Y, item.Width, item.Height, item.ZIndex, content, selected,
            (x, y, w, h) => { item.X = x; item.Y = y; item.Width = w; item.Height = h; });
    }

    private void PlaceCanvasFrame(double x, double y, double width, double height, int z, FrameworkElement content, bool selected, Action<double, double, double, double> save)
    {
        x = double.IsFinite(x) ? Math.Clamp(x, 0, 774) : 0; y = double.IsFinite(y) ? Math.Clamp(y, 0, 1103) : 0;
        width = double.IsFinite(width) ? Math.Clamp(width, 20, 794 - x) : 100; height = double.IsFinite(height) ? Math.Clamp(height, 20, 1123 - y) : 30;
        var frame = new Grid { Width = width, Height = height, Background = new SolidColorBrush(Colors.Transparent) };
        if (content is not Button { Content: Image })
        {
            content.Measure(new Windows.Foundation.Size(width, double.PositiveInfinity));
            if (content.DesiredSize.Height > height + 1) _layoutOverflow = true;
        }
        frame.Children.Add(content);
        if (selected)
        {
            frame.Children.Add(new Border { BorderBrush = new SolidColorBrush(Colors.DodgerBlue), BorderThickness = new Thickness(1), IsHitTestVisible = false });
            var move = new Border { Width = 18, Height = 18, HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Top, Background = new SolidColorBrush(Colors.DodgerBlue), Child = new TextBlock { Text = "✥", Foreground = new SolidColorBrush(Colors.White), HorizontalAlignment = HorizontalAlignment.Center } };
            var resize = new Border { Width = 16, Height = 16, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Bottom, Background = new SolidColorBrush(Colors.DodgerBlue), Child = new TextBlock { Text = "◢", Foreground = new SolidColorBrush(Colors.White), HorizontalAlignment = HorizontalAlignment.Center } };
            ToolTipService.SetToolTip(move, L.Get("TplMoveObject")); ToolTipService.SetToolTip(resize, L.Get("TplResizeObject"));
            AttachDrag(move, false); AttachDrag(resize, true);
            frame.Children.Add(move); frame.Children.Add(resize);
        }
        Canvas.SetLeft(frame, x); Canvas.SetTop(frame, y); Canvas.SetZIndex(frame, Math.Clamp(z, 1, 1000)); LayoutCanvas.Children.Add(frame);

        void AttachDrag(Border handle, bool resizing)
        {
            Windows.Foundation.Point start = default;
            double initialX = 0, initialY = 0, initialWidth = 0, initialHeight = 0;
            bool dragging = false;
            handle.PointerPressed += (_, e) => { if (!e.GetCurrentPoint(handle).Properties.IsLeftButtonPressed) return; start = e.GetCurrentPoint(LayoutCanvas).Position; initialX = x; initialY = y; initialWidth = width; initialHeight = height; dragging = handle.CapturePointer(e.Pointer); e.Handled = true; };
            handle.PointerMoved += (_, e) =>
            {
                if (!dragging) return;
                var point = e.GetCurrentPoint(LayoutCanvas).Position;
                if (resizing) { width = Math.Clamp(initialWidth + point.X - start.X, 20, 794 - x); height = Math.Clamp(initialHeight + point.Y - start.Y, 20, 1123 - y); frame.Width = width; frame.Height = height; }
                else { x = Math.Clamp(initialX + point.X - start.X, 0, 794 - width); y = Math.Clamp(initialY + point.Y - start.Y, 0, 1123 - height); Canvas.SetLeft(frame, x); Canvas.SetTop(frame, y); }
                save(x, y, width, height); _dirty = true; e.Handled = true;
            };
            handle.PointerReleased += (_, e) => { if (!dragging) return; dragging = false; handle.ReleasePointerCapture(e.Pointer); UpdatePreview(); e.Handled = true; };
            handle.PointerCaptureLost += (_, _) => { dragging = false; };
        }
    }

    private static async Task LoadCanvasImageAsync(Image target, string dataUri)
    {
        try
        {
            var comma = dataUri.IndexOf(','); if (comma < 0) return;
            var bytes = Convert.FromBase64String(dataUri[(comma + 1)..]);
            using var stream = new InMemoryRandomAccessStream(); using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync(); stream.Seek(0);
            var bitmap = new BitmapImage(); await bitmap.SetSourceAsync(stream); target.Source = bitmap;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException or System.Runtime.InteropServices.COMException) { }
    }

    private void ImageLayerSelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_bindingLayers || ImageLayerSelector.SelectedItem is not ComboBoxItem { Tag: string id }) return;
        SelectElement(null); _selectedImageId = id; UpdatePreview();
    }

    private string? SelectedLayoutKey()
    {
        if (_selectedElement == null) return null;
        if (_selectedElement.StartsWith("ingredient-group:")) return _selectedElement.Replace("ingredient-group:", "menu:");
        if (_selectedElement.StartsWith("allergen-group:")) return _selectedElement.Replace("allergen-group:", "menu:");
        return _selectedElement;
    }

    private void ChangeLayerOrder(int direction)
    {
        var all = _template.LayoutElements.Select(pair => (Id: pair.Key, Z: pair.Value.ZIndex, Set: (Action<int>)(z => pair.Value.ZIndex = z)))
            .Concat(_template.ImageLayers.Select(layer => (Id: "image:" + layer.Id, Z: layer.ZIndex, Set: (Action<int>)(z => layer.ZIndex = z))))
            .OrderBy(layer => layer.Z).ThenBy(layer => layer.Id, StringComparer.Ordinal).ToList();
        var selected = _selectedImageId != null ? "image:" + _selectedImageId : SelectedLayoutKey();
        var index = all.FindIndex(layer => layer.Id == selected);
        var target = index + direction;
        if (index < 0 || target < 0 || target >= all.Count) return;
        (all[index], all[target]) = (all[target], all[index]);
        for (var i = 0; i < all.Count; i++) all[i].Set(i + 1);
        _dirty = true;
        UpdatePreview();
    }

    private void Forward_Click(object sender, RoutedEventArgs e) => ChangeLayerOrder(1);
    private void Backward_Click(object sender, RoutedEventArgs e) => ChangeLayerOrder(-1);
    private void RemoveLayer_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedImageId == null) return;
        _template.ImageLayers.RemoveAll(layer => layer.Id == _selectedImageId);
        _dirty = true;
        _selectedImageId = null;
        UpdatePreview();
    }

    private async Task UpdateImageAsync(string? dataUri)
    {
        if (string.IsNullOrEmpty(dataUri)) { PreviewImage.Source = null; return; }
        try
        {
            var bytes = Convert.FromBase64String(dataUri[(dataUri.IndexOf(',') + 1)..]);
            using var stream = new InMemoryRandomAccessStream();
            using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync();
            stream.Seek(0);
            var bitmap = new BitmapImage(); await bitmap.SetSourceAsync(stream);
            if (_template.BackgroundImageDataUri == dataUri) PreviewImage.Source = bitmap;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException or System.Runtime.InteropServices.COMException) { PreviewImage.Source = null; }
    }

    private static TextAlignment TextAlignmentFor(string alignment) => alignment switch { "left" => TextAlignment.Left, "right" => TextAlignment.Right, _ => TextAlignment.Center };
    private static Windows.UI.Color ParseColor(string value, Windows.UI.Color fallback)
    {
        if (!IsColor(value)) return fallback;
        return Windows.UI.Color.FromArgb(255, Convert.ToByte(value.Substring(1, 2), 16), Convert.ToByte(value.Substring(3, 2), 16), Convert.ToByte(value.Substring(5, 2), 16));
    }

    public async Task<bool> CanLeaveAsync()
    {
        if (_saving || _switching || _confirming) return false;
        return await ConfirmDiscardAsync();
    }

    private async Task<bool> ConfirmDiscardAsync()
    {
        if (!_dirty) return true;
        if (_confirming) return false;
        _confirming = true;
        try
        {
            var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("RecipeDiscardTitle"), Content = L.Get("SideEditorDiscardMessage"), PrimaryButtonText = L.Get("RecipeDiscardButton"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
            return await dialog.ShowAsync() == ContentDialogResult.Primary;
        }
        finally { _confirming = false; }
    }

    private async void New_Click(object sender, RoutedEventArgs e)
    {
        if (_switching || _saving || _confirming) return;
        _switching = true;
        try
        {
            if (!await ConfirmDiscardAsync()) return;
            _binding = true; TemplateSelector.SelectedItem = null; _binding = false;
            SetTemplate(new MenuTemplate { HeaderText = L.Get("String_Text_Weekly_Menu_69fa95"), FooterText = L.Get("String_Text_Prepared_with_care_by_DMS_082a78") }, null);
        }
        finally { _switching = false; }
    }
    private async void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_binding || TemplateSelector.SelectedItem is not MenuTemplate template) return;
        if (_switching || _saving || _confirming) { RestoreTemplateSelection(); return; }
        _switching = true; TemplateSelector.IsEnabled = false;
        try { if (await ConfirmDiscardAsync()) SetTemplate(template, template.Name); else RestoreTemplateSelection(); }
        finally { TemplateSelector.IsEnabled = true; _switching = false; }
    }
    private void RestoreTemplateSelection()
    {
        _binding = true; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _loadedName); _binding = false;
    }

    private async void Save_Click(object sender, RoutedEventArgs e)
    {
        if (_saving || _switching || _confirming) return;
        ReadFields();
        if (string.IsNullOrWhiteSpace(_template.Name)) { StatusText.Text = L.Get("Text_Template_name_is_required_0e3ca2"); return; }
        if (!IsColor(HeaderColorBox.Text) || !IsColor(BackgroundColorBox.Text)) { StatusText.Text = L.Get("TplInvalidColor"); return; }
        if (_templates.Any(t => string.Equals(t.Name, _template.Name, StringComparison.OrdinalIgnoreCase) && !string.Equals(t.Name, _loadedName, StringComparison.OrdinalIgnoreCase))) { StatusText.Text = L.Get("TplDuplicate"); return; }
        if (_template.IsPreset && string.Equals(_loadedName, _template.Name, StringComparison.OrdinalIgnoreCase)) { StatusText.Text = L.Get("TplPresetSave"); return; }
        try
        {
            _saving = true;
            IsEnabled = false;
            if (!string.Equals(_loadedName, _template.Name, StringComparison.OrdinalIgnoreCase)) _template.IsPreset = false;
            await _database.SaveTemplateAsync(_template);
            _loadedName = _template.Name;
            _templates = await _database.GetAllTemplatesAsync();
            _binding = true; TemplateSelector.ItemsSource = _templates; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _loadedName); _binding = false;
            StatusText.Text = L.Get("TplSaved");
            _dirty = false;
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
        finally { IsEnabled = true; _saving = false; }
    }

    private async void Delete_Click(object sender, RoutedEventArgs e)
    {
        if (_loadedName == null) return;
        if (_template.IsPreset) { StatusText.Text = L.Get("Text_Preset_templates_cannot_be_deleted_0a9c55"); return; }
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("Text_Delete_Template_c07327"), Content = L.Get("TplDeletePrompt"), PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        try { await _database.DeleteTemplateAsync(_loadedName); _templates = await _database.GetAllTemplatesAsync(); TemplateSelector.ItemsSource = _templates; SetTemplate(new MenuTemplate(), null); }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private async void Image_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var picker = new FileOpenPicker(); picker.FileTypeFilter.Add(".png"); picker.FileTypeFilter.Add(".jpg"); picker.FileTypeFilter.Add(".jpeg");
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSingleFileAsync();
            if (file == null) return;
            if ((await file.GetBasicPropertiesAsync()).Size > 1024 * 1024) { StatusText.Text = L.Get("TplTooLarge"); return; }
            var buffer = await Windows.Storage.FileIO.ReadBufferAsync(file);
            var bytes = new byte[buffer.Length]; using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            var data = $"data:{(file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg")};base64,{Convert.ToBase64String(bytes)}";
            if (_template.LayoutEnabled)
            {
                var size = (_template.BackgroundImageDataUri?.Length ?? 0) + _template.ImageLayers.Sum(layer => layer.DataUri?.Length ?? 0) + data.Length;
                if (size > 1_400_000) { StatusText.Text = L.Get("OutputImageTooLarge"); return; }
                var layer = new TemplateImageLayer { DataUri = data };
                _template.ImageLayers.Add(layer); _selectedElement = null; _selectedImageId = layer.Id;
            }
            else _template.BackgroundImageDataUri = data;
            _dirty = true;
            UpdatePreview();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }
    private void ClearImage_Click(object sender, RoutedEventArgs e) { _template.BackgroundImageDataUri = null; _dirty = true; UpdatePreview(); }
}

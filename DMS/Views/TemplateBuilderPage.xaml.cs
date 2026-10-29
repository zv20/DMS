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
    private static readonly List<string> RecentColors = [];
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
    private Button? _canvasSelectionButton;
    private RichEditBox? _canvasTextEditor;
    private TextBox? _canvasFreeTextEditor;
    private FrameworkElement? _contextualToolbar;
    private bool? _compactToolbarLayout;
    private bool _updatingZoom;
    private readonly Stack<string> _undoHistory = new();
    private readonly Stack<string> _redoHistory = new();
    private bool _restoringHistory;
    private readonly List<Microsoft.UI.Xaml.Shapes.Line> _snapGuides = [];
    private bool _dirty, _confirming, _switching, _saving, _layoutOverflow;
    private static readonly string[] Alignments = ["left", "center", "right"];
    private static readonly string[] Layouts = ["compact", "detailed", "detailed-2col"];
    private static readonly string[] Fonts = ["Arial", "Times New Roman", "Georgia", "Comic Sans MS", "Verdana", "Courier New", "Trebuchet MS", "Tahoma"];

    public TemplateBuilderPage()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        ConfigureControls();
        SizeChanged += TemplateBuilderPage_SizeChanged;
        Loaded += async (_, _) => await LoadAsync();
    }

    private void TemplateBuilderPage_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        var compact = e.NewSize.Width > 0 && e.NewSize.Width < 900;
        if (_compactToolbarLayout == compact) return;
        _compactToolbarLayout = compact;
        if (_contextualToolbar == null) return;
        LayoutCanvas.Children.Remove(_contextualToolbar);
        _contextualToolbar = null;
        UpdateContextualToolbar();
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
        NameTool(UndoButton, "TplUndo"); NameTool(RedoButton, "TplRedo");
        NameTool(TemplateSelector, "TplSelect"); NameTool(NameBox, "TplName"); NameTool(PreviewDate, "TplPreview");
        NameTool(SelectedFontBox, "TplFont"); NameTool(SelectedSizeBox, "TplSelectedSize"); NameTool(SelectedColorBox, "TplSelectedColor");
        NameTool(SelectedBoldButton, "TplBold"); NameTool(SelectedItalicButton, "TplItalic"); NameTool(SelectedUnderlineButton, "TplUnderline");
        NameTool(ImageButton, "TplImage"); NameTool(ClearImageButton, "TplImageClear");
        NameTool(AddTextButton, "TplAddText");
        NameTool(EnableCanvasButton, "TplEnableCanvas"); NameTool(EditTextButton, "TplEditText");
        NameTool(ForwardButton, "TplBringForward"); NameTool(BackwardButton, "TplSendBackward"); NameTool(RemoveLayerButton, "TplRemoveLayer");
        NameTool(ImageLayerSelector, "TplLayoutImage"); ImageLayerSelector.PlaceholderText = L.Get("TplLayoutImage");
        NameTool(PageOptionsButton, "TplPageOptions"); NameTool(VisibilityButton, "TplVisibilityOptions");
        WeekendLayoutButton.Content = L.Get("TplWeekendLayout");
        NameTool(ZoomOutButton, "TplZoomOut"); NameTool(ZoomInButton, "TplZoomIn");
        NameTool(ZoomResetButton, "TplZoomReset"); NameTool(CanvasZoomSlider, "TplZoom");
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
        UpdateUndoRedoButtons();
    }

    private void SetCanvasZoom(double percent)
    {
        percent = Math.Clamp(percent, 50, 200);
        CanvasScrollViewer.ChangeView(null, null, (float)(percent / 100), true);
    }

    private void ZoomOut_Click(object sender, RoutedEventArgs e) => SetCanvasZoom(CanvasScrollViewer.ZoomFactor * 100 - 10);
    private void ZoomIn_Click(object sender, RoutedEventArgs e) => SetCanvasZoom(CanvasScrollViewer.ZoomFactor * 100 + 10);
    private void ZoomReset_Click(object sender, RoutedEventArgs e) => SetCanvasZoom(100);

    private void CanvasZoomSlider_ValueChanged(object sender, Microsoft.UI.Xaml.Controls.Primitives.RangeBaseValueChangedEventArgs e)
    {
        if (!_updatingZoom && CanvasScrollViewer != null) SetCanvasZoom(e.NewValue);
    }

    private void CanvasScrollViewer_ViewChanged(object sender, ScrollViewerViewChangedEventArgs e)
    {
        if (CanvasZoomSlider == null || ZoomResetButton == null) return;
        var percent = Math.Round(CanvasScrollViewer.ZoomFactor * 100);
        _updatingZoom = true;
        CanvasZoomSlider.Value = percent;
        _updatingZoom = false;
        ZoomResetButton.Content = $"{percent:0}%";
    }

    private void CaptureVisualUndo()
    {
        if (_binding || _restoringHistory) return;
        _undoHistory.Push(JsonSerializer.Serialize(_template));
        if (_undoHistory.Count > 50)
        {
            var keep = _undoHistory.Take(50).Reverse().ToArray();
            _undoHistory.Clear();
            foreach (var item in keep) _undoHistory.Push(item);
        }
        _redoHistory.Clear();
        UpdateUndoRedoButtons();
    }

    private void UpdateUndoRedoButtons()
    {
        UndoButton.IsEnabled = _undoHistory.Count > 0;
        RedoButton.IsEnabled = _redoHistory.Count > 0;
    }

    private void RestoreVisualSnapshot(string snapshot)
    {
        var restored = JsonSerializer.Deserialize<MenuTemplate>(snapshot);
        if (restored == null) return;
        _restoringHistory = true;
        try { SetTemplate(restored, _loadedName); _dirty = true; }
        finally { _restoringHistory = false; UpdateUndoRedoButtons(); }
    }

    private void Undo_Click(object sender, RoutedEventArgs e)
    {
        if (_undoHistory.Count == 0) return;
        _redoHistory.Push(JsonSerializer.Serialize(_template));
        RestoreVisualSnapshot(_undoHistory.Pop());
    }

    private void Redo_Click(object sender, RoutedEventArgs e)
    {
        if (_redoHistory.Count == 0) return;
        _undoHistory.Push(JsonSerializer.Serialize(_template));
        RestoreVisualSnapshot(_redoHistory.Pop());
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
            _templates = (await _database.GetAllTemplatesAsync()).Where(t => t.V2 == null).ToList();
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
        _template.LayoutElements ??= new(); _template.ImageLayers ??= new(); _template.TextLayers ??= new();
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
        if (key.StartsWith("text:", StringComparison.Ordinal))
        {
            var layer = _template.TextLayers?.FirstOrDefault(item => "text:" + item.Id == key);
            if (layer != null) return layer.Style ??= new TemplateTextStyle();
        }
        if (_template.TextStyles.TryGetValue(key, out var style) && style != null) return style;
        var parts = key.Split(':');
        if (parts.Length == 2 && (parts[0] is "heading" or "menu" or "ingredient-group" or "allergen-group") &&
            _template.TextStyles.TryGetValue($"block:{parts[1]}", out var inherited) && inherited != null)
            return new TemplateTextStyle { FontFamily = inherited.FontFamily, FontSize = inherited.FontSize, Color = inherited.Color, Bold = inherited.Bold, Italic = inherited.Italic, Underline = inherited.Underline, Alignment = inherited.Alignment };
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
        if (_template.LayoutEnabled && key != null)
        {
            if (_canvasTextEditor != null) _canvasTextEditor.Focus(FocusState.Programmatic);
            else if (_canvasFreeTextEditor != null) _canvasFreeTextEditor.Focus(FocusState.Programmatic);
            else _canvasSelectionButton?.Focus(FocusState.Programmatic);
        }
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

    private string AlignmentFor(string key, TemplateTextStyle style) => style.Alignment is "left" or "center" or "right"
        ? style.Alignment
        : key == "header" ? _template.HeaderAlignment
        : key == "footer" ? _template.FooterAlignment
        : key == "date" ? "center"
        : "left";

    private void SetSelectedAlignment(string alignment)
    {
        if (_binding || _selectedElement == null || alignment is not ("left" or "center" or "right")) return;
        CaptureVisualUndo();
        var style = StyleFor(_selectedElement, _template.MealFontSize);
        style.Alignment = alignment;
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
        button.Tag = key;
        if (_template.LayoutEnabled && _selectedElement == key)
        {
            button.BorderThickness = new Thickness(1);
            button.Background = new SolidColorBrush(Windows.UI.Color.FromArgb(35, 30, 144, 255));
        }
        button.Click += (_, _) => SelectElement(key, legacyKey);
        if (_template.LayoutEnabled)
        {
            button.KeyDown += CanvasObject_KeyDown;
            if (_selectedElement == key && _canvasSelectionButton == null) _canvasSelectionButton = button;
        }
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
            TextDecorations = style.Underline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None, TextWrapping = TextWrapping.Wrap,
            TextAlignment = TextAlignmentFor(AlignmentFor(key, style)) };
    }

    private void OnEdited()
    {
        if (_binding) return;
        CaptureVisualUndo();
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
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(_template.IncludeWeekend ? 6 : 4));
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
        // Layer selection now happens by clicking an image on the canvas; keep this legacy
        // global selector hidden so it cannot duplicate the contextual editor.
        ImageLayerSelector.Visibility = Visibility.Collapsed;
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
        if (_template.ShowDateRange) PreviewPanel.Children.Add(SelectableText("date", $"{monday:d} – {monday.AddDays(_template.IncludeWeekend ? 6 : 4):d}", 14));
        var days = new Grid { ColumnSpacing = 12, RowSpacing = 12 };
        var columns = _template.TemplateStyle == "detailed-2col" ? 2 : 1;
        for (var column = 0; column < columns; column++) days.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        var dayCount = _template.IncludeWeekend ? 7 : 5;
        for (var row = 0; row < (dayCount + columns - 1) / columns; row++) days.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < dayCount; i++)
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
        CaptureVisualUndo();
        TemplateLayout.EnsureInitialized(_template);
        _dirty = true;
        UpdatePreview();
        StatusText.Text = L.Get("TplCanvasHint");
    }

    private async void EditText_Click(object sender, RoutedEventArgs e)
    {
        var header = _selectedElement == "header";
        if (!header && _selectedElement != "footer") return;
        await OpenRichEditorAsync(header);
    }

    private async Task OpenRichEditorAsync(bool header)
    {
        var source = header ? _template.HeaderRichText : _template.FooterRichText;
        var fallback = header ? _template.HeaderText : _template.FooterText;
        var editor = new RichEditBox { MinWidth = 440, MinHeight = 190, TextWrapping = TextWrapping.Wrap, AcceptsReturn = true };
        editor.Document.SetText(TextSetOptions.None, source?.Runs?.Count > 0 ? string.Concat(source.Runs.Select(run => run.Text)) : fallback);
        ApplyRichRuns(editor, source);
        var bold = new Button { Content = "B", FontWeight = FontWeights.Bold };
        var italic = new Button { Content = "I", FontStyle = Windows.UI.Text.FontStyle.Italic };
        var underline = new Button { Content = new TextBlock { Text = "U", TextDecorations = Windows.UI.Text.TextDecorations.Underline } };
        bold.Click += (_, _) => editor.Document.Selection.CharacterFormat.Bold = editor.Document.Selection.CharacterFormat.Bold == FormatEffect.On ? FormatEffect.Off : FormatEffect.On;
        italic.Click += (_, _) => editor.Document.Selection.CharacterFormat.Italic = editor.Document.Selection.CharacterFormat.Italic == FormatEffect.On ? FormatEffect.Off : FormatEffect.On;
        underline.Click += (_, _) => editor.Document.Selection.CharacterFormat.Underline = editor.Document.Selection.CharacterFormat.Underline == UnderlineType.None ? UnderlineType.Single : UnderlineType.None;
        var toolbar = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 5 };
        toolbar.Children.Add(bold); toolbar.Children.Add(italic); toolbar.Children.Add(underline);
        NameTool(bold, "TplBold"); NameTool(italic, "TplItalic"); NameTool(underline, "TplUnderline");
        var content = new StackPanel { Spacing = 8 }; content.Children.Add(toolbar); content.Children.Add(editor);
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get(header ? "TplHeader" : "TplFooter"), Content = content,
            PrimaryButtonText = L.Get("TplSave"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        CaptureVisualUndo();
        var rich = ReadRichRuns(editor);
        var plain = string.Concat(rich.Runs.Select(run => run.Text));
        if (header) { _template.HeaderRichText = rich.Runs.Count == 0 ? null : rich; _template.HeaderText = HeaderBox.Text = plain; }
        else { _template.FooterRichText = rich.Runs.Count == 0 ? null : rich; _template.FooterText = FooterBox.Text = plain; }
        _dirty = true;
        UpdatePreview();
    }

    private static void ApplyRichRuns(RichEditBox editor, TemplateRichTextContent? content)
    {
        if (content?.Runs == null || content.Runs.Count == 0) return;
        var offset = 0;
        foreach (var run in content.Runs)
        {
            var length = run.Text?.Length ?? 0;
            if (length == 0) continue;
            var format = editor.Document.GetRange(offset, offset + length).CharacterFormat;
            if (!string.IsNullOrWhiteSpace(run.FontFamily)) format.Name = run.FontFamily;
            if (run.FontSize is double size && double.IsFinite(size)) format.Size = (float)Math.Clamp(size, 6, 72);
            if (IsColor(run.Color!)) format.ForegroundColor = ParseColor(run.Color!, Colors.Black);
            if (run.Bold is bool bold) format.Bold = bold ? FormatEffect.On : FormatEffect.Off;
            if (run.Italic is bool italic) format.Italic = italic ? FormatEffect.On : FormatEffect.Off;
            if (run.Underline is bool underline) format.Underline = underline ? UnderlineType.Single : UnderlineType.None;
            offset += length;
        }
    }

    private static TemplateRichTextContent ReadRichRuns(RichEditBox editor)
    {
        editor.Document.GetText(TextGetOptions.None, out var text);
        // RichEdit adds one terminal paragraph marker that is not part of the content.
        if (text.EndsWith("\r", StringComparison.Ordinal)) text = text[..^1];
        var result = new TemplateRichTextContent();
        TemplateRichTextRun? previous = null;
        for (var index = 0; index < text.Length; index++)
        {
            var format = editor.Document.GetRange(index, index + 1).CharacterFormat;
            var color = format.ForegroundColor;
            var run = new TemplateRichTextRun
            {
                Text = text[index].ToString(), FontFamily = format.Name, FontSize = format.Size,
                Color = $"#{color.R:X2}{color.G:X2}{color.B:X2}",
                Bold = format.Bold == FormatEffect.On,
                Italic = format.Italic == FormatEffect.On,
                Underline = format.Underline != UnderlineType.None
            };
            if (previous != null && previous.FontFamily == run.FontFamily && previous.FontSize == run.FontSize && previous.Color == run.Color && previous.Bold == run.Bold && previous.Italic == run.Italic && previous.Underline == run.Underline) previous.Text += run.Text;
            else { result.Runs.Add(run); previous = run; }
        }
        return result;
    }

    private void UpdateLayoutCanvas(DateTime monday)
    {
        _layoutOverflow = false;
        LayoutCanvas.Children.Clear();
        _canvasSelectionButton = null;
        _canvasTextEditor = null;
        _canvasFreeTextEditor = null;
        _snapGuides.Clear();
        foreach (var image in _template.ImageLayers)
        {
            var picture = new Image { Stretch = image.FitMode switch { "contain" => Stretch.Uniform, "cover" => Stretch.UniformToFill, _ => Stretch.Fill }, Opacity = Math.Clamp(double.IsFinite(image.Opacity) ? image.Opacity : 1, 0, 1),
                RenderTransformOrigin = new Windows.Foundation.Point(.5, .5), RenderTransform = new RotateTransform { Angle = double.IsFinite(image.RotationDegrees) ? Math.Clamp(image.RotationDegrees, -360, 360) : 0 } };
            _ = LoadCanvasImageAsync(picture, image.DataUri);
            var select = new Button { Content = picture, Background = new SolidColorBrush(Colors.Transparent), Padding = new Thickness(0), HorizontalContentAlignment = HorizontalAlignment.Stretch, VerticalContentAlignment = VerticalAlignment.Stretch };
            select.KeyDown += CanvasObject_KeyDown;
            if (_selectedImageId == image.Id) _canvasSelectionButton = select;
            select.Click += (_, _) => { SelectElement(null); _selectedImageId = image.Id; UpdatePreview(); _canvasSelectionButton?.Focus(FocusState.Programmatic); };
            PlaceCanvasFrame("image:" + image.Id, image.X, image.Y, image.Width, image.Height, image.ZIndex, select, _selectedImageId == image.Id,
                (x, y, w, h) => { image.X = x; image.Y = y; image.Width = w; image.Height = h; });
        }
        foreach (var layer in _template.TextLayers ?? [])
        {
            var key = "text:" + layer.Id;
            FrameworkElement content;
            if (_selectedElement == key)
            {
                var box = new TextBox { Text = layer.Text, TextWrapping = TextWrapping.Wrap, AcceptsReturn = true,
                    Background = new SolidColorBrush(Colors.Transparent), BorderThickness = new Thickness(0), Padding = new Thickness(0),
                    FontFamily = new FontFamily(layer.Style.FontFamily), FontSize = layer.Style.FontSize,
                    Foreground = new SolidColorBrush(ParseColor(layer.Style.Color, Colors.Black)) };
                var captured = false;
                box.TextChanged += (_, _) => { if (!captured) { CaptureVisualUndo(); captured = true; } layer.Text = box.Text; _dirty = true; };
                _canvasFreeTextEditor = box;
                content = box;
            }
            else content = SelectableText(key, layer.Text, layer.Style.FontSize);
            PlaceCanvasFrame(key, layer.X, layer.Y, layer.Width, layer.Height, layer.ZIndex, content, _selectedElement == key,
                (x, y, w, h) => { layer.X = x; layer.Y = y; layer.Width = w; layer.Height = h; });
        }
        if (_template.ShowHeader)
        {
            var text = string.IsNullOrEmpty(_template.HeaderText) ? L.Get("TplEditHeader") : _template.HeaderText;
            PlaceTextFrame("header", _selectedElement == "header" ? CreateCanvasTextEditor(true) : SelectableText("header", text, _template.HeaderFontSize));
        }
        if (_template.ShowDateRange)
        {
            var dateButton = SelectableText("date", $"{monday:d} – {monday.AddDays(_template.IncludeWeekend ? 6 : 4):d}", 14);
            if (dateButton.Content is TextBlock dateLabel) dateLabel.TextAlignment = TextAlignmentFor(AlignmentFor("date", StyleFor("date", 14)));
            PlaceTextFrame("date", dateButton);
        }
        for (var i = 0; i < (_template.IncludeWeekend ? 7 : 5); i++)
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
            var menuKey = $"menu:{i}";
            var menuElement = _template.LayoutElements[menuKey];
            var lines = panel.Children.OfType<Button>().Select(button => button.Content).OfType<TextBlock>()
                .Select(label => (label.Text, label.FontSize)).ToList();
            var neighbors = new List<TemplateLayoutElement>();
            if (_template.ShowHeader) neighbors.Add(_template.LayoutElements["header"]);
            if (_template.ShowDateRange) neighbors.Add(_template.LayoutElements["date"]);
            if (_template.ShowFooter) neighbors.Add(_template.LayoutElements["footer"]);
            for (var neighbor = 0; neighbor < (_template.IncludeWeekend ? 7 : 5); neighbor++)
            {
                neighbors.Add(_template.LayoutElements[$"heading:{neighbor}"]);
                if (neighbor != i) neighbors.Add(_template.LayoutElements[$"menu:{neighbor}"]);
            }
            var fit = TemplateLayout.ResolveMenuFit(_template, menuElement,
                TemplateLayout.EstimateTextHeight(lines, menuElement.Width), TemplateLayout.AvailableHeight(menuElement, neighbors));
            if (fit.Overflowed) _layoutOverflow = true;
            foreach (var label in panel.Children.OfType<Button>().Select(button => button.Content).OfType<TextBlock>())
                label.FontSize *= fit.FontScale;
            if (panel.Children.Count == 0) panel.Children.Add(SelectableText(menuKey, L.Get("TplNoMeals"), _template.MealFontSize));
            PlaceTextFrame(menuKey, panel, fit.Height);
        }
        if (_template.ShowFooter)
        {
            var text = string.IsNullOrEmpty(_template.FooterText) ? L.Get("TplEditFooter") : _template.FooterText;
            PlaceTextFrame("footer", _selectedElement == "footer" ? CreateCanvasTextEditor(false) : SelectableText("footer", text, _template.FooterFontSize));
        }
        if (_layoutOverflow) StatusText.Text = L.Get("TplLayoutOverflow");
        else if (StatusText.Text == L.Get("TplLayoutOverflow")) StatusText.Text = "";
        UpdateContextualToolbar();
    }

    private void LayoutCanvas_PointerPressed(object sender, PointerRoutedEventArgs e)
    {
        // Child controls select themselves. Only a bare canvas press clears the active object.
        if (ReferenceEquals(e.OriginalSource, LayoutCanvas)) SelectElement(null);
    }

    private void AddText_Click(object sender, RoutedEventArgs e)
    {
        CaptureVisualUndo();
        TemplateLayout.EnsureInitialized(_template);
        var layer = new TemplateTextLayer { Text = L.Get("TplNewText") };
        _template.TextLayers.Add(layer);
        _dirty = true;
        SelectElement("text:" + layer.Id);
    }

    private async void WeekendLayout_Click(object sender, RoutedEventArgs e)
    {
        PageOptionsButton.Flyout?.Hide();
        var enabling = !_template.IncludeWeekend;
        var dialog = new ContentDialog
        {
            XamlRoot = XamlRoot, Title = L.Get("TplWeekendLayout"),
            Content = L.Get(enabling ? "TplWeekendEnableWarning" : "TplWeekendDisableWarning"),
            PrimaryButtonText = L.Get(enabling ? "TplWeekendEnable" : "TplWeekendDisable"),
            CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        CaptureVisualUndo();
        if (enabling) TemplateLayout.InitializeSevenDayLayout(_template);
        else _template.IncludeWeekend = false;
        _dirty = true;
        await LoadWeekAsync();
    }

    private async Task EditMenuSizingAsync()
    {
        var sizing = _template.MenuBlockSizing ??= new TemplateMenuBlockSizing();
        var modes = new[] { "fixed", "flexible", "shrink" };
        var mode = new ComboBox { Header = L.Get("TplSizingMode"), HorizontalAlignment = HorizontalAlignment.Stretch };
        mode.Items.Add(L.Get("TplSizingFixed")); mode.Items.Add(L.Get("TplSizingFlexible")); mode.Items.Add(L.Get("TplSizingShrink"));
        mode.SelectedIndex = Math.Max(0, Array.IndexOf(modes, sizing.Mode ?? (sizing.Enabled ? "flexible" : "fixed")));
        var min = new NumberBox { Header = L.Get("TplSizingMinHeight"), Minimum = 20, Maximum = TemplateLayout.PageHeight, Value = sizing.MinimumHeight };
        var max = new NumberBox { Header = L.Get("TplSizingMaxHeight"), Minimum = 20, Maximum = TemplateLayout.PageHeight, Value = sizing.MaximumHeight };
        var scale = new NumberBox { Header = L.Get("TplSizingMinScale"), Minimum = 50, Maximum = 100, Value = sizing.MinimumFontScale * 100 };
        var panel = new StackPanel { Spacing = 8 };
        panel.Children.Add(new TextBlock { Text = L.Get("TplSizingAllDays"), TextWrapping = TextWrapping.Wrap });
        panel.Children.Add(mode); panel.Children.Add(min); panel.Children.Add(max); panel.Children.Add(scale);
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplSizingTitle"), Content = panel,
            PrimaryButtonText = L.Get("TplSizingApply"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
        dialog.PrimaryButtonClick += (_, args) =>
        {
            if (!double.IsFinite(min.Value) || !double.IsFinite(max.Value) || min.Value > max.Value || !double.IsFinite(scale.Value))
            { args.Cancel = true; return; }
            CaptureVisualUndo();
            sizing.Mode = modes[Math.Clamp(mode.SelectedIndex, 0, 2)];
            sizing.Enabled = sizing.Mode == "flexible";
            sizing.MinimumHeight = min.Value; sizing.MaximumHeight = max.Value;
            sizing.MinimumFontScale = Math.Clamp(scale.Value / 100, .5, 1);
            _dirty = true;
        };
        if (await dialog.ShowAsync() == ContentDialogResult.Primary) UpdatePreview();
    }

    private void ApplyStyleToAllDays(string key)
    {
        var parts = key.Split(':');
        if (parts.Length != 2) return;
        var style = StyleFor(key, _template.MealFontSize, parts[0] == "heading");
        CaptureVisualUndo();
        for (var i = 0; i < 7; i++)
            _template.TextStyles[$"{parts[0]}:{i}"] = new TemplateTextStyle { FontFamily = style.FontFamily, FontSize = style.FontSize,
                Color = style.Color, Bold = style.Bold, Italic = style.Italic, Underline = style.Underline, Alignment = style.Alignment };
        _dirty = true;
        UpdatePreview();
    }

    private RichEditBox CreateCanvasTextEditor(bool header)
    {
        var key = header ? "header" : "footer";
        var style = StyleFor(key, header ? _template.HeaderFontSize : _template.FooterFontSize);
        var rich = header ? _template.HeaderRichText : _template.FooterRichText;
        var text = header ? _template.HeaderText : _template.FooterText;
        var editor = new RichEditBox
        {
            Tag = key, AcceptsReturn = true, TextWrapping = TextWrapping.Wrap,
            Background = new SolidColorBrush(Colors.Transparent), BorderThickness = new Thickness(0),
            Padding = new Thickness(0), FontFamily = new FontFamily(style.FontFamily), FontSize = style.FontSize,
            Foreground = new SolidColorBrush(ParseColor(style.Color, Colors.Black)),
            FontWeight = style.Bold ? FontWeights.Bold : FontWeights.Normal,
            FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal
        };
        editor.Document.SetText(TextSetOptions.None, rich?.Runs?.Count > 0 ? string.Concat(rich.Runs.Select(run => run.Text)) : text);
        ApplyRichRuns(editor, rich);
        var undoCaptured = false;
        editor.TextChanged += (_, _) =>
        {
            if (!undoCaptured) { CaptureVisualUndo(); undoCaptured = true; }
            var updated = ReadRichRuns(editor);
            var plain = string.Concat(updated.Runs.Select(run => run.Text));
            if (header) { _template.HeaderText = plain; _template.HeaderRichText = rich == null || updated.Runs.Count == 0 ? null : updated; }
            else { _template.FooterText = plain; _template.FooterRichText = rich == null || updated.Runs.Count == 0 ? null : updated; }
            var wasBinding = _binding;
            _binding = true;
            if (header) HeaderBox.Text = plain; else FooterBox.Text = plain;
            _binding = wasBinding;
            _dirty = true;
        };
        _canvasTextEditor = editor;
        return editor;
    }

    private void UpdateContextualToolbar()
    {
        _contextualToolbar = null;
        SelectionInfo.Visibility = Visibility.Collapsed;
        if (!_template.LayoutEnabled) return;

        var compact = ActualWidth > 0 && ActualWidth < 900;
        _compactToolbarLayout = compact;

        var textKey = _selectedElement;
        var image = _selectedImageId == null ? null : _template.ImageLayers.FirstOrDefault(layer => layer.Id == _selectedImageId);
        var layoutKey = SelectedLayoutKey();
        var textLayer = textKey?.StartsWith("text:", StringComparison.Ordinal) == true ? _template.TextLayers.FirstOrDefault(layer => "text:" + layer.Id == textKey) : null;
        var element = textLayer != null ? new TemplateLayoutElement { X = textLayer.X, Y = textLayer.Y, Width = textLayer.Width, Height = textLayer.Height } : layoutKey != null && _template.LayoutElements.TryGetValue(layoutKey, out var found) ? found : null;
        if (textKey == null && image == null) return;
        if (image == null && element == null) return;

        var section = textKey?.Split(':') ?? [];
        var label = section.FirstOrDefault() switch
        {
            "header" => L.Get("TplHeader"), "footer" => L.Get("TplFooter"),
            "date" => L.Get("TplSelectionDate"), "heading" => L.Get("TplDayHeading"),
            "menu" => L.Get("TplMenuNames"), "ingredient-group" => L.Get("TplIngredientText"),
            "allergen-group" => L.Get("TplAllergenText"), "text" => L.Get("TplNewText"), _ => L.Get("TplLayoutImage")
        };
        if (section.Length == 2 && int.TryParse(section[1], out var index) && index >= 0 && index < 7)
        {
            var day = PreviewDate.Date?.DateTime.Date ?? DateTime.Today;
            var monday = day.AddDays(-((7 + (int)day.DayOfWeek - 1) % 7));
            label = $"{monday.AddDays(index):dddd} › {label}";
        }
        SelectionPath.Text = label;
        SelectionHint.Text = L.Get(image != null ? "TplSelectionImageHint" : textKey is "header" or "footer" || textLayer != null ? "TplSelectionEditableHint" : "TplSelectionLinkedHint");
        SelectionInfo.Visibility = Visibility.Visible;

        var panel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = compact ? 2 : 3 };
        var toolbar = new Border
        {
            Background = new SolidColorBrush(Windows.UI.Color.FromArgb(245, 35, 35, 35)),
            BorderBrush = new SolidColorBrush(Colors.DodgerBlue), BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(4), Padding = new Thickness(compact ? 3 : 4),
            Child = new ScrollViewer { MaxWidth = 700, HorizontalScrollMode = ScrollMode.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto, VerticalScrollMode = ScrollMode.Disabled, Content = panel }
        };
        ToolTipService.SetToolTip(toolbar, L.Get("TplSelectedElement"));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(toolbar, L.Get("TplSelectedElement"));

        if (textKey != null)
        {
            var style = StyleFor(textKey, _template.MealFontSize);
            var font = new ComboBox { Width = compact ? 78 : 94, SelectedItem = style.FontFamily };
            foreach (var family in Fonts) font.Items.Add(family);
            font.SelectedItem = Fonts.Contains(style.FontFamily, StringComparer.OrdinalIgnoreCase) ? style.FontFamily : Fonts[0];
            font.SelectionChanged += (_, _) =>
            {
                if (_binding || font.SelectedItem is not string family) return;
                CaptureVisualUndo();
                var selected = StyleFor(textKey, _template.MealFontSize); selected.FontFamily = family; _template.TextStyles[textKey] = selected; _dirty = true; UpdatePreview();
            };
            var size = new NumberBox { Width = compact ? 54 : 60, Minimum = 7, Maximum = 72, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact, Value = style.FontSize };
            size.ValueChanged += (_, _) =>
            {
                if (_binding) return;
                CaptureVisualUndo();
                // Do not rebuild the canvas while NumberBox is focused: rebuilding removes
                // the spinner that the user is actively clicking.
                var selected = StyleFor(textKey, _template.MealFontSize); selected.FontSize = SafeNumber(size.Value, 11); _template.TextStyles[textKey] = selected; _dirty = true;
                UpdateCanvasFontSize(textKey, selected.FontSize);
            };
            size.LostFocus += (_, _) => { if (!_binding) UpdatePreview(); };
            var color = CreateColorTool("TplSelectedColor", style.Color, value =>
            {
                var selected = StyleFor(textKey, _template.MealFontSize); selected.Color = value; _template.TextStyles[textKey] = selected;
                UpdateCanvasTextColor(textKey, value);
            }, () =>
            {
                var selected = StyleFor(textKey, _template.MealFontSize);
                selected.Color = textKey == "header" ? _template.HeaderColor : "#000000";
                _template.TextStyles[textKey] = selected;
                UpdateCanvasTextColor(textKey, selected.Color);
            }, textKey == "header" ? _template.HeaderColor : "#000000");
            var appearanceKey = SelectedLayoutKey() ?? textKey;
            _template.BlockAppearances ??= new();
            _template.BlockAppearances.TryGetValue(appearanceKey, out var currentAppearance);
            var backgroundColor = CreateColorTool("TplAppearanceBackground", currentAppearance?.BackgroundColor ?? "#FFFFFF", value =>
            {
                if (!_template.BlockAppearances.TryGetValue(appearanceKey, out var item)) _template.BlockAppearances[appearanceKey] = item = new TemplateBlockAppearance();
                item.BackgroundColor = value;
                UpdateCanvasAppearance(appearanceKey, item);
            }, () =>
            {
                if (_template.BlockAppearances.TryGetValue(appearanceKey, out var item))
                {
                    item.BackgroundColor = null;
                    UpdateCanvasAppearance(appearanceKey, item);
                }
            }, "#FFFFFF");
            var borderColor = CreateColorTool("TplAppearanceBorder", currentAppearance?.BorderColor ?? "#000000", value =>
            {
                if (!_template.BlockAppearances.TryGetValue(appearanceKey, out var item)) _template.BlockAppearances[appearanceKey] = item = new TemplateBlockAppearance();
                item.BorderColor = value;
                if (item.BorderThickness <= 0) item.BorderThickness = 1;
                UpdateCanvasAppearance(appearanceKey, item);
            }, () =>
            {
                if (_template.BlockAppearances.TryGetValue(appearanceKey, out var item))
                {
                    item.BorderColor = null;
                    UpdateCanvasAppearance(appearanceKey, item);
                }
            }, "#000000");
            panel.Children.Add(font); panel.Children.Add(size); panel.Children.Add(color); panel.Children.Add(backgroundColor); panel.Children.Add(borderColor);
            AddFormatButton(panel, "B", "TplBold", style.Bold, value => SetContextualStyle(textKey, s => s.Bold = value));
            AddFormatButton(panel, "I", "TplItalic", style.Italic, value => SetContextualStyle(textKey, s => s.Italic = value));
            AddFormatButton(panel, "U", "TplUnderline", style.Underline, value => SetContextualStyle(textKey, s => s.Underline = value));
            var align = new ComboBox { Width = 76, Padding = new Thickness(8, 4, 8, 4) };
            foreach (var (glyph, alignmentLabel) in new[] { ("\uE8E4", "TplLeft"), ("\uE8E3", "TplCenter"), ("\uE8E2", "TplRight") })
            {
                var option = new ComboBoxItem { Content = new FontIcon { Glyph = glyph, FontSize = 16 } };
                NameTool(option, alignmentLabel);
                align.Items.Add(option);
            }
            align.SelectedIndex = Array.IndexOf(Alignments, AlignmentFor(textKey, style));
            align.SelectionChanged += (_, _) => { if (!_binding && align.SelectedIndex >= 0) SetSelectedAlignment(Alignments[align.SelectedIndex]); };
            NameTool(font, "TplFont"); NameTool(size, "TplSelectedSize"); NameTool(color, "TplSelectedColor");
            NameTool(align, "TplHeaderAlignment");
            panel.Children.Add(align);
            var appearance = new Button { Content = new FontIcon { Glyph = "\uE790" } };
            appearance.Click += async (_, _) => await OpenAppearanceEditorAsync(SelectedLayoutKey() ?? textKey);
            NameTool(appearance, "TplAppearance");
            panel.Children.Add(appearance);
            if (textKey is "header" or "footer")
            {
                var rich = new Button { Content = new FontIcon { Glyph = "\uE70F" } };
                rich.Click += async (_, _) => await OpenRichEditorAsync(textKey == "header");
                NameTool(rich, "TplRichEdit");
                panel.Children.Add(rich);
            }
            if (textKey.StartsWith("menu:", StringComparison.Ordinal))
            {
                var sizingButton = new Button { Content = new FontIcon { Glyph = "\uE8A7" } };
                NameTool(sizingButton, "TplSizingTitle");
                sizingButton.Click += async (_, _) => await EditMenuSizingAsync();
                panel.Children.Add(sizingButton);
            }
            var parts = textKey.Split(':');
            if (parts.Length == 2 && parts[0] is "heading" or "menu" or "ingredient-group" or "allergen-group")
            {
                var applyAll = new Button { Content = new FontIcon { Glyph = "\uE8C8" } };
                NameTool(applyAll, "TplApplyWeekdayStyle");
                applyAll.Click += (_, _) => ApplyStyleToAllDays(textKey);
                panel.Children.Add(applyAll);
            }
            if (textLayer != null)
            {
                var removeText = new Button { Content = new FontIcon { Glyph = "\uE74D" } };
                NameTool(removeText, "TplRemoveText");
                removeText.Click += (_, _) =>
                {
                    CaptureVisualUndo();
                    _template.TextLayers.Remove(textLayer);
                    _template.TextStyles.Remove(textKey);
                    _dirty = true;
                    SelectElement(null);
                };
                panel.Children.Add(removeText);
            }
        }
        else if (image != null)
        {
            var opacity = new Slider { Width = compact ? 72 : 90, Minimum = 0, Maximum = 100, StepFrequency = 5, Value = Math.Clamp(image.Opacity * 100, 0, 100) };
            var opacitySnapshot = false;
            opacity.ValueChanged += (_, _) => { if (!_binding) { if (!opacitySnapshot) { CaptureVisualUndo(); opacitySnapshot = true; } image.Opacity = opacity.Value / 100; _dirty = true; } };
            opacity.PointerReleased += (_, _) => { opacitySnapshot = false; UpdatePreview(); };
            var fit = new ComboBox { Width = compact ? 70 : 80 };
            fit.Items.Add(L.Get("TplFitFill")); fit.Items.Add(L.Get("TplFitContain")); fit.Items.Add(L.Get("TplFitCover"));
            fit.SelectedIndex = image.FitMode switch { "contain" => 1, "cover" => 2, _ => 0 };
            fit.SelectionChanged += (_, _) => { if (_binding || fit.SelectedIndex < 0) return; CaptureVisualUndo(); image.FitMode = fit.SelectedIndex switch { 1 => "contain", 2 => "cover", _ => "fill" }; _dirty = true; UpdatePreview(); };
            var locked = new ToggleSwitch { IsOn = image.LockAspectRatio, MinWidth = compact ? 34 : 38, OnContent = "↔", OffContent = "↔" };
            locked.Toggled += (_, _) => { if (_binding) return; CaptureVisualUndo(); image.LockAspectRatio = locked.IsOn; _dirty = true; };
            var rotation = new NumberBox { Width = compact ? 55 : 60, Minimum = -360, Maximum = 360, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact, Value = image.RotationDegrees };
            rotation.ValueChanged += (_, _) => { if (_binding) return; CaptureVisualUndo(); image.RotationDegrees = double.IsFinite(rotation.Value) ? Math.Clamp(rotation.Value, -360, 360) : 0; _dirty = true; };
            rotation.LostFocus += (_, _) => { if (!_binding) UpdatePreview(); };
            var alt = new TextBox { Width = compact ? 70 : 90, Text = image.AltText, PlaceholderText = L.Get("TplImageAlt") };
            alt.LostFocus += (_, _) => { if (_binding) return; CaptureVisualUndo(); image.AltText = (alt.Text ?? string.Empty).Trim()[..Math.Min(300, (alt.Text ?? string.Empty).Trim().Length)]; _dirty = true; };
            var back = new Button { Content = new FontIcon { Glyph = "\uE74B" } }; back.Click += (_, _) => ChangeLayerOrder(-1);
            var forward = new Button { Content = new FontIcon { Glyph = "\uE74A" } }; forward.Click += (_, _) => ChangeLayerOrder(1);
            var remove = new Button { Content = new FontIcon { Glyph = "\uE74D" } }; remove.Click += (_, _) => RemoveLayer_Click(remove, new RoutedEventArgs());
            NameTool(opacity, "TplOpacity"); NameTool(fit, "TplImageFit"); NameTool(locked, "TplLockAspect"); NameTool(rotation, "TplRotation"); NameTool(alt, "TplImageAlt"); NameTool(back, "TplSendBackward"); NameTool(forward, "TplBringForward"); NameTool(remove, "TplRemoveLayer");
            panel.Children.Add(opacity); panel.Children.Add(fit); panel.Children.Add(locked); panel.Children.Add(rotation); panel.Children.Add(alt); panel.Children.Add(back); panel.Children.Add(forward); panel.Children.Add(remove);
        }

        var positionLocked = image?.IsPositionLocked ?? textLayer?.IsPositionLocked ?? element?.IsPositionLocked ?? false;
        var lockButton = new Button { Content = new FontIcon { Glyph = positionLocked ? "\uE72E" : "\uE785" } };
        NameTool(lockButton, positionLocked ? "TplUnlockPosition" : "TplLockPosition");
        lockButton.Click += (_, _) =>
        {
            CaptureVisualUndo();
            if (image != null) image.IsPositionLocked = !positionLocked;
            else if (textLayer != null) textLayer.IsPositionLocked = !positionLocked;
            else if (layoutKey != null && _template.LayoutElements.TryGetValue(layoutKey, out var saved)) saved.IsPositionLocked = !positionLocked;
            _dirty = true; UpdatePreview();
        };
        panel.Children.Add(lockButton);

        // Keep the current object visible while it is being edited. The old fallback
        // clamped a wide toolbar across the selected object, which made live styling
        // changes impossible to see. Prefer a side, then below/above; all candidates
        // are outside the selected rectangle.
        var x = image?.X ?? element!.X; var y = image?.Y ?? element!.Y;
        var width = image?.Width ?? element!.Width; var height = image?.Height ?? element!.Height;
        // Measure the actual controls so placement accounts for their minimum sizes.
        toolbar.Measure(new Windows.Foundation.Size(double.PositiveInfinity, double.PositiveInfinity));
        var toolbarWidth = Math.Min(TemplateLayout.PageWidth, toolbar.DesiredSize.Width);
        var toolbarHeight = Math.Min(TemplateLayout.PageHeight, toolbar.DesiredSize.Height);
        const double gap = 8;
        var centeredLeft = Math.Clamp(x + (width - toolbarWidth) / 2, 0, TemplateLayout.PageWidth - toolbarWidth);
        var right = (Left: x + width + gap, Top: y);
        var leftSide = (Left: x - toolbarWidth - gap, Top: y);
        var below = (Left: centeredLeft, Top: y + height + gap);
        var above = (Left: centeredLeft, Top: y - toolbarHeight - gap);
        bool Fits((double Left, double Top) point) => point.Left >= 0 && point.Top >= 0
            && point.Left + toolbarWidth <= TemplateLayout.PageWidth && point.Top + toolbarHeight <= TemplateLayout.PageHeight;
        var position = Fits(right) ? right : Fits(leftSide) ? leftSide : Fits(below) ? below : Fits(above) ? above : below;
        var left = Math.Clamp(position.Left, 0, TemplateLayout.PageWidth - toolbarWidth);
        var top = Math.Clamp(position.Top, 0, TemplateLayout.PageHeight - toolbarHeight);
        Canvas.SetLeft(toolbar, left); Canvas.SetTop(toolbar, top); Canvas.SetZIndex(toolbar, 3000);
        LayoutCanvas.Children.Add(toolbar);
        _contextualToolbar = toolbar;
    }

    private async Task OpenAppearanceEditorAsync(string key)
    {
        _template.BlockAppearances ??= new();
        _template.BlockAppearances.TryGetValue(key, out var current);
        current ??= new TemplateBlockAppearance();
        var background = new TextBox { Text = current.BackgroundColor ?? string.Empty, PlaceholderText = L.Get("TplAppearanceBackground") };
        var border = new TextBox { Text = current.BorderColor ?? string.Empty, PlaceholderText = L.Get("TplAppearanceBorder") };
        var thickness = new NumberBox { Value = current.BorderThickness, Minimum = 0, Maximum = 20, Header = L.Get("TplAppearanceThickness") };
        var radius = new NumberBox { Value = current.CornerRadius, Minimum = 0, Maximum = 100, Header = L.Get("TplAppearanceRadius") };
        var padding = new NumberBox { Value = current.Padding, Minimum = 0, Maximum = 100, Header = L.Get("TplAppearancePadding") };
        var opacity = new Slider { Value = Math.Clamp(current.Opacity * 100, 0, 100), Minimum = 0, Maximum = 100, Header = L.Get("TplOpacity") };
        var panel = new StackPanel { Width = 300, Spacing = 8 };
        panel.Children.Add(background); panel.Children.Add(border); panel.Children.Add(thickness); panel.Children.Add(radius); panel.Children.Add(padding); panel.Children.Add(opacity);
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplAppearance"), Content = panel, PrimaryButtonText = L.Get("TplSave"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
        var backgroundValue = background.Text.Trim(); var borderValue = border.Text.Trim();
        if ((backgroundValue.Length > 0 && !IsColor(backgroundValue)) || (borderValue.Length > 0 && !IsColor(borderValue))) { StatusText.Text = L.Get("TplInvalidColor"); return; }
        CaptureVisualUndo();
        _template.BlockAppearances[key] = new TemplateBlockAppearance
        {
            BackgroundColor = backgroundValue.Length == 0 ? null : backgroundValue, BorderColor = borderValue.Length == 0 ? null : borderValue,
            BorderThickness = Math.Clamp(SafeNumber(thickness.Value, 0), 0, 20), CornerRadius = Math.Clamp(SafeNumber(radius.Value, 0), 0, 100),
            Padding = Math.Clamp(SafeNumber(padding.Value, 0), 0, 100), Opacity = Math.Clamp(opacity.Value / 100, 0, 1)
        };
        _dirty = true;
        UpdatePreview();
    }

    private Button CreateColorTool(string labelKey, string initial, Action<string> apply, Action reset, string resetColor)
    {
        var swatch = new Border { Width = 18, Height = 18, Background = new SolidColorBrush(ParseColor(initial, Colors.Black)), BorderBrush = new SolidColorBrush(Colors.Gray), BorderThickness = new Thickness(1) };
        var button = new Button { Content = swatch, Padding = new Thickness(5), MinWidth = 32 };
        NameTool(button, labelKey);
        var picker = new ColorPicker { Color = ParseColor(initial, Colors.Black), ColorSpectrumShape = ColorSpectrumShape.Ring, IsAlphaEnabled = false, IsAlphaSliderVisible = false, IsHexInputVisible = false, IsColorChannelTextInputVisible = false, Width = 230 };
        var defaults = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 5 };
        var recent = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 5 };
        var stack = new StackPanel { Spacing = 8 };
        stack.Children.Add(picker);
        stack.Children.Add(new TextBlock { Text = L.Get("TplDefaultColors") });
        stack.Children.Add(defaults);
        stack.Children.Add(new TextBlock { Text = L.Get("TplRecentColors") });
        stack.Children.Add(recent);
        var flyout = new Flyout { Content = stack };
        button.Flyout = flyout;
        var changed = false;
        void ApplyColor(Windows.UI.Color chosen)
        {
            var value = $"#{chosen.R:X2}{chosen.G:X2}{chosen.B:X2}";
            if (!changed) CaptureVisualUndo();
            changed = true;
            apply(value);
            _dirty = true;
            swatch.Background = new SolidColorBrush(chosen);
        }
        void RememberColor()
        {
            if (!changed) return;
            var chosen = picker.Color;
            var value = $"#{chosen.R:X2}{chosen.G:X2}{chosen.B:X2}";
            RecentColors.RemoveAll(c => string.Equals(c, value, StringComparison.OrdinalIgnoreCase));
            RecentColors.Insert(0, value);
            if (RecentColors.Count > 5) RecentColors.RemoveAt(5);
            changed = false;
        }
        var resetting = false;
        picker.ColorChanged += (_, args) => { if (!resetting) ApplyColor(args.NewColor); };
        flyout.Closed += (_, _) => RememberColor();
        Button ColorChoice(string value)
        {
            var choice = new Button { Content = new Border { Width = 20, Height = 20, Background = new SolidColorBrush(ParseColor(value, Colors.Black)), BorderBrush = new SolidColorBrush(Colors.Gray), BorderThickness = new Thickness(1) }, Padding = new Thickness(3), MinWidth = 0 };
            ToolTipService.SetToolTip(choice, value);
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(choice, value);
            choice.Click += (_, _) => picker.Color = ParseColor(value, Colors.Black);
            return choice;
        }
        foreach (var value in new[] { "#FFFFFF", "#000000", "#FF0000", "#008000", "#0067C0" })
            defaults.Children.Add(ColorChoice(value));
        flyout.Opening += (_, _) =>
        {
            recent.Children.Clear();
            foreach (var value in RecentColors.ToArray())
            {
                recent.Children.Add(ColorChoice(value));
            }
        };
        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        var resetButton = new Button { Content = L.Get("TplResetColor") };
        resetButton.Click += (_, _) =>
        {
            if (!changed) CaptureVisualUndo();
            reset();
            _dirty = true;
            changed = false;
            resetting = true;
            picker.Color = ParseColor(resetColor, Colors.Black);
            resetting = false;
            swatch.Background = new SolidColorBrush(picker.Color);
        };
        actions.Children.Add(resetButton);
        var accept = new Button { Content = L.Get("TplSave") };
        accept.Click += (_, _) => flyout.Hide();
        actions.Children.Add(accept);
        stack.Children.Add(actions);
        return button;
    }

    private void AddFormatButton(Panel panel, string content, string tooltipKey, bool selected, Action<bool> apply)
    {
        var button = new Microsoft.UI.Xaml.Controls.Primitives.ToggleButton { Content = content, IsChecked = selected, MinWidth = 28 };
        button.Checked += (_, _) => apply(true); button.Unchecked += (_, _) => apply(false);
        NameTool(button, tooltipKey);
        panel.Children.Add(button);
    }

    private void UpdateCanvasFontSize(string key, double size)
    {
        if (_canvasTextEditor is { Tag: string tag } editor && tag == key) editor.FontSize = size;
        if (_canvasFreeTextEditor != null && _selectedElement == key) _canvasFreeTextEditor.FontSize = size;
        void Visit(DependencyObject node)
        {
            if (node is Button { Tag: string tag, Content: TextBlock text } && tag == key)
                text.FontSize = size;
            for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++)
                Visit(VisualTreeHelper.GetChild(node, i));
        }
        Visit(LayoutCanvas);
    }

    private void UpdateCanvasTextColor(string key, string color)
    {
        if (_canvasTextEditor is { Tag: string tag } editor && tag == key) editor.Foreground = new SolidColorBrush(ParseColor(color, Colors.Black));
        if (_canvasFreeTextEditor != null && _selectedElement == key) _canvasFreeTextEditor.Foreground = new SolidColorBrush(ParseColor(color, Colors.Black));
        void Visit(DependencyObject node)
        {
            if (node is Button { Tag: string tag, Content: TextBlock text } && tag == key)
                text.Foreground = new SolidColorBrush(ParseColor(color, Colors.Black));
            for (var i = 0; i < VisualTreeHelper.GetChildrenCount(node); i++) Visit(VisualTreeHelper.GetChild(node, i));
        }
        Visit(LayoutCanvas);
    }

    private void UpdateCanvasAppearance(string key, TemplateBlockAppearance appearance)
    {
        foreach (var frame in LayoutCanvas.Children.OfType<Grid>().Where(frame => Equals(frame.Tag, "frame:" + key)))
        {
            var decoration = frame.Children.OfType<Border>().FirstOrDefault(border => Equals(border.Tag, "appearance"));
            if (decoration == null)
            {
                decoration = new Border { Tag = "appearance", IsHitTestVisible = false };
                frame.Children.Insert(0, decoration);
            }
            decoration.Background = new SolidColorBrush(ParseColor(appearance.BackgroundColor ?? "#FFFFFF", Colors.Transparent));
            if (appearance.BackgroundColor == null) decoration.Background = null;
            decoration.BorderBrush = appearance.BorderColor == null ? null : new SolidColorBrush(ParseColor(appearance.BorderColor, Colors.Transparent));
            decoration.BorderThickness = new Thickness(Math.Clamp(appearance.BorderThickness, 0, 20));
            decoration.CornerRadius = new CornerRadius(Math.Clamp(appearance.CornerRadius, 0, 100));
        }
    }

    private void SetContextualStyle(string key, Action<TemplateTextStyle> apply)
    {
        if (_binding) return;
        CaptureVisualUndo();
        var style = StyleFor(key, _template.MealFontSize); apply(style); _template.TextStyles[key] = style;
        _dirty = true;
        UpdatePreview();
    }

    private void PlaceTextFrame(string key, FrameworkElement content, double? displayHeight = null)
    {
        if (!_template.LayoutElements.TryGetValue(key, out var item) || item == null) return;
        var selected = _selectedElement == key || (key.StartsWith("menu:") && (_selectedElement == key.Replace("menu:", "ingredient-group:") || _selectedElement == key.Replace("menu:", "allergen-group:")));
        PlaceCanvasFrame(key, item.X, item.Y, item.Width, displayHeight ?? item.Height, item.ZIndex, content, selected,
            (x, y, w, h) => { item.X = x; item.Y = y; item.Width = w; if (displayHeight == null || Math.Abs(h - displayHeight.Value) > 0.01) item.Height = h; });
    }

    private void PlaceCanvasFrame(string objectKey, double x, double y, double width, double height, int z, FrameworkElement content, bool selected, Action<double, double, double, double> save)
    {
        x = double.IsFinite(x) ? Math.Clamp(x, 0, 774) : 0; y = double.IsFinite(y) ? Math.Clamp(y, 0, 1103) : 0;
        width = double.IsFinite(width) ? Math.Clamp(width, 20, 794 - x) : 100; height = double.IsFinite(height) ? Math.Clamp(height, 20, 1123 - y) : 30;
        var frame = new Grid { Width = width, Height = height, Tag = "frame:" + objectKey, Background = new SolidColorBrush(Colors.Transparent) };
        frame.PointerPressed += (_, e) =>
        {
            // A transparent frame still receives input, so treat its unused space as
            // canvas space and clear the active contextual toolbar.
            if (ReferenceEquals(e.OriginalSource, frame))
            {
                SelectElement(null);
                e.Handled = true;
            }
        };
        if (!objectKey.StartsWith("image:", StringComparison.Ordinal) && _template.BlockAppearances != null && _template.BlockAppearances.TryGetValue(objectKey, out var appearance) && appearance != null)
        {
            frame.Opacity = Math.Clamp(double.IsFinite(appearance.Opacity) ? appearance.Opacity : 1, 0, 1);
            frame.Children.Add(new Border { Tag = "appearance", Background = appearance.BackgroundColor is { } background && IsColor(background) ? new SolidColorBrush(ParseColor(background, Colors.Transparent)) : null,
                BorderBrush = appearance.BorderColor is { } border && IsColor(border) ? new SolidColorBrush(ParseColor(border, Colors.Transparent)) : null,
                BorderThickness = new Thickness(Math.Clamp(double.IsFinite(appearance.BorderThickness) ? appearance.BorderThickness : 0, 0, 20)),
                CornerRadius = new CornerRadius(Math.Clamp(double.IsFinite(appearance.CornerRadius) ? appearance.CornerRadius : 0, 0, 100)),
                Padding = new Thickness(Math.Clamp(double.IsFinite(appearance.Padding) ? appearance.Padding : 0, 0, 100)), IsHitTestVisible = false });
            content.Margin = new Thickness(Math.Clamp(double.IsFinite(appearance.Padding) ? appearance.Padding : 0, 0, 100));
        }
        if (content is not Button { Content: Image })
        {
            content.Measure(new Windows.Foundation.Size(width, double.PositiveInfinity));
            if (content.DesiredSize.Height > height + 1) _layoutOverflow = true;
        }
        frame.Children.Add(content);
        var positionLocked = objectKey.StartsWith("image:", StringComparison.Ordinal) ? _template.ImageLayers.FirstOrDefault(layer => "image:" + layer.Id == objectKey)?.IsPositionLocked == true
            : objectKey.StartsWith("text:", StringComparison.Ordinal) ? _template.TextLayers.FirstOrDefault(layer => "text:" + layer.Id == objectKey)?.IsPositionLocked == true
            : _template.LayoutElements.TryGetValue(objectKey, out var layout) && layout.IsPositionLocked;
        if (selected)
        {
            frame.Children.Add(new Border { BorderBrush = new SolidColorBrush(Colors.DodgerBlue), BorderThickness = new Thickness(1), IsHitTestVisible = false });
            if (!positionLocked)
            {
            var move = new Border { Width = 18, Height = 18, HorizontalAlignment = HorizontalAlignment.Left, VerticalAlignment = VerticalAlignment.Top, Background = new SolidColorBrush(Colors.DodgerBlue), Child = new TextBlock { Text = "✥", Foreground = new SolidColorBrush(Colors.White), HorizontalAlignment = HorizontalAlignment.Center } };
            var resize = new Border { Width = 16, Height = 16, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Bottom, Background = new SolidColorBrush(Colors.DodgerBlue), Child = new TextBlock { Text = "◢", Foreground = new SolidColorBrush(Colors.White), HorizontalAlignment = HorizontalAlignment.Center } };
            ToolTipService.SetToolTip(move, L.Get("TplMoveObject")); ToolTipService.SetToolTip(resize, L.Get("TplResizeObject"));
            AttachDrag(move, false); AttachDrag(resize, true);
            frame.Children.Add(move); frame.Children.Add(resize);
            }
        }
        Canvas.SetLeft(frame, x); Canvas.SetTop(frame, y); Canvas.SetZIndex(frame, Math.Clamp(z, 1, 1000)); LayoutCanvas.Children.Add(frame);

        void AttachDrag(Border handle, bool resizing)
        {
            Windows.Foundation.Point start = default;
            double initialX = 0, initialY = 0, initialWidth = 0, initialHeight = 0;
            bool dragging = false;
            handle.PointerPressed += (_, e) => { if (!e.GetCurrentPoint(handle).Properties.IsLeftButtonPressed) return; CaptureVisualUndo(); start = e.GetCurrentPoint(LayoutCanvas).Position; initialX = x; initialY = y; initialWidth = width; initialHeight = height; dragging = handle.CapturePointer(e.Pointer); if (_contextualToolbar != null) _contextualToolbar.Visibility = Visibility.Collapsed; e.Handled = true; };
            handle.PointerMoved += (_, e) =>
            {
                if (!dragging) return;
                var point = e.GetCurrentPoint(LayoutCanvas).Position;
                if (resizing) { width = Math.Clamp(initialWidth + point.X - start.X, 20, 794 - x); var locked = objectKey.StartsWith("image:", StringComparison.Ordinal) ? _template.ImageLayers.FirstOrDefault(layer => "image:" + layer.Id == objectKey)?.LockAspectRatio == true : false; height = locked ? Math.Clamp(width * initialHeight / Math.Max(1, initialWidth), 20, 1123 - y) : Math.Clamp(initialHeight + point.Y - start.Y, 20, 1123 - y); frame.Width = width; frame.Height = height; }
                else
                {
                    x = Math.Clamp(initialX + point.X - start.X, 0, 794 - width); y = Math.Clamp(initialY + point.Y - start.Y, 0, 1123 - height);
                    (x, y) = SnapPosition(objectKey, x, y, width, height);
                    Canvas.SetLeft(frame, x); Canvas.SetTop(frame, y);
                }
                save(x, y, width, height); _dirty = true; e.Handled = true;
            };
            handle.PointerReleased += (_, e) => { if (!dragging) return; dragging = false; handle.ReleasePointerCapture(e.Pointer); UpdatePreview(); _canvasSelectionButton?.Focus(FocusState.Programmatic); e.Handled = true; };
            handle.PointerCaptureLost += (_, _) => { if (dragging) { dragging = false; ClearSnapGuides(); } };
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

    private void CanvasObject_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == Windows.System.VirtualKey.Escape)
        {
            SelectElement(null);
            e.Handled = true;
            return;
        }
        var (dx, dy) = e.Key switch
        {
            Windows.System.VirtualKey.Left => (-1, 0), Windows.System.VirtualKey.Right => (1, 0),
            Windows.System.VirtualKey.Up => (0, -1), Windows.System.VirtualKey.Down => (0, 1),
            _ => (0, 0)
        };
        if (dx == 0 && dy == 0) return;
        var image = _selectedImageId == null ? null : _template.ImageLayers.FirstOrDefault(layer => layer.Id == _selectedImageId);
        var key = SelectedLayoutKey();
        var textLayer = key?.StartsWith("text:", StringComparison.Ordinal) == true ? _template.TextLayers.FirstOrDefault(layer => "text:" + layer.Id == key) : null;
        var item = key != null && _template.LayoutElements.TryGetValue(key, out var selected) ? selected : null;
        if (image == null && item == null && textLayer == null) return;
        if (image?.IsPositionLocked == true || item?.IsPositionLocked == true || textLayer?.IsPositionLocked == true) return;
        var x = image?.X ?? textLayer?.X ?? item!.X; var y = image?.Y ?? textLayer?.Y ?? item!.Y;
        var width = image?.Width ?? textLayer?.Width ?? item!.Width; var height = image?.Height ?? textLayer?.Height ?? item!.Height;
        width = double.IsFinite(width) ? Math.Clamp(width, 20, 794) : 100;
        height = double.IsFinite(height) ? Math.Clamp(height, 20, 1123) : 30;
        x = Math.Clamp((double.IsFinite(x) ? x : 0) + dx, 0, 794 - width);
        y = Math.Clamp((double.IsFinite(y) ? y : 0) + dy, 0, 1123 - height);
        if (image != null) { image.X = x; image.Y = y; } else if (textLayer != null) { textLayer.X = x; textLayer.Y = y; } else { item!.X = x; item.Y = y; }
        _dirty = true;
        UpdatePreview();
        _canvasSelectionButton?.Focus(FocusState.Programmatic);
        e.Handled = true;
    }

    private (double X, double Y) SnapPosition(string selectedKey, double x, double y, double width, double height)
    {
        var vertical = new List<double> { 0, 40, 397, 754, 794 };
        var horizontal = new List<double> { 0, 40, 561.5, 1083, 1123 };
        void AddGuides(double left, double top, double w, double h)
        {
            if (!double.IsFinite(left) || !double.IsFinite(top) || !double.IsFinite(w) || !double.IsFinite(h)) return;
            vertical.AddRange([left, left + w / 2, left + w]);
            horizontal.AddRange([top, top + h / 2, top + h]);
        }
        foreach (var pair in _template.LayoutElements)
            if (pair.Key != selectedKey && pair.Value != null) AddGuides(pair.Value.X, pair.Value.Y, pair.Value.Width, pair.Value.Height);
        foreach (var layer in _template.ImageLayers)
            if (layer != null && "image:" + layer.Id != selectedKey) AddGuides(layer.X, layer.Y, layer.Width, layer.Height);
        foreach (var layer in _template.TextLayers)
            if (layer != null && "text:" + layer.Id != selectedKey) AddGuides(layer.X, layer.Y, layer.Width, layer.Height);

        static (double Position, double? Guide) Closest(double position, double size, double limit, List<double> guides)
        {
            double best = 5, result = position; double? aligned = null;
            foreach (var anchor in new[] { position, position + size / 2, position + size })
                foreach (var guide in guides)
                {
                    var delta = guide - anchor;
                    if (Math.Abs(delta) >= best || position + delta < 0 || position + delta > limit - size) continue;
                    best = Math.Abs(delta); result = position + delta; aligned = guide;
                }
            return (result, aligned);
        }
        var horizontalSnap = Closest(x, width, 794, vertical);
        var verticalSnap = Closest(y, height, 1123, horizontal);
        ClearSnapGuides();
        if (horizontalSnap.Guide is double guideX) AddSnapGuide(guideX, 0, guideX, 1123);
        if (verticalSnap.Guide is double guideY) AddSnapGuide(0, guideY, 794, guideY);
        return (horizontalSnap.Position, verticalSnap.Position);
    }

    private void AddSnapGuide(double x1, double y1, double x2, double y2)
    {
        var line = new Microsoft.UI.Xaml.Shapes.Line { X1 = x1, Y1 = y1, X2 = x2, Y2 = y2,
            Stroke = new SolidColorBrush(Colors.DeepSkyBlue), StrokeThickness = 1, IsHitTestVisible = false };
        Canvas.SetZIndex(line, 2000);
        _snapGuides.Add(line);
        LayoutCanvas.Children.Add(line);
    }

    private void ClearSnapGuides()
    {
        foreach (var line in _snapGuides) LayoutCanvas.Children.Remove(line);
        _snapGuides.Clear();
    }

    private void ChangeLayerOrder(int direction)
    {
        var all = _template.LayoutElements.Select(pair => (Id: pair.Key, Z: pair.Value.ZIndex, Set: (Action<int>)(z => pair.Value.ZIndex = z)))
            .Concat(_template.ImageLayers.Select(layer => (Id: "image:" + layer.Id, Z: layer.ZIndex, Set: (Action<int>)(z => layer.ZIndex = z))))
            .Concat(_template.TextLayers.Select(layer => (Id: "text:" + layer.Id, Z: layer.ZIndex, Set: (Action<int>)(z => layer.ZIndex = z))))
            .OrderBy(layer => layer.Z).ThenBy(layer => layer.Id, StringComparer.Ordinal).ToList();
        var selected = _selectedImageId != null ? "image:" + _selectedImageId : SelectedLayoutKey();
        var index = all.FindIndex(layer => layer.Id == selected);
        var target = index + direction;
        if (index < 0 || target < 0 || target >= all.Count) return;
        CaptureVisualUndo();
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
        CaptureVisualUndo();
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
        if (_template.IsPreset && string.Equals(_loadedName, _template.Name, StringComparison.OrdinalIgnoreCase)) { StatusText.Text = L.Get("TplPresetSave"); return; }
        try
        {
            _saving = true;
            IsEnabled = false;
            var allTemplates = await _database.GetAllTemplatesAsync();
            if (allTemplates.Any(t => string.Equals(t.Name, _template.Name, StringComparison.OrdinalIgnoreCase) && (t.V2 != null || !string.Equals(t.Name, _loadedName, StringComparison.OrdinalIgnoreCase)))) { StatusText.Text = L.Get("TplDuplicate"); return; }
            if (!string.Equals(_loadedName, _template.Name, StringComparison.OrdinalIgnoreCase)) _template.IsPreset = false;
            await _database.SaveTemplateAsync(_template);
            _loadedName = _template.Name;
            _templates = (await _database.GetAllTemplatesAsync()).Where(t => t.V2 == null).ToList();
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
        try { await _database.DeleteTemplateAsync(_loadedName); _templates = (await _database.GetAllTemplatesAsync()).Where(t => t.V2 == null).ToList(); TemplateSelector.ItemsSource = _templates; SetTemplate(new MenuTemplate(), null); }
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
            if ((await file.GetBasicPropertiesAsync()).Size > 4 * 1024 * 1024) { StatusText.Text = L.Get("TplImageLimit"); return; }
            var buffer = await Windows.Storage.FileIO.ReadBufferAsync(file);
            var bytes = new byte[buffer.Length]; using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            var data = $"data:{(file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg")};base64,{Convert.ToBase64String(bytes)}";
            if (_template.LayoutEnabled)
            {
                var size = (_template.BackgroundImageDataUri?.Length ?? 0) + _template.ImageLayers.Sum(layer => layer.DataUri?.Length ?? 0) + data.Length;
                if (size > 16 * 1024 * 1024) { StatusText.Text = L.Get("TplImagesTotalLimit"); return; }
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

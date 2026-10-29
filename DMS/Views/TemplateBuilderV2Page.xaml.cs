using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Input;
using Windows.Foundation;
using System.Text.Json;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using L = DMS.Services.Localization;

namespace DMS.Views;

public sealed partial class TemplateBuilderV2Page : Page, IUnsavedEditor
{
    private readonly IDatabaseService _database;
    private readonly List<NumberBox> _dayBoxes = [];
    private readonly List<CheckBox> _fixedBoxes = [];
    private readonly List<StackPanel> _dayRows = [];
    private readonly List<MenuTemplate> _templates = [];
    private TemplateV2Document _document = new();
    private MenuTemplate _loadedTemplate = new();
    private string? _loadedName;
    private bool _legacySource;
    private bool _binding = true, _dirty, _saving, _switching;
    private int _generation;
    private int _renderGeneration;
    private string? _selectedBlock;
    private FrameworkElement? _selectionAnchor;
    private bool _contextBinding, _updatingZoom;
    private string? _editingBlock;
    private bool _inlineTextChanged;
    private bool _weekendEnabled;
    private List<MenuEntry> _entries = [];
    private List<Recipe> _recipes = [];
    private List<Ingredient> _ingredients = [];
    private DateTime _monday;
    private readonly Dictionary<string, Button> _colorButtons = [];
    private static readonly string[] Fonts = ["Arial", "Times New Roman", "Georgia", "Verdana", "Tahoma", "Courier New"];

    public TemplateBuilderV2Page()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        PageTitle.Text = L.Get("TplV2Title"); TemplateSelector.PlaceholderText = L.Get("TplSelect");
        NewButton.Content = L.Get("TplNew"); SaveButton.Content = L.Get("TplSave");
        DeleteButton.Content = L.Get("String_Text_Delete_f6fdbe");
        WeekPicker.Header = L.Get("TplPreview");
        DaySpacingBox.Header = L.Get("TplV2DaySpacing"); MealSpacingBox.Header = L.Get("TplV2MealSpacing");
        InlineEditHint.Text = L.Get("TplV2InlineEditHint"); DayHint.Text = L.Get("TplV2DayHint");
        FontBox.Header = L.Get("TplV2FontSize"); MinimumFontBox.Header = L.Get("TplV2MinimumFont");
        AllowShrinkBox.Content = L.Get("TplV2AllowShrink");
        HideEmptyDaysBox.Content = L.Get("TplV2HideEmptyDays");
        FontFamilyBox.Header = L.Get("TplFont"); foreach (var family in Fonts) FontFamilyBox.Items.Add(family);
        ChooseImageButton.Content = L.Get("TplV2BackgroundImage"); ClearImageButton.Content = L.Get("TplV2ClearBackground");
        ImageOpacitySlider.Header = L.Get("TplV2ImageOpacity");
        AddDecorationButton.Content = L.Get("TplV2AddDecoration"); RemoveDecorationButton.Content = L.Get("TplV2RemoveDecoration");
        DecorationSelector.Header = L.Get("TplV2Decorations"); DecorationX.Header = L.Get("TplV2ImageX"); DecorationY.Header = L.Get("TplV2ImageY");
        DecorationWidth.Header = L.Get("TplV2ImageWidth"); DecorationHeight.Header = L.Get("TplV2ImageHeight"); DecorationReserve.Content = L.Get("TplV2ReserveSpace");
        HeaderReflectionBox.Content = L.Get("TplV2HeaderReflection");
        foreach (var (key, label) in new[] { ("header", "TplV2HeaderColor"), ("body", "TplV2BodyColor"), ("footer", "TplV2FooterColor"), ("allergen", "TplV2AllergenAccent"), ("background", "TplV2BackgroundColor") })
            AddColorControl(key, label);
        WeekPicker.Date = DateTimeOffset.Now;
        foreach (var (control, label) in new (FrameworkElement, string)[] { (ZoomOutButton, "TplZoomOut"), (ZoomInButton, "TplZoomIn"), (ZoomResetButton, "TplZoomReset"), (CanvasZoomSlider, "TplZoom") })
        {
            ToolTipService.SetToolTip(control, L.Get(label));
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(control, L.Get(label));
        }
        ZoomOutButton.Click += (_, _) => SetCanvasZoom(PageScroll.ZoomFactor * 100 - 10);
        ZoomInButton.Click += (_, _) => SetCanvasZoom(PageScroll.ZoomFactor * 100 + 10);
        ZoomResetButton.Click += (_, _) => SetCanvasZoom(100);
        CanvasZoomSlider.ValueChanged += (_, e) => { if (!_updatingZoom) SetCanvasZoom(e.NewValue); };
        PageScroll.ViewChanged += (_, _) => { UpdateCanvasZoom(); PositionContextTools(); };
        InlineEditor.TextChanged += InlineEditor_TextChanged;
        InlineEditor.LostFocus += (_, _) => RefreshInlineText();
        Workspace.SizeChanged += (_, _) => PositionContextTools();
        AddHandler(UIElement.PointerPressedEvent, new PointerEventHandler(Page_PointerPressed), true);
        KeyDown += (_, e) => { if (e.Key == Windows.System.VirtualKey.Escape && _selectedBlock != null) { DismissContextTools(); e.Handled = true; } };
        var monday = DateTime.Today.AddDays(-((7 + (int)DateTime.Today.DayOfWeek - 1) % 7));
        for (var i = 0; i < 7; i++)
        {
            var day = i;
            var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 6 };
            var fixedBox = new CheckBox { Content = monday.AddDays(i).ToString("dddd"), MinWidth = 110 };
            var height = new NumberBox { Minimum = 40, Maximum = 500, Width = 105, Value = 160, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact, IsEnabled = false };
            fixedBox.Checked += (_, _) => { height.IsEnabled = true; DayChanged(day); };
            fixedBox.Unchecked += (_, _) => { height.IsEnabled = false; DayChanged(day); };
            height.ValueChanged += (_, _) => DayChanged(day);
            _fixedBoxes.Add(fixedBox); _dayBoxes.Add(height); _dayRows.Add(row); row.Children.Add(fixedBox); row.Children.Add(height); DayControls.Children.Add(row);
        }
        Loaded += async (_, _) => await InitializeAsync();
    }

    private void SetCanvasZoom(double percent)
        => PageScroll.ChangeView(null, null, (float)(Math.Clamp(percent, 50, 200) / 100), true);

    private void UpdateCanvasZoom()
    {
        var percent = Math.Round(PageScroll.ZoomFactor * 100);
        _updatingZoom = true;
        CanvasZoomSlider.Value = percent;
        _updatingZoom = false;
        ZoomResetButton.Content = $"{percent:0}%";
    }

    private async Task InitializeAsync()
    {
        try { await ReloadTemplatesAsync(); SetDocument(NewTemplate(), null); await LoadWeekAsync(); }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private static MenuTemplate NewTemplate() => new() { V2 = new TemplateV2Document { HeaderText = L.Get("String_Text_Weekly_Menu_69fa95") } };

    private async Task ReloadTemplatesAsync()
    {
        var all = await _database.GetAllTemplatesAsync();
        _templates.Clear(); _templates.AddRange(all);
        _binding = true; TemplateSelector.ItemsSource = null; TemplateSelector.ItemsSource = _templates; _binding = false;
    }

    private void SetDocument(MenuTemplate template, string? name)
    {
        var loadedTemplate = TemplateV2Conversion.ToV2Copy(template);
        _binding = true;
        DismissContextTools();
        _legacySource = template.V2 == null && name != null;
        _loadedTemplate = loadedTemplate;
        _document = _loadedTemplate.V2 ?? new();
        _document.MergeLegacyFooterNotice();
        var heights = new double?[7];
        if (_document.DayHeights != null) Array.Copy(_document.DayHeights, heights, Math.Min(7, _document.DayHeights.Length));
        _document.DayHeights = heights;
        _loadedName = name;
        DeleteButton.IsEnabled = name != null && !_legacySource && !_loadedTemplate.IsPreset;
        DaySpacingBox.Value = _document.DaySpacing; MealSpacingBox.Value = _document.MealLineSpacing;
        _document.DecorativeImages ??= new();
        HeaderReflectionBox.IsChecked = _document.ShowHeaderReflection;
        RefreshDecorationList();
        FontBox.Value = _document.FontSize; MinimumFontBox.Value = _document.MinimumFontSize;
        AllowShrinkBox.IsChecked = _document.AllowFontShrink;
        HideEmptyDaysBox.IsChecked = _document.HideEmptyDays;
        FontFamilyBox.SelectedItem = Fonts.Contains(_document.FontFamily, StringComparer.OrdinalIgnoreCase) ? _document.FontFamily : Fonts[0];
        ImageOpacitySlider.Value = Math.Clamp(_document.BackgroundImageOpacity * 100, 0, 100);
        UpdateColorButtons();
        for (var i = 0; i < 7; i++)
        {
            _fixedBoxes[i].IsChecked = heights[i].HasValue;
            _dayBoxes[i].Value = heights[i] ?? 160;
            _dayBoxes[i].IsEnabled = heights[i].HasValue;
        }
        _dirty = false; _binding = false; Render();
    }

    private async void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_binding || _switching || TemplateSelector.SelectedItem is not MenuTemplate chosen) return;
        _switching = true;
        try
        {
            if (!await ConfirmDiscardAsync())
            {
                _binding = true; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _loadedName); _binding = false;
                return;
            }
            if (chosen.V2 == null)
            {
                var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplLegacyConvertTitle"), Content = L.Get("TplLegacyConvertMessage"),
                    PrimaryButtonText = L.Get("TplLegacyConvertButton"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
                if (await dialog.ShowAsync() != ContentDialogResult.Primary)
                {
                    _binding = true; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _loadedName); _binding = false;
                    return;
                }
            }
            SetDocument(chosen, chosen.Name);
        }
        catch (Exception ex)
        {
            _binding = true; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _loadedName); _binding = false;
            StatusText.Text = L.Format("TplError", ex.Message);
        }
        finally { _switching = false; }
    }

    private async void New_Click(object sender, RoutedEventArgs e)
    {
        if (_saving || _switching || !await ConfirmDiscardAsync()) return;
        _binding = true; TemplateSelector.SelectedItem = null; _binding = false;
        SetDocument(NewTemplate(), null);
    }

    private async void Save_Click(object sender, RoutedEventArgs e)
    {
        if (_saving || _switching) return;
        UpdateInlineText();
        if (!double.IsFinite(FontBox.Value) || !double.IsFinite(MinimumFontBox.Value) || MinimumFontBox.Value > FontBox.Value)
        { StatusText.Text = L.Get("TplV2FontInvalid"); return; }
        _saving = true; SaveButton.IsEnabled = false;
        try
        {
            var all = await _database.GetAllTemplatesAsync();
            var nameBox = new TextBox { Header = L.Get("TplName"), Text = _legacySource ? $"{_loadedName} - {L.Get("TplLegacyCopySuffix")}" : _loadedName ?? "" };
            var error = new TextBlock { TextWrapping = TextWrapping.Wrap, Visibility = Visibility.Collapsed };
            var content = new StackPanel { Spacing = 8 };
            content.Children.Add(nameBox); content.Children.Add(error);
            var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplSave"), Content = content,
                PrimaryButtonText = L.Get("TplSave"), CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Primary };
            string name = "";
            dialog.PrimaryButtonClick += (_, args) =>
            {
                name = nameBox.Text.Trim();
                var message = name.Length == 0 ? "TplV2NameRequired" : all.Any(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase) && (_legacySource || !string.Equals(t.Name, _loadedName, StringComparison.Ordinal))) ? "TplV2NameExists" : null;
                if (message != null) { args.Cancel = true; error.Text = L.Get(message); error.Visibility = Visibility.Visible; return; }
                if (string.Equals(name, _loadedName, StringComparison.OrdinalIgnoreCase)) name = _loadedName!;
            };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            var saved = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(_loadedTemplate)) ?? new MenuTemplate();
            saved.Name = name; saved.V2 = _document;
            if (_legacySource || !string.Equals(name, _loadedName, StringComparison.Ordinal)) saved.IsPreset = false;
            await _database.SaveTemplateAsync(saved);
            _loadedTemplate = saved; _legacySource = false;
            _loadedName = name; _dirty = false;
            DeleteButton.IsEnabled = !saved.IsPreset;
            await ReloadTemplatesAsync();
            _binding = true; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == name); _binding = false;
            StatusText.Text = L.Get("Text_Saved_499dc6");
        }
        catch (Exception ex) { StatusText.Text = L.Format("SaveError", ex.Message); }
        finally { _saving = false; SaveButton.IsEnabled = true; }
    }

    private async void Delete_Click(object sender, RoutedEventArgs e)
    {
        if (_saving || _switching || _loadedName == null || _legacySource || _loadedTemplate.IsPreset) return;
        var name = _loadedName;
        _saving = true; DeleteButton.IsEnabled = false; SaveButton.IsEnabled = false;
        try
        {
            var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("Text_Delete_Template_c07327"),
                Content = L.Get("TplDeletePrompt"), PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            await _database.DeleteTemplateAsync(name);
            await ReloadTemplatesAsync();
            SetDocument(NewTemplate(), null);
        }
        catch (Exception ex) { StatusText.Text = L.Format("SaveError", ex.Message); }
        finally
        {
            _saving = false; SaveButton.IsEnabled = true;
            DeleteButton.IsEnabled = _loadedName != null && !_legacySource && !_loadedTemplate.IsPreset;
        }
    }

    public Task<bool> CanLeaveAsync() => _saving || _switching ? Task.FromResult(false) : ConfirmDiscardAsync();
    private async Task<bool> ConfirmDiscardAsync()
    {
        UpdateInlineText();
        if (!_dirty) return true;
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("RecipeDiscardTitle"), Content = L.Get("SideEditorDiscardMessage"),
            PrimaryButtonText = L.Get("RecipeDiscardButton"), CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
    }

    private async void WeekPicker_DateChanged(CalendarDatePicker sender, CalendarDatePickerDateChangedEventArgs args)
    { if (!_binding) await LoadWeekAsync(); }

    private async Task LoadWeekAsync()
    {
        var generation = ++_generation;
        var day = WeekPicker.Date?.DateTime.Date ?? DateTime.Today;
        var monday = day.AddDays(-((7 + (int)day.DayOfWeek - 1) % 7));
        try
        {
            var weekendEnabled = (await _database.GetSettingsAsync())?.WeekendPlanningEnabled ?? false;
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(weekendEnabled ? 6 : 4));
            var recipes = await _database.GetAllRecipesAsync();
            var ingredients = await _database.GetAllIngredientsAsync();
            if (generation != _generation) return;
            _monday = monday; _entries = entries; _recipes = recipes; _ingredients = ingredients; _weekendEnabled = weekendEnabled;
            for (var i = 0; i < 7; i++) { _fixedBoxes[i].Content = monday.AddDays(i).ToString("dddd"); _dayRows[i].Visibility = i < 5 || weekendEnabled ? Visibility.Visible : Visibility.Collapsed; }
            Render();
        }
        catch (Exception ex) { if (generation == _generation) StatusText.Text = L.Format("MenuLoadError", ex.Message); }
    }

    private void Numbers_Changed(NumberBox sender, NumberBoxValueChangedEventArgs args)
    {
        if (_binding) return;
        if (double.IsFinite(FontBox.Value)) _document.FontSize = FontBox.Value;
        if (double.IsFinite(MinimumFontBox.Value)) _document.MinimumFontSize = MinimumFontBox.Value;
        if (double.IsFinite(DaySpacingBox.Value)) _document.DaySpacing = DaySpacingBox.Value;
        if (double.IsFinite(MealSpacingBox.Value)) _document.MealLineSpacing = MealSpacingBox.Value;
        _dirty = true; Render();
    }

    private void DayChanged(int index)
    {
        if (_binding) return;
        _document.DayHeights[index] = _fixedBoxes[index].IsChecked == true && double.IsFinite(_dayBoxes[index].Value) ? _dayBoxes[index].Value : null;
        _dirty = true; Render();
    }

    private void Shrink_Changed(object sender, RoutedEventArgs e)
    {
        if (_binding) return;
        _document.AllowFontShrink = AllowShrinkBox.IsChecked == true;
        _dirty = true; Render();
    }

    private void HideEmptyDays_Changed(object sender, RoutedEventArgs e)
    {
        if (_binding) return;
        _document.HideEmptyDays = HideEmptyDaysBox.IsChecked == true;
        _dirty = true;
        Render();
    }

    private void FontFamily_Changed(object sender, SelectionChangedEventArgs e)
    {
        if (_binding || FontFamilyBox.SelectedItem is not string family) return;
        _document.FontFamily = family; _dirty = true; Render();
    }

    private void ImageOpacity_Changed(object sender, Microsoft.UI.Xaml.Controls.Primitives.RangeBaseValueChangedEventArgs e)
    {
        if (_binding) return;
        _document.BackgroundImageOpacity = Math.Clamp(e.NewValue / 100, 0, 1); _dirty = true; Render();
    }

    private async void ChooseImage_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var picker = new FileOpenPicker();
            picker.FileTypeFilter.Add(".png"); picker.FileTypeFilter.Add(".jpg"); picker.FileTypeFilter.Add(".jpeg");
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSingleFileAsync();
            if (file == null) return;
            if ((await file.GetBasicPropertiesAsync()).Size > 4 * 1024 * 1024) { StatusText.Text = L.Get("TplImageLimit"); return; }
            var buffer = await Windows.Storage.FileIO.ReadBufferAsync(file);
            var bytes = new byte[buffer.Length]; using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            var mime = file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg";
            _document.BackgroundImageDataUri = $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
            _dirty = true; Render();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private void ClearImage_Click(object sender, RoutedEventArgs e)
    {
        _document.BackgroundImageDataUri = null; _dirty = true; Render();
    }

    private async void AddDecoration_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var picker = new FileOpenPicker();
            picker.FileTypeFilter.Add(".png"); picker.FileTypeFilter.Add(".jpg"); picker.FileTypeFilter.Add(".jpeg");
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSingleFileAsync();
            if (file == null) return;
            if ((await file.GetBasicPropertiesAsync()).Size > 4 * 1024 * 1024) { StatusText.Text = L.Get("TplImageLimit"); return; }
            var buffer = await Windows.Storage.FileIO.ReadBufferAsync(file);
            var bytes = new byte[buffer.Length]; using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            var mime = file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg";
            var image = new TemplateV2Image { DataUri = $"data:{mime};base64,{Convert.ToBase64String(bytes)}", AltText = file.DisplayName };
            _document.DecorativeImages.Add(image);
            _dirty = true; RefreshDecorationList(image.Id); Render();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private void RefreshDecorationList(string? selectedId = null)
    {
        var wasBinding = _binding; _binding = true;
        DecorationSelector.Items.Clear();
        foreach (var item in _document.DecorativeImages)
            DecorationSelector.Items.Add(new ComboBoxItem { Tag = item.Id, Content = string.IsNullOrWhiteSpace(item.AltText) ? L.Get("TplV2Decorations") : item.AltText });
        DecorationSelector.SelectedItem = DecorationSelector.Items.OfType<ComboBoxItem>().FirstOrDefault(item => Equals(item.Tag, selectedId));
        _binding = wasBinding;
        ShowSelectedDecoration();
    }

    private TemplateV2Image? SelectedDecoration() => DecorationSelector.SelectedItem is ComboBoxItem { Tag: string id }
        ? _document.DecorativeImages.FirstOrDefault(item => item.Id == id) : null;

    private void DecorationSelector_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (!_binding) ShowSelectedDecoration(); }
    private void ShowSelectedDecoration()
    {
        var image = SelectedDecoration(); var wasBinding = _binding; _binding = true;
        foreach (var control in new Control[] { DecorationX, DecorationY, DecorationWidth, DecorationHeight, DecorationReserve, RemoveDecorationButton }) control.IsEnabled = image != null;
        if (image != null) { DecorationX.Value = image.X; DecorationY.Value = image.Y; DecorationWidth.Value = image.Width; DecorationHeight.Value = image.Height; DecorationReserve.IsChecked = image.ReserveTextSpace; }
        _binding = wasBinding;
    }
    private void Decoration_Changed(NumberBox sender, NumberBoxValueChangedEventArgs e)
    {
        if (_binding || SelectedDecoration() is not { } image || !double.IsFinite(e.NewValue)) return;
        image.X = DecorationX.Value; image.Y = DecorationY.Value; image.Width = DecorationWidth.Value; image.Height = DecorationHeight.Value;
        _dirty = true; Render();
    }
    private void DecorationReserve_Changed(object sender, RoutedEventArgs e)
    {
        if (_binding || SelectedDecoration() is not { } image) return;
        image.ReserveTextSpace = DecorationReserve.IsChecked == true; _dirty = true; Render();
    }
    private void RemoveDecoration_Click(object sender, RoutedEventArgs e)
    {
        if (SelectedDecoration() is not { } image) return;
        _document.DecorativeImages.Remove(image); _dirty = true; RefreshDecorationList(); Render();
    }
    private void Reflection_Changed(object sender, RoutedEventArgs e)
    {
        if (_binding) return;
        _document.ShowHeaderReflection = HeaderReflectionBox.IsChecked == true; _dirty = true; Render();
    }

    private void AddColorControl(string key, string label)
    {
        var button = new Button { HorizontalAlignment = HorizontalAlignment.Stretch };
        var picker = new ColorPicker { ColorSpectrumShape = ColorSpectrumShape.Ring, IsAlphaEnabled = false, IsAlphaSliderVisible = false, IsHexInputVisible = false, IsColorChannelTextInputVisible = false, Width = 230 };
        var flyout = new Flyout { Content = picker };
        button.Flyout = flyout;
        flyout.Opening += (_, _) => { _binding = true; picker.Color = ParseColor(ColorFor(key)); _binding = false; };
        picker.ColorChanged += (_, args) =>
        {
            if (_binding) return;
            var c = args.NewColor; var value = $"#{c.R:X2}{c.G:X2}{c.B:X2}";
            switch (key) { case "header": _document.HeaderColor = value; break; case "body": _document.BodyColor = value; break; case "footer": _document.FooterColor = value; break; case "allergen": _document.AllergenAccentColor = value; break; default: _document.BackgroundColor = value; break; }
            _dirty = true; UpdateColorButtons(); Render();
        };
        var row = new StackPanel { Spacing = 3 };
        row.Children.Add(new TextBlock { Text = L.Get(label) }); row.Children.Add(button);
        ColorControls.Children.Add(row); _colorButtons[key] = button;
    }

    private string ColorFor(string key) => key switch { "header" => _document.HeaderColor, "body" => _document.BodyColor, "footer" => _document.FooterColor, "allergen" => _document.AllergenAccentColor, _ => _document.BackgroundColor };
    private static Windows.UI.Color ParseColor(string? value)
    {
        if (value is { Length: 7 } && value[0] == '#' && uint.TryParse(value[1..], System.Globalization.NumberStyles.HexNumber, null, out var rgb))
            return Windows.UI.Color.FromArgb(255, (byte)(rgb >> 16), (byte)(rgb >> 8), (byte)rgb);
        return Microsoft.UI.Colors.Black;
    }
    private void UpdateColorButtons()
    {
        foreach (var (key, button) in _colorButtons)
            button.Content = new Border { Height = 18, MinWidth = 80, Background = new SolidColorBrush(ParseColor(ColorFor(key))), BorderBrush = new SolidColorBrush(Microsoft.UI.Colors.Gray), BorderThickness = new Thickness(1) };
    }

    private static string AnchorKey(string key) => key.StartsWith("ingredients:") || key.StartsWith("allergens:") ? "menu:" + key.Split(':')[1] : key;

    private static FrameworkElement? FindAnchor(DependencyObject root, string key)
    {
        if (root is FrameworkElement { Tag: string tag } element && tag == key) return element;
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(root); i++)
        {
            var found = FindAnchor(VisualTreeHelper.GetChild(root, i), key);
            if (found != null) return found;
        }
        return null;
    }

    private void Page_PointerPressed(object sender, PointerRoutedEventArgs e)
    {
        if (_selectedBlock == null) return;

        // Selectable blocks handle the press before it reaches the page. Keep their
        // new selection, and keep the tools open while interacting with the toolbar.
        var overSelectableBlock = false;
        for (var current = e.OriginalSource as DependencyObject; current != null; current = VisualTreeHelper.GetParent(current))
        {
            if (current == SelectionToolbar || current == InlineEditor) return;
            if (current is FrameworkElement { Tag: string }) overSelectableBlock = true;
            if (current == PageHost)
            {
                if (overSelectableBlock) return;
                break;
            }
        }
        DismissContextTools();
    }

    private void DismissContextTools()
    {
        StopInlineEditing();
        _selectedBlock = null;
        _selectionAnchor = null;
        SelectionToolbar.Visibility = Visibility.Collapsed;
        SelectionOutline.Visibility = Visibility.Collapsed;
        ContextTools.Children.Clear();
    }

    private void SelectCanvasBlock(string key, FrameworkElement anchor)
    {
        StopInlineEditing();
        _selectedBlock = key;
        _selectionAnchor = anchor;
        BuildContextTools();
        PositionContextTools();
        if (key is "header" or "footer")
            DispatcherQueue.TryEnqueue(() => { if (_selectedBlock == key && _selectionAnchor != null) StartInlineEditing(key); });
    }

    private void StartInlineEditing(string key)
    {
        _editingBlock = key;
        InlineEditor.Text = key == "header" ? _document.HeaderText ?? "" : _document.FooterText ?? "";
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(InlineEditor, L.Get(key == "header" ? "TplHeader" : "TplFooter"));
        InlineEditor.Visibility = Visibility.Visible;
        PositionContextTools();
        InlineEditor.Focus(FocusState.Programmatic);
    }

    private void InlineEditor_TextChanged(object sender, TextChangedEventArgs e) => UpdateInlineText();

    private void UpdateInlineText()
    {
        if (_editingBlock == "header" && _document.HeaderText != InlineEditor.Text) _document.HeaderText = InlineEditor.Text;
        else if (_editingBlock == "footer" && _document.FooterText != InlineEditor.Text) _document.FooterText = InlineEditor.Text;
        else return;
        _dirty = true;
        _inlineTextChanged = true;
    }

    private void RefreshInlineText()
    {
        UpdateInlineText();
        if (!_inlineTextChanged) return;
        _inlineTextChanged = false;
        // Let the pointer event finish before replacing the rendered page.
        DispatcherQueue.TryEnqueue(() => Render());
    }

    private void StopInlineEditing()
    {
        UpdateInlineText();
        if (_selectionAnchor != null && _editingBlock != null) _selectionAnchor.Opacity = 1;
        _editingBlock = null;
        InlineEditor.Visibility = Visibility.Collapsed;
        RefreshInlineText();
    }

    private void PositionContextTools()
    {
        if (_selectedBlock == null || _selectionAnchor == null || SelectionOverlay.ActualWidth <= 0) return;
        try
        {
            SelectionOverlay.Clip = new RectangleGeometry { Rect = new Rect(0, 0, SelectionOverlay.ActualWidth, SelectionOverlay.ActualHeight) };
            var origin = _selectionAnchor.TransformToVisual(SelectionOverlay).TransformPoint(new Point(0, 0));
            var zoom = PageScroll.ZoomFactor;
            SelectionOutline.Width = Math.Max(0, _selectionAnchor.ActualWidth * zoom);
            SelectionOutline.Height = Math.Max(0, _selectionAnchor.ActualHeight * zoom);
            Canvas.SetLeft(SelectionOutline, origin.X); Canvas.SetTop(SelectionOutline, origin.Y);
            SelectionOutline.Visibility = Visibility.Visible;
            if (_editingBlock == _selectedBlock)
            {
                _selectionAnchor.Opacity = 0;
                var style = TemplateV2Renderer.GetTextStyle(_document, _selectedBlock);
                InlineEditor.Width = SelectionOutline.Width; InlineEditor.Height = SelectionOutline.Height;
                Canvas.SetLeft(InlineEditor, origin.X); Canvas.SetTop(InlineEditor, origin.Y);
                InlineEditor.FontFamily = new FontFamily(string.IsNullOrWhiteSpace(style.FontFamily) ? "Arial" : style.FontFamily);
                InlineEditor.FontSize = Math.Clamp(double.IsFinite(style.FontSize) ? style.FontSize * zoom : 14 * zoom, 6, 144);
                InlineEditor.FontWeight = style.Bold ? Microsoft.UI.Text.FontWeights.Bold : Microsoft.UI.Text.FontWeights.Normal;
                InlineEditor.FontStyle = style.Italic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal;
                InlineEditor.Foreground = new SolidColorBrush(ParseColor(style.Color));
                InlineEditor.TextAlignment = style.Alignment switch { "center" => TextAlignment.Center, "right" => TextAlignment.Right, _ => TextAlignment.Left };
                InlineEditor.VerticalContentAlignment = _editingBlock == "footer" ? VerticalAlignment.Bottom : VerticalAlignment.Top;
            }
            SelectionToolbar.MaxWidth = Math.Max(100, SelectionOverlay.ActualWidth - 12);
            SelectionToolbar.Measure(new Size(SelectionToolbar.MaxWidth, double.PositiveInfinity));
            var width = Math.Min(SelectionToolbar.DesiredSize.Width, SelectionToolbar.MaxWidth);
            var height = SelectionToolbar.DesiredSize.Height;
            var below = origin.Y + _selectionAnchor.ActualHeight * zoom + 6;
            var above = origin.Y - height - 6;
            var top = below + height <= SelectionOverlay.ActualHeight ? below : above >= 0 ? above : Math.Max(0, SelectionOverlay.ActualHeight - height);
            Canvas.SetLeft(SelectionToolbar, Math.Clamp(origin.X, 0, Math.Max(0, SelectionOverlay.ActualWidth - width)));
            Canvas.SetTop(SelectionToolbar, Math.Max(0, top));
            SelectionToolbar.Visibility = Visibility.Visible;
        }
        catch (ArgumentException) { SelectionToolbar.Visibility = SelectionOutline.Visibility = Visibility.Collapsed; }
    }

    private void BuildContextTools()
    {
        if (_selectedBlock == null) return;
        var key = _selectedBlock;
        _contextBinding = true;
        ContextTools.Children.Clear();
        var close = new Button { Content = "✕", Padding = new Thickness(5) };
        ToolTipService.SetToolTip(close, L.Get("Text_Cancel_77dfd2"));
        close.Click += (_, _) => DismissContextTools();
        ContextTools.Children.Add(close);

        var parts = key.Split(':');
        var sectionName = parts[0] switch
        {
            "header" => L.Get("TplHeader"), "date" => L.Get("TplSelectionDate"), "footer" => L.Get("TplFooter"), "notice" => L.Get("TplV2Notice"),
            "heading" => L.Get("TplDayHeading"), "menu" => L.Get("TplMenuNames"),
            "ingredients" => L.Get("TplIngredientText"), "allergens" => L.Get("TplAllergenText"),
            "day" => L.Get("TplDayHeading"), _ => L.Get("TplSelectedElement")
        };
        if (parts.Length == 2 && int.TryParse(parts[1], out var dayIndex) && dayIndex is >= 0 and < 7)
            sectionName = $"{_monday.AddDays(dayIndex):dddd} › {sectionName}";
        ContextTools.Children.Add(new TextBlock { Text = sectionName, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(4, 0, 4, 0) });
        if (parts.Length == 2 && parts[0] is "menu" or "ingredients" or "allergens")
        {
            var section = new ComboBox { Width = 120 };
            section.Items.Add(L.Get("TplMenuNames")); section.Items.Add(L.Get("TplIngredientText")); section.Items.Add(L.Get("TplAllergenText"));
            section.SelectedIndex = parts[0] == "menu" ? 0 : parts[0] == "ingredients" ? 1 : 2;
            section.SelectionChanged += (_, _) =>
            {
                if (_contextBinding || section.SelectedIndex < 0 || _selectionAnchor == null) return;
                _selectedBlock = new[] { "menu", "ingredients", "allergens" }[section.SelectedIndex] + ":" + parts[1];
                BuildContextTools(); PositionContextTools();
            };
            ContextTools.Children.Add(section);
        }

        if (key.StartsWith("day:", StringComparison.Ordinal))
        {
            _document.BlockAppearances ??= new();
            _document.BlockAppearances.TryGetValue(key, out var appearance);
            if (appearance == null) _document.BlockAppearances.TryGetValue("day", out appearance);
            appearance ??= new TemplateBlockAppearance { BorderThickness = 1, Padding = 8 };
            AddContextColor("TplAppearanceBackground", appearance.BackgroundColor ?? "#FFFFFF", value => EditAppearance(key, a => a.BackgroundColor = value));
            AddContextColor("TplAppearanceBorder", appearance.BorderColor ?? "#000000", value => EditAppearance(key, a => { a.BorderColor = value; if (a.BorderThickness <= 0) a.BorderThickness = 1; }));
            var padding = new NumberBox { Width = 80, Minimum = 0, Maximum = 25, Value = appearance.Padding, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
            ToolTipService.SetToolTip(padding, L.Get("TplAppearancePadding"));
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(padding, L.Get("TplAppearancePadding"));
            padding.ValueChanged += (_, _) => { if (!_contextBinding && double.IsFinite(padding.Value)) EditAppearance(key, a => a.Padding = padding.Value); };
            ContextTools.Children.Add(padding);
            var allDays = new Button { Content = new FontIcon { Glyph = "\uE8C8" } };
            ToolTipService.SetToolTip(allDays, L.Get("TplApplyWeekdayStyle"));
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(allDays, L.Get("TplApplyWeekdayStyle"));
            allDays.Click += (_, _) =>
            {
                var current = _document.BlockAppearances.TryGetValue(key, out var saved) && saved != null ? saved : appearance;
                for (var day = 0; day < (_weekendEnabled ? 7 : 5); day++) _document.BlockAppearances[$"day:{day}"] = new TemplateBlockAppearance { BackgroundColor = current.BackgroundColor, BorderColor = current.BorderColor, BorderThickness = current.BorderThickness, CornerRadius = current.CornerRadius, Padding = current.Padding, Opacity = current.Opacity };
                _dirty = true; Render();
            };
            ContextTools.Children.Add(allDays);
        }
        else
        {
            var style = TemplateV2Renderer.GetTextStyle(_document, key);
            var font = new ComboBox { Width = 115, ItemsSource = Fonts, SelectedItem = style.FontFamily };
            ToolTipService.SetToolTip(font, L.Get("TplFont"));
            font.SelectionChanged += (_, _) => { if (!_contextBinding && font.SelectedItem is string family) EditTextStyle(key, s => s.FontFamily = family); };
            ContextTools.Children.Add(font);
            var size = new NumberBox { Width = 70, Minimum = 7, Maximum = 48, Value = style.FontSize, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
            ToolTipService.SetToolTip(size, L.Get("TplSelectedSize"));
            Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(size, L.Get("TplSelectedSize"));
            size.ValueChanged += (_, _) => { if (!_contextBinding && double.IsFinite(size.Value)) EditTextStyle(key, s => s.FontSize = size.Value); };
            ContextTools.Children.Add(size);
            AddContextColor("TplSelectedColor", style.Color, value => EditTextStyle(key, s => s.Color = value));
            AddStyleToggle("B", "TplBold", style.Bold, value => EditTextStyle(key, s => s.Bold = value));
            AddStyleToggle("I", "TplItalic", style.Italic, value => EditTextStyle(key, s => s.Italic = value));
            AddStyleToggle("U", "TplUnderline", style.Underline, value => EditTextStyle(key, s => s.Underline = value));
            if (parts[0] is not ("ingredients" or "allergens"))
            {
            var alignment = new ComboBox { Width = 76, Padding = new Thickness(8, 4, 8, 4) };
            foreach (var (glyph, tip) in new[] { ("\uE8E4", "TplLeft"), ("\uE8E3", "TplCenter"), ("\uE8E2", "TplRight") })
            {
                var item = new ComboBoxItem { Content = new FontIcon { Glyph = glyph, FontSize = 16 } };
                ToolTipService.SetToolTip(item, L.Get(tip)); alignment.Items.Add(item);
            }
            var alignments = new[] { "left", "center", "right" };
            alignment.SelectedIndex = Math.Max(0, Array.IndexOf(alignments, style.Alignment ?? "left"));
            alignment.SelectionChanged += (_, _) => { if (!_contextBinding && alignment.SelectedIndex >= 0) EditTextStyle(key, s => s.Alignment = alignments[alignment.SelectedIndex]); };
            ToolTipService.SetToolTip(alignment, L.Get("TplHeaderAlignment"));
            ContextTools.Children.Add(alignment);
            }
            if (parts.Length == 2 && parts[0] is "heading" or "menu" or "ingredients" or "allergens")
            {
                var all = new Button { Content = new FontIcon { Glyph = "\uE8C8" } };
                ToolTipService.SetToolTip(all, L.Get("TplApplyWeekdayStyle"));
                Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(all, L.Get("TplApplyWeekdayStyle"));
                all.Click += (_, _) =>
                {
                    var current = TemplateV2Renderer.GetTextStyle(_document, key);
                    _document.TextStyles ??= new();
                    for (var day = 0; day < (_weekendEnabled ? 7 : 5); day++) _document.TextStyles[$"{parts[0]}:{day}"] = CopyStyle(current);
                    _dirty = true; Render();
                };
                ContextTools.Children.Add(all);
            }
        }
        _contextBinding = false;
    }

    private static TemplateTextStyle CopyStyle(TemplateTextStyle s) => new() { FontFamily = s.FontFamily, FontSize = s.FontSize, Color = s.Color, Bold = s.Bold, Italic = s.Italic, Underline = s.Underline, Alignment = s.Alignment };

    private void EditTextStyle(string key, Action<TemplateTextStyle> change)
    {
        var style = TemplateV2Renderer.GetTextStyle(_document, key);
        change(style);
        _document.TextStyles ??= new();
        _document.TextStyles[key] = style;
        _dirty = true;
        Render();
    }

    private void EditAppearance(string key, Action<TemplateBlockAppearance> change)
    {
        _document.BlockAppearances ??= new();
        if (!_document.BlockAppearances.TryGetValue(key, out var appearance) || appearance == null)
        {
            _document.BlockAppearances.TryGetValue("day", out var shared);
            _document.BlockAppearances[key] = appearance = shared == null
                ? new TemplateBlockAppearance { BorderThickness = 1, Padding = 8 }
                : new TemplateBlockAppearance { BackgroundColor = shared.BackgroundColor, BorderColor = shared.BorderColor, BorderThickness = shared.BorderThickness, CornerRadius = shared.CornerRadius, Padding = shared.Padding, Opacity = shared.Opacity };
        }
        change(appearance);
        _dirty = true;
        Render();
    }

    private void AddStyleToggle(string text, string label, bool initial, Action<bool> change)
    {
        var button = new ToggleButton { Content = text, IsChecked = initial, MinWidth = 32, Padding = new Thickness(6, 4, 6, 4) };
        ToolTipService.SetToolTip(button, L.Get(label));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(button, L.Get(label));
        button.Checked += (_, _) => { if (!_contextBinding) change(true); };
        button.Unchecked += (_, _) => { if (!_contextBinding) change(false); };
        ContextTools.Children.Add(button);
    }

    private void AddContextColor(string label, string initial, Action<string> change)
    {
        var swatch = new Border { Width = 18, Height = 18, Background = new SolidColorBrush(ParseColor(initial)), BorderBrush = new SolidColorBrush(Microsoft.UI.Colors.Gray), BorderThickness = new Thickness(1) };
        var button = new Button { Content = swatch, Padding = new Thickness(5), MinWidth = 32 };
        ToolTipService.SetToolTip(button, L.Get(label));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(button, L.Get(label));
        var picker = new ColorPicker { Color = ParseColor(initial), ColorSpectrumShape = ColorSpectrumShape.Ring, IsAlphaEnabled = false, IsHexInputVisible = false, IsColorChannelTextInputVisible = false, Width = 230 };
        picker.ColorChanged += (_, args) =>
        {
            var color = args.NewColor;
            swatch.Background = new SolidColorBrush(color);
            change($"#{color.R:X2}{color.G:X2}{color.B:X2}");
        };
        button.Flyout = new Flyout { Content = picker };
        ContextTools.Children.Add(button);
    }

    private async void Render()
    {
        if (_binding || _monday == default) return;
        var generation = ++_renderGeneration;
        try
        {
            var result = TemplateV2Renderer.Create(_document, _monday, _entries, _recipes, _ingredients, SelectCanvasBlock, _weekendEnabled);
            result.Page.Loaded += (_, _) =>
            {
                if (generation != _renderGeneration || _selectedBlock == null) return;
                _selectionAnchor = FindAnchor(result.Page, AnchorKey(_selectedBlock));
                PositionContextTools();
            };
            PageHost.Content = result.Page;
            if (_selectedBlock != null)
                DispatcherQueue.TryEnqueue(() => { if (generation != _renderGeneration || _selectedBlock == null) return; _selectionAnchor = FindAnchor(result.Page, AnchorKey(_selectedBlock)); PositionContextTools(); });
            StatusText.Text = L.Get("OutputPreparing");
            await result.ImagesReady;
            if (generation == _renderGeneration) StatusText.Text = L.Get(!result.HasMeals ? "TplV2NoMeals" : result.Overflowed ? "TplV2Overflow" : "TplV2BuilderHint");
        }
        catch (Exception ex) { if (generation == _renderGeneration) StatusText.Text = L.Format("TplError", ex.Message); }
    }
}

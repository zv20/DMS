using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
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
    private readonly List<MenuTemplate> _templates = [];
    private TemplateV2Document _document = new();
    private string? _loadedName;
    private bool _binding = true, _dirty, _saving, _switching;
    private int _generation;
    private int _renderGeneration;
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
        WeekPicker.Header = L.Get("TplPreview"); NameBox.Header = L.Get("TplName");
        HeaderBox.Header = L.Get("TplHeader"); FooterBox.Header = L.Get("TplFooter");
        FooterHint.Text = L.Get("TplV2FooterHint"); DayHint.Text = L.Get("TplV2DayHint");
        FontBox.Header = L.Get("TplV2FontSize"); MinimumFontBox.Header = L.Get("TplV2MinimumFont");
        AllowShrinkBox.Content = L.Get("TplV2AllowShrink");
        HideEmptyDaysBox.Content = L.Get("TplV2HideEmptyDays");
        FontFamilyBox.Header = L.Get("TplFont"); foreach (var family in Fonts) FontFamilyBox.Items.Add(family);
        ChooseImageButton.Content = L.Get("TplV2BackgroundImage"); ClearImageButton.Content = L.Get("TplV2ClearBackground");
        ImageOpacitySlider.Header = L.Get("TplV2ImageOpacity");
        foreach (var (key, label) in new[] { ("header", "TplV2HeaderColor"), ("body", "TplV2BodyColor"), ("footer", "TplV2FooterColor"), ("background", "TplV2BackgroundColor") })
            AddColorControl(key, label);
        WeekPicker.Date = DateTimeOffset.Now;
        var monday = DateTime.Today.AddDays(-((7 + (int)DateTime.Today.DayOfWeek - 1) % 7));
        for (var i = 0; i < 5; i++)
        {
            var day = i;
            var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 6 };
            var fixedBox = new CheckBox { Content = monday.AddDays(i).ToString("dddd"), MinWidth = 110 };
            var height = new NumberBox { Minimum = 40, Maximum = 500, Width = 105, Value = 160, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact, IsEnabled = false };
            fixedBox.Checked += (_, _) => { height.IsEnabled = true; DayChanged(day); };
            fixedBox.Unchecked += (_, _) => { height.IsEnabled = false; DayChanged(day); };
            height.ValueChanged += (_, _) => DayChanged(day);
            _fixedBoxes.Add(fixedBox); _dayBoxes.Add(height); row.Children.Add(fixedBox); row.Children.Add(height); DayControls.Children.Add(row);
        }
        Loaded += async (_, _) => await InitializeAsync();
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
        _templates.Clear(); _templates.AddRange(all.Where(t => t.V2 != null));
        _binding = true; TemplateSelector.ItemsSource = null; TemplateSelector.ItemsSource = _templates; _binding = false;
    }

    private void SetDocument(MenuTemplate template, string? name)
    {
        _binding = true;
        _document = JsonSerializer.Deserialize<TemplateV2Document>(JsonSerializer.Serialize(template.V2 ?? new TemplateV2Document())) ?? new();
        var heights = new double?[5];
        if (_document.DayHeights != null) Array.Copy(_document.DayHeights, heights, Math.Min(5, _document.DayHeights.Length));
        _document.DayHeights = heights;
        _loadedName = name; NameBox.Text = template.Name; HeaderBox.Text = _document.HeaderText; FooterBox.Text = _document.FooterText;
        FontBox.Value = _document.FontSize; MinimumFontBox.Value = _document.MinimumFontSize;
        AllowShrinkBox.IsChecked = _document.AllowFontShrink;
        HideEmptyDaysBox.IsChecked = _document.HideEmptyDays;
        FontFamilyBox.SelectedItem = Fonts.Contains(_document.FontFamily, StringComparer.OrdinalIgnoreCase) ? _document.FontFamily : Fonts[0];
        ImageOpacitySlider.Value = Math.Clamp(_document.BackgroundImageOpacity * 100, 0, 100);
        UpdateColorButtons();
        for (var i = 0; i < 5; i++)
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
            SetDocument(chosen, chosen.Name);
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
        if (_saving) return;
        var name = NameBox.Text.Trim();
        if (name.Length == 0) { StatusText.Text = L.Get("TplV2NameRequired"); return; }
        if (FooterBox.Text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n').Length > 3)
        { StatusText.Text = L.Get("TplV2FooterLimit"); return; }
        if (!double.IsFinite(FontBox.Value) || !double.IsFinite(MinimumFontBox.Value) || MinimumFontBox.Value > FontBox.Value)
        { StatusText.Text = L.Get("TplV2FontInvalid"); return; }
        _saving = true; SaveButton.IsEnabled = false;
        try
        {
            var all = await _database.GetAllTemplatesAsync();
            if (all.Any(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase) && !string.Equals(t.Name, _loadedName, StringComparison.Ordinal)))
            { StatusText.Text = L.Get("TplV2NameExists"); return; }
            await _database.SaveTemplateAsync(new MenuTemplate { Name = name, V2 = _document });
            _loadedName = name; _dirty = false;
            await ReloadTemplatesAsync();
            _binding = true; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == name); _binding = false;
            StatusText.Text = L.Get("Text_Saved_499dc6");
        }
        catch (Exception ex) { StatusText.Text = L.Format("SaveError", ex.Message); }
        finally { _saving = false; SaveButton.IsEnabled = true; }
    }

    public Task<bool> CanLeaveAsync() => _saving || _switching ? Task.FromResult(false) : ConfirmDiscardAsync();
    private async Task<bool> ConfirmDiscardAsync()
    {
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
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(4));
            var recipes = await _database.GetAllRecipesAsync();
            var ingredients = await _database.GetAllIngredientsAsync();
            if (generation != _generation) return;
            _monday = monday; _entries = entries; _recipes = recipes; _ingredients = ingredients;
            for (var i = 0; i < 5; i++) _fixedBoxes[i].Content = monday.AddDays(i).ToString("dddd");
            Render();
        }
        catch (Exception ex) { if (generation == _generation) StatusText.Text = L.Format("MenuLoadError", ex.Message); }
    }

    private void Fields_Changed(object sender, TextChangedEventArgs e)
    {
        if (_binding) return;
        _document.HeaderText = HeaderBox.Text; _document.FooterText = FooterBox.Text;
        _dirty = true; Render();
    }

    private void Numbers_Changed(NumberBox sender, NumberBoxValueChangedEventArgs args)
    {
        if (_binding) return;
        if (double.IsFinite(FontBox.Value)) _document.FontSize = FontBox.Value;
        if (double.IsFinite(MinimumFontBox.Value)) _document.MinimumFontSize = MinimumFontBox.Value;
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
            switch (key) { case "header": _document.HeaderColor = value; break; case "body": _document.BodyColor = value; break; case "footer": _document.FooterColor = value; break; default: _document.BackgroundColor = value; break; }
            _dirty = true; UpdateColorButtons(); Render();
        };
        var row = new StackPanel { Spacing = 3 };
        row.Children.Add(new TextBlock { Text = L.Get(label) }); row.Children.Add(button);
        ColorControls.Children.Add(row); _colorButtons[key] = button;
    }

    private string ColorFor(string key) => key switch { "header" => _document.HeaderColor, "body" => _document.BodyColor, "footer" => _document.FooterColor, _ => _document.BackgroundColor };
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

    private async void Render()
    {
        if (_binding || _monday == default) return;
        var generation = ++_renderGeneration;
        try
        {
            var result = TemplateV2Renderer.Create(_document, _monday, _entries, _recipes, _ingredients);
            PageHost.Content = result.Page;
            StatusText.Text = L.Get("OutputPreparing");
            await result.ImagesReady;
            if (generation == _renderGeneration) StatusText.Text = L.Get(!result.HasMeals ? "TplV2NoMeals" : result.Overflowed ? "TplV2Overflow" : "TplV2BuilderHint");
        }
        catch (Exception ex) { if (generation == _renderGeneration) StatusText.Text = L.Format("TplError", ex.Message); }
    }
}

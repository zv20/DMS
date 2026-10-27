using Microsoft.Extensions.DependencyInjection;
using Microsoft.UI;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using DMS.Models;
using DMS.Services;
using System.Text.Json;
using System.Text.RegularExpressions;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using L = DMS.Services.Localization;

namespace DMS.Views;

public sealed partial class TemplateBuilderPage : Page
{
    private readonly IDatabaseService _database;
    private MenuTemplate _template = new();
    private List<MenuTemplate> _templates = [];
    private List<Recipe> _recipes = [];
    private List<MenuEntry> _entries = [];
    private string? _loadedName;
    private bool _binding = true;
    private int _previewGeneration;
    private string? _previewImageRequest;
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
        NewButton.Content = L.Get("TplNew"); SaveButton.Content = L.Get("TplSave"); DeleteButton.Content = L.Get("TplDelete");
        TemplateSelector.PlaceholderText = L.Get("TplSelect"); NameBox.Header = L.Get("TplName");
        HeaderBox.Header = L.Get("TplHeader"); FooterBox.Header = L.Get("TplFooter");
        FontBox.Header = L.Get("TplFont"); LayoutBox.Header = L.Get("TplLayout");
        HeaderSizeBox.Header = L.Get("TplHeaderSize"); MealSizeBox.Header = L.Get("TplMealSize"); FooterSizeBox.Header = L.Get("TplFooterSize");
        HeaderColorBox.Header = L.Get("TplHeaderColor"); BackgroundColorBox.Header = L.Get("TplBackgroundColor");
        ImageButton.Content = L.Get("TplImage"); ClearImageButton.Content = L.Get("TplImageClear"); ImageOpacitySlider.Header = L.Get("TplOpacity");
        ShowHeaderBox.Content = L.Get("TplShowHeader"); ShowDateBox.Content = L.Get("TplShowDate");
        ShowIngredientsBox.Content = L.Get("TplShowIngredients"); ShowCaloriesBox.Content = L.Get("TplShowCalories");
        ShowPortionsBox.Content = L.Get("TplShowPortions"); ShowFooterBox.Content = L.Get("TplShowFooter");
        PreviewLabel.Text = L.Get("TplPreview"); LegacyNote.Text = L.Get("TplLegacy");
        foreach (var alignment in new[] { "TplLeft", "TplCenter", "TplRight" }) { HeaderAlignmentBox.Items.Add(L.Get(alignment)); FooterAlignmentBox.Items.Add(L.Get(alignment)); }
        foreach (var layout in new[] { "TplCompact", "TplDetailed", "TplTwoColumns" }) LayoutBox.Items.Add(L.Get(layout));
        foreach (var font in Fonts) FontBox.Items.Add(font);
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

    private async Task LoadAsync()
    {
        try
        {
            _templates = await _database.GetAllTemplatesAsync();
            _recipes = await _database.GetAllRecipesAsync();
            TemplateSelector.ItemsSource = _templates;
            SetTemplate(new MenuTemplate(), null);
            await LoadWeekAsync();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private void SetTemplate(MenuTemplate template, string? originalName)
    {
        _binding = true;
        _template = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template)) ?? new MenuTemplate();
        _loadedName = originalName;
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
        UpdatePreview();
    }

    private void OnEdited()
    {
        if (_binding) return;
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
        PreviewBorder.Background = new SolidColorBrush(ParseColor(_template.BackgroundColor, Colors.White));
        PreviewImage.Opacity = _template.BackgroundImageOpacity;
        if (_previewImageRequest != _template.BackgroundImageDataUri)
        {
            _previewImageRequest = _template.BackgroundImageDataUri;
            _ = UpdateImageAsync(_previewImageRequest);
        }
        PreviewPanel.Children.Clear();
        var font = new FontFamily(_template.FontFamily);
        if (_template.ShowHeader)
        {
            PreviewPanel.Children.Add(new TextBlock { Text = _template.HeaderText, FontFamily = font, FontSize = _template.HeaderFontSize,
                FontWeight = _template.HeaderBold ? FontWeights.Bold : FontWeights.Normal,
                FontStyle = _template.HeaderItalic ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal,
                TextDecorations = _template.HeaderUnderline ? Windows.UI.Text.TextDecorations.Underline : Windows.UI.Text.TextDecorations.None,
                Foreground = new SolidColorBrush(ParseColor(_template.HeaderColor, Colors.Black)), TextWrapping = TextWrapping.Wrap,
                TextAlignment = TextAlignmentFor(_template.HeaderAlignment) });
        }
        var date = PreviewDate.Date?.DateTime.Date ?? DateTime.Today;
        var monday = date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));
        if (_template.ShowDateRange) PreviewPanel.Children.Add(new TextBlock { Text = $"{monday:d} – {monday.AddDays(4):d}", TextAlignment = TextAlignment.Center, Foreground = new SolidColorBrush(Colors.Black) });
        var days = new Grid { ColumnSpacing = 12, RowSpacing = 12 };
        var columns = _template.TemplateStyle == "detailed-2col" ? 2 : 1;
        for (var column = 0; column < columns; column++) days.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        for (var row = 0; row < (5 + columns - 1) / columns; row++) days.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < 5; i++)
        {
            var day = monday.AddDays(i);
            var dayPanel = new StackPanel { Spacing = 3 };
            dayPanel.Children.Add(new TextBlock { Text = day.ToString("dddd, d MMMM"), FontFamily = font, FontWeight = FontWeights.SemiBold, Foreground = new SolidColorBrush(Colors.Black) });
            foreach (var entry in _entries.Where(e => e.Date.Date == day).OrderBy(e => e.Slot))
            {
                var recipe = _recipes.FirstOrDefault(r => r.Id == entry.RecipeId);
                if (recipe == null) continue;
                var text = recipe.Name;
                if (_template.ShowPortions && !string.IsNullOrWhiteSpace(recipe.PortionSize)) text += $" ({recipe.PortionSize})";
                if (_template.ShowCalories && recipe.Calories > 0) text += $" · {recipe.Calories} kcal";
                if (_template.ShowIngredients && recipe.Ingredients.Count > 0) text += (_template.TemplateStyle == "compact" ? " · " : "\n") + string.Join(", ", recipe.Ingredients);
                dayPanel.Children.Add(new TextBlock { Text = text, FontSize = _template.MealFontSize, FontFamily = font, Foreground = new SolidColorBrush(Colors.Black), TextWrapping = TextWrapping.Wrap });
            }
            Grid.SetColumn(dayPanel, i % columns); Grid.SetRow(dayPanel, i / columns); days.Children.Add(dayPanel);
        }
        PreviewPanel.Children.Add(days);
        if (_entries.Count == 0) PreviewPanel.Children.Add(new TextBlock { Text = L.Get("TplNoMeals"), Foreground = new SolidColorBrush(Colors.Gray) });
        if (_template.ShowFooter) PreviewPanel.Children.Add(new TextBlock { Text = _template.FooterText, FontFamily = font, FontSize = _template.FooterFontSize, Foreground = new SolidColorBrush(Colors.Black), TextWrapping = TextWrapping.Wrap, TextAlignment = TextAlignmentFor(_template.FooterAlignment) });
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

    private void New_Click(object sender, RoutedEventArgs e) { TemplateSelector.SelectedItem = null; SetTemplate(new MenuTemplate { HeaderText = L.Get("Text_Weekly_Menu_69fa95"), FooterText = L.Get("Text_Prepared_with_care_by_DMS_082a78") }, null); }
    private void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (!_binding && TemplateSelector.SelectedItem is MenuTemplate template) SetTemplate(template, template.Name); }

    private async void Save_Click(object sender, RoutedEventArgs e)
    {
        ReadFields();
        if (string.IsNullOrWhiteSpace(_template.Name)) { StatusText.Text = L.Get("Text_Template_name_is_required_0e3ca2"); return; }
        if (!IsColor(HeaderColorBox.Text) || !IsColor(BackgroundColorBox.Text)) { StatusText.Text = L.Get("TplInvalidColor"); return; }
        if (_templates.Any(t => string.Equals(t.Name, _template.Name, StringComparison.OrdinalIgnoreCase) && !string.Equals(t.Name, _loadedName, StringComparison.OrdinalIgnoreCase))) { StatusText.Text = L.Get("TplDuplicate"); return; }
        if (_template.IsPreset && string.Equals(_loadedName, _template.Name, StringComparison.OrdinalIgnoreCase)) { StatusText.Text = L.Get("TplPresetSave"); return; }
        try
        {
            if (!string.Equals(_loadedName, _template.Name, StringComparison.OrdinalIgnoreCase)) _template.IsPreset = false;
            await _database.SaveTemplateAsync(_template);
            _loadedName = _template.Name;
            _templates = await _database.GetAllTemplatesAsync();
            _binding = true; TemplateSelector.ItemsSource = _templates; TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _loadedName); _binding = false;
            StatusText.Text = L.Get("TplSaved");
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }

    private async void Delete_Click(object sender, RoutedEventArgs e)
    {
        if (_loadedName == null) return;
        if (_template.IsPreset) { StatusText.Text = L.Get("Text_Preset_templates_cannot_be_deleted_0a9c55"); return; }
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("Text_Delete_Template_c07327"), Content = L.Get("TplDeletePrompt"), PrimaryButtonText = L.Get("Text_Delete_f6fdbe"), CloseButtonText = L.Get("Text_Cancel_77dfd2") };
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
            _template.BackgroundImageDataUri = $"data:{(file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg")};base64,{Convert.ToBase64String(bytes)}";
            UpdatePreview();
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
    }
    private void ClearImage_Click(object sender, RoutedEventArgs e) { _template.BackgroundImageDataUri = null; UpdatePreview(); }
}

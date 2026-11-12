using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Windows.UI;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class AllergensPage : Page, IUnsavedEditor
{
    private readonly DatabaseService _database;
    private int _pageGeneration;
    private ObservableCollection<AllergenItemViewModel> _allergens = new();
    private List<AllergenItemViewModel> _filteredAllergens = new();
    private readonly SideEditorController _editor;

    public AllergensPage()
    {
        this.InitializeComponent();
        ResponsiveToolbar.Attach(ListToolbar, SearchBox);
        _database = App.Services.GetRequiredService<DatabaseService>();
        _editor = new SideEditorController(this, EditorColumn, EditorPanel, EditorTitle, EditorStatus, EditorContent, EditorSaveButton, EditorCancelButton, EditorCloseButton);
        Loaded += AllergensPage_Loaded;
    }

    private async void AllergensPage_Loaded(object sender, RoutedEventArgs e)
    {
        AllergensListView.ItemsSource = _filteredAllergens;
        try { await LoadAllergensAsync(); }
        catch (Exception ex) { App.Logger.LogError(ex, "Failed to load allergens"); SetPageStatus("DataLoadFailed"); }
    }

    protected override void OnNavigatedFrom(NavigationEventArgs e)
    {
        // Detach realized rows and their event handlers before leaving the page.
        _pageGeneration++;
        _editor.Close();
        AllergensListView.ItemsSource = null;
        _filteredAllergens.Clear();
        _allergens.Clear();
        base.OnNavigatedFrom(e);
    }

    private void SetPageStatus(string? key)
    {
        PageStatus.Text = key == null ? "" : L.Get(key);
        PageStatus.Visibility = key == null ? Visibility.Collapsed : Visibility.Visible;
    }

    private async Task LoadAllergensAsync()
    {
        var generation = _pageGeneration;
        var allergens = await _database.GetAllAllergensAsync();
        if (generation != _pageGeneration) return;
        _allergens.Clear();
        foreach (var allergen in allergens)
        {
            _allergens.Add(new AllergenItemViewModel(allergen));
        }
        ApplyFilter();
        SetPageStatus(null);
    }

    private void ApplyFilter()
    {
        var query = SearchBox.Text ?? "";
        _filteredAllergens = _allergens.Where(allergen => query.Length == 0 ||
            allergen.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            allergen.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase)).ToList();
        AllergensListView.ItemsSource = _filteredAllergens;
        var hasItems = _allergens.Count > 0;
        EmptyStateTitle.Text = L.Get(hasItems ? "AllergenNoMatches" : "String_Text_No_allergens_yet_6f883b");
        EmptyStateHint.Visibility = hasItems ? Visibility.Collapsed : Visibility.Visible;
        ClearSearchButton.Visibility = hasItems && _filteredAllergens.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        EmptyStatePanel.Visibility = _filteredAllergens.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        AllergensListView.Visibility = _filteredAllergens.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
    }

    private void ClearSearch_Click(object sender, RoutedEventArgs e) => SearchBox.Text = "";

    private void TryApplyFilter()
    {
        try { ApplyFilter(); }
        catch (Exception ex) { App.Logger.LogError(ex, "Failed to filter list on {Page}", GetType().Name); SetPageStatus("DataFilterFailed"); }
    }

    private void SearchBox_TextChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        TryApplyFilter();
    }

    private async void AddAllergenButton_Click(object sender, RoutedEventArgs e)
    {
        await _editor.OpenAsync(() => ShowAllergenEditorAsync(null));
    }

    private async void AllergensListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is AllergenItemViewModel allergen)
        {
            await _editor.OpenAsync(() => ShowAllergenEditorAsync(allergen));
        }
    }

    private async void EditAllergenButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var allergen = _allergens.FirstOrDefault(r => r.Id == id);
            if (allergen != null) await _editor.OpenAsync(() => ShowAllergenEditorAsync(allergen));
        }
    }

    private async void DeleteAllergenButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button { Tag: int id } button || !button.IsEnabled) return;
        button.IsEnabled = false;
        try
        {
            var dialog = new ContentDialog { Title = L.Get("Text_Delete_Allergen_7b0000"), Content = L.Get("Text_Are_you_sure_you_want_to_delete_this_allergen_d1608f"),
                PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"), CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close, XamlRoot = XamlRoot };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            if (_editor.EditingId == id && !await _editor.CanLeaveAsync()) return;
            try { await _database.DeleteAllergenAsync(id); }
            catch (Exception ex) { App.Logger.LogError(ex, "Failed to delete allergen {Id}", id); SetPageStatus("DataDeleteFailed"); return; }
            if (_editor.EditingId == id) _editor.Close();
            try { await LoadAllergensAsync(); }
            catch (Exception ex) { App.Logger.LogError(ex, "Deleted allergen {Id} but refresh failed", id); SetPageStatus("DataDeletedRefreshFailed"); }
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Failed to confirm allergen deletion"); SetPageStatus("DataDialogFailed"); }
        finally { button.IsEnabled = true; }
    }

    public Task<bool> CanLeaveAsync() => _editor.CanLeaveAsync();

    private Task ShowAllergenEditorAsync(AllergenItemViewModel? existingAllergen)
    {
        var isEditing = existingAllergen != null;
        var allergen = existingAllergen?.ToAllergen() ?? new Allergen();

        EditorContent.Children.Clear();
        var panel = EditorContent;

        // Name
        var nameBox = new TextBox { Header = L.Get("Text_Name_d145bb"), Text = allergen.Name, PlaceholderText = L.Get("Text_Allergen_name_e_g_Gluten_Dairy_Nuts_723715") };
        panel.Children.Add(nameBox);
        var duplicateWarning = new TextBlock { Text = L.Get("DuplicateAllergenWarning"), TextWrapping = TextWrapping.Wrap, Visibility = Visibility.Collapsed };
        panel.Children.Add(duplicateWarning);
        void UpdateDuplicateWarning() => duplicateWarning.Visibility = !string.IsNullOrWhiteSpace(nameBox.Text) && _allergens.Any(item => item.Id != allergen.Id && string.Equals(item.Name.Trim(), nameBox.Text.Trim(), StringComparison.OrdinalIgnoreCase)) ? Visibility.Visible : Visibility.Collapsed;
        nameBox.TextChanged += (_, _) => UpdateDuplicateWarning();
        UpdateDuplicateWarning();

        panel.Children.Add(new TextBlock { Text = L.Get("AllergenIcon"), FontSize = 14, FontWeight = FontWeights.SemiBold });
        var iconPanel = new WrappingPanel { HorizontalAlignment = HorizontalAlignment.Stretch };
        string[] iconOptions = ["⚠️", "🌾", "🦐", "🥚", "🐟", "🥜", "🫛", "🥛", "🌰", "🥬", "🟡", "⚗️", "🌸", "🐚", "🍞", "🧀", "🍎", "🍄", "🌱", "❗"];
        var selectedIcon = string.IsNullOrWhiteSpace(allergen.Icon) ? "⚠️" : allergen.Icon;
        var icons = iconOptions.Contains(selectedIcon) ? iconOptions : [selectedIcon, .. iconOptions];
        var iconGroup = Guid.NewGuid().ToString("N");
        foreach (var icon in icons)
        {
            var choice = new RadioButton { Content = icon, GroupName = iconGroup, IsChecked = icon == selectedIcon, Margin = new Thickness(0, 0, 8, 4) };
            choice.Checked += (_, _) => { selectedIcon = icon; _editor.MarkDirty(); };
            iconPanel.Children.Add(choice);
        }
        panel.Children.Add(iconPanel);

        var colorLabel = new TextBlock { Text = L.Get("Text_Color_1d0c83"), FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(colorLabel);
        var picker = new ColorPicker { Color = ParseColorHex(allergen.Color), ColorSpectrumShape = ColorSpectrumShape.Ring,
            IsAlphaEnabled = false, IsHexInputVisible = true, Width = 288 };
        var swatch = new Border { Width = 24, Height = 24, CornerRadius = new CornerRadius(5), Background = new SolidColorBrush(picker.Color) };
        var colorText = new TextBlock { Text = allergen.Color, VerticalAlignment = VerticalAlignment.Center };
        var buttonContent = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        buttonContent.Children.Add(swatch); buttonContent.Children.Add(colorText);
        var colorButton = new Button { Content = buttonContent, Flyout = new Flyout { Content = picker } };
        ToolTipService.SetToolTip(colorButton, L.Get("AllergenChooseColor"));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(colorButton, L.Get("AllergenChooseColor"));
        panel.Children.Add(colorButton);
        picker.ColorChanged += (_, args) =>
        {
            swatch.Background = new SolidColorBrush(args.NewColor);
            colorText.Text = $"#{args.NewColor.R:X2}{args.NewColor.G:X2}{args.NewColor.B:X2}";
            _editor.MarkDirty();
        };
        nameBox.TextChanged += (_, _) => _editor.MarkDirty();
        _editor.Present(isEditing ? L.Get("Text_Edit_Allergen_54f3c1") : L.Get("Text_Add_Allergen_3f78ad"), isEditing ? allergen.Id : null, async () =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                _editor.SetError(L.Get("Text_Allergen_name_is_required_94160b"));
                nameBox.Focus(FocusState.Programmatic);
                return false;
            }

            if (_allergens.Any(item => item.Id != allergen.Id && string.Equals(item.Name, nameBox.Text.Trim(), StringComparison.Ordinal)))
            {
                _editor.SetError(L.Get("DuplicateAllergenError"));
                nameBox.Focus(FocusState.Programmatic);
                return false;
            }
            allergen.Name = nameBox.Text.Trim();
            allergen.Color = $"#{picker.Color.R:X2}{picker.Color.G:X2}{picker.Color.B:X2}";
            allergen.Icon = selectedIcon;

            allergen.Id = await _database.SaveAllergenAsync(allergen);
            try { await LoadAllergensAsync(); }
            catch (Exception ex) { App.Logger.LogError(ex, "Saved allergen but refresh failed"); SetPageStatus("DataSavedRefreshFailed"); }
            return true;
        });
        nameBox.Focus(FocusState.Programmatic);
        return Task.CompletedTask;
    }

    private static Color ParseColorHex(string hex)
    {
        hex = hex.TrimStart('#');
        var r = Convert.ToByte(hex.Substring(0, 2), 16);
        var g = Convert.ToByte(hex.Substring(2, 2), 16);
        var b = Convert.ToByte(hex.Substring(4, 2), 16);
        return Windows.UI.Color.FromArgb(255, r, g, b);
    }
}

public class AllergenItemViewModel
{
    public string DisplayName => L.Allergen(Name);
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#3498db";
    public string Icon { get; set; } = "⚠️";

    public SolidColorBrush ColorBrush => new SolidColorBrush(ParseColorHex(Color));

    public AllergenItemViewModel() { }

    public AllergenItemViewModel(Allergen allergen)
    {
        Id = allergen.Id;
        Name = allergen.Name;
        Color = allergen.Color;
        Icon = allergen.Icon;
    }

    public Allergen ToAllergen()
    {
        return new Allergen
        {
            Id = Id,
            Name = Name,
            Color = Color
            ,Icon = Icon
        };
    }

    private static Color ParseColorHex(string hex)
    {
        hex = hex.TrimStart('#');
        var r = Convert.ToByte(hex.Substring(0, 2), 16);
        var g = Convert.ToByte(hex.Substring(2, 2), 16);
        var b = Convert.ToByte(hex.Substring(4, 2), 16);
        return Windows.UI.Color.FromArgb(255, r, g, b);
    }
}

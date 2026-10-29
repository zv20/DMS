using L = DMS.Services.Localization;
using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Windows.UI;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class AllergensPage : Page, IUnsavedEditor
{
    private readonly IDatabaseService _database;
    private ObservableCollection<AllergenItemViewModel> _allergens = new();
    private ObservableCollection<AllergenItemViewModel> _filteredAllergens = new();
    private readonly SideEditorController _editor;

    public AllergensPage()
    {
        this.InitializeComponent();
        ResponsiveToolbar.Attach(ListToolbar, SearchBox);
        _database = App.Services.GetRequiredService<IDatabaseService>();
        _editor = new SideEditorController(this, EditorColumn, EditorPanel, EditorTitle, EditorStatus, EditorContent, EditorSaveButton, EditorCancelButton, EditorCloseButton);
        AllergensListView.ItemsSource = _filteredAllergens;
        Loaded += AllergensPage_Loaded;
    }

    private async void AllergensPage_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadAllergensAsync();
    }

    private async Task LoadAllergensAsync()
    {
        var allergens = await _database.GetAllAllergensAsync();
        _allergens.Clear();
        foreach (var allergen in allergens)
        {
            _allergens.Add(new AllergenItemViewModel(allergen));
        }
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var query = SearchBox.Text?.ToLowerInvariant() ?? "";
        _filteredAllergens.Clear();
        foreach (var allergen in _allergens)
        {
            if (string.IsNullOrEmpty(query) ||
                allergen.Name.ToLowerInvariant().Contains(query) || allergen.DisplayName.ToLowerInvariant().Contains(query))
            {
                _filteredAllergens.Add(allergen);
            }
        }
        EmptyStatePanel.Visibility = _filteredAllergens.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        AllergensListView.Visibility = _filteredAllergens.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
    }

    private void SearchBox_TextChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        ApplyFilter();
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
        if (sender is Button btn && btn.Tag is int id)
        {
            var deleteDialog = new ContentDialog
            {
                Title = L.Get("Text_Delete_Allergen_7b0000"),
                Content = L.Get("Text_Are_you_sure_you_want_to_delete_this_allergen_d1608f"),
                PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await deleteDialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                await _database.DeleteAllergenAsync(id);
                if (_editor.EditingId == id) _editor.Close();
                await LoadAllergensAsync();
            }
        }
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

        // Color Picker
        var colorLabel = new TextBlock { Text = L.Get("Text_Color_1d0c83"), FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(colorLabel);
        
        var colorPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
        var colorBox = new TextBox 
        { 
            Header = L.Get("Text_Hex_Color_52aa66"),
            Text = allergen.Color, 
            PlaceholderText = "#3498db",
            Width = 150
        };
        colorPanel.Children.Add(colorBox);

        var colorPreview = new Border 
        { 
            Width = 40, 
            Height = 40, 
            Background = new SolidColorBrush(ParseColorHex(allergen.Color)), 
            CornerRadius = new CornerRadius(4),
            BorderBrush = new SolidColorBrush(Colors.Gray),
            BorderThickness = new Thickness(1),
            VerticalAlignment = VerticalAlignment.Center
        };
        colorPanel.Children.Add(colorPreview);

        // Update preview when color changes
        colorBox.TextChanged += (s, e) =>
        {
            if (colorBox.Text.StartsWith("#") && colorBox.Text.Length == 7)
            {
                try 
                {
                    colorPreview.Background = new SolidColorBrush(ParseColorHex(colorBox.Text));
                }
                catch { }
            }
        };

        panel.Children.Add(colorPanel);

        // Quick color buttons - use StackPanel with horizontal orientation instead of WrapPanel
        var quickColors = new[] { "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#34495e" };
        var quickColorsPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        foreach (var color in quickColors)
        {
            var btn = new Button
            {
                Width = 32,
                Height = 32,
                Background = new SolidColorBrush(ParseColorHex(color)),
                CornerRadius = new CornerRadius(4),
                Tag = color,
                Style = (Style)Application.Current.Resources["ButtonRevealStyle"]
            };
            btn.Click += (s, e) =>
            {
                if (s is Button b && b.Tag is string c)
                {
                    colorBox.Text = c;
                    colorPreview.Background = new SolidColorBrush(ParseColorHex(c));
                }
            };
            quickColorsPanel.Children.Add(btn);
        }
        panel.Children.Add(new ScrollViewer { Content = quickColorsPanel, HorizontalScrollMode = ScrollMode.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Auto, VerticalScrollMode = ScrollMode.Disabled });
        nameBox.TextChanged += (_, _) => _editor.MarkDirty();
        colorBox.TextChanged += (_, _) => _editor.MarkDirty();
        _editor.Present(isEditing ? L.Get("Text_Edit_Allergen_54f3c1") : L.Get("Text_Add_Allergen_3f78ad"), isEditing ? allergen.Id : null, async () =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                _editor.SetError(L.Get("Text_Allergen_name_is_required_94160b"));
                nameBox.Focus(FocusState.Programmatic);
                return false;
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(colorBox.Text.Trim(), "^#[0-9a-fA-F]{6}$"))
            {
                _editor.SetError(L.Get("Text_Please_enter_a_valid_hex_color_e_g_3498db_d8bf3b"));
                colorBox.Focus(FocusState.Programmatic);
                return false;
            }

            allergen.Name = nameBox.Text.Trim();
            allergen.Color = colorBox.Text.Trim();

            allergen.Id = await _database.SaveAllergenAsync(allergen);
            await LoadAllergensAsync();
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

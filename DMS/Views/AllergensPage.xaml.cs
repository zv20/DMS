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

public sealed partial class AllergensPage : Page
{
    private readonly IDatabaseService _database;
    private ObservableCollection<AllergenItemViewModel> _allergens = new();
    private ObservableCollection<AllergenItemViewModel> _filteredAllergens = new();

    public AllergensPage()
    {
        this.InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
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
                allergen.Name.ToLowerInvariant().Contains(query))
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

    private void AddAllergenButton_Click(object sender, RoutedEventArgs e)
    {
        ShowAllergenDialog(null);
    }

    private void AllergensListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is AllergenItemViewModel allergen)
        {
            ShowAllergenDialog(allergen);
        }
    }

    private void EditAllergenButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var allergen = _allergens.FirstOrDefault(r => r.Id == id);
            if (allergen != null) ShowAllergenDialog(allergen);
        }
    }

    private async void DeleteAllergenButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var dialog = new ContentDialog
            {
                Title = "Delete Allergen",
                Content = "Are you sure you want to delete this allergen?",
                PrimaryButtonText = "Delete",
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                await _database.DeleteAllergenAsync(id);
                await LoadAllergensAsync();
            }
        }
    }

    private void ShowAllergenDialog(AllergenItemViewModel? existingAllergen)
    {
        var isEditing = existingAllergen != null;
        var allergen = isEditing ? existingAllergen.ToAllergen() : new Allergen();

        var dialog = new ContentDialog
        {
            Title = isEditing ? "Edit Allergen" : "Add Allergen",
            PrimaryButtonText = "Save",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = this.XamlRoot
        };

        var panel = new StackPanel { Spacing = 12, Width = 400 };

        // Name
        var nameBox = new TextBox { Header = "Name *", Text = allergen.Name, PlaceholderText = "Allergen name (e.g., Gluten, Dairy, Nuts)" };
        panel.Children.Add(nameBox);

        // Color Picker
        var colorLabel = new TextBlock { Text = "Color", FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(colorLabel);
        
        var colorPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
        var colorBox = new TextBox 
        { 
            Header = "Hex Color", 
            Text = allergen.Color, 
            PlaceholderText = "#3498db",
            Width = 150
        };
        colorPanel.Children.Add(colorBox);

        var colorPreview = new Border 
        { 
            Width = 40, 
            Height = 40, 
            Background = new SolidColorBrush(ParseColor(allergen.Color)), 
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
                    colorPreview.Background = new SolidColorBrush(ParseColor(colorBox.Text));
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
                Background = new SolidColorBrush(ParseColor(color)),
                CornerRadius = new CornerRadius(4),
                Tag = color,
                Style = (Style)Application.Current.Resources["ButtonRevealStyle"]
            };
            btn.Click += (s, e) =>
            {
                if (s is Button b && b.Tag is string c)
                {
                    colorBox.Text = c;
                    colorPreview.Background = new SolidColorBrush(ParseColor(c));
                }
            };
            quickColorsPanel.Children.Add(btn);
        }
        panel.Children.Add(quickColorsPanel);

        dialog.Content = panel;

        dialog.PrimaryButtonClick += async (s, args) =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                args.Cancel = true;
                var errorDialog = new ContentDialog
                {
                    Title = "Error",
                    Content = "Allergen name is required",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await errorDialog.ShowAsync();
                return;
            }

            if (!colorBox.Text.StartsWith("#") || colorBox.Text.Length != 7)
            {
                args.Cancel = true;
                var errorDialog = new ContentDialog
                {
                    Title = "Error",
                    Content = "Please enter a valid hex color (e.g., #3498db)",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await errorDialog.ShowAsync();
                return;
            }

            allergen.Name = nameBox.Text.Trim();
            allergen.Color = colorBox.Text.Trim();

            await _database.SaveAllergenAsync(allergen);
            await LoadAllergensAsync();
        };

        _ = dialog.ShowAsync();
    }

    private static Color ParseColor(string hex)
    {
        hex = hex.TrimStart('#');
        var r = Convert.ToByte(hex.Substring(0, 2), 16);
        var g = Convert.ToByte(hex.Substring(2, 2), 16);
        var b = Convert.ToByte(hex.Substring(4, 2), 16);
        return Color.FromArgb(255, r, g, b);
    }
}

public class AllergenItemViewModel
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#3498db";

    public SolidColorBrush ColorBrush => new SolidColorBrush(ParseColor(Color));

    public AllergenItemViewModel() { }

    public AllergenItemViewModel(Allergen allergen)
    {
        Id = allergen.Id;
        Name = allergen.Name;
        Color = allergen.Color;
    }

    public Allergen ToAllergen()
    {
        return new Allergen
        {
            Id = Id,
            Name = Name,
            Color = Color
        };
    }

    private static Color ParseColor(string hex)
    {
        hex = hex.TrimStart('#');
        var r = Convert.ToByte(hex.Substring(0, 2), 16);
        var g = Convert.ToByte(hex.Substring(2, 2), 16);
        var b = Convert.ToByte(hex.Substring(4, 2), 16);
        return Color.FromArgb(255, r, g, b);
    }
}
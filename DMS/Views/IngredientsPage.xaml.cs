using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class IngredientsPage : Page
{
    private readonly IDatabaseService _database;
    private ObservableCollection<IngredientItemViewModel> _ingredients = new();
    private ObservableCollection<IngredientItemViewModel> _filteredIngredients = new();

    public IngredientsPage()
    {
        this.InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        IngredientsListView.ItemsSource = _filteredIngredients;
        Loaded += IngredientsPage_Loaded;
    }

    private async void IngredientsPage_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadIngredientsAsync();
    }

    private async Task LoadIngredientsAsync()
    {
        var ingredients = await _database.GetAllIngredientsAsync();
        _ingredients.Clear();
        foreach (var ingredient in ingredients)
        {
            _ingredients.Add(new IngredientItemViewModel(ingredient));
        }
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var query = SearchBox.Text?.ToLowerInvariant() ?? "";
        _filteredIngredients.Clear();
        foreach (var ingredient in _ingredients)
        {
            if (string.IsNullOrEmpty(query) ||
                ingredient.Name.ToLowerInvariant().Contains(query))
            {
                _filteredIngredients.Add(ingredient);
            }
        }
        EmptyStatePanel.Visibility = _filteredIngredients.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        IngredientsListView.Visibility = _filteredIngredients.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
    }

    private void SearchBox_TextChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        ApplyFilter();
    }

    private async void AddIngredientButton_Click(object sender, RoutedEventArgs e)
    {
        await ShowIngredientDialogAsync(null);
    }

    private async void IngredientsListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is IngredientItemViewModel ingredient)
        {
            await ShowIngredientDialogAsync(ingredient);
        }
    }

    private async void EditIngredientButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var ingredient = _ingredients.FirstOrDefault(r => r.Id == id);
            if (ingredient != null) await ShowIngredientDialogAsync(ingredient);
        }
    }

    private async void DeleteIngredientButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var dialog = new ContentDialog
            {
                Title = "Delete Ingredient",
                Content = "Are you sure you want to delete this ingredient?",
                PrimaryButtonText = "Delete",
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                await _database.DeleteIngredientAsync(id);
                await LoadIngredientsAsync();
            }
        }
    }

    private async Task ShowIngredientDialogAsync(IngredientItemViewModel? existingIngredient)
    {
        var isEditing = existingIngredient != null;
        var ingredient = existingIngredient?.ToIngredient() ?? new Ingredient();
        var allergens = await _database.GetAllAllergensAsync();

        var dialog = new ContentDialog
        {
            Title = isEditing ? "Edit Ingredient" : "Add Ingredient",
            PrimaryButtonText = "Save",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = this.XamlRoot
        };

        var panel = new StackPanel { Spacing = 12, Width = 400 };

        // Name
        var nameBox = new TextBox { Header = "Name *", Text = ingredient.Name, PlaceholderText = "Ingredient name" };
        panel.Children.Add(nameBox);

        // Allergens
        var allergensLabel = new TextBlock { Text = "Allergens", FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(allergensLabel);
        var allergenList = new ListView
        {
            ItemsSource = allergens,
            DisplayMemberPath = "Name",
            SelectionMode = ListViewSelectionMode.Multiple,
            MaxHeight = 180,
            BorderThickness = new Thickness(1),
            BorderBrush = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Gray)
        };
        foreach (var allergen in allergens.Where(item => ingredient.Allergens.Contains(item.Name, StringComparer.OrdinalIgnoreCase)))
        {
            allergenList.SelectedItems.Add(allergen);
        }
        panel.Children.Add(allergenList);
        if (allergens.Count == 0)
        {
            panel.Children.Add(new TextBlock
            {
                Text = "Create allergens first from the Allergens page.",
                Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Gray)
            });
        }

        dialog.Content = panel;

        dialog.PrimaryButtonClick += async (s, args) =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                args.Cancel = true;
                var errorDialog = new ContentDialog
                {
                    Title = "Error",
                    Content = "Ingredient name is required",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await errorDialog.ShowAsync();
                return;
            }

            ingredient.Name = nameBox.Text.Trim();
            ingredient.Allergens = allergenList.SelectedItems
                .OfType<Allergen>()
                .Select(selected => selected.Name)
                .ToList();

            await _database.SaveIngredientAsync(ingredient);
            await LoadIngredientsAsync();
        };

        await dialog.ShowAsync();
    }
}

public class IngredientItemViewModel
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<string> Allergens { get; set; } = new();

    public string AllergensDisplay => Allergens.Count > 0
        ? string.Join("  ", Allergens.Select(allergen => $"{AllergenIcon(allergen)} {allergen}"))
        : "No allergens";

    private static string AllergenIcon(string name) => name.Trim().ToLowerInvariant() switch
    {
        "глутен" => "🌾", "ракообразни" => "🦐", "яйца" => "🥚", "риба" => "🐟",
        "фъстъци" => "🥜", "соя" => "🫛", "мляко" => "🥛", "ядки" => "🌰",
        "целина" => "🥬", "горчица" => "🟡", "сусам" => "🌾",
        "серен диоксид и сулфити" => "⚗️", "лупина" => "🌸", "мекотели" => "🐚", _ => "⚠️"
    };

    public IngredientItemViewModel() { }

    public IngredientItemViewModel(Ingredient ingredient)
    {
        Id = ingredient.Id;
        Name = ingredient.Name;
        Allergens = ingredient.Allergens;
    }

    public Ingredient ToIngredient()
    {
        return new Ingredient
        {
            Id = Id,
            Name = Name,
            Allergens = Allergens
        };
    }
}

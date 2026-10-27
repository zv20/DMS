using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class RecipesPage : Page
{
    private readonly IDatabaseService _database;
    private ObservableCollection<RecipeItemViewModel> _recipes = new();
    private ObservableCollection<RecipeItemViewModel> _filteredRecipes = new();

    public RecipesPage()
    {
        this.InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        RecipesListView.ItemsSource = _filteredRecipes;
        Loaded += RecipesPage_Loaded;
    }

    private async void RecipesPage_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadRecipesAsync();
    }

    private async Task LoadRecipesAsync()
    {
        var recipes = await _database.GetAllRecipesAsync();
        _recipes.Clear();
        foreach (var recipe in recipes)
        {
            _recipes.Add(new RecipeItemViewModel(recipe));
        }
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        var query = SearchBox.Text?.ToLowerInvariant() ?? "";
        _filteredRecipes.Clear();
        foreach (var recipe in _recipes)
        {
            if (string.IsNullOrEmpty(query) ||
                recipe.Name.ToLowerInvariant().Contains(query) ||
                recipe.Category.ToLowerInvariant().Contains(query))
            {
                _filteredRecipes.Add(recipe);
            }
        }
        EmptyStatePanel.Visibility = _filteredRecipes.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        RecipesListView.Visibility = _filteredRecipes.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
    }

    private void SearchBox_TextChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        ApplyFilter();
    }

    private async void AddRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        await ShowRecipeDialogAsync(null);
    }

    private async void RecipesListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is RecipeItemViewModel recipe)
        {
            await ShowRecipeDialogAsync(recipe);
        }
    }

    private async void EditRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var recipe = _recipes.FirstOrDefault(r => r.Id == id);
            if (recipe != null) await ShowRecipeDialogAsync(recipe);
        }
    }

    private async void DeleteRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var dialog = new ContentDialog
            {
                Title = "Delete Recipe",
                Content = "Are you sure you want to delete this recipe?",
                PrimaryButtonText = "Delete",
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                try
                {
                    await _database.DeleteRecipeAsync(id);
                    await LoadRecipesAsync();
                }
                catch (InvalidOperationException ex)
                {
                    var blockedDialog = new ContentDialog
                    {
                        Title = "Recipe is in use",
                        Content = ex.Message,
                        CloseButtonText = "OK",
                        XamlRoot = this.XamlRoot
                    };
                    await blockedDialog.ShowAsync();
                }
            }
        }
    }

    private async Task ShowRecipeDialogAsync(RecipeItemViewModel? existingRecipe)
    {
        var isEditing = existingRecipe != null;
        var recipe = existingRecipe?.ToRecipe() ?? new Recipe();
        var availableIngredients = await _database.GetAllIngredientsAsync();
        var availableAllergens = await _database.GetAllAllergensAsync();

        var dialog = new ContentDialog
        {
            Title = isEditing ? "Edit Recipe" : "Add Recipe",
            PrimaryButtonText = "Save",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = this.XamlRoot
        };

        var panel = new StackPanel { Spacing = 12, Width = 500 };

        // Name
        var nameBox = new TextBox { Header = "Name *", Text = recipe.Name, PlaceholderText = "Recipe name" };
        panel.Children.Add(nameBox);

        // Category
        var categoryBox = new ComboBox { Header = "Category", PlaceholderText = "Select category" };
        categoryBox.Items.Add("soup");
        categoryBox.Items.Add("main");
        categoryBox.Items.Add("dessert");
        categoryBox.Items.Add("other");
        categoryBox.SelectedItem = recipe.Category;
        categoryBox.IsEditable = true;
        panel.Children.Add(categoryBox);

        // Portion Size
        var portionBox = new TextBox { Header = "Portion Size", Text = recipe.PortionSize, PlaceholderText = "e.g., 2 servings" };
        panel.Children.Add(portionBox);

        // Calories
        var caloriesBox = new NumberBox { Header = "Calories", Value = recipe.Calories, Minimum = 0, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Inline };
        panel.Children.Add(caloriesBox);

        // Instructions
        var instructionsBox = new TextBox { Header = "Instructions", Text = recipe.Instructions, PlaceholderText = "Cooking steps...", AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 100 };
        panel.Children.Add(instructionsBox);

        // Ingredients: searchable dropdown plus removable selected list.
        var selectedIngredients = new ObservableCollection<string>(recipe.Ingredients);
        var ingredientByName = availableIngredients.ToDictionary(item => item.Name, StringComparer.OrdinalIgnoreCase);
        var inheritedAllergens = selectedIngredients
            .SelectMany(name => ingredientByName.TryGetValue(name, out var item) ? item.Allergens : [])
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var manualAllergens = recipe.Allergens
            .Where(name => !inheritedAllergens.Contains(name))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var selectedAllergens = new ObservableCollection<string>();
        void RebuildAllergensFromIngredients()
        {
            selectedAllergens.Clear();
            foreach (var allergen in selectedIngredients
                .SelectMany(name => ingredientByName.TryGetValue(name, out var item) ? item.Allergens : [])
                .Concat(manualAllergens)
                .Distinct(StringComparer.OrdinalIgnoreCase))
            {
                selectedAllergens.Add(allergen);
            }
        }
        RebuildAllergensFromIngredients();
        var ingredientsLabel = new TextBlock { Text = "Ingredients", FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(ingredientsLabel);
        var ingredientSearch = new AutoSuggestBox { PlaceholderText = "Search ingredients...", QueryIcon = new SymbolIcon(Symbol.Find) };
        var ingredientList = new ListView { ItemsSource = selectedIngredients, IsItemClickEnabled = true, MaxHeight = 90 };
        ingredientSearch.TextChanged += (sender, args) =>
        {
            var query = ingredientSearch.Text.Trim();
            ingredientSearch.ItemsSource = availableIngredients
                .Where(item => !selectedIngredients.Contains(item.Name) && (string.IsNullOrWhiteSpace(query) || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)))
                .Select(item => item.Name)
                .ToList();
        };
        ingredientSearch.SuggestionChosen += (sender, args) =>
        {
            if (args.SelectedItem is string name && !selectedIngredients.Contains(name))
            {
                selectedIngredients.Add(name);
                RebuildAllergensFromIngredients();
            }
            ingredientSearch.Text = string.Empty;
        };
        ingredientList.ItemClick += (sender, args) =>
        {
            if (args.ClickedItem is string name)
            {
                selectedIngredients.Remove(name);
                RebuildAllergensFromIngredients();
            }
        };
        panel.Children.Add(ingredientSearch);
        panel.Children.Add(ingredientList);

        // Allergens: searchable dropdown plus removable selected list.
        var allergensLabel = new TextBlock { Text = "Allergens", FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(allergensLabel);
        var allergenSearch = new AutoSuggestBox { PlaceholderText = "Search allergens...", QueryIcon = new SymbolIcon(Symbol.Find) };
        var allergenList = new ListView { ItemsSource = selectedAllergens, IsItemClickEnabled = true, MaxHeight = 90 };
        allergenSearch.TextChanged += (sender, args) =>
        {
            var query = allergenSearch.Text.Trim();
            allergenSearch.ItemsSource = availableAllergens
                .Where(item => !selectedAllergens.Contains(item.Name) && (string.IsNullOrWhiteSpace(query) || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)))
                .Select(item => item.Name)
                .ToList();
        };
        allergenSearch.SuggestionChosen += (sender, args) =>
        {
            if (args.SelectedItem is string name)
            {
                manualAllergens.Add(name);
                RebuildAllergensFromIngredients();
            }
            allergenSearch.Text = string.Empty;
        };
        allergenList.ItemClick += (sender, args) =>
        {
            if (args.ClickedItem is string name)
            {
                manualAllergens.Remove(name);
                RebuildAllergensFromIngredients();
            }
        };
        panel.Children.Add(allergenSearch);
        panel.Children.Add(allergenList);

        dialog.Content = panel;

        dialog.PrimaryButtonClick += async (s, args) =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                args.Cancel = true;
                var errorDialog = new ContentDialog
                {
                    Title = "Error",
                    Content = "Recipe name is required",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await errorDialog.ShowAsync();
                return;
            }

            recipe.Name = nameBox.Text.Trim();
            recipe.Category = categoryBox.SelectedItem?.ToString() ?? categoryBox.Text ?? "other";
            recipe.PortionSize = portionBox.Text?.Trim() ?? "";
            recipe.Calories = (int)caloriesBox.Value;
            recipe.Instructions = instructionsBox.Text?.Trim() ?? "";
            recipe.Ingredients = selectedIngredients.ToList();
            recipe.Allergens = selectedAllergens.ToList();

            await _database.SaveRecipeAsync(recipe);
            await LoadRecipesAsync();
        };

        await dialog.ShowAsync();
    }
}

public class RecipeItemViewModel : INotifyPropertyChanged
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "other";
    public string PortionSize { get; set; } = "";
    public int Calories { get; set; }
    public string Instructions { get; set; } = "";
    public List<string> Ingredients { get; set; } = new();
    public List<string> Allergens { get; set; } = new();

    public string PortionDisplay => string.IsNullOrEmpty(PortionSize) ? "" : $"🍽️ {PortionSize}";
    public string CaloriesDisplay => Calories > 0 ? $"🔥 {Calories} kcal" : "";
    public string AllergensDisplay => string.Join("  ", Allergens.Select(allergen => $"{AllergenIcon(allergen)} {allergen}"));

    private static string AllergenIcon(string name) => name.Trim().ToLowerInvariant() switch
    {
        "глутен" => "🌾", "ракообразни" => "🦐", "яйца" => "🥚", "риба" => "🐟",
        "фъстъци" => "🥜", "соя" => "🫛", "мляко" => "🥛", "ядки" => "🌰",
        "целина" => "🥬", "горчица" => "🟡", "сусам" => "🌾",
        "серен диоксид и сулфити" => "⚗️", "лупина" => "🌸", "мекотели" => "🐚", _ => "⚠️"
    };

    public RecipeItemViewModel() { }

    public RecipeItemViewModel(Recipe recipe)
    {
        Id = recipe.Id;
        Name = recipe.Name;
        Category = recipe.Category;
        PortionSize = recipe.PortionSize;
        Calories = recipe.Calories;
        Instructions = recipe.Instructions;
        Ingredients = recipe.Ingredients;
        Allergens = recipe.Allergens;
    }

    public Recipe ToRecipe()
    {
        return new Recipe
        {
            Id = Id,
            Name = Name,
            Category = Category,
            PortionSize = PortionSize,
            Calories = Calories,
            Instructions = Instructions,
            Ingredients = Ingredients,
            Allergens = Allergens
        };
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    private void OnPropertyChanged([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

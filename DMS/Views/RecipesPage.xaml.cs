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

    private void AddRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        ShowRecipeDialog(null);
    }

    private void RecipesListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is RecipeItemViewModel recipe)
        {
            ShowRecipeDialog(recipe);
        }
    }

    private void EditRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var recipe = _recipes.FirstOrDefault(r => r.Id == id);
            if (recipe != null) ShowRecipeDialog(recipe);
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

    private void ShowRecipeDialog(RecipeItemViewModel? existingRecipe)
    {
        var isEditing = existingRecipe != null;
        var recipe = isEditing ? existingRecipe.ToRecipe() : new Recipe();

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
        categoryBox.Items.Add("breakfast");
        categoryBox.Items.Add("lunch");
        categoryBox.Items.Add("dinner");
        categoryBox.Items.Add("snack");
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

        // Ingredients
        var ingredientsLabel = new TextBlock { Text = "Ingredients (one per line)", FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(ingredientsLabel);
        var ingredientsBox = new TextBox { Text = string.Join("\n", recipe.Ingredients), AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 100, PlaceholderText = "Tomato\nOnion\nGarlic" };
        panel.Children.Add(ingredientsBox);

        // Allergens
        var allergensLabel = new TextBlock { Text = "Allergens (comma separated)", FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(allergensLabel);
        var allergensBox = new TextBox { Text = string.Join(", ", recipe.Allergens), PlaceholderText = "gluten, dairy, nuts" };
        panel.Children.Add(allergensBox);

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
            recipe.Ingredients = ingredientsBox.Text?.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList() ?? new();
            recipe.Allergens = allergensBox.Text?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList() ?? new();

            await _database.SaveRecipeAsync(recipe);
            await LoadRecipesAsync();
        };

        _ = dialog.ShowAsync();
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
    public string AllergensDisplay => Allergens.Count > 0 ? $"⚠️ {string.Join(", ", Allergens)}" : "";

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

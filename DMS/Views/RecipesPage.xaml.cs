using L = DMS.Services.Localization;
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

public sealed partial class RecipesPage : Page, IUnsavedEditor
{
    private readonly IDatabaseService _database;
    private ObservableCollection<RecipeItemViewModel> _recipes = new();
    private ObservableCollection<RecipeItemViewModel> _filteredRecipes = new();
    private bool _filtersReady;
    private bool _sortAscending = true;
    private bool _editorDirty;
    private bool _openingEditor;
    private bool _savingEditor;
    private bool _confirmingDiscard;
    private int? _editingRecipeId;

    public RecipesPage()
    {
        this.InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        RecipesListView.ItemsSource = _filteredRecipes;
        CategoryFilter.Items.Add(new ComboBoxItem { Tag = "", Content = L.Get("RecipeAllCategories") });
        foreach (var category in new[] { "soup", "main", "dessert", "other" })
            CategoryFilter.Items.Add(new ComboBoxItem { Tag = category, Content = L.Category(category) });
        foreach (var sort in new[] { ("name", "RecipeSortName"), ("category", "RecipeSortCategory"), ("portion", "RecipeSortPortion"), ("allergens", "RecipeSortAllergens") })
            SortField.Items.Add(new ComboBoxItem { Tag = sort.Item1, Content = L.Get(sort.Item2) });
        CategoryFilter.SelectedIndex = SortField.SelectedIndex = 0;
        _filtersReady = true;
        SizeChanged += (_, _) => { if (RecipeEditor.Visibility == Visibility.Visible) ResizeEditor(); };
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
        if (!_filtersReady) return;
        var query = SearchBox.Text?.Trim() ?? "";
        var category = (CategoryFilter.SelectedItem as ComboBoxItem)?.Tag as string ?? "";
        var sort = (SortField.SelectedItem as ComboBoxItem)?.Tag as string ?? "name";
        string SortKey(RecipeItemViewModel item) => sort switch
        {
            "category" => item.CategoryDisplay,
            "portion" => item.PortionSize,
            "allergens" => item.AllergensDisplay,
            _ => item.Name
        };
        var items = _recipes.Where(recipe =>
            (category.Length == 0 || recipe.Category.Equals(category, StringComparison.OrdinalIgnoreCase)) &&
            (query.Length == 0 || recipe.Name.Contains(query, StringComparison.CurrentCultureIgnoreCase) || recipe.CategoryDisplay.Contains(query, StringComparison.CurrentCultureIgnoreCase)));
        items = _sortAscending ? items.OrderBy(SortKey, StringComparer.CurrentCultureIgnoreCase) : items.OrderByDescending(SortKey, StringComparer.CurrentCultureIgnoreCase);
        _filteredRecipes.Clear();
        foreach (var recipe in items)
        {
            _filteredRecipes.Add(recipe);
        }
        EmptyStateTitle.Text = _recipes.Count == 0 ? L.Get("String_Text_No_recipes_yet_0e52a2") : L.Get("RecipeNoMatches");
        EmptyStateHint.Visibility = _recipes.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        EmptyStatePanel.Visibility = _filteredRecipes.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        RecipesListView.Visibility = _filteredRecipes.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
    }

    private void SearchBox_TextChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        ApplyFilter();
    }

    private void Filter_SelectionChanged(object sender, SelectionChangedEventArgs e) => ApplyFilter();
    private void SortDirection_Click(object sender, RoutedEventArgs e)
    {
        _sortAscending = !_sortAscending;
        SortDirectionButton.Content = _sortAscending ? "↑" : "↓";
        ApplyFilter();
    }

    private async void AddRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        await OpenRecipeEditorAsync(null);
    }

    private async void RecipesListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is RecipeItemViewModel recipe)
        {
            await OpenRecipeEditorAsync(recipe);
        }
    }

    private async void EditRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var recipe = _recipes.FirstOrDefault(r => r.Id == id);
            if (recipe != null) await OpenRecipeEditorAsync(recipe);
        }
    }

    private async void DeleteRecipeButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var dialog = new ContentDialog
            {
                Title = L.Get("Text_Delete_Recipe_f011c8"),
                Content = L.Get("Text_Are_you_sure_you_want_to_delete_this_recipe_dd1450"),
                PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                try
                {
                    await _database.DeleteRecipeAsync(id);
                    if (_editingRecipeId == id) HideRecipeEditor();
                    await LoadRecipesAsync();
                }
                catch (InvalidOperationException ex)
                {
                    var blockedDialog = new ContentDialog
                    {
                        Title = L.Get("Text_Recipe_is_in_use_d1249f"),
                        Content = ex.Message,
                        CloseButtonText = L.Get("Text_OK_9ce3bd"),
                        XamlRoot = this.XamlRoot
                    };
                    await blockedDialog.ShowAsync();
                }
            }
        }
    }

    private async void EditorClose_Click(object sender, RoutedEventArgs e)
    {
        if (!_savingEditor && !_openingEditor && await ConfirmDiscardAsync()) HideRecipeEditor();
    }

    private async Task<bool> ConfirmDiscardAsync()
    {
        if (!_editorDirty) return true;
        if (_confirmingDiscard) return false;
        _confirmingDiscard = true;
        try
        {
        var dialog = new ContentDialog
        {
            XamlRoot = XamlRoot,
            Title = L.Get("RecipeDiscardTitle"),
            Content = L.Get("RecipeDiscardMessage"),
            PrimaryButtonText = L.Get("RecipeDiscardButton"),
            CloseButtonText = L.Get("Text_Cancel_77dfd2"),
            DefaultButton = ContentDialogButton.Close
        };
        return await dialog.ShowAsync() == ContentDialogResult.Primary;
        }
        finally { _confirmingDiscard = false; }
    }

    private void ResizeEditor() => EditorColumn.Width = new GridLength(Math.Min(420, Math.Max(220, ActualWidth * 0.55)));

    public async Task<bool> CanLeaveAsync()
    {
        if (_savingEditor || _openingEditor || _confirmingDiscard) return false;
        return await ConfirmDiscardAsync();
    }

    private void HideRecipeEditor()
    {
        RecipeEditor.Visibility = Visibility.Collapsed;
        EditorColumn.Width = new GridLength(0);
        EditorContent.Children.Clear();
        _saveRecipe = null;
        _editingRecipeId = null;
        _editorDirty = false;
    }

    private async Task OpenRecipeEditorAsync(RecipeItemViewModel? existingRecipe)
    {
        if (_openingEditor || _savingEditor) return;
        _openingEditor = true;
        try
        {
        if (!await ConfirmDiscardAsync()) return;
        var isEditing = existingRecipe != null;
        var recipe = existingRecipe?.ToRecipe() ?? new Recipe();
        var availableIngredients = await _database.GetAllIngredientsAsync();
        var availableAllergens = await _database.GetAllAllergensAsync();
        EditorContent.Children.Clear();
        EditorStatus.Text = "";
        EditorTitle.Text = isEditing ? L.Get("Text_Edit_Recipe_838f93") : L.Get("Text_Add_Recipe_aa1d63");
        EditorSaveButton.Content = L.Get("Text_Save_efc007");
        EditorCancelButton.Content = L.Get("Text_Cancel_77dfd2");
        ToolTipService.SetToolTip(EditorCloseButton, L.Get("RecipeCloseEditor"));
        var panel = EditorContent;

        // Name
        var nameBox = new TextBox { Header = L.Get("Text_Name_d145bb"), Text = recipe.Name, PlaceholderText = L.Get("Text_Recipe_name_bcb84d") };
        panel.Children.Add(nameBox);

        // Category
        var categoryBox = new ComboBox { Header = L.Get("Text_Category_a3c686"), PlaceholderText = L.Get("Text_Select_category_a2a5ca") };
        foreach (var category in new[] { "soup", "main", "dessert", "other" })
            categoryBox.Items.Add(new ComboBoxItem { Tag = category, Content = L.Category(category) });
        var currentCategory = categoryBox.Items.Cast<ComboBoxItem>().FirstOrDefault(item =>
            string.Equals((string)item.Tag, recipe.Category, StringComparison.OrdinalIgnoreCase));
        if (currentCategory == null && !string.IsNullOrWhiteSpace(recipe.Category))
        {
            // Keep legacy/custom categories until the user explicitly changes them.
            currentCategory = new ComboBoxItem { Tag = recipe.Category, Content = recipe.Category };
            categoryBox.Items.Add(currentCategory);
        }
        categoryBox.SelectedItem = currentCategory ?? categoryBox.Items[3];
        panel.Children.Add(categoryBox);

        // Portion Size
        var portionBox = new TextBox { Header = L.Get("Text_Portion_Size_4c79c6"), Text = recipe.PortionSize, PlaceholderText = L.Get("Text_e_g_2_servings_29af24") };
        panel.Children.Add(portionBox);

        // Calories
        var caloriesBox = new NumberBox { Header = L.Get("Text_Calories_3e62ec"), Value = recipe.Calories, Minimum = 0, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Inline };
        panel.Children.Add(caloriesBox);

        // Instructions
        var instructionsBox = new TextBox { Header = L.Get("Text_Instructions_ed58f2"), Text = recipe.Instructions, PlaceholderText = L.Get("Text_Cooking_steps_c3f1dd"), AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 100 };
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
        var selectedAllergenItems = new ObservableCollection<Allergen>();
        void RebuildAllergensFromIngredients()
        {
            selectedAllergens.Clear();
            selectedAllergenItems.Clear();
            foreach (var allergen in selectedIngredients
                .SelectMany(name => ingredientByName.TryGetValue(name, out var item) ? item.Allergens : [])
                .Concat(manualAllergens)
                .Distinct(StringComparer.OrdinalIgnoreCase))
            {
                selectedAllergens.Add(allergen);
                selectedAllergenItems.Add(availableAllergens.FirstOrDefault(item => item.Name == allergen) ?? new Allergen { Name = allergen });
            }
        }
        RebuildAllergensFromIngredients();
        var ingredientsLabel = new TextBlock { Text = L.Get("Text_Ingredients_f9e84e"), FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(ingredientsLabel);
        var ingredientSearch = new AutoSuggestBox { PlaceholderText = L.Get("String_Text_Search_ingredients_540992"), QueryIcon = new SymbolIcon(Symbol.Find) };
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
        var allergensLabel = new TextBlock { Text = L.Get("Text_Allergens_537261"), FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(allergensLabel);
        var allergenSearch = new AutoSuggestBox { PlaceholderText = L.Get("String_Text_Search_allergens_c1743a"), QueryIcon = new SymbolIcon(Symbol.Find) };
        var allergenList = new ListView { ItemsSource = selectedAllergenItems, DisplayMemberPath = "DisplayName", IsItemClickEnabled = true, MaxHeight = 90 };
        allergenSearch.DisplayMemberPath = "DisplayName";
        allergenSearch.TextMemberPath = "DisplayName";
        allergenSearch.TextChanged += (sender, args) =>
        {
            var query = allergenSearch.Text.Trim();
            allergenSearch.ItemsSource = availableAllergens
                .Where(item => !selectedAllergens.Contains(item.Name) && (string.IsNullOrWhiteSpace(query) || item.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        };
        allergenSearch.SuggestionChosen += (sender, args) =>
        {
            if (args.SelectedItem is Allergen allergen)
            {
                manualAllergens.Add(allergen.Name);
                RebuildAllergensFromIngredients();
            }
            allergenSearch.Text = string.Empty;
        };
        allergenList.ItemClick += (sender, args) =>
        {
            if (args.ClickedItem is Allergen allergen)
            {
                manualAllergens.Remove(allergen.Name);
                RebuildAllergensFromIngredients();
            }
        };
        panel.Children.Add(allergenSearch);
        panel.Children.Add(allergenList);

        _editingRecipeId = isEditing ? recipe.Id : null;
        _editorDirty = false;
        nameBox.TextChanged += (_, _) => _editorDirty = true;
        categoryBox.SelectionChanged += (_, _) => _editorDirty = true;
        portionBox.TextChanged += (_, _) => _editorDirty = true;
        caloriesBox.ValueChanged += (_, _) => _editorDirty = true;
        instructionsBox.TextChanged += (_, _) => _editorDirty = true;
        selectedIngredients.CollectionChanged += (_, _) => _editorDirty = true;
        selectedAllergens.CollectionChanged += (_, _) => _editorDirty = true;

        // Replace the previous editor's save handler when switching recipes.
        EditorSaveButton.Click -= EditorSave_Click;
        _saveRecipe = async () =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                EditorStatus.Text = L.Get("Text_Recipe_name_is_required_75e015");
                nameBox.Focus(FocusState.Programmatic);
                return;
            }

            recipe.Name = nameBox.Text.Trim();
            recipe.Category = (categoryBox.SelectedItem as ComboBoxItem)?.Tag as string ?? "other";
            recipe.PortionSize = portionBox.Text?.Trim() ?? "";
            recipe.Calories = double.IsFinite(caloriesBox.Value) ? (int)caloriesBox.Value : 0;
            recipe.Instructions = instructionsBox.Text?.Trim() ?? "";
            recipe.Ingredients = selectedIngredients.ToList();
            recipe.Allergens = selectedAllergens.ToList();

            recipe.Id = await _database.SaveRecipeAsync(recipe);
            _editorDirty = false;
            await LoadRecipesAsync();
            HideRecipeEditor();
        };
        EditorSaveButton.Click += EditorSave_Click;
        ResizeEditor();
        RecipeEditor.Visibility = Visibility.Visible;
        nameBox.Focus(FocusState.Programmatic);
        }
        catch (Exception ex)
        {
            EditorStatus.Text = L.Format("ErrorDetail", ex.Message);
            ResizeEditor();
            RecipeEditor.Visibility = Visibility.Visible;
        }
        finally { _openingEditor = false; }
    }

    private Func<Task>? _saveRecipe;

    private async void EditorSave_Click(object sender, RoutedEventArgs e)
    {
        if (_savingEditor || _openingEditor || _confirmingDiscard || _saveRecipe == null) return;
        _savingEditor = true;
        EditorSaveButton.IsEnabled = EditorCancelButton.IsEnabled = EditorCloseButton.IsEnabled = false;
        try { await _saveRecipe(); }
        catch (Exception ex) { EditorStatus.Text = L.Format("ErrorDetail", ex.Message); }
        finally
        {
            EditorSaveButton.IsEnabled = EditorCancelButton.IsEnabled = EditorCloseButton.IsEnabled = true;
            _savingEditor = false;
        }
    }
}

public class RecipeItemViewModel : INotifyPropertyChanged
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "other";
    public string CategoryDisplay => L.Category(Category);
    public string PortionSize { get; set; } = "";
    public int Calories { get; set; }
    public string Instructions { get; set; } = "";
    public List<string> Ingredients { get; set; } = new();
    public List<string> Allergens { get; set; } = new();

    public string PortionDisplay => string.IsNullOrEmpty(PortionSize) ? "" : $"🍽️ {PortionSize}";
    public string CaloriesDisplay => Calories > 0 ? $"🔥 {Calories} kcal" : "";
    public string AllergensDisplay => string.Join("  ", Allergens.Select(allergen => $"{AllergenIcon(allergen)} {L.Allergen(allergen)}"));

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

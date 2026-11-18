using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class IngredientsPage : Page, IUnsavedEditor
{
    private readonly DatabaseService _database;
    private int _pageGeneration;
    private readonly List<IngredientItemViewModel> _ingredients = new();
    private List<IngredientItemViewModel> _filteredIngredients = new();
    private readonly SideEditorController _editor;

    public IngredientsPage()
    {
        this.InitializeComponent();
        ResponsiveToolbar.Attach(ListToolbar, SearchBox);
        _database = App.Services.GetRequiredService<DatabaseService>();
        _editor = new SideEditorController(this, EditorColumn, EditorPanel, EditorTitle, EditorStatus, EditorContent, EditorSaveButton, EditorCancelButton, EditorCloseButton);
        _editor.EditingChanged += UpdateSelection;
        Loaded += IngredientsPage_Loaded;
    }

    private async void IngredientsPage_Loaded(object sender, RoutedEventArgs e)
    {
        IngredientsListView.ItemsSource = _filteredIngredients;
        try { await LoadIngredientsAsync(); }
        catch (Exception ex) { App.Logger.LogError(ex, "Failed to load ingredients"); SetPageStatus("DataLoadFailed"); }
    }

    protected override void OnNavigatedFrom(NavigationEventArgs e)
    {
        // Detach realized rows and their event handlers before leaving the page.
        _pageGeneration++;
        _editor.Close();
        IngredientsListView.ItemsSource = null;
        _filteredIngredients.Clear();
        _ingredients.Clear();
        base.OnNavigatedFrom(e);
    }

    private void SetPageStatus(string? key) => CatalogPageState.SetStatus(PageStatus, key);

    private async Task LoadIngredientsAsync()
    {
        var generation = _pageGeneration;
        var ingredients = await _database.GetAllIngredientsAsync();
        var allergens = await _database.GetAllAllergensAsync();
        if (generation != _pageGeneration) return;
        var allergenIcons = AllergenDisplay.BuildIconLookup(allergens);
        _ingredients.Clear();
        foreach (var ingredient in ingredients)
        {
            _ingredients.Add(new IngredientItemViewModel(ingredient) { AllergenIcons = allergenIcons });
        }
        ApplyFilter();
        SetPageStatus(null);
        PerformancePageSignal.AfterRender(this, "ingredients", _filteredIngredients.Count);
    }

    private void ApplyFilter()
    {
        var query = SearchBox.Text ?? "";
        _filteredIngredients = CatalogFilter.Ingredients(_ingredients, query);
        IngredientsListView.ItemsSource = _filteredIngredients;
        UpdateSelection();
        CatalogPageState.UpdateEmptyState(_ingredients.Count, _filteredIngredients.Count, IngredientsListView, EmptyStatePanel,
            EmptyStateTitle, EmptyStateHint, ClearSearchButton, "String_Text_No_ingredients_yet_affb49", "IngredientNoMatches");
    }

    private void UpdateSelection()
    {
        if (_editor == null) return;
        var selected = _filteredIngredients.FirstOrDefault(item => item.Id == _editor.EditingId);
        if (!ReferenceEquals(IngredientsListView.SelectedItem, selected)) IngredientsListView.SelectedItem = selected;
    }

    private void IngredientsListView_SelectionChanged(object sender, SelectionChangedEventArgs e) => UpdateSelection();

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

    private async void AddIngredientButton_Click(object sender, RoutedEventArgs e)
    {
        await _editor.OpenAsync(() => ShowIngredientEditorAsync(null));
    }

    private async void IngredientsListView_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is IngredientItemViewModel ingredient)
        {
            await _editor.OpenAsync(() => ShowIngredientEditorAsync(ingredient));
        }
    }

    private async void EditIngredientButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is int id)
        {
            var ingredient = _ingredients.FirstOrDefault(r => r.Id == id);
            if (ingredient != null) await _editor.OpenAsync(() => ShowIngredientEditorAsync(ingredient));
        }
    }

    private async void DeleteIngredientButton_Click(object sender, RoutedEventArgs e) =>
        await _editor.DeleteItemAsync(sender, "Text_Delete_Ingredient_79a0ab",
            "Text_Are_you_sure_you_want_to_delete_this_ingredient_66dbd2",
            _database.DeleteIngredientAsync, LoadIngredientsAsync, SetPageStatus);

    public Task<bool> CanLeaveAsync() => _editor.CanLeaveAsync();

    private async Task ShowIngredientEditorAsync(IngredientItemViewModel? existingIngredient)
    {
        var isEditing = existingIngredient != null;
        var ingredient = existingIngredient?.ToIngredient() ?? new Ingredient();
        var allergens = await _database.GetAllAllergensAsync();

        EditorContent.Children.Clear();
        var panel = EditorContent;

        // Name
        var nameBox = new TextBox { Header = L.Get("Text_Name_d145bb"), Text = ingredient.Name, PlaceholderText = L.Get("Text_Ingredient_name_6f2b4d") };
        panel.Children.Add(nameBox);
        var duplicateWarning = new TextBlock { Text = L.Get("DuplicateIngredientWarning"), TextWrapping = TextWrapping.Wrap, Visibility = Visibility.Collapsed };
        panel.Children.Add(duplicateWarning);
        void UpdateDuplicateWarning() => duplicateWarning.Visibility = !string.IsNullOrWhiteSpace(nameBox.Text) && _ingredients.Any(item => item.Id != ingredient.Id && string.Equals(item.Name.Trim(), nameBox.Text.Trim(), StringComparison.OrdinalIgnoreCase)) ? Visibility.Visible : Visibility.Collapsed;
        nameBox.TextChanged += (_, _) => UpdateDuplicateWarning();
        UpdateDuplicateWarning();

        // Allergens
        var allergensLabel = new TextBlock { Text = L.Get("Text_Allergens_537261"), FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(allergensLabel);
        var selectedAllergens = new ObservableCollection<string>(ingredient.Allergens.Distinct(StringComparer.OrdinalIgnoreCase));
        var allergenSearch = new AutoSuggestBox { PlaceholderText = L.Get("String_Text_Search_allergens_c1743a"), QueryIcon = new SymbolIcon(Symbol.Find), DisplayMemberPath = "DisplayName", TextMemberPath = "DisplayName" };
        var chips = new WrappingPanel { HorizontalAlignment = HorizontalAlignment.Stretch };
        void RebuildChips()
        {
            chips.Children.Clear();
            foreach (var name in selectedAllergens)
            {
                var chip = new Button { Content = $"{L.Allergen(name)}  ✕", CornerRadius = new CornerRadius(14), Padding = new Thickness(10, 4, 10, 4), Margin = new Thickness(0, 0, 6, 6) };
                var label = L.Format("RemoveAllergen", L.Allergen(name));
                ToolTipService.SetToolTip(chip, label);
                Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(chip, label);
                chip.Click += (_, _) => selectedAllergens.Remove(name);
                chips.Children.Add(chip);
            }
        }
        RebuildChips();
        SearchPicker.Attach(allergenSearch, query => allergens
            .Where(item => !selectedAllergens.Contains(item.Name, StringComparer.OrdinalIgnoreCase) &&
                (query.Length == 0 || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase) || item.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .ToList());
        allergenSearch.SuggestionChosen += (_, args) =>
        {
            if (args.SelectedItem is Allergen allergen && !selectedAllergens.Contains(allergen.Name, StringComparer.OrdinalIgnoreCase)) selectedAllergens.Add(allergen.Name);
            SearchPicker.ClearAfterSelection(allergenSearch);
        };
        panel.Children.Add(allergenSearch);
        panel.Children.Add(chips);
        if (allergens.Count == 0)
        {
            panel.Children.Add(new TextBlock
            {
                Text = L.Get("Text_Create_allergens_first_from_the_Allergens_page_e8f6ca"),
                Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Gray)
            });
        }

        nameBox.TextChanged += (_, _) => _editor.MarkDirty();
        selectedAllergens.CollectionChanged += (_, _) => { RebuildChips(); _editor.MarkDirty(); };
        _editor.Present(isEditing ? L.Get("Text_Edit_Ingredient_098e94") : L.Get("Text_Add_Ingredient_73b214"), isEditing ? ingredient.Id : null, async () =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                _editor.SetError(L.Get("Text_Ingredient_name_is_required_468003"));
                nameBox.Focus(FocusState.Programmatic);
                return false;
            }

            if (_ingredients.Any(item => item.Id != ingredient.Id && string.Equals(item.Name, nameBox.Text.Trim(), StringComparison.Ordinal)))
            {
                _editor.SetError(L.Get("DuplicateIngredientError"));
                nameBox.Focus(FocusState.Programmatic);
                return false;
            }
            ingredient.Name = nameBox.Text.Trim();
            ingredient.Allergens = selectedAllergens.ToList();

            ingredient.Id = await _database.SaveIngredientAsync(ingredient);
            try { await LoadIngredientsAsync(); }
            catch (Exception ex) { App.Logger.LogError(ex, "Saved ingredient but refresh failed"); SetPageStatus("DataSavedRefreshFailed"); }
            return true;
        });
        nameBox.Focus(FocusState.Programmatic);
    }
}

public class IngredientItemViewModel
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<string> Allergens { get; set; } = new();
    public IReadOnlyDictionary<string, string> AllergenIcons { get; set; } = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    public string AllergensDisplay => Allergens.Count > 0
        ? AllergenDisplay.FormatList(Allergens, AllergenIcons)
        : L.Get("Text_No_allergens_238938");

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

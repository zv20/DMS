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
    private ObservableCollection<IngredientItemViewModel> _ingredients = new();
    private List<IngredientItemViewModel> _filteredIngredients = new();
    private readonly SideEditorController _editor;

    public IngredientsPage()
    {
        this.InitializeComponent();
        ResponsiveToolbar.Attach(ListToolbar, SearchBox);
        _database = App.Services.GetRequiredService<DatabaseService>();
        _editor = new SideEditorController(this, EditorColumn, EditorPanel, EditorTitle, EditorStatus, EditorContent, EditorSaveButton, EditorCancelButton, EditorCloseButton);
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

    private void SetPageStatus(string? key)
    {
        PageStatus.Text = key == null ? "" : L.Get(key);
        PageStatus.Visibility = key == null ? Visibility.Collapsed : Visibility.Visible;
    }

    private async Task LoadIngredientsAsync()
    {
        var generation = _pageGeneration;
        var ingredients = await _database.GetAllIngredientsAsync();
        var allergens = await _database.GetAllAllergensAsync();
        if (generation != _pageGeneration) return;
        var allergenIcons = allergens.GroupBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToDictionary(group => group.Key, group => group.First().Icon, StringComparer.OrdinalIgnoreCase);
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
        var hasItems = _ingredients.Count > 0;
        EmptyStateTitle.Text = L.Get(hasItems ? "IngredientNoMatches" : "String_Text_No_ingredients_yet_affb49");
        EmptyStateHint.Visibility = hasItems ? Visibility.Collapsed : Visibility.Visible;
        ClearSearchButton.Visibility = hasItems && _filteredIngredients.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        EmptyStatePanel.Visibility = _filteredIngredients.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        IngredientsListView.Visibility = _filteredIngredients.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
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

    private async void DeleteIngredientButton_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button { Tag: int id } button || !button.IsEnabled) return;
        button.IsEnabled = false;
        try
        {
            var dialog = new ContentDialog { Title = L.Get("Text_Delete_Ingredient_79a0ab"), Content = L.Get("Text_Are_you_sure_you_want_to_delete_this_ingredient_66dbd2"),
                PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"), CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close, XamlRoot = XamlRoot };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            if (_editor.EditingId == id && !await _editor.CanLeaveAsync()) return;
            try { await _database.DeleteIngredientAsync(id); }
            catch (Exception ex) { App.Logger.LogError(ex, "Failed to delete ingredient {Id}", id); SetPageStatus("DataDeleteFailed"); return; }
            if (_editor.EditingId == id) _editor.Close();
            try { await LoadIngredientsAsync(); }
            catch (Exception ex) { App.Logger.LogError(ex, "Deleted ingredient {Id} but refresh failed", id); SetPageStatus("DataDeletedRefreshFailed"); }
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Failed to confirm ingredient deletion"); SetPageStatus("DataDialogFailed"); }
        finally { button.IsEnabled = true; }
    }

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
        ? string.Join("  ", Allergens.Select(allergen => $"{(AllergenIcons.TryGetValue(allergen, out var icon) ? icon : AllergenDisplay.Icon(allergen))} {L.Allergen(allergen)}"))
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

using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class IngredientsPage : Page, IUnsavedEditor
{
    private readonly IDatabaseService _database;
    private ObservableCollection<IngredientItemViewModel> _ingredients = new();
    private ObservableCollection<IngredientItemViewModel> _filteredIngredients = new();
    private readonly SideEditorController _editor;

    public IngredientsPage()
    {
        this.InitializeComponent();
        ResponsiveToolbar.Attach(ListToolbar, SearchBox);
        _database = App.Services.GetRequiredService<IDatabaseService>();
        _editor = new SideEditorController(this, EditorColumn, EditorPanel, EditorTitle, EditorStatus, EditorContent, EditorSaveButton, EditorCancelButton, EditorCloseButton);
        IngredientsListView.ItemsSource = _filteredIngredients;
        Loaded += IngredientsPage_Loaded;
    }

    private async void IngredientsPage_Loaded(object sender, RoutedEventArgs e)
    {
        try { await LoadIngredientsAsync(); }
        catch (Exception ex) { App.Logger.LogError(ex, "Failed to load ingredients"); SetPageStatus("DataLoadFailed"); }
    }

    private void SetPageStatus(string? key)
    {
        PageStatus.Text = key == null ? "" : L.Get(key);
        PageStatus.Visibility = key == null ? Visibility.Collapsed : Visibility.Visible;
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
        SetPageStatus(null);
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

        // Allergens
        var allergensLabel = new TextBlock { Text = L.Get("Text_Allergens_537261"), FontSize = 14, FontWeight = FontWeights.SemiBold };
        panel.Children.Add(allergensLabel);
        var allergenList = new ListView
        {
            ItemsSource = allergens,
            DisplayMemberPath = "DisplayName",
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
                Text = L.Get("Text_Create_allergens_first_from_the_Allergens_page_e8f6ca"),
                Foreground = new Microsoft.UI.Xaml.Media.SolidColorBrush(Microsoft.UI.Colors.Gray)
            });
        }

        // Keep unknown saved allergens instead of dropping them during an unrelated edit.
        var unmatchedAllergens = ingredient.Allergens.Where(name => !allergens.Any(item => string.Equals(item.Name, name, StringComparison.OrdinalIgnoreCase))).ToList();
        nameBox.TextChanged += (_, _) => _editor.MarkDirty();
        allergenList.SelectionChanged += (_, _) => _editor.MarkDirty();
        _editor.Present(isEditing ? L.Get("Text_Edit_Ingredient_098e94") : L.Get("Text_Add_Ingredient_73b214"), isEditing ? ingredient.Id : null, async () =>
        {
            if (string.IsNullOrWhiteSpace(nameBox.Text))
            {
                _editor.SetError(L.Get("Text_Ingredient_name_is_required_468003"));
                nameBox.Focus(FocusState.Programmatic);
                return false;
            }

            ingredient.Name = nameBox.Text.Trim();
            ingredient.Allergens = allergenList.SelectedItems
                .OfType<Allergen>()
                .Select(selected => selected.Name)
                .Concat(unmatchedAllergens)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

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

    public string AllergensDisplay => Allergens.Count > 0
        ? string.Join("  ", Allergens.Select(allergen => $"{AllergenIcon(allergen)} {L.Allergen(allergen)}"))
        : L.Get("Text_No_allergens_238938");

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

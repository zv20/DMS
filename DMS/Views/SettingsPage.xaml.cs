using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;
using System.Diagnostics;
using System.IO;
using System.Text.Json;

namespace DMS.Views;

public sealed partial class SettingsPage : Page
{
    private static readonly JsonSerializerOptions ImportJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly ISettingsService _settingsService;
    private readonly IDatabaseService _databaseService;
    private bool _suppressSettingChanges;

    public SettingsPage()
    {
        this.InitializeComponent();
        _settingsService = App.Services.GetRequiredService<ISettingsService>();
        _databaseService = App.Services.GetRequiredService<IDatabaseService>();
        Loaded += SettingsPage_Loaded;
    }

    private async void SettingsPage_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadSettingsAsync();
    }

    private async Task LoadSettingsAsync()
    {
        _suppressSettingChanges = true;
        try
        {
            // Language
            var language = _settingsService.GetLanguage();
            LanguageComboBox.SelectedItem = LanguageComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == language) ?? LanguageComboBox.Items[0];

            // Theme (stored in settings)
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            ThemeComboBox.SelectedItem = ThemeComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == settings.Theme) ?? ThemeComboBox.Items[2];

            // Data folder
            var dbPath = _databaseService.GetDatabasePath();
            DataFolderText.Text = dbPath;

            // Database info
            var dbInfo = new FileInfo(dbPath);
            DatabaseInfoText.Text = $"Location: {dbPath}\nSize: {FormatFileSize(dbInfo.Length)}\nLast Modified: {dbInfo.LastWriteTime:yyyy-MM-dd HH:mm}";
        }
        finally
        {
            _suppressSettingChanges = false;
        }
    }

    private void LanguageComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (LanguageComboBox.SelectedItem is ComboBoxItem item && item.Tag is string lang)
        {
            _settingsService.SetLanguage(lang);
            
        }
    }

    private async void ThemeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (ThemeComboBox.SelectedItem is ComboBoxItem item && item.Tag is string theme)
        {
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            settings.Theme = theme;
            await _databaseService.SaveSettingsAsync(settings);
            
        }
    }

    private void AccentColorComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        // Would need to implement accent color change via theme resources
        // For now just show a message
    }

    private async void ExportButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FileSavePicker
        {
            SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
            FileTypeChoices = { { "JSON", new[] { ".json" } } },
            SuggestedFileName = $"DMS_Export_{DateTime.Now:yyyyMMdd_HHmmss}"
        };
        
        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        var file = await picker.PickSaveFileAsync();
        if (file != null)
        {
            await ExportDataAsync(file);
        }
    }

    private async Task ExportDataAsync(Windows.Storage.StorageFile file)
    {
        try
        {
            var recipes = await _databaseService.GetAllRecipesAsync();
            var ingredients = await _databaseService.GetAllIngredientsAsync();
            var allergens = await _databaseService.GetAllAllergensAsync();
            var templates = await _databaseService.GetAllTemplatesAsync();
            var menuEntries = await _databaseService.GetMenuAsync(DateTime.MinValue, DateTime.MaxValue);
            var settings = await _databaseService.GetSettingsAsync();

            var exportData = new
            {
                Version = "2.0",
                ExportedAt = DateTime.UtcNow,
                Recipes = recipes,
                Ingredients = ingredients,
                Allergens = allergens,
                Templates = templates,
                MenuEntries = menuEntries,
                MenuCategories = await _databaseService.GetMenuCategoriesAsync(),
                Settings = settings
            };

            var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions { WriteIndented = true });
            await Windows.Storage.FileIO.WriteTextAsync(file, json);

            var exportSuccessDialog = new ContentDialog
            {
                Title = "Export Complete",
                Content = $"Exported {recipes.Count} recipes, {ingredients.Count} ingredients, {allergens.Count} allergens, {menuEntries.Count} menu entries, and {templates.Count} templates.",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await exportSuccessDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            var exportErrorDialog = new ContentDialog
            {
                Title = "Export Failed",
                Content = $"Error: {ex.Message}",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await exportErrorDialog.ShowAsync();
        }
    }

    private async void ImportButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FileOpenPicker
        {
            SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
            FileTypeFilter = { ".json" }
        };

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        var file = await picker.PickSingleFileAsync();
        if (file != null)
        {
            await ImportDataAsync(file);
        }
    }

    private async Task ImportDataAsync(Windows.Storage.StorageFile file)
    {
        var importDialog = new ContentDialog
        {
            Title = "Import Data",
            Content = "This will add imported data to your existing data. Duplicate names will be skipped. Continue?",
            PrimaryButtonText = "Import",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = this.XamlRoot
        };

        var result = await importDialog.ShowAsync();
        if (result != ContentDialogResult.Primary) return;

        try
        {
            var json = await Windows.Storage.FileIO.ReadTextAsync(file);
            using var document = JsonDocument.Parse(json);
            var importData = document.RootElement;
            if (importData.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException("The selected file is not a DMS backup.");

            if (LooksLikeLegacyBrowserBackup(importData))
            {
                var legacyResult = await ImportLegacyBrowserBackupAsync(importData);
                await ShowImportSuccessAsync(legacyResult);
                return;
            }

            int importedRecipes = 0, importedIngredients = 0, importedAllergens = 0, importedMenus = 0, importedTemplates = 0;
            var existingRecipes = (await _databaseService.GetAllRecipesAsync())
                .ToDictionary(recipe => recipe.Name, StringComparer.OrdinalIgnoreCase);
            var existingIngredients = (await _databaseService.GetAllIngredientsAsync())
                .ToDictionary(ingredient => ingredient.Name, StringComparer.OrdinalIgnoreCase);
            var existingAllergens = (await _databaseService.GetAllAllergensAsync())
                .ToDictionary(allergen => allergen.Name, StringComparer.OrdinalIgnoreCase);
            var recipeIdMap = new Dictionary<int, int>();

            if (TryGetPropertyIgnoreCase(importData, "Recipes", out var recipesElement))
            {
                foreach (var recipeJson in recipesElement.EnumerateArray())
                {
                    var recipe = JsonSerializer.Deserialize<Recipe>(recipeJson.GetRawText(), ImportJsonOptions);
                    if (recipe != null && !string.IsNullOrWhiteSpace(recipe.Name))
                    {
                        var sourceId = recipe.Id;
                        if (!existingRecipes.TryGetValue(recipe.Name, out var existingRecipe))
                        {
                            recipe.Id = 0;
                            recipe.Id = await _databaseService.SaveRecipeAsync(recipe);
                            existingRecipes.Add(recipe.Name, recipe);
                            importedRecipes++;
                            existingRecipe = recipe;
                        }
                        if (sourceId > 0) recipeIdMap[sourceId] = existingRecipe.Id;
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "Ingredients", out var ingredientsElement))
            {
                foreach (var ingredientJson in ingredientsElement.EnumerateArray())
                {
                    var ingredient = JsonSerializer.Deserialize<Ingredient>(ingredientJson.GetRawText(), ImportJsonOptions);
                    if (ingredient != null && !string.IsNullOrWhiteSpace(ingredient.Name) && !existingIngredients.ContainsKey(ingredient.Name))
                    {
                        ingredient.Id = 0;
                        await _databaseService.SaveIngredientAsync(ingredient);
                        existingIngredients.Add(ingredient.Name, ingredient);
                        importedIngredients++;
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "Allergens", out var allergensElement))
            {
                foreach (var allergenJson in allergensElement.EnumerateArray())
                {
                    var allergen = JsonSerializer.Deserialize<Allergen>(allergenJson.GetRawText(), ImportJsonOptions);
                    if (allergen != null && !string.IsNullOrWhiteSpace(allergen.Name) && !existingAllergens.ContainsKey(allergen.Name))
                    {
                        allergen.Id = 0;
                        await _databaseService.SaveAllergenAsync(allergen);
                        existingAllergens.Add(allergen.Name, allergen);
                        importedAllergens++;
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "MenuEntries", out var menuEntriesElement))
            {
                foreach (var menuJson in menuEntriesElement.EnumerateArray())
                {
                    var entry = JsonSerializer.Deserialize<MenuEntry>(menuJson.GetRawText(), ImportJsonOptions);
                    if (entry != null && recipeIdMap.TryGetValue(entry.RecipeId, out var destinationRecipeId))
                    {
                        entry.Id = 0;
                        entry.RecipeId = destinationRecipeId;
                        await _databaseService.SaveMenuEntryAsync(entry);
                        importedMenus++;
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "MenuCategories", out var categoriesElement))
            {
                foreach (var categoryJson in categoriesElement.EnumerateArray())
                {
                    var category = JsonSerializer.Deserialize<MenuSlotCategory>(categoryJson.GetRawText(), ImportJsonOptions);
                    if (category != null) await _databaseService.SaveMenuCategoryAsync(category.Date, category.Slot, category.Category);
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "Templates", out var templatesElement))
            {
                foreach (var templateJson in templatesElement.EnumerateArray())
                {
                    var template = JsonSerializer.Deserialize<MenuTemplate>(templateJson.GetRawText(), ImportJsonOptions);
                    if (template != null && !string.IsNullOrWhiteSpace(template.Name))
                    {
                        template.Name = $"{template.Name} (imported {DateTime.Now:yyyyMMdd})";
                        await _databaseService.SaveTemplateAsync(template);
                        importedTemplates++;
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "Settings", out var settingsElement))
            {
                var settings = JsonSerializer.Deserialize<AppSettings>(settingsElement.GetRawText(), ImportJsonOptions);
                if (settings != null) await _databaseService.SaveSettingsAsync(settings);
            }

            await ShowImportSuccessAsync(new ImportResult(
                importedRecipes, importedIngredients, importedAllergens, importedMenus, importedTemplates));
        }
        catch (Exception ex)
        {
            var importErrorDialog = new ContentDialog
            {
                Title = "Import Failed",
                Content = $"Error: {ex.Message}",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await importErrorDialog.ShowAsync();
        }
    }

    private static bool TryGetPropertyIgnoreCase(JsonElement element, string name, out JsonElement value)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    private static bool LooksLikeLegacyBrowserBackup(JsonElement backup)
    {
        if (!TryGetPropertyIgnoreCase(backup, "recipes", out var recipes) || recipes.ValueKind != JsonValueKind.Array)
            return false;

        return recipes.GetArrayLength() > 0
            && recipes[0].TryGetProperty("id", out var id)
            && id.ValueKind == JsonValueKind.String;
    }

    private async Task<ImportResult> ImportLegacyBrowserBackupAsync(JsonElement backup)
    {
        var allergenNames = new Dictionary<string, string>(StringComparer.Ordinal);
        var ingredientNames = new Dictionary<string, string>(StringComparer.Ordinal);
        var ingredientAllergens = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        var recipeIds = new Dictionary<string, int>(StringComparer.Ordinal);
        var result = new ImportResult();

        var existingAllergens = (await _databaseService.GetAllAllergensAsync())
            .Select(allergen => allergen.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (TryGetPropertyIgnoreCase(backup, "allergens", out var allergens) && allergens.ValueKind == JsonValueKind.Array)
        {
            foreach (var rawAllergen in allergens.EnumerateArray())
            {
                var id = GetString(rawAllergen, "id");
                var name = GetString(rawAllergen, "name");
                if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(name)) continue;
                allergenNames[id] = name;
                if (existingAllergens.Add(name))
                {
                    await _databaseService.SaveAllergenAsync(new Allergen
                    {
                        Name = name,
                        Color = GetString(rawAllergen, "color") ?? "#3498db"
                    });
                    result.Allergens++;
                }
            }
        }

        var existingIngredients = (await _databaseService.GetAllIngredientsAsync())
            .Select(ingredient => ingredient.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (TryGetPropertyIgnoreCase(backup, "ingredients", out var ingredients) && ingredients.ValueKind == JsonValueKind.Array)
        {
            foreach (var rawIngredient in ingredients.EnumerateArray())
            {
                var id = GetString(rawIngredient, "id");
                var name = GetString(rawIngredient, "name");
                if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(name)) continue;

                var linkedAllergens = GetStringArray(rawIngredient, "allergens")
                    .Select(allergenId => allergenNames.GetValueOrDefault(allergenId, allergenId))
                    .Where(allergenName => !string.IsNullOrWhiteSpace(allergenName))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                ingredientNames[id] = name;
                ingredientAllergens[id] = linkedAllergens;
                if (existingIngredients.Add(name))
                {
                    await _databaseService.SaveIngredientAsync(new Ingredient { Name = name, Allergens = linkedAllergens });
                    result.Ingredients++;
                }
            }
        }

        var existingRecipes = (await _databaseService.GetAllRecipesAsync())
            .ToDictionary(recipe => recipe.Name, StringComparer.OrdinalIgnoreCase);
        if (TryGetPropertyIgnoreCase(backup, "recipes", out var recipes) && recipes.ValueKind == JsonValueKind.Array)
        {
            foreach (var rawRecipe in recipes.EnumerateArray())
            {
                var sourceId = GetString(rawRecipe, "id");
                var name = GetString(rawRecipe, "name");
                if (string.IsNullOrWhiteSpace(sourceId) || string.IsNullOrWhiteSpace(name)) continue;

                var sourceIngredients = GetObjectIdArray(rawRecipe, "ingredients");
                var allergensForRecipe = GetObjectIdArray(rawRecipe, "manualAllergens")
                    .Select(allergenId => allergenNames.GetValueOrDefault(allergenId, allergenId))
                    .Concat(sourceIngredients.SelectMany(ingredientId => ingredientAllergens.GetValueOrDefault(ingredientId) ?? []))
                    .Where(allergenName => !string.IsNullOrWhiteSpace(allergenName))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                if (!existingRecipes.TryGetValue(name, out var recipe))
                {
                    recipe = new Recipe
                    {
                        Name = name,
                        Category = GetString(rawRecipe, "category") ?? "other",
                        PortionSize = GetString(rawRecipe, "portionSize") ?? string.Empty,
                        Calories = GetInt(rawRecipe, "calories"),
                        Instructions = GetString(rawRecipe, "instructions") ?? string.Empty,
                        Ingredients = sourceIngredients
                            .Select(ingredientId => ingredientNames.GetValueOrDefault(ingredientId, ingredientId))
                            .Where(ingredientName => !string.IsNullOrWhiteSpace(ingredientName))
                            .ToList(),
                        Allergens = allergensForRecipe
                    };
                    recipe.Id = await _databaseService.SaveRecipeAsync(recipe);
                    existingRecipes.Add(name, recipe);
                    result.Recipes++;
                }
                recipeIds[sourceId] = recipe.Id;
            }
        }

        if (TryGetPropertyIgnoreCase(backup, "currentMenu", out var currentMenu) && currentMenu.ValueKind == JsonValueKind.Object)
        {
            foreach (var day in currentMenu.EnumerateObject())
            {
                if (!DateTime.TryParse(day.Name, out var date) || day.Value.ValueKind != JsonValueKind.Object) continue;
                foreach (var slot in day.Value.EnumerateObject())
                {
                    var category = GetString(slot.Value, "category") ?? GetString(slot.Value, "type");
                    if (category != null) await _databaseService.SaveMenuCategoryAsync(date, slot.Name, category);
                    var sourceRecipeId = GetString(slot.Value, "recipe");
                    if (sourceRecipeId == null || !recipeIds.TryGetValue(sourceRecipeId, out var recipeId)) continue;
                    await _databaseService.SaveMenuEntryAsync(new MenuEntry { Date = date, Slot = slot.Name, RecipeId = recipeId });
                    result.MenuEntries++;
                }
            }
        }

        if (TryGetPropertyIgnoreCase(backup, "templates", out var templates) && templates.ValueKind == JsonValueKind.Object)
        {
            foreach (var templateProperty in templates.EnumerateObject())
            {
                var sourceTemplate = templateProperty.Value;
                if (sourceTemplate.ValueKind != JsonValueKind.Object) continue;
                var template = new MenuTemplate
                {
                    Name = templateProperty.Name,
                    HeaderText = GetString(sourceTemplate, "headerText") ?? "Weekly Menu",
                    FooterText = GetString(sourceTemplate, "footerText") ?? "Prepared with care by DMS",
                    BackgroundColor = GetString(sourceTemplate, "backgroundColor") ?? "#FFFFFF",
                    LegacyDataJson = sourceTemplate.GetRawText()
                };
                await _databaseService.SaveTemplateAsync(template);
                result.Templates++;
            }
        }

        if (TryGetPropertyIgnoreCase(backup, "appSettings", out var appSettings) && appSettings.ValueKind == JsonValueKind.Object)
        {
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            if (GetString(appSettings, "language") is string language && language is "bg" or "en")
            {
                settings.Language = language;
            }
            await _databaseService.SaveSettingsAsync(settings);
        }

        return result;
    }

    private async Task ShowImportSuccessAsync(ImportResult result)
    {
        var importSuccessDialog = new ContentDialog
        {
            Title = "Import Complete",
            Content = $"Imported: {result.Recipes} recipes, {result.Ingredients} ingredients, {result.Allergens} allergens, {result.MenuEntries} menu entries, {result.Templates} templates.",
            CloseButtonText = "OK",
            XamlRoot = this.XamlRoot
        };
        await importSuccessDialog.ShowAsync();
    }

    private static string? GetString(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static int GetInt(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var value) && value.TryGetInt32(out var number) ? number : 0;

    private static IEnumerable<string> GetStringArray(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var array) && array.ValueKind == JsonValueKind.Array
            ? array.EnumerateArray().Where(item => item.ValueKind == JsonValueKind.String).Select(item => item.GetString()!).ToArray()
            : [];

    private static IEnumerable<string> GetObjectIdArray(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var array) && array.ValueKind == JsonValueKind.Array
            ? array.EnumerateArray().Select(item => GetString(item, "id")).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).ToArray()
            : [];

    private sealed class ImportResult
    {
        public ImportResult() { }
        public ImportResult(int recipes, int ingredients, int allergens, int menuEntries, int templates) =>
            (Recipes, Ingredients, Allergens, MenuEntries, Templates) = (recipes, ingredients, allergens, menuEntries, templates);
        public int Recipes { get; set; }
        public int Ingredients { get; set; }
        public int Allergens { get; set; }
        public int MenuEntries { get; set; }
        public int Templates { get; set; }
    }

    private async void BackupButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FileSavePicker
        {
            SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
            FileTypeChoices = { { "SQLite Database", new[] { ".db" } } },
            SuggestedFileName = $"DMS_Backup_{DateTime.Now:yyyyMMdd_HHmmss}"
        };

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        var file = await picker.PickSaveFileAsync();
        if (file != null)
        {
            try
            {
                await _databaseService.CreateBackupAsync(file.Path);

                var backupDialog = new ContentDialog
                {
                    Title = "Backup Complete",
                    Content = "Database backup created successfully.",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await backupDialog.ShowAsync();
            }
            catch (Exception ex)
            {
                var backupErrorDialog = new ContentDialog
                {
                    Title = "Backup Failed",
                    Content = $"Error: {ex.Message}",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await backupErrorDialog.ShowAsync();
            }
        }
    }

    private async void RestoreButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FileOpenPicker
        {
            SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
            FileTypeFilter = { ".db" }
        };

        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        WinRT.Interop.InitializeWithWindow.Initialize(picker, hwnd);

        var file = await picker.PickSingleFileAsync();
        if (file != null)
        {
            var restoreConfirmDialog = new ContentDialog
            {
                Title = "Restore Database",
                Content = "⚠️ This will REPLACE your current database. All current data will be lost. Are you sure?",
                PrimaryButtonText = "Restore",
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await restoreConfirmDialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                try
                {
                    await _databaseService.RestoreFromAsync(file.Path);
                    
                    var restoreSuccessDialog = new ContentDialog
                    {
                        Title = "Restore Complete",
                        Content = "Database restored successfully. Reopen any active pages to refresh their data.",
                        CloseButtonText = "OK",
                        XamlRoot = this.XamlRoot
                    };
                    await restoreSuccessDialog.ShowAsync();
                }
                catch (Exception ex)
                {
                    var restoreErrorDialog = new ContentDialog
                    {
                        Title = "Restore Failed",
                        Content = $"Error: {ex.Message}",
                        CloseButtonText = "OK",
                        XamlRoot = this.XamlRoot
                    };
                    await restoreErrorDialog.ShowAsync();
                }
            }
        }
    }

    private void OpenDataFolderButton_Click(object sender, RoutedEventArgs e)
    {
        var dbPath = _databaseService.GetDatabasePath();
        var folder = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(folder) && Directory.Exists(folder))
        {
            Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
        }
    }

    private async void VacuumButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var vacDialog = new ContentDialog
            {
                Title = "Vacuum Database",
                Content = "This will optimize the database file size. Continue?",
                PrimaryButtonText = "Vacuum",
                CloseButtonText = "Cancel",
                XamlRoot = this.XamlRoot
            };

            var result = await vacDialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                await _databaseService.VacuumAsync();
                var doneDialog = new ContentDialog
                {
                    Title = "Vacuum Complete",
                    Content = "Database optimized successfully.",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await doneDialog.ShowAsync();
            }
        }
        catch (Exception ex)
        {
            var errorDialog = new ContentDialog
            {
                Title = "Error",
                Content = ex.Message,
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await errorDialog.ShowAsync();
        }
    }

    private async void ReindexButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            await _databaseService.ReindexAsync();
        var reindexDialog = new ContentDialog
        {
            Title = "Reindex Complete",
            Content = "Database indexes rebuilt.",
            CloseButtonText = "OK",
            XamlRoot = this.XamlRoot
        };
        await reindexDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            var errorDialog = new ContentDialog
            {
                Title = "Reindex failed",
                Content = ex.Message,
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await errorDialog.ShowAsync();
        }
    }

    private static string FormatFileSize(long bytes)
    {
        string[] units = { "B", "KB", "MB", "GB" };
        int unit = 0;
        double size = bytes;
        while (size >= 1024 && unit < units.Length - 1)
        {
            size /= 1024;
            unit++;
        }
        return $"{size:0.##} {units[unit]}";
    }
}

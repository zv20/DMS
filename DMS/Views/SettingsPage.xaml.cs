using L = DMS.Services.Localization;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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
    private bool _suppressSettingChanges = true;
    private string _selectedTheme = "default";
    private int _cardColumns;

    public SettingsPage()
    {
        this.InitializeComponent();
        _settingsService = App.Services.GetRequiredService<ISettingsService>();
        _databaseService = App.Services.GetRequiredService<IDatabaseService>();
        ClassicAccentHint.Text = L.Get("ThemeClassicAccentHint");
        SettingsScrollViewer.SizeChanged += (_, args) => ArrangeCards(args.NewSize.Width);
        Loaded += SettingsPage_Loaded;
    }

    private void ArrangeCards(double width)
    {
        // Leave room for the outer padding and keep each card readable in both languages.
        var available = Math.Max(0, width - 48);
        var columns = available >= 1200 ? 3 : available >= 780 ? 2 : 1;
        if (_cardColumns == columns) return;
        _cardColumns = columns;
        var cards = new[] { LanguageCard, AppearanceCard, PlanningCard, DataCard, DatabaseCard, AboutCard };
        SettingsCards.ColumnDefinitions.Clear();
        SettingsCards.RowDefinitions.Clear();
        for (var i = 0; i < columns; i++)
            SettingsCards.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        for (var i = 0; i < (cards.Length + columns - 1) / columns; i++)
            SettingsCards.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        for (var i = 0; i < cards.Length; i++)
        {
            Grid.SetColumn(cards[i], i % columns);
            Grid.SetRow(cards[i], i / columns);
        }
    }

    private async void SettingsPage_Loaded(object sender, RoutedEventArgs e)
    {
        ArrangeCards(SettingsScrollViewer.ActualWidth);
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
            _selectedTheme = settings.Theme;
            ThemeComboBox.SelectedItem = ThemeComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == settings.Theme) ?? ThemeComboBox.Items[0];
            AccentColorComboBox.SelectedItem = AccentColorComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == settings.AccentColor) ?? AccentColorComboBox.Items[0];
            UpdateAccentAvailability(settings.Theme);
            WeekendPlanningToggle.IsOn = settings.WeekendPlanningEnabled;

            // Data folder
            var dbPath = _databaseService.GetDatabasePath();
            DataFolderText.Text = dbPath;

            // Database info
            var dbInfo = new FileInfo(dbPath);
            DatabaseInfoText.Text = L.Format("DatabaseInfo", dbPath, FormatFileSize(dbInfo.Length), dbInfo.LastWriteTime);
        }
        finally
        {
            _suppressSettingChanges = false;
        }
    }

    private async void LanguageComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (LanguageComboBox.SelectedItem is ComboBoxItem item && item.Tag is string lang)
        {
            var previousLanguage = _settingsService.GetLanguage();
            if (lang == previousLanguage) return;
            LanguageComboBox.IsEnabled = false;
            var saved = false;
            try
            {
                var dialog = new ContentDialog
                {
                    XamlRoot = XamlRoot,
                    Title = L.Get("LanguageReloadTitle"),
                    Content = L.Get("LanguageReloadMessage"),
                    PrimaryButtonText = L.Get("LanguageReloadConfirm"),
                    CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                    DefaultButton = ContentDialogButton.Close
                };
                if (await dialog.ShowAsync() != ContentDialogResult.Primary)
                {
                    RestoreLanguageSelection(previousLanguage);
                    return;
                }
                await _settingsService.SetLanguageAsync(lang);
                saved = true;
                Localization.Apply(lang);
                App.ReloadLanguage();
            }
            catch (Exception ex)
            {
                if (saved)
                {
                    try { await _settingsService.SetLanguageAsync(previousLanguage); Localization.Apply(previousLanguage); }
                    catch (Exception rollbackError) { App.Logger.LogError(rollbackError, "Unable to restore the previous language"); }
                }
                RestoreLanguageSelection(_settingsService.GetLanguage());
                LanguageStatus.Text = L.Format("SaveError", ex.Message);
            }
            finally { LanguageComboBox.IsEnabled = true; }
        }
    }

    private void RestoreLanguageSelection(string language)
    {
        _suppressSettingChanges = true;
        try { LanguageComboBox.SelectedItem = LanguageComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == language); }
        finally { _suppressSettingChanges = false; }
    }

    private async void ThemeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (ThemeComboBox.SelectedItem is ComboBoxItem item && item.Tag is string theme)
        {
            ThemeComboBox.IsEnabled = AccentColorComboBox.IsEnabled = false;
            try
            {
                var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
                settings.Theme = theme;
                await _databaseService.SaveSettingsAsync(settings);
                AppearanceService.ApplyTheme(App.CurrentWindow, theme, settings.AccentColor);
                _selectedTheme = theme;
                AppearanceStatus.Text = "";
            }
            catch (Exception ex)
            {
                _suppressSettingChanges = true;
                try { ThemeComboBox.SelectedItem = ThemeComboBox.Items.Cast<ComboBoxItem>().FirstOrDefault(i => i.Tag?.ToString() == _selectedTheme) ?? ThemeComboBox.Items[0]; }
                finally { _suppressSettingChanges = false; }
                AppearanceStatus.Text = L.Format("SaveError", ex.Message);
            }
            finally { ThemeComboBox.IsEnabled = true; UpdateAccentAvailability((ThemeComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString()); }
        }
    }

    private void UpdateAccentAvailability(string? theme)
    {
        var classic = theme == "default";
        AccentColorComboBox.IsEnabled = !classic;
        ClassicAccentHint.Visibility = classic ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void AccentColorComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        if (AccentColorComboBox.SelectedItem is ComboBoxItem item && item.Tag is string accent)
        {
            ThemeComboBox.IsEnabled = AccentColorComboBox.IsEnabled = false;
            try
            {
                var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
                settings.AccentColor = accent;
                await _databaseService.SaveSettingsAsync(settings);
                AppearanceService.ApplyAccent(accent);
                AppearanceStatus.Text = "";
            }
            catch (Exception ex)
            {
                AppearanceStatus.Text = L.Format("SaveError", ex.Message);
            }
            finally { ThemeComboBox.IsEnabled = AccentColorComboBox.IsEnabled = true; }
        }
    }

    private async void WeekendPlanningToggle_Toggled(object sender, RoutedEventArgs e)
    {
        if (_suppressSettingChanges) return;
        WeekendPlanningToggle.IsEnabled = false;
        try
        {
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            settings.WeekendPlanningEnabled = WeekendPlanningToggle.IsOn;
            await _databaseService.SaveSettingsAsync(settings);
            PlanningStatus.Text = "";
        }
        catch (Exception ex) { PlanningStatus.Text = L.Format("SaveError", ex.Message); }
        finally { WeekendPlanningToggle.IsEnabled = true; }
    }

    private async void ExportButton_Click(object sender, RoutedEventArgs e)
    {
        var picker = new Windows.Storage.Pickers.FileSavePicker
        {
            SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
            FileTypeChoices = { { L.Get("DataArchiveFileType"), new[] { ".zip" } } },
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
            var images = new List<TemplateImageAsset>();
            foreach (var metadata in await _databaseService.GetTemplateImagesAsync())
            {
                var image = await _databaseService.GetTemplateImageAsync(metadata.Id)
                    ?? throw new InvalidDataException(L.Get("TplImageInvalid"));
                images.Add(image);
            }

            var exportData = new
            {
                Version = "3.0",
                ExportedAt = DateTime.UtcNow,
                Recipes = recipes,
                Ingredients = ingredients,
                Allergens = allergens,
                Templates = templates,
                MenuEntries = menuEntries,
                MenuCategories = await _databaseService.GetMenuCategoriesAsync(),
                Settings = settings
            };

            var json = TemplateImageArchive.SerializeExportData(exportData);
            var temporaryArchive = Path.Combine(Path.GetTempPath(), $"DMS-export-{Guid.NewGuid():N}.zip");
            try
            {
                using (var stream = new FileStream(temporaryArchive, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                    await TemplateImageArchive.WriteAsync(stream, json, images);
                // Finish validation and archive generation before replacing an existing chosen file.
                using var input = new FileStream(temporaryArchive, FileMode.Open, FileAccess.Read, FileShare.Read);
                using var output = await file.OpenStreamForWriteAsync();
                output.SetLength(0);
                await input.CopyToAsync(output);
            }
            finally
            {
                try { File.Delete(temporaryArchive); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }

            var exportSuccessDialog = new ContentDialog
            {
                Title = L.Get("Text_Export_Complete_7f2e84"),
                Content = L.Format("ExportSummary", recipes.Count, ingredients.Count, allergens.Count, menuEntries.Count, templates.Count)
                    + "\n" + L.Format("ExportImageCount", images.Count),
                CloseButtonText = L.Get("Text_OK_9ce3bd"),
                XamlRoot = this.XamlRoot
            };
            await exportSuccessDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            var exportErrorDialog = new ContentDialog
            {
                Title = L.Get("Text_Export_Failed_6aa6a7"),
                Content = L.Format("ErrorDetail", ex.Message),
                CloseButtonText = L.Get("Text_OK_9ce3bd"),
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
            FileTypeFilter = { ".zip", ".json" }
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
            Title = L.Get("Text_Import_Data_0021d0"),
            Content = L.Get("Text_This_will_add_imported_data_to_your_existing_data_Dupli_095ae0"),
            PrimaryButtonText = L.Get("Text_Import_d6fbc9"),
            CloseButtonText = L.Get("Text_Cancel_77dfd2"),
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = this.XamlRoot
        };

        var result = await importDialog.ShowAsync();
        if (result != ContentDialogResult.Primary) return;

        string? preImportBackup = null;
        try
        {
            TemplateImageArchive.Contents? archive = null;
            string json;
            if (file.FileType.Equals(".zip", StringComparison.OrdinalIgnoreCase))
            {
                using var stream = await file.OpenStreamForReadAsync();
                archive = await TemplateImageArchive.ReadAsync(stream);
                json = archive.DataJson;
            }
            else json = await Windows.Storage.FileIO.ReadTextAsync(file);
            using var document = JsonDocument.Parse(json);
            var importData = document.RootElement;
            if (importData.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException(L.Get("Text_The_selected_file_is_not_a_DMS_backup_df8918"));

            if (LooksLikeLegacyBrowserBackup(importData))
            {
                preImportBackup = await CreatePreImportBackupAsync();
                var legacyResult = await ImportLegacyBrowserBackupAsync(importData);
                await ShowImportSuccessAsync(legacyResult);
                return;
            }

            var recognized = false;
            foreach (var field in new[] { "Recipes", "Ingredients", "Allergens", "MenuEntries", "MenuCategories", "Templates" })
            {
                if (!TryGetPropertyIgnoreCase(importData, field, out var value)) continue;
                recognized = true;
                if (value.ValueKind != JsonValueKind.Array)
                    throw new InvalidDataException(L.Get("Text_The_selected_file_is_not_a_DMS_backup_df8918"));
            }
            if (TryGetPropertyIgnoreCase(importData, "Settings", out var importedSettings))
            {
                recognized = true;
                if (importedSettings.ValueKind is not JsonValueKind.Object and not JsonValueKind.Null)
                    throw new InvalidDataException(L.Get("Text_The_selected_file_is_not_a_DMS_backup_df8918"));
            }
            if (!recognized) throw new InvalidDataException(L.Get("Text_The_selected_file_is_not_a_DMS_backup_df8918"));
            preImportBackup = await CreatePreImportBackupAsync();

            var imageIds = new Dictionary<string, string>(StringComparer.Ordinal);
            if (archive != null)
            {
                foreach (var image in archive.Images)
                {
                    var saved = await _databaseService.SaveTemplateImageAsync(image.Name, image.ContentType, image.Data);
                    imageIds.Add(image.Id, saved.Id);
                }
            }

            int importedRecipes = 0, importedIngredients = 0, importedAllergens = 0, importedMenus = 0, importedTemplates = 0;
            var existingRecipes = (await _databaseService.GetAllRecipesAsync())
                .GroupBy(recipe => recipe.Name, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
            var existingIngredients = (await _databaseService.GetAllIngredientsAsync())
                .ToDictionary(ingredient => ingredient.Name, StringComparer.OrdinalIgnoreCase);
            var existingAllergens = (await _databaseService.GetAllAllergensAsync())
                .ToDictionary(allergen => allergen.Name, StringComparer.OrdinalIgnoreCase);
            var recipeIdMap = new Dictionary<int, int>();
            var existingMenuKeys = (await _databaseService.GetMenuAsync(DateTime.MinValue, DateTime.MaxValue))
                .Select(entry => (entry.Date.Date, entry.Slot.ToLowerInvariant())).ToHashSet();
            var protectedMenuKeys = existingMenuKeys.ToHashSet();
            var existingCategoryKeys = (await _databaseService.GetMenuCategoriesAsync())
                .Select(category => (category.Date.Date, category.Slot.ToLowerInvariant())).ToHashSet();
            var existingTemplateNames = (await _databaseService.GetAllTemplatesAsync())
                .Select(template => template.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

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
                    if (entry != null && !string.IsNullOrWhiteSpace(entry.Slot) &&
                        !existingMenuKeys.Contains((entry.Date.Date, entry.Slot.ToLowerInvariant())) &&
                        !existingCategoryKeys.Contains((entry.Date.Date, entry.Slot.ToLowerInvariant())) &&
                        recipeIdMap.TryGetValue(entry.RecipeId, out var destinationRecipeId))
                    {
                        entry.Id = 0;
                        entry.RecipeId = destinationRecipeId;
                        await _databaseService.SaveMenuEntryAsync(entry);
                        existingMenuKeys.Add((entry.Date.Date, entry.Slot.ToLowerInvariant()));
                        importedMenus++;
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "MenuCategories", out var categoriesElement))
            {
                foreach (var categoryJson in categoriesElement.EnumerateArray())
                {
                    var category = JsonSerializer.Deserialize<MenuSlotCategory>(categoryJson.GetRawText(), ImportJsonOptions);
                    if (category != null && !string.IsNullOrWhiteSpace(category.Slot) &&
                        !existingCategoryKeys.Contains((category.Date.Date, category.Slot.ToLowerInvariant())) &&
                        !protectedMenuKeys.Contains((category.Date.Date, category.Slot.ToLowerInvariant())))
                    {
                        await _databaseService.SaveMenuCategoryAsync(category.Date, category.Slot, category.Category);
                        existingCategoryKeys.Add((category.Date.Date, category.Slot.ToLowerInvariant()));
                    }
                }
            }

            if (TryGetPropertyIgnoreCase(importData, "Templates", out var templatesElement))
            {
                foreach (var templateJson in templatesElement.EnumerateArray())
                {
                    var template = JsonSerializer.Deserialize<MenuTemplate>(templateJson.GetRawText(), ImportJsonOptions);
                    if (template != null && !string.IsNullOrWhiteSpace(template.Name))
                    {
                        if (archive != null) TemplateImageArchive.RemapTemplateAssetIds(template, imageIds);
                        var baseName = $"{template.Name} (imported {DateTime.Now:yyyyMMdd})";
                        var candidate = baseName;
                        var suffix = 2;
                        while (existingTemplateNames.Contains(candidate)) candidate = $"{baseName} {suffix++}";
                        template.Name = candidate;
                        await _databaseService.SaveTemplateAsync(template);
                        existingTemplateNames.Add(candidate);
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
                importedRecipes, importedIngredients, importedAllergens, importedMenus, importedTemplates) { Images = archive?.Images.Count });
        }
        catch (Exception ex)
        {
            var importErrorDialog = new ContentDialog
            {
                Title = L.Get("Text_Import_Failed_4c1ed2"),
                Content = preImportBackup == null ? L.Format("ErrorDetail", ex.Message) : L.Format("ImportErrorRecovery", ex.Message, preImportBackup),
                CloseButtonText = L.Get("Text_OK_9ce3bd"),
                XamlRoot = this.XamlRoot
            };
            await importErrorDialog.ShowAsync();
        }
    }

    private async Task<string> CreatePreImportBackupAsync()
    {
        var databaseFolder = Path.GetDirectoryName(_databaseService.GetDatabasePath())
            ?? throw new InvalidOperationException("Database folder is unavailable.");
        var backupFolder = Path.Combine(databaseFolder, "ImportBackups");
        Directory.CreateDirectory(backupFolder);
        var path = Path.Combine(backupFolder, $"before-import-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.db");
        await _databaseService.CreateBackupAsync(path);
        return path;
    }

    private static bool TryGetPropertyIgnoreCase(JsonElement element, string name, out JsonElement value)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            value = default;
            return false;
        }
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
        if (TryGetPropertyIgnoreCase(backup, "currentMenu", out var menu) && menu.ValueKind == JsonValueKind.Object) return true;
        if (TryGetPropertyIgnoreCase(backup, "appSettings", out var settings) && settings.ValueKind == JsonValueKind.Object) return true;
        if (TryGetPropertyIgnoreCase(backup, "templates", out var templates) && templates.ValueKind == JsonValueKind.Object) return true;
        foreach (var collection in new[] { "recipes", "ingredients", "allergens" })
        {
            if (!TryGetPropertyIgnoreCase(backup, collection, out var items) || items.ValueKind != JsonValueKind.Array) continue;
            foreach (var item in items.EnumerateArray())
                if (item.ValueKind == JsonValueKind.Object && TryGetPropertyIgnoreCase(item, "id", out var id) && id.ValueKind == JsonValueKind.String) return true;
        }
        return false;
    }

    private async Task<ImportResult> ImportLegacyBrowserBackupAsync(JsonElement backup)
    {
        var allergenNames = new Dictionary<string, string>(StringComparer.Ordinal);
        var ingredientNames = new Dictionary<string, string>(StringComparer.Ordinal);
        var ingredientAllergens = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        var recipeIds = new Dictionary<string, int>(StringComparer.Ordinal);
        var result = new ImportResult();
        var existingMenuKeys = (await _databaseService.GetMenuAsync(DateTime.MinValue, DateTime.MaxValue))
            .Select(entry => (entry.Date.Date, entry.Slot.ToLowerInvariant())).ToHashSet();
        var existingCategoryKeys = (await _databaseService.GetMenuCategoriesAsync())
            .Select(category => (category.Date.Date, category.Slot.ToLowerInvariant())).ToHashSet();
        var existingTemplateNames = (await _databaseService.GetAllTemplatesAsync())
            .Select(template => template.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

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
            .GroupBy(recipe => recipe.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
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
                    var missing = sourceIngredients.Where(id => !ingredientNames.ContainsKey(id)).ToArray();
                    if (missing.Length > 0)
                    {
                        result.MissingIngredientReferences += missing.Length;
                        result.RecipesWithMissingIngredients.Add(name);
                    }
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
                    if (slot.Value.ValueKind != JsonValueKind.Object || string.IsNullOrWhiteSpace(slot.Name)) continue;
                    var key = (date.Date, slot.Name.ToLowerInvariant());
                    if (existingMenuKeys.Contains(key) || existingCategoryKeys.Contains(key)) continue;
                    var category = GetString(slot.Value, "category") ?? GetString(slot.Value, "type");
                    if (category != null)
                    {
                        await _databaseService.SaveMenuCategoryAsync(date, slot.Name, category);
                        existingCategoryKeys.Add(key);
                    }
                    var sourceRecipeId = GetString(slot.Value, "recipe");
                    if (sourceRecipeId == null || !recipeIds.TryGetValue(sourceRecipeId, out var recipeId)) continue;
                    await _databaseService.SaveMenuEntryAsync(new MenuEntry { Date = date, Slot = slot.Name, RecipeId = recipeId });
                    existingMenuKeys.Add(key);
                    result.MenuEntries++;
                }
            }
        }

        if (TryGetPropertyIgnoreCase(backup, "templates", out var templates) && templates.ValueKind == JsonValueKind.Object)
        {
            foreach (var templateProperty in templates.EnumerateObject())
            {
                var sourceTemplate = templateProperty.Value;
                if (sourceTemplate.ValueKind != JsonValueKind.Object || !existingTemplateNames.Add(templateProperty.Name)) continue;
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
            Title = L.Get("Text_Import_Complete_a5cb9b"),
            Content = L.Format("ImportSummary", result.Recipes, result.Ingredients, result.Allergens, result.MenuEntries, result.Templates)
                + (result.Images.HasValue ? "\n" + L.Format("ImportImageCount", result.Images.Value) : "")
                + (result.MissingIngredientReferences > 0 ? "\n\n" + L.Format("ImportMissingIngredients", result.MissingIngredientReferences, string.Join(", ", result.RecipesWithMissingIngredients)) : ""),
            CloseButtonText = L.Get("Text_OK_9ce3bd"),
            XamlRoot = this.XamlRoot
        };
        await importSuccessDialog.ShowAsync();
    }

    private static string? GetString(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static int GetInt(JsonElement element, string propertyName)
    {
        if (!TryGetPropertyIgnoreCase(element, propertyName, out var value)) return 0;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number;
        return value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out number) ? number : 0;
    }

    private static IEnumerable<string> GetStringArray(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var array) && array.ValueKind == JsonValueKind.Array
            ? array.EnumerateArray().Where(item => item.ValueKind == JsonValueKind.String).Select(item => item.GetString()!).ToArray()
            : [];

    private static IEnumerable<string> GetObjectIdArray(JsonElement element, string propertyName) =>
        TryGetPropertyIgnoreCase(element, propertyName, out var array) && array.ValueKind == JsonValueKind.Array
            ? array.EnumerateArray().Select(item => item.ValueKind == JsonValueKind.String ? item.GetString() : GetString(item, "id")).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).ToArray()
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
        public int? Images { get; set; }
        public int MissingIngredientReferences { get; set; }
        public List<string> RecipesWithMissingIngredients { get; } = new();
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
                    Title = L.Get("Text_Backup_Complete_8b1525"),
                    Content = L.Get("Text_Database_backup_created_successfully_2b90d0"),
                    CloseButtonText = L.Get("Text_OK_9ce3bd"),
                    XamlRoot = this.XamlRoot
                };
                await backupDialog.ShowAsync();
            }
            catch (Exception ex)
            {
                var backupErrorDialog = new ContentDialog
                {
                    Title = L.Get("Text_Backup_Failed_fcbe1a"),
                    Content = L.Format("ErrorDetail", ex.Message),
                    CloseButtonText = L.Get("Text_OK_9ce3bd"),
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
                Title = L.Get("Text_Restore_Database_04f0a6"),
                Content = L.Get("RestoreWarning"),
                PrimaryButtonText = L.Get("Text_Restore_3cbe6d"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"),
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
                        Title = L.Get("Text_Restore_Complete_6ad3ae"),
                        Content = L.Get("Text_Database_restored_successfully_Reopen_any_active_pages__48a860"),
                        CloseButtonText = L.Get("Text_OK_9ce3bd"),
                        XamlRoot = this.XamlRoot
                    };
                    await restoreSuccessDialog.ShowAsync();
                }
                catch (Exception ex)
                {
                    var restoreErrorDialog = new ContentDialog
                    {
                        Title = L.Get("Text_Restore_Failed_b6bce7"),
                        Content = L.Format("ErrorDetail", ex.Message),
                        CloseButtonText = L.Get("Text_OK_9ce3bd"),
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
                Title = L.Get("Text_Vacuum_Database_0a823e"),
                Content = L.Get("Text_This_will_optimize_the_database_file_size_Continue_db86eb"),
                PrimaryButtonText = L.Get("Text_Vacuum_5fe15d"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                XamlRoot = this.XamlRoot
            };

            var result = await vacDialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                await _databaseService.VacuumAsync();
                var doneDialog = new ContentDialog
                {
                    Title = L.Get("Text_Vacuum_Complete_43b708"),
                    Content = L.Get("Text_Database_optimized_successfully_4e0a52"),
                    CloseButtonText = L.Get("Text_OK_9ce3bd"),
                    XamlRoot = this.XamlRoot
                };
                await doneDialog.ShowAsync();
            }
        }
        catch (Exception ex)
        {
            var errorDialog = new ContentDialog
            {
                Title = L.Get("Text_Error_7f2f6a"),
                Content = ex.Message,
                CloseButtonText = L.Get("Text_OK_9ce3bd"),
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
            Title = L.Get("Text_Reindex_Complete_6eb4e1"),
            Content = L.Get("Text_Database_indexes_rebuilt_1fdc67"),
            CloseButtonText = L.Get("Text_OK_9ce3bd"),
            XamlRoot = this.XamlRoot
        };
        await reindexDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            var errorDialog = new ContentDialog
            {
                Title = L.Get("Text_Reindex_failed_f6512f"),
                Content = ex.Message,
                CloseButtonText = L.Get("Text_OK_9ce3bd"),
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

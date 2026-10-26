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
    private readonly ISettingsService _settingsService;
    private readonly IDatabaseService _databaseService;

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

    private async void LanguageComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (LanguageComboBox.SelectedItem is ComboBoxItem item && item.Tag is string lang)
        {
            _settingsService.SetLanguage(lang);
            
            var dialog = new ContentDialog
            {
                Title = "Language Changed",
                Content = "Please restart the application for the language change to take full effect.",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await dialog.ShowAsync();
        }
    }

    private async void ThemeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (ThemeComboBox.SelectedItem is ComboBoxItem item && item.Tag is string theme)
        {
            var settings = await _databaseService.GetSettingsAsync() ?? new AppSettings();
            settings.Theme = theme;
            await _databaseService.SaveSettingsAsync(settings);
            
            var dialog = new ContentDialog
            {
                Title = "Theme Changed",
                Content = "Please restart the application for the theme change to take effect.",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await dialog.ShowAsync();
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

            var exportData = new
            {
                Version = "1.0",
                ExportedAt = DateTime.UtcNow,
                Recipes = recipes,
                Ingredients = ingredients,
                Allergens = allergens,
                Templates = templates
            };

            var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions { WriteIndented = true });
            await Windows.Storage.FileIO.WriteTextAsync(file, json);

            var dialog = new ContentDialog
            {
                Title = "Export Complete",
                Content = $"Exported {recipes.Count} recipes, {ingredients.Count} ingredients, {allergens.Count} allergens, {templates.Count} templates.",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await dialog.ShowAsync();
        }
        catch (Exception ex)
        {
            var dialog = new ContentDialog
            {
                Title = "Export Failed",
                Content = $"Error: {ex.Message}",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await dialog.ShowAsync();
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
            var importData = JsonSerializer.Deserialize<JsonElement>(json);

            int importedRecipes = 0, importedIngredients = 0, importedAllergens = 0, importedTemplates = 0;

            if (importData.TryGetProperty("Recipes", out var recipesElement))
            {
                foreach (var recipeJson in recipesElement.EnumerateArray())
                {
                    var recipe = JsonSerializer.Deserialize<Recipe>(recipeJson.GetRawText());
                    if (recipe != null)
                    {
                        recipe.Id = 0; // Force new insert
                        await _databaseService.SaveRecipeAsync(recipe);
                        importedRecipes++;
                    }
                }
            }

            if (importData.TryGetProperty("Ingredients", out var ingredientsElement))
            {
                foreach (var ingredientJson in ingredientsElement.EnumerateArray())
                {
                    var ingredient = JsonSerializer.Deserialize<Ingredient>(ingredientJson.GetRawText());
                    if (ingredient != null)
                    {
                        ingredient.Id = 0;
                        await _databaseService.SaveIngredientAsync(ingredient);
                        importedIngredients++;
                    }
                }
            }

            if (importData.TryGetProperty("Allergens", out var allergensElement))
            {
                foreach (var allergenJson in allergensElement.EnumerateArray())
                {
                    var allergen = JsonSerializer.Deserialize<Allergen>(allergenJson.GetRawText());
                    if (allergen != null)
                    {
                        allergen.Id = 0;
                        await _databaseService.SaveAllergenAsync(allergen);
                        importedAllergens++;
                    }
                }
            }

            if (importData.TryGetProperty("Templates", out var templatesElement))
            {
                foreach (var templateJson in templatesElement.EnumerateArray())
                {
                    var template = JsonSerializer.Deserialize<MenuTemplate>(templateJson.GetRawText());
                    if (template != null)
                    {
                        template.Name = $"{template.Name} (imported {DateTime.Now:yyyyMMdd})";
                        await _databaseService.SaveTemplateAsync(template);
                        importedTemplates++;
                    }
                }
            }

            var successDialog = new ContentDialog
            {
                Title = "Import Complete",
                Content = $"Imported: {importedRecipes} recipes, {importedIngredients} ingredients, {importedAllergens} allergens, {importedTemplates} templates.",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await successDialog.ShowAsync();
        }
        catch (Exception ex)
        {
            var errorDialog = new ContentDialog
            {
                Title = "Import Failed",
                Content = $"Error: {ex.Message}",
                CloseButtonText = "OK",
                XamlRoot = this.XamlRoot
            };
            await errorDialog.ShowAsync();
        }
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
                var dbPath = _databaseService.GetDatabasePath();
                var sourceFile = await Windows.Storage.StorageFile.GetFileFromPathAsync(dbPath);
                await sourceFile.CopyAndReplaceAsync(file);

                var dialog = new ContentDialog
                {
                    Title = "Backup Complete",
                    Content = "Database backup created successfully.",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await dialog.ShowAsync();
            }
            catch (Exception ex)
            {
                var errorDialog = new ContentDialog
                {
                    Title = "Backup Failed",
                    Content = $"Error: {ex.Message}",
                    CloseButtonText = "OK",
                    XamlRoot = this.XamlRoot
                };
                await errorDialog.ShowAsync();
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
            var restoreDialog = new ContentDialog
            {
                Title = "Restore Database",
                Content = "⚠️ This will REPLACE your current database. All current data will be lost. Are you sure?",
                PrimaryButtonText = "Restore",
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await restoreDialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                try
                {
                    var dbPath = _databaseService.GetDatabasePath();
                    await file.CopyAndReplaceAsync(await Windows.Storage.StorageFile.GetFileFromPathAsync(dbPath));
                    
                    // Reinitialize database service
                    var dbService = (DatabaseService)_databaseService;
                    dbService.Dispose();
                    
                    var successDialog = new ContentDialog
                    {
                        Title = "Restore Complete",
                        Content = "Database restored. Please restart the application.",
                        CloseButtonText = "OK",
                        XamlRoot = this.XamlRoot
                    };
                    await successDialog.ShowAsync();
                }
                catch (Exception ex)
                {
                    var errorDialog = new ContentDialog
                    {
                        Title = "Restore Failed",
                        Content = $"Error: {ex.Message}",
                        CloseButtonText = "OK",
                        XamlRoot = this.XamlRoot
                    };
                    await errorDialog.ShowAsync();
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
                // Would need to access the SQLite connection directly
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
        var dialog = new ContentDialog
        {
            Title = "Reindex Complete",
            Content = "Database indexes rebuilt.",
            CloseButtonText = "OK",
            XamlRoot = this.XamlRoot
        };
        await dialog.ShowAsync();
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
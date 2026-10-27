using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseServiceTests : IDisposable
{
    private readonly string _testDirectory = Path.Combine(Path.GetTempPath(), "DMS.Tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public void WeekdayGroupsHaveIndependentStylesAndOverrideLegacyDayStyle()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { TemplateStyle = "detailed" };
        template.TextStyles["block:0"] = new TemplateTextStyle { Color = "#101010" };
        template.TextStyles["heading:0"] = new TemplateTextStyle { Color = "#111111" };
        template.TextStyles["menu:0"] = new TemplateTextStyle { Color = "#222222" };
        template.TextStyles["ingredient-group:0"] = new TemplateTextStyle { Color = "#333333" };
        template.TextStyles["allergen-group:0"] = new TemplateTextStyle { Color = "#444444" };
        var recipes = new List<Recipe> { new() { Id = 1, Name = "Soup", Ingredients = ["Beans"], Allergens = ["Milk"] }, new() { Id = 2, Name = "Main", Ingredients = ["Rice"], Allergens = ["Eggs"] } };
        var entries = new List<MenuEntry> { new() { Date = monday, Slot = "slot1", RecipeId = 1 }, new() { Date = monday, Slot = "slot2", RecipeId = 2 } };
        var restored = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(System.Text.Json.JsonSerializer.Serialize(template))!;
        var html = MenuOutputService.BuildHtml(restored, monday, entries, recipes);
        Assert.Contains("color:#111111", html);
        Assert.Equal(2, html.Split("color:#222222").Length - 1);
        Assert.Equal(2, html.Split("color:#333333").Length - 1);
        Assert.Equal(2, html.Split("color:#444444").Length - 1);
        Assert.DoesNotContain("color:#101010", html);
    }

    [Fact]
    public void DayBlockStyleAppliesToAllDetailsWithoutChangingOtherDays()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { TemplateStyle = "detailed" };
        template.TextStyles["block:0"] = new TemplateTextStyle { FontFamily = "Georgia", FontSize = 19, Color = "#123456", Bold = true };
        template.TextStyles["meal:0:1"] = new TemplateTextStyle { FontFamily = "Arial", FontSize = 9, Color = "#abcdef" };
        var recipe = new Recipe { Id = 1, Name = "Soup", Ingredients = ["Beans"], Allergens = ["Milk"], Calories = 100, PortionSize = "200g" };
        var entries = new List<MenuEntry> { new() { Date = monday, Slot = "slot1", RecipeId = 1 }, new() { Date = monday.AddDays(1), Slot = "slot1", RecipeId = 1 } };
        var html = MenuOutputService.BuildHtml(template, monday, entries, [recipe]);
        var mondayHtml = html.Split("<section>")[1];
        var tuesdayHtml = html.Split("<section>")[2];
        var css = "font-family:'Georgia';font-size:19px;color:#123456;font-weight:bold";
        Assert.True(mondayHtml.Split(css).Length - 1 >= 6);
        Assert.DoesNotContain("#abcdef", mondayHtml);
        Assert.DoesNotContain(css, tuesdayHtml);
    }

    [Fact]
    public void MenuOutputUsesSavedElementStylesAndRejectsUnsafeCss()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { TemplateStyle = "detailed" };
        template.TextStyles["meal:0:2"] = new TemplateTextStyle { FontFamily = "Georgia", FontSize = 18, Color = "#123456", Bold = true };
        template.TextStyles["ingredients:0:2"] = new TemplateTextStyle { FontFamily = "evil');bad", Color = "red;bad", FontSize = 12 };
        var recipes = new List<Recipe> { new() { Id = 7, Name = "Stew", Ingredients = ["Beans"] } };
        var entries = new List<MenuEntry> { new() { Date = monday, Slot = "slot2", RecipeId = 7 } };
        var restored = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(System.Text.Json.JsonSerializer.Serialize(template))!;
        var html = MenuOutputService.BuildHtml(restored, monday, entries, recipes);
        Assert.Contains("font-family:'Georgia';font-size:18px;color:#123456;font-weight:bold", html);
        Assert.Contains("font-family:'Arial';font-size:12px;color:#000000", html);
        Assert.Contains("2. Stew", html);
        Assert.DoesNotContain("evil');bad", html);
        Assert.DoesNotContain("red;bad", html);
    }

    [Fact]
    public void MenuOutputUsesSavedWeekAndEscapesUserContent()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { HeaderText = "<script>bad()</script>", TemplateStyle = "detailed", BackgroundImageDataUri = "https://example.invalid/image.png" };
        var recipes = new List<Recipe> { new() { Id = 7, Name = "Soup <img onerror=bad>", Ingredients = ["Beans"] } };
        var entries = new List<MenuEntry> { new() { Date = monday, Slot = "slot2", RecipeId = 7 }, new() { Date = monday.AddDays(7), Slot = "slot1", RecipeId = 7 } };
        var html = MenuOutputService.BuildHtml(template, monday, entries, recipes);
        Assert.Contains("&lt;script&gt;bad()&lt;/script&gt;", html);
        Assert.Contains("Soup &lt;img onerror=bad&gt;", html);
        Assert.Contains("2. Soup", html);
        Assert.DoesNotContain("<script>bad()", html);
        Assert.DoesNotContain("example.invalid", html);
        Assert.DoesNotContain(monday.AddDays(7).ToString("dddd, d MMMM"), html);
    }

    [Fact]
    public async Task RecipeAssignedToMenuCannotBeDeleted()
    {
        using var database = CreateDatabase();
        var recipe = new Recipe { Name = "Vegetable soup", Category = "soup" };
        recipe.Id = await database.SaveRecipeAsync(recipe);
        await database.SaveMenuEntryAsync(new MenuEntry
        {
            Date = new DateTime(2026, 10, 26),
            Slot = "Lunch",
            RecipeId = recipe.Id
        });

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => database.DeleteRecipeAsync(recipe.Id));

        Assert.Contains("menu entries", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Single(await database.GetMenuAsync(new DateTime(2026, 10, 26), new DateTime(2026, 10, 26)));
    }

    [Fact]
    public async Task LanguageChangePreservesOtherSettingsAndSurvivesReload()
    {
        using var database = CreateDatabase();
        await database.SaveSettingsAsync(new AppSettings { Language = "bg", Theme = "dark", AccentColor = "teal" });
        var settings = new SettingsService(database);
        await settings.LoadAsync();
        await settings.SetLanguageAsync("en");
        Assert.Equal("en", settings.GetLanguage());
        Assert.Equal("dark", (await database.GetSettingsAsync())!.Theme);
        Assert.Equal("teal", (await database.GetSettingsAsync())!.AccentColor);
        var reopened = new SettingsService(database);
        Assert.Equal("en", (await reopened.LoadAsync()).Language);
        await reopened.SetLanguageAsync("bg");
        Assert.Equal("bg", (await database.GetSettingsAsync())!.Language);
        Assert.Equal("dark", (await database.GetSettingsAsync())!.Theme);
        Assert.Equal("teal", (await database.GetSettingsAsync())!.AccentColor);
    }

    [Fact]
    public async Task EmptyMenuSlotCategorySurvivesReopenAndBackup()
    {
        var day = new DateTime(2026, 10, 26);
        var backupPath = Path.Combine(_testDirectory, "category-backup.db");
        using (var database = CreateDatabase())
        {
            await database.SaveMenuCategoryAsync(day, "slot1", "dessert");
            await database.CreateBackupAsync(backupPath);
            await database.SaveMenuCategoryAsync(day, "slot1", "soup");
            await database.RestoreFromAsync(backupPath);
            Assert.Equal("dessert", await database.GetMenuCategoryAsync(day, "slot1"));
            Assert.Empty(await database.GetMenuAsync(day, day));
        }
        using var reopened = CreateDatabase();
        Assert.Equal("dessert", await reopened.GetMenuCategoryAsync(day, "slot1"));
        Assert.Single(await reopened.GetMenuCategoriesAsync());
    }

    [Fact]
    public async Task BackupAndRestoreReturnTheOriginalData()
    {
        using var database = CreateDatabase();
        var recipe = new Recipe { Name = "Bean stew", Category = "main" };
        recipe.Id = await database.SaveRecipeAsync(recipe);
        var backupPath = Path.Combine(_testDirectory, "backup.db");
        await database.CreateBackupAsync(backupPath);

        await database.SaveRecipeAsync(new Recipe { Name = "Temporary recipe", Category = "other" });
        await database.RestoreFromAsync(backupPath);

        var recipes = await database.GetAllRecipesAsync();
        Assert.Contains(recipes, item => item.Name == "Bean stew");
        Assert.DoesNotContain(recipes, item => item.Name == "Temporary recipe");
    }

    private DatabaseService CreateDatabase()
    {
        Directory.CreateDirectory(_testDirectory);
        return new DatabaseService(NullLogger<DatabaseService>.Instance, Path.Combine(_testDirectory, "dms.db"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_testDirectory)) Directory.Delete(_testDirectory, recursive: true);
    }
}

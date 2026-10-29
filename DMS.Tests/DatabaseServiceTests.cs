using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseServiceTests : IDisposable
{
    private readonly string _testDirectory = Path.Combine(Path.GetTempPath(), "DMS.Tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public void PositionedTemplateBuildsLargeEmbeddedImageWithoutDroppingLayers()
    {
        var template = new MenuTemplate();
        TemplateLayout.EnsureInitialized(template);
        template.ImageLayers.Add(new TemplateImageLayer { DataUri = "data:image/png;base64," + new string('A', 2_000_000) });
        var html = MenuOutputService.BuildHtml(template, new DateTime(2026, 10, 26), [], []);
        Assert.Contains("data:image/png;base64,", html);
        Assert.True(html.Length > 1_900_000);
    }

    [Fact]
    public void PositionedTemplateExportsSavedGeometryLayersAndStylesWithoutMutatingSource()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { LayoutEnabled = true, HeaderText = "<Weekly>", ShowIngredients = true };
        template.LayoutElements["header"] = new TemplateLayoutElement { X = 125, Y = 55, Width = 320, Height = 45, ZIndex = 12 };
        template.LayoutElements["menu:0"] = new TemplateLayoutElement { X = 80, Y = 200, Width = 500, Height = 160 };
        template.TextStyles["menu:0"] = new TemplateTextStyle { FontFamily = "Georgia", FontSize = 16, Color = "#123456" };
        template.ImageLayers.Add(new TemplateImageLayer { DataUri = "data:image/png;base64,AAAA", X = 33, Y = 44, Width = 150, Height = 80, ZIndex = 2, Opacity = .5 });
        template.ImageLayers.Add(new TemplateImageLayer { DataUri = "https://example.invalid/image.png" });
        var saved = System.Text.Json.JsonSerializer.Deserialize<MenuTemplate>(System.Text.Json.JsonSerializer.Serialize(template))!;
        var recipes = new List<Recipe> { new() { Id = 7, Name = "Stew <unsafe>", Ingredients = ["Beans"] } };
        var entries = new List<MenuEntry> { new() { Date = monday, Slot = "slot2", RecipeId = 7 } };
        var html = MenuOutputService.BuildHtml(saved, monday, entries, recipes);
        Assert.Contains("data-element=\"header\" style=\"position:absolute;left:125px;top:55px;width:320px;min-height:45px;z-index:12", html);
        Assert.Contains("data-element=\"menu:0\" style=\"position:absolute;left:80px;top:200px;width:500px;min-height:160px", html);
        Assert.Contains("left:33px;top:44px;width:150px;height:80px;z-index:2;opacity:0.5", html);
        Assert.Contains("font-family:'Georgia';font-size:16px;color:#123456", html);
        Assert.Contains("&lt;Weekly&gt;", html);
        Assert.Contains("Stew &lt;unsafe&gt;", html);
        Assert.DoesNotContain("example.invalid", html);
        Assert.Equal(2, saved.LayoutElements.Count); // Missing positions use defaults without mutating the template.
    }

    [Fact]
    public void PositionedTemplateClampsUntrustedCoordinatesAndColors()
    {
        var template = new MenuTemplate { LayoutEnabled = true };
        template.LayoutElements["header"] = new TemplateLayoutElement { X = double.NaN, Y = -20, Width = 9000, Height = 40, ZIndex = int.MaxValue };
        template.TextStyles["header"] = new TemplateTextStyle { FontFamily = "bad'font", Color = "red;bad", FontSize = 9999 };
        var html = MenuOutputService.BuildHtml(template, new DateTime(2026, 10, 26), [], []);
        Assert.Contains("left:0px;top:0px;width:794px;min-height:40px;z-index:1000", html);
        Assert.Contains("font-family:'Arial';font-size:72px;color:#000000", html);
        Assert.DoesNotContain("bad'font", html);
        Assert.DoesNotContain("red;bad", html);
    }

    [Fact]
    public void PositionedTemplateMarksContentThatExceedsAdaptiveMenuLimit()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { LayoutEnabled = true, MenuBlockSizing = new TemplateMenuBlockSizing { Enabled = true, MinimumHeight = 40, MaximumHeight = 50 } };
        template.LayoutElements["menu:0"] = new TemplateLayoutElement { X = 40, Y = 165, Width = 100, Height = 135 };
        var recipe = new Recipe { Id = 7, Name = new string('W', 500), Ingredients = [new string('I', 500)] };
        var html = MenuOutputService.BuildHtml(template, monday, [new MenuEntry { Date = monday, Slot = "slot1", RecipeId = 7 }], [recipe]);
        Assert.Contains("data-element=\"menu:0\" data-layout-overflow=\"true\"", html);
        Assert.Contains("min-height:50px", html);
    }

    [Fact]
    public void PositionedMenuShrinkScalesTextAndReportsOverflowAtMinimumScale()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { LayoutEnabled = true, MenuBlockSizing = new TemplateMenuBlockSizing { Mode = "shrink", MinimumFontScale = .75 } };
        template.LayoutElements["menu:0"] = new TemplateLayoutElement { X = 40, Y = 165, Width = 100, Height = 40 };
        template.TextStyles["menu:0"] = new TemplateTextStyle { FontSize = 20 };
        var entry = new MenuEntry { Date = monday, Slot = "slot1", RecipeId = 7 };
        var html = MenuOutputService.BuildHtml(template, monday, [entry], [new Recipe { Id = 7, Name = new string('W', 300) }]);
        Assert.Contains("font-size:15px", html);
        Assert.Contains("data-element=\"menu:0\" data-layout-overflow=\"true\"", html);
    }

    [Fact]
    public void FlexibleMenuWarnsWhenLongContentWouldReachFooter()
    {
        var monday = new DateTime(2026, 10, 26);
        var template = new MenuTemplate { LayoutEnabled = true, MenuBlockSizing = new TemplateMenuBlockSizing { Mode = "flexible", MinimumHeight = 40, MaximumHeight = 200 } };
        template.LayoutElements["menu:0"] = new TemplateLayoutElement { X = 40, Y = 900, Width = 200, Height = 100 };
        template.LayoutElements["footer"] = new TemplateLayoutElement { X = 40, Y = 990, Width = 200, Height = 30 };
        var entry = new MenuEntry { Date = monday, Slot = "slot1", RecipeId = 7 };
        var html = MenuOutputService.BuildHtml(template, monday, [entry], [new Recipe { Id = 7, Name = new string('W', 500) }]);
        Assert.Contains("data-element=\"menu:0\" data-layout-overflow=\"true\"", html);
        Assert.Contains("min-height:90px", html);
        Assert.Contains("data-element=\"footer\"", html);
    }

    [Fact]
    public void WeekendOutputIsIncludedOnlyWhenTemplateEnablesIt()
    {
        var monday = new DateTime(2026, 10, 26);
        var entry = new MenuEntry { Date = monday.AddDays(5), Slot = "slot1", RecipeId = 7 };
        var recipes = new[] { new Recipe { Id = 7, Name = "Weekend recipe" } };
        var template = new MenuTemplate { LayoutEnabled = true };
        Assert.DoesNotContain("Weekend recipe", MenuOutputService.BuildHtml(template, monday, [entry], recipes));
        template.IncludeWeekend = true;
        var html = MenuOutputService.BuildHtml(template, monday, [entry], recipes);
        Assert.Contains("Weekend recipe", html);
        Assert.Contains("data-element=\"heading:5\"", html);
        Assert.Contains("data-element=\"heading:6\"", html);
    }

    [Fact]
    public void AdditionalTextLayersAreSafelyEncodedInPositionedOutput()
    {
        var template = new MenuTemplate { LayoutEnabled = true };
        template.TextLayers.Add(new TemplateTextLayer { Id = "note", Text = "<note>", X = 20, Y = 30, Style = new TemplateTextStyle { Color = "#123456" } });
        var html = MenuOutputService.BuildHtml(template, new DateTime(2026, 10, 26), [], []);
        Assert.Contains("data-element=\"text:note\"", html);
        Assert.Contains("&lt;note&gt;", html);
        Assert.Contains("color:#123456", html);
    }

    [Fact]
    public void PositionedTemplateAppliesOnlySafeSavedBlockAppearance()
    {
        var template = new MenuTemplate { LayoutEnabled = true };
        template.BlockAppearances["header"] = new TemplateBlockAppearance { BackgroundColor = "#123456", BorderColor = "#abcdef", BorderThickness = 2, CornerRadius = 8, Padding = 6, Opacity = .7 };
        template.BlockAppearances["date"] = new TemplateBlockAppearance { BackgroundColor = "bad;css", BorderColor = "red", BorderThickness = 99, CornerRadius = -1, Padding = double.NaN, Opacity = 99 };
        var html = MenuOutputService.BuildHtml(template, new DateTime(2026, 10, 26), [], []);
        Assert.Contains("background-color:#123456;border:2px solid #abcdef;border-radius:8px;padding:6px;opacity:0.7", html);
        Assert.Contains("background-color:transparent;border:20px solid transparent;border-radius:0px;padding:0px;opacity:1", html);
        Assert.DoesNotContain("bad;css", html);
    }

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

    [Theory]
    [InlineData("default")]
    [InlineData("light")]
    [InlineData("dark")]
    [InlineData("system")]
    public async Task ThemeAndCustomAccentSurviveDatabaseReopen(string theme)
    {
        using (var database = CreateDatabase())
            await database.SaveSettingsAsync(new AppSettings { Theme = theme, AccentColor = "teal" });

        using var reopened = CreateDatabase();
        var settings = await reopened.GetSettingsAsync();
        Assert.Equal(theme, settings!.Theme);
        Assert.Equal("teal", settings.AccentColor);
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

using DMS.Models;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class PlannerMutationTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.Planner.Tests", Guid.NewGuid().ToString("N"));
    private readonly DateTime _day = new(2026, 10, 26);
    private string PathForDb => Path.Combine(_folder, "planner.db");
    private DatabaseService Open() { Directory.CreateDirectory(_folder); return new(NullLogger<DatabaseService>.Instance, PathForDb); }

    [Fact]
    public async Task CustomizedDefaultAllergenAppearanceSurvivesRestart()
    {
        using (var database = Open())
        {
            var allergen = (await database.GetAllAllergensAsync()).Single(item => item.Name == "глутен");
            allergen.Icon = "⚠️";
            allergen.Color = "#3498db";
            await database.SaveAllergenAsync(allergen);
        }
        using var reopened = Open();
        var saved = (await reopened.GetAllAllergensAsync()).Single(item => item.Name == "глутен");
        Assert.Equal("⚠️", saved.Icon);
        Assert.Equal("#3498db", saved.Color);
    }

    [Fact]
    public async Task LegacyAllergenIconMigrationKeepsExistingColor()
    {
        using (var database = Open()) await database.InitializeAsync();
        using (var connection = new SqliteConnection($"Data Source={PathForDb};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "UPDATE allergens SET color='#123456' WHERE name='глутен'; ALTER TABLE allergens DROP COLUMN icon";
            command.ExecuteNonQuery();
        }
        using var reopened = Open();
        var allergen = (await reopened.GetAllAllergensAsync()).Single(item => item.Name == "глутен");
        Assert.Equal("🌾", allergen.Icon);
        Assert.Equal("#123456", allergen.Color);
    }

    [Fact]
    public async Task MealConfigurationPersistsWithoutChangingSavedCategoryIds()
    {
        using (var database = Open())
        {
            var settings = (await database.GetSettingsAsync())!;
            Assert.Equal(4, settings.MealsPerDay);
            Assert.Equal(new[] { "soup", "main", "dessert", "other" }, settings.MealCategories.Select(c => c.Id));
            var recipeId = await database.SaveRecipeAsync(new Recipe { Name = "Soup", Category = "soup" });
            await database.SaveMenuSlotAsync(_day, "slot6", "soup", recipeId);
            settings.MealsPerDay = 6;
            settings.MealCategories[0].Name = "Breakfast";
            settings.MealCategories.Add(new MealCategory { Id = "custom-snack", Name = "Snack" });
            await database.SaveSettingsAsync(settings);
        }
        using var reopened = Open();
        var restored = (await reopened.GetSettingsAsync())!;
        Assert.Equal(6, restored.MealsPerDay);
        Assert.Equal("Breakfast", restored.MealCategories.Single(c => c.Id == "soup").Name);
        Assert.Equal("Snack", restored.MealCategories.Single(c => c.Id == "custom-snack").Name);
        Assert.Equal("soup", (await reopened.GetAllRecipesAsync()).Single().Category);
        Assert.Equal("soup", (await reopened.GetMenuCategoriesAsync(_day, _day)).Single().Category);
        Assert.Equal("slot6", (await reopened.GetMenuAsync(_day, _day)).Single().Slot);
    }

    [Fact]
    public void NumberedSlotsSortNumerically()
    {
        Assert.Equal(new[] { "slot1", "slot2", "slot10" }, new[] { "slot10", "slot2", "slot1" }.OrderBy(MenuOutputService.SlotOrder));
        Assert.True(MenuOutputService.IsVisibleSlot("slot4", 4));
        Assert.False(MenuOutputService.IsVisibleSlot("slot5", 4));
        Assert.True(MenuOutputService.IsVisibleSlot("Breakfast", 4));
    }

    [Fact]
    public async Task InvalidCategorySettingsAreNotSilentlyReplaced()
    {
        using var database = Open();
        await database.InitializeAsync();
        using (var connection = new SqliteConnection($"Data Source={PathForDb};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES ('meal_categories', 'invalid json')";
            command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<InvalidDataException>(() => database.GetSettingsAsync());
    }

    [Fact]
    public async Task SavingEmptyCategoriesIsRejectedWithoutChangingSettings()
    {
        using var database = Open();
        var settings = (await database.GetSettingsAsync())!;
        settings.MealsPerDay = 7;
        settings.MealCategories.Clear();
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveSettingsAsync(settings));
        var restored = (await database.GetSettingsAsync())!;
        Assert.Equal(4, restored.MealsPerDay);
        Assert.Equal(4, restored.MealCategories.Count);
    }

    [Fact]
    public async Task MealSettingsSaveRollsBackWhenCategoryWriteFails()
    {
        using var database = Open();
        var settings = (await database.GetSettingsAsync())!;
        settings.MealsPerDay = 7;
        using (var connection = new SqliteConnection($"Data Source={PathForDb};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "CREATE TRIGGER reject_categories BEFORE INSERT ON settings WHEN NEW.key='meal_categories' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END";
            command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<SqliteException>(() => database.SaveSettingsAsync(settings));
        Assert.Equal(4, (await database.GetSettingsAsync())!.MealsPerDay);
    }

    [Fact]
    public async Task CategoryRangeIncludesBothBoundariesAndKeepsSlotsDistinct()
    {
        using var database = Open();
        await database.SaveMenuSlotAsync(_day.AddDays(-1), "slot1", "other", null);
        await database.SaveMenuSlotAsync(_day, "slot1", "soup", null);
        await database.SaveMenuSlotAsync(_day, "slot2", "main", null);
        await database.SaveMenuSlotAsync(_day.AddDays(6), "slot1", "dessert", null);
        await database.SaveMenuSlotAsync(_day.AddDays(7), "slot1", "other", null);

        var categories = await database.GetMenuCategoriesAsync(_day.AddHours(12), _day.AddDays(6).AddHours(23));

        Assert.Collection(categories,
            item => { Assert.Equal(_day, item.Date); Assert.Equal("slot1", item.Slot); Assert.Equal("soup", item.Category); },
            item => { Assert.Equal(_day, item.Date); Assert.Equal("slot2", item.Slot); Assert.Equal("main", item.Category); },
            item => { Assert.Equal(_day.AddDays(6), item.Date); Assert.Equal("slot1", item.Slot); Assert.Equal("dessert", item.Category); });
        Assert.Empty(await database.GetMenuCategoriesAsync(_day.AddDays(1), _day.AddDays(5)));
    }

    [Fact]
    public async Task ReplacingExistingSlotSavesCategoryAndMealAcrossReopen()
    {
        using (var database = Open())
        {
            var original = await database.SaveRecipeAsync(new Recipe { Name = "Before", Category = "soup" });
            var replacement = await database.SaveRecipeAsync(new Recipe { Name = "After", Category = "main" });
            await database.SaveMenuSlotAsync(_day, "Breakfast", "soup", original);
            await database.SaveMenuSlotAsync(_day, "slot1", "main", replacement, "Breakfast");
            var entry = Assert.Single(await database.GetMenuAsync(_day, _day));
            Assert.Equal("slot1", entry.Slot);
            Assert.Equal(replacement, entry.RecipeId);
            Assert.Equal("main", (await database.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
        }
        using var reopened = Open();
        Assert.Equal("slot1", Assert.Single(await reopened.GetMenuAsync(_day, _day)).Slot);
        Assert.Equal("main", (await reopened.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
    }

    [Fact]
    public async Task MealInsertFailureRollsBackCategoryAndPreservesOldSlot()
    {
        using var database = Open();
        var original = await database.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        var replacement = await database.SaveRecipeAsync(new Recipe { Name = "Replacement", Category = "main" });
        await database.SaveMenuSlotAsync(_day, "Breakfast", "soup", original);
        await database.SaveMenuSlotAsync(_day, "slot1", "soup", null);
        using (var connection = new SqliteConnection($"Data Source={PathForDb};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "CREATE TRIGGER reject_slot BEFORE INSERT ON menu BEGIN SELECT RAISE(ABORT, 'simulated failure'); END";
            command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<SqliteException>(() => database.SaveMenuSlotAsync(_day, "slot1", "main", replacement, "Breakfast"));
        var entry = Assert.Single(await database.GetMenuAsync(_day, _day));
        Assert.Equal("Breakfast", entry.Slot);
        Assert.Equal(original, entry.RecipeId);
        Assert.Equal("soup", (await database.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
        using var reopened = Open();
        Assert.Equal(original, Assert.Single(await reopened.GetMenuAsync(_day, _day)).RecipeId);
        Assert.Equal("soup", (await reopened.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
    }

    [Fact]
    public async Task ExistingSlotRemovalFailureRollsBackNewAssignmentAndCategory()
    {
        using var database = Open();
        var original = await database.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        var replacement = await database.SaveRecipeAsync(new Recipe { Name = "Replacement", Category = "main" });
        await database.SaveMenuSlotAsync(_day, "Breakfast", "soup", original);
        await database.SaveMenuSlotAsync(_day, "slot1", "soup", null);
        using (var connection = new SqliteConnection($"Data Source={PathForDb};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "CREATE TRIGGER reject_existing_delete BEFORE DELETE ON menu WHEN OLD.slot='Breakfast' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END";
            command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<SqliteException>(() => database.SaveMenuSlotAsync(_day, "slot1", "main", replacement, "Breakfast"));
        var entry = Assert.Single(await database.GetMenuAsync(_day, _day));
        Assert.Equal("Breakfast", entry.Slot);
        Assert.Equal(original, entry.RecipeId);
        Assert.Equal("soup", (await database.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
    }

    [Fact]
    public async Task ClearingExistingSlotKeepsCategoryAndMissingRecipeDoesNotChangeData()
    {
        using var database = Open();
        var original = await database.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await database.SaveMenuSlotAsync(_day, "Breakfast", "soup", original);
        await database.SaveMenuSlotAsync(_day, "slot1", "soup", null);
        await Assert.ThrowsAsync<InvalidOperationException>(() => database.SaveMenuSlotAsync(_day, "slot1", "dessert", int.MaxValue, "Breakfast"));
        Assert.Equal("soup", (await database.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
        Assert.Single(await database.GetMenuAsync(_day, _day));
        await database.SaveMenuSlotAsync(_day, "slot1", "dessert", null, "Breakfast");
        Assert.Empty(await database.GetMenuAsync(_day, _day));
        Assert.Equal("dessert", (await database.GetMenuCategoriesAsync(_day, _day)).Single(item => item.Slot == "slot1").Category);
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}

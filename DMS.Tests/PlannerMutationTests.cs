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
    public async Task ReplacingLegacySlotSavesCategoryAndMealAcrossReopen()
    {
        using (var database = Open())
        {
            var original = await database.SaveRecipeAsync(new Recipe { Name = "Before", Category = "soup" });
            var replacement = await database.SaveRecipeAsync(new Recipe { Name = "After", Category = "main" });
            await database.SaveMenuEntryAsync(new MenuEntry { Date = _day, Slot = "Breakfast", RecipeId = original });
            await database.SaveMenuSlotAsync(_day, "slot1", "main", replacement, "Breakfast");
            var entry = Assert.Single(await database.GetMenuAsync(_day, _day));
            Assert.Equal("slot1", entry.Slot);
            Assert.Equal(replacement, entry.RecipeId);
            Assert.Equal("main", await database.GetMenuCategoryAsync(_day, "slot1"));
        }
        using var reopened = Open();
        Assert.Equal("slot1", Assert.Single(await reopened.GetMenuAsync(_day, _day)).Slot);
        Assert.Equal("main", await reopened.GetMenuCategoryAsync(_day, "slot1"));
    }

    [Fact]
    public async Task MealInsertFailureRollsBackCategoryAndPreservesOldSlot()
    {
        using var database = Open();
        var original = await database.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        var replacement = await database.SaveRecipeAsync(new Recipe { Name = "Replacement", Category = "main" });
        await database.SaveMenuEntryAsync(new MenuEntry { Date = _day, Slot = "Breakfast", RecipeId = original });
        await database.SaveMenuCategoryAsync(_day, "slot1", "soup");
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
        Assert.Equal("soup", await database.GetMenuCategoryAsync(_day, "slot1"));
        using var reopened = Open();
        Assert.Equal(original, Assert.Single(await reopened.GetMenuAsync(_day, _day)).RecipeId);
        Assert.Equal("soup", await reopened.GetMenuCategoryAsync(_day, "slot1"));
    }

    [Fact]
    public async Task LegacyRemovalFailureRollsBackNewAssignmentAndCategory()
    {
        using var database = Open();
        var original = await database.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        var replacement = await database.SaveRecipeAsync(new Recipe { Name = "Replacement", Category = "main" });
        await database.SaveMenuEntryAsync(new MenuEntry { Date = _day, Slot = "Breakfast", RecipeId = original });
        await database.SaveMenuCategoryAsync(_day, "slot1", "soup");
        using (var connection = new SqliteConnection($"Data Source={PathForDb};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "CREATE TRIGGER reject_legacy_delete BEFORE DELETE ON menu WHEN OLD.slot='Breakfast' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END";
            command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<SqliteException>(() => database.SaveMenuSlotAsync(_day, "slot1", "main", replacement, "Breakfast"));
        var entry = Assert.Single(await database.GetMenuAsync(_day, _day));
        Assert.Equal("Breakfast", entry.Slot);
        Assert.Equal(original, entry.RecipeId);
        Assert.Equal("soup", await database.GetMenuCategoryAsync(_day, "slot1"));
    }

    [Fact]
    public async Task ClearingLegacySlotKeepsCategoryAndMissingRecipeDoesNotChangeData()
    {
        using var database = Open();
        var original = await database.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await database.SaveMenuEntryAsync(new MenuEntry { Date = _day, Slot = "Breakfast", RecipeId = original });
        await database.SaveMenuCategoryAsync(_day, "slot1", "soup");
        await Assert.ThrowsAsync<InvalidOperationException>(() => database.SaveMenuSlotAsync(_day, "slot1", "dessert", int.MaxValue, "Breakfast"));
        Assert.Equal("soup", await database.GetMenuCategoryAsync(_day, "slot1"));
        Assert.Single(await database.GetMenuAsync(_day, _day));
        await database.SaveMenuSlotAsync(_day, "slot1", "dessert", null, "Breakfast");
        Assert.Empty(await database.GetMenuAsync(_day, _day));
        Assert.Equal("dessert", await database.GetMenuCategoryAsync(_day, "slot1"));
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}

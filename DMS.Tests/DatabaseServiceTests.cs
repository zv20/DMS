using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseServiceTests : IDisposable
{
    private readonly string _testDirectory = Path.Combine(Path.GetTempPath(), "DMS.Tests", Guid.NewGuid().ToString("N"));

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

using DMS.Models;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseRestoreSafetyTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.Restore.Tests", Guid.NewGuid().ToString("N"));
    private string PathFor(string name) => Path.Combine(_folder, name);
    private DatabaseService Open(string name) { Directory.CreateDirectory(_folder); return new(NullLogger<DatabaseService>.Instance, PathFor(name)); }

    [Fact]
    public async Task InvalidBackupsLeaveCurrentDataIntact()
    {
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        await File.WriteAllTextAsync(PathFor("invalid.db"), "not a database");
        await Assert.ThrowsAnyAsync<Exception>(() => current.RestoreFromAsync(PathFor("invalid.db")));
        using (var other = new SqliteConnection($"Data Source={PathFor("other.db")};Pooling=False"))
        {
            other.Open(); using var command = other.CreateCommand(); command.CommandText = "CREATE TABLE unrelated (id INTEGER)"; command.ExecuteNonQuery();
        }
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("other.db")));
        await Assert.ThrowsAsync<InvalidOperationException>(() => current.RestoreFromAsync(PathFor("current.db")));
        Assert.Equal("Keep", Assert.Single(await current.GetAllRecipesAsync()).Name);
        Assert.False(Directory.Exists(PathFor("RestoreBackups")));
    }

    [Fact]
    public async Task NewerDatabaseVersionIsRejectedWithoutChangingCurrentData()
    {
        using (var newer = Open("newer.db")) await newer.InitializeAsync();
        using (var connection = new SqliteConnection($"Data Source={PathFor("newer.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand(); command.CommandText = "PRAGMA user_version=999"; command.ExecuteNonQuery();
        }
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
        await Assert.ThrowsAsync<InvalidDataException>(() => current.RestoreFromAsync(PathFor("newer.db")));
        Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task RestoreCreatesUsableRecoveryBackupAndCopiesSavedImages()
    {
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
        string assetId;
        using (var from = Open("source.db"))
        {
            await from.SaveRecipeAsync(new Recipe { Name = "Restored", Category = "soup" });
            assetId = (await from.SaveTemplateImageAsync("Logo", "image/png", png)).Id;
            await from.SaveTemplateAsync(new MenuTemplate { Name = "Menu", Document = new TemplateDocument { DecorativeImages = [new TemplateImage { AssetId = assetId }] } });
            await from.CreateBackupAsync(PathFor("backup.db"));
        }
        using (var current = Open("current.db"))
        {
            await current.SaveRecipeAsync(new Recipe { Name = "Before", Category = "soup" });
            await current.RestoreFromAsync(PathFor("backup.db"));
            Assert.Equal("Restored", Assert.Single(await current.GetAllRecipesAsync()).Name);
            Assert.Equal(png, (await current.GetTemplateImageAsync(assetId))!.Data);
            Assert.Equal(new[] { "Menu" }, await current.GetTemplateImageUsageAsync(assetId));
        }
        var recovery = Assert.Single(Directory.GetFiles(PathFor("RestoreBackups"), "*.db"));
        using var previous = new DatabaseService(NullLogger<DatabaseService>.Instance, recovery);
        Assert.Equal("Before", Assert.Single(await previous.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task FailureAfterReplacementRestoresPreviousDatabase()
    {
        using (var source = Open("source.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "Source", Category = "soup" });
        }
        using (var connection = new SqliteConnection($"Data Source={PathFor("source.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "CREATE TRIGGER fail_settings BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'simulated migration failure'); END";
            command.ExecuteNonQuery();
        }
        using (var current = Open("current.db"))
        {
            await current.SaveRecipeAsync(new Recipe { Name = "Original", Category = "soup" });
            var error = await Assert.ThrowsAsync<InvalidOperationException>(() => current.RestoreFromAsync(PathFor("source.db")));
            Assert.Contains("previous database was recovered", error.Message);
            Assert.Equal("Original", Assert.Single(await current.GetAllRecipesAsync()).Name);
        }
        using var reopened = Open("current.db");
        Assert.Equal("Original", Assert.Single(await reopened.GetAllRecipesAsync()).Name);
        Assert.Single(Directory.GetFiles(PathFor("RestoreBackups"), "*.db"));
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}

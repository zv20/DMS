using DMS.Models;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class DatabaseRecoveryMarkerTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.Recovery.Tests", Guid.NewGuid().ToString("N"));
    private string PathFor(string name) => Path.Combine(_folder, name);
    private DatabaseService Open(string name) { Directory.CreateDirectory(_folder); return new(NullLogger<DatabaseService>.Instance, PathFor(name)); }

    [Fact]
    public async Task MarkerStopsDatabaseOpeningAndProvidesRecoveryInstructions()
    {
        using var active = Open("current.db");
        await active.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        var recoveryPath = PathFor("recovery.db");
        File.WriteAllText(PathFor("current.db.recovery-required"), recoveryPath);
        await Assert.ThrowsAsync<DatabaseRecoveryRequiredException>(() => active.GetAllRecipesAsync());
        using (var database = Open("current.db"))
        {
            var error = await Assert.ThrowsAsync<DatabaseRecoveryRequiredException>(() => database.GetAllRecipesAsync());
            Assert.Equal(recoveryPath, error.RecoveryPath);
            Assert.Contains(PathFor("current.db"), error.Message);
            Assert.Contains(recoveryPath, error.Message);
            Assert.Contains(error.MarkerPath, error.Message);
        }
        using var connection = new SqliteConnection($"Data Source={PathFor("current.db")};Pooling=False;Mode=ReadOnly");
        connection.Open(); using var command = connection.CreateCommand();
        command.CommandText = "SELECT name FROM recipes";
        Assert.Equal("Keep", command.ExecuteScalar());
    }

    [Fact]
    public async Task SuccessfulRestoreRemovesMarkerAndRetainsRecoveryCopy()
    {
        using var current = Open("current.db");
        await current.SaveRecipeAsync(new Recipe { Name = "Before", Category = "soup" });
        using (var source = Open("source.db"))
        {
            await source.SaveRecipeAsync(new Recipe { Name = "After", Category = "soup" });
            await source.CreateBackupAsync(PathFor("backup.db"));
        }
        await current.RestoreFromAsync(PathFor("backup.db"));
        Assert.False(File.Exists(PathFor("current.db.recovery-required")));
        Assert.Equal("After", Assert.Single(await current.GetAllRecipesAsync()).Name);
        Assert.Single(Directory.GetFiles(PathFor("RestoreBackups"), "*.db"));
    }

    [Fact]
    public async Task MarkerWriteFailureDoesNotReplaceCurrentDatabase()
    {
        using var database = Open("current.db");
        await database.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        using (var backupSource = Open("source.db"))
        {
            await backupSource.SaveRecipeAsync(new Recipe { Name = "Other", Category = "soup" });
            await backupSource.CreateBackupAsync(PathFor("backup.db"));
        }
        Directory.CreateDirectory(PathFor("current.db.recovery-required"));
        await Assert.ThrowsAnyAsync<Exception>(() => database.RestoreFromAsync(PathFor("backup.db")));
        Assert.Equal("Keep", Assert.Single(await database.GetAllRecipesAsync()).Name);
    }

    [Fact]
    public async Task FailedReplacementAndFailedRecoveryLeaveMarkerAndIntactBackup()
    {
        using (var database = Open("current.db"))
            await database.SaveRecipeAsync(new Recipe { Name = "Keep", Category = "soup" });
        using (var source = Open("source.db"))
            await source.SaveRecipeAsync(new Recipe { Name = "Other", Category = "soup" });
        foreach (var file in new[] { "current.db", "source.db" })
        {
            using var connection = new SqliteConnection($"Data Source={PathFor(file)};Pooling=False");
            connection.Open(); using var command = connection.CreateCommand();
            command.CommandText = "CREATE TRIGGER fail_settings BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'simulated migration failure'); END";
            command.ExecuteNonQuery();
        }
        // Open an already initialized service, then add a trigger to the live
        // database so the recovery copy deliberately cannot initialize either.
        using var current = Open("current.db");
        // Existing triggers would prevent initialization; open and remove it first.
        using (var connection = new SqliteConnection($"Data Source={PathFor("current.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand(); command.CommandText = "DROP TRIGGER fail_settings"; command.ExecuteNonQuery();
        }
        await current.InitializeAsync();
        using (var connection = new SqliteConnection($"Data Source={PathFor("current.db")};Pooling=False"))
        {
            connection.Open(); using var command = connection.CreateCommand(); command.CommandText = "CREATE TRIGGER fail_settings BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'simulated migration failure'); END"; command.ExecuteNonQuery();
        }
        var error = await Assert.ThrowsAsync<DatabaseRecoveryRequiredException>(() => current.RestoreFromAsync(PathFor("source.db")));
        Assert.True(File.Exists(error.MarkerPath));
        Assert.True(File.Exists(error.RecoveryPath));
        using var blocked = Open("current.db");
        var blockedError = await Assert.ThrowsAsync<DatabaseRecoveryRequiredException>(() => blocked.GetAllRecipesAsync());
        Assert.Equal(error.RecoveryPath, blockedError.RecoveryPath);
        using var recovery = new SqliteConnection($"Data Source={error.RecoveryPath};Pooling=False;Mode=ReadOnly");
        recovery.Open(); using var read = recovery.CreateCommand(); read.CommandText = "SELECT name FROM recipes";
        Assert.Equal("Keep", read.ExecuteScalar());
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}

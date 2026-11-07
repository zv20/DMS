using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class AutomaticBackupTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.AutoBackup.Tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task RetainsThreeRestorableSnapshotsAndLeavesOtherFilesAlone()
    {
        Directory.CreateDirectory(_folder);
        var path = Path.Combine(_folder, "dms.db");
        using var database = new DatabaseService(NullLogger<DatabaseService>.Instance, path);
        var backupFolder = Path.Combine(_folder, "AutomaticBackups");
        Directory.CreateDirectory(backupFolder);
        var unrelated = Path.Combine(backupFolder, "DMS-auto-manual.db");
        await File.WriteAllTextAsync(unrelated, "keep");
        for (var i = 1; i <= 4; i++)
        {
            await database.SaveRecipeAsync(new Recipe { Name = $"Recipe {i}", Category = "soup" });
            await AutomaticBackup.CreateAsync(database);
        }
        var backups = Directory.GetFiles(backupFolder, "DMS-auto-*.db").Where(file => file != unrelated).OrderBy(file => file).ToArray();
        Assert.Equal(3, backups.Length);
        Assert.True(File.Exists(unrelated));
        using var restored = new DatabaseService(NullLogger<DatabaseService>.Instance, Path.Combine(_folder, "restored.db"));
        await restored.RestoreFromAsync(backups[^1]);
        Assert.Equal(4, (await restored.GetAllRecipesAsync()).Count);
    }

    [Fact]
    public async Task FailedBackupPreservesExistingSnapshots()
    {
        Directory.CreateDirectory(_folder);
        var path = Path.Combine(_folder, "dms.db");
        using var database = new DatabaseService(NullLogger<DatabaseService>.Instance, path);
        await AutomaticBackup.CreateAsync(database);
        var folder = Path.Combine(_folder, "AutomaticBackups");
        var previous = Assert.Single(Directory.GetFiles(folder, "*.db"));
        await File.WriteAllTextAsync(path + ".recovery-required", "recovery.db");
        await Assert.ThrowsAnyAsync<Exception>(() => AutomaticBackup.CreateAsync(database));
        Assert.Equal(previous, Assert.Single(Directory.GetFiles(folder, "*.db")));
    }

    public void Dispose()
    {
        if (Directory.Exists(_folder)) Directory.Delete(_folder, true);
    }
}

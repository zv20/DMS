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
        var unrelated = Path.Combine(backupFolder, "DMS-auto-manual.dmsbackup");
        await File.WriteAllTextAsync(unrelated, "keep");
        for (var i = 1; i <= 4; i++)
        {
            await database.SaveRecipeAsync(new Recipe { Name = $"Recipe {i}", Category = "soup" });
            await AutomaticBackup.CreateAsync(database);
        }
        var backups = Directory.GetFiles(backupFolder, "DMS-auto-*.dmsbackup").Where(file => file != unrelated).OrderBy(file => file).ToArray();
        Assert.Equal(3, backups.Length);
        Assert.Empty(Directory.GetFiles(backupFolder, "*.tmp.dmsbackup"));
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
        var previous = Assert.Single(Directory.GetFiles(folder, "*.dmsbackup"));
        await File.WriteAllTextAsync(path + ".recovery-required", "recovery.db");
        await Assert.ThrowsAnyAsync<Exception>(() => AutomaticBackup.CreateAsync(database));
        Assert.Equal(previous, Assert.Single(Directory.GetFiles(folder, "*.dmsbackup")));
    }

    [Fact]
    public async Task MissingTemplateImageFailsWithoutCreatingAnIncompleteArchive()
    {
        Directory.CreateDirectory(_folder);
        var path = Path.Combine(_folder, "dms.db");
        string imageId;
        using var database = new DatabaseService(NullLogger<DatabaseService>.Instance, path);
        imageId = (await database.SaveTemplateImageAsync("Art", "image/png", Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII="))).Id;
        var imagePath = Path.Combine(_folder, "template-images", imageId + ".png");
        File.Delete(imagePath);

        var error = await Assert.ThrowsAsync<InvalidDataException>(() => AutomaticBackup.CreateAsync(database));

        Assert.Contains(imageId, error.Message, StringComparison.Ordinal);
        Assert.Contains(imagePath, error.Message, StringComparison.Ordinal);
        Assert.Empty(Directory.GetFiles(Path.Combine(_folder, "AutomaticBackups"), "*.dmsbackup"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_folder)) Directory.Delete(_folder, true);
    }
}

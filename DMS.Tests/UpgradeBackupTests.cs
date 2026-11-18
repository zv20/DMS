using Microsoft.Data.Sqlite;
using Xunit;

public class UpgradeBackupTests
{
    [Fact]
    public void InsufficientSpaceStopsBackup()
    {
        var error = Assert.Throws<IOException>(() => UpgradeBackup.EnsureSpace(99, 100));
        Assert.Contains("Not enough free space", error.Message);
        UpgradeBackup.EnsureSpace(100, 100);
    }

    [Fact]
    public void BackupIncludesCommittedWalDataAndPassesIntegrityCheck()
    {
        var folder = Path.Combine(Path.GetTempPath(), "dms-upgrade-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            var sourcePath = Path.Combine(folder, "source.db");
            using var source = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = sourcePath, Pooling = false }.ToString());
            source.Open();
            using (var command = source.CreateCommand())
            {
                command.CommandText = "PRAGMA journal_mode=WAL; CREATE TABLE sample (value BLOB); INSERT INTO sample VALUES (X'010203');";
                command.ExecuteNonQuery();
            }
            var path = UpgradeBackup.Create(sourcePath, Path.Combine(folder, "backups"));
            Assert.NotNull(path);
            var secondPath = UpgradeBackup.Create(sourcePath, Path.Combine(folder, "backups"));
            Assert.NotNull(secondPath);
            Assert.NotEqual(path, secondPath);
            Assert.True(File.Exists(path));
            using var backup = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
            backup.Open();
            using var read = backup.CreateCommand();
            read.CommandText = "SELECT hex(value) FROM sample";
            Assert.Equal("010203", read.ExecuteScalar());
            read.CommandText = "PRAGMA integrity_check";
            Assert.Equal("ok", read.ExecuteScalar());
        }
        finally { Directory.Delete(folder, recursive: true); }
    }

    [Fact]
    public void InvalidDatabaseFailsWithoutLeavingACompletedBackup()
    {
        var folder = Path.Combine(Path.GetTempPath(), "dms-upgrade-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            var source = Path.Combine(folder, "source.db");
            File.WriteAllText(source, "not a database");
            var backups = Path.Combine(folder, "backups");
            Assert.ThrowsAny<Exception>(() => UpgradeBackup.Create(source, backups));
            Assert.Empty(Directory.GetFiles(backups));
        }
        finally { Directory.Delete(folder, recursive: true); }
    }
}

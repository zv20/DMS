using Microsoft.Data.Sqlite;

internal static class UpgradeBackup
{
    internal static string? Create(string sourcePath, string backupDirectory)
    {
        try { _ = File.GetAttributes(sourcePath); }
        catch (FileNotFoundException) { return null; }
        catch (DirectoryNotFoundException) { return null; }
        Directory.CreateDirectory(backupDirectory);
        var root = Path.GetPathRoot(Path.GetFullPath(backupDirectory))
            ?? throw new IOException("Could not determine the backup drive.");
        var wal = sourcePath + "-wal";
        var required = checked(new FileInfo(sourcePath).Length + (File.Exists(wal) ? new FileInfo(wal).Length : 0) + 16L * 1024 * 1024);
        EnsureSpace(new DriveInfo(root).AvailableFreeSpace, required);
        var name = $"DMS-before-update-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}";
        var temporary = Path.Combine(backupDirectory, name + ".tmp");
        var completed = Path.Combine(backupDirectory, name + ".db");
        try
        {
            var sourceOptions = new SqliteConnectionStringBuilder { DataSource = sourcePath, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
            var destinationOptions = new SqliteConnectionStringBuilder { DataSource = temporary, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false };
            using (var source = new SqliteConnection(sourceOptions.ToString()))
            using (var destination = new SqliteConnection(destinationOptions.ToString()))
            {
                source.Open();
                destination.Open();
                source.BackupDatabase(destination);
                using var check = destination.CreateCommand();
                check.CommandText = "PRAGMA integrity_check";
                if (!string.Equals(Convert.ToString(check.ExecuteScalar()), "ok", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("The backup did not pass its integrity check.");
            }
            File.Move(temporary, completed);
            return completed;
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }

    internal static void EnsureSpace(long available, long required)
    {
        if (available < required)
            throw new IOException("Not enough free space to create the backup. Free space on the Documents drive and try again.");
    }
}

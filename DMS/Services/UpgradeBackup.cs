using System.Diagnostics;
using System.IO;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;

namespace DMS.Services;

internal static class UpgradeBackup
{
    internal static int Run()
    {
        try
        {
            using var current = Process.GetCurrentProcess();
            foreach (var process in Process.GetProcessesByName(current.ProcessName))
            {
                using (process)
                {
                    if (process.Id != current.Id)
                        throw new InvalidOperationException("Close DMS before updating, then try again.");
                }
            }

            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            if (string.IsNullOrWhiteSpace(appData))
                throw new InvalidOperationException("Windows could not locate the DMS data folder.");
            var database = Path.Combine(appData, "DMS", "dms.db");
            var documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            var backup = Create(database, string.IsNullOrWhiteSpace(documents) ? null : Path.Combine(documents, "DMS Backups"));
            if (backup != null)
                App.LogStore.Write(LogLevel.Information, nameof(UpgradeBackup), $"Created pre-update backup at {backup}");
            return 0;
        }
        catch (Exception ex)
        {
            App.LogStore.Write(LogLevel.Error, nameof(UpgradeBackup), "Could not create pre-update backup. Setup stopped.", ex);
            return 1;
        }
    }

    internal static string? Create(string sourcePath, string? backupDirectory)
    {
        try { _ = File.GetAttributes(sourcePath); }
        catch (FileNotFoundException) { return null; }
        catch (DirectoryNotFoundException) { return null; }
        if (backupDirectory == null)
            throw new IOException("Windows could not locate the Documents folder.");
        Directory.CreateDirectory(backupDirectory);
        var root = Path.GetPathRoot(Path.GetFullPath(backupDirectory))
            ?? throw new IOException("Could not determine the backup drive.");
        var wal = sourcePath + "-wal";
        var imageFolder = Path.Combine(Path.GetDirectoryName(sourcePath)!, "template-images");
        var imageBytes = Directory.Exists(imageFolder) ? Directory.EnumerateFiles(imageFolder).Sum(path => new FileInfo(path).Length) : 0;
        var required = checked(new FileInfo(sourcePath).Length + imageBytes + (File.Exists(wal) ? new FileInfo(wal).Length : 0) + 16L * 1024 * 1024);
        EnsureSpace(new DriveInfo(root).AvailableFreeSpace, required);
        var name = $"DMS-before-update-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}";
        var snapshot = Path.Combine(backupDirectory, name + ".snapshot.db");
        var archive = HasFileBackedImages(sourcePath);
        var temporary = Path.Combine(backupDirectory, name + (archive ? ".tmp.dmsbackup" : ".tmp"));
        var completed = Path.Combine(backupDirectory, name + (archive ? ".dmsbackup" : ".db"));
        try
        {
            var sourceOptions = new SqliteConnectionStringBuilder { DataSource = sourcePath, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
            var destinationOptions = new SqliteConnectionStringBuilder { DataSource = archive ? snapshot : temporary, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false };
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
            if (archive) DatabaseService.CreateArchiveFile(snapshot, imageFolder, temporary);
            File.Move(temporary, completed);
            return completed;
        }
        catch
        {
            AutomaticBackup.DeleteFailedBackup(temporary);
            throw;
        }
        finally
        {
            if (File.Exists(snapshot)) File.Delete(snapshot);
        }
    }

    internal static void EnsureSpace(long available, long required)
    {
        if (available < required)
            throw new IOException("Not enough free space to create the backup. Free space on the Documents drive and try again.");
    }

    private static bool HasFileBackedImages(string databasePath)
    {
        using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = databasePath, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name='template_image_assets'";
        if (Convert.ToInt32(command.ExecuteScalar()) == 0) return false;
        command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('template_image_assets') WHERE name='relative_path'";
        return Convert.ToInt32(command.ExecuteScalar()) != 0;
    }
}

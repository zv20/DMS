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

using System.IO;
using System.IO.Compression;

namespace DMS.Services;

internal static class AutomaticBackup
{
    private const string Prefix = "DMS-auto-";
    private const int RetainedCount = 3;

    internal static async Task CreateAsync(DatabaseService database)
    {
        var folder = Path.Combine(Path.GetDirectoryName(database.GetDatabasePath())!, "AutomaticBackups");
        Directory.CreateDirectory(folder);
        var name = $"{Prefix}{DateTime.UtcNow:yyyyMMddHHmmssfffffff}-{Guid.NewGuid():N}";
        var temporary = Path.Combine(folder, name + ".tmp.dmsbackup");
        var completed = Path.Combine(folder, name + ".dmsbackup");
        try
        {
            await database.CreateBackupAsync(temporary);
            using (var archive = ZipFile.OpenRead(temporary))
            {
                if (archive.GetEntry("manifest.json") == null || archive.GetEntry("dms.db") == null)
                    throw new InvalidDataException("Automatic backup archive is incomplete.");
            }
            File.Move(temporary, completed);
            // Only backups created by this feature are eligible for rotation.
            foreach (var old in Directory.EnumerateFiles(folder, Prefix + "*.dmsbackup")
                .Where(IsAutomaticBackup)
                .OrderByDescending(Path.GetFileName, StringComparer.Ordinal).Skip(RetainedCount))
                File.Delete(old);
        }
        catch
        {
            DeleteFailedBackup(temporary);
            throw;
        }
    }

    internal static void DeleteFailedBackup(string temporary)
    {
        try { File.Delete(temporary); }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            App.LogStore.Write(Microsoft.Extensions.Logging.LogLevel.Warning, nameof(AutomaticBackup),
                $"Could not delete incomplete backup at {temporary}", error);
        }
    }

    private static bool IsAutomaticBackup(string path)
    {
        var name = Path.GetFileNameWithoutExtension(path);
        if (name.Length != Prefix.Length + 21 + 1 + 32 || !name.StartsWith(Prefix, StringComparison.Ordinal)) return false;
        var suffix = name.AsSpan(Prefix.Length);
        return suffix[21] == '-' && suffix[..21].ToString().All(char.IsAsciiDigit) && Guid.TryParseExact(suffix[22..], "N", out _);
    }
}

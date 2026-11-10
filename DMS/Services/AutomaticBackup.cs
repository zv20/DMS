using Microsoft.Data.Sqlite;
using System.IO;

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
        var temporary = Path.Combine(folder, name + ".tmp");
        var completed = Path.Combine(folder, name + ".db");
        try
        {
            await database.CreateBackupAsync(temporary);
            var options = new SqliteConnectionStringBuilder { DataSource = temporary, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
            await using (var connection = new SqliteConnection(options.ToString()))
            {
                await connection.OpenAsync();
                using var command = connection.CreateCommand();
                command.CommandText = "PRAGMA integrity_check";
                if (!string.Equals(Convert.ToString(await command.ExecuteScalarAsync()), "ok", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("Automatic backup failed its integrity check.");
            }
            File.Move(temporary, completed);
            // Only backups created by this feature are eligible for rotation.
            foreach (var old in Directory.EnumerateFiles(folder, Prefix + "*.db")
                .Where(IsAutomaticBackup)
                .OrderByDescending(Path.GetFileName, StringComparer.Ordinal).Skip(RetainedCount))
                File.Delete(old);
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
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

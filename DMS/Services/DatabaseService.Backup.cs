using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;

namespace DMS.Services;

public partial class DatabaseService
{
    private const string ArchiveExtension = ".dmsbackup";
    private sealed record BackupImage(string Id, string ContentType, string RelativePath, long Length, string Sha256);
    private sealed record BackupManifest(int FormatVersion, List<BackupImage> Images);

    private async Task CreateArchiveBackupAsync(string destinationPath)
    {
        await InitializeAsync();
        var snapshotDirectory = Path.Combine(Path.GetTempPath(), "DMS-backup-" + Guid.NewGuid().ToString("N"));
        var temporaryArchive = destinationPath + ".tmp-" + Guid.NewGuid().ToString("N");
        Directory.CreateDirectory(snapshotDirectory);
        try
        {
            var snapshotPath = Path.Combine(snapshotDirectory, "dms.db");
            await using (var snapshot = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = snapshotPath, Pooling = false }.ToString()))
            {
                await snapshot.OpenAsync();
                _connection!.BackupDatabase(snapshot);
            }
            CreateArchiveFile(snapshotPath, TemplateImageDirectory, temporaryArchive);
            File.Move(temporaryArchive, destinationPath, overwrite: true);
            _logger.LogInformation("Created DMS archive backup at {Path}", destinationPath);
        }
        finally
        {
            if (File.Exists(temporaryArchive)) File.Delete(temporaryArchive);
            if (Directory.Exists(snapshotDirectory)) Directory.Delete(snapshotDirectory, recursive: true);
        }
    }

    internal static void CreateArchiveFile(string databasePath, string imageRoot, string destinationPath)
    {
        var images = ReadArchiveImages(databasePath, imageRoot);
        using var archive = ZipFile.Open(destinationPath, ZipArchiveMode.Create);
        WriteArchiveEntry(archive, "dms.db", databasePath);
        foreach (var image in images)
            WriteArchiveEntry(archive, image.RelativePath, Path.Combine(imageRoot, Path.GetFileName(image.RelativePath)));
        var manifest = archive.CreateEntry("manifest.json", CompressionLevel.Optimal);
        using var stream = manifest.Open();
        JsonSerializer.Serialize(stream, new BackupManifest(1, images));
    }

    private static List<BackupImage> ReadArchiveImages(string databasePath, string imageRoot)
    {
        using var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = databasePath, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id,content_type,relative_path FROM template_image_assets ORDER BY id";
        using var reader = command.ExecuteReader();
        var result = new List<BackupImage>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var contentType = reader.GetString(1);
            var relativePath = reader.GetString(2);
            if (!string.Equals(relativePath, RelativeImagePath(id, contentType), StringComparison.Ordinal))
                throw new InvalidDataException("Stored template image path is invalid.");
            var path = Path.Combine(imageRoot, Path.GetFileName(relativePath));
            var data = File.ReadAllBytes(path);
            if (data.Length is < 1 or > MaxImageBytes || !ValidImageSignature(contentType, data))
                throw new InvalidDataException("Stored template image file is invalid.");
            var hash = Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
            if (!string.Equals(id, hash, StringComparison.Ordinal))
                throw new InvalidDataException("Stored template image file hash is invalid.");
            result.Add(new BackupImage(id, contentType, relativePath, data.Length, hash));
        }
        return result;
    }

    private static void WriteArchiveEntry(ZipArchive archive, string entryName, string path)
    {
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        using var input = File.OpenRead(path);
        using var output = entry.Open();
        input.CopyTo(output);
    }

    private async Task RestoreArchiveAsync(string sourcePath)
    {
        var staging = Path.Combine(Path.GetTempPath(), "DMS-archive-restore-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(staging);
        try
        {
            var manifest = ExtractAndValidateArchive(sourcePath, staging);
            var databasePath = Path.Combine(staging, "dms.db");
            ValidateArchiveDatabase(databasePath, staging, manifest);
            var images = Path.Combine(staging, "template-images");
            Directory.CreateDirectory(images);
            // Do not remove the current image set before the database is restored.
            // Asset IDs are content hashes, so retaining images that the restored
            // database does not reference is harmless and keeps an interrupted
            // restore usable with its previous database.
            CopyDirectory(images, TemplateImageDirectory);
            await RestoreFromAsync(databasePath);
        }
        finally
        {
            if (Directory.Exists(staging)) Directory.Delete(staging, recursive: true);
        }
    }

    private static BackupManifest ExtractAndValidateArchive(string sourcePath, string staging)
    {
        using var archive = ZipFile.OpenRead(sourcePath);
        var entries = archive.Entries.ToDictionary(entry => entry.FullName, StringComparer.Ordinal);
        if (!entries.TryGetValue("manifest.json", out var manifestEntry) || !entries.ContainsKey("dms.db"))
            throw new InvalidDataException("The selected archive is not a supported DMS backup.");
        BackupManifest manifest;
        using (var stream = manifestEntry.Open())
            manifest = JsonSerializer.Deserialize<BackupManifest>(stream) ?? throw new InvalidDataException("The selected archive manifest is invalid.");
        if (manifest.FormatVersion != 1 || manifest.Images == null) throw new InvalidDataException("The selected archive format is unsupported.");
        var allowed = new HashSet<string>(StringComparer.Ordinal) { "manifest.json", "dms.db" };
        foreach (var image in manifest.Images)
        {
            if (image.Length is < 1 or > MaxImageBytes || image.Id.Length != 64 || !string.Equals(image.Sha256, image.Id, StringComparison.Ordinal))
                throw new InvalidDataException("The selected archive image manifest is invalid.");
            if (!string.Equals(image.RelativePath, RelativeImagePath(image.Id, image.ContentType), StringComparison.Ordinal))
                throw new InvalidDataException("The selected archive image path is invalid.");
            allowed.Add(image.RelativePath);
        }
        if (entries.Keys.Any(name => !allowed.Contains(name))) throw new InvalidDataException("The selected archive contains unsupported files.");
        foreach (var name in allowed)
        {
            if (!entries.TryGetValue(name, out var entry)) throw new InvalidDataException("The selected archive is incomplete.");
            var path = Path.Combine(staging, name.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            entry.ExtractToFile(path);
        }
        return manifest;
    }

    private static void CopyDirectory(string source, string destination)
    {
        if (!Directory.Exists(source)) return;
        Directory.CreateDirectory(destination);
        foreach (var file in Directory.EnumerateFiles(source))
        {
            var target = Path.Combine(destination, Path.GetFileName(file));
            if (!File.Exists(target))
            {
                File.Copy(file, target);
                continue;
            }

            if (!File.ReadAllBytes(file).AsSpan().SequenceEqual(File.ReadAllBytes(target)))
                throw new InvalidDataException("A template image file conflicts with the selected backup.");
        }
    }

    private static void ValidateArchiveDatabase(string databasePath, string staging, BackupManifest manifest)
    {
        using var source = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = databasePath, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
        source.Open();
        ValidateRestoreSource(source);
        using var command = source.CreateCommand();
        command.CommandText = "SELECT id,content_type,relative_path FROM template_image_assets ORDER BY id";
        using var reader = command.ExecuteReader();
        var images = manifest.Images.ToDictionary(image => image.Id, StringComparer.Ordinal);
        while (reader.Read())
        {
            var id = reader.GetString(0);
            if (!images.Remove(id, out var image) || image.ContentType != reader.GetString(1) || image.RelativePath != reader.GetString(2))
                throw new InvalidDataException("The selected archive image manifest does not match its database.");
            var bytes = File.ReadAllBytes(Path.Combine(staging, image.RelativePath.Replace('/', Path.DirectorySeparatorChar)));
            if (bytes.Length != image.Length || !string.Equals(Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(), image.Sha256, StringComparison.Ordinal))
                throw new InvalidDataException("The selected archive image is corrupt.");
        }
        if (images.Count != 0) throw new InvalidDataException("The selected archive contains unreferenced images.");
    }

    private static bool IsArchiveBackup(string path) => string.Equals(Path.GetExtension(path), ArchiveExtension, StringComparison.OrdinalIgnoreCase);
}

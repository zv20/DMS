using DMS.Models;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization.Metadata;

namespace DMS.Services;

/// <summary>A portable data export with binary image files, including unused library images.</summary>
public static class TemplateImageArchive
{
    public const int MaximumImageBytes = 4 * 1024 * 1024;
    private const int MaximumJsonBytes = 64 * 1024 * 1024;
    private const int MaximumManifestBytes = 4 * 1024 * 1024;
    private const long MaximumArchiveBytes = 512L * 1024 * 1024;
    private const int MaximumImages = 10_000;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };

    // Filter runtime-only hydrated image bytes before creating the export JSON string.
    // Imported opaque legacy data remains untouched until it has an explicit asset reference.
    public static string SerializeExportData<T>(T data)
    {
        var resolver = new DefaultJsonTypeInfoResolver();
        resolver.Modifiers.Add(type =>
        {
            var propertyName = type.Type == typeof(MenuTemplate) || type.Type == typeof(TemplateDocument)
                ? "BackgroundImageDataUri" : type.Type == typeof(TemplateImage) || type.Type == typeof(TemplateImageLayer) ? "DataUri" : null;
            if (propertyName == null) return;
            var property = type.Properties.FirstOrDefault(property => property.Name == propertyName);
            if (property != null) property.ShouldSerialize = (instance, _) => string.IsNullOrEmpty(instance switch
            {
                MenuTemplate template => template.BackgroundImageAssetId,
                TemplateDocument document => document.BackgroundImageAssetId,
                TemplateImage image => image.AssetId,
                TemplateImageLayer image => image.AssetId,
                _ => null
            });
        });
        return JsonSerializer.Serialize(data, new JsonSerializerOptions(JsonOptions) { TypeInfoResolver = resolver });
    }

    public sealed class Contents
    {
        public string DataJson { get; init; } = "";
        public List<TemplateImageAsset> Images { get; init; } = new();
    }

    private sealed class Manifest
    {
        public Manifest() { }
        public string Format { get; set; } = "DMS";
        public int Version { get; set; } = 1;
        public string DataSha256 { get; set; } = "";
        public List<ImageFile> Images { get; set; } = new();
    }

    private sealed class ImageFile
    {
        public ImageFile() { }
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string ContentType { get; set; } = "";
        public string FileName { get; set; } = "";
        public string Sha256 { get; set; } = "";
        public int Length { get; set; }
    }

    public static async Task WriteAsync(Stream destination, string dataJson, IReadOnlyCollection<TemplateImageAsset> images)
    {
        if (images.Count > MaximumImages) throw new InvalidDataException("The image library exceeds the archive limit.");
        var assetIds = new HashSet<string>(StringComparer.Ordinal);
        var manifest = new Manifest();
        long totalBytes = 0;
        foreach (var image in images)
        {
            ValidateImage(image);
            if (!assetIds.Add(image.Id)) throw new InvalidDataException("The archive contains duplicate image IDs.");
            totalBytes += image.Data.Length;
            if (totalBytes > MaximumArchiveBytes) throw new InvalidDataException("The data archive exceeds the size limit.");
            manifest.Images.Add(new ImageFile
            {
                Id = image.Id, Name = image.Name, ContentType = image.ContentType,
                FileName = $"images/{manifest.Images.Count}.{(image.ContentType == "image/png" ? "png" : "jpg")}",
                Length = image.Data.Length, Sha256 = Hash(image.Data)
            });
        }

        var json = PrepareExportJson(dataJson, assetIds);
        var dataBytes = Encoding.UTF8.GetBytes(json);
        if (dataBytes.Length > MaximumJsonBytes) throw new InvalidDataException("The exported data exceeds the archive limit.");
        manifest.DataSha256 = Hash(dataBytes);
        var manifestBytes = JsonSerializer.SerializeToUtf8Bytes(manifest, JsonOptions);
        if (manifestBytes.Length > MaximumManifestBytes || totalBytes + dataBytes.Length + manifestBytes.Length > MaximumArchiveBytes)
            throw new InvalidDataException("The data archive exceeds the size limit.");

        using var archive = new ZipArchive(destination, ZipArchiveMode.Create, leaveOpen: true);
        await WriteEntryAsync(archive, "manifest.json", manifestBytes);
        await WriteEntryAsync(archive, "data.json", dataBytes);
        var index = 0;
        foreach (var image in images) await WriteEntryAsync(archive, manifest.Images[index++].FileName, image.Data);
    }

    public static async Task<Contents> ReadAsync(Stream source)
    {
        using var archive = new ZipArchive(source, ZipArchiveMode.Read, leaveOpen: true);
        if (archive.Entries.Count > MaximumImages + 2) throw new InvalidDataException("The data archive has too many entries.");
        var entries = new Dictionary<string, ZipArchiveEntry>(StringComparer.Ordinal);
        long totalBytes = 0;
        foreach (var entry in archive.Entries)
        {
            if (!entries.TryAdd(entry.FullName, entry)) throw new InvalidDataException("The data archive has duplicate entries.");
            if (entry.Length < 0 || entry.Length > MaximumJsonBytes) throw new InvalidDataException("An archive entry exceeds the size limit.");
            totalBytes += entry.Length;
            if (totalBytes > MaximumArchiveBytes) throw new InvalidDataException("The data archive exceeds the size limit.");
        }
        if (!entries.TryGetValue("manifest.json", out var manifestEntry) || !entries.TryGetValue("data.json", out var dataEntry))
            throw new InvalidDataException("The selected archive is not a DMS data archive.");
        var manifest = JsonSerializer.Deserialize<Manifest>(await ReadEntryAsync(manifestEntry, MaximumManifestBytes), JsonOptions)
            ?? throw new InvalidDataException("The image manifest is missing.");
        if (manifest.Format != "DMS" || manifest.Version != 1 || manifest.Images == null || manifest.Images.Count > MaximumImages)
            throw new InvalidDataException("The archive format is not supported.");
        if (entries.Count != manifest.Images.Count + 2) throw new InvalidDataException("The archive entries do not match its image manifest.");

        var dataBytes = await ReadEntryAsync(dataEntry, MaximumJsonBytes);
        if (!Hash(dataBytes).Equals(manifest.DataSha256, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("The data file does not match its archive checksum.");
        var images = new List<TemplateImageAsset>();
        var assetIds = new HashSet<string>(StringComparer.Ordinal);
        var fileNames = new HashSet<string>(StringComparer.Ordinal) { "manifest.json", "data.json" };
        for (var index = 0; index < manifest.Images.Count; index++)
        {
            var image = manifest.Images[index];
            if (image == null || string.IsNullOrWhiteSpace(image.Id) || image.Id.Length > 512 || string.IsNullOrEmpty(image.FileName) ||
                !assetIds.Add(image.Id) || !fileNames.Add(image.FileName) ||
                image.FileName != $"images/{index}.{(image.ContentType == "image/png" ? "png" : "jpg")}" ||
                !entries.TryGetValue(image.FileName, out var entry) || image.Length < 1 || image.Length > MaximumImageBytes || entry.Length != image.Length)
                throw new InvalidDataException("An image manifest entry is invalid.");
            var bytes = await ReadEntryAsync(entry, MaximumImageBytes);
            if (!Hash(bytes).Equals(image.Sha256, StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("An image does not match its archive checksum.");
            var asset = new TemplateImageAsset { Id = image.Id, Name = image.Name, ContentType = image.ContentType, Data = bytes };
            ValidateImage(asset);
            images.Add(asset);
        }

        var json = Encoding.UTF8.GetString(dataBytes);
        // Parse every known template reference before the caller makes its first database write.
        VisitTemplates(json, template => VisitImageFields(template, (id, uri, _, _) =>
        {
            if (!string.IsNullOrEmpty(id) && (!assetIds.Contains(id) || !string.IsNullOrEmpty(uri)))
                throw new InvalidDataException("A template image reference is missing or contains conflicting image data.");
        }));
        return new Contents { DataJson = json, Images = images };
    }

    public static void RemapTemplateAssetIds(MenuTemplate template, IReadOnlyDictionary<string, string> imageIds)
    {
        VisitImageFields(template, (id, _, setId, _) =>
        {
            if (string.IsNullOrEmpty(id)) return;
            if (!imageIds.TryGetValue(id, out var mapped)) throw new InvalidDataException("A template references an image that is absent from the archive.");
            setId(mapped);
        });
    }

    private static string PrepareExportJson(string json, HashSet<string> assetIds)
    {
        var root = JsonNode.Parse(json) as JsonObject ?? throw new InvalidDataException("The exported data must be an object.");
        var key = root.Select(property => property.Key).FirstOrDefault(key => key.Equals("Templates", StringComparison.OrdinalIgnoreCase));
        if (key == null || root[key] is not JsonArray templates) throw new InvalidDataException("The exported templates are missing.");
        for (var index = 0; index < templates.Count; index++)
        {
            var template = templates[index]?.Deserialize<MenuTemplate>(JsonOptions) ?? throw new InvalidDataException("A template is invalid.");
            VisitImageFields(template, (id, _, _, setUri) =>
            {
                if (string.IsNullOrEmpty(id)) return;
                if (!assetIds.Contains(id)) throw new InvalidDataException("A template references an image that is missing from the library.");
                setUri(null);
            });
            templates[index] = JsonSerializer.SerializeToNode(template, JsonOptions);
        }
        return root.ToJsonString(JsonOptions);
    }

    private static void VisitTemplates(string json, Action<MenuTemplate> visit)
    {
        using var document = JsonDocument.Parse(json);
        if (document.RootElement.ValueKind != JsonValueKind.Object) throw new InvalidDataException("The data file must be an object.");
        foreach (var property in document.RootElement.EnumerateObject())
        {
            if (!property.Name.Equals("Templates", StringComparison.OrdinalIgnoreCase)) continue;
            if (property.Value.ValueKind != JsonValueKind.Array) throw new InvalidDataException("The template collection is invalid.");
            foreach (var item in property.Value.EnumerateArray())
                visit(item.Deserialize<MenuTemplate>(JsonOptions) ?? throw new InvalidDataException("A template is invalid."));
            return;
        }
        throw new InvalidDataException("The template collection is missing.");
    }

    private static void VisitImageFields(MenuTemplate template, Action<string?, string?, Action<string?>, Action<string?>> visit)
    {
        visit(template.BackgroundImageAssetId, template.BackgroundImageDataUri, id => template.BackgroundImageAssetId = id, uri => template.BackgroundImageDataUri = uri);
        foreach (var image in template.ImageLayers ?? [])
            visit(image.AssetId, image.DataUri, id => image.AssetId = id, uri => image.DataUri = uri ?? "");
        if (template.Document is not { } document) return;
        visit(document.BackgroundImageAssetId, document.BackgroundImageDataUri, id => document.BackgroundImageAssetId = id, uri => document.BackgroundImageDataUri = uri);
        foreach (var image in document.DecorativeImages ?? [])
            visit(image.AssetId, image.DataUri, id => image.AssetId = id, uri => image.DataUri = uri ?? "");
    }

    private static void ValidateImage(TemplateImageAsset image)
    {
        if (string.IsNullOrWhiteSpace(image.Id) || image.Id.Length > 512 || string.IsNullOrWhiteSpace(image.Name) || image.Name.Length > 255 ||
            image.Data == null || image.Data.Length < 1 || image.Data.Length > MaximumImageBytes)
            throw new InvalidDataException("An image is invalid or exceeds the 4 MB limit.");
        var png = image.Data.Length >= 8 && image.Data.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var jpeg = image.Data.Length >= 3 && image.Data[0] == 0xFF && image.Data[1] == 0xD8 && image.Data[2] == 0xFF;
        if (!(image.ContentType == "image/png" && png) && !(image.ContentType == "image/jpeg" && jpeg))
            throw new InvalidDataException("Only PNG and JPEG images can be included in the archive.");
    }

    private static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));

    private static async Task WriteEntryAsync(ZipArchive archive, string name, byte[] bytes)
    {
        var entry = archive.CreateEntry(name, CompressionLevel.Optimal);
        using var stream = entry.Open();
        await stream.WriteAsync(bytes);
    }

    private static async Task<byte[]> ReadEntryAsync(ZipArchiveEntry entry, int maximum)
    {
        if (entry.Length < 0 || entry.Length > maximum) throw new InvalidDataException("An archive entry exceeds the size limit.");
        using var input = entry.Open();
        using var output = new MemoryStream((int)entry.Length);
        var buffer = new byte[64 * 1024];
        int read;
        while ((read = await input.ReadAsync(buffer)) > 0)
        {
            if (output.Length + read > maximum) throw new InvalidDataException("An archive entry exceeds the size limit.");
            await output.WriteAsync(buffer.AsMemory(0, read));
        }
        if (output.Length != entry.Length) throw new InvalidDataException("An archive entry is incomplete.");
        return output.ToArray();
    }
}

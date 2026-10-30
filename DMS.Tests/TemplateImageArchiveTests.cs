using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateImageArchiveTests
{
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4V8AAAAASUVORK5CYII=");

    [Fact]
    public async Task ArchiveStoresEachSharedImageOnceAndIncludesUnusedImagesWithoutChangingTemplates()
    {
        var asset = Image("shared", "Shared artwork");
        var unused = Image("unused", "Unused artwork");
        var template = new MenuTemplate
        {
            Name = "Weekly", BackgroundImageAssetId = asset.Id, BackgroundImageDataUri = DataUri,
            ImageLayers = [new() { AssetId = asset.Id, DataUri = DataUri, X = 31 }],
            Document = new TemplateDocument
            {
                BackgroundImageAssetId = asset.Id, BackgroundImageDataUri = DataUri,
                DecorativeImages = [new() { AssetId = asset.Id, DataUri = DataUri, X = 99, Opacity = .4 }]
            }
        };
        var sourceJson = TemplateImageArchive.SerializeExportData(new { Recipes = new[] { new Recipe { Name = "Soup" } }, Templates = new[] { template } });
        Assert.DoesNotContain(Convert.ToBase64String(Png), sourceJson);
        using var stream = new MemoryStream();
        await TemplateImageArchive.WriteAsync(stream, sourceJson, new[] { asset, unused });
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true))
        {
            Assert.Equal(4, zip.Entries.Count);
            Assert.NotNull(zip.GetEntry("images/0.png"));
            Assert.NotNull(zip.GetEntry("images/1.png"));
            using var reader = new StreamReader(zip.GetEntry("data.json")!.Open());
            var json = await reader.ReadToEndAsync();
            Assert.DoesNotContain(Convert.ToBase64String(Png), json);
            Assert.Contains("Soup", json);
        }
        stream.Position = 0;
        var contents = await TemplateImageArchive.ReadAsync(stream);
        Assert.Equal(2, contents.Images.Count);
        Assert.All(contents.Images, image => Assert.Equal(Png, image.Data));
        using var document = JsonDocument.Parse(contents.DataJson);
        var restored = document.RootElement.GetProperty("Templates")[0].Deserialize<MenuTemplate>()!;
        Assert.Equal("shared", restored.Document!.DecorativeImages[0].AssetId);
        Assert.Equal(99, restored.Document.DecorativeImages[0].X);
        Assert.Equal(.4, restored.Document.DecorativeImages[0].Opacity);
        TemplateImageArchive.RemapTemplateAssetIds(restored, new Dictionary<string, string> { ["shared"] = "destination" });
        Assert.Equal("destination", restored.BackgroundImageAssetId);
        Assert.Equal("destination", restored.ImageLayers[0].AssetId);
        Assert.Equal("destination", restored.Document.BackgroundImageAssetId);
        Assert.Equal("destination", restored.Document.DecorativeImages[0].AssetId);
        Assert.Equal(DataUri, template.Document.DecorativeImages[0].DataUri);
    }

    [Fact]
    public async Task ArchiveRestoresUnusedAndReferencedAssetsIntoFreshDatabase()
    {
        var directory = Path.Combine(Path.GetTempPath(), "DMS.ArchiveTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var shared = Image("source-image", "Лого");
            // A different PNG byte sequence is still a separate image in the library.
            var unused = Image("source-unused", "Unused");
            unused.Data = [.. Png, 0];
            var template = new MenuTemplate { Name = "Portable", Document = new TemplateDocument { DecorativeImages = [new() { AssetId = shared.Id, DataUri = DataUri }] } };
            using var stream = new MemoryStream();
            await TemplateImageArchive.WriteAsync(stream, JsonSerializer.Serialize(new { Templates = new[] { template } }), new[] { shared, unused });
            stream.Position = 0;
            var contents = await TemplateImageArchive.ReadAsync(stream);
            using var database = new DatabaseService(NullLogger<DatabaseService>.Instance, Path.Combine(directory, "destination.db"));
            var remap = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var image in contents.Images)
                remap.Add(image.Id, (await database.SaveTemplateImageAsync(image.Name, image.ContentType, image.Data)).Id);
            using var document = JsonDocument.Parse(contents.DataJson);
            var imported = document.RootElement.GetProperty("Templates")[0].Deserialize<MenuTemplate>()!;
            TemplateImageArchive.RemapTemplateAssetIds(imported, remap);
            await database.SaveTemplateAsync(imported);
            Assert.Equal(2, (await database.GetTemplateImagesAsync()).Count);
            var restored = Assert.Single(await database.GetAllTemplatesAsync());
            Assert.Equal(DataUri, restored.Document!.DecorativeImages[0].DataUri);
            Assert.Equal(new[] { "Portable" }, await database.GetTemplateImageUsageAsync(remap[shared.Id]));
            Assert.Empty(await database.GetTemplateImageUsageAsync(remap[unused.Id]));
        }
        finally { Directory.Delete(directory, recursive: true); }
    }

    [Fact]
    public async Task ExportRejectsMissingReferencesBeforeWritingAnArchive()
    {
        var template = new MenuTemplate { Document = new TemplateDocument { DecorativeImages = [new() { AssetId = "missing" }] } };
        using var stream = new MemoryStream();
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.WriteAsync(stream, JsonSerializer.Serialize(new { Templates = new[] { template } }), Array.Empty<TemplateImageAsset>()));
        Assert.Equal(0, stream.Length);
    }

    [Fact]
    public async Task ImportRejectsChangedImageBytesBeforeAnyDatabaseWork()
    {
        using var stream = await CreateArchiveAsync();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true))
        {
            archive.GetEntry("images/0.png")!.Delete();
            using var entry = archive.CreateEntry("images/0.png").Open();
            var changed = Png.ToArray(); changed[^1] ^= 1;
            await entry.WriteAsync(changed);
        }
        stream.Position = 0;
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.ReadAsync(stream));
    }

    [Fact]
    public async Task ImportRejectsMissingTemplateAssetEvenWhenChecksumsAreValid()
    {
        using var stream = await CreateArchiveAsync();
        await RewriteDataAsync(stream, json => json["Templates"]![0]!["Document"]!["DecorativeImages"]![0]!["AssetId"] = "missing");
        stream.Position = 0;
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.ReadAsync(stream));
    }

    [Fact]
    public async Task ImportRejectsConflictingEmbeddedImageAndReference()
    {
        using var stream = await CreateArchiveAsync();
        await RewriteDataAsync(stream, json => json["Templates"]![0]!["Document"]!["DecorativeImages"]![0]!["DataUri"] = DataUri);
        stream.Position = 0;
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.ReadAsync(stream));
    }

    [Fact]
    public async Task ImportRejectsUnlistedEntries()
    {
        using var stream = await CreateArchiveAsync();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true))
        {
            using var entry = archive.CreateEntry("../unlisted.png").Open();
            await entry.WriteAsync(Png);
        }
        stream.Position = 0;
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.ReadAsync(stream));
    }

    [Fact]
    public async Task ImportRejectsDuplicateEntries()
    {
        using var stream = await CreateArchiveAsync();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true))
        {
            using var entry = archive.CreateEntry("images/0.png").Open();
            await entry.WriteAsync(Png);
        }
        stream.Position = 0;
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.ReadAsync(stream));
    }

    [Fact]
    public async Task ArchivePreservesUnsupportedLegacyImageDataWithoutAnAssetReference()
    {
        var template = new MenuTemplate
        {
            Name = "Legacy",
            BackgroundImageDataUri = "data:image/gif;base64,R0lGODlh",
            LegacyDataJson = "{\"image\":\"data:image/unknown;base64,opaque\"}",
            ImageLayers = [new() { DataUri = "data:image/png;base64,malformed" }],
            Document = new TemplateDocument { DecorativeImages = [new() { DataUri = "unsupported-original-data" }] }
        };
        using var stream = new MemoryStream();
        await TemplateImageArchive.WriteAsync(stream, JsonSerializer.Serialize(new { Templates = new[] { template } }), Array.Empty<TemplateImageAsset>());
        stream.Position = 0;
        var contents = await TemplateImageArchive.ReadAsync(stream);
        using var document = JsonDocument.Parse(contents.DataJson);
        var restored = document.RootElement.GetProperty("Templates")[0].Deserialize<MenuTemplate>()!;
        Assert.Equal(template.BackgroundImageDataUri, restored.BackgroundImageDataUri);
        Assert.Equal(template.LegacyDataJson, restored.LegacyDataJson);
        Assert.Equal(template.ImageLayers[0].DataUri, restored.ImageLayers[0].DataUri);
        Assert.Equal(template.Document.DecorativeImages[0].DataUri, restored.Document!.DecorativeImages[0].DataUri);
        Assert.Empty(contents.Images);
    }

    [Fact]
    public async Task ImportRejectsAnOversizedImageEntry()
    {
        using var stream = await CreateArchiveAsync();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true))
        {
            archive.GetEntry("images/0.png")!.Delete();
            using var entry = archive.CreateEntry("images/0.png").Open();
            await entry.WriteAsync(new byte[TemplateImageArchive.MaximumImageBytes + 1]);
        }
        stream.Position = 0;
        await Assert.ThrowsAsync<InvalidDataException>(() => TemplateImageArchive.ReadAsync(stream));
    }

    private static string DataUri => $"data:image/png;base64,{Convert.ToBase64String(Png)}";
    private static TemplateImageAsset Image(string id, string name) => new() { Id = id, Name = name, ContentType = "image/png", Data = Png.ToArray() };

    private static async Task<MemoryStream> CreateArchiveAsync()
    {
        var template = new MenuTemplate { Name = "Weekly", Document = new TemplateDocument { DecorativeImages = [new() { AssetId = "source-image", DataUri = DataUri }] } };
        var stream = new MemoryStream();
        await TemplateImageArchive.WriteAsync(stream, JsonSerializer.Serialize(new { Templates = new[] { template } }), new[] { Image("source-image", "Image") });
        stream.Position = 0;
        return stream;
    }

    private static async Task RewriteDataAsync(MemoryStream stream, Action<JsonNode> change)
    {
        using var archive = new ZipArchive(stream, ZipArchiveMode.Update, leaveOpen: true);
        JsonNode data, manifest;
        using (var reader = new StreamReader(archive.GetEntry("data.json")!.Open())) data = JsonNode.Parse(await reader.ReadToEndAsync())!;
        using (var reader = new StreamReader(archive.GetEntry("manifest.json")!.Open())) manifest = JsonNode.Parse(await reader.ReadToEndAsync())!;
        change(data);
        var bytes = Encoding.UTF8.GetBytes(data.ToJsonString());
        manifest["DataSha256"] = Convert.ToHexString(SHA256.HashData(bytes));
        archive.GetEntry("data.json")!.Delete();
        archive.GetEntry("manifest.json")!.Delete();
        using (var entry = archive.CreateEntry("data.json").Open()) await entry.WriteAsync(bytes);
        using (var entry = archive.CreateEntry("manifest.json").Open()) await entry.WriteAsync(Encoding.UTF8.GetBytes(manifest.ToJsonString()));
    }
}

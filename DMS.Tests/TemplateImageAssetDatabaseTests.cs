using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateImageAssetDatabaseTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "DMS.Images.Tests", Guid.NewGuid().ToString("N"));
    private static readonly byte[] TinyPng = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
    private static string TinyPngUri => "data:image/png;base64," + Convert.ToBase64String(TinyPng);
    private string DatabasePath => Path.Combine(_directory, "dms.db");
    private DatabaseService Open() { Directory.CreateDirectory(_directory); return new(NullLogger<DatabaseService>.Instance, DatabasePath); }

    [Fact]
    public async Task SharedImagesAreStoredOnceAndReferencesFollowSaveRenameAndDelete()
    {
        using var database = Open();
        var bytes = TinyPng;
        var image = await database.SaveTemplateImageAsync("Logo", "image/png", bytes);
        var duplicate = await database.SaveTemplateImageAsync("Other name", "image/png", bytes);
        Assert.Equal(image.Id, duplicate.Id);
        await Assert.ThrowsAsync<InvalidDataException>(() => database.RenameTemplateImageAsync(image.Id, new string('x', 256)));
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveTemplateImageAsync(new string('x', 256), "image/png", bytes));
        Assert.Single(await database.GetTemplateImagesAsync());
        var dataUri = "data:image/png;base64," + Convert.ToBase64String(bytes);
        await database.SaveTemplateAsync(new MenuTemplate { Name = "One", Document = new TemplateDocument
        {
            BackgroundImageDataUri = dataUri,
            DecorativeImages = [new TemplateImage { DataUri = dataUri }]
        }});
        await database.SaveTemplateAsync(new MenuTemplate { Name = "Two", Document = new TemplateDocument
        {
            DecorativeImages = [new TemplateImage { AssetId = image.Id }]
        }});
        Assert.Equal(new[] { "One", "Two" }, await database.GetTemplateImageUsageAsync(image.Id));
        var templates = await database.GetAllTemplatesAsync();
        Assert.Equal(dataUri, templates.Single(t => t.Name == "One").Document!.BackgroundImageDataUri);
        Assert.Equal(dataUri, templates.Single(t => t.Name == "Two").Document!.DecorativeImages.Single().DataUri);
        Assert.Same(templates.Single(t => t.Name == "One").Document!.BackgroundImageDataUri,
            templates.Single(t => t.Name == "Two").Document!.DecorativeImages.Single().DataUri);
        await database.RenameTemplateAsync("Two", "Renamed");
        Assert.Equal(new[] { "One", "Renamed" }, await database.GetTemplateImageUsageAsync(image.Id));
        await database.DeleteTemplateAsync("One");
        Assert.Equal(new[] { "Renamed" }, await database.GetTemplateImageUsageAsync(image.Id));
        Assert.NotNull(await database.GetTemplateImageAsync(image.Id));
    }

    [Fact]
    public async Task DeleteChecksUsageAndAtomicallyDeletesAllConfirmedTemplatesIncludingPresets()
    {
        using var database = Open();
        var image = await database.SaveTemplateImageAsync("Logo", "image/png", TinyPng);
        foreach (var name in new[] { "Preset", "User" })
            await database.SaveTemplateAsync(new MenuTemplate { Name = name, IsPreset = name == "Preset",
                Document = new TemplateDocument { DecorativeImages = [new TemplateImage { AssetId = image.Id }] } });
        await Assert.ThrowsAsync<InvalidOperationException>(() => database.DeleteTemplateImageAsync(image.Id, ["User"]));
        Assert.Equal(2, (await database.GetAllTemplatesAsync()).Count);
        Assert.NotNull(await database.GetTemplateImageAsync(image.Id));
        Assert.Equal(new[] { "Preset", "User" }, await database.DeleteTemplateImageAsync(image.Id, ["User", "Preset"]));
        Assert.Empty(await database.GetAllTemplatesAsync());
        Assert.Null(await database.GetTemplateImageAsync(image.Id));
    }

    [Fact]
    public async Task ReplacingImageUpdatesUsageAndDeletingOldAssetKeepsTemplate()
    {
        using var database = Open();
        var oldImage = await database.SaveTemplateImageAsync("Old", "image/png", TinyPng);
        var newImage = await database.SaveTemplateImageAsync("New", "image/png", TinyPng.Concat(new byte[] { 0 }).ToArray());
        Assert.NotEqual(oldImage.Id, newImage.Id);
        var template = new MenuTemplate { Name = "Menu", Document = new TemplateDocument
        {
            DecorativeImages = [new TemplateImage { AssetId = oldImage.Id }]
        }};
        await database.SaveTemplateAsync(template);
        Assert.Equal(new[] { "Menu" }, await database.GetTemplateImageUsageAsync(oldImage.Id));

        template.Document.DecorativeImages[0].AssetId = newImage.Id;
        await database.SaveTemplateAsync(template);
        Assert.Empty(await database.GetTemplateImageUsageAsync(oldImage.Id));
        Assert.Equal(new[] { "Menu" }, await database.GetTemplateImageUsageAsync(newImage.Id));
        Assert.Empty(await database.DeleteTemplateImageAsync(oldImage.Id, []));
        Assert.Null(await database.GetTemplateImageAsync(oldImage.Id));
        Assert.NotNull(await database.GetTemplateImageAsync(newImage.Id));
        var saved = Assert.Single(await database.GetAllTemplatesAsync());
        Assert.Equal("Menu", saved.Name);
        Assert.Equal(newImage.Id, saved.Document!.DecorativeImages.Single().AssetId);
    }

    [Fact]
    public async Task MissingReferenceRollsBackTemplateAndNewAsset()
    {
        using var database = Open();
        var template = new MenuTemplate { Name = "Invalid", Document = new TemplateDocument
        {
            BackgroundImageDataUri = TinyPngUri,
            DecorativeImages = [new TemplateImage { AssetId = "missing" }]
        }};
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveTemplateAsync(template));
        Assert.Empty(await database.GetAllTemplatesAsync());
        Assert.Empty(await database.GetTemplateImagesAsync());
    }

    [Fact]
    public async Task NewAssetsRejectImagesLargerThanFourMiB()
    {
        using var database = Open();
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveTemplateImageAsync("Large", "image/png", new byte[4 * 1024 * 1024 + 1]));
        Assert.Empty(await database.GetTemplateImagesAsync());
    }

    [Fact]
    public async Task NewAssetsRejectInvalidOrMismatchedImageSignatures()
    {
        using var database = Open();
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveTemplateImageAsync("Invalid", "image/png", [1, 2, 3]));
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveTemplateImageAsync("Wrong type", "image/jpeg", TinyPng));
        Assert.Empty(await database.GetTemplateImagesAsync());
    }

    [Fact]
    public async Task LongLegacyImageNamesAreTruncatedOnlyInLibraryMetadata()
    {
        using var database = Open();
        var altText = new string('x', 300);
        await database.SaveTemplateAsync(new MenuTemplate { Name = "Template", Document = new TemplateDocument
        {
            DecorativeImages = [new TemplateImage { DataUri = TinyPngUri, AltText = altText }]
        }});
        Assert.Equal(255, Assert.Single(await database.GetTemplateImagesAsync()).Name.Length);
        Assert.Equal(altText, Assert.Single(await database.GetAllTemplatesAsync()).Document!.DecorativeImages.Single().AltText);
    }

    [Fact]
    public async Task MigrationPreservesOversizedEmbeddedImagesAndMissingReferencesWithoutBlockingStartup()
    {
        using (var initial = Open()) await initial.InitializeAsync();
        var largeUri = "data:image/png;base64," + Convert.ToBase64String(new byte[4 * 1024 * 1024 + 1]);
        var old = new MenuTemplate { Name = "Old", BackgroundImageDataUri = largeUri,
            Document = new TemplateDocument { DecorativeImages = [new TemplateImage { AssetId = "missing" }] } };
        using (var connection = new SqliteConnection($"Data Source={DatabasePath};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM schema_migrations WHERE version=2; INSERT INTO templates(name,data_json,is_preset) VALUES ('Old',@json,0)";
            command.Parameters.AddWithValue("@json", JsonSerializer.Serialize(old));
            command.ExecuteNonQuery();
        }
        using var database = Open();
        var loaded = Assert.Single(await database.GetAllTemplatesAsync());
        Assert.Equal(largeUri, loaded.BackgroundImageDataUri);
        Assert.Equal("missing", loaded.Document!.DecorativeImages.Single().AssetId);
        Assert.Empty(await database.GetTemplateImagesAsync());
        await Assert.ThrowsAsync<InvalidDataException>(() => database.SaveTemplateAsync(loaded));
    }

    [Fact]
    public async Task MigrationExtractsOldImagesAndPreservesUnsupportedDataAndBackups()
    {
        using (var initial = Open()) await initial.InitializeAsync();
        var old = new MenuTemplate { Name = "Old", BackgroundImageDataUri = TinyPngUri,
            Document = new TemplateDocument { DecorativeImages = [new TemplateImage { DataUri = TinyPngUri }, new TemplateImage { DataUri = "https://example.invalid/image.png" }, new TemplateImage { DataUri = "data:image/png;base64,YWJj" }] },
            LegacyDataJson = "{\"image\":\"unmodified\"}" };
        using (var connection = new SqliteConnection($"Data Source={DatabasePath};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM schema_migrations WHERE version=2; INSERT INTO templates(name,data_json,is_preset) VALUES ('Old',@json,0)";
            command.Parameters.AddWithValue("@json", JsonSerializer.Serialize(old));
            command.ExecuteNonQuery();
        }
        var backup = Path.Combine(_directory, "backup.db");
        using (var migrated = Open())
        {
            var template = Assert.Single(await migrated.GetAllTemplatesAsync());
            Assert.Equal(TinyPngUri, template.BackgroundImageDataUri);
            Assert.Equal("https://example.invalid/image.png", template.Document!.DecorativeImages[1].DataUri);
            Assert.Equal("data:image/png;base64,YWJj", template.Document.DecorativeImages[2].DataUri);
            Assert.Equal(old.LegacyDataJson, template.LegacyDataJson);
            Assert.Single(await migrated.GetTemplateImagesAsync());
            await migrated.CreateBackupAsync(backup);
        }
        using (var connection = new SqliteConnection($"Data Source={DatabasePath};Pooling=False"))
        {
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT data_json FROM templates WHERE name='Old'";
            var json = (string)command.ExecuteScalar()!;
            Assert.DoesNotContain(TinyPngUri, json);
            Assert.Contains("data:image/png;base64,YWJj", json);
            Assert.Contains("BackgroundImageAssetId", json);
            var stored = JsonSerializer.Deserialize<MenuTemplate>(json)!;
            Assert.NotNull(stored.BackgroundImageAssetId);
            Assert.Null(stored.BackgroundImageDataUri);
            Assert.Equal(stored.BackgroundImageAssetId, stored.Document!.DecorativeImages[0].AssetId);
            Assert.Equal("", stored.Document.DecorativeImages[0].DataUri);
            command.CommandText = "PRAGMA user_version";
            Assert.Equal(2L, (long)command.ExecuteScalar()!);
        }
        using var restored = Open();
        await restored.RestoreFromAsync(backup);
        Assert.Equal(TinyPngUri, Assert.Single(await restored.GetAllTemplatesAsync()).BackgroundImageDataUri);
        Assert.Single(await restored.GetTemplateImagesAsync());
    }

    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory, true); }
}

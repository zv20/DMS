using System.Security.Cryptography;
using System.Text.Json;
using DMS.Models;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;

namespace DMS.Services;

public partial class DatabaseService
{
    private const int MaxImageBytes = 4 * 1024 * 1024;

    private void InitializeTemplateImages()
    {
        using var transaction = _connection!.BeginTransaction();
        using (var schema = _connection.CreateCommand())
        {
            schema.Transaction = transaction;
            schema.CommandText = @"CREATE TABLE IF NOT EXISTS template_image_assets (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, content_type TEXT NOT NULL, data BLOB NOT NULL);
              CREATE TABLE IF NOT EXISTS template_image_references (
                template_name TEXT NOT NULL REFERENCES templates(name) ON UPDATE CASCADE ON DELETE CASCADE,
                asset_id TEXT NOT NULL REFERENCES template_image_assets(id) ON DELETE RESTRICT,
                PRIMARY KEY(template_name, asset_id));
              CREATE INDEX IF NOT EXISTS idx_template_image_asset ON template_image_references(asset_id);";
            schema.ExecuteNonQuery();
        }
        using var check = _connection.CreateCommand();
        check.Transaction = transaction;
        check.CommandText = "SELECT COUNT(*) FROM schema_migrations WHERE version = 2";
        if (Convert.ToInt64(check.ExecuteScalar()) == 0)
        {
            var rows = new List<(string Name, string Json)>();
            using (var select = _connection.CreateCommand())
            {
                select.Transaction = transaction;
                select.CommandText = "SELECT name, data_json FROM templates";
                using var reader = select.ExecuteReader();
                while (reader.Read()) rows.Add((reader.GetString(0), reader.GetString(1)));
            }
            foreach (var (name, json) in rows)
            {
                MenuTemplate? template;
                try { template = JsonSerializer.Deserialize<MenuTemplate>(json); }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Image migration skipped an unreadable saved template {Template}", name);
                    continue;
                }
                if (template == null) continue;
                var refs = ExtractTemplateImages(template, transaction, preserveBrokenReferences: true);
                using var update = _connection.CreateCommand();
                update.Transaction = transaction;
                update.CommandText = "UPDATE templates SET data_json = @json WHERE name = @name";
                update.Parameters.AddWithValue("@json", JsonSerializer.Serialize(template));
                update.Parameters.AddWithValue("@name", name);
                update.ExecuteNonQuery();
                ReplaceTemplateImageReferences(name, refs, transaction);
            }
            using var version = _connection.CreateCommand();
            version.Transaction = transaction;
            version.CommandText = "INSERT INTO schema_migrations(version) VALUES (2)";
            version.ExecuteNonQuery();
        }
        using (var userVersion = _connection.CreateCommand())
        {
            userVersion.Transaction = transaction;
            userVersion.CommandText = "PRAGMA user_version";
            if (Convert.ToInt64(userVersion.ExecuteScalar()) < 2)
            {
                userVersion.CommandText = "PRAGMA user_version = 2";
                userVersion.ExecuteNonQuery();
            }
        }
        using (var legacyCheck = _connection.CreateCommand())
        {
            legacyCheck.Transaction = transaction;
            legacyCheck.CommandText = "SELECT COUNT(*) FROM schema_migrations WHERE version = 3";
            if (Convert.ToInt64(legacyCheck.ExecuteScalar()) == 0)
            {
                var obsolete = new List<string>();
                using (var select = _connection.CreateCommand())
                {
                    select.Transaction = transaction;
                    select.CommandText = "SELECT name, data_json FROM templates";
                    using var reader = select.ExecuteReader();
                    while (reader.Read())
                    {
                        try
                        {
                            if (JsonSerializer.Deserialize<MenuTemplate>(reader.GetString(1))?.Document == null) obsolete.Add(reader.GetString(0));
                        }
                        catch (JsonException) { obsolete.Add(reader.GetString(0)); }
                    }
                }
                foreach (var name in obsolete)
                {
                    using var deleteReferences = _connection.CreateCommand();
                    deleteReferences.Transaction = transaction;
                    deleteReferences.CommandText = "DELETE FROM template_image_references WHERE template_name=@name";
                    deleteReferences.Parameters.AddWithValue("@name", name);
                    deleteReferences.ExecuteNonQuery();
                    using var deleteTemplate = _connection.CreateCommand();
                    deleteTemplate.Transaction = transaction;
                    deleteTemplate.CommandText = "DELETE FROM templates WHERE name=@name";
                    deleteTemplate.Parameters.AddWithValue("@name", name);
                    deleteTemplate.ExecuteNonQuery();
                }
                if (obsolete.Count > 0) _logger.LogInformation("Removed {Count} obsolete non-native templates", obsolete.Count);
                using var version = _connection.CreateCommand();
                version.Transaction = transaction;
                version.CommandText = "INSERT INTO schema_migrations(version) VALUES (3)";
                version.ExecuteNonQuery();
            }
        }
        transaction.Commit();
    }

    private void SeedSeasonalTemplatePresets()
    {
        var assembly = typeof(DatabaseService).Assembly;
        var firstResource = $"{assembly.GetName().Name}.Assets.Templates.{SeasonalTemplateDefaults.All[0].AssetFile}";
        if (assembly.GetManifestResourceStream(firstResource) == null)
        {
            // Unit-test hosts can link the service source without bundling the
            // application assets. The published app always embeds these files.
            _logger.LogWarning("Built-in seasonal template artwork is unavailable in this host");
            return;
        }
        using var transaction = _connection!.BeginTransaction();
        foreach (var definition in SeasonalTemplateDefaults.All)
        {
            using var exists = _connection.CreateCommand();
            exists.Transaction = transaction;
            exists.CommandText = "SELECT data_json FROM templates WHERE name=@name";
            exists.Parameters.AddWithValue("@name", definition.Name);
            if (exists.ExecuteScalar() is string existingJson)
            {
                if (SeasonalTemplateDefaults.TryApplyRoomierTypography(existingJson, out var refreshedJson))
                {
                    using var update = _connection.CreateCommand();
                    update.Transaction = transaction;
                    update.CommandText = "UPDATE templates SET data_json=@data, updated_at=@now WHERE name=@name";
                    update.Parameters.AddWithValue("@data", refreshedJson);
                    update.Parameters.AddWithValue("@now", DateTime.UtcNow.ToString("O"));
                    update.Parameters.AddWithValue("@name", definition.Name);
                    update.ExecuteNonQuery();
                }
                continue;
            }

            var resourceName = $"{assembly.GetName().Name}.Assets.Templates.{definition.AssetFile}";
            using var stream = assembly.GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException($"Built-in seasonal template artwork is missing: {definition.AssetFile}");
            using var bytes = new MemoryStream();
            stream.CopyTo(bytes);
            var image = StoreTemplateImage(definition.Name + " artwork", "image/png", bytes.ToArray(), transaction);
            var template = SeasonalTemplateDefaults.Create(definition, image.Id);
            using var insert = _connection.CreateCommand();
            insert.Transaction = transaction;
            insert.CommandText = @"INSERT INTO templates (name, data_json, is_preset, created_at, updated_at)
                VALUES (@name, @data, 1, @now, @now)";
            insert.Parameters.AddWithValue("@name", template.Name);
            insert.Parameters.AddWithValue("@data", JsonSerializer.Serialize(template));
            insert.Parameters.AddWithValue("@now", DateTime.UtcNow.ToString("O"));
            insert.ExecuteNonQuery();
            ReplaceTemplateImageReferences(template.Name, [image.Id], transaction);
        }
        transaction.Commit();
    }

    private TemplateImageAsset StoreTemplateImage(string name, string contentType, byte[] data, SqliteTransaction transaction)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Trim().Length > 255) throw new InvalidDataException("Image name is too long.");
        if (contentType is not ("image/png" or "image/jpeg")) throw new InvalidDataException("Only PNG and JPEG images are supported.");
        if (data == null || data.Length == 0 || data.Length > MaxImageBytes) throw new InvalidDataException("Image size is invalid.");
        if (!ValidImageSignature(contentType, data)) throw new InvalidDataException("Image contents do not match the selected PNG or JPEG format.");
        var id = Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
        using var insert = _connection!.CreateCommand();
        insert.Transaction = transaction;
        insert.CommandText = "INSERT OR IGNORE INTO template_image_assets(id, name, content_type, data) VALUES (@id,@name,@type,@data)";
        insert.Parameters.AddWithValue("@id", id);
        insert.Parameters.AddWithValue("@name", name.Trim());
        insert.Parameters.AddWithValue("@type", contentType);
        insert.Parameters.Add("@data", SqliteType.Blob).Value = data;
        insert.ExecuteNonQuery();
        return ReadTemplateImage(id, transaction)!;
    }

    private static bool ValidImageSignature(string contentType, byte[] data)
    {
        var png = data.Length >= 8 && data.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var jpeg = data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF;
        return (contentType == "image/png" && png) || (contentType == "image/jpeg" && jpeg);
    }

    private TemplateImageAsset? ReadTemplateImage(string id, SqliteTransaction? transaction = null)
    {
        using var cmd = _connection!.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "SELECT id,name,content_type,data FROM template_image_assets WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", id);
        using var reader = cmd.ExecuteReader();
        return reader.Read() ? new TemplateImageAsset { Id = reader.GetString(0), Name = reader.GetString(1), ContentType = reader.GetString(2), Data = (byte[])reader[3] } : null;
    }

    private HashSet<string> ExtractTemplateImages(MenuTemplate template, SqliteTransaction transaction, bool preserveBrokenReferences = false)
    {
        var refs = new HashSet<string>(StringComparer.Ordinal);
        (string? Id, string? Uri) Extract(string? id, string? uri, string name)
        {
            if (!string.IsNullOrEmpty(uri))
            {
                var prefix = uri.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase) ? "image/png" :
                    uri.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase) ? "image/jpeg" : null;
                if (prefix != null && uri.Length <= 64 + ((MaxImageBytes + 2) / 3 * 4))
                {
                    try
                    {
                        var bytes = Convert.FromBase64String(uri[(uri.IndexOf(',') + 1)..]);
                        if (bytes.Length > 0 && bytes.Length <= MaxImageBytes && ValidImageSignature(prefix, bytes))
                        {
                            var assetName = string.IsNullOrWhiteSpace(name) ? "Image" : name.Trim();
                            if (assetName.Length > 255) assetName = assetName[..255];
                            var asset = StoreTemplateImage(assetName, prefix, bytes, transaction);
                            refs.Add(asset.Id);
                            return (asset.Id, null);
                        }
                    }
                    catch (FormatException) { }
                }
                // Preserve unsupported or invalid historical data verbatim.
                if (string.IsNullOrWhiteSpace(id)) return (null, uri);
                if (preserveBrokenReferences)
                {
                    if (ReadTemplateImage(id, transaction) != null) refs.Add(id);
                    else _logger.LogWarning("Template {Template} contains a missing image reference {Image}", template.Name, id);
                    return (id, uri);
                }
                throw new InvalidDataException("An image reference contains unsupported or invalid image data.");
            }
            if (!string.IsNullOrWhiteSpace(id))
            {
                if (ReadTemplateImage(id, transaction) == null)
                {
                    if (!preserveBrokenReferences) throw new InvalidDataException($"Missing template image: {id}");
                    _logger.LogWarning("Template {Template} contains a missing image reference {Image}", template.Name, id);
                    return (id, uri);
                }
                refs.Add(id);
                return (id, null);
            }
            return (null, uri);
        }

        (template.BackgroundImageAssetId, template.BackgroundImageDataUri) = Extract(template.BackgroundImageAssetId, template.BackgroundImageDataUri, template.Name);
        foreach (var layer in template.ImageLayers ?? [])
        {
            if (layer == null) continue;
            var result = Extract(layer.AssetId, layer.DataUri, layer.AltText);
            layer.AssetId = result.Id; layer.DataUri = result.Uri ?? "";
        }
        if (template.Document != null)
        {
            var doc = template.Document;
            (doc.BackgroundImageAssetId, doc.BackgroundImageDataUri) = Extract(doc.BackgroundImageAssetId, doc.BackgroundImageDataUri, template.Name);
            foreach (var image in doc.DecorativeImages ?? [])
            {
                if (image == null) continue;
                var result = Extract(image.AssetId, image.DataUri, image.AltText);
                image.AssetId = result.Id; image.DataUri = result.Uri ?? "";
            }
        }
        return refs;
    }

    private void ReplaceTemplateImageReferences(string name, IEnumerable<string> refs, SqliteTransaction transaction)
    {
        using var delete = _connection!.CreateCommand();
        delete.Transaction = transaction;
        delete.CommandText = "DELETE FROM template_image_references WHERE template_name=@name";
        delete.Parameters.AddWithValue("@name", name);
        delete.ExecuteNonQuery();
        foreach (var id in refs)
        {
            using var insert = _connection.CreateCommand();
            insert.Transaction = transaction;
            insert.CommandText = "INSERT INTO template_image_references(template_name,asset_id) VALUES (@name,@id)";
            insert.Parameters.AddWithValue("@name", name);
            insert.Parameters.AddWithValue("@id", id);
            insert.ExecuteNonQuery();
        }
    }

    private void HydrateTemplateImages(MenuTemplate template, Dictionary<string, string?> cache)
    {
        string? Uri(string? id, string? existing)
        {
            if (string.IsNullOrWhiteSpace(id)) return existing;
            if (cache.TryGetValue(id, out var cached)) return cached ?? existing;
            var image = ReadTemplateImage(id);
            if (image == null)
            {
                _logger.LogWarning("Template {Template} contains a missing image reference {Image}", template.Name, id);
                cache[id] = null;
                return existing;
            }
            var dataUri = $"data:{image.ContentType};base64,{Convert.ToBase64String(image.Data)}";
            cache[id] = dataUri;
            return dataUri;
        }
        template.BackgroundImageDataUri = Uri(template.BackgroundImageAssetId, template.BackgroundImageDataUri);
        foreach (var layer in template.ImageLayers ?? []) if (layer != null) layer.DataUri = Uri(layer.AssetId, layer.DataUri) ?? "";
        if (template.Document != null)
        {
            var doc = template.Document;
            doc.BackgroundImageDataUri = Uri(doc.BackgroundImageAssetId, doc.BackgroundImageDataUri);
            foreach (var image in doc.DecorativeImages ?? []) if (image != null) image.DataUri = Uri(image.AssetId, image.DataUri) ?? "";
        }
    }

    public async Task<List<TemplateImageAsset>> GetTemplateImagesAsync()
    {
        await InitializeAsync();
        var images = new List<TemplateImageAsset>();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT id,name,content_type FROM template_image_assets ORDER BY name COLLATE NOCASE,id";
        using var reader = cmd.ExecuteReader();
        while (reader.Read()) images.Add(new TemplateImageAsset { Id = reader.GetString(0), Name = reader.GetString(1), ContentType = reader.GetString(2) });
        return images;
    }

    public async Task<TemplateImageAsset?> GetTemplateImageAsync(string id)
    {
        await InitializeAsync();
        return ReadTemplateImage(id);
    }

    public async Task<TemplateImageAsset> SaveTemplateImageAsync(string name, string contentType, byte[] data)
    {
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        var image = StoreTemplateImage(name, contentType, data, transaction);
        transaction.Commit();
        return image;
    }

    public async Task RenameTemplateImageAsync(string id, string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (name.Trim().Length > 255) throw new InvalidDataException("Image name is too long.");
        await InitializeAsync();
        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "UPDATE template_image_assets SET name=@name WHERE id=@id";
        cmd.Parameters.AddWithValue("@id", id); cmd.Parameters.AddWithValue("@name", name.Trim());
        if (cmd.ExecuteNonQuery() != 1) throw new InvalidOperationException("The image no longer exists.");
    }

    private List<string> ReadTemplateImageUsage(string id, SqliteTransaction? transaction = null)
    {
        var names = new List<string>();
        using var cmd = _connection!.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "SELECT template_name FROM template_image_references WHERE asset_id=@id ORDER BY template_name";
        cmd.Parameters.AddWithValue("@id", id);
        using var reader = cmd.ExecuteReader();
        while (reader.Read()) names.Add(reader.GetString(0));
        return names;
    }

    public async Task<List<string>> GetTemplateImageUsageAsync(string id)
    {
        await InitializeAsync();
        return ReadTemplateImageUsage(id);
    }

    public async Task<List<string>> DeleteTemplateImageAsync(string id, IReadOnlyCollection<string> expectedTemplateNames)
    {
        ArgumentNullException.ThrowIfNull(expectedTemplateNames);
        await InitializeAsync();
        using var transaction = _connection!.BeginTransaction();
        if (ReadTemplateImage(id, transaction) == null) throw new InvalidOperationException("The image no longer exists.");
        var actual = ReadTemplateImageUsage(id, transaction);
        if (!actual.ToHashSet(StringComparer.Ordinal).SetEquals(expectedTemplateNames))
            throw new InvalidOperationException("The templates using this image changed. Review the list and try again.");
        foreach (var name in actual)
        {
            using var preset = _connection.CreateCommand();
            preset.Transaction = transaction;
            preset.CommandText = "SELECT is_preset FROM templates WHERE name=@name";
            preset.Parameters.AddWithValue("@name", name);
            if (Convert.ToInt32(preset.ExecuteScalar()) != 0)
                throw new InvalidOperationException("Built-in template artwork cannot be deleted.");
        }
        foreach (var name in actual)
        {
            using var deleteTemplate = _connection.CreateCommand();
            deleteTemplate.Transaction = transaction;
            deleteTemplate.CommandText = "DELETE FROM templates WHERE name=@name";
            deleteTemplate.Parameters.AddWithValue("@name", name);
            deleteTemplate.ExecuteNonQuery();
        }
        using var deleteImage = _connection.CreateCommand();
        deleteImage.Transaction = transaction;
        deleteImage.CommandText = "DELETE FROM template_image_assets WHERE id=@id";
        deleteImage.Parameters.AddWithValue("@id", id);
        deleteImage.ExecuteNonQuery();
        transaction.Commit();
        return actual;
    }
}

/// <summary>Built-in seasonal A4 menu presets using the original DMS artwork.</summary>
internal static class SeasonalTemplateDefaults
{
    internal sealed record Definition(string Name, string AssetFile, string HeaderColor, string BodyColor);

    internal static readonly Definition[] All =
    [
        new("Spring Garden", "season-spring.png", "#356B39", "#213A23"),
        new("Summer Table", "season-summer.png", "#9A5B08", "#253F65"),
        new("Autumn Harvest", "season-autumn.png", "#8C4818", "#563116"),
        new("Winter Comfort", "season-winter.png", "#2D5D88", "#223C59")
    ];

    internal static MenuTemplate Create(Definition definition, string assetId) => new()
    {
        Name = definition.Name,
        IsPreset = true,
        Document = new TemplateDocument
        {
            HeaderText = "Weekly Menu",
            FooterText = "Allergens are highlighted in red.",
            FontFamily = "Arial",
            HeaderColor = definition.HeaderColor,
            BodyColor = definition.BodyColor,
            AllergenAccentColor = "#C60000",
            FooterColor = definition.BodyColor,
            BackgroundColor = "#FFFFFF",
            BackgroundImageAssetId = assetId,
            BackgroundImageOpacity = 1,
            DaySpacing = 6,
            MealLineSpacing = 4,
            BlockAppearances = new Dictionary<string, TemplateBlockAppearance>
            {
                ["day"] = new() { BackgroundColor = "#FFFFFF", Opacity = 0.88, Padding = 8, CornerRadius = 4 }
            },
            TextStyles = new Dictionary<string, TemplateTextStyle>
            {
                ["header"] = new() { FontFamily = "Arial", FontSize = 28, Color = definition.HeaderColor, Bold = true, Alignment = "center" },
                ["date"] = new() { FontFamily = "Arial", FontSize = 15, Color = definition.BodyColor, Alignment = "center" },
                ["heading"] = new() { FontFamily = "Arial", FontSize = 17, Color = definition.HeaderColor, Bold = true },
                ["menu"] = new() { FontFamily = "Arial", FontSize = 14, Color = definition.BodyColor },
                ["ingredients"] = new() { FontFamily = "Arial", FontSize = 12, Color = definition.BodyColor },
                ["allergens"] = new() { FontFamily = "Arial", FontSize = 12, Color = "#C60000", Bold = true, Underline = true },
                ["footer"] = new() { FontFamily = "Arial", FontSize = 10, Color = definition.BodyColor, Alignment = "center" }
            }
        }
    };

    /// <summary>Updates only the untouched first draft of a preset, never a user's customisation.</summary>
    internal static bool TryApplyRoomierTypography(string json, out string refreshedJson)
    {
        refreshedJson = json;
        try
        {
            var template = JsonSerializer.Deserialize<MenuTemplate>(json);
            var styles = template?.Document?.TextStyles;
            if (template?.Document == null || styles == null
                || !HasSize(styles, "header", 25) || !HasSize(styles, "date", 14)
                || !HasSize(styles, "heading", 15) || !HasSize(styles, "menu", 11)
                || !HasSize(styles, "ingredients", 10) || !HasSize(styles, "allergens", 10)
                || !HasSize(styles, "footer", 9) || template.Document.MealLineSpacing != 2)
                return false;

            template.Document.MealLineSpacing = 4;
            styles["header"].FontSize = 28;
            styles["date"].FontSize = 15;
            styles["heading"].FontSize = 17;
            styles["menu"].FontSize = 14;
            styles["ingredients"].FontSize = 12;
            styles["allergens"].FontSize = 12;
            styles["footer"].FontSize = 10;
            refreshedJson = JsonSerializer.Serialize(template);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool HasSize(Dictionary<string, TemplateTextStyle> styles, string key, double size)
        => styles.TryGetValue(key, out var style) && style != null && style.FontSize == size;
}

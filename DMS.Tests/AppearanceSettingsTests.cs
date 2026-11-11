using DMS.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class AppearanceSettingsTests
{
    [Fact]
    public async Task LegacyDefaultThemeLoadsAsLightAndPreservesAccent()
    {
        var folder = Path.Combine(Path.GetTempPath(), "DMS.Appearance.Tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, "settings.db");
        try
        {
            using var database = new DatabaseService(NullLogger<DatabaseService>.Instance, path);
            await database.InitializeAsync();
            using (var connection = new SqliteConnection($"Data Source={path};Pooling=False"))
            {
                await connection.OpenAsync();
                using var command = connection.CreateCommand();
                command.CommandText = "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'default'), ('accent_color', 'purple')";
                await command.ExecuteNonQueryAsync();
            }

            var settings = await database.GetSettingsAsync();
            Assert.NotNull(settings);
            Assert.Equal("light", settings.Theme);
            Assert.Equal("purple", settings.AccentColor);
            await database.SaveSettingsAsync(settings);
            Assert.Equal("light", (await database.GetSettingsAsync())!.Theme);
        }
        finally { Directory.Delete(folder, recursive: true); }
    }
}

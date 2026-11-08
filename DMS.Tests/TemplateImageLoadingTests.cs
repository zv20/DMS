using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateImageLoadingTests
{
    [Fact]
    public async Task ListingLeavesAssetsUnloadedUntilSelectedTemplateIsHydrated()
    {
        var folder = Path.Combine(Path.GetTempPath(), "DMS.TemplateLoading.Tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            using var database = new DatabaseService(NullLogger<DatabaseService>.Instance, Path.Combine(folder, "test.db"), seedBuiltInTemplates: false);
            var bytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6sAAAAASUVORK5CYII=");
            var image = await database.SaveTemplateImageAsync("Image", "image/png", bytes);
            foreach (var name in new[] { "First", "Second" })
                await database.SaveTemplateAsync(new MenuTemplate { Name = name, Document = new TemplateDocument { DecorativeImages = [new TemplateImage { AssetId = image.Id }] } });

            var templates = await database.GetAllTemplatesAsync();
            var first = templates.Single(template => template.Name == "First");
            var second = templates.Single(template => template.Name == "Second");
            Assert.True(string.IsNullOrEmpty(first.Document!.DecorativeImages[0].DataUri));
            Assert.True(string.IsNullOrEmpty(second.Document!.DecorativeImages[0].DataUri));

            await database.HydrateTemplateImagesAsync(first);
            Assert.Equal("data:image/png;base64," + Convert.ToBase64String(bytes), first.Document.DecorativeImages[0].DataUri);
            Assert.True(string.IsNullOrEmpty(second.Document.DecorativeImages[0].DataUri));
        }
        finally { Directory.Delete(folder, recursive: true); }
    }
}

using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateHistoryImagesTests
{
    [Fact]
    public void HistoryReferencesAssetsAndRestoresImagesWithoutChangingTheLiveDocument()
    {
        var history = new TemplateHistoryImages();
        var document = new TemplateDocument
        {
            BackgroundImageAssetId = "background", BackgroundImageDataUri = "background-data",
            DecorativeImages = [new TemplateImage { AssetId = "asset", DataUri = "image-data" }, new TemplateImage { DataUri = "legacy-data" }]
        };
        var json = history.Serialize(document);
        Assert.DoesNotContain("image-data", json);
        Assert.DoesNotContain("background-data", json);
        Assert.Contains("legacy-data", json);
        Assert.Equal("image-data", document.DecorativeImages[0].DataUri);
        var restored = JsonSerializer.Deserialize<TemplateDocument>(json)!;
        history.Restore(restored);
        Assert.Equal("background-data", restored.BackgroundImageDataUri);
        Assert.Equal("image-data", restored.DecorativeImages[0].DataUri);
        Assert.Equal("legacy-data", restored.DecorativeImages[1].DataUri);
    }

    [Fact]
    public void SameAssetWithDifferentInlineDataIsPreserved()
    {
        var history = new TemplateHistoryImages();
        var document = new TemplateDocument { DecorativeImages = [new TemplateImage { AssetId = "a", DataUri = "first" }] };
        history.Serialize(document);
        document.DecorativeImages[0].DataUri = "different";
        var restored = JsonSerializer.Deserialize<TemplateDocument>(history.Serialize(document))!;
        history.Restore(restored);
        Assert.Equal("different", restored.DecorativeImages[0].DataUri);
    }
}

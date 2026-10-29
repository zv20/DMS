using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateV2ImagesTests
{
    [Fact]
    public void LeftAndRightArtworkReserveSpaceWithoutOverwritingPositions()
    {
        var left = new TemplateV2Image { X = 0, Y = 0, Width = 160, Height = 150 };
        var right = new TemplateV2Image { X = 650, Y = 900, Width = 140, Height = 160 };
        var insets = TemplateV2Images.GetInsets([left, right]);
        Assert.Equal(128, insets.Left);
        Assert.Equal(112, insets.Right);
        Assert.False(insets.Overflowed);
        Assert.Equal(650, right.X);
    }

    [Fact]
    public void InvalidOrTooWideGeometryWarnsInsteadOfSilentlyOverlapping()
    {
        Assert.True(TemplateV2Images.GetInsets([new TemplateV2Image { X = -1 }]).Overflowed);
        Assert.True(TemplateV2Images.GetInsets([new TemplateV2Image { X = 0, Width = 600 }]).Overflowed);
        Assert.False(TemplateV2Images.GetInsets([new TemplateV2Image { X = 0, Width = 600, ReserveTextSpace = false }]).Overflowed);
    }

    [Fact]
    public void DecorativeImageSurvivesRoundTripAndReservesSpaceByDefault()
    {
        var image = JsonSerializer.Deserialize<TemplateV2Image>(JsonSerializer.Serialize(new TemplateV2Image { AltText = "Sun" }))!;
        Assert.True(image.ReserveTextSpace);
        Assert.Equal("Sun", image.AltText);
    }
}

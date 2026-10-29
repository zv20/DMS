using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplatePageImagesTests
{
    [Fact]
    public void LeftAndRightArtworkReserveSpaceWithoutOverwritingPositions()
    {
        var left = new TemplateImage { X = 0, Y = 0, Width = 160, Height = 150 };
        var right = new TemplateImage { X = 650, Y = 900, Width = 140, Height = 160 };
        var insets = TemplatePageImages.GetInsets([left, right]);
        Assert.Equal(128, insets.Left);
        Assert.Equal(112, insets.Right);
        Assert.False(insets.Overflowed);
        Assert.Equal(650, right.X);
    }

    [Fact]
    public void InvalidOrTooWideGeometryWarnsInsteadOfSilentlyOverlapping()
    {
        Assert.True(TemplatePageImages.GetInsets([new TemplateImage { X = -1 }]).Overflowed);
        Assert.True(TemplatePageImages.GetInsets([new TemplateImage { X = 0, Width = 600 }]).Overflowed);
        Assert.False(TemplatePageImages.GetInsets([new TemplateImage { X = 0, Width = 600, ReserveTextSpace = false }]).Overflowed);
    }

    [Fact]
    public void DecorativeImageSurvivesRoundTripAndReservesSpaceByDefault()
    {
        var image = JsonSerializer.Deserialize<TemplateImage>(JsonSerializer.Serialize(new TemplateImage { AltText = "Sun" }))!;
        Assert.True(image.ReserveTextSpace);
        Assert.Equal("Sun", image.AltText);
    }
}

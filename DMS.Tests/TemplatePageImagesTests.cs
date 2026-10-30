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

    [Fact]
    public void MovingImageStaysOnPageWithoutChangingItsDimensions()
    {
        var image = new TemplateImage { Width = 160, Height = 90 };
        TemplateImagePlacement.Move(image, -200, 9999);
        Assert.Equal(0, image.X);
        Assert.Equal(TemplatePageLayout.PageHeight - 90, image.Y);
        Assert.Equal(160, image.Width);
        Assert.Equal(90, image.Height);
    }

    [Fact]
    public void LockedResizePreservesProportionsAndKeepsEntireImageOnPage()
    {
        var image = new TemplateImage { X = 600, Y = 900, Width = 160, Height = 80 };
        TemplateImagePlacement.Resize(image, 1000, width: true);
        Assert.Equal(2, image.Width / image.Height, 6);
        Assert.True(TemplatePageImages.ValidGeometry(image));
        var json = JsonSerializer.Serialize(image);
        TemplateImagePlacement.Resize(image, double.NaN, width: true);
        Assert.Equal(json, JsonSerializer.Serialize(image));
    }

    [Fact]
    public void UnlockedResizeDoesNotChangeTheOtherDimension()
    {
        var image = new TemplateImage { X = 0, Y = 0, Width = 160, Height = 80, LockAspectRatio = false };
        TemplateImagePlacement.Resize(image, 240, width: true);
        Assert.Equal(240, image.Width);
        Assert.Equal(80, image.Height);
    }
}

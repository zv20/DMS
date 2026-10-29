using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateV2LayoutTests
{
    [Fact]
    public void AllocatesToDemandAndRetainsExplicitHeight()
    {
        var result = TemplateV2Layout.Resolve([90, 150, 100, 100, 100], [null, 175, null, null, null], 700);
        Assert.Equal(175, result.DayHeights[1]);
        Assert.False(result.Overflowed);
        Assert.True(result.DayHeights.Sum() <= 700);
    }

    [Fact]
    public void InsufficientSpaceWarnsAndNeverSilentlyChangesUserHeight()
    {
        var result = TemplateV2Layout.Resolve([100, 100, 100, 100, 100], [600, null, null, null, null], 750);
        Assert.True(result.Overflowed);
        Assert.Equal(600, result.DayHeights[0]);
    }

    [Fact]
    public void SpaceIsSharedAndLongContentIsFlagged()
    {
        var result = TemplateV2Layout.Resolve([300, 300, 300, 300, 300], null, 800);
        Assert.True(result.Overflowed);
        Assert.All(result.DayHeights, height => Assert.Equal(160, height, 3));
    }

    [Fact]
    public void V2DataSurvivesTemplateRoundTripAndOldTemplatesStayV1()
    {
        Assert.Null(JsonSerializer.Deserialize<MenuTemplate>("{}")!.V2);
        var template = new MenuTemplate { V2 = new TemplateV2Document { FooterText = "Test", DayHeights = [null, 150, null, null, null], FontFamily = "Georgia", HeaderColor = "#123456", BackgroundImageDataUri = "data:image/png;base64,YWJj", AllowFontShrink = false } };
        var restored = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template))!;
        Assert.Equal("Test", restored.V2!.FooterText);
        Assert.Equal(150, restored.V2.DayHeights[1]);
        Assert.Equal("Georgia", restored.V2.FontFamily);
        Assert.Equal("#123456", restored.V2.HeaderColor);
        Assert.Equal("data:image/png;base64,YWJj", restored.V2.BackgroundImageDataUri);
        Assert.False(restored.V2.AllowFontShrink);
    }
}

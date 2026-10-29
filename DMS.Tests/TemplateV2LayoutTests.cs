using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateV2LayoutTests
{
    [Fact]
    public void EmptyLayoutHasNoRowsAndDoesNotOverflow()
    {
        var result = TemplateV2Layout.Resolve([], [], 800);
        Assert.Empty(result.DayHeights);
        Assert.False(result.Overflowed);
    }

    [Fact]
    public void ThreeVisibleDaysShareSpaceAndKeepTheirExplicitHeights()
    {
        var result = TemplateV2Layout.Resolve([120, 180, 140], [null, 210, null], 600);
        Assert.Equal(3, result.DayHeights.Length);
        Assert.Equal(210, result.DayHeights[1]);
        Assert.False(result.Overflowed);
        Assert.True(result.DayHeights.Sum() <= 600);
        Assert.True(result.DayHeights[0] >= 120);
        Assert.True(result.DayHeights[2] >= 140);
    }

    [Fact]
    public void ThreeDayOverflowPreservesFixedHeight()
    {
        var result = TemplateV2Layout.Resolve([120, 180, 140], [null, 100, null], 600);
        Assert.Equal(100, result.DayHeights[1]);
        Assert.True(result.Overflowed);
    }

    [Fact]
    public void VisibleDaysPreserveWeekdayIndexesAndExcludeEmptyDays()
    {
        var monday = new DateTime(2026, 10, 26);
        var recipes = new[] { new Recipe { Id = 7 }, new Recipe { Id = 8 } };
        var entries = new[]
        {
            new MenuEntry { Date = monday, RecipeId = 7 },
            new MenuEntry { Date = monday, RecipeId = 8 },
            new MenuEntry { Date = monday.AddDays(2), RecipeId = 7 },
            new MenuEntry { Date = monday.AddDays(4), RecipeId = 8 },
            new MenuEntry { Date = monday.AddDays(5), RecipeId = 7 },
            new MenuEntry { Date = monday.AddDays(-1), RecipeId = 7 },
            new MenuEntry { Date = monday.AddDays(1), RecipeId = 999 }
        };
        Assert.Equal(new[] { 0, 2, 4 }, TemplateV2Layout.VisibleDayIndexes(monday, entries, recipes, true));
        Assert.Equal(new[] { 0, 1, 2, 3, 4 }, TemplateV2Layout.VisibleDayIndexes(monday, entries, recipes, false));
    }

    [Fact]
    public void EmptyWeekHasNoVisibleDaysUnlessEmptyDaysAreEnabled()
    {
        var monday = new DateTime(2026, 10, 26);
        Assert.Empty(TemplateV2Layout.VisibleDayIndexes(monday, [], [], true));
        Assert.Equal(new[] { 0, 1, 2, 3, 4 }, TemplateV2Layout.VisibleDayIndexes(monday, [], [], false));
    }

    [Fact]
    public void FixedHeightsFollowWeekdaysWhenIntermediateDaysAreHidden()
    {
        var monday = new DateTime(2026, 10, 26);
        var visible = TemplateV2Layout.VisibleDayIndexes(monday,
            [new MenuEntry { Date = monday, RecipeId = 1 }, new MenuEntry { Date = monday.AddDays(2), RecipeId = 1 }],
            [new Recipe { Id = 1 }], true);
        double?[] saved = [110, 300, 190, null, null];
        var result = TemplateV2Layout.Resolve([100, 150], visible.Select(index => saved[index]).ToArray(), 800);
        Assert.Equal(new[] { 110d, 190d }, result.DayHeights);
        Assert.False(result.Overflowed);
    }

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

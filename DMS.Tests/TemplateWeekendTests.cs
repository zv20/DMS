using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateWeekendTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void WeekendVisibilityRespectsSettingWhenEmptyDaysAreHidden(bool includeWeekend)
    {
        var monday = new DateTime(2026, 10, 26);
        var entries = new[]
        {
            new MenuEntry { Date = monday, RecipeId = 3 },
            new MenuEntry { Date = monday.AddDays(5), RecipeId = 3 },
            new MenuEntry { Date = monday.AddDays(6), RecipeId = 99 }
        };
        var visible = TemplatePageLayout.VisibleDayIndexes(monday, entries, [new Recipe { Id = 3 }], true, includeWeekend);
        Assert.Equal(includeWeekend ? new[] { 0, 5 } : new[] { 0 }, visible);
    }

    [Theory]
    [InlineData(false, 5)]
    [InlineData(true, 7)]
    public void ShowingEmptyDaysIncludesOnlyEnabledDays(bool includeWeekend, int expectedCount)
    {
        var visible = TemplatePageLayout.VisibleDayIndexes(new DateTime(2026, 10, 26), [], [], false, includeWeekend);
        Assert.Equal(Enumerable.Range(0, expectedCount), visible);
    }

    [Fact]
    public void SevenDaysFitWithPinnedWeekendHeight()
    {
        var result = TemplatePageLayout.Resolve([80, 90, 100, 80, 90, 95, 85], [null, null, null, null, null, 110, null], 700);
        Assert.Equal(7, result.DayHeights.Length);
        Assert.Equal(110, result.DayHeights[5]);
        Assert.True(result.DayHeights[6] >= 85);
        Assert.False(result.Overflowed);
    }

    [Fact]
    public void SevenDayOverflowDoesNotAlterPinnedWeekendHeight()
    {
        var result = TemplatePageLayout.Resolve([120, 120, 120, 120, 120, 120, 120], [null, null, null, null, null, 90, null], 700);
        Assert.True(result.Overflowed);
        Assert.Equal(90, result.DayHeights[5]);
    }
}

using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class WeekendLayoutTests
{
    [Fact]
    public void OldTemplatesRemainFiveDays()
    {
        var template = JsonSerializer.Deserialize<MenuTemplate>("{}")!;
        TemplateLayout.EnsureInitialized(template);
        Assert.False(template.IncludeWeekend);
        Assert.False(template.LayoutElements.ContainsKey("menu:5"));
    }

    [Fact]
    public void SevenDayGridFitsBetweenDateAndFooterAndSurvivesReload()
    {
        var template = new MenuTemplate();
        TemplateLayout.InitializeSevenDayLayout(template);
        var restored = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template))!;
        Assert.True(restored.IncludeWeekend);
        for (var day = 0; day < 7; day++)
        {
            var heading = restored.LayoutElements[$"heading:{day}"];
            var menu = restored.LayoutElements[$"menu:{day}"];
            Assert.True(heading.Y >= 120);
            Assert.True(menu.Y + menu.Height < restored.LayoutElements["footer"].Y);
            Assert.True(menu.X + menu.Width <= TemplateLayout.PageWidth);
        }
        Assert.Equal(40, restored.LayoutElements["header"].X);
    }
}

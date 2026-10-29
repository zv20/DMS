using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateStyleTests
{
    [Fact]
    public void DefaultsRespectExistingTemplateColorsAndDoNotMutateSavedStyles()
    {
        var template = new TemplateDocument { FontFamily = "Georgia", FontSize = 16, HeaderColor = "#123456", BodyColor = "#456789" };
        var header = TemplateRenderer.GetTextStyle(template, "header");
        var heading = TemplateRenderer.GetTextStyle(template, "heading:2");
        Assert.Equal("#123456", header.Color);
        Assert.Equal("Georgia", header.FontFamily);
        Assert.Equal(24, header.FontSize);
        Assert.Equal(17, heading.FontSize);
        Assert.Equal("#456789", heading.Color);
        Assert.Empty(template.TextStyles);
    }

    [Fact]
    public void DayOverrideWinsOverSharedStyleAndSurvivesSerialization()
    {
        var template = new TemplateDocument();
        template.TextStyles["ingredients"] = new TemplateTextStyle { FontSize = 12, Color = "#112233" };
        template.TextStyles["ingredients:1"] = new TemplateTextStyle { FontSize = 15, Color = "#AABBCC", Italic = true };
        template.BlockAppearances["day:1"] = new TemplateBlockAppearance { BackgroundColor = "#AABBCC", Padding = 9 };
        var restored = JsonSerializer.Deserialize<TemplateDocument>(JsonSerializer.Serialize(template))!;
        Assert.Equal("#112233", TemplateRenderer.GetTextStyle(restored, "ingredients:0").Color);
        var day = TemplateRenderer.GetTextStyle(restored, "ingredients:1");
        Assert.Equal("#AABBCC", day.Color);
        Assert.True(day.Italic);
        day.Color = "#000000";
        Assert.Equal("#AABBCC", restored.TextStyles["ingredients:1"].Color);
        Assert.Equal(9, restored.BlockAppearances["day:1"].Padding);
    }
}

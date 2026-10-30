using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateExtraTextTests
{
    [Fact]
    public void OldTemplatesDoNotGainExtraTextOrLocks()
    {
        var template = JsonSerializer.Deserialize<MenuTemplate>("{}")!;
        TemplateLayout.EnsureInitialized(template);
        Assert.Empty(template.TextLayers);
        Assert.False(template.LayoutElements["header"].IsPositionLocked);
    }

    [Fact]
    public void ExtraTextAndPositionLocksSurviveSerialization()
    {
        var template = new MenuTemplate();
        TemplateLayout.EnsureInitialized(template);
        template.LayoutElements["header"].IsPositionLocked = true;
        template.ImageLayers.Add(new TemplateImageLayer { Id = "logo", IsPositionLocked = true });
        template.TextLayers.Add(new TemplateTextLayer { Id = "note", Text = "Today's menu", X = 100, IsPositionLocked = true, Style = new TemplateTextStyle { Color = "#123456" } });
        var restored = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template))!;
        Assert.True(restored.LayoutElements["header"].IsPositionLocked);
        Assert.True(Assert.Single(restored.ImageLayers).IsPositionLocked);
        var note = Assert.Single(restored.TextLayers);
        Assert.Equal("Today's menu", note.Text);
        Assert.Equal(100, note.X);
        Assert.True(note.IsPositionLocked);
        Assert.Equal("#123456", note.Style.Color);
    }
}

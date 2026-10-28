using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateLayoutTests
{
    [Fact]
    public void InitializationAddsMissingObjectsWithoutReplacingSavedPositions()
    {
        var template = new MenuTemplate();
        Assert.False(template.LayoutEnabled);
        TemplateLayout.EnsureInitialized(template);
        template.LayoutElements["header"].X = 125;
        template.LayoutElements.Remove("menu:3");
        TemplateLayout.EnsureInitialized(template);
        Assert.True(template.LayoutEnabled);
        Assert.Equal(125, template.LayoutElements["header"].X);
        Assert.Contains("menu:3", template.LayoutElements.Keys);
        Assert.Equal(13, template.LayoutElements.Count);
    }

    [Fact]
    public void PagePositionsAndImageLayersSurviveJsonRoundTrip()
    {
        var template = new MenuTemplate();
        TemplateLayout.EnsureInitialized(template);
        template.LayoutElements["date"].Y = 212.5;
        template.ImageLayers.Add(new TemplateImageLayer { Id = "logo", DataUri = "data:image/png;base64,YWJj", X = 75, Y = 81, ZIndex = 12, Opacity = .5 });
        var saved = JsonSerializer.Serialize(template);
        var restored = JsonSerializer.Deserialize<MenuTemplate>(saved)!;
        Assert.True(restored.LayoutEnabled);
        Assert.Equal(212.5, restored.LayoutElements["date"].Y);
        Assert.Equal("data:image/png;base64,YWJj", Assert.Single(restored.ImageLayers).DataUri);
        Assert.Equal(12, restored.ImageLayers[0].ZIndex);
        Assert.Equal(.5, restored.ImageLayers[0].Opacity);
    }

    [Fact]
    public void MenuSizingKeepsExistingTemplatesFixedAndBoundsOptInGrowth()
    {
        var template = new MenuTemplate();
        TemplateLayout.EnsureInitialized(template);
        var element = template.LayoutElements["menu:0"];

        Assert.Equal(135, TemplateLayout.ResolveMenuHeight(template, element, 300).Height);

        template.MenuBlockSizing = new TemplateMenuBlockSizing { Enabled = true, MinimumHeight = 110, MaximumHeight = 155 };
        var bounded = TemplateLayout.ResolveMenuHeight(template, element, 300);
        Assert.Equal(155, bounded.Height);
        Assert.True(bounded.Overflowed);
        Assert.Equal(110, TemplateLayout.ResolveMenuHeight(template, element, 10).Height);
    }

    [Fact]
    public void MenuSizingPolicySurvivesJsonRoundTrip()
    {
        var template = new MenuTemplate { MenuBlockSizing = new TemplateMenuBlockSizing { Enabled = true, MinimumHeight = 95, MaximumHeight = 150 } };
        var restored = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template))!;
        Assert.True(restored.MenuBlockSizing.Enabled);
        Assert.Equal(95, restored.MenuBlockSizing.MinimumHeight);
        Assert.Equal(150, restored.MenuBlockSizing.MaximumHeight);
    }

    [Fact]
    public async Task SavedLayoutSurvivesDatabaseReopen()
    {
        var directory = Path.Combine(Path.GetTempPath(), "DMS.LayoutTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, "dms.db");
        try
        {
            var template = new MenuTemplate { Name = "Layout", LegacyDataJson = "{\"legacy\":true}" };
            TemplateLayout.EnsureInitialized(template);
            template.LayoutElements["header"].X = 150;
            template.ImageLayers.Add(new TemplateImageLayer { Id = "logo", DataUri = "data:image/png;base64,YWJj", ZIndex = 30 });
            using (var db = new DatabaseService(NullLogger<DatabaseService>.Instance, path)) await db.SaveTemplateAsync(template);
            using (var db = new DatabaseService(NullLogger<DatabaseService>.Instance, path))
            {
                var reopened = (await db.GetAllTemplatesAsync()).Single(item => item.Name == "Layout");
                Assert.Equal(150, reopened.LayoutElements["header"].X);
                Assert.Equal(30, Assert.Single(reopened.ImageLayers).ZIndex);
                Assert.Equal(template.LegacyDataJson, reopened.LegacyDataJson);
            }
        }
        finally { Directory.Delete(directory, recursive: true); }
    }
}

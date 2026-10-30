using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplatePageAndImageTests
{
    [Fact]
    public void DefaultPageAndImageMetadataPreserveExistingPositionedOutput()
    {
        var week = new DateTime(2026, 10, 26);
        var baseline = new MenuTemplate { LayoutEnabled = true };
        baseline.ImageLayers.Add(new TemplateImageLayer { DataUri = "data:image/png;base64,AAAA", X = 12, Y = 20, Width = 100, Height = 80 });
        var explicitDefaults = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(baseline))!;
        explicitDefaults.PageSettings = new TemplatePageSettings();

        var oldHtml = MenuOutputService.BuildHtml(baseline, week, [], []);
        var defaultHtml = MenuOutputService.BuildHtml(explicitDefaults, week, [], []);

        Assert.Equal(oldHtml, defaultHtml);
        Assert.Contains("<img alt='' src=\"data:image/png;base64,AAAA\"", defaultHtml);
        Assert.DoesNotContain("transform:rotate", defaultHtml);
        Assert.DoesNotContain("object-fit:cover", defaultHtml);
    }

    [Fact]
    public void PageAndImageOptionsRoundTripAndOnlyRenderValidatedPresentationValues()
    {
        var template = new MenuTemplate
        {
            LayoutEnabled = true,
            PageSettings = new TemplatePageSettings { Size = "a4", Orientation = "landscape", SafeMargin = 25 }
        };
        template.ImageLayers.Add(new TemplateImageLayer
        {
            DataUri = "data:image/png;base64,AAAA",
            FitMode = "cover",
            LockAspectRatio = true,
            RotationDegrees = 15.5,
            AltText = "Logo <for menu>"
        });
        var restored = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template))!;
        Assert.Equal(25, restored.PageSettings!.SafeMargin);
        Assert.True(restored.ImageLayers[0].LockAspectRatio);
        // Imported/untrusted data can still contain invalid values after deserialization;
        // rendering must reject those rather than emitting unsafe CSS.
        restored.ImageLayers.Add(new TemplateImageLayer
        {
            DataUri = "data:image/png;base64,BBBB",
            FitMode = "cover;position:fixed",
            RotationDegrees = double.PositiveInfinity,
            AltText = "' quoted"
        });
        var html = MenuOutputService.BuildHtml(restored, new DateTime(2026, 10, 26), [], []);

        Assert.Contains("@page{size:A4 landscape;margin:0}", html);
        Assert.Contains("object-fit:cover;transform:rotate(15.5deg);transform-origin:center", html);
        Assert.Contains("alt='Logo &lt;for menu&gt;'", html);
        Assert.Contains("alt='&#39; quoted'", html);
        Assert.DoesNotContain("cover;position:fixed", html);
        Assert.DoesNotContain("rotate(Infinity", html);
    }
}

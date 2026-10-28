using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class RichTemplateContentTests
{
    [Fact]
    public void MissingOrEmptyRichRunsKeepTheLegacyPlainTextOutput()
    {
        var week = new DateTime(2026, 10, 26);
        var legacy = new MenuTemplate { HeaderText = "<Weekly>", FooterText = "<Footer>", TemplateStyle = "detailed" };
        var emptyRichContent = new MenuTemplate
        {
            HeaderText = legacy.HeaderText,
            FooterText = legacy.FooterText,
            TemplateStyle = legacy.TemplateStyle,
            HeaderRichText = new TemplateRichTextContent(),
            FooterRichText = new TemplateRichTextContent()
        };

        Assert.Equal(MenuOutputService.BuildHtml(legacy, week, [], []), MenuOutputService.BuildHtml(emptyRichContent, week, [], []));
    }

    [Fact]
    public void RichHeaderAndFooterRoundTripAndRenderOnlySafeStructuredMarkup()
    {
        var template = new MenuTemplate { LayoutEnabled = true, HeaderText = "Legacy header", FooterText = "Legacy footer" };
        template.HeaderRichText = new TemplateRichTextContent
        {
            Runs =
            [
                new TemplateRichTextRun { Text = "Fresh ", Bold = true, Color = "#123456" },
                new TemplateRichTextRun { Text = "<not markup>", FontFamily = "Georgia", FontSize = 18, Underline = true },
                new TemplateRichTextRun { Text = " unsafe", FontFamily = "bad';color:red", Color = "red;position:absolute", FontSize = 900 }
            ]
        };
        template.FooterRichText = new TemplateRichTextContent { Runs = [new TemplateRichTextRun { Text = "Line one\nLine two", Italic = true }] };

        var restored = JsonSerializer.Deserialize<MenuTemplate>(JsonSerializer.Serialize(template))!;
        var html = MenuOutputService.BuildHtml(restored, new DateTime(2026, 10, 26), [], []);

        Assert.Contains("font-weight:bold", html);
        Assert.Contains("color:#123456", html);
        Assert.Contains("font-family:'Georgia';font-size:18px;text-decoration:underline", html);
        Assert.Contains("&lt;not markup&gt;", html);
        Assert.Contains("Line one<br>Line two", html);
        Assert.DoesNotContain("bad';color:red", html);
        Assert.DoesNotContain("color:red", html);
        Assert.DoesNotContain("font-size:900px", html);
    }
}

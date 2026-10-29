using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateV2ConversionTests
{
    [Fact]
    public void ConversionKeepsOriginalAndCarriesSupportedFields()
    {
        var original = new MenuTemplate
        {
            Name = "Old", HeaderText = "Our menu", FooterText = "Footer", FontFamily = "Georgia",
            MealFontSize = 12, HeaderFontSize = 30, HeaderColor = "#112233", HeaderItalic = true,
            FooterAlignment = "left", BackgroundColor = "#EEEEEE", BackgroundImageDataUri = "data:image/png;base64,YQ==",
            LegacyDataJson = "{\"unsupported\":true}", NativeStyleInitialized = true,
            TextStyles = new() { ["heading:0"] = new TemplateTextStyle { Color = "#123456" } }
        };
        var snapshot = JsonSerializer.Serialize(original);

        var converted = TemplateV2Conversion.ToV2Copy(original);

        Assert.Equal(snapshot, JsonSerializer.Serialize(original));
        Assert.Null(original.V2);
        Assert.Equal(original.LegacyDataJson, converted.LegacyDataJson);
        Assert.Equal("Our menu", converted.V2!.HeaderText);
        Assert.Equal("Footer", converted.V2.FooterText);
        Assert.Equal("Georgia", converted.V2.FontFamily);
        Assert.Equal(12, converted.V2.FontSize);
        Assert.Equal("#EEEEEE", converted.V2.BackgroundColor);
        Assert.Equal(original.BackgroundImageDataUri, converted.V2.BackgroundImageDataUri);
        Assert.True(converted.V2.TextStyles["header"].Italic);
        Assert.Equal("left", converted.V2.TextStyles["footer"].Alignment);
        Assert.Equal("#123456", converted.V2.TextStyles["heading:0"].Color);
    }

    [Fact]
    public void BrowserLegacyDefaultsAndRichTextAreConvertedOnCopy()
    {
        var original = new MenuTemplate
        {
            Name = "Browser", HeaderText = "<b>Old header</b>", FooterText = "Footer",
            LegacyDataJson = "{\"headerColor\":\"#445566\",\"headerFontSize\":28}",
            FooterRichText = new TemplateRichTextContent { Runs = [new() { Text = "First " }, new() { Text = "second", Bold = true }] }
        };

        var converted = TemplateV2Conversion.ToV2Copy(original);

        Assert.Equal("<b>Old header</b>", original.HeaderText);
        Assert.False(original.NativeStyleInitialized);
        Assert.Equal("Old header", converted.V2!.HeaderText);
        Assert.Equal("First second", converted.V2.FooterText);
        Assert.Equal("#445566", converted.V2.TextStyles["header"].Color);
        Assert.Equal(28, converted.V2.TextStyles["header"].FontSize);
        Assert.Equal(original.LegacyDataJson, converted.LegacyDataJson);
    }

    [Fact]
    public void AlreadyV2TemplateIsCopiedWithoutChangingIt()
    {
        var original = new MenuTemplate { Name = "New", V2 = new TemplateV2Document { HeaderText = "Original" } };
        var converted = TemplateV2Conversion.ToV2Copy(original);
        converted.V2!.HeaderText = "Edited";
        Assert.Equal("Original", original.V2!.HeaderText);
    }

    [Fact]
    public void ConversionKeepsSizesAndOpacityWithinV2EditorLimits()
    {
        var original = new MenuTemplate
        {
            MealFontSize = 2, HeaderFontSize = 90, FooterFontSize = 1, BackgroundImageOpacity = 2,
            TextStyles = new() { ["menu:6"] = new TemplateTextStyle { FontSize = 100 } }
        };

        var v2 = TemplateV2Conversion.ToV2Copy(original).V2!;

        Assert.Equal(10, v2.FontSize);
        Assert.Equal(10, v2.MinimumFontSize);
        Assert.Equal(48, v2.TextStyles["header"].FontSize);
        Assert.Equal(7, v2.TextStyles["footer"].FontSize);
        Assert.Equal(48, v2.TextStyles["menu:6"].FontSize);
        Assert.Equal(1, v2.BackgroundImageOpacity);
    }
}

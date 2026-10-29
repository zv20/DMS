using System.Text.Json;
using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateConversionTests
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

        var converted = TemplateConversion.ToEditableCopy(original);

        Assert.Equal(snapshot, JsonSerializer.Serialize(original));
        Assert.Null(original.Document);
        Assert.Equal(original.LegacyDataJson, converted.LegacyDataJson);
        Assert.Equal("Our menu", converted.Document!.HeaderText);
        Assert.Equal("Footer", converted.Document.FooterText);
        Assert.Equal("Georgia", converted.Document.FontFamily);
        Assert.Equal(12, converted.Document.FontSize);
        Assert.Equal("#EEEEEE", converted.Document.BackgroundColor);
        Assert.Equal(original.BackgroundImageDataUri, converted.Document.BackgroundImageDataUri);
        Assert.True(converted.Document.TextStyles["header"].Italic);
        Assert.Equal("left", converted.Document.TextStyles["footer"].Alignment);
        Assert.Equal("#123456", converted.Document.TextStyles["heading:0"].Color);
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

        var converted = TemplateConversion.ToEditableCopy(original);

        Assert.Equal("<b>Old header</b>", original.HeaderText);
        Assert.False(original.NativeStyleInitialized);
        Assert.Equal("Old header", converted.Document!.HeaderText);
        Assert.Equal("First second", converted.Document.FooterText);
        Assert.Equal("#445566", converted.Document.TextStyles["header"].Color);
        Assert.Equal(28, converted.Document.TextStyles["header"].FontSize);
        Assert.Equal(original.LegacyDataJson, converted.LegacyDataJson);
    }

    [Fact]
    public void ExistingTemplateDocumentIsCopiedWithoutChangingIt()
    {
        var original = new MenuTemplate { Name = "New", Document = new TemplateDocument { HeaderText = "Original" } };
        var converted = TemplateConversion.ToEditableCopy(original);
        converted.Document!.HeaderText = "Edited";
        Assert.Equal("Original", original.Document!.HeaderText);
    }

    [Fact]
    public void ConversionKeepsSizesAndOpacityWithinEditorLimits()
    {
        var original = new MenuTemplate
        {
            MealFontSize = 2, HeaderFontSize = 90, FooterFontSize = 1, BackgroundImageOpacity = 2,
            TextStyles = new() { ["menu:6"] = new TemplateTextStyle { FontSize = 100 } }
        };

        var document = TemplateConversion.ToEditableCopy(original).Document!;

        Assert.Equal(10, document.FontSize);
        Assert.Equal(10, document.MinimumFontSize);
        Assert.Equal(48, document.TextStyles["header"].FontSize);
        Assert.Equal(7, document.TextStyles["footer"].FontSize);
        Assert.Equal(48, document.TextStyles["menu:6"].FontSize);
        Assert.Equal(1, document.BackgroundImageOpacity);
    }
}

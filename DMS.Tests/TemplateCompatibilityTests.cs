using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateCompatibilityTests
{
    [Fact]
    public void ImportedBrowserStylesAreMappedWithoutDiscardingOriginalJson()
    {
        const string legacy = """{"templateStyle":"detailed-2col","headerFontSize":30,"mealFontFamily":"Georgia, serif","showCalories":false,"backgroundImages":[{"image":"missing.png"}]}""";
        var template = new MenuTemplate { LegacyDataJson = legacy, HeaderText = "<b>Menu</b>" };
        TemplateCompatibility.ApplyLegacyDefaults(template);
        Assert.Equal("detailed-2col", template.TemplateStyle);
        Assert.Equal(30, template.HeaderFontSize);
        Assert.Equal("Georgia", template.FontFamily);
        Assert.False(template.ShowCalories);
        Assert.Equal("Menu", template.HeaderText);
        Assert.Equal(legacy, template.LegacyDataJson);
        Assert.Null(template.BackgroundImageDataUri);
        template.HeaderFontSize = 18;
        TemplateCompatibility.ApplyLegacyDefaults(template);
        Assert.Equal(18, template.HeaderFontSize);
    }

    [Fact]
    public void MalformedLegacyJsonDoesNotPreventTemplateLoading()
    {
        var template = new MenuTemplate { LegacyDataJson = "{invalid", HeaderText = "Menu" };
        TemplateCompatibility.ApplyLegacyDefaults(template);
        Assert.Equal("Menu", template.HeaderText);
        Assert.Equal("{invalid", template.LegacyDataJson);
    }
}

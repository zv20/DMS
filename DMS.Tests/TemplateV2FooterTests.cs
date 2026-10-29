using DMS.Models;
using Xunit;

namespace DMS.Tests;

public sealed class TemplateV2FooterTests
{
    [Theory]
    [InlineData("Footer", "Notice", "Footer\nNotice")]
    [InlineData("Footer\n", "Notice", "Footer\nNotice")]
    [InlineData("Footer", "\nNotice", "Footer\nNotice")]
    [InlineData("Footer\r\n\r\n", "\nNotice\n", "Footer\r\n\r\n\nNotice\n")]
    [InlineData("", "Notice", "Notice")]
    [InlineData("Footer", "", "Footer")]
    [InlineData("", "", "")]
    public void LegacyNoticeIsMergedWithoutDiscardingText(string footer, string notice, string expected)
    {
        var document = new TemplateV2Document { FooterText = footer, FooterNoticeText = notice };

        document.MergeLegacyFooterNotice();
        document.MergeLegacyFooterNotice();

        Assert.Equal(expected, document.FooterText);
        Assert.Equal("", document.FooterNoticeText);
    }
}

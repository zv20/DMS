using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplatePaginationTests
{
    [Fact]
    public void StartsNextPageWithFirstDayThatDidNotFit()
    {
        int[] heights = [120, 180, 220, 160, 110];
        var pages = TemplatePagination.Plan([0, 1, 2, 3, 4], days => days.Sum(day => heights[day]) <= 400);
        Assert.Collection(pages,
            first => Assert.Equal(new[] { 0, 1 }, first),
            second => Assert.Equal(new[] { 2, 3 }, second),
            last => Assert.Equal(new[] { 4 }, last));
    }

    [Fact]
    public void OversizedDayGetsItsOwnPageAndLaterDaysStayTogether()
    {
        var pages = TemplatePagination.Plan([0, 1, 3, 6], days => !days.Contains(1));
        Assert.Collection(pages, p => Assert.Equal(new[] { 0 }, p),
            p => Assert.Equal(new[] { 1 }, p), p => Assert.Equal(new[] { 3, 6 }, p));
    }

    [Fact]
    public void WeekThatFitsKeepsItsOriginalPage()
    {
        int[] days = [0, 1, 2, 3, 4];
        Assert.Same(days, Assert.Single(TemplatePagination.Plan(days, _ => true)));
    }

    [Theory]
    [InlineData("en-US", "dddd, d MMMM", "Monday, 2 November")]
    [InlineData("bg-BG", "dddd, d MMMM", "понеделник, 2 ноември")]
    [InlineData("bg-BG", "dddd", "понеделник")]
    [InlineData("bg-BG", "dddd d", "понеделник 2")]
    [InlineData("bg-BG", "d dddd", "2 понеделник")]
    [InlineData("bg-BG", "%d", "2")]
    public void FormatsDayUsingSelectedLanguage(string language, string format, string expected)
    {
        Assert.Equal(expected, TemplateDates.Day(new DateTime(2026, 11, 2), format,
            System.Globalization.CultureInfo.GetCultureInfo(language)));
    }

    [Fact]
    public void DateRangeUsesSelectedFormatAndAvoidsRepeatingASingleDay()
    {
        var culture = System.Globalization.CultureInfo.GetCultureInfo("bg-BG");
        var first = new DateTime(2026, 11, 2);
        Assert.Equal("2 ноември – 5 ноември", TemplateDates.Range(first, first.AddDays(3), "d MMMM", culture));
        Assert.Equal("понеделник 2 – четвъртък 5", TemplateDates.Range(first, first.AddDays(3), "dddd d", culture));
        Assert.Equal("02.11.2026", TemplateDates.Range(first, first, "dd.MM.yyyy", culture));
    }

    [Fact]
    public void ImagePdfContainsEachPageAndValidCrossReferenceOffsets()
    {
        var bytes = ImagePdf.Create((byte[][])[new byte[] { 1, 2 }, new byte[] { 3, 4 }], 1588, 2246);
        var text = System.Text.Encoding.ASCII.GetString(bytes);
        Assert.Contains("/Count 2", text);
        Assert.Contains("/Kids [3 0 R 6 0 R]", text);
        var xref = text.IndexOf("xref\n", StringComparison.Ordinal);
        var lines = text[xref..].Split('\n');
        Assert.Equal("0 9", lines[1]);
        for (var i = 1; i <= 8; i++)
        {
            var offset = int.Parse(lines[i + 2][..10]);
            Assert.StartsWith($"{i} 0 obj", text[offset..]);
        }
    }
}

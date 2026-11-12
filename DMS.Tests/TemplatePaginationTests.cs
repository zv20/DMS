using DMS.Models;
using DMS.Services;
using Xunit;

namespace DMS.Tests;

public sealed class TemplatePaginationTests
{
    [Fact]
    public void KeepsAllEntriesInOrderWhenSlotGroupsNeedSplitting()
    {
        var monday = new DateTime(2026, 11, 9);
        var entries = Enumerable.Range(1, 3).SelectMany(slot => Enumerable.Range(0, 5)
            .Select(day => new MenuEntry { Slot = $"slot{slot}", Date = monday.AddDays(day), RecipeId = slot * 10 + day })).ToList();
        var pages = TemplatePagination.Split(entries, items => items.Count <= 4);
        Assert.NotNull(pages);
        Assert.All(pages, page => Assert.InRange(page.Count, 1, 4));
        Assert.Equal(entries.OrderBy(e => MenuOutputService.SlotOrder(e.Slot)).ThenBy(e => e.Date).Select(e => e.RecipeId), pages.SelectMany(page => page).Select(e => e.RecipeId));
    }

    [Fact]
    public void RejectsAnIndividualEntryThatCannotFit()
    {
        Assert.Null(TemplatePagination.Split([new MenuEntry { Slot = "slot1" }], _ => false));
    }

    [Fact]
    public void ImagePdfContainsEachPageAndValidCrossReferenceOffsets()
    {
        var bytes = ImagePdf.Create([new byte[] { 1, 2 }, new byte[] { 3, 4 }], 1588, 2246);
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

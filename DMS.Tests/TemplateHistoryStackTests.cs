using DMS.Services;
using Xunit;

namespace DMS.Tests;

public class TemplateHistoryStackTests
{
    [Fact]
    public void EntryLimitKeepsMostRecentStatesInUndoOrder()
    {
        var history = new TemplateHistoryStack(maxEntries: 2, maxBytes: 100);
        history.Push("one"); history.Push("two"); history.Push("three");
        Assert.Equal(2, history.Count);
        Assert.Equal("three", history.Pop());
        Assert.Equal("two", history.Pop());
    }

    [Fact]
    public void ByteLimitEvictsOldStatesAndPopReleasesBudget()
    {
        var history = new TemplateHistoryStack(maxEntries: 10, maxBytes: 12);
        history.Push("abc"); history.Push("def"); history.Push("gh");
        Assert.Equal("gh", history.Pop());
        history.Push("ij");
        Assert.Equal("ij", history.Pop());
        Assert.Equal("def", history.Pop());
        Assert.Equal(0, history.Count);
    }

    [Fact]
    public void OversizedStateClearsHistoryToAvoidSkippingAnEdit()
    {
        var history = new TemplateHistoryStack(maxEntries: 10, maxBytes: 6);
        history.Push("abc"); history.Push("abcd");
        Assert.False(history.TryPeek(out _));
        history.Push("ok");
        Assert.Equal("ok", history.Pop());
    }
}

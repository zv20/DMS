using DMS.Services;
using Xunit;

namespace DMS.Tests;

public class MemoryBudgetCacheTests
{
    [Fact]
    public void EvictsLeastRecentlyUsedUntilUnderByteAndCountLimits()
    {
        var cache = new MemoryBudgetCache<string, int>(10, 2);
        cache.Put("a", 1, 4); cache.Put("b", 2, 4);
        Assert.True(cache.TryGet("a", out _));
        cache.Put("c", 3, 5);
        Assert.False(cache.TryGet("b", out _));
        Assert.True(cache.TryGet("a", out _));
        Assert.True(cache.TryGet("c", out _));
        Assert.Equal(9, cache.Bytes);
        cache.Put("d", 4, 9);
        Assert.Equal(1, cache.Count);
        Assert.Equal(9, cache.Bytes);
        Assert.True(cache.TryGet("d", out _));
    }

    [Fact]
    public void OversizedValuesAreNotRetainedAndReplacingUpdatesBudget()
    {
        var cache = new MemoryBudgetCache<string, int>(10, 3);
        cache.Put("a", 1, 5); cache.Put("a", 2, 3);
        Assert.Equal(3, cache.Bytes);
        cache.Put("huge", 3, 11);
        Assert.False(cache.TryGet("huge", out _));
        Assert.Equal(3, cache.Bytes);
        cache.Clear();
        Assert.Equal(0, cache.Bytes); Assert.Equal(0, cache.Count);
    }
}

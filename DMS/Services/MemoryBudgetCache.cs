namespace DMS.Services;

/// <summary>Least-recently-used cache bounded by estimated retained bytes and entry count.</summary>
public sealed class MemoryBudgetCache<TKey, TValue> where TKey : notnull
{
    private readonly long _maxBytes;
    private readonly int _maxEntries;
    private readonly Dictionary<TKey, LinkedListNode<(TKey Key, TValue Value, long Bytes)>> _entries = new();
    private readonly LinkedList<(TKey Key, TValue Value, long Bytes)> _order = new();
    public long Bytes { get; private set; }
    public int Count => _entries.Count;

    public MemoryBudgetCache(long maxBytes, int maxEntries)
    {
        if (maxBytes <= 0) throw new ArgumentOutOfRangeException(nameof(maxBytes));
        if (maxEntries <= 0) throw new ArgumentOutOfRangeException(nameof(maxEntries));
        _maxBytes = maxBytes; _maxEntries = maxEntries;
    }

    public bool TryGet(TKey key, out TValue value)
    {
        if (_entries.TryGetValue(key, out var node))
        {
            _order.Remove(node); _order.AddLast(node);
            value = node.Value.Value;
            return true;
        }
        value = default!;
        return false;
    }

    public void Put(TKey key, TValue value, long bytes)
    {
        if (bytes <= 0) throw new ArgumentOutOfRangeException(nameof(bytes));
        if (_entries.Remove(key, out var old)) { _order.Remove(old); Bytes -= old.Value.Bytes; }
        if (bytes > _maxBytes) return;
        while (_entries.Count >= _maxEntries || Bytes > _maxBytes - bytes)
        {
            var first = _order.First!;
            _order.RemoveFirst(); _entries.Remove(first.Value.Key); Bytes -= first.Value.Bytes;
        }
        var node = _order.AddLast((key, value, bytes));
        _entries.Add(key, node); Bytes += bytes;
    }

    public void Clear() { _entries.Clear(); _order.Clear(); Bytes = 0; }
}

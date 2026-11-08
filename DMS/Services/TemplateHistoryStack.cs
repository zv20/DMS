namespace DMS.Services;

// Limits retained UTF-16 snapshot contents; object overhead and the live document
// are separate from this budget. Oldest states are discarded first.
public sealed class TemplateHistoryStack
{
    private readonly LinkedList<string> _entries = new();
    private readonly int _maxEntries;
    private readonly long _maxBytes;
    private long _bytes;

    public TemplateHistoryStack(int maxEntries = 50, long maxBytes = 32L * 1024 * 1024)
    {
        if (maxEntries <= 0) throw new ArgumentOutOfRangeException(nameof(maxEntries));
        if (maxBytes <= 0) throw new ArgumentOutOfRangeException(nameof(maxBytes));
        _maxEntries = maxEntries;
        _maxBytes = maxBytes;
    }

    public int Count => _entries.Count;

    public bool TryPeek(out string? value)
    {
        value = _entries.Last?.Value;
        return value != null;
    }

    public void Push(string value)
    {
        ArgumentNullException.ThrowIfNull(value);
        var size = (long)value.Length * sizeof(char);
        // Skipping an intermediate state while keeping older states would make
        // undo jump over an edit, so discard the old history in this case.
        if (size > _maxBytes) { Clear(); return; }
        while (_entries.Count >= _maxEntries || _bytes + size > _maxBytes)
        {
            _bytes -= (long)_entries.First!.Value.Length * sizeof(char);
            _entries.RemoveFirst();
        }
        _entries.AddLast(value);
        _bytes += size;
    }

    public string Pop()
    {
        if (_entries.Last is not { } last) throw new InvalidOperationException("History is empty.");
        var value = last.Value;
        _entries.RemoveLast();
        _bytes -= (long)value.Length * sizeof(char);
        return value;
    }

    public void Clear() { _entries.Clear(); _bytes = 0; }
}

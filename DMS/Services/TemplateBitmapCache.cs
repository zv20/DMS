using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage.Streams;

namespace DMS.Services;

// Owned by a preview session. Reuse decoded images across rerenders and bound
// retention; callers clear the cache when the preview or dialog goes away.
public sealed class TemplateBitmapCache
{
    private readonly Dictionary<(string Uri, int Width, int Limit), Task<BitmapImage>> _images = new();
    private readonly Queue<(string Uri, int Width, int Limit)> _order = new();
    private readonly SemaphoreSlim _decodeGate = new(2, 2);
    private CancellationTokenSource _lifetime = new();
    private const int MaxEntries = 6;

    public Task<BitmapImage> GetAsync(string uri, int width, int maxBytes)
    {
        var key = (uri, width, maxBytes);
        if (_images.TryGetValue(key, out var existing)) return existing;
        while (_order.Count >= MaxEntries) _images.Remove(_order.Dequeue());
        var task = DecodeAsync(uri, width, maxBytes, _lifetime.Token);
        _images.Add(key, task);
        _order.Enqueue(key);
        return task;
    }

    public void Clear()
    {
        _lifetime.Cancel();
        _lifetime.Dispose();
        _lifetime = new CancellationTokenSource();
        _images.Clear(); _order.Clear();
    }

    private async Task<BitmapImage> DecodeAsync(string uri, int width, int maxBytes, CancellationToken cancellationToken)
    {
        await _decodeGate.WaitAsync(cancellationToken);
        try
        {
        cancellationToken.ThrowIfCancellationRequested();
        var bytes = Convert.FromBase64String(uri[(uri.IndexOf(',') + 1)..]);
        if (bytes.Length > maxBytes) throw new InvalidOperationException("Template image is too large.");
        using var stream = new InMemoryRandomAccessStream();
        using var writer = new DataWriter(stream.GetOutputStreamAt(0));
        writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync(); stream.Seek(0);
        var bitmap = new BitmapImage();
        if (width > 0)
        {
            var decoder = await BitmapDecoder.CreateAsync(stream);
            cancellationToken.ThrowIfCancellationRequested();
            var sourceWidth = decoder.OrientedPixelWidth;
            var sourceHeight = decoder.OrientedPixelHeight;
            var largest = Math.Max(sourceWidth, sourceHeight);
            if (largest > width)
                bitmap.DecodePixelWidth = Math.Max(1, (int)Math.Round((double)sourceWidth * width / largest));
            stream.Seek(0);
        }
        await bitmap.SetSourceAsync(stream);
        cancellationToken.ThrowIfCancellationRequested();
        return bitmap;
        }
        finally { _decodeGate.Release(); }
    }
}

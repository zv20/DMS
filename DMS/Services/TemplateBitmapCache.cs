using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage.Streams;

namespace DMS.Services;

// Session-owned cache. The budget covers estimated decoded pixels plus the
// encoded key; active Image controls can independently retain their bitmaps.
public sealed class TemplateBitmapCache
{
    private const long MaxBytes = 32L * 1024 * 1024;
    private const int MaxEntries = 6;
    private readonly MemoryBudgetCache<(string Uri, int Width, int Limit), BitmapImage> _images = new(MaxBytes, MaxEntries);
    private readonly Dictionary<(string Uri, int Width, int Limit), Task<(BitmapImage Bitmap, long Bytes)>> _pending = new();
    private readonly SemaphoreSlim _decodeGate = new(2, 2);
    private CancellationTokenSource _lifetime = new();
    private int _generation;

    public async Task<BitmapImage> GetAsync(string uri, int width, int maxBytes)
    {
        var key = (uri, width, maxBytes);
        if (_images.TryGet(key, out var cached)) return cached;
        var generation = _generation;
        if (!_pending.TryGetValue(key, out var task))
        {
            task = DecodeAsync(uri, width, maxBytes, _lifetime.Token);
            _pending.Add(key, task);
        }
        try
        {
            var decoded = await task;
            if (generation == _generation) _images.Put(key, decoded.Bitmap, decoded.Bytes);
            return decoded.Bitmap;
        }
        finally
        {
            if (_pending.TryGetValue(key, out var current) && ReferenceEquals(current, task)) _pending.Remove(key);
        }
    }

    public void Clear()
    {
        _generation++;
        _lifetime.Cancel(); _lifetime.Dispose(); _lifetime = new CancellationTokenSource();
        _images.Clear(); _pending.Clear();
    }

    private async Task<(BitmapImage Bitmap, long Bytes)> DecodeAsync(string uri, int width, int maxBytes, CancellationToken cancellationToken)
    {
        await _decodeGate.WaitAsync(cancellationToken);
        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            byte[]? bytes = Convert.FromBase64String(uri[(uri.IndexOf(',') + 1)..]);
            if (bytes.Length > maxBytes) throw new InvalidOperationException("Template image is too large.");
            using var stream = new InMemoryRandomAccessStream();
            using (var writer = new DataWriter(stream.GetOutputStreamAt(0)))
            {
                writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync();
            }
            bytes = null;
            stream.Seek(0);
            var decoder = await BitmapDecoder.CreateAsync(stream);
            cancellationToken.ThrowIfCancellationRequested();
            var sourceWidth = decoder.OrientedPixelWidth;
            var sourceHeight = decoder.OrientedPixelHeight;
            if (sourceWidth == 0 || sourceHeight == 0) throw new InvalidOperationException("Invalid template image dimensions.");
            var largest = Math.Max(sourceWidth, sourceHeight);
            var scale = width > 0 && largest > width ? (double)width / largest : 1;
            var bitmap = new BitmapImage();
            if (scale < 1) bitmap.DecodePixelWidth = Math.Max(1, (int)Math.Round(sourceWidth * scale));
            var decodedWidth = Math.Max(1L, (long)Math.Ceiling(sourceWidth * scale));
            var decodedHeight = Math.Max(1L, (long)Math.Ceiling(sourceHeight * scale));
            var estimatedBytes = checked(decodedWidth * decodedHeight * 4 + (long)uri.Length * sizeof(char));
            stream.Seek(0);
            await bitmap.SetSourceAsync(stream);
            cancellationToken.ThrowIfCancellationRequested();
            return (bitmap, estimatedBytes);
        }
        finally { _decodeGate.Release(); }
    }
}

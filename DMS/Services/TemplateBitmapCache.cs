using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage.Streams;

namespace DMS.Services;

// Preview entries are budgeted; a print job retains its shared bitmaps until
// the job releases its pages. Active Image controls also retain their bitmaps.
public sealed class TemplateBitmapCache
{
    private const long MaxBytes = 32L * 1024 * 1024;
    private const int MaxEntries = 6;
    private const uint MaxImageDimension = 8192;
    private const ulong MaxImagePixels = 24_000_000;
    private readonly MemoryBudgetCache<(string Uri, int Width, int Limit), BitmapImage> _images = new(MaxBytes, MaxEntries);
    private readonly Dictionary<(string Uri, int Width, int Limit), BitmapImage> _jobImages = new();
    private readonly Dictionary<(string Uri, int Width, int Limit), Task<(BitmapImage Bitmap, long Bytes)>> _pending = new();
    private readonly SemaphoreSlim _decodeGate = new(2, 2);
    private readonly bool _retainForJob;
    private CancellationTokenSource _lifetime = new();
    private int _generation;

    public TemplateBitmapCache(bool retainForJob = false) => _retainForJob = retainForJob;

    public async Task<BitmapImage> GetAsync(string uri, int width, int maxBytes)
    {
        var key = (uri, width, maxBytes);
        if (_jobImages.TryGetValue(key, out var retained)) return retained;
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
            if (generation == _generation)
            {
                if (_retainForJob) _jobImages[key] = decoded.Bitmap;
                else _images.Put(key, decoded.Bitmap, decoded.Bytes);
            }
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
        _images.Clear(); _jobImages.Clear(); _pending.Clear();
    }

    internal static async Task<InMemoryRandomAccessStream> OpenImageStreamAsync(byte[] bytes)
    {
        var stream = new InMemoryRandomAccessStream();
        try
        {
            using (var writer = new DataWriter(stream.GetOutputStreamAt(0)))
            {
                writer.WriteBytes(bytes);
                await writer.StoreAsync();
                await writer.FlushAsync();
            }
            stream.Seek(0);
            return stream;
        }
        catch
        {
            stream.Dispose();
            throw;
        }
    }

    internal static async Task<(uint Width, uint Height)> ReadImageDimensionsAsync(IRandomAccessStream stream)
    {
        var decoder = await BitmapDecoder.CreateAsync(stream);
        var width = decoder.OrientedPixelWidth;
        var height = decoder.OrientedPixelHeight;
        if (width == 0 || height == 0 || width > MaxImageDimension || height > MaxImageDimension || (ulong)width * height > MaxImagePixels)
            throw new InvalidOperationException("Unsupported template image dimensions.");
        return (width, height);
    }

    internal static async Task<(BitmapImage Bitmap, long Bytes)> DecodeBitmapAsync(IRandomAccessStream stream, int width, CancellationToken cancellationToken = default)
    {
        var (sourceWidth, sourceHeight) = await ReadImageDimensionsAsync(stream);
        cancellationToken.ThrowIfCancellationRequested();
        var largest = Math.Max(sourceWidth, sourceHeight);
        var scale = width > 0 && largest > width ? (double)width / largest : 1;
        var bitmap = new BitmapImage();
        if (scale < 1)
        {
            if (sourceWidth >= sourceHeight) bitmap.DecodePixelWidth = width;
            else bitmap.DecodePixelHeight = width;
        }
        var decodedWidth = Math.Max(1L, (long)Math.Ceiling(sourceWidth * scale));
        var decodedHeight = Math.Max(1L, (long)Math.Ceiling(sourceHeight * scale));
        stream.Seek(0);
        await bitmap.SetSourceAsync(stream);
        cancellationToken.ThrowIfCancellationRequested();
        return (bitmap, decodedWidth * decodedHeight * 4);
    }

    internal static async Task<(BitmapImage Bitmap, long Bytes)> DecodeDataUriAsync(string uri, int width, int maxBytes, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var separator = uri.IndexOf(',');
        var bytes = Convert.FromBase64String(uri[(separator + 1)..]);
        if (bytes.Length > maxBytes) throw new InvalidOperationException("Template image is too large.");
        var contentType = uri.StartsWith("data:image/png;", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg";
        if (!DatabaseService.ValidImageSignature(contentType, bytes)) throw new InvalidOperationException("Invalid template image format.");
        using var stream = await OpenImageStreamAsync(bytes);
        var decoded = await DecodeBitmapAsync(stream, width, cancellationToken);
        return (decoded.Bitmap, decoded.Bytes + (long)uri.Length * sizeof(char));
    }

    private async Task<(BitmapImage Bitmap, long Bytes)> DecodeAsync(string uri, int width, int maxBytes, CancellationToken cancellationToken)
    {
        await _decodeGate.WaitAsync(cancellationToken);
        try
        {
            return await DecodeDataUriAsync(uri, width, maxBytes, cancellationToken);
        }
        finally { _decodeGate.Release(); }
    }
}

using System.Text.Json;
using DMS.Models;

namespace DMS.Services;

// The image library owns asset bytes. History stores references, while legacy
// images without an asset ID remain embedded so undo cannot lose them.
public sealed class TemplateHistoryImages
{
    private readonly Dictionary<string, string> _assets = new(StringComparer.Ordinal);
    private long _bytes;
    private const long MaxBytes = 32L * 1024 * 1024;

    public string Serialize(TemplateDocument document)
    {
        var removed = new List<(TemplateImage Image, string Uri)>();
        string? background = null;
        try
        {
            if (CanReference(document.BackgroundImageAssetId, document.BackgroundImageDataUri))
            {
                background = document.BackgroundImageDataUri;
                document.BackgroundImageDataUri = null;
            }
            foreach (var image in document.DecorativeImages ?? [])
            {
                if (!CanReference(image.AssetId, image.DataUri)) continue;
                removed.Add((image, image.DataUri));
                image.DataUri = "";
            }
            return JsonSerializer.Serialize(document);
        }
        finally
        {
            if (background != null) document.BackgroundImageDataUri = background;
            foreach (var (image, uri) in removed) image.DataUri = uri;
        }
    }

    private bool CanReference(string? id, string? uri)
    {
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(uri)) return false;
        if (_assets.TryGetValue(id, out var existing)) return existing == uri;
        var size = (long)uri.Length * sizeof(char);
        if (_bytes + size > MaxBytes) return false;
        _assets.Add(id, uri);
        _bytes += size;
        return true;
    }

    public void Restore(TemplateDocument document)
    {
        if (string.IsNullOrEmpty(document.BackgroundImageDataUri) && document.BackgroundImageAssetId is { } backgroundId && _assets.TryGetValue(backgroundId, out var background))
            document.BackgroundImageDataUri = background;
        foreach (var image in document.DecorativeImages ?? [])
            if (string.IsNullOrEmpty(image.DataUri) && image.AssetId is { } id && _assets.TryGetValue(id, out var uri)) image.DataUri = uri;
    }

    public void Clear() { _assets.Clear(); _bytes = 0; }
}

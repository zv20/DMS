using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;

namespace DMS.Services;

/// <summary>Owns subscriptions and image sources created for one rendered page.</summary>
public sealed class TemplateVisualLifetime : IDisposable
{
    private readonly List<(UIElement Element, PointerEventHandler Handler)> _handlers = [];
    private readonly List<Image> _images = [];
    private readonly List<(FrameworkElement Element, RoutedEventHandler Handler)> _loadedHandlers = [];
    private bool _disposed;
    public bool IsDisposed => _disposed;

    public void AddSelection(UIElement element, PointerEventHandler handler)
    {
        if (_disposed) throw new ObjectDisposedException(nameof(TemplateVisualLifetime));
        element.PointerPressed += handler;
        _handlers.Add((element, handler));
    }

    public void AddImage(Image image)
    {
        if (_disposed) throw new ObjectDisposedException(nameof(TemplateVisualLifetime));
        _images.Add(image);
    }

    public void AddLoaded(FrameworkElement element, RoutedEventHandler handler)
    {
        if (_disposed) throw new ObjectDisposedException(nameof(TemplateVisualLifetime));
        element.Loaded += handler;
        _loadedHandlers.Add((element, handler));
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        foreach (var (element, handler) in _handlers) element.PointerPressed -= handler;
        foreach (var (element, handler) in _loadedHandlers) element.Loaded -= handler;
        foreach (var image in _images) image.Source = null;
        _handlers.Clear();
        _loadedHandlers.Clear();
        _images.Clear();
    }
}

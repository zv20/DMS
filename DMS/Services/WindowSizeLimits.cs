using Microsoft.Extensions.Logging;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Windows.Graphics;

namespace DMS.Services;

/// <summary>Enforces a readable client size through native, physical-pixel limits.</summary>
internal sealed class WindowSizeLimits : IDisposable
{
    private readonly Window _window;
    private readonly FrameworkElement _root;
    private XamlRoot? _xamlRoot;
    private bool _updating, _disposed;

    public WindowSizeLimits(Window window, FrameworkElement root)
    {
        _window = window;
        _root = root;
        _root.Loaded += RootLoaded;
        _window.AppWindow.Changed += WindowChanged;
        _window.Closed += WindowClosed;
        AttachXamlRoot();
        UpdateMinimumSize();
    }

    private void RootLoaded(object sender, RoutedEventArgs e)
    {
        AttachXamlRoot();
        UpdateMinimumSize();
    }

    private void AttachXamlRoot()
    {
        if (_xamlRoot == _root.XamlRoot) return;
        if (_xamlRoot != null) _xamlRoot.Changed -= XamlRootChanged;
        _xamlRoot = _root.XamlRoot;
        if (_xamlRoot != null) _xamlRoot.Changed += XamlRootChanged;
    }

    private void XamlRootChanged(XamlRoot sender, XamlRootChangedEventArgs args) => UpdateMinimumSize();

    private void WindowChanged(AppWindow sender, AppWindowChangedEventArgs args)
    {
        if (args.DidSizeChange || args.DidPositionChange || args.DidPresenterChange) UpdateMinimumSize();
    }

    private void UpdateMinimumSize()
    {
        if (_disposed || _updating || _xamlRoot == null) return;
        _updating = true;
        try
        {
            var appWindow = _window.AppWindow;
            if (appWindow.Presenter is not OverlappedPresenter presenter || presenter.State == OverlappedPresenterState.Minimized) return;
            var workArea = DisplayArea.GetFromWindowId(appWindow.Id, DisplayAreaFallback.Nearest)?.WorkArea;
            var size = appWindow.Size;
            var client = appWindow.ClientSize;
            if (client.Width <= 0 || client.Height <= 0) return;
            var minimum = WindowSizePolicy.MinimumSize(_xamlRoot?.RasterizationScale ?? 1,
                size.Width - client.Width, size.Height - client.Height,
                workArea?.Width ?? 0, workArea?.Height ?? 0);
            // Native setters can raise Changed synchronously; avoid repeated writes
            // and let the guard cover notifications during a full two-axis update.
            if (presenter.PreferredMinimumWidth != minimum.Width) presenter.PreferredMinimumWidth = minimum.Width;
            if (presenter.PreferredMinimumHeight != minimum.Height) presenter.PreferredMinimumHeight = minimum.Height;
            if (presenter.State == OverlappedPresenterState.Restored)
            {
                size = appWindow.Size;
                if (size.Width < minimum.Width || size.Height < minimum.Height)
                    appWindow.Resize(new SizeInt32(Math.Max(size.Width, minimum.Width), Math.Max(size.Height, minimum.Height)));
            }
        }
        catch (Exception ex)
        {
            App.Logger.LogWarning(ex, "Unable to update the minimum window size");
        }
        finally { _updating = false; }
    }

    private void WindowClosed(object sender, WindowEventArgs e) => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _root.Loaded -= RootLoaded;
        _window.AppWindow.Changed -= WindowChanged;
        _window.Closed -= WindowClosed;
        if (_xamlRoot != null) _xamlRoot.Changed -= XamlRootChanged;
        _xamlRoot = null;
    }
}

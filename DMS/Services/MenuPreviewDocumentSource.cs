using System.Text;
using Microsoft.Web.WebView2.Core;

namespace DMS.Services;

/// <summary>
/// Supplies a generated preview directly to WebView2 as an in-memory document.
/// This avoids NavigateToString's 2 MB limit without writing menu data to disk or
/// exposing a local file server. The source accepts only its current random URL.
/// </summary>
internal sealed class MenuPreviewDocumentSource : IDisposable
{
    private const string Filter = "https://dms-preview.invalid/*";
    private const string BaseUri = "https://dms-preview.invalid/";
    private readonly CoreWebView2 _view;
    private byte[]? _document;
    private string? _currentUri;
    private bool _disposed;

    public MenuPreviewDocumentSource(CoreWebView2 view)
    {
        _view = view;
        _view.AddWebResourceRequestedFilter(Filter, CoreWebView2WebResourceContext.Document);
        _view.WebResourceRequested += OnRequested;
        _view.NavigationStarting += OnNavigationStarting;
    }

    public void Navigate(string html)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        _document = Encoding.UTF8.GetBytes(html);
        _currentUri = BaseUri + Guid.NewGuid().ToString("N") + ".html";
        _view.Navigate(_currentUri);
    }

    public bool IsCurrentUri(string uri) => string.Equals(uri, _currentUri, StringComparison.Ordinal);

    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs args)
    {
        if (!string.Equals(args.Uri, _currentUri, StringComparison.Ordinal)) args.Cancel = true;
    }

    private void OnRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs args)
    {
        var valid = _document != null && string.Equals(args.Request.Uri, _currentUri, StringComparison.Ordinal);
        // The response retains this in-memory stream for the lifetime of the
        // WebView request. It owns no file or operating-system handles.
        var stream = new MemoryStream(valid ? _document! : Array.Empty<byte>(), writable: false).AsRandomAccessStream();
        args.Response = _view.Environment.CreateWebResourceResponse(stream, valid ? 200 : 404,
            valid ? "OK" : "Not Found",
            "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\n" +
            "Content-Security-Policy: default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'\r\n" +
            "X-Content-Type-Options: nosniff\r\n");
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _view.WebResourceRequested -= OnRequested;
        _view.NavigationStarting -= OnNavigationStarting;
        _view.RemoveWebResourceRequestedFilter(Filter, CoreWebView2WebResourceContext.Document);
        _document = null;
        _currentUri = null;
    }
}

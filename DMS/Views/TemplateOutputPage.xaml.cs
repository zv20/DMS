using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.UI.Xaml.Printing;
using System.Text;
using Windows.Graphics.Imaging;
using Windows.Graphics.Printing;
using Windows.Storage;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using L = DMS.Services.Localization;

namespace DMS.Views;

/// <summary>Prints the same native page renderer used in the template editor.</summary>
public sealed partial class TemplateOutputPage : Page
{
    private readonly IDatabaseService _database;
    private static readonly string[] PngExtensions = [".png"];
    private static readonly string[] JpegExtensions = [".jpg", ".jpeg"];
    private static readonly string[] PdfExtensions = [".pdf"];
    private readonly SemaphoreSlim _refreshGate = new(1, 1);
    private readonly CancellationTokenSource _pageLifetime = new();
    private readonly TemplateBitmapCache _previewBitmaps = new();
    private readonly Microsoft.UI.Dispatching.DispatcherQueue _uiQueue;
    private PrintManager? _printManager;
    private PrintDocument? _printDocument;
    private IPrintDocumentSource? _printSource;
    private FrameworkElement? _printPage;
    private FrameworkElement? _nativePage;
    private Viewbox? _printViewbox;
    private FrameworkElement? _previewPage;
    private bool _ready;
    private bool _busy;
    private int _activePrintTasks;
    private bool _loaded;
    private bool _weekendEnabled;
    private int _generation;
    private DateTime _monday;
    private DateTime? _firstDay, _lastDay;
    private TemplateDocument? _document;
    private List<MenuEntry> _entries = [];
    private List<Recipe> _recipes = [];
    private List<Ingredient> _ingredients = [];

    public bool CanClose => !_busy && System.Threading.Volatile.Read(ref _activePrintTasks) == 0;
    public event Action<bool>? CloseAvailabilityChanged;

    public TemplateOutputPage()
    {
        InitializeComponent();
        _uiQueue = DispatcherQueue;
        _database = App.Services.GetRequiredService<IDatabaseService>();
        TitleText.Text = L.Get("TemplateOutputTitle");
        TemplateSelector.Header = L.Get("TemplateOutputTemplate");
        WeekPicker.Header = L.Get("TemplateOutputWeek");
        PrintButton.Content = L.Get("TemplateOutputPrint");
        PdfButton.Content = L.Get("TemplateOutputPdf");
        PngButton.Content = L.Get("TemplateOutputPng");
        WeekPicker.Date = DateTimeOffset.Now;
        Loaded += Page_Loaded;
        Unloaded += Page_Unloaded;
    }

    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is DateTime date) WeekPicker.Date = new DateTimeOffset(date.Date);
    }

    private async void Page_Loaded(object sender, RoutedEventArgs e)
    {
        _loaded = true;
        try
        {
            // A machine with no printing support can still save an image or PDF.
            try { RegisterPrinting(); }
            catch (Exception ex) { App.Logger.LogWarning(ex, "Printing is unavailable"); UnregisterPrinting(); }
            if (_printManager == null)
            {
                ToolTipService.SetToolTip(PrintButton, L.Get("TemplateOutputPrintUnsupported"));
            }
            var templates = (await _database.GetAllTemplatesAsync()).Where(t => t.Document != null).ToList();
            if (!_loaded) return;
            templates.Insert(0, new MenuTemplate { Name = L.Get("OutputDefaultTemplate"), Document = new TemplateDocument { HeaderText = L.Get("String_Text_Weekly_Menu_69fa95") } });
            TemplateSelector.ItemsSource = templates;
            TemplateSelector.SelectedIndex = 0;
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to load print and export"); StatusText.Text = L.Get("ErrorOutput"); }
    }

    private void Page_Unloaded(object sender, RoutedEventArgs e)
    {
        _loaded = false;
        _generation++;
        _pageLifetime.Cancel();
        PreviewHost.Content = null;
        TemplateSelector.ItemsSource = null;
        _previewPage = null; _document = null;
        _entries.Clear(); _recipes.Clear(); _ingredients.Clear();
        _previewBitmaps.Clear();
        try { UnregisterPrinting(); }
        catch (Exception ex) { App.Logger.LogWarning(ex, "Unable to release print resources"); }
    }

    private async void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (_loaded) await RefreshAsync(); }
    private async void WeekPicker_DateChanged(CalendarDatePicker sender, CalendarDatePickerDateChangedEventArgs args) { if (_loaded) await RefreshAsync(); }

    private void SetReady(bool ready)
    {
        _ready = ready;
        PrintButton.IsEnabled = ready && !_busy && _printManager != null;
        PdfButton.IsEnabled = ready && !_busy;
        PngButton.IsEnabled = ready && !_busy;
        TemplateSelector.IsEnabled = WeekPicker.IsEnabled = !_busy;
        CloseAvailabilityChanged?.Invoke(CanClose);
    }

    private async Task RefreshAsync()
    {
        var generation = ++_generation;
        SetReady(false);
        if (TemplateSelector.SelectedItem is not MenuTemplate { Document: not null } template) return;
        var date = WeekPicker.Date?.DateTime.Date ?? DateTime.Today;
        var monday = date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));
        await _refreshGate.WaitAsync();
        try
        {
            if (!_loaded || generation != _generation) return;
            _previewBitmaps.Clear();
            var weekendEnabled = (await _database.GetSettingsAsync())?.WeekendPlanningEnabled ?? false;
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(weekendEnabled ? 6 : 4));
            var recipes = await _database.GetAllRecipesAsync();
            var ingredients = await _database.GetAllIngredientsAsync();
            template = TemplateConversion.ToEditableCopy(template);
            await _database.HydrateTemplateImagesAsync(template);
            if (!_loaded || generation != _generation) return;
            _monday = monday; _document = template.Document; _entries = entries; _recipes = recipes; _ingredients = ingredients; _weekendEnabled = weekendEnabled;
            var result = TemplateRenderer.Create(_document, _monday, _entries, _recipes, _ingredients, includeWeekend: _weekendEnabled, bitmapCache: _previewBitmaps, decodeWidth: 2400, cancellationToken: _pageLifetime.Token);
            _firstDay = result.FirstDay; _lastDay = result.LastDay;
            _previewPage = result.Page;
            PreviewHost.Content = _previewPage;
            await result.ImagesReady;
            if (!_loaded || generation != _generation) return;
            StatusText.Text = L.Get(!result.HasMeals ? "TplBuilderNoMeals" : result.Overflowed ? "TemplateOutputOverflow" : "TemplateOutputReady");
            if (_printManager == null) StatusText.Text += "\n" + L.Get("TemplateOutputPrintUnsupported");
            SetReady(result.HasMeals && !result.Overflowed);
        }
        catch (OperationCanceledException) when (!_loaded || generation != _generation) { }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to render the output preview"); if (generation == _generation) StatusText.Text = L.Get("ErrorOutput"); }
        finally { _refreshGate.Release(); }
    }

    private void RegisterPrinting()
    {
        if (_printManager != null || !PrintManager.IsSupported()) return;
        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
        _printManager = PrintManagerInterop.GetForWindow(hwnd);
        _printDocument = new PrintDocument();
        // Read XAML's DocumentSource on its owning UI thread, not in the print event.
        _printSource = _printDocument.DocumentSource;
        _printManager.PrintTaskRequested += PrintTaskRequested;
        _printDocument.Paginate += Paginate;
        _printDocument.GetPreviewPage += GetPreviewPage;
        _printDocument.AddPages += AddPages;
    }

    private void UnregisterPrinting()
    {
        if (_printManager is { } manager) manager.PrintTaskRequested -= PrintTaskRequested;
        if (_printDocument != null)
        {
            _printDocument.Paginate -= Paginate;
            _printDocument.GetPreviewPage -= GetPreviewPage;
            _printDocument.AddPages -= AddPages;
        }
        _printManager = null; _printDocument = null; _printSource = null; _printPage = null; _nativePage = null; _printViewbox = null;
    }

    private void PrintTaskRequested(PrintManager sender, PrintTaskRequestedEventArgs e)
    {
        var taskCounted = false;
        var completionAttached = false;
        try
        {
        var source = _printSource;
        if (source == null) return;
        var task = e.Request.CreatePrintTask(OutputDateName(), args => args.SetSource(source));
        System.Threading.Interlocked.Increment(ref _activePrintTasks);
        taskCounted = true;
        task.Completed += (_, args) =>
        {
            System.Threading.Interlocked.Decrement(ref _activePrintTasks);
            _uiQueue.TryEnqueue(() =>
            {
                if (args.Completion == PrintTaskCompletion.Failed)
                {
                    App.Logger.LogWarning("The print task reported a failure");
                    StatusText.Text = L.Get("TemplateOutputPrintFailed");
                }
                CloseAvailabilityChanged?.Invoke(CanClose);
            });
        };
        completionAttached = true;
        _uiQueue.TryEnqueue(() => CloseAvailabilityChanged?.Invoke(CanClose));
        try { task.Options.MediaSize = PrintMediaSize.IsoA4; task.Options.Orientation = PrintOrientation.Portrait; }
        catch (Exception ex) { App.Logger.LogWarning(ex, "Printer did not accept the preferred page settings"); }
        }
        catch (Exception ex)
        {
            if (taskCounted && !completionAttached) System.Threading.Interlocked.Decrement(ref _activePrintTasks);
            ReportPrintCallbackFailure(ex);
            _uiQueue.TryEnqueue(() => CloseAvailabilityChanged?.Invoke(CanClose));
        }
    }

    private void ReportPrintCallbackFailure(Exception ex)
    {
        App.Logger.LogError(ex, "The print system could not prepare the document");
        _uiQueue.TryEnqueue(() => { if (_loaded) StatusText.Text = L.Get("ErrorOutput"); });
    }

    private void Paginate(object sender, PaginateEventArgs e)
    {
        try
        {
        if (_nativePage == null) return;
        if (_printViewbox is { } previousViewbox) previousViewbox.Child = null;
        var description = ((PrintTaskOptions)e.PrintTaskOptions).GetPageDescription(0);
        var area = description.ImageableRect;
        var width = area.Width > 0 ? area.Width : description.PageSize.Width;
        var height = area.Height > 0 ? area.Height : description.PageSize.Height;
        _printViewbox = new Viewbox { Width = width, Height = height, Stretch = Stretch.Uniform, Child = _nativePage };
        var page = new Canvas { Width = description.PageSize.Width, Height = description.PageSize.Height };
        Canvas.SetLeft(_printViewbox, area.Width > 0 ? area.X : 0);
        Canvas.SetTop(_printViewbox, area.Height > 0 ? area.Y : 0);
        page.Children.Add(_printViewbox);
        _printPage = page;
        ((PrintDocument)sender).SetPreviewPageCount(1, PreviewPageCountType.Final);
        }
        catch (Exception ex) { ReportPrintCallbackFailure(ex); }
    }

    private void GetPreviewPage(object sender, GetPreviewPageEventArgs e)
    {
        try { if (_printPage != null && e.PageNumber == 1) ((PrintDocument)sender).SetPreviewPage(1, _printPage); }
        catch (Exception ex) { ReportPrintCallbackFailure(ex); }
    }

    private void AddPages(object sender, AddPagesEventArgs e)
    {
        try
        {
            var document = (PrintDocument)sender;
            if (_printPage != null) document.AddPage(_printPage);
            document.AddPagesComplete();
        }
        catch (Exception ex) { ReportPrintCallbackFailure(ex); }
    }

    private async void Print_Click(object sender, RoutedEventArgs e) => await ShowPrintAsync();
    private async void Pdf_Click(object sender, RoutedEventArgs e) => await SavePdfAsync();

    private async Task ShowPrintAsync()
    {
        if (!_ready || _busy || _document == null) return;
        _busy = true; SetReady(true);
        try
        {
            if (!PrintManager.IsSupported() || _printDocument == null) throw new InvalidOperationException(L.Get("TemplateOutputPrintUnsupported"));
            if (_printViewbox is { } previousViewbox) previousViewbox.Child = null;
            _printViewbox = null;
            _printPage = null;
            var result = TemplateRenderer.Create(_document, _monday, _entries, _recipes, _ingredients, includeWeekend: _weekendEnabled);
            await result.ImagesReady;
            if (!_loaded) return;
            if (result.Overflowed) { SetReady(false); StatusText.Text = L.Get("TemplateOutputOverflow"); return; }
            _nativePage = result.Page;
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
            await PrintManagerInterop.ShowPrintUIForWindowAsync(hwnd);
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to open the print dialog"); StatusText.Text = L.Get("ErrorOutput"); }
        finally { _busy = false; SetReady(_ready); }
    }

    private async void Png_Click(object sender, RoutedEventArgs e)
    {
        if (!_ready || _busy || _previewPage == null) return;
        _busy = true; SetReady(true);
        var outputStarted = false;
        try
        {
            var picker = new FileSavePicker { SuggestedStartLocation = PickerLocationId.PicturesLibrary, SuggestedFileName = OutputDateName() };
            picker.FileTypeChoices.Add("PNG", PngExtensions);
            picker.FileTypeChoices.Add("JPEG", JpegExtensions);
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSaveFileAsync();
            if (file == null) return;
            var bitmap = new RenderTargetBitmap();
            await bitmap.RenderAsync(_previewPage, 1588, 2246);
            if (bitmap.PixelWidth != 1588 || bitmap.PixelHeight != 2246) throw new InvalidOperationException(L.Get("TemplateOutputImageSizeError"));
            var pixels = await bitmap.GetPixelsAsync();
            var bytes = new byte[pixels.Length];
            using (var reader = DataReader.FromBuffer(pixels)) reader.ReadBytes(bytes);
            using var stream = await file.OpenAsync(FileAccessMode.ReadWrite);
            stream.Size = 0;
            outputStarted = true;
            var encoderId = file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? BitmapEncoder.PngEncoderId : BitmapEncoder.JpegEncoderId;
            var encoder = await BitmapEncoder.CreateAsync(encoderId, stream);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, 192, 192, bytes);
            await encoder.FlushAsync();
            StatusText.Text = L.Get("TemplateOutputSaved");
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to export the menu as an image"); StatusText.Text = L.Get(outputStarted ? "ErrorPngIncomplete" : "ErrorOutput"); }
        finally { _busy = false; SetReady(_ready); }
    }

    private async Task SavePdfAsync()
    {
        if (!_ready || _busy || _previewPage == null) return;
        _busy = true;
        SetReady(true);
        var outputStarted = false;
        try
        {
            var picker = new FileSavePicker { SuggestedStartLocation = PickerLocationId.DocumentsLibrary, SuggestedFileName = OutputDateName() };
            picker.FileTypeChoices.Add("PDF", PdfExtensions);
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSaveFileAsync();
            if (file == null) return;

            var jpeg = await RenderPreviewAsJpegAsync();
            var pdf = CreateImagePdf(jpeg, 1588, 2246);
            outputStarted = true;
            await FileIO.WriteBytesAsync(file, pdf);
            StatusText.Text = L.Get("TemplateOutputPdfSaved");
        }
        catch (Exception ex)
        {
            App.Logger.LogError(ex, "Unable to save the menu as a PDF");
            StatusText.Text = L.Get(outputStarted ? "ErrorPngIncomplete" : "ErrorOutput");
        }
        finally { _busy = false; SetReady(_ready); }
    }

    private async Task<byte[]> RenderPreviewAsJpegAsync()
    {
        if (_previewPage == null) throw new InvalidOperationException(L.Get("ErrorOutput"));
        var bitmap = new RenderTargetBitmap();
        await bitmap.RenderAsync(_previewPage, 1588, 2246);
        if (bitmap.PixelWidth != 1588 || bitmap.PixelHeight != 2246) throw new InvalidOperationException(L.Get("TemplateOutputImageSizeError"));
        var pixels = await bitmap.GetPixelsAsync();
        var bytes = new byte[pixels.Length];
        using (var reader = DataReader.FromBuffer(pixels)) reader.ReadBytes(bytes);
        using var stream = new InMemoryRandomAccessStream();
        var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.JpegEncoderId, stream);
        encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, 192, 192, bytes);
        await encoder.FlushAsync();
        stream.Seek(0);
        using var encodedReader = new DataReader(stream.GetInputStreamAt(0));
        await encodedReader.LoadAsync((uint)stream.Size);
        var encoded = new byte[(int)stream.Size];
        encodedReader.ReadBytes(encoded);
        return encoded;
    }

    // A single rendered JPEG in a standards-compliant PDF keeps direct export dependency-free.
    private static byte[] CreateImagePdf(byte[] jpeg, int pixelWidth, int pixelHeight)
    {
        const double pageWidth = 595.28;
        const double pageHeight = 841.89;
        var scale = Math.Min(pageWidth / pixelWidth, pageHeight / pixelHeight);
        var width = pixelWidth * scale;
        var height = pixelHeight * scale;
        var x = (pageWidth - width) / 2;
        var y = (pageHeight - height) / 2;
        var content = FormattableString.Invariant($"q\n{width:0.###} 0 0 {height:0.###} {x:0.###} {y:0.###} cm\n/Im0 Do\nQ\n");

        using var stream = new MemoryStream();
        WritePdfText(stream, "%PDF-1.4\n%âãÏÓ\n");
        var offsets = new List<long>();
        WritePdfObject(stream, offsets, 1, "<< /Type /Catalog /Pages 2 0 R >>");
        WritePdfObject(stream, offsets, 2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        WritePdfObject(stream, offsets, 3, $"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {pageWidth.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)} {pageHeight.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
        WritePdfObject(stream, offsets, 4, $"<< /Length {Encoding.ASCII.GetByteCount(content)} >>\nstream\n{content}endstream");
        offsets.Add(stream.Position);
        WritePdfText(stream, $"5 0 obj\n<< /Type /XObject /Subtype /Image /Width {pixelWidth} /Height {pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {jpeg.Length} >>\nstream\n");
        stream.Write(jpeg, 0, jpeg.Length);
        WritePdfText(stream, "\nendstream\nendobj\n");
        var xrefOffset = stream.Position;
        WritePdfText(stream, "xref\n0 6\n0000000000 65535 f \n");
        foreach (var offset in offsets) WritePdfText(stream, $"{offset.ToString("D10", System.Globalization.CultureInfo.InvariantCulture)} 00000 n \n");
        WritePdfText(stream, $"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xrefOffset}\n%%EOF\n");
        return stream.ToArray();
    }

    private static void WritePdfObject(Stream stream, List<long> offsets, int number, string body)
    {
        offsets.Add(stream.Position);
        WritePdfText(stream, $"{number} 0 obj\n{body}\nendobj\n");
    }

    private static void WritePdfText(Stream stream, string value)
    {
        var bytes = Encoding.ASCII.GetBytes(value);
        stream.Write(bytes, 0, bytes.Length);
    }

    private string OutputDateName() => _firstDay is DateTime first && _lastDay is DateTime last
        ? first == last ? $"{first:dd-MM-yyyy}" : $"{first:dd-MM-yyyy}-{last:dd-MM-yyyy}"
        : $"{_monday:dd-MM-yyyy}";
}

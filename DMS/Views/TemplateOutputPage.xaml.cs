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
    private readonly DatabaseService _database;
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
    private List<TemplatePageResult> _previewPages = [], _printPages = [];
    private readonly List<FrameworkElement> _printSurfaces = [];
    private readonly List<Viewbox> _printViewboxes = [];
    private List<List<MenuEntry>> _pageEntries = [];
    private bool _ready;
    private bool _busy;
    private int _activePrintTasks;
    private bool _loaded;
    private bool _printMode;
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
        _database = App.Services.GetRequiredService<DatabaseService>();
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
        if (e.Parameter is Tuple<DateTime, bool> output)
        {
            WeekPicker.Date = new DateTimeOffset(output.Item1.Date);
            _printMode = output.Item2;
        }
        TitleText.Text = L.Get(_printMode ? "TemplateOutputPrint" : "TemplateOutputExport");
        PrintButton.Visibility = _printMode ? Visibility.Visible : Visibility.Collapsed;
        PdfButton.Visibility = PngButton.Visibility = _printMode ? Visibility.Collapsed : Visibility.Visible;
    }

    private async void Page_Loaded(object sender, RoutedEventArgs e)
    {
        _loaded = true;
        try
        {
            // A machine with no printing support can still save an image or PDF.
            try { if (_printMode) RegisterPrinting(); }
            catch (Exception ex) { App.Logger.LogWarning(ex, "Printing is unavailable"); UnregisterPrinting(); }
            if (_printMode && _printManager == null)
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
        MultiPreviewHost.Content = null;
        DisposePages(_previewPages); _previewPages = [];
        TemplateSelector.ItemsSource = null;
        _document = null; _pageEntries.Clear();
        _entries.Clear(); _recipes.Clear(); _ingredients.Clear();
        _previewBitmaps.Clear();
        try { UnregisterPrinting(); }
        catch (Exception ex) { App.Logger.LogWarning(ex, "Unable to release print resources"); }
    }

    private async void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (_loaded) await RefreshAsync(); }
    private async void WeekPicker_DateChanged(CalendarDatePicker sender, CalendarDatePickerDateChangedEventArgs args) { if (_loaded) await RefreshAsync(); }

    private static void DisposePages(IEnumerable<TemplatePageResult> pages)
    {
        foreach (var page in pages) page.Lifetime.Dispose();
    }

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
            var settings = await _database.GetSettingsAsync() ?? new AppSettings();
            var weekendEnabled = settings.WeekendPlanningEnabled;
            var entries = (await _database.GetMenuAsync(monday, monday.AddDays(weekendEnabled ? 6 : 4)))
                .Where(entry => MenuOutputService.IsVisibleSlot(entry.Slot, settings.MealsPerDay)).ToList();
            var recipes = await _database.GetAllRecipesAsync();
            var ingredients = await _database.GetAllIngredientsAsync();
            template = TemplateConversion.ToEditableCopy(template);
            await _database.HydrateTemplateImagesAsync(template);
            if (!_loaded || generation != _generation) return;
            _monday = monday; _document = template.Document ?? throw new InvalidOperationException("The template has no document.");
            _entries = entries; _recipes = recipes; _ingredients = ingredients; _weekendEnabled = weekendEnabled;
            _pageEntries = [_entries];
            bool Fits(IReadOnlyList<MenuEntry> pageEntries)
            {
                var measured = TemplateRenderer.Create(_document, _monday, pageEntries, _recipes, _ingredients, includeWeekend: _weekendEnabled, measureOnly: true);
                try { return !measured.Overflowed; }
                finally { measured.Lifetime.Dispose(); }
            }
            if (settings.MealsPerDay > 4 && !Fits(_entries))
            {
                var recipeIds = _recipes.Select(recipe => recipe.Id).ToHashSet();
                var printable = _entries.Where(entry => recipeIds.Contains(entry.RecipeId)).ToList();
                if (printable.Count > 0 && TemplatePagination.Split(printable, Fits) is { Count: > 0 } pages)
                    _pageEntries = pages;
            }
            var results = new List<TemplatePageResult>();
            try
            {
                foreach (var pageEntries in _pageEntries)
                    results.Add(TemplateRenderer.Create(_document, _monday, pageEntries, _recipes, _ingredients, includeWeekend: _weekendEnabled, bitmapCache: _previewBitmaps, decodeWidth: 2400, cancellationToken: _pageLifetime.Token));
            }
            catch { DisposePages(results); throw; }
            var previous = _previewPages;
            _previewPages = results;
            _firstDay = results.Where(result => result.FirstDay.HasValue).Select(result => result.FirstDay).Min();
            _lastDay = results.Where(result => result.LastDay.HasValue).Select(result => result.LastDay).Max();
            PreviewHost.Content = null;
            MultiPreviewHost.Content = null;
            SinglePagePreview.Visibility = results.Count == 1 ? Visibility.Visible : Visibility.Collapsed;
            MultiPagePreview.Visibility = results.Count > 1 ? Visibility.Visible : Visibility.Collapsed;
            if (results.Count == 1) PreviewHost.Content = results[0].Page;
            else
            {
                var preview = new StackPanel { Spacing = 16, HorizontalAlignment = HorizontalAlignment.Center };
                foreach (var result in results)
                    preview.Children.Add(new Viewbox { MaxWidth = 794, Stretch = Stretch.Uniform, StretchDirection = StretchDirection.DownOnly, Child = result.Page });
                MultiPreviewHost.Content = preview;
            }
            DisposePages(previous);
            await Task.WhenAll(results.Select(result => result.ImagesReady));
            if (!_loaded || generation != _generation) return;
            var hasMeals = results.Any(result => result.HasMeals);
            var overflowed = results.Any(result => result.Overflowed);
            StatusText.Text = L.Get(!hasMeals ? "TplBuilderNoMeals" : overflowed ? "TemplateOutputOverflow" : "TemplateOutputReady");
            if (results.Count > 1)
            {
                StatusText.Text += "\n" + L.Format("TemplateOutputPageCount", results.Count);
                if (!_printMode) StatusText.Text += "\n" + L.Get("TemplateOutputImagesHint");
            }
            if (_printMode && _printManager == null) StatusText.Text += "\n" + L.Get("TemplateOutputPrintUnsupported");
            SetReady(hasMeals && !overflowed);
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
        foreach (var box in _printViewboxes) box.Child = null;
        _printViewboxes.Clear(); _printSurfaces.Clear();
        DisposePages(_printPages); _printPages = [];
        _printManager = null; _printDocument = null; _printSource = null;
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
        if (_printPages.Count == 0) return;
        foreach (var old in _printViewboxes) old.Child = null;
        _printViewboxes.Clear(); _printSurfaces.Clear();
        var description = ((PrintTaskOptions)e.PrintTaskOptions).GetPageDescription(0);
        var area = description.ImageableRect;
        var width = area.Width > 0 ? area.Width : description.PageSize.Width;
        var height = area.Height > 0 ? area.Height : description.PageSize.Height;
        foreach (var result in _printPages)
        {
            var viewbox = new Viewbox { Width = width, Height = height, Stretch = Stretch.Uniform, Child = result.Page };
            var page = new Canvas { Width = description.PageSize.Width, Height = description.PageSize.Height };
            Canvas.SetLeft(viewbox, area.Width > 0 ? area.X : 0);
            Canvas.SetTop(viewbox, area.Height > 0 ? area.Y : 0);
            page.Children.Add(viewbox);
            _printViewboxes.Add(viewbox); _printSurfaces.Add(page);
        }
        ((PrintDocument)sender).SetPreviewPageCount(_printSurfaces.Count, PreviewPageCountType.Final);
        }
        catch (Exception ex) { ReportPrintCallbackFailure(ex); }
    }

    private void GetPreviewPage(object sender, GetPreviewPageEventArgs e)
    {
        try { if (e.PageNumber > 0 && e.PageNumber <= _printSurfaces.Count) ((PrintDocument)sender).SetPreviewPage(e.PageNumber, _printSurfaces[e.PageNumber - 1]); }
        catch (Exception ex) { ReportPrintCallbackFailure(ex); }
    }

    private void AddPages(object sender, AddPagesEventArgs e)
    {
        try
        {
            var document = (PrintDocument)sender;
            foreach (var page in _printSurfaces) document.AddPage(page);
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
            foreach (var old in _printViewboxes) old.Child = null;
            _printViewboxes.Clear(); _printSurfaces.Clear();
            DisposePages(_printPages); _printPages = [];
            foreach (var pageEntries in _pageEntries)
                _printPages.Add(TemplateRenderer.Create(_document, _monday, pageEntries, _recipes, _ingredients, includeWeekend: _weekendEnabled));
            await Task.WhenAll(_printPages.Select(result => result.ImagesReady));
            if (!_loaded) return;
            if (_printPages.Any(result => result.Overflowed)) { SetReady(false); StatusText.Text = L.Get("TemplateOutputOverflow"); return; }
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
            await PrintManagerInterop.ShowPrintUIForWindowAsync(hwnd);
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to open the print dialog"); StatusText.Text = L.Get("ErrorOutput"); }
        finally { _busy = false; SetReady(_ready); }
    }

    private async void Png_Click(object sender, RoutedEventArgs e)
    {
        if (!_ready || _busy || _previewPages.Count == 0) return;
        _busy = true; SetReady(true);
        var outputStarted = false;
        try
        {
            if (_previewPages.Count > 1)
            {
                var folderPicker = new FolderPicker { SuggestedStartLocation = PickerLocationId.PicturesLibrary };
                folderPicker.FileTypeFilter.Add("*");
                WinRT.Interop.InitializeWithWindow.Initialize(folderPicker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
                var folder = await folderPicker.PickSingleFolderAsync();
                if (folder == null) return;
                for (var i = 0; i < _previewPages.Count; i++)
                {
                    var encoded = await RenderPageAsync(_previewPages[i].Page, BitmapEncoder.PngEncoderId);
                    var pageFile = await folder.CreateFileAsync($"{OutputDateName()}-{i + 1}.png", CreationCollisionOption.GenerateUniqueName);
                    outputStarted = true;
                    await FileIO.WriteBytesAsync(pageFile, encoded);
                }
                StatusText.Text = L.Get("TemplateOutputImagesSaved");
                return;
            }
            var picker = new FileSavePicker { SuggestedStartLocation = PickerLocationId.PicturesLibrary, SuggestedFileName = OutputDateName() };
            picker.FileTypeChoices.Add("PNG", PngExtensions);
            picker.FileTypeChoices.Add("JPEG", JpegExtensions);
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSaveFileAsync();
            if (file == null) return;
            var encoderId = file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? BitmapEncoder.PngEncoderId : BitmapEncoder.JpegEncoderId;
            var image = await RenderPageAsync(_previewPages[0].Page, encoderId);
            outputStarted = true;
            await FileIO.WriteBytesAsync(file, image);
            StatusText.Text = L.Get("TemplateOutputSaved");
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to export the menu as an image"); StatusText.Text = L.Get(outputStarted ? "ErrorPngIncomplete" : "ErrorOutput"); }
        finally { _busy = false; SetReady(_ready); }
    }

    private async Task SavePdfAsync()
    {
        if (!_ready || _busy || _previewPages.Count == 0) return;
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

            var images = new List<byte[]>();
            foreach (var page in _previewPages) images.Add(await RenderPageAsync(page.Page, BitmapEncoder.JpegEncoderId));
            var pdf = ImagePdf.Create(images, 1588, 2246);
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

    private async Task<byte[]> RenderPageAsync(FrameworkElement page, Guid encoderId)
    {
        var bitmap = new RenderTargetBitmap();
        await bitmap.RenderAsync(page, 1588, 2246);
        if (bitmap.PixelWidth != 1588 || bitmap.PixelHeight != 2246) throw new InvalidOperationException(L.Get("TemplateOutputImageSizeError"));
        var pixels = await bitmap.GetPixelsAsync();
        var bytes = new byte[pixels.Length];
        using (var reader = DataReader.FromBuffer(pixels)) reader.ReadBytes(bytes);
        using var stream = new InMemoryRandomAccessStream();
        var encoder = await BitmapEncoder.CreateAsync(encoderId, stream);
        encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, 192, 192, bytes);
        await encoder.FlushAsync();
        stream.Seek(0);
        using var encodedReader = new DataReader(stream.GetInputStreamAt(0));
        await encodedReader.LoadAsync((uint)stream.Size);
        var encoded = new byte[(int)stream.Size];
        encodedReader.ReadBytes(encoded);
        return encoded;
    }

    private string OutputDateName() => _firstDay is DateTime first && _lastDay is DateTime last
        ? first == last ? $"{first:dd-MM-yyyy}" : $"{first:dd-MM-yyyy}-{last:dd-MM-yyyy}"
        : $"{_monday:dd-MM-yyyy}";
}

using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.DependencyInjection;
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

/// <summary>Prints the same native page renderer used in the V2 editor.</summary>
public sealed partial class TemplateV2OutputPage : Page
{
    private readonly IDatabaseService _database;
    private static readonly string[] PngExtensions = [".png"];
    private readonly SemaphoreSlim _refreshGate = new(1, 1);
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
    private bool _loaded;
    private bool _weekendEnabled;
    private int _generation;
    private DateTime _monday;
    private DateTime? _firstDay, _lastDay;
    private TemplateV2Document? _document;
    private List<MenuEntry> _entries = [];
    private List<Recipe> _recipes = [];
    private List<Ingredient> _ingredients = [];

    public TemplateV2OutputPage()
    {
        InitializeComponent();
        _uiQueue = DispatcherQueue;
        _database = App.Services.GetRequiredService<IDatabaseService>();
        TitleText.Text = L.Get("V2OutputTitle");
        TemplateSelector.Header = L.Get("V2OutputTemplate");
        WeekPicker.Header = L.Get("V2OutputWeek");
        PrintButton.Content = L.Get("V2OutputPrint");
        PdfButton.Content = L.Get("V2OutputPdf");
        PngButton.Content = L.Get("V2OutputPng");
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
            // A machine with no printing support can still export a PNG.
            try { RegisterPrinting(); } catch (Exception) { UnregisterPrinting(); }
            var templates = (await _database.GetAllTemplatesAsync()).Where(t => t.V2 != null).ToList();
            if (!_loaded) return;
            templates.Insert(0, new MenuTemplate { Name = L.Get("OutputDefaultTemplate"), V2 = new TemplateV2Document { HeaderText = L.Get("String_Text_Weekly_Menu_69fa95") } });
            TemplateSelector.ItemsSource = templates;
            TemplateSelector.SelectedIndex = 0;
        }
        catch (Exception ex) { StatusText.Text = L.Format("V2OutputFailure", ex.Message); }
    }

    private void Page_Unloaded(object sender, RoutedEventArgs e)
    {
        _loaded = false;
        _generation++;
        UnregisterPrinting();
    }

    private async void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e) { if (_loaded) await RefreshAsync(); }
    private async void WeekPicker_DateChanged(CalendarDatePicker sender, CalendarDatePickerDateChangedEventArgs args) { if (_loaded) await RefreshAsync(); }

    private void SetReady(bool ready)
    {
        _ready = ready;
        PrintButton.IsEnabled = PdfButton.IsEnabled = ready && !_busy && _printManager != null;
        PngButton.IsEnabled = ready && !_busy;
        TemplateSelector.IsEnabled = WeekPicker.IsEnabled = !_busy;
    }

    private async Task RefreshAsync()
    {
        var generation = ++_generation;
        SetReady(false);
        if (TemplateSelector.SelectedItem is not MenuTemplate { V2: not null } template) return;
        var date = WeekPicker.Date?.DateTime.Date ?? DateTime.Today;
        var monday = date.AddDays(-((7 + (int)date.DayOfWeek - 1) % 7));
        await _refreshGate.WaitAsync();
        try
        {
            if (!_loaded || generation != _generation) return;
            var weekendEnabled = (await _database.GetSettingsAsync())?.WeekendPlanningEnabled ?? false;
            var entries = await _database.GetMenuAsync(monday, monday.AddDays(weekendEnabled ? 6 : 4));
            var recipes = await _database.GetAllRecipesAsync();
            var ingredients = await _database.GetAllIngredientsAsync();
            if (!_loaded || generation != _generation) return;
            _monday = monday; _document = template.V2; _entries = entries; _recipes = recipes; _ingredients = ingredients; _weekendEnabled = weekendEnabled;
            var result = TemplateV2Renderer.Create(_document, _monday, _entries, _recipes, _ingredients, includeWeekend: _weekendEnabled);
            _firstDay = result.FirstDay; _lastDay = result.LastDay;
            _previewPage = result.Page;
            PreviewHost.Content = _previewPage;
            await result.ImagesReady;
            if (!_loaded || generation != _generation) return;
            StatusText.Text = L.Get(!result.HasMeals ? "TplV2NoMeals" : result.Overflowed ? "V2OutputOverflow" : "V2OutputReady");
            SetReady(result.HasMeals && !result.Overflowed);
        }
        catch (Exception ex) { if (generation == _generation) StatusText.Text = L.Format("V2OutputFailure", ex.Message); }
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
        var source = _printSource;
        if (source == null) return;
        var task = e.Request.CreatePrintTask(OutputDateName(), args => args.SetSource(source));
        try { task.Options.MediaSize = PrintMediaSize.IsoA4; task.Options.Orientation = PrintOrientation.Portrait; }
        catch (Exception) { /* The printer may not support these defaults. */ }
        task.Completed += (_, args) => _uiQueue.TryEnqueue(() =>
        {
            if (args.Completion == PrintTaskCompletion.Failed) StatusText.Text = L.Get("V2OutputPrintFailed");
        });
    }

    private void Paginate(object sender, PaginateEventArgs e)
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

    private void GetPreviewPage(object sender, GetPreviewPageEventArgs e)
    {
        if (_printPage != null && e.PageNumber == 1) ((PrintDocument)sender).SetPreviewPage(1, _printPage);
    }

    private void AddPages(object sender, AddPagesEventArgs e)
    {
        var document = (PrintDocument)sender;
        if (_printPage != null) document.AddPage(_printPage);
        document.AddPagesComplete();
    }

    private async void Print_Click(object sender, RoutedEventArgs e) => await ShowPrintAsync(false);
    private async void Pdf_Click(object sender, RoutedEventArgs e) => await ShowPrintAsync(true);

    private async Task ShowPrintAsync(bool pdf)
    {
        if (!_ready || _busy || _document == null) return;
        _busy = true; SetReady(true);
        try
        {
            if (!PrintManager.IsSupported() || _printDocument == null) throw new InvalidOperationException(L.Get("V2OutputPrintUnsupported"));
            var result = TemplateV2Renderer.Create(_document, _monday, _entries, _recipes, _ingredients, includeWeekend: _weekendEnabled);
            await result.ImagesReady;
            if (!_loaded) return;
            if (result.Overflowed) { SetReady(false); StatusText.Text = L.Get("V2OutputOverflow"); return; }
            _nativePage = result.Page;
            if (pdf) StatusText.Text = L.Get("V2OutputPrintPdfHint");
            var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow);
            await PrintManagerInterop.ShowPrintUIForWindowAsync(hwnd);
        }
        catch (Exception ex) { StatusText.Text = L.Format("V2OutputFailure", ex.Message); }
        finally { _busy = false; SetReady(_ready); }
    }

    private async void Png_Click(object sender, RoutedEventArgs e)
    {
        if (!_ready || _busy || _previewPage == null) return;
        _busy = true; SetReady(true);
        try
        {
            var picker = new FileSavePicker { SuggestedStartLocation = PickerLocationId.PicturesLibrary, SuggestedFileName = OutputDateName() };
            picker.FileTypeChoices.Add("PNG", PngExtensions);
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSaveFileAsync();
            if (file == null) return;
            var bitmap = new RenderTargetBitmap();
            await bitmap.RenderAsync(_previewPage, 1588, 2246);
            if (bitmap.PixelWidth != 1588 || bitmap.PixelHeight != 2246) throw new InvalidOperationException(L.Get("V2OutputImageSizeError"));
            var pixels = await bitmap.GetPixelsAsync();
            var bytes = new byte[pixels.Length];
            using (var reader = DataReader.FromBuffer(pixels)) reader.ReadBytes(bytes);
            using var stream = await file.OpenAsync(FileAccessMode.ReadWrite);
            stream.Size = 0;
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)bitmap.PixelWidth, (uint)bitmap.PixelHeight, 192, 192, bytes);
            await encoder.FlushAsync();
            StatusText.Text = L.Get("V2OutputSaved");
        }
        catch (Exception ex) { StatusText.Text = L.Format("V2OutputFailure", ex.Message); }
        finally { _busy = false; SetReady(_ready); }
    }

    private string OutputDateName() => _firstDay is DateTime first && _lastDay is DateTime last
        ? first == last ? $"{first:dd-MM-yyyy}" : $"{first:dd-MM-yyyy} - {last:dd-MM-yyyy}"
        : $"{_monday:dd-MM-yyyy}";
}

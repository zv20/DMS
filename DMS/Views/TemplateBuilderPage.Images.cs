using DMS.Models;
using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.Extensions.Logging;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Windows.Foundation;
using Windows.Graphics.Imaging;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using L = DMS.Services.Localization;

namespace DMS.Views;

public sealed partial class TemplateBuilderPage
{
    private bool _addingImage, _draggingImage, _dirtyBeforeImageDrag;
    private uint _imagePointerId;
    private Point _imagePointerStart, _imagePositionStart;
    private string? _imageToReveal;

    private TemplateImage? SelectedCanvasImage() => _selectedBlock?.StartsWith("image:", StringComparison.Ordinal) == true
        ? _document.DecorativeImages.FirstOrDefault(image => image.Id == _selectedBlock[6..]) : null;

    private void InitializeImageInteraction()
    {
        ImageLibraryMenuItem.Text = L.Get("TplImageLibrary");
        SelectionOutline.PointerPressed += (_, e) => BeginImageDrag(e);
        SelectionOutline.PointerMoved += (_, e) =>
        {
            if (!_draggingImage || e.Pointer.PointerId != _imagePointerId || SelectedCanvasImage() is not { } image) return;
            var point = e.GetCurrentPoint(PageHost).Position;
            TemplateImagePlacement.Move(image, _imagePositionStart.X + point.X - _imagePointerStart.X, _imagePositionStart.Y + point.Y - _imagePointerStart.Y);
            if (_selectionAnchor != null)
                _selectionAnchor.RenderTransform = new TranslateTransform { X = image.X - _imagePositionStart.X, Y = image.Y - _imagePositionStart.Y };
            PositionContextTools();
            e.Handled = true;
        };
        SelectionOutline.PointerReleased += (_, e) => { if (e.Pointer.PointerId == _imagePointerId) EndImageDrag(); };
        SelectionOutline.PointerCanceled += (_, _) => EndImageDrag(cancel: true);
        SelectionOutline.PointerCaptureLost += (_, _) => EndImageDrag();
    }

    private void BeginImageDrag(PointerRoutedEventArgs e)
    {
        if (_draggingImage || SelectedCanvasImage() is not { } image || !e.GetCurrentPoint(PageHost).Properties.IsLeftButtonPressed) return;
        if (!SelectionOutline.CapturePointer(e.Pointer)) return;
        _imagePointerId = e.Pointer.PointerId;
        _imagePointerStart = e.GetCurrentPoint(PageHost).Position;
        _imagePositionStart = new Point(image.X, image.Y);
        _dirtyBeforeImageDrag = _dirty;
        _draggingImage = true;
        e.Handled = true;
    }

    private void EndImageDrag(bool cancel = false)
    {
        if (!_draggingImage) return;
        _draggingImage = false;
        SelectionOutline.ReleasePointerCaptures();
        if (SelectedCanvasImage() is not { } image) return;
        var moved = image.X != _imagePositionStart.X || image.Y != _imagePositionStart.Y;
        if (cancel)
        {
            image.X = _imagePositionStart.X; image.Y = _imagePositionStart.Y;
            _dirty = _dirtyBeforeImageDrag;
        }
        else _dirty |= moved;
        // Recalculate text clearance once the move is committed, without replacing
        // the page (and losing pointer capture) during the drag.
        if (moved) Render();
    }

    private void NormalizePageBackground()
    {
        if (string.IsNullOrEmpty(_document.BackgroundImageDataUri)) return;
        _document.DecorativeImages.Insert(0, new TemplateImage
        {
            AssetId = _document.BackgroundImageAssetId, DataUri = _document.BackgroundImageDataUri, X = 0, Y = 0,
            Width = TemplatePageLayout.PageWidth, Height = TemplatePageLayout.PageHeight,
            Opacity = _document.BackgroundImageOpacity, ReserveTextSpace = false, FillFrame = true,
            AltText = L.Get("TplImageBackground")
        });
        _document.BackgroundImageDataUri = null;
        _document.BackgroundImageAssetId = null;
    }

    private async void AddDecoration_Click(object sender, RoutedEventArgs e)
    {
        if (_addingImage || _saving || _switching) return;
        _addingImage = _saving = true; AddImageMenuItem.IsEnabled = false;
        var document = _document;
        try
        {
            var picker = new FileOpenPicker();
            foreach (var extension in new[] { ".png", ".jpg", ".jpeg" }) picker.FileTypeFilter.Add(extension);
            WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(App.CurrentWindow));
            var file = await picker.PickSingleFileAsync();
            if (file == null || !ReferenceEquals(document, _document)) return;
            if ((await file.GetBasicPropertiesAsync()).Size > 4 * 1024 * 1024) { StatusText.Text = L.Get("TplImageLimit"); return; }
            using var stream = await file.OpenReadAsync();
            var decoder = await BitmapDecoder.CreateAsync(stream);
            var sourceWidth = (double)decoder.OrientedPixelWidth;
            var sourceHeight = (double)decoder.OrientedPixelHeight;
            if (sourceWidth <= 0 || sourceHeight <= 0) throw new InvalidOperationException(L.Get("TplImageInvalid"));
            var buffer = await Windows.Storage.FileIO.ReadBufferAsync(file);
            if (buffer.Length > 4 * 1024 * 1024) { StatusText.Text = L.Get("TplImageLimit"); return; }
            var bytes = new byte[buffer.Length]; using (var reader = DataReader.FromBuffer(buffer)) reader.ReadBytes(bytes);
            if (!ReferenceEquals(document, _document)) return;
            var mime = file.FileType.Equals(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg";
            var asset = await _database.SaveTemplateImageAsync(file.DisplayName, mime, bytes);
            PlaceLibraryImage(asset, sourceWidth, sourceHeight);
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to add an image to the template"); StatusText.Text = L.Get("ErrorTemplate"); }
        finally { _addingImage = _saving = false; AddImageMenuItem.IsEnabled = true; }
    }

    private void PlaceLibraryImage(TemplateImageAsset asset, double sourceWidth, double sourceHeight)
    {
        var scale = Math.Min(1, 200 / Math.Max(sourceWidth, sourceHeight));
        var image = new TemplateImage
        {
            AssetId = asset.Id, DataUri = $"data:{asset.ContentType};base64,{Convert.ToBase64String(asset.Data)}", AltText = asset.Name,
            Width = Math.Max(1, sourceWidth * scale), Height = Math.Max(1, sourceHeight * scale), ReserveTextSpace = false
        };
        TemplateImagePlacement.Move(image, (TemplatePageLayout.PageWidth - image.Width) / 2, (TemplatePageLayout.PageHeight - image.Height) / 2);
        _document.DecorativeImages.Add(image);
        _dirty = true;
        StopInlineEditing();
        _selectedBlock = $"image:{image.Id}"; _selectionAnchor = null;
        _imageToReveal = image.Id;
        RefreshDecorationList(image.Id);
        BuildContextTools(); Render();
    }

    private void RefreshDecorationList(string? selectedId = null)
    {
        PageImagesMenu.Items.Clear();
        foreach (var image in _document.DecorativeImages)
        {
            var item = new MenuFlyoutItem { Text = string.IsNullOrWhiteSpace(image.AltText) ? L.Get("TplImageBlock") : image.AltText };
            var id = image.Id;
            item.Click += (_, _) =>
            {
                var key = $"image:{id}";
                if (FindAnchor(PageHost, key) is { } anchor) { SelectCanvasBlock(key, anchor); anchor.StartBringIntoView(); }
            };
            PageImagesMenu.Items.Add(item);
        }
        PageImagesMenu.IsEnabled = PageImagesMenu.Items.Count > 0;
    }

    private void RevealNewImage()
    {
        if (_imageToReveal == null || _selectedBlock != $"image:{_imageToReveal}" || _selectionAnchor == null) return;
        _imageToReveal = null;
        _selectionAnchor.StartBringIntoView();
    }

    private void EditImage(Action<TemplateImage> change)
    {
        if (_contextBinding || SelectedCanvasImage() is not { } image) return;
        change(image); _dirty = true; Render();
    }

    private void AddImageAction(string label, string content, Action action)
    {
        var button = new Button { Content = content, MinWidth = 32, Padding = new Thickness(6, 4, 6, 4) };
        ToolTipService.SetToolTip(button, L.Get(label));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(button, L.Get(label));
        button.Click += (_, _) => action();
        ContextTools.Children.Add(button);
    }

    private NumberBox ImageNumber(string label, double value, double maximum, double minimum = 1)
    {
        var control = new NumberBox { Width = 84, Minimum = minimum, Maximum = maximum, Value = value, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
        ToolTipService.SetToolTip(control, L.Get(label));
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(control, L.Get(label));
        ContextTools.Children.Add(control);
        return control;
    }

    private void BuildImageTools()
    {
        if (SelectedCanvasImage() is not { } image) return;
        var horizontal = new ComboBox { Width = 130, PlaceholderText = L.Get("TplImageAlignHorizontal") };
        foreach (var key in new[] { "TplLeft", "TplCenter", "TplRight" }) horizontal.Items.Add(L.Get(key));
        horizontal.SelectionChanged += (_, _) =>
        {
            if (horizontal.SelectedIndex < 0) return;
            var position = horizontal.SelectedIndex;
            EditImage(item => TemplateImagePlacement.Move(item, position == 0 ? 0 : position == 1 ? (TemplatePageLayout.PageWidth - item.Width) / 2 : TemplatePageLayout.PageWidth - item.Width, item.Y));
            horizontal.SelectedIndex = -1;
        };
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(horizontal, L.Get("TplImageAlignHorizontal"));
        ContextTools.Children.Add(horizontal);
        var vertical = new ComboBox { Width = 130, PlaceholderText = L.Get("TplImageAlignVertical") };
        foreach (var key in new[] { "TplImageTop", "TplImageMiddle", "TplImageBottom" }) vertical.Items.Add(L.Get(key));
        vertical.SelectionChanged += (_, _) =>
        {
            if (vertical.SelectedIndex < 0) return;
            var position = vertical.SelectedIndex;
            EditImage(item => TemplateImagePlacement.Move(item, item.X, position == 0 ? 0 : position == 1 ? (TemplatePageLayout.PageHeight - item.Height) / 2 : TemplatePageLayout.PageHeight - item.Height));
            vertical.SelectedIndex = -1;
        };
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(vertical, L.Get("TplImageAlignVertical"));
        ContextTools.Children.Add(vertical);
        var width = ImageNumber("TplBuilderImageWidth", image.Width, TemplatePageLayout.PageWidth);
        var height = ImageNumber("TplBuilderImageHeight", image.Height, TemplatePageLayout.PageHeight);
        void Resize(double value, bool isWidth)
        {
            if (_contextBinding || !double.IsFinite(value) || value <= 0) return;
            EditImage(item => TemplateImagePlacement.Resize(item, value, isWidth));
            _contextBinding = true;
            width.Value = image.Width; height.Value = image.Height;
            _contextBinding = false;
        }
        width.ValueChanged += (_, _) => Resize(width.Value, true);
        height.ValueChanged += (_, _) => Resize(height.Value, false);
        AddStyleToggle("↔", "TplImageLockAspect", image.LockAspectRatio, value => EditImage(item => item.LockAspectRatio = value));
        var transparency = ImageNumber("TplImageTransparency", Math.Round((1 - image.Opacity) * 100), 100, minimum: 0);
        transparency.ValueChanged += (_, _) =>
        {
            if (double.IsFinite(transparency.Value)) EditImage(item => item.Opacity = 1 - transparency.Value / 100);
        };
        var mode = new ComboBox { Width = 170 };
        foreach (var key in new[] { "TplImageBehindText", "TplImageInFront", "TplImageKeepClear" }) mode.Items.Add(L.Get(key));
        mode.SelectedIndex = image.ReserveTextSpace ? 2 : image.InFrontOfText ? 1 : 0;
        Microsoft.UI.Xaml.Automation.AutomationProperties.SetName(mode, L.Get("TplImageTextPlacement"));
        mode.SelectionChanged += (_, _) =>
        {
            if (mode.SelectedIndex < 0) return;
            EditImage(item => { item.ReserveTextSpace = mode.SelectedIndex == 2; item.InFrontOfText = mode.SelectedIndex == 1; });
        };
        ContextTools.Children.Add(mode);
        AddImageAction("TplImageMoveBackward", "↓", () => ReorderImage(image, false));
        AddImageAction("TplImageMoveForward", "↑", () => ReorderImage(image, true));
        AddImageAction("TplImageRename", "✎", async () => await RenameImageAsync(image));
        AddImageAction("TplImageDelete", "🗑", async () => await DeleteImageAsync(image));
    }

    private async Task RenameImageAsync(TemplateImage image)
    {
        if (_saving || _switching || !_document.DecorativeImages.Contains(image)) return;
        _saving = true;
        try
        {
            var name = await PromptNameAsync("TplImageRename", "TplImageName", image.AltText,
                value => _document.DecorativeImages.Any(other => other.Id != image.Id && string.Equals(other.AltText, value, StringComparison.OrdinalIgnoreCase)));
            if (name == null) return;
            image.AltText = name; _dirty = true;
            RefreshDecorationList(image.Id); Render();
            StatusText.Text = L.Get("TplImageChangesPending");
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to rename the image block"); StatusText.Text = L.Get("ErrorTemplate"); }
        finally { _saving = false; }
    }

    private async Task DeleteImageAsync(TemplateImage image)
    {
        if (_saving || _switching || !_document.DecorativeImages.Contains(image)) return;
        _saving = true;
        try
        {
            var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplImageDelete"), Content = L.Get("TplImageDeletePrompt"),
                PrimaryButtonText = L.Get("String_Text_Delete_f6fdbe"), CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            if (_selectedBlock == $"image:{image.Id}") DismissContextTools();
            _document.DecorativeImages.Remove(image);
            _dirty = true; RefreshDecorationList(); Render();
            StatusText.Text = L.Get("TplImageChangesPending");
        }
        catch (Exception ex) { App.Logger.LogError(ex, "Unable to remove the image block"); StatusText.Text = L.Get("ErrorTemplate"); }
        finally { _saving = false; }
    }

    private void ReorderImage(TemplateImage image, bool forward)
    {
        _document.DecorativeImages.Remove(image);
        if (forward) _document.DecorativeImages.Add(image);
        else _document.DecorativeImages.Insert(0, image);
        _dirty = true; RefreshDecorationList(image.Id); Render();
    }
}

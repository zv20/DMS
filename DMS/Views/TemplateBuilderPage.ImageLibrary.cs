using DMS.Models;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage.Streams;
using L = DMS.Services.Localization;

namespace DMS.Views;

public sealed partial class TemplateBuilderPage
{
    private async void ImageLibrary_Click(object sender, RoutedEventArgs e)
    {
        if (_saving || _switching || _addingImage) return;
        _saving = true;
        UpdateInlineText();
        EndImageDrag();
        UpdateImageActions();
        string? selectedId = ImageInList()?.AssetId;
        try
        {
            while (true)
            {
                var assets = await _database.GetTemplateImagesAsync();
                if (assets.Count == 0)
                {
                    await new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplImageLibrary"), Content = L.Get("TplImageLibraryEmpty"),
                        CloseButtonText = L.Get("Text_Cancel_77dfd2") }.ShowAsync();
                    return;
                }

                var selector = new ComboBox { Header = L.Get("TplImageName"), HorizontalAlignment = HorizontalAlignment.Stretch };
                foreach (var asset in assets) selector.Items.Add(new ComboBoxItem { Tag = asset.Id, Content = asset.Name });
                var preview = new Image { Height = 120, Stretch = Stretch.Uniform };
                var usage = new TextBlock { TextWrapping = TextWrapping.Wrap };
                var rename = new Button { Content = L.Get("TplLibraryRename"), HorizontalAlignment = HorizontalAlignment.Stretch,
                    HorizontalContentAlignment = HorizontalAlignment.Stretch, ContentTemplate = (DataTemplate)Resources["SettingsLabelTemplate"] };
                var delete = new Button { Content = L.Get("TplLibraryDelete"), HorizontalAlignment = HorizontalAlignment.Stretch,
                    HorizontalContentAlignment = HorizontalAlignment.Stretch, ContentTemplate = (DataTemplate)Resources["SettingsLabelTemplate"] };
                var actions = new StackPanel { Spacing = 8 };
                actions.Children.Add(rename); actions.Children.Add(delete);
                var content = new StackPanel { Spacing = 12, MinWidth = 260 };
                content.Children.Add(selector); content.Children.Add(preview);
                content.Children.Add(new TextBlock { Text = L.Get("TplImageUsedBy"), FontWeight = Microsoft.UI.Text.FontWeights.SemiBold });
                content.Children.Add(new ScrollViewer { Content = usage, MaxHeight = 150, HorizontalScrollMode = ScrollMode.Disabled, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });
                content.Children.Add(actions);
                var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplImageLibrary"), Content = content,
                    PrimaryButtonText = L.Get("TplImageInsert"), CloseButtonText = L.Get("Text_Cancel_77dfd2"), IsPrimaryButtonEnabled = false };
                var action = "";
                var generation = 0;
                async Task LoadSelectionAsync()
                {
                    var currentGeneration = ++generation;
                    dialog.IsPrimaryButtonEnabled = rename.IsEnabled = delete.IsEnabled = false;
                    preview.Source = null; usage.Text = "";
                    if (selector.SelectedItem is not ComboBoxItem { Tag: string id }) return;
                    try
                    {
                        var image = await _database.GetTemplateImageAsync(id);
                        var names = await _database.GetTemplateImageUsageAsync(id);
                        if (currentGeneration != generation || image == null) return;
                        usage.Text = names.Count == 0 ? L.Get("TplImageUnused") : string.Join("\n", names.Select(name => "• " + name));
                        // Name and deletion remain available even for an older unreadable image.
                        rename.IsEnabled = delete.IsEnabled = true;
                        using var stream = await OpenLibraryImageAsync(image.Data);
                        var bitmap = new BitmapImage { DecodePixelWidth = 256 };
                        await bitmap.SetSourceAsync(stream);
                        if (currentGeneration != generation) return;
                        preview.Source = bitmap;
                        dialog.IsPrimaryButtonEnabled = true;
                    }
                    catch (Exception ex)
                    {
                        if (currentGeneration == generation) usage.Text = L.Format("TplError", ex.Message);
                    }
                }
                selector.SelectionChanged += async (_, _) => await LoadSelectionAsync();
                selector.SelectedItem = selector.Items.OfType<ComboBoxItem>().FirstOrDefault(item => Equals(item.Tag, selectedId)) ?? selector.Items[0];
                rename.Click += (_, _) => { action = "rename"; dialog.Hide(); };
                delete.Click += (_, _) => { action = "delete"; dialog.Hide(); };
                if (await dialog.ShowAsync() == ContentDialogResult.Primary) action = "insert";
                // Ignore any preview read finishing after this dialog has closed.
                ++generation;
                if (selector.SelectedItem is not ComboBoxItem { Tag: string chosenId } || action.Length == 0) return;
                selectedId = chosenId;
                var selected = assets.First(asset => asset.Id == chosenId);
                if (action == "rename")
                {
                    var name = await PromptNameAsync("TplLibraryRename", "TplImageName", selected.Name,
                        value => assets.Any(other => other.Id != chosenId && string.Equals(other.Name, value, StringComparison.OrdinalIgnoreCase)));
                    if (name != null) await _database.RenameTemplateImageAsync(chosenId, name);
                }
                else if (action == "delete")
                {
                    if (await DeleteLibraryImageAsync(selected)) selectedId = null;
                }
                else
                {
                    var image = await _database.GetTemplateImageAsync(chosenId) ?? throw new InvalidOperationException(L.Get("TplImageInvalid"));
                    using var stream = await OpenLibraryImageAsync(image.Data);
                    var decoder = await BitmapDecoder.CreateAsync(stream);
                    if (decoder.OrientedPixelWidth == 0 || decoder.OrientedPixelHeight == 0) throw new InvalidOperationException(L.Get("TplImageInvalid"));
                    PlaceLibraryImage(image, decoder.OrientedPixelWidth, decoder.OrientedPixelHeight);
                    return;
                }
            }
        }
        catch (Exception ex) { StatusText.Text = L.Format("TplError", ex.Message); }
        finally { _saving = false; UpdateImageActions(); }
    }

    private static async Task<InMemoryRandomAccessStream> OpenLibraryImageAsync(byte[] bytes)
    {
        var stream = new InMemoryRandomAccessStream();
        try
        {
            using var writer = new DataWriter(stream.GetOutputStreamAt(0));
            writer.WriteBytes(bytes); await writer.StoreAsync(); await writer.FlushAsync(); stream.Seek(0);
            return stream;
        }
        catch { stream.Dispose(); throw; }
    }

    private bool CanvasUsesImage(string id) => _document.DecorativeImages.Any(image => image.AssetId == id) || _document.BackgroundImageAssetId == id;

    private async Task<bool> DeleteLibraryImageAsync(TemplateImageAsset asset)
    {
        var names = await _database.GetTemplateImageUsageAsync(asset.Id);
        var usesOnCanvas = CanvasUsesImage(asset.Id);
        var currentSavedTemplateDeleted = _loadedName != null && names.Contains(_loadedName, StringComparer.Ordinal);
        var content = new StackPanel { Spacing = 12 };
        content.Children.Add(new TextBlock { Text = L.Format("TplLibraryDeletePrompt", asset.Name), TextWrapping = TextWrapping.Wrap });
        if (names.Count > 0)
        {
            content.Children.Add(new TextBlock { Text = L.Get("TplLibraryDeleteTemplatesWarning"), TextWrapping = TextWrapping.Wrap });
            content.Children.Add(new ScrollViewer { MaxHeight = 180, HorizontalScrollMode = ScrollMode.Disabled, VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                Content = new TextBlock { Text = string.Join("\n", names.Select(name => "• " + name)), TextWrapping = TextWrapping.Wrap } });
        }
        if (currentSavedTemplateDeleted || usesOnCanvas)
            content.Children.Add(new TextBlock { Text = L.Get(currentSavedTemplateDeleted ? "TplLibraryOpenTemplateWarning" : "TplLibraryOpenCanvasWarning"), TextWrapping = TextWrapping.Wrap });
        var dialog = new ContentDialog { XamlRoot = XamlRoot, Title = L.Get("TplLibraryDelete"), Content = content,
            PrimaryButtonText = L.Get(names.Count > 0 ? "TplLibraryDeleteAll" : "String_Text_Delete_f6fdbe"),
            CloseButtonText = L.Get("Text_Cancel_77dfd2"), DefaultButton = ContentDialogButton.Close };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return false;
        // The database checks that this exact usage list is still current, then
        // removes the saved templates and image in one transaction.
        await _database.DeleteTemplateImageAsync(asset.Id, names);
        if (usesOnCanvas || currentSavedTemplateDeleted)
        {
            DismissContextTools();
            _document.DecorativeImages.RemoveAll(image => image.AssetId == asset.Id);
            if (_document.BackgroundImageAssetId == asset.Id) { _document.BackgroundImageAssetId = null; _document.BackgroundImageDataUri = null; }
            if (currentSavedTemplateDeleted)
            {
                // Preserve remaining canvas edits as an unsaved document.
                _loadedTemplate = new MenuTemplate { Document = _document };
                _loadedName = null; _legacySource = false;
                RenameTemplateMenuItem.IsEnabled = DeleteButton.IsEnabled = false;
            }
            else
            {
                if (_loadedTemplate.BackgroundImageAssetId == asset.Id) { _loadedTemplate.BackgroundImageAssetId = null; _loadedTemplate.BackgroundImageDataUri = null; }
                _loadedTemplate.ImageLayers.RemoveAll(image => image.AssetId == asset.Id);
            }
            _dirty = true; RefreshDecorationList(); Render();
        }
        await ReloadTemplatesAsync();
        StatusText.Text = L.Get(currentSavedTemplateDeleted ? "TplLibraryDeletedOpenTemplate" : "TplLibraryDeleted");
        return true;
    }
}

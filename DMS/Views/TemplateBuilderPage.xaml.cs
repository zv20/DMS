using L = DMS.Services.Localization;
using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Windows.UI;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class TemplateBuilderPage : Page
{
    private readonly IDatabaseService _database;
    private MenuTemplate _currentTemplate = new();
    private List<MenuTemplate> _templates = new();
    private List<Recipe> _recipes = new();

    public TemplateBuilderPage()
    {
        this.InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        Loaded += TemplateBuilderPage_Loaded;
    }

    private async void TemplateBuilderPage_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadTemplatesAsync();
        UpdateWeekStructure();
        UpdatePreview();
    }

    private async Task LoadTemplatesAsync()
    {
        _templates = await _database.GetAllTemplatesAsync();
        _recipes = await _database.GetAllRecipesAsync();
        TemplateSelector.ItemsSource = _templates;
        TemplateSelector.DisplayMemberPath = "Name";
    }

    private void NewTemplateButton_Click(object sender, RoutedEventArgs e)
    {
        _currentTemplate = new MenuTemplate
        {
            Name = "",
            HeaderText = L.Get("Text_Weekly_Menu_69fa95"),
            FooterText = L.Get("Text_Prepared_with_care_by_DMS_082a78"),
            BackgroundColor = "#FFFFFF"
        };
        TemplateSelector.SelectedItem = null;
        UpdateFieldsFromTemplate();
        UpdateWeekStructure();
        UpdatePreview();
    }

    private void TemplateSelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (TemplateSelector.SelectedItem is MenuTemplate template)
        {
            _currentTemplate = new MenuTemplate
            {
                Name = template.Name,
                IsPreset = template.IsPreset,
                HeaderText = template.HeaderText,
                FooterText = template.FooterText,
                BackgroundColor = template.BackgroundColor,
                LegacyDataJson = template.LegacyDataJson
            };
            UpdateFieldsFromTemplate();
            UpdateWeekStructure();
            UpdatePreview();
        }
    }

    private void UpdateFieldsFromTemplate()
    {
        TemplateNameBox.Text = _currentTemplate.Name;
        HeaderTextBox.Text = _currentTemplate.HeaderText;
        FooterTextBox.Text = _currentTemplate.FooterText;
        BackgroundColorBox.Text = _currentTemplate.BackgroundColor;
        BgColorPreview.Background = new SolidColorBrush(ParseColor(_currentTemplate.BackgroundColor));
    }

    private void UpdateCurrentTemplateFromFields()
    {
        _currentTemplate.Name = TemplateNameBox.Text?.Trim() ?? "";
        _currentTemplate.HeaderText = HeaderTextBox.Text?.Trim() ?? "Weekly Menu";
        _currentTemplate.FooterText = FooterTextBox.Text?.Trim() ?? "Prepared with care by DMS";
        _currentTemplate.BackgroundColor = BackgroundColorBox.Text?.Trim() ?? "#FFFFFF";
    }

    private void UpdateWeekStructure()
    {
        WeekStructurePanel.Children.Clear();

        var slots = new[] { "soup", "main", "dessert", "other" };
        var slotIcons = new[] { "🥣", "🍽️", "🍰", "➕" };

        foreach (var slot in slots)
        {
            var slotPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
            var iconText = new TextBlock { Text = slotIcons[Array.IndexOf(slots, slot)], FontSize = 16, VerticalAlignment = VerticalAlignment.Center, Width = 30 };
            var labelText = new TextBlock { Text = L.Category(slot), FontSize = 14, VerticalAlignment = VerticalAlignment.Center, Width = 100 };
            
            var comboBox = new ComboBox 
            { 
                Width = 300, 
                PlaceholderText = L.Format("RecipeFor", L.Category(slot)),
                ItemsSource = _recipes.Where(recipe => recipe.Category == slot).ToList(),
                DisplayMemberPath = "Name"
            };
            
            slotPanel.Children.Add(iconText);
            slotPanel.Children.Add(labelText);
            slotPanel.Children.Add(comboBox);
            WeekStructurePanel.Children.Add(slotPanel);
        }
    }

    private void UpdatePreview()
    {
        PreviewBorder.Background = new SolidColorBrush(ParseColor(_currentTemplate.BackgroundColor));
        PreviewPanel.Children.Clear();

        // Header
        var headerPanel = new Border
        {
            Background = new SolidColorBrush(Colors.Transparent),
            Padding = new Thickness(16, 16, 16, 8)
        };
        var headerText = new TextBlock
        {
            Text = _currentTemplate.HeaderText,
            FontSize = 24,
            FontWeight = FontWeights.Bold,
            HorizontalAlignment = HorizontalAlignment.Center,
            Foreground = new SolidColorBrush(Colors.Black)
        };
        headerPanel.Child = headerText;
        PreviewPanel.Children.Add(headerPanel);

        // Week grid preview
        var dayNames = Enumerable.Range(0, 7).Select(i => new DateTime(2026, 10, 26).AddDays(i).ToString("ddd")).ToArray();
        var slots = new[] { L.Category("soup"), L.Category("main"), L.Category("dessert"), L.Category("other") };

        for (int row = 0; row < slots.Length; row++)
        {
            var rowPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4 };
            
            // Slot label
            var slotLabel = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(255, 240, 240, 240)),
                Width = 60,
                Padding = new Thickness(8),
                Child = new TextBlock { Text = slots[row], FontSize = 11, FontWeight = FontWeights.Medium, Foreground = new SolidColorBrush(Colors.DarkGray) }
            };
            rowPanel.Children.Add(slotLabel);

            for (int col = 0; col < 7; col++)
            {
                var cell = new Border
                {
                    Background = new SolidColorBrush(Colors.White),
                    BorderBrush = new SolidColorBrush(Color.FromArgb(255, 220, 220, 220)),
                    BorderThickness = new Thickness(1),
                    Width = 100,
                    Height = 60,
                    Padding = new Thickness(6),
                    Child = new TextBlock 
                    { 
                        Text = "—", 
                        FontSize = 10, 
                        Foreground = new SolidColorBrush(Colors.LightGray),
                        HorizontalAlignment = HorizontalAlignment.Center,
                        VerticalAlignment = VerticalAlignment.Center
                    }
                };
                rowPanel.Children.Add(cell);
            }
            PreviewPanel.Children.Add(rowPanel);
        }

        // Footer
        var footerPanel = new Border
        {
            Background = new SolidColorBrush(Colors.Transparent),
            Padding = new Thickness(16, 8, 16, 16)
        };
        var footerText = new TextBlock
        {
            Text = _currentTemplate.FooterText,
            FontSize = 11,
            HorizontalAlignment = HorizontalAlignment.Center,
            Foreground = new SolidColorBrush(Colors.Gray)
        };
        footerPanel.Child = footerText;
        PreviewPanel.Children.Add(footerPanel);
    }

    private void BackgroundColorBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (BackgroundColorBox.Text.StartsWith("#") && BackgroundColorBox.Text.Length == 7)
        {
            try 
            {
                BgColorPreview.Background = new SolidColorBrush(ParseColor(BackgroundColorBox.Text));
                UpdatePreview();
            }
            catch { }
        }
    }

    private void PickBackgroundColor_Click(object sender, RoutedEventArgs e)
    {
        // Simple color picker dialog
        var colors = new[] { "#FFFFFF", "#F8F9FA", "#E8F5E9", "#E3F2FD", "#FFF3E0", "#FCE4EC", "#F3E5F5", "#E0F2F1" };
        var panel = new StackPanel { Spacing = 8 };
        panel.Children.Add(new TextBlock { Text = L.Get("Text_Choose_a_background_color_96d4ed"), FontSize = 14, FontWeight = FontWeights.SemiBold });
        
        var colorGrid = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        foreach (var color in colors)
        {
            var btn = new Button
            {
                Width = 50,
                Height = 50,
                Background = new SolidColorBrush(ParseColor(color)),
                CornerRadius = new CornerRadius(4),
                Tag = color,
                BorderBrush = color == _currentTemplate.BackgroundColor ? new SolidColorBrush(Colors.Blue) : new SolidColorBrush(Colors.Transparent),
                BorderThickness = new Thickness(2)
            };
            btn.Click += (s, args) =>
            {
                if (s is Button b && b.Tag is string c)
                {
                    BackgroundColorBox.Text = c;
                    BgColorPreview.Background = new SolidColorBrush(ParseColor(c));
                    UpdatePreview();
                }
            };
            colorGrid.Children.Add(btn);
        }
        panel.Children.Add(colorGrid);

        var dialog = new ContentDialog
        {
            Title = L.Get("Text_Pick_Background_Color_cb6f4f"),
            Content = panel,
            CloseButtonText = L.Get("Text_Done_e9b450"),
            XamlRoot = this.XamlRoot
        };
        _ = dialog.ShowAsync();
    }

    private async void SaveTemplateButton_Click(object sender, RoutedEventArgs e)
    {
        UpdateCurrentTemplateFromFields();

        if (string.IsNullOrWhiteSpace(_currentTemplate.Name))
        {
            var errorDialog = new ContentDialog
            {
                Title = L.Get("Text_Error_7f2f6a"),
                Content = L.Get("Text_Template_name_is_required_0e3ca2"),
                CloseButtonText = L.Get("Text_OK_9ce3bd"),
                XamlRoot = this.XamlRoot
            };
            await errorDialog.ShowAsync();
            return;
        }

        await _database.SaveTemplateAsync(_currentTemplate);
        await LoadTemplatesAsync();
        TemplateSelector.SelectedItem = _templates.FirstOrDefault(t => t.Name == _currentTemplate.Name);
    }

    private void LoadTemplateButton_Click(object sender, RoutedEventArgs e)
    {
        if (TemplateSelector.SelectedItem is MenuTemplate template)
        {
            _currentTemplate = template;
            UpdateFieldsFromTemplate();
            UpdateWeekStructure();
            UpdatePreview();
        }
    }

    private async void DeleteTemplateButton_Click(object sender, RoutedEventArgs e)
    {
        if (TemplateSelector.SelectedItem is MenuTemplate template)
        {
            if (template.IsPreset)
            {
                var errorDialog = new ContentDialog
                {
                    Title = L.Get("Text_Cannot_Delete_9635fe"),
                    Content = L.Get("Text_Preset_templates_cannot_be_deleted_0a9c55"),
                    CloseButtonText = L.Get("Text_OK_9ce3bd"),
                    XamlRoot = this.XamlRoot
                };
                await errorDialog.ShowAsync();
                return;
            }

            var dialog = new ContentDialog
            {
                Title = L.Get("Text_Delete_Template_c07327"),
                Content = L.Format("DeleteTemplatePrompt", template.Name),
                PrimaryButtonText = L.Get("Text_Delete_f6fdbe"),
                CloseButtonText = L.Get("Text_Cancel_77dfd2"),
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = this.XamlRoot
            };

            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.Primary)
            {
                await _database.DeleteTemplateAsync(template.Name);
                await LoadTemplatesAsync();
                NewTemplateButton_Click(this, new RoutedEventArgs());
            }
        }
    }

    private static Color ParseColor(string hex)
    {
        hex = hex.TrimStart('#');
        var r = Convert.ToByte(hex.Substring(0, 2), 16);
        var g = Convert.ToByte(hex.Substring(2, 2), 16);
        var b = Convert.ToByte(hex.Substring(4, 2), 16);
        return Color.FromArgb(255, r, g, b);
    }
}

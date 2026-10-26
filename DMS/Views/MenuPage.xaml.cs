using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Markup;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;
using System.Collections.ObjectModel;
using Windows.UI;
using Microsoft.UI.Text;

namespace DMS.Views;

public sealed partial class MenuPage : Page
{
    private readonly IDatabaseService _database;
    private DateTime _weekStart;
    private List<Recipe> _allRecipes = new();
    private Dictionary<string, MenuEntry> _menuEntries = new(); // key: "yyyy-MM-dd|slot"

    public MenuPage()
    {
        this.InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        _weekStart = GetWeekStart(DateTime.Today);
        Loaded += MenuPage_Loaded;
    }

    private async void MenuPage_Loaded(object sender, RoutedEventArgs e)
    {
        await LoadDataAsync();
        BuildWeekGrid();
        UpdateWeekLabel();
    }

    private async Task LoadDataAsync()
    {
        _allRecipes = await _database.GetAllRecipesAsync();
        var weekEnd = _weekStart.AddDays(6);
        var entries = await _database.GetMenuAsync(_weekStart, weekEnd);
        _menuEntries.Clear();
        foreach (var entry in entries)
        {
            _menuEntries[$"{entry.Date:yyyy-MM-dd}|{entry.Slot}"] = entry;
        }
    }

    private void BuildWeekGrid()
    {
        WeekGrid.Children.Clear();
        WeekGrid.RowDefinitions.Clear();
        WeekGrid.ColumnDefinitions.Clear();

        // Column definitions
        WeekGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(100) }); // Slot labels
        for (int i = 0; i < 7; i++)
            WeekGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        // Row definitions
        WeekGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Day headers
        for (int i = 0; i < 4; i++)
            WeekGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

        // Day headers
        var dayNames = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };
        for (int col = 0; col < 7; col++)
        {
            var dayDate = _weekStart.AddDays(col);
            var isToday = dayDate.Date == DateTime.Today;
            
            var headerBorder = new Border
            {
                Background = isToday ? new SolidColorBrush(Color.FromArgb(255, 0, 120, 215)) : new SolidColorBrush(Color.FromArgb(255, 45, 45, 45)),
                CornerRadius = new CornerRadius(4, 4, 0, 0),
                Padding = new Thickness(8),
                Margin = new Thickness(0, 0, 0, 4)
            };
            var headerPanel = new StackPanel { Spacing = 4 };
            headerPanel.Children.Add(new TextBlock 
            { 
                Text = dayNames[col], 
                FontWeight = FontWeights.SemiBold, 
                FontSize = 14, 
                HorizontalAlignment = HorizontalAlignment.Center,
                Foreground = new SolidColorBrush(Colors.White)
            });
            headerPanel.Children.Add(new TextBlock 
            { 
                Text = dayDate.ToString("MMM dd"), 
                FontSize = 12, 
                HorizontalAlignment = HorizontalAlignment.Center,
                Foreground = isToday ? new SolidColorBrush(Colors.White) : new SolidColorBrush(Color.FromArgb(255, 200, 200, 200))
            });
            headerBorder.Child = headerPanel;
            Grid.SetColumn(headerBorder, col + 1);
            Grid.SetRow(headerBorder, 0);
            WeekGrid.Children.Add(headerBorder);
        }

        // Slot labels and cells
        var slots = new[] { "Breakfast", "Lunch", "Dinner", "Snack" };
        var slotIcons = new[] { "🌅", "🌞", "🌙", "🍪" };

        for (int row = 0; row < 4; row++)
        {
            // Slot label
            var labelBorder = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(255, 35, 35, 35)),
                CornerRadius = new CornerRadius(4, 0, 0, 4),
                Padding = new Thickness(12),
                VerticalAlignment = VerticalAlignment.Center
            };
            var labelPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
            labelPanel.Children.Add(new TextBlock { Text = slotIcons[row], FontSize = 16, VerticalAlignment = VerticalAlignment.Center });
            labelPanel.Children.Add(new TextBlock { Text = slots[row], FontWeight = FontWeights.Medium, VerticalAlignment = VerticalAlignment.Center });
            labelBorder.Child = labelPanel;
            Grid.SetColumn(labelBorder, 0);
            Grid.SetRow(labelBorder, row + 1);
            WeekGrid.Children.Add(labelBorder);

            // Cells for each day
            for (int col = 0; col < 7; col++)
            {
                var dayDate = _weekStart.AddDays(col);
                var key = $"{dayDate:yyyy-MM-dd}|{slots[row]}";
                var hasEntry = _menuEntries.ContainsKey(key);
                var recipe = hasEntry ? _allRecipes.FirstOrDefault(r => r.Id == _menuEntries[key].RecipeId) : null;

                var cellBorder = new Border
                {
                    Background = hasEntry ? new SolidColorBrush(Color.FromArgb(255, 50, 50, 50)) : new SolidColorBrush(Color.FromArgb(255, 30, 30, 30)),
                    BorderBrush = new SolidColorBrush(Color.FromArgb(255, 60, 60, 60)),
                    BorderThickness = new Thickness(1),
                    CornerRadius = new CornerRadius(4),
                    Margin = new Thickness(0),
                    Tag = key
                };

                if (hasEntry && recipe != null)
                {
                    var panel = new StackPanel { Spacing = 4 };
                    panel.Children.Add(new TextBlock 
                    { 
                        Text = recipe.Name, 
                        FontWeight = FontWeights.SemiBold, 
                        FontSize = 13,
                        TextWrapping = TextWrapping.Wrap,
                        MaxLines = 2,
                        TextTrimming = TextTrimming.CharacterEllipsis
                    });
                    if (!string.IsNullOrEmpty(recipe.PortionSize))
                    {
                        panel.Children.Add(new TextBlock 
                        { 
                            Text = $"🍽️ {recipe.PortionSize}", 
                            FontSize = 11, 
                            Foreground = new SolidColorBrush(Color.FromArgb(255, 180, 180, 180))
                        });
                    }
                    if (recipe.Calories > 0)
                    {
                        panel.Children.Add(new TextBlock 
                        { 
                            Text = $"🔥 {recipe.Calories} kcal", 
                            FontSize = 11, 
                            Foreground = new SolidColorBrush(Color.FromArgb(255, 255, 180, 80))
                        });
                    }
                    if (recipe.Allergens.Count > 0)
                    {
                        panel.Children.Add(new TextBlock 
                        { 
                            Text = $"⚠️ {string.Join(", ", recipe.Allergens)}", 
                            FontSize = 10, 
                            Foreground = new SolidColorBrush(Color.FromArgb(255, 255, 150, 150)),
                            MaxLines = 1,
                            TextTrimming = TextTrimming.CharacterEllipsis
                        });
                    }
                    cellBorder.Child = panel;
                    cellBorder.Padding = new Thickness(8);
                }
                else
                {
                    var emptyPanel = new StackPanel 
                    { 
                        VerticalAlignment = VerticalAlignment.Center, 
                        HorizontalAlignment = HorizontalAlignment.Center,
                        Spacing = 4
                    };
                    emptyPanel.Children.Add(new TextBlock { Text = "➕", FontSize = 20, Foreground = new SolidColorBrush(Color.FromArgb(255, 100, 100, 100)) });
                    emptyPanel.Children.Add(new TextBlock { Text = "Add", FontSize = 12, Foreground = new SolidColorBrush(Color.FromArgb(255, 100, 100, 100)) });
                    cellBorder.Child = emptyPanel;
                }

                // Click to add/edit
                cellBorder.PointerPressed += CellBorder_PointerPressed;
                cellBorder.AllowDrop = true;
                cellBorder.DragOver += CellBorder_DragOver;
                cellBorder.Drop += CellBorder_Drop;

                Grid.SetColumn(cellBorder, col + 1);
                Grid.SetRow(cellBorder, row + 1);
                WeekGrid.Children.Add(cellBorder);
            }
        }
    }

    private void UpdateWeekLabel()
    {
        var weekEnd = _weekStart.AddDays(6);
        WeekLabel.Text = $"{_weekStart:MMM dd} - {weekEnd:MMM dd, yyyy}";
    }

    private void PrevWeekButton_Click(object sender, RoutedEventArgs e)
    {
        _weekStart = _weekStart.AddDays(-7);
        _ = RefreshWeekAsync();
    }

    private void NextWeekButton_Click(object sender, RoutedEventArgs e)
    {
        _weekStart = _weekStart.AddDays(7);
        _ = RefreshWeekAsync();
    }

    private void TodayButton_Click(object sender, RoutedEventArgs e)
    {
        _weekStart = GetWeekStart(DateTime.Today);
        _ = RefreshWeekAsync();
    }

    private async void ClearWeekButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new ContentDialog
        {
            Title = "Clear Week",
            Content = "Remove all meals from this week?",
            PrimaryButtonText = "Clear",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = this.XamlRoot
        };

        var result = await dialog.ShowAsync();
        if (result == ContentDialogResult.Primary)
        {
            var weekEnd = _weekStart.AddDays(6);
            foreach (var entry in _menuEntries.Values.ToList())
            {
                if (entry.Date >= _weekStart && entry.Date <= weekEnd)
                {
                    await _database.DeleteMenuEntryAsync(entry.Date, entry.Slot);
                }
            }
            await LoadDataAsync();
            BuildWeekGrid();
        }
    }

    private async Task RefreshWeekAsync()
    {
        await LoadDataAsync();
        BuildWeekGrid();
        UpdateWeekLabel();
    }

    private static DateTime GetWeekStart(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }

    private void SearchBox_TextChanged(AutoSuggestBox sender, AutoSuggestBoxTextChangedEventArgs args)
    {
        // Could filter recipes in drag-drop
    }

    private async void CellBorder_PointerPressed(object sender, Microsoft.UI.Xaml.Input.PointerRoutedEventArgs e)
    {
        if (sender is Border border && border.Tag is string key)
        {
            await ShowRecipeSelectionDialog(key);
        }
    }

    private void CellBorder_DragOver(object sender, DragEventArgs e)
    {
        e.AcceptedOperation = Windows.ApplicationModel.DataTransfer.DataPackageOperation.Copy;
        e.DragUIOverride.Caption = "Drop recipe here";
    }

    private async void CellBorder_Drop(object sender, DragEventArgs e)
    {
        if (sender is Border border && border.Tag is string key)
        {
            if (e.DataView.Contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.Text))
            {
                var text = await e.DataView.GetTextAsync();
                if (int.TryParse(text, out int recipeId))
                {
                    await AssignRecipeToCell(key, recipeId);
                    BuildWeekGrid();
                }
            }
        }
    }

    private async Task ShowRecipeSelectionDialog(string key)
    {
        var parts = key.Split('|');
        var date = DateTime.Parse(parts[0]);
        var slot = parts[1];
        var hasEntry = _menuEntries.ContainsKey(key);
        var currentRecipe = hasEntry ? _allRecipes.FirstOrDefault(r => r.Id == _menuEntries[key].RecipeId) : null;

        var dialog = new ContentDialog
        {
            Title = hasEntry ? $"Edit {slot} - {date:MMM dd}" : $"Add {slot} - {date:MMM dd}",
            PrimaryButtonText = hasEntry ? "Update" : "Add",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = this.XamlRoot
        };

        if (hasEntry)
        {
            dialog.SecondaryButtonText = "Remove";
        }

        var panel = new StackPanel { Spacing = 12, MaxHeight = 400 };
        
        var recipeList = new ListView
        {
            SelectionMode = ListViewSelectionMode.Single,
            MaxHeight = 300,
            ItemsSource = _allRecipes
        };
        recipeList.ItemTemplate = (DataTemplate)XamlReader.Load(@"
            <DataTemplate xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation'>
                <StackPanel Orientation='Horizontal' Spacing='12' Padding='8'>
                    <TextBlock Text='{Binding Name}' FontWeight='SemiBold' Width='200' />
                    <TextBlock Text='{Binding Category}' FontSize='12' Foreground='Gray' Width='80' />
                    <TextBlock Text='{Binding PortionSize}' FontSize='12' Width='100' />
                    <TextBlock Text='{Binding Calories}' FontSize='12' Width='80' />
                </StackPanel>
            </DataTemplate>");

        if (currentRecipe != null)
        {
            recipeList.SelectedItem = _allRecipes.FirstOrDefault(r => r.Id == currentRecipe.Id);
        }

        panel.Children.Add(new TextBlock { Text = "Select a recipe:", FontSize = 14, FontWeight = FontWeights.SemiBold });
        panel.Children.Add(recipeList);

        dialog.Content = panel;

        dialog.PrimaryButtonClick += async (s, args) =>
        {
            if (recipeList.SelectedItem is Recipe selectedRecipe)
            {
                await AssignRecipeToCell(key, selectedRecipe.Id);
                BuildWeekGrid();
            }
            else
            {
                args.Cancel = true;
            }
        };

        if (hasEntry)
        {
            dialog.SecondaryButtonClick += async (s, args) =>
            {
                await _database.DeleteMenuEntryAsync(date, slot);
                await LoadDataAsync();
                BuildWeekGrid();
            };
        }

        _ = dialog.ShowAsync();
    }

    private async Task AssignRecipeToCell(string key, int recipeId)
    {
        var parts = key.Split('|');
        var date = DateTime.Parse(parts[0]);
        var slot = parts[1];

        var entry = new MenuEntry
        {
            Date = date,
            Slot = slot,
            RecipeId = recipeId
        };

        await _database.SaveMenuEntryAsync(entry);
        await LoadDataAsync();
    }
}

// Helper for XAML parsing
internal static class XamlReader
{
    public static object Load(string xaml)
    {
        return Microsoft.UI.Xaml.Markup.XamlReader.Load(xaml);
    }
}
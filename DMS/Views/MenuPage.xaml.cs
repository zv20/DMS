using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using DMS.Models;
using DMS.Services;

namespace DMS.Views;

public sealed partial class MenuPage : Page
{
    private readonly IDatabaseService _database;
    private static readonly string[] Categories = ["soup", "main", "dessert", "other"];
    private static readonly string[] Labels = ["🥣 Soup", "🍽️ Main", "🍰 Dessert", "➕ Other"];
    private DateTime _date = DateTime.Today;
    private bool _monthly = true;
    private bool _busy;
    private List<Recipe> _recipes = [];
    private List<MenuEntry> _entries = [];

    public MenuPage()
    {
        InitializeComponent();
        _database = App.Services.GetRequiredService<IDatabaseService>();
        Loaded += async (_, _) => await RefreshAsync();
    }
    private static DateTime WeekStart(DateTime day) => day.Date.AddDays(-((7 + (int)day.DayOfWeek - 1) % 7));
    private async void Monthly_Click(object sender, RoutedEventArgs e) { _monthly = true; await RefreshAsync(); }
    private async void Weekly_Click(object sender, RoutedEventArgs e) { _monthly = false; await RefreshAsync(); }
    private async void Previous_Click(object sender, RoutedEventArgs e) { _date = _monthly ? _date.AddMonths(-1) : _date.AddDays(-7); await RefreshAsync(); }
    private async void Next_Click(object sender, RoutedEventArgs e) { _date = _monthly ? _date.AddMonths(1) : _date.AddDays(7); await RefreshAsync(); }
    private async void Today_Click(object sender, RoutedEventArgs e) { _date = DateTime.Today; await RefreshAsync(); }

    private async Task RefreshAsync()
    {
        if (_busy) return;
        _busy = true;
        try
        {
            _recipes = await _database.GetAllRecipesAsync();
            var first = _monthly ? new DateTime(_date.Year, _date.Month, 1) : WeekStart(_date);
            var start = WeekStart(first);
            var end = _monthly ? first.AddMonths(1).AddDays(-1) : start.AddDays(6);
            _entries = await _database.GetMenuAsync(start, end);
            PeriodLabel.Text = _monthly ? first.ToString("MMMM yyyy") : $"{start:dd MMM} – {end:dd MMM yyyy}";
            CalendarGrid.Children.Clear();
            CalendarGrid.RowDefinitions.Clear();
            CalendarGrid.ColumnDefinitions.Clear();
            for (var i = 0; i < 7; i++) CalendarGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star), MinWidth = 155 });
            var days = _monthly ? ((end - start).Days / 7 + 1) * 7 : 7;
            for (var row = 0; row < days / 7; row++) CalendarGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            for (var i = 0; i < days; i++)
            {
                var day = start.AddDays(i);
                var panel = new StackPanel { Spacing = 8 };
                panel.Children.Add(new TextBlock { Text = day.ToString("ddd dd MMM"), FontSize = 14 });
                if (_monthly)
                {
                    var names = _entries.Where(e => e.Date.Date == day.Date).Select(e => _recipes.FirstOrDefault(r => r.Id == e.RecipeId)?.Name).Where(n => n != null);
                    var summary = string.Join("\n", names);
                    var button = new Button { Content = new TextBlock { Text = summary.Length > 0 ? summary : "＋ Plan menu", TextWrapping = TextWrapping.Wrap }, HorizontalAlignment = HorizontalAlignment.Stretch, MinHeight = 80 };
                    button.Click += async (_, _) => { _date = day; _monthly = false; await RefreshAsync(); };
                    panel.Children.Add(button);
                }
                else for (var slot = 0; slot < 4; slot++) panel.Children.Add(await CreateSlotAsync(day, slot));
                var border = new Border { Child = panel, Padding = new Thickness(8), BorderThickness = new Thickness(1), BorderBrush = (Microsoft.UI.Xaml.Media.Brush)Application.Current.Resources["SystemControlForegroundListLowBrush"], CornerRadius = new CornerRadius(4), Opacity = _monthly && day.Month != first.Month ? 0.5 : 1 };
                Grid.SetColumn(border, i % 7);
                Grid.SetRow(border, i / 7);
                CalendarGrid.Children.Add(border);
            }
        }
        catch (Exception ex) { PeriodLabel.Text = $"Unable to load menu: {ex.Message}"; }
        finally { _busy = false; }
    }

    private async Task<StackPanel> CreateSlotAsync(DateTime day, int index)
    {
        var slot = $"slot{index + 1}";
        string[] oldNames = ["Breakfast", "Lunch", "Dinner", "Snack"];
        var entry = _entries.FirstOrDefault(e => e.Date.Date == day.Date && e.Slot == slot)
            ?? _entries.FirstOrDefault(e => e.Date.Date == day.Date && (e.Slot.Equals(Categories[index], StringComparison.OrdinalIgnoreCase) || e.Slot == oldNames[index]));
        var current = _recipes.FirstOrDefault(r => r.Id == entry?.RecipeId);
        var category = await _database.GetMenuCategoryAsync(day, slot) ?? (current != null && Categories.Contains(current.Category) ? current.Category : Categories[index]);
        var panel = new StackPanel { Spacing = 4, Margin = new Thickness(0, 4, 0, 8) };
        var select = new ComboBox { ItemsSource = Labels, SelectedIndex = Array.IndexOf(Categories, category), HorizontalAlignment = HorizontalAlignment.Stretch };
        var search = new AutoSuggestBox { PlaceholderText = "Select recipe…", Text = current?.Name ?? "", FontSize = 13, DisplayMemberPath = "Name", TextMemberPath = "Name" };
        var status = new TextBlock { FontSize = 11, TextWrapping = TextWrapping.Wrap };
        bool saving = false;
        async Task SaveAsync(Recipe? recipe)
        {
            if (saving) return;
            saving = true;
            select.IsEnabled = search.IsEnabled = false;
            try
            {
                await _database.SaveMenuCategoryAsync(day, slot, category);
                if (recipe == null)
                {
                    if (entry != null) await _database.DeleteMenuEntryAsync(day, entry.Slot);
                    entry = null;
                }
                else
                {
                    var replacement = new MenuEntry { Date = day, Slot = slot, RecipeId = recipe.Id };
                    await _database.SaveMenuEntryAsync(replacement);
                    if (entry != null && entry.Slot != slot) await _database.DeleteMenuEntryAsync(day, entry.Slot);
                    entry = replacement;
                }
                status.Text = "✓ Saved";
            }
            catch (Exception ex) { status.Text = $"Save failed: {ex.Message}"; }
            finally { saving = false; select.IsEnabled = search.IsEnabled = true; }
        }
        void Suggest() => search.ItemsSource = _recipes.Where(r => r.Category.Equals(category, StringComparison.OrdinalIgnoreCase) && r.Name.Contains(search.Text.Trim(), StringComparison.OrdinalIgnoreCase)).OrderBy(r => r.Name, StringComparer.CurrentCultureIgnoreCase).ToList();
        search.GotFocus += (_, _) => Suggest();
        search.TextChanged += async (_, args) =>
        {
            if (args.Reason != AutoSuggestionBoxTextChangeReason.UserInput) return;
            Suggest();
            if (string.IsNullOrWhiteSpace(search.Text)) await SaveAsync(null);
        };
        search.SuggestionChosen += async (_, args) => { if (args.SelectedItem is Recipe recipe) await SaveAsync(recipe); };
        select.SelectionChanged += async (_, _) =>
        {
            if (select.SelectedIndex < 0) return;
            category = Categories[select.SelectedIndex];
            search.Text = "";
            await SaveAsync(null);
            Suggest();
        };
        panel.Children.Add(select);
        panel.Children.Add(search);
        var clear = new Button { Content = "Clear", FontSize = 11, Padding = new Thickness(6, 2, 6, 2) };
        clear.Click += async (_, _) => { search.Text = ""; await SaveAsync(null); };
        panel.Children.Add(clear);
        panel.Children.Add(status);
        return panel;
    }
}

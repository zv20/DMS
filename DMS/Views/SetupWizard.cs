using DMS.Models;
using DMS.Services;
using Microsoft.Extensions.Logging;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;

namespace DMS.Views;

internal static class SetupWizard
{
    public static async Task<bool> ShowAsync(XamlRoot root, DatabaseService database)
    {
        if (root.Content is not Grid host) throw new InvalidOperationException("Setup requires the main window.");
        var settings = await database.GetSettingsAsync() ?? new AppSettings();
        var originalLanguage = settings.Language;
        var originalAccent = settings.AccentColor;
        var originalMeals = settings.MealsPerDay;
        var completed = new TaskCompletionSource<bool>();
        var step = 0;
        var overlay = new Grid { Background = new SolidColorBrush(Microsoft.UI.Colors.White), RequestedTheme = ElementTheme.Light };
        Grid.SetRow(overlay, 1);
        var columns = new Grid();
        columns.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(380) });
        columns.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        var sidebar = new StackPanel { Spacing = 16, Padding = new Thickness(24, 28, 24, 28) };
        var previewHost = new Grid { IsHitTestVisible = false };
        Grid.SetColumn(previewHost, 1);
        var sidebarCard = new Border
        {
            Margin = new Thickness(20),
            Background = new SolidColorBrush(Microsoft.UI.ColorHelper.FromArgb(255, 248, 248, 248)),
            BorderBrush = new SolidColorBrush(Microsoft.UI.ColorHelper.FromArgb(255, 229, 229, 229)),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(12),
            Child = new ScrollViewer { Content = sidebar, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled }
        };
        columns.Children.Add(sidebarCard);
        var previewFrame = new Border { Child = previewHost, Margin = new Thickness(0, 20, 20, 20), BorderBrush = new SolidColorBrush(Microsoft.UI.ColorHelper.FromArgb(255, 229, 229, 229)), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(12) };
        Grid.SetColumn(previewFrame, 1);
        columns.Children.Add(previewFrame);
        overlay.Children.Add(columns);
        host.Children.Add(overlay);

        string T(string english, string bulgarian) => settings.Language == "en" ? english : bulgarian;
        void Preview()
        {
            Localization.Apply(settings.Language);
            AppearanceService.ApplyAccent(settings.AccentColor);
            var page = new MenuPage();
            page.SetSetupPreview(settings, monthly: step == 4);
            var preview = new SetupPreview(page)
            {
                RequestedTheme = settings.Theme switch
                {
                    "dark" => ElementTheme.Dark,
                    "system" when Application.Current.RequestedTheme == ApplicationTheme.Dark => ElementTheme.Dark,
                    _ => ElementTheme.Light
                }
            };
            previewHost.Children.Clear();
            previewHost.Children.Add(preview);
        }
        void Render()
        {
            sidebar.Children.Clear();
            sidebar.Children.Add(new TextBlock { Text = "DMS", FontSize = 18, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, Foreground = (Brush)Application.Current.Resources["DmsAccentBrush"] });
            sidebar.Children.Add(new TextBlock { Text = T("Set up your kitchen", "Настройте вашата кухня"), FontSize = 25, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap });
            sidebar.Children.Add(new TextBlock { Text = T($"Step {step + 1} of 5", $"Стъпка {step + 1} от 5"), Opacity = 0.7 });
            if (step == 0)
            {
                sidebar.Children.Add(new TextBlock { Text = T("Language", "Език") });
                var choice = new ComboBox { ItemsSource = new[] { "Български", "English" }, SelectedIndex = settings.Language == "en" ? 1 : 0 };
                choice.SelectionChanged += (_, _) => { settings.Language = choice.SelectedIndex == 1 ? "en" : "bg"; Render(); };
                sidebar.Children.Add(choice);
            }
            else if (step == 1)
            {
                sidebar.Children.Add(new TextBlock { Text = T("Appearance", "Изглед") });
                var themes = new[] { "light", "dark", "system" };
                var accents = new[] { "orange", "blue", "green", "purple", "red", "teal" };
                var theme = new ComboBox { Header = T("Theme", "Тема"), ItemsSource = new[] { T("Light", "Светла"), T("Dark", "Тъмна"), T("System", "Системна") }, SelectedIndex = Math.Max(0, Array.IndexOf(themes, settings.Theme)), HorizontalAlignment = HorizontalAlignment.Stretch };
                var accent = new ComboBox { Header = T("Accent color", "Основен цвят"), ItemsSource = new[] { T("Orange", "Оранжев"), T("Blue", "Син"), T("Green", "Зелен"), T("Purple", "Лилав"), T("Red", "Червен"), T("Teal", "Тюркоазен") }, SelectedIndex = Math.Max(0, Array.IndexOf(accents, settings.AccentColor)), HorizontalAlignment = HorizontalAlignment.Stretch };
                theme.SelectionChanged += (_, _) => { settings.Theme = themes[theme.SelectedIndex]; Preview(); };
                accent.SelectionChanged += (_, _) => { settings.AccentColor = accents[accent.SelectedIndex]; Preview(); };
                sidebar.Children.Add(theme); sidebar.Children.Add(accent);
            }
            else if (step == 2)
            {
                sidebar.Children.Add(new TextBlock { Text = T("Meals per day", "Хранения на ден") });
                var count = new NumberBox { Minimum = 1, Maximum = 100, Value = settings.MealsPerDay, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
                count.ValueChanged += (_, _) => { if (double.IsFinite(count.Value) && count.Value >= 1 && count.Value <= 100 && count.Value == Math.Floor(count.Value)) { settings.MealsPerDay = (int)count.Value; Preview(); } };
                sidebar.Children.Add(count);
                sidebar.Children.Add(new TextBlock { Text = T("Changing this clears saved menu plans. Back up your plans first.", "Промяната изтрива запазените менюта. Първо направете резервно копие."), TextWrapping = TextWrapping.Wrap });
            }
            else if (step == 3)
            {
                sidebar.Children.Add(new TextBlock { Text = T("Meal categories", "Категории за хранене") });
                foreach (var category in settings.MealCategories.ToArray())
                {
                    var row = new Grid { ColumnSpacing = 8 };
                    row.ColumnDefinitions.Add(new ColumnDefinition()); row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
                    var input = new TextBox { Text = string.IsNullOrWhiteSpace(category.Name) ? Localization.Category(category.Id) : category.Name };
                    input.TextChanged += (_, _) => category.Name = input.Text;
                    var remove = new Button { Content = "×" };
                    remove.Click += (_, _) => { if (settings.MealCategories.Count > 1) { settings.MealCategories.Remove(category); Render(); } };
                    row.Children.Add(input); Grid.SetColumn(remove, 1); row.Children.Add(remove); sidebar.Children.Add(row);
                }
                var add = new Button { Content = T("Add category", "Добави категория") };
                add.Click += (_, _) => { settings.MealCategories.Add(new MealCategory { Id = Guid.NewGuid().ToString("N") }); Render(); };
                sidebar.Children.Add(add);
            }
            else
            {
                var weekends = new ToggleSwitch { Header = T("Include weekends", "Включи почивните дни"), IsOn = settings.WeekendPlanningEnabled };
                weekends.Toggled += (_, _) => { settings.WeekendPlanningEnabled = weekends.IsOn; Preview(); };
                sidebar.Children.Add(weekends);
            }
            var status = new TextBlock { TextWrapping = TextWrapping.Wrap };
            sidebar.Children.Add(status);
            var controls = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
            var cancel = new Button { Content = T("Cancel", "Отказ") };
            cancel.Click += (_, _) => completed.TrySetResult(false);
            controls.Children.Add(cancel);
            if (step > 0)
            {
                var back = new Button { Content = T("Back", "Назад") };
                back.Click += (_, _) => { step--; Render(); };
                controls.Children.Add(back);
            }
            var next = new Button { Content = step == 4 ? T("Finish", "Готово") : T("Next", "Напред"), Style = (Style)Application.Current.Resources["AccentButtonStyle"] };
            next.Click += async (_, _) =>
            {
                if (step == 3)
                {
                    var names = settings.MealCategories.Select(c => string.IsNullOrWhiteSpace(c.Name) ? (c.Id.Length == 32 ? "" : Localization.Category(c.Id)) : c.Name.Trim()).ToArray();
                    if (names.Any(string.IsNullOrWhiteSpace) || names.Distinct(StringComparer.CurrentCultureIgnoreCase).Count() != names.Length) { status.Text = Localization.Get("MealSettingsInvalid"); return; }
                }
                if (step < 4) { step++; Render(); return; }
                next.IsEnabled = false;
                try
                {
                    var clear = settings.MealsPerDay != originalMeals;
                    if (clear && !await EditorDialogs.ConfirmAsync(root, T("Clear saved plans?", "Изтриване на запазените менюта?"), T("Changing meals per day deletes all saved menu plans. Back up first. Recipes and ingredients are kept.", "Промяната на храненията на ден изтрива всички запазени менюта. Първо направете резервно копие. Рецептите и съставките се запазват."), "String_Text_Delete_f6fdbe")) return;
                    await database.CompleteSetupAsync(settings, clear);
                    completed.TrySetResult(true);
                }
                catch (Exception ex) { App.Logger.LogError(ex, "Could not complete setup"); status.Text = Localization.Get("DataSaveFailed"); }
                finally { next.IsEnabled = true; }
            };
            controls.Children.Add(next); sidebar.Children.Add(controls);
            Preview();
        }
        try
        {
            Render();
            return await completed.Task;
        }
        finally
        {
            host.Children.Remove(overlay);
            if (!completed.Task.IsCompletedSuccessfully || !completed.Task.Result)
            {
                Localization.Apply(originalLanguage);
                AppearanceService.ApplyAccent(originalAccent);
            }
        }
    }
}

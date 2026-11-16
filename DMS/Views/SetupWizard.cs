using DMS.Models;
using DMS.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Windows.UI;

namespace DMS.Views;

internal static class SetupWizard
{
    public static async Task<bool> ShowAsync(XamlRoot root, DatabaseService database)
    {
        var settings = await database.GetSettingsAsync() ?? new AppSettings();
        var originalMeals = settings.MealsPerDay;
        var language = settings.Language;
        var theme = settings.Theme;
        var accent = settings.AccentColor;
        var weekend = settings.WeekendPlanningEnabled;
        var meals = settings.MealsPerDay;
        var categories = settings.MealCategories.Select(c => new MealCategory { Id = c.Id, Name = c.Name }).ToList();
        var step = 0;
        string T(string en, string bg) => language == "en" ? en : bg;
        while (step < 5)
        {
            var content = new StackPanel { Spacing = 12, MinWidth = 320 };
            var dialog = new ContentDialog { XamlRoot = root, Title = T($"Setup · {step + 1} of 5", $"Настройка · {step + 1} от 5"), Content = content,
                PrimaryButtonText = step == 4 ? T("Finish", "Готово") : T("Next", "Напред"),
                SecondaryButtonText = step == 0 ? "" : T("Back", "Назад"),
                CloseButtonText = T("Cancel", "Отказ"), DefaultButton = ContentDialogButton.Primary };
            if (step == 0)
            {
                content.Children.Add(new TextBlock { Text = T("Choose your language", "Изберете език"), TextWrapping = TextWrapping.Wrap });
                var choice = new ComboBox { ItemsSource = new[] { "Български", "English" }, SelectedIndex = language == "en" ? 1 : 0 };
                var preview = new TextBlock { TextWrapping = TextWrapping.Wrap };
                void Update() { language = choice.SelectedIndex == 1 ? "en" : "bg"; preview.Text = T("Menu planning  ·  Recipes  ·  Settings", "Планиране на меню  ·  Рецепти  ·  Настройки"); }
                choice.SelectionChanged += (_, _) => Update(); Update(); content.Children.Add(choice); content.Children.Add(preview);
            }
            else if (step == 1)
            {
                content.Children.Add(new TextBlock { Text = T("Choose appearance and accent", "Изберете изглед и основен цвят") });
                var themes = new[] { "light", "dark", "system" }; var accents = new[] { "orange", "blue", "green", "purple", "red", "teal" };
                var themeChoice = new ComboBox { ItemsSource = themes, SelectedIndex = Math.Max(0, Array.IndexOf(themes, theme)) };
                var accentChoice = new ComboBox { ItemsSource = accents, SelectedIndex = Math.Max(0, Array.IndexOf(accents, accent)) };
                var preview = new Button { Content = T("Menu planning", "Планиране на меню"), Foreground = new SolidColorBrush(Color.FromArgb(255, 255, 255, 255)) };
                var previewFrame = new Border { Padding = new Thickness(12), Child = preview };
                void Update() { theme = themes[themeChoice.SelectedIndex]; accent = accents[accentChoice.SelectedIndex]; previewFrame.Background = new SolidColorBrush(theme == "dark" ? Color.FromArgb(255, 50, 50, 50) : Color.FromArgb(255, 255, 255, 255)); preview.Background = new SolidColorBrush(accent switch { "blue" => Color.FromArgb(255, 0, 103, 192), "green" => Color.FromArgb(255, 16, 124, 16), "purple" => Color.FromArgb(255, 117, 49, 166), "red" => Color.FromArgb(255, 196, 43, 28), "teal" => Color.FromArgb(255, 0, 122, 120), _ => Color.FromArgb(255, 194, 88, 0) }); }
                themeChoice.SelectionChanged += (_, _) => Update(); accentChoice.SelectionChanged += (_, _) => Update(); Update();
                content.Children.Add(themeChoice); content.Children.Add(accentChoice); content.Children.Add(previewFrame);
            }
            else if (step == 2)
            {
                content.Children.Add(new TextBlock { Text = T("Meals per day", "Хранения на ден") });
                var count = new NumberBox { Minimum = 1, Maximum = 100, Value = meals, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
                var preview = new StackPanel { Spacing = 4 };
                void Update() { if (!double.IsFinite(count.Value) || count.Value < 1 || count.Value > 100 || count.Value != Math.Floor(count.Value)) return; meals = (int)count.Value; preview.Children.Clear(); for (var i = 1; i <= Math.Min(meals, 5); i++) preview.Children.Add(new TextBlock { Text = T($"Meal {i}  —  Select recipe", $"Хранене {i}  —  Изберете рецепта") }); if (meals > 5) preview.Children.Add(new TextBlock { Text = "…" }); }
                count.ValueChanged += (_, _) => Update(); Update(); content.Children.Add(count); content.Children.Add(preview);
                content.Children.Add(new TextBlock { Text = T("Changing this later clears saved menu plans. Back up your plans first.", "Промяната по-късно изтрива запазените менюта. Първо направете резервно копие."), TextWrapping = TextWrapping.Wrap });
            }
            else if (step == 3)
            {
                content.Children.Add(new TextBlock { Text = T("Meal categories", "Категории за хранене") });
                var rows = new StackPanel { Spacing = 6 };
                void Rebuild() { rows.Children.Clear(); foreach (var category in categories.ToArray()) { var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 }; var input = new TextBox { Width = 230, Text = string.IsNullOrWhiteSpace(category.Name) ? Localization.Category(category.Id) : category.Name }; input.TextChanged += (_, _) => category.Name = input.Text; var remove = new Button { Content = "×" }; remove.Click += (_, _) => { if (categories.Count > 1) { categories.Remove(category); Rebuild(); } }; row.Children.Add(input); row.Children.Add(remove); rows.Children.Add(row); } }
                Rebuild(); var add = new Button { Content = T("Add category", "Добави категория") }; add.Click += (_, _) => { categories.Add(new MealCategory { Id = Guid.NewGuid().ToString("N") }); Rebuild(); };
                content.Children.Add(new ScrollViewer { Content = rows, MaxHeight = 230 }); content.Children.Add(add);
            }
            else
            {
                var toggle = new ToggleSwitch { Header = T("Include weekends", "Включи почивните дни"), IsOn = weekend };
                var preview = new TextBlock { FontFamily = new FontFamily("Consolas"), TextWrapping = TextWrapping.Wrap };
                void Update() { weekend = toggle.IsOn; preview.Text = weekend ? T("Mon Tue Wed Thu Fri Sat Sun\n 1   2   3   4   5   6   7\n 8   9  10  11  12  13  14", "Пн  Вт  Ср  Чт  Пт  Сб  Нд\n 1   2   3   4   5   6   7\n 8   9  10  11  12  13  14") : T("Mon Tue Wed Thu Fri\n 1   2   3   4   5\n 8   9  10  11  12", "Пн  Вт  Ср  Чт  Пт\n 1   2   3   4   5\n 8   9  10  11  12"); }
                toggle.Toggled += (_, _) => Update(); Update(); content.Children.Add(toggle); content.Children.Add(preview);
            }
            var result = await dialog.ShowAsync();
            if (result == ContentDialogResult.None) return false;
            if (result == ContentDialogResult.Secondary) { step--; continue; }
            if (step == 3 && (categories.Any(c => string.IsNullOrWhiteSpace(c.Name) && c.Id.Length == 32) || categories.Select(c => string.IsNullOrWhiteSpace(c.Name) ? Localization.Category(c.Id) : c.Name.Trim()).Distinct(StringComparer.CurrentCultureIgnoreCase).Count() != categories.Count)) continue;
            step++;
        }
        var clearPlans = meals != originalMeals;
        if (clearPlans && !await EditorDialogs.ConfirmAsync(root, T("Clear saved plans?", "Изтриване на запазените менюта?"),
            T("Changing meals per day deletes all saved menu plans. Back up your plans first. Recipes and ingredients are kept.", "Промяната на храненията на ден изтрива всички запазени менюта. Първо направете резервно копие. Рецептите и съставките се запазват."), "String_Text_Delete_f6fdbe")) return false;
        settings.Language = language; settings.Theme = theme; settings.AccentColor = accent; settings.MealsPerDay = meals; settings.MealCategories = categories; settings.WeekendPlanningEnabled = weekend;
        await database.CompleteSetupAsync(settings, clearPlans);
        return true;
    }
}

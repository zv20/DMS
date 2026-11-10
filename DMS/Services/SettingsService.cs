using DMS.Models;

namespace DMS.Services;

public sealed class SettingsService
{
    private const string DefaultLanguage = "bg";
    private string _language = DefaultLanguage;
    private readonly DatabaseService _database;

    public SettingsService(DatabaseService database)
    {
        _database = database;
    }

    public string GetLanguage() => _language;

    public async Task SetLanguageAsync(string language)
    {
        var selected = language is "bg" or "en" ? language : DefaultLanguage;
        var settings = await _database.GetSettingsAsync() ?? new AppSettings();
        settings.Language = selected;
        await SaveAsync(settings);
        _language = selected;
    }

    public async Task<AppSettings> LoadAsync()
    {
        var settings = await _database.GetSettingsAsync() ?? new AppSettings();
        _language = settings.Language is "bg" or "en" ? settings.Language : DefaultLanguage;
        return settings;
    }

    public Task SaveAsync(AppSettings settings) => _database.SaveSettingsAsync(settings);
}

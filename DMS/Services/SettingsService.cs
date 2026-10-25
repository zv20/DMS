using DMS.Models;

namespace DMS.Services;

public interface ISettingsService
{
    string GetLanguage();
    void SetLanguage(string language);
    Task<AppSettings> LoadAsync();
    Task SaveAsync(AppSettings settings);
}

public sealed class SettingsService : ISettingsService
{
    private const string DefaultLanguage = "bg";
    private string _language = DefaultLanguage;
    private readonly IDatabaseService _database;

    public SettingsService(IDatabaseService database)
    {
        _database = database;
    }

    public string GetLanguage() => _language;

    public void SetLanguage(string language)
    {
        _language = language is "bg" or "en" ? language : DefaultLanguage;
        _ = SaveAsync(new AppSettings { Language = _language });
    }

    public async Task<AppSettings> LoadAsync()
    {
        var settings = await _database.GetSettingsAsync() ?? new AppSettings();
        _language = settings.Language is "bg" or "en" ? settings.Language : DefaultLanguage;
        return settings;
    }

    public Task SaveAsync(AppSettings settings) => _database.SaveSettingsAsync(settings);
}
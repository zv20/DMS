using DMS.Services;
using Microsoft.Extensions.Logging;
using Xunit;

namespace DMS.Tests;

public sealed class LocalLogStoreTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "DMS.Log.Tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public void ProviderWritesDetailedExceptionsAndCanReadAfterReopening()
    {
        var store = new LocalLogStore(_folder);
        using (var provider = new LocalLogProvider(store))
        {
            var logger = provider.CreateLogger("RecipeEditor");
            logger.LogError(new InvalidOperationException("Database locked"), "Could not save recipe");
        }
        var text = new LocalLogStore(_folder).ReadRecent();
        Assert.Contains("RecipeEditor", text);
        Assert.Contains("Could not save recipe", text);
        Assert.Contains("InvalidOperationException: Database locked", text);
    }

    [Fact]
    public void RotationAndOversizedEntriesRemainBoundedAndRecent()
    {
        const int maxBytes = 4096;
        var store = new LocalLogStore(_folder, maxBytes);
        for (var i = 0; i < 10; i++) store.Write(LogLevel.Error, "Test", $"{i}:" + new string('x', 1000));
        store.Write(LogLevel.Error, "Test", "last:" + new string('д', 10000));
        Assert.True(new FileInfo(store.FilePath).Length <= maxBytes);
        Assert.True(new FileInfo(store.FilePath + ".1").Length <= maxBytes);
        Assert.Contains("last:", store.ReadRecent());
        Assert.Contains("[entry truncated]", store.ReadRecent());
    }

    [Fact]
    public void LoggingFailureDoesNotThrowWhenDestinationIsNotADirectory()
    {
        Directory.CreateDirectory(_folder);
        var file = Path.Combine(_folder, "not-a-directory");
        File.WriteAllText(file, "file");
        var store = new LocalLogStore(file);
        store.Write(LogLevel.Error, "Test", "error");
        Assert.NotNull(store.LastWriteFailure);
    }

    [Fact]
    public void ConcurrentWritesKeepEveryCompleteEntry()
    {
        var store = new LocalLogStore(_folder);
        Parallel.For(0, 100, index => store.Write(LogLevel.Warning, "Test", $"entry-{index:D3}"));
        var text = store.ReadRecent();
        for (var i = 0; i < 100; i++) Assert.Contains($"entry-{i:D3}", text);
    }

    [Fact]
    public void FiltersKeepTheRequestedSeverityAndAttachedExceptionDetails()
    {
        var store = new LocalLogStore(_folder);
        store.Write(LogLevel.Information, "Test", "regular");
        store.Write(LogLevel.Warning, "Test", "warning");
        store.Write(LogLevel.Error, "Test", "error", new InvalidOperationException("details"));
        store.Write(LogLevel.Critical, "Test", "critical");

        var warnings = store.ReadRecent(filter: DiagnosticLogFilter.Warning);
        var errors = store.ReadRecent(filter: DiagnosticLogFilter.Error);
        Assert.Contains("warning", warnings);
        Assert.DoesNotContain("regular", warnings);
        Assert.Contains("error", errors);
        Assert.Contains("critical", errors);
        Assert.Contains("InvalidOperationException: details", errors);
        Assert.DoesNotContain("warning", errors);
        var selected = store.ReadRecent(filter: DiagnosticLogFilter.Warning | DiagnosticLogFilter.Error);
        Assert.Contains("warning", selected);
        Assert.Contains("critical", selected);
        Assert.DoesNotContain("regular", selected);
        Assert.Empty(store.ReadRecent(filter: DiagnosticLogFilter.None));
    }

    [Fact]
    public void ClearRemovesCurrentAndRotatedLogs()
    {
        var store = new LocalLogStore(_folder, 1024);
        store.Write(LogLevel.Information, "Test", new string('x', 900));
        store.Write(LogLevel.Information, "Test", new string('y', 900));
        store.Clear();
        Assert.False(File.Exists(store.FilePath));
        Assert.False(File.Exists(store.FilePath + ".1"));
        Assert.Empty(store.ReadRecent());
    }

    [Fact]
    public void WarningsAndErrorsAreAlsoKeptInSeparateLog()
    {
        var store = new LocalLogStore(_folder);
        store.Write(LogLevel.Information, "Test", "opened settings");
        store.Write(LogLevel.Error, "Test", "save failed");
        Assert.Contains("opened settings", store.ReadRecent());
        Assert.Contains("save failed", store.ReadRecent());
        var errors = store.ReadRecent(errorsOnly: true);
        Assert.Contains("save failed", errors);
        Assert.DoesNotContain("opened settings", errors);
        store.Clear();
        Assert.False(File.Exists(store.ErrorFilePath));
    }

    [Fact]
    public void RetentionPreservesRecentContextAndKeepsErrorsLonger()
    {
        var store = new LocalLogStore(_folder);
        Directory.CreateDirectory(_folder);
        var old = DateTimeOffset.Now.AddDays(-20).ToString("yyyy-MM-dd HH:mm:ss zzz");
        var expired = DateTimeOffset.Now.AddDays(-40).ToString("yyyy-MM-dd HH:mm:ss zzz");
        var recent = DateTimeOffset.Now.AddDays(-1).ToString("yyyy-MM-dd HH:mm:ss zzz");
        var entries = $"[{expired}] Error Test: expired\nexception detail\n[{old}] Error Test: old\nold detail\n[{recent}] Information Test: recent\n";
        File.WriteAllText(store.FilePath, entries);
        File.WriteAllText(store.ErrorFilePath, entries);
        store.SetRetentionDays(30);
        Assert.DoesNotContain("old detail", store.ReadRecent());
        Assert.Contains("recent", store.ReadRecent());
        var errors = store.ReadRecent(errorsOnly: true);
        Assert.DoesNotContain("expired", errors);
        Assert.Contains("old detail", errors);
        store.SetRetentionDays(7);
        Assert.DoesNotContain("old detail", store.ReadRecent(errorsOnly: true));
    }

    [Fact]
    public void ExistingWarningsAreCopiedBeforeActivityRetentionIsApplied()
    {
        var store = new LocalLogStore(_folder);
        Directory.CreateDirectory(_folder);
        var old = DateTimeOffset.Now.AddDays(-20).ToString("yyyy-MM-dd HH:mm:ss zzz");
        File.WriteAllText(store.FilePath, $"[{old}] Error Test: legacy error\nlegacy details\n");
        store.SetRetentionDays(30);
        Assert.DoesNotContain("legacy error", store.ReadRecent());
        Assert.Contains("legacy details", store.ReadRecent(errorsOnly: true));
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}

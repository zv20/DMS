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
    }

    public void Dispose() { if (Directory.Exists(_folder)) Directory.Delete(_folder, true); }
}

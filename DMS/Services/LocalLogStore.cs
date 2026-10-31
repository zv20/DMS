using System.Diagnostics;
using System.IO;
using System.Text;
using Microsoft.Extensions.Logging;

namespace DMS.Services;

/// <summary>Bounded, local-only diagnostic log. Failure to log never breaks app work.</summary>
public sealed class LocalLogStore
{
    private const long DefaultMaxBytes = 1024 * 1024;
    private readonly object _gate = new();
    private readonly long _maxBytes;
    public string DirectoryPath { get; }
    public string FilePath => Path.Combine(DirectoryPath, "dms.log");
    public string? LastWriteFailure { get; private set; }

    public LocalLogStore(string directoryPath, long maxBytes = DefaultMaxBytes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(directoryPath);
        if (maxBytes < 1024) throw new ArgumentOutOfRangeException(nameof(maxBytes));
        DirectoryPath = directoryPath;
        _maxBytes = maxBytes;
    }

    public static LocalLogStore CreateDefault() => new(Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DMS", "Logs"));

    public void Write(LogLevel level, string category, string message, Exception? exception = null)
    {
        try
        {
            var entry = $"[{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss zzz}] {level} {category}: {message}" +
                (exception == null ? "" : Environment.NewLine + exception) + Environment.NewLine;
            var bytes = Encoding.UTF8.GetBytes(entry);
            if (bytes.LongLength > _maxBytes)
            {
                var usable = (int)Math.Min(_maxBytes - 32, int.MaxValue);
                bytes = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(bytes, 0, usable) + Environment.NewLine + "[entry truncated]" + Environment.NewLine);
            }
            lock (_gate)
            {
                Directory.CreateDirectory(DirectoryPath);
                var file = new FileInfo(FilePath);
                if (file.Exists && file.Length + bytes.LongLength > _maxBytes)
                    File.Move(FilePath, FilePath + ".1", overwrite: true);
                using var stream = new FileStream(FilePath, FileMode.Append, FileAccess.Write, FileShare.ReadWrite);
                stream.Write(bytes);
                LastWriteFailure = null;
            }
        }
        catch (Exception ex)
        {
            LastWriteFailure = ex.Message;
            Debug.WriteLine($"DMS could not write its local diagnostic log: {ex.Message}");
        }
    }

    /// <summary>Reads the latest entries; older entries remain in the local files.</summary>
    public string ReadRecent(int maxCharacters = 100_000)
    {
        if (maxCharacters < 1) throw new ArgumentOutOfRangeException(nameof(maxCharacters));
        lock (_gate)
        {
            var text = new StringBuilder();
            foreach (var file in new[] { FilePath + ".1", FilePath })
            {
                if (!File.Exists(file)) continue;
                using var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                // Bound the read as well as the files we write; a log changed by
                // another process should not make the Settings page load it all.
                var maxBytesToRead = (long)maxCharacters * 4 + 4;
                if (stream.Length > maxBytesToRead) stream.Seek(-maxBytesToRead, SeekOrigin.End);
                using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
                text.Append(reader.ReadToEnd());
            }
            var result = text.ToString();
            return result.Length <= maxCharacters ? result : result[^maxCharacters..];
        }
    }
}

/// <summary>Connects existing Microsoft.Extensions.Logging calls to the local log.</summary>
public sealed class LocalLogProvider(LocalLogStore store) : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName) => new LocalLogger(store, categoryName);
    public void Dispose() { }

    private sealed class LocalLogger(LocalLogStore store, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => level >= LogLevel.Information && level != LogLevel.None;
        public void Log<TState>(LogLevel level, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(level)) return;
            try { store.Write(level, category, formatter(state, exception), exception); }
            catch (Exception ex) { Debug.WriteLine($"DMS could not format a diagnostic entry: {ex.Message}"); }
        }
    }
}

using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using Microsoft.Extensions.Logging;

namespace DMS.Services;

[Flags]
public enum DiagnosticLogFilter { None = 0, Information = 1, Warning = 2, Error = 4, All = Information | Warning | Error }

/// <summary>Bounded, local-only diagnostic log. Failure to log never breaks app work.</summary>
public sealed class LocalLogStore
{
    private const long DefaultMaxBytes = 5 * 1024 * 1024 / 2;
    private readonly long _errorMaxBytes;
    private int _retentionDays = 30;
    private DateOnly? _lastCleanup;
    private bool _retentionConfigured;
    private readonly object _gate = new();
    private readonly long _maxBytes;
    public string DirectoryPath { get; }
    public string FilePath => Path.Combine(DirectoryPath, "dms.log");
    public int RetentionDays => _retentionDays;
    public string ErrorFilePath => Path.Combine(DirectoryPath, "errors.log");
    public string? LastWriteFailure { get; private set; }

    public LocalLogStore(string directoryPath, long maxBytes = DefaultMaxBytes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(directoryPath);
        if (maxBytes < 1024) throw new ArgumentOutOfRangeException(nameof(maxBytes));
        DirectoryPath = directoryPath;
        _maxBytes = maxBytes;
        _errorMaxBytes = maxBytes == DefaultMaxBytes ? 5 * 1024 * 1024 : maxBytes;
    }

    public static LocalLogStore CreateDefault() => new(Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DMS", "Logs"));

    public void Write(LogLevel level, string category, string message, Exception? exception = null)
    {
        try
        {
            var entry = $"[{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss zzz}] {level} {category}: {message}" +
                (exception == null ? "" : Environment.NewLine + exception) + Environment.NewLine;
            lock (_gate)
            {
                Directory.CreateDirectory(DirectoryPath);
                string? failure = null;
                try { if (_retentionConfigured && _lastCleanup != DateOnly.FromDateTime(DateTime.Now)) PruneExpired(); }
                catch (Exception ex) { failure = ex.Message; }
                try { Append(FilePath, entry, _maxBytes); }
                catch (Exception ex) { failure = ex.Message; }
                if (level >= LogLevel.Warning)
                {
                    try { Append(ErrorFilePath, entry, _errorMaxBytes); }
                    catch (Exception ex) { failure = ex.Message; }
                }
                LastWriteFailure = failure;
            }
        }
        catch (Exception ex)
        {
            LastWriteFailure = ex.Message;
            Debug.WriteLine($"DMS could not write its local diagnostic log: {ex.Message}");
        }
    }

    private static void Append(string path, string entry, long maxBytes)
    {
        var bytes = Encoding.UTF8.GetBytes(entry);
        if (bytes.LongLength > maxBytes)
        {
            var usable = (int)Math.Min(maxBytes - 32, int.MaxValue);
            bytes = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(bytes, 0, usable) + Environment.NewLine + "[entry truncated]" + Environment.NewLine);
        }
        var file = new FileInfo(path);
        if (file.Exists && file.Length + bytes.LongLength > maxBytes)
            File.Move(path, path + ".1", overwrite: true);
        using var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.ReadWrite);
        stream.Write(bytes);
    }

    // Cleanup runs at most daily while active, and whenever the setting changes.
    public void SetRetentionDays(int days)
    {
        if (days is not (7 or 14 or 30 or 90 or 180)) days = 30;
        lock (_gate)
        {
            _retentionDays = days;
            _retentionConfigured = true;
            try
            {
                // Preserve existing warnings and errors when upgrading from a single log.
                if (!File.Exists(ErrorFilePath) && !File.Exists(ErrorFilePath + ".1"))
                {
                    foreach (var path in new[] { FilePath + ".1", FilePath })
                    {
                        if (!File.Exists(path)) continue;
                        var entries = FilterEntries(File.ReadAllText(path), DiagnosticLogFilter.Warning | DiagnosticLogFilter.Error);
                        if (!string.IsNullOrWhiteSpace(entries)) Append(ErrorFilePath, entries, _errorMaxBytes);
                    }
                }
                PruneExpired();
            }
            catch (Exception ex) { LastWriteFailure = ex.Message; }
        }
    }

    private void PruneExpired()
    {
        var now = DateTimeOffset.Now;
        foreach (var (path, days) in new[] {
            (FilePath, Math.Min(_retentionDays, 14)), (FilePath + ".1", Math.Min(_retentionDays, 14)),
            (ErrorFilePath, _retentionDays), (ErrorFilePath + ".1", _retentionDays) })
        {
            if (!File.Exists(path)) continue;
            var lines = File.ReadAllLines(path);
            var kept = new StringBuilder();
            var include = true; // Preserve unrecognized legacy lines rather than discarding them.
            foreach (var line in lines)
            {
                if (line.Length >= 28 && line[0] == '[' && line[27] == ']' &&
                    DateTimeOffset.TryParseExact(line.Substring(1, 26), "yyyy-MM-dd HH:mm:ss zzz", CultureInfo.InvariantCulture, DateTimeStyles.None, out var timestamp))
                    include = timestamp >= now.AddDays(-days);
                if (include) kept.AppendLine(line);
            }
            var temporary = path + ".tmp";
            File.WriteAllText(temporary, kept.ToString(), new UTF8Encoding(false));
            File.Move(temporary, path, overwrite: true);
        }
        _lastCleanup = DateOnly.FromDateTime(now.LocalDateTime);
    }

    /// <summary>Reads the latest entries; older entries remain in the local files.</summary>
    public string ReadRecent(int maxCharacters = 100_000, DiagnosticLogFilter filter = DiagnosticLogFilter.All, bool errorsOnly = false)
    {
        if (maxCharacters < 1) throw new ArgumentOutOfRangeException(nameof(maxCharacters));
        lock (_gate)
        {
            var text = new StringBuilder();
            var path = errorsOnly ? ErrorFilePath : FilePath;
            foreach (var file in new[] { path + ".1", path })
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
            var result = FilterEntries(text.ToString(), filter);
            return result.Length <= maxCharacters ? result : result[^maxCharacters..];
        }
    }

    /// <summary>Deletes the local diagnostic history. New entries are written normally.</summary>
    public void Clear()
    {
        lock (_gate)
        {
            try
            {
                foreach (var path in new[] { FilePath, FilePath + ".1", ErrorFilePath, ErrorFilePath + ".1" })
                    if (File.Exists(path)) File.Delete(path);
                LastWriteFailure = null;
            }
            catch (Exception ex)
            {
                LastWriteFailure = ex.Message;
                throw;
            }
        }
    }

    private static string FilterEntries(string text, DiagnosticLogFilter filter)
    {
        if (filter == DiagnosticLogFilter.All || string.IsNullOrEmpty(text)) return text;
        var wanted = new List<string>();
        if (filter.HasFlag(DiagnosticLogFilter.Information)) wanted.Add("] Information ");
        if (filter.HasFlag(DiagnosticLogFilter.Warning)) wanted.Add("] Warning ");
        if (filter.HasFlag(DiagnosticLogFilter.Error)) { wanted.Add("] Error "); wanted.Add("] Critical "); }
        var result = new StringBuilder();
        var include = false;
        foreach (var line in text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
        {
            // Exception detail lines stay with the entry that introduced them.
            if (line.StartsWith("[", StringComparison.Ordinal) && line.Contains("] ", StringComparison.Ordinal))
                include = wanted.Any(level => line.Contains(level, StringComparison.Ordinal));
            if (include) result.AppendLine(line);
        }
        return result.ToString();
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

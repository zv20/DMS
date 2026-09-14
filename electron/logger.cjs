const path = require('node:path');
const { mkdir, rename, stat, appendFile, readFile, writeFile } = require('node:fs/promises');

const MAX_LOG_BYTES = 1024 * 1024;
const LEVELS = new Set(['debug', 'info', 'warn', 'error']);

function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: error.stack || null
  };
}

function createLogger(app) {
  const logDir = path.join(app.getPath('userData'), 'logs');
  const logFile = path.join(logDir, 'dms.log');
  let writeQueue = Promise.resolve();

  async function rotateIfNeeded() {
    try {
      const file = await stat(logFile);
      if (file.size < MAX_LOG_BYTES) return;
      await rename(logFile, path.join(logDir, 'dms.previous.log'));
    } catch {
      // Missing log files are normal on first launch.
    }
  }

  function normalizeMeta(meta) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
    const next = { ...meta };
    if (next.error) next.error = serializeError(next.error);
    return next;
  }

  function write(level, message, meta = {}) {
    const safeLevel = LEVELS.has(level) ? level : 'info';
    const entry = {
      time: new Date().toISOString(),
      level: safeLevel,
      message: String(message || ''),
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      ...normalizeMeta(meta)
    };

    writeQueue = writeQueue
      .then(async () => {
        await mkdir(logDir, { recursive: true });
        await rotateIfNeeded();
        await appendFile(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
      })
      .catch(() => {});

    return writeQueue;
  }

  return {
    filePath: logFile,
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    write,
    async read(limit = 300) {
      try {
        const text = await readFile(logFile, 'utf8');
        const lines = text.trim().split('\n').filter(Boolean);
        const entries = lines.slice(-Math.max(1, Math.min(1000, limit))).map((line) => {
          try { return JSON.parse(line); }
          catch { return { time: null, level: 'error', message: line }; }
        });
        return { filePath: logFile, entries };
      } catch {
        return { filePath: logFile, entries: [] };
      }
    },
    async clear() {
      await mkdir(logDir, { recursive: true });
      await writeFile(logFile, '', 'utf8');
      return true;
    }
  };
}

module.exports = { createLogger, serializeError };

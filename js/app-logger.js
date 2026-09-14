(function(window) {
  const desktopLogger = window.dmsDesktop?.logs;

  function serializeError(error) {
    if (!error) return null;
    return {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack || null
    };
  }

  function write(level, message, meta = {}) {
    if (!desktopLogger?.write) return Promise.resolve(false);
    return desktopLogger.write(level, message, {
      page: window.location?.pathname || 'unknown',
      ...meta
    }).catch(() => false);
  }

  window.dmsLogger = Object.freeze({
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta)
  });

  window.addEventListener('error', event => {
    write('error', 'Unhandled renderer error.', {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      error: serializeError(event.error)
    });
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    write('error', 'Unhandled renderer promise rejection.', {
      error: serializeError(reason instanceof Error ? reason : new Error(String(reason)))
    });
  });
})(window);

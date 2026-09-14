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

  function showErrorRecovery(message) {
    if (document.getElementById('renderer-error-recovery')) return;
    const panel = document.createElement('div');
    panel.id = 'renderer-error-recovery';
    panel.className = 'renderer-error-recovery';
    panel.innerHTML = `
      <div class="renderer-error-card">
        <h2>${window.t ? window.t('renderer_error_title') : 'Something went wrong'}</h2>
        <p>${window.t ? window.t('renderer_error_body') : 'The app caught an unexpected error. Your data is still stored locally.'}</p>
        <pre></pre>
        <div>
          <button type="button" id="renderer-error-reload">${window.t ? window.t('renderer_error_reload') : 'Reload'}</button>
          <button type="button" id="renderer-error-settings">${window.t ? window.t('renderer_error_settings') : 'Open Recovery'}</button>
        </div>
      </div>
    `;
    panel.querySelector('pre').textContent = message || '';
    document.body.appendChild(panel);
    document.getElementById('renderer-error-reload')?.addEventListener('click', () => window.location.reload());
    document.getElementById('renderer-error-settings')?.addEventListener('click', () => {
      panel.remove();
      if (window.navigateTo) window.navigateTo('settings');
      document.querySelector('[data-settings-tab="recovery"]')?.click();
    });
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
    showErrorRecovery(event.error?.message || event.message);
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    write('error', 'Unhandled renderer promise rejection.', {
      error: serializeError(reason instanceof Error ? reason : new Error(String(reason)))
    });
    showErrorRecovery(reason instanceof Error ? reason.message : String(reason));
  });
})(window);

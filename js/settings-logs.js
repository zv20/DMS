(function(window) {
  let logEntries = [];

  function t(key, fallback) {
    return window.t ? window.t(key) : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function selectedLevels() {
    return new Set([...document.querySelectorAll('.logs-filters input:checked')].map(input => input.value));
  }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function entryDetails(entry) {
    const detail = { ...entry };
    delete detail.time;
    delete detail.level;
    delete detail.message;
    return Object.keys(detail).length ? JSON.stringify(detail, null, 2) : '';
  }

  function renderLogs() {
    const list = document.getElementById('logs-list');
    if (!list) return;
    const levels = selectedLevels();
    const visible = logEntries.filter(entry => levels.has(entry.level || 'info')).reverse();
    if (!visible.length) {
      list.innerHTML = `<div class="logs-empty">${escapeHtml(t('logs_empty_filtered', 'No logs match the selected filters.'))}</div>`;
      return;
    }

    list.innerHTML = visible.map(entry => {
      const details = entryDetails(entry);
      return `
        <article class="log-entry log-${escapeHtml(entry.level || 'info')}">
          <div class="log-entry-topline">
            <span class="log-level">${escapeHtml(entry.level || 'info')}</span>
            <time>${escapeHtml(formatTime(entry.time))}</time>
          </div>
          <strong>${escapeHtml(entry.message || 'Log entry')}</strong>
          ${details ? `<pre>${escapeHtml(details)}</pre>` : ''}
        </article>
      `;
    }).join('');
  }

  async function refreshLogs() {
    const list = document.getElementById('logs-list');
    const path = document.getElementById('logs-file-path');
    if (!window.dmsDesktop?.logs?.read) {
      if (list) list.innerHTML = `<div class="logs-empty">${escapeHtml(t('logs_desktop_only', 'Logs are available in the desktop app.'))}</div>`;
      if (path) path.textContent = t('logs_desktop_unavailable', 'Desktop logging is not available in this browser.');
      return;
    }

    if (list) list.innerHTML = `<div class="logs-empty">${escapeHtml(t('logs_loading', 'Loading logs...'))}</div>`;
    try {
      const result = await window.dmsDesktop.logs.read(500);
      logEntries = Array.isArray(result.entries) ? result.entries : [];
      if (path) path.textContent = result.filePath || t('logs_file_unavailable', 'Log file unavailable.');
      renderLogs();
    } catch (error) {
      if (list) list.innerHTML = `<div class="logs-empty">${escapeHtml(t('logs_load_failed', 'Could not load logs.'))}</div>`;
      window.dmsLogger?.error('Failed to load logs page.', { error: { message: error.message, stack: error.stack } });
    }
  }

  async function clearLogs() {
    if (!window.dmsDesktop?.logs?.clear) return;
    if (!confirm(t('logs_clear_confirm', 'Clear all saved app logs?'))) return;
    await window.dmsDesktop.logs.clear();
    logEntries = [];
    renderLogs();
  }

  function showSettingsTab(tab) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.settingsTab === tab));
    document.querySelectorAll('.settings-tab-page').forEach(page => page.classList.toggle('active', page.id === `settings-tab-${tab}`));
    if (tab === 'logs') refreshLogs();
  }

  window.refreshLogs = refreshLogs;

  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => showSettingsTab(btn.dataset.settingsTab || 'general'));
    });
    document.querySelectorAll('.logs-filters input').forEach(input => input.addEventListener('change', renderLogs));
    document.getElementById('btn-refresh-logs')?.addEventListener('click', refreshLogs);
    document.getElementById('btn-clear-logs')?.addEventListener('click', clearLogs);
  });
})(window);

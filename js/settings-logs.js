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

  function recoveryValue(value) {
    return value ? escapeHtml(value) : `<span class="muted">${escapeHtml(t('recovery_none', 'None'))}</span>`;
  }

  function renderRecoveryState(state) {
    const target = document.getElementById('recovery-state');
    const warning = document.getElementById('recovery-warning');
    if (!target) return;
    if (!state) {
      if (warning) warning.style.display = 'none';
      target.innerHTML = `<div class="logs-empty">${escapeHtml(t('recovery_unavailable', 'Recovery state is unavailable.'))}</div>`;
      return;
    }

    const pending = state.pendingUpdate || {};
    const failed = state.failedUpdate || {};
    if (warning) {
      if (state.failedUpdate) {
        warning.style.display = 'block';
        warning.innerHTML = `
          <strong>${escapeHtml(t('recovery_warning_title', 'Previous update may have failed.'))}</strong>
          <span>${escapeHtml(t('recovery_warning_body', 'Review the recovery information below before installing another update.'))}</span>
        `;
      } else {
        warning.style.display = 'none';
        warning.textContent = '';
      }
    }
    target.innerHTML = `
      <div class="recovery-grid">
        <div><span>${escapeHtml(t('recovery_last_good', 'Last known good'))}</span><strong>${recoveryValue(state.lastKnownGood?.version)}</strong></div>
        <div><span>${escapeHtml(t('recovery_last_startup', 'Last startup'))}</span><strong>${recoveryValue(state.lastStartup?.version)}</strong></div>
        <div><span>${escapeHtml(t('recovery_pending_update', 'Pending update'))}</span><strong>${recoveryValue(pending.toVersion)}</strong></div>
        <div><span>${escapeHtml(t('recovery_failed_update', 'Failed update'))}</span><strong>${recoveryValue(failed.toVersion)}</strong></div>
      </div>
      <div class="recovery-detail">
        <p><strong>${escapeHtml(t('recovery_folder', 'Recovery folder'))}:</strong> ${recoveryValue(state.recoveryDir)}</p>
        <p><strong>${escapeHtml(t('recovery_backup', 'Latest update backup'))}:</strong> ${recoveryValue(pending.backupFilePath)}</p>
        <p><strong>${escapeHtml(t('recovery_state_file', 'State file'))}:</strong> ${recoveryValue(state.statePath)}</p>
      </div>
    `;
  }

  async function refreshRecoveryState() {
    const target = document.getElementById('recovery-state');
    if (!window.dmsDesktop?.recovery?.getState) {
      if (target) target.innerHTML = `<div class="logs-empty">${escapeHtml(t('recovery_desktop_only', 'Recovery tools are available in the desktop app.'))}</div>`;
      return;
    }
    if (target) target.innerHTML = `<div class="logs-empty">${escapeHtml(t('recovery_loading', 'Loading recovery state...'))}</div>`;
    try {
      renderRecoveryState(await window.dmsDesktop.recovery.getState());
    } catch (error) {
      if (target) target.innerHTML = `<div class="logs-empty">${escapeHtml(t('recovery_load_failed', 'Could not load recovery state.'))}</div>`;
      window.dmsLogger?.error('Failed to load recovery state.', { error: { message: error.message, stack: error.stack } });
    }
  }

  function renderLogs() {
    const list = document.getElementById('logs-list');
    if (!list) return;
    const levels = selectedLevels();
    const query = (document.getElementById('logs-search')?.value || '').trim().toLowerCase();
    const visible = logEntries.filter(entry => {
      if (!levels.has(entry.level || 'info')) return false;
      if (!query) return true;
      return JSON.stringify(entry).toLowerCase().includes(query);
    }).reverse();
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

  async function exportLogs() {
    if (!window.dmsDesktop?.logs?.export) return;
    const exported = await window.dmsDesktop.logs.export();
    if (exported) await refreshLogs();
  }

  async function copyDiagnosticReport() {
    if (!window.dmsDesktop?.recovery?.diagnosticReport || !navigator.clipboard) return;
    const report = await window.dmsDesktop.recovery.diagnosticReport();
    await navigator.clipboard.writeText(report);
    await refreshRecoveryState();
  }

  async function saveDiagnosticReport() {
    if (!window.dmsDesktop?.recovery?.saveDiagnosticReport) return;
    await window.dmsDesktop.recovery.saveDiagnosticReport();
    await refreshRecoveryState();
  }

  async function openRecoveryFolder() {
    if (!window.dmsDesktop?.recovery?.openFolder) return;
    await window.dmsDesktop.recovery.openFolder();
  }

  async function refreshAboutInfo() {
    const version = document.getElementById('about-app-version');
    if (!version) return;
    try {
      const info = await window.dmsDesktop?.getRuntimeInfo?.();
      version.textContent = info?.appVersion || '-';
    } catch {
      version.textContent = '-';
    }
  }

  function showSettingsTab(tab) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.settingsTab === tab));
    document.querySelectorAll('.settings-tab-page').forEach(page => page.classList.toggle('active', page.id === `settings-tab-${tab}`));
    if (tab === 'logs') refreshLogs();
    if (tab === 'recovery') refreshRecoveryState();
    if (tab === 'about') refreshAboutInfo();
  }

  window.refreshLogs = refreshLogs;

  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => showSettingsTab(btn.dataset.settingsTab || 'general'));
    });
    document.querySelectorAll('.logs-filters input').forEach(input => input.addEventListener('change', renderLogs));
    document.getElementById('logs-search')?.addEventListener('input', renderLogs);
    document.getElementById('btn-refresh-logs')?.addEventListener('click', refreshLogs);
    document.getElementById('btn-export-logs')?.addEventListener('click', exportLogs);
    document.getElementById('btn-clear-logs')?.addEventListener('click', clearLogs);
    document.getElementById('btn-refresh-recovery')?.addEventListener('click', refreshRecoveryState);
    document.getElementById('btn-open-recovery-folder')?.addEventListener('click', openRecoveryFolder);
    document.getElementById('btn-copy-diagnostic-report')?.addEventListener('click', copyDiagnosticReport);
    document.getElementById('btn-save-diagnostic-report')?.addEventListener('click', saveDiagnosticReport);
  });
})(window);

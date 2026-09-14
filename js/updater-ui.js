(function(window) {
  function isBg() {
    return (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
  }

  function text(en, bg) {
    return isBg() ? bg : en;
  }

  let lastKnownState = {
    currentVersion: null,
    availableVersion: null
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function friendlyError(error, fallback) {
    const message = error && error.message ? error.message : '';
    if (/status 404/i.test(message) || /Cannot download/i.test(message)) {
      return text(
        window.t ? window.t('updates_error_missing_file') : 'The update file was not found on GitHub. The release may still be uploading or its asset name may not match the update feed.',
        window.t ? window.t('updates_error_missing_file') : 'Файлът за обновление не беше намерен в GitHub. Възможно е релийзът още да се качва или името на файла да не съвпада с update feed.'
      );
    }
    if (/network|getaddrinfo|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(message)) {
      return text(
        window.t ? window.t('updates_error_network') : 'Network error while checking for updates. Check your internet connection and try again.',
        window.t ? window.t('updates_error_network') : 'Мрежова грешка при проверката за обновления. Проверете интернет връзката и опитайте отново.'
      );
    }
    return message || fallback;
  }

  function setButtons(state) {
    const check = document.getElementById('btn-check-updates');
    const download = document.getElementById('btn-download-update');
    const install = document.getElementById('btn-install-update');
    const busy = ['checking', 'downloading'].includes(state.status);

    if (check) check.disabled = busy;
    if (download) download.style.display = state.status === 'available' ? 'inline-flex' : 'none';
    if (install) install.style.display = state.status === 'downloaded' ? 'inline-flex' : 'none';
  }

  function renderProgress(state) {
    const progress = document.getElementById('update-progress');
    const fill = document.getElementById('update-progress-fill');
    const label = document.getElementById('update-progress-label');
    if (!progress || !fill || !label) return;

    const isVisible = state.status === 'downloading' || state.status === 'downloaded';
    const percent = state.status === 'downloaded'
      ? 100
      : Math.max(0, Math.min(100, Math.round(Number(state.percent) || 0)));

    progress.classList.toggle('is-visible', isVisible);
    progress.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    fill.style.width = `${percent}%`;
    fill.classList.toggle('is-active', state.status === 'downloading');
    label.textContent = `${percent}%`;
  }

  function renderStatus(state) {
    const el = document.getElementById('update-status');
    if (!el) return;

    const nextState = {
      ...lastKnownState,
      ...state
    };
    lastKnownState = {
      ...lastKnownState,
      ...nextState
    };

    const current = nextState.currentVersion || 'unknown';
    const available = nextState.availableVersion ? ` ${window.t ? window.t('updates_available_label') : text('Available:', 'Налична:')} ${nextState.availableVersion}.` : '';
    const statusMessages = {
      idle: 'updates_ready',
      checking: 'updates_checking',
      available: 'updates_available',
      downloading: 'updates_downloading',
      downloaded: 'updates_downloaded',
      unavailable: 'updates_unavailable'
    };
    const translatedStatus = window.t && statusMessages[nextState.status] ? window.t(statusMessages[nextState.status]) : '';
    const message = translatedStatus || nextState.message || (window.t ? window.t('updates_ready') : text('Ready to check for updates.', 'Готово за проверка за обновления.'));
    el.innerHTML = `
      <div class="update-summary">
        <strong>${escapeHtml(window.t ? window.t('updates_current_version') : text('Current version:', 'Текуща версия:'))} ${escapeHtml(current)}</strong>
        <span>${escapeHtml(message)}${escapeHtml(available)}</span>
      </div>
    `;
    el.dataset.status = nextState.status || 'idle';
    renderProgress(nextState);
    setButtons(nextState);
  }

  async function refreshUpdateStatus() {
    if (!window.dmsDesktop?.updates?.getStatus) return;
    try {
      renderStatus(await window.dmsDesktop.updates.getStatus());
    } catch (error) {
      renderStatus({
        status: 'error',
        message: friendlyError(error, window.t ? window.t('updates_read_failed') : text('Unable to read update status.', 'Не може да се прочете статуса на обновленията.'))
      });
    }
  }

  window.refreshUpdateStatus = refreshUpdateStatus;

  window.checkForAppUpdates = async function() {
    if (!window.dmsDesktop?.updates?.check) return;
    renderStatus({ status: 'checking', message: window.t ? window.t('updates_checking') : text('Checking for updates...', 'Проверка за обновления...') });
    try {
      renderStatus(await window.dmsDesktop.updates.check());
    } catch (error) {
      renderStatus({ status: 'error', message: friendlyError(error, window.t ? window.t('updates_check_failed') : text('Update check failed.', 'Проверката за обновления не успя.')) });
    }
  };

  window.downloadAppUpdate = async function() {
    if (!window.dmsDesktop?.updates?.download) return;
    renderStatus({ status: 'downloading', message: window.t ? window.t('updates_starting_download') : text('Starting download...', 'Стартиране на изтеглянето...') });
    try {
      renderStatus(await window.dmsDesktop.updates.download());
    } catch (error) {
      renderStatus({ status: 'error', message: friendlyError(error, window.t ? window.t('updates_download_failed') : text('Update download failed.', 'Изтеглянето на обновлението не успя.')) });
    }
  };

  window.installAppUpdate = async function() {
    if (!window.dmsDesktop?.updates?.install) return;
    await window.dmsDesktop.updates.install();
  };

  window.addEventListener('DOMContentLoaded', () => {
    if (window.dmsDesktop?.updates?.onStatusChanged) {
      window.dmsDesktop.updates.onStatusChanged(renderStatus);
    }
    setTimeout(refreshUpdateStatus, 800);
  });
})(window);

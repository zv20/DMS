(function(window) {
  function isBg() {
    return (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
  }

  function text(en, bg) {
    return isBg() ? bg : en;
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

  function renderStatus(state) {
    const el = document.getElementById('update-status');
    if (!el) return;

    const current = state.currentVersion || 'unknown';
    const available = state.availableVersion ? ` ${text('Available:', 'Налична:')} ${state.availableVersion}.` : '';
    el.innerHTML = `
      <div class="update-summary">
        <strong>${text('Current version:', 'Текуща версия:')} ${current}</strong>
        <span>${state.message || text('Ready to check for updates.', 'Готово за проверка за обновления.')}${available}</span>
      </div>
    `;
    el.dataset.status = state.status || 'idle';
    setButtons(state);
  }

  async function refreshUpdateStatus() {
    if (!window.dmsDesktop?.updates?.getStatus) return;
    try {
      renderStatus(await window.dmsDesktop.updates.getStatus());
    } catch (error) {
      renderStatus({
        status: 'error',
        message: error && error.message ? error.message : text('Unable to read update status.', 'Не може да се прочете статуса на обновленията.')
      });
    }
  }

  window.refreshUpdateStatus = refreshUpdateStatus;

  window.checkForAppUpdates = async function() {
    if (!window.dmsDesktop?.updates?.check) return;
    renderStatus({ status: 'checking', message: text('Checking for updates...', 'Проверка за обновления...') });
    try {
      renderStatus(await window.dmsDesktop.updates.check());
    } catch (error) {
      renderStatus({ status: 'error', message: error && error.message ? error.message : text('Update check failed.', 'Проверката за обновления не успя.') });
    }
  };

  window.downloadAppUpdate = async function() {
    if (!window.dmsDesktop?.updates?.download) return;
    renderStatus({ status: 'downloading', message: text('Starting download...', 'Стартиране на изтеглянето...') });
    try {
      renderStatus(await window.dmsDesktop.updates.download());
    } catch (error) {
      renderStatus({ status: 'error', message: error && error.message ? error.message : text('Update download failed.', 'Изтеглянето на обновлението не успя.') });
    }
  };

  window.installAppUpdate = async function() {
    if (!window.dmsDesktop?.updates?.install) return;
    await window.dmsDesktop.updates.install();
  };

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(refreshUpdateStatus, 800);
  });
})(window);

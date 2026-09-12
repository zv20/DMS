// Windows desktop storage is provided by js/desktop-storage-adapter.js via Electron IPC.
// This placeholder keeps script load order stable while making non-desktop storage explicit.
(function(window) {
  if (window.dmsDesktop) return;

  window.storageAdapter = {
    isDesktop: false,
    async init() {
      throw new Error('DMS is configured as a desktop app and requires Electron SQLite storage.');
    }
  };
})(window);

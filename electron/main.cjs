const { app, BrowserWindow, ipcMain, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { copyFile, readFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const AdmZip = require('adm-zip');
const { createDesktopDatabase } = require('./storage.cjs');
const { runStorageProjectionTest } = require('./storage-test-runner.cjs');
const { autoUpdater } = require('electron-updater');
const { createLogger } = require('./logger.cjs');

const APP_PROTOCOL = 'dms';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_PROTOCOL}://${APP_HOST}`;
const logger = createLogger(app);
let desktopDatabase;
let autoBackupCreatedForQuit = false;
const pendingImports = new Map();
const isStorageTest = process.argv.includes('--storage-test');
const isSmokeTest = process.argv.includes('--smoke-test');
const updateState = {
  status: app.isPackaged ? 'idle' : 'unavailable',
  message: app.isPackaged ? 'Ready to check for updates.' : 'Updates are available only in the installed Windows app.',
  currentVersion: app.getVersion(),
  availableVersion: null,
  downloaded: false,
  percent: null
};

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

if (isSmokeTest) {
  setTimeout(() => {
    console.error('Desktop smoke test exceeded the hard timeout.');
    process.exit(1);
  }, 25000);
}

function setUpdateState(next) {
  Object.assign(updateState, next, { currentVersion: app.getVersion() });
  BrowserWindow.getAllWindows().forEach(browserWindow => {
    browserWindow.webContents.send('desktop:updates:status-changed', { ...updateState });
  });
}

autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking', message: 'Checking for updates...', downloaded: false, percent: null }));
autoUpdater.on('update-available', info => setUpdateState({
  status: 'available',
  message: `Version ${info.version} is available.`,
  availableVersion: info.version,
  downloaded: false,
  percent: null
}));
autoUpdater.on('update-not-available', () => setUpdateState({
  status: 'idle',
  message: 'You are running the latest version.',
  availableVersion: null,
  downloaded: false,
  percent: null
}));
autoUpdater.on('download-progress', progress => setUpdateState({
  status: 'downloading',
  message: `Downloading update: ${Math.round(progress.percent || 0)}%`,
  percent: Math.max(0, Math.min(100, Number(progress.percent) || 0))
}));
autoUpdater.on('update-downloaded', info => setUpdateState({
  status: 'downloaded',
  message: `Version ${info.version} is ready to install.`,
  availableVersion: info.version,
  downloaded: true,
  percent: 100
}));
autoUpdater.on('error', error => setUpdateState({
  status: 'error',
  message: error && error.message ? error.message : 'Update check failed.',
  percent: null
}));
autoUpdater.on('error', error => logger.error('Auto updater failed.', { error }));

if (isStorageTest || isSmokeTest) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
}

// Register before app.ready so packaged renderer files have a stable, local origin.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

function rendererRoot() {
  return path.resolve(app.getAppPath());
}

function fileForRequest(requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== `${APP_PROTOCOL}:` || url.hostname !== APP_HOST) {
    throw new Error('Blocked request to an unknown application origin.');
  }

  const pathname = decodeURIComponent(url.pathname);
  const candidate = path.resolve(rendererRoot(), `.${pathname}`);
  const root = rendererRoot();

  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error('Blocked path traversal request.');
  }

  return candidate;
}

function isTrustedSender(event) {
  const url = event.senderFrame.url;
  if (url.startsWith(`${APP_ORIGIN}/`)) return true;
  return isSmokeTest && url.startsWith(pathToFileURL(rendererRoot()).toString());
}

function registerIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    const startedAt = Date.now();
    try {
      if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
      const result = await handler(event, ...args);
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs > 500) logger.warn('Slow IPC operation.', { channel, elapsedMs });
      return result;
    } catch (error) {
      logger.error('IPC handler failed.', { channel, error });
      throw error;
    }
  });
}

function createAutoBackupOnce(reason) {
  if (!desktopDatabase || autoBackupCreatedForQuit || isStorageTest) return;
  autoBackupCreatedForQuit = true;
  try {
    const result = desktopDatabase.createAutoBackup(reason);
    if (result) logger.info('Auto-backup created.', { reason, filePath: result.filePath, summary: result.summary });
  } catch (error) {
    console.warn(`Auto-backup on ${reason} failed:`, error);
    logger.warn('Auto-backup failed.', { reason, error });
  }
}

function configureSession() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    try {
      return net.fetch(pathToFileURL(fileForRequest(request.url)).toString());
    } catch (error) {
      console.error('Unable to load packaged application content:', error);
      logger.error('Unable to load packaged application content.', { url: request.url, error });
      return new Response('Not found', { status: 404 });
    }
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // The legacy renderer still relies on inline handlers/styles. This is a transitional
  // CSP; Phase 4 removes unsafe-inline once handlers are module-bound.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith(`${APP_ORIGIN}/`)) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; ",
          "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ",
          "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; form-action 'self'"
        ].join('')
      }
    });
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false
    }
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process exited unexpectedly.', { details });
  });
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) logger.warn('Renderer console message.', { level, message, line, sourceId });
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  window.on('close', () => createAutoBackupOnce('close'));
  window.loadURL(`${APP_ORIGIN}/index.html`);
  return window;
}

async function runSmokeTest() {
  console.log('Desktop smoke test: opening database.');
  desktopDatabase = createDesktopDatabase(app.getPath('userData'));
  console.log('Desktop smoke test: creating window.');
  const window = new BrowserWindow({
    width: 1366,
    height: 900,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  console.log('Desktop smoke test: waiting for renderer load.');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Smoke test page load timed out.')), 10000);
    const finish = (error) => {
      clearTimeout(timer);
      window.webContents.removeListener('did-finish-load', handleLoaded);
      window.webContents.removeListener('did-fail-load', handleFailed);
      if (error) reject(error);
      else resolve();
    };
    const handleLoaded = () => finish();
    const handleFailed = (_event, errorCode, errorDescription, validatedURL) => {
      finish(new Error(`Smoke test page load failed (${errorCode}): ${errorDescription} ${validatedURL}`));
    };
    window.webContents.once('did-finish-load', handleLoaded);
    window.webContents.once('did-fail-load', handleFailed);
    window.loadFile(path.join(__dirname, '..', 'index.html')).catch(finish);
  });
  console.log('Desktop smoke test: checking renderer UI.');
  await window.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Smoke test timed out.")), 8000);
      const check = () => {
        const required = ["menu", "recipes", "ingredients", "allergens", "settings", "style-editor", "btn-check-updates", "btn-refresh-logs"];
        const missing = required.filter(id => !document.getElementById(id));
        if (!missing.length && window.storageAdapter && window.t) {
          clearTimeout(timeout);
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  `);
  logger.info('Desktop smoke test passed.');
  console.log('Desktop smoke test passed.');
  process.exit(0);
}

function buildPrintDocument({ title, html, margins, usableH, usableW, safeBottom }) {
  const { top, right, bottom, left } = margins;
  return [
    '<!DOCTYPE html><html><head>',
    `<title>${title}</title><meta charset="UTF-8">`,
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family:Arial,sans-serif; font-size:10px; line-height:1.2; color:#333; background:#bbb; }',
    `@media screen { #page-wrapper { background:white; width:${usableW}px; height:${usableH}px; margin:20px auto; overflow:hidden; padding:${top}mm ${right}mm ${bottom}mm ${left}mm; box-shadow:0 2px 16px rgba(0,0,0,0.35); } }`,
    `@page { size:A4 portrait; margin:${top}mm ${right}mm ${safeBottom}mm ${left}mm; }`,
    '@media print {',
    '  html, body { height:100%; background:white; overflow:hidden; }',
    '  #page-wrapper { height:100%; padding:0; margin:0; box-shadow:none; overflow:hidden; }',
    '  #menu-content { height:100% !important; overflow:hidden !important; }',
    '  * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }',
    '}',
    '</style></head><body>',
    `<div id="page-wrapper">${html}</div>`,
    '</body></html>'
  ].join('');
}

function assertPrintPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid print payload.');
  if (typeof payload.html !== 'string' || payload.html.length === 0 || Buffer.byteLength(payload.html, 'utf8') > 20 * 1024 * 1024) {
    throw new Error('Invalid print HTML.');
  }
  if (typeof payload.title !== 'string' || payload.title.length > 160) throw new Error('Invalid print title.');
  for (const key of ['usableH', 'usableW', 'safeBottom']) {
    if (!Number.isFinite(payload[key]) || payload[key] <= 0 || payload[key] > 5000) throw new Error('Invalid print dimensions.');
  }
  const margins = payload.margins;
  if (!margins || typeof margins !== 'object' || Array.isArray(margins)) throw new Error('Invalid print margins.');
  for (const key of ['top', 'right', 'bottom', 'left']) {
    if (!Number.isFinite(margins[key]) || margins[key] < 0 || margins[key] > 100) throw new Error('Invalid print margins.');
  }
}

ipcMain.handle('desktop:get-runtime-info', (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');

  return {
    platform: process.platform,
    appVersion: app.getVersion(),
    storageMode: 'desktop-shell',
    logFile: logger.filePath
  };
});

registerIpc('desktop:logs:write', (_event, level, message, meta) => {
  return logger.write(level, message, meta);
});

registerIpc('desktop:logs:read', (_event, limit) => {
  return logger.read(limit);
});

registerIpc('desktop:logs:clear', () => {
  return logger.clear();
});

registerIpc('desktop:logs:export', async (event) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
    title: 'Export DMS logs',
    defaultPath: `dms-logs-${new Date().toISOString().slice(0, 10)}.log`,
    filters: [{ name: 'DMS logs', extensions: ['log'] }]
  });
  if (result.canceled || !result.filePath) return false;
  await copyFile(logger.filePath, result.filePath);
  return true;
});

ipcMain.handle('desktop:updates:get-status', (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return { ...updateState };
});

ipcMain.handle('desktop:updates:check', async (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  if (!app.isPackaged) {
    setUpdateState({ status: 'unavailable', message: 'Updates are available only in the installed Windows app.' });
    return { ...updateState };
  }

  await autoUpdater.checkForUpdates();
  return { ...updateState };
});

ipcMain.handle('desktop:updates:download', async (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  if (!app.isPackaged) {
    setUpdateState({ status: 'unavailable', message: 'Updates are available only in the installed Windows app.' });
    return { ...updateState };
  }

  await autoUpdater.downloadUpdate();
  return { ...updateState };
});

ipcMain.handle('desktop:updates:install', (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  if (!updateState.downloaded) throw new Error('No downloaded update is ready to install.');
  const backup = desktopDatabase.createRequiredBackup('before-update');
  logger.info('Verified backup created before update.', { filePath: backup?.filePath, summary: backup?.summary });
  autoUpdater.quitAndInstall(false, true);
  return true;
});

ipcMain.handle('desktop:storage:load', (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.loadSnapshot();
});

ipcMain.handle('desktop:storage:save', (event, type, value) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  desktopDatabase.saveDocument(type, value);
});

for (const catalog of ['recipes', 'ingredients', 'allergens']) {
  ipcMain.handle(`desktop:${catalog}:list`, (event) => {
    if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
    return desktopDatabase.loadCatalog(catalog);
  });
  ipcMain.handle(`desktop:${catalog}:replace`, (event, entries) => {
    if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
    desktopDatabase.replaceCatalog(catalog, entries);
  });
  ipcMain.handle(`desktop:${catalog}:upsert`, (event, record) => {
    if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
    desktopDatabase.upsertCatalogRecord(catalog, record);
  });
  ipcMain.handle(`desktop:${catalog}:delete`, (event, id) => {
    if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
    return desktopDatabase.deleteCatalogRecord(catalog, id);
  });
}

ipcMain.handle('desktop:menu:upsert-slot', (event, date, slot, item) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  desktopDatabase.upsertMenuSlot(date, slot, item);
});

ipcMain.handle('desktop:menu:clear-slot', (event, date, slot) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.clearMenuSlot(date, slot);
});

ipcMain.handle('desktop:templates:upsert', (event, name, template) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  desktopDatabase.upsertTemplate(name, template);
});

ipcMain.handle('desktop:templates:delete', (event, name) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.deleteTemplate(name);
});

ipcMain.handle('desktop:images:list', (event, folder) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.listTemplateImages(folder);
});

ipcMain.handle('desktop:images:save', (event, folder, image) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  if (!image || typeof image !== 'object' || Array.isArray(image)) throw new Error('Invalid image payload.');
  return desktopDatabase.saveTemplateImage(folder, image.name, image.mimeType, image.dataUrl);
});

ipcMain.handle('desktop:images:delete', (event, folder, name) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.deleteTemplateImage(folder, name);
});

ipcMain.handle('desktop:images:rename', (event, folder, oldName, newName) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.renameTemplateImage(folder, oldName, newName);
});

ipcMain.handle('desktop:images:get-data-url', (event, folder, name) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  return desktopDatabase.getTemplateImageDataUrl(folder, name);
});

ipcMain.handle('desktop:storage:import', (event, snapshot) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  desktopDatabase.replaceSnapshot(snapshot);
  return desktopDatabase.loadSnapshot();
});

ipcMain.handle('desktop:storage:export', async (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
    title: 'Export DMS backup',
    defaultPath: `dms-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    filters: [{ name: 'DMS backup', extensions: ['zip'] }, { name: 'Legacy JSON backup', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return false;
  if (result.filePath.toLowerCase().endsWith('.json')) {
    const { writeFile } = require('node:fs/promises');
    const data = { ...desktopDatabase.loadSnapshot(), templateImages: desktopDatabase.exportTemplateImages(), exportDate: new Date().toISOString() };
    await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  }
  desktopDatabase.createBackupZip(result.filePath);
  return true;
});

registerIpc('desktop:storage:health', () => {
  return desktopDatabase.getDataHealth();
});

ipcMain.handle('desktop:storage:choose-import', async (event) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
    title: 'Select DMS backup',
    properties: ['openFile'],
    filters: [{ name: 'DMS backup', extensions: ['zip', 'json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  let snapshot;
  try {
    if (filePath.toLowerCase().endsWith('.zip')) {
      const zip = new AdmZip(filePath);
      const manifest = zip.getEntry('backup.json');
      if (!manifest) throw new Error('Missing backup manifest.');
      snapshot = JSON.parse(manifest.getData().toString('utf8'));
      snapshot.templateImages = (snapshot.templateImages || []).map((image) => {
        if (!image?.relativePath) return image;
        const entry = zip.getEntry(image.relativePath.replace(/\\/g, '/'));
        if (!entry) return image;
        return { ...image, dataUrl: `data:${image.mimeType};base64,${entry.getData().toString('base64')}` };
      });
    } else {
      snapshot = JSON.parse(await readFile(filePath, 'utf8'));
    }
  } catch {
    throw new Error('The selected file is not a valid DMS backup.');
  }
  const id = randomUUID();
  pendingImports.set(id, snapshot);
  return { id, ...desktopDatabase.getImportSummary(snapshot) };
});

ipcMain.handle('desktop:storage:apply-import', (event, importId) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  if (typeof importId !== 'string' || !pendingImports.has(importId)) throw new Error('Import preview expired. Select the backup again.');
  const snapshot = pendingImports.get(importId);
  pendingImports.delete(importId);
  desktopDatabase.replaceSnapshot(snapshot);
  return desktopDatabase.loadSnapshot();
});

ipcMain.handle('desktop:print-menu', async (event, payload) => {
  if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
  assertPrintPayload(payload);

  const parent = BrowserWindow.fromWebContents(event.sender);
  const printWindow = new BrowserWindow({
    parent,
    modal: false,
    show: false,
    width: 900,
    height: 900,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  try {
    const printDocument = buildPrintDocument(payload);
    await printWindow.loadURL('about:blank');
    await printWindow.webContents.executeJavaScript(`
      document.open();
      document.write(${JSON.stringify(printDocument)});
      document.close();
    `);
    await printWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        setTimeout(() => {
          const content = document.getElementById("menu-content");
          if (content) {
            const pageHeight = ${JSON.stringify(payload.usableH)};
            const contentHeight = content.scrollHeight;
            if (contentHeight > pageHeight * 1.01) {
              const zoom = pageHeight / contentHeight;
              if (zoom < 1) content.style.zoom = Math.max(0.5, zoom).toFixed(4);
            }
          }
          resolve();
        }, 300);
      });
    `);
    return await new Promise((resolve, reject) => {
      let settled = false;
      let focusFallbackTimer = null;
      const focusFallback = () => finish(null, false);
      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        if (focusFallbackTimer) clearTimeout(focusFallbackTimer);
        if (parent && !parent.isDestroyed()) parent.removeListener('focus', focusFallback);
        if (!printWindow.isDestroyed()) printWindow.destroy();
        if (parent && !parent.isDestroyed()) parent.focus();
        if (error) reject(error);
        else resolve(result);
      };
      printWindow.once('closed', () => finish(null, false));
      printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (success) finish(null, true);
        else if (failureReason === 'cancelled') finish(null, false);
        else finish(new Error(failureReason || 'Print failed.'));
      });
      focusFallbackTimer = setTimeout(() => {
        if (parent && !parent.isDestroyed()) parent.once('focus', focusFallback);
      }, 1000);
      setTimeout(() => finish(null, false), 15000);
    });
  } catch (error) {
    if (!printWindow.isDestroyed()) printWindow.destroy();
    if (parent && !parent.isDestroyed()) parent.focus();
    throw error;
  }
});

app.whenReady().then(() => {
  if (isStorageTest) {
    try {
      runStorageProjectionTest();
      console.log('SQLite storage projection test passed.');
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
    return;
  }

  if (isSmokeTest) {
    runSmokeTest().catch((error) => {
      logger.error('Desktop smoke test failed.', { error });
      console.error(error);
      process.exit(1);
    });
    return;
  }

  desktopDatabase = createDesktopDatabase(app.getPath('userData'));
  configureSession();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  createAutoBackupOnce('quit');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught main-process exception.', { error });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled main-process rejection.', {
    error: reason instanceof Error ? reason : new Error(String(reason))
  });
});

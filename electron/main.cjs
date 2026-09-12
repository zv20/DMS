const { app, BrowserWindow, ipcMain, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const AdmZip = require('adm-zip');
const { createDesktopDatabase } = require('./storage.cjs');
const { runStorageProjectionTest } = require('./storage-test-runner.cjs');
const { autoUpdater } = require('electron-updater');

const APP_PROTOCOL = 'dms';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_PROTOCOL}://${APP_HOST}`;
let desktopDatabase;
let autoBackupCreatedForQuit = false;
const pendingImports = new Map();
const isStorageTest = process.argv.includes('--storage-test');
const updateState = {
  status: app.isPackaged ? 'idle' : 'unavailable',
  message: app.isPackaged ? 'Ready to check for updates.' : 'Updates are available only in the installed Windows app.',
  currentVersion: app.getVersion(),
  availableVersion: null,
  downloaded: false
};

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function setUpdateState(next) {
  Object.assign(updateState, next, { currentVersion: app.getVersion() });
}

autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking', message: 'Checking for updates...', downloaded: false }));
autoUpdater.on('update-available', info => setUpdateState({
  status: 'available',
  message: `Version ${info.version} is available.`,
  availableVersion: info.version,
  downloaded: false
}));
autoUpdater.on('update-not-available', () => setUpdateState({
  status: 'idle',
  message: 'You are running the latest version.',
  availableVersion: null,
  downloaded: false
}));
autoUpdater.on('download-progress', progress => setUpdateState({
  status: 'downloading',
  message: `Downloading update: ${Math.round(progress.percent || 0)}%`
}));
autoUpdater.on('update-downloaded', info => setUpdateState({
  status: 'downloaded',
  message: `Version ${info.version} is ready to install.`,
  availableVersion: info.version,
  downloaded: true
}));
autoUpdater.on('error', error => setUpdateState({
  status: 'error',
  message: error && error.message ? error.message : 'Update check failed.'
}));

if (isStorageTest) {
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
  return event.senderFrame.url.startsWith(`${APP_ORIGIN}/`);
}

function createAutoBackupOnce(reason) {
  if (!desktopDatabase || autoBackupCreatedForQuit || isStorageTest) return;
  autoBackupCreatedForQuit = true;
  try {
    desktopDatabase.createAutoBackup(reason);
  } catch (error) {
    console.warn(`Auto-backup on ${reason} failed:`, error);
  }
}

function configureSession() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    try {
      return net.fetch(pathToFileURL(fileForRequest(request.url)).toString());
    } catch (error) {
      console.error('Unable to load packaged application content:', error);
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
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  window.on('close', () => createAutoBackupOnce('close'));
  window.loadURL(`${APP_ORIGIN}/index.html`);
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
    storageMode: 'desktop-shell'
  };
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
  createAutoBackupOnce('before-update');
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
      printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (!printWindow.isDestroyed()) printWindow.close();
        if (success) resolve(true);
        else if (failureReason === 'cancelled') resolve(false);
        else reject(new Error(failureReason || 'Print failed.'));
      });
    });
  } catch (error) {
    if (!printWindow.isDestroyed()) printWindow.close();
    throw error;
  }
});

app.whenReady().then(() => {
  if (isStorageTest) {
    runStorageProjectionTest();
    console.log('SQLite storage projection test passed.');
    app.quit();
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

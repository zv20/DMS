const path = require('node:path');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');

const STATE_FILE = 'update-state.json';

function now() {
  return new Date().toISOString();
}

function createRecoveryState(userDataPath, appVersion) {
  const recoveryDir = path.join(userDataPath, 'recovery');
  const statePath = path.join(recoveryDir, STATE_FILE);
  mkdirSync(recoveryDir, { recursive: true });

  function read() {
    if (!existsSync(statePath)) {
      return {
        schemaVersion: 1,
        createdAt: now(),
        updatedAt: now(),
        lastKnownGood: null,
        lastStartup: null,
        pendingUpdate: null,
        failedUpdate: null
      };
    }

    try {
      const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {
        schemaVersion: 1,
        createdAt: now(),
        updatedAt: now(),
        lastKnownGood: null,
        lastStartup: null,
        pendingUpdate: null,
        failedUpdate: {
          detectedAt: now(),
          reason: 'Recovery state could not be read.'
        }
      };
    }
  }

  function write(state) {
    const next = {
      schemaVersion: 1,
      createdAt: state.createdAt || now(),
      ...state,
      updatedAt: now()
    };
    writeFileSync(statePath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  function beginStartup() {
    const state = read();
    let failedUpdate = state.failedUpdate || null;
    const pending = state.pendingUpdate;
    const previousStartup = state.lastStartup;

    if (
      pending &&
      pending.toVersion === appVersion &&
      !pending.healthyAt &&
      previousStartup &&
      previousStartup.version === appVersion &&
      !previousStartup.completedAt
    ) {
      failedUpdate = {
        detectedAt: now(),
        fromVersion: pending.fromVersion,
        toVersion: pending.toVersion,
        backupFilePath: pending.backupFilePath || null,
        reason: 'Updated version did not complete a healthy startup.'
      };
    }

    return write({
      ...state,
      failedUpdate,
      lastStartup: {
        version: appVersion,
        startedAt: now(),
        completedAt: null
      }
    });
  }

  function markHealthy(details = {}) {
    const state = read();
    const pending = state.pendingUpdate && state.pendingUpdate.toVersion === appVersion
      ? { ...state.pendingUpdate, healthyAt: now(), health: details.health || null }
      : state.pendingUpdate;

    return write({
      ...state,
      lastKnownGood: {
        version: appVersion,
        markedAt: now(),
        integrity: details.integrity || null,
        health: details.health || null
      },
      lastStartup: {
        ...(state.lastStartup || {}),
        version: appVersion,
        completedAt: now()
      },
      pendingUpdate: pending,
      failedUpdate: pending && pending.toVersion === appVersion ? null : state.failedUpdate || null
    });
  }

  function recordUpdateAttempt(details = {}) {
    const state = read();
    return write({
      ...state,
      pendingUpdate: {
        fromVersion: appVersion,
        toVersion: details.toVersion || null,
        startedAt: now(),
        backupFilePath: details.backupFilePath || null,
        backupSummary: details.backupSummary || null,
        health: details.health || null,
        integrity: details.integrity || null,
        releaseUrl: details.releaseUrl || null,
        healthyAt: null
      }
    });
  }

  function writeRecoveryInstructions(details = {}) {
    const targetVersion = details.toVersion || 'the new version';
    const previousVersion = details.fromVersion || appVersion;
    const instructionsPath = path.join(recoveryDir, 'RECOVERY.txt');
    const lines = [
      'DMS Recovery Notes',
      '',
      `Created: ${now()}`,
      `Current version before update: ${previousVersion}`,
      `Update target version: ${targetVersion}`,
      details.backupFilePath ? `Verified data backup: ${details.backupFilePath}` : 'Verified data backup: unavailable',
      '',
      'If the update does not work:',
      '1. Reinstall the previous working DMS version from GitHub Releases.',
      '2. Open DMS and go to Settings.',
      '3. Import the verified backup ZIP listed above if your data is missing or damaged.',
      '4. Export logs from Settings > Logs if you need troubleshooting help.'
    ];
    writeFileSync(instructionsPath, `${lines.join('\n')}\n`, 'utf8');
    return instructionsPath;
  }

  return {
    recoveryDir,
    statePath,
    read,
    beginStartup,
    markHealthy,
    recordUpdateAttempt,
    writeRecoveryInstructions
  };
}

module.exports = { createRecoveryState };

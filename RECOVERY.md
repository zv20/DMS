# DMS Recovery Guide

This guide explains what to do if a DMS update fails or user data appears missing after an update.

## Where Recovery Files Live

DMS stores recovery files in the app user data folder:

- `recovery/update-state.json` records startup and update state.
- `recovery/RECOVERY.txt` is written before an update install.
- `auto-backups/` contains verified backup ZIP files.
- `logs/dms.log` contains recent app logs.

Use Settings > Recovery to open the recovery folder or copy a diagnostic report.

## Before Updates

Before DMS installs a downloaded update, it creates a verified data backup ZIP and records the update attempt. If backup verification fails, the app should not continue to the installer handoff.

## If an Update Fails

1. Open DMS if it still starts.
2. Go to Settings > Recovery.
3. Copy the diagnostic report.
4. Open the recovery folder and find `RECOVERY.txt`.
5. Reinstall the previous working version from GitHub Releases.
6. If data is missing or damaged, import the backup ZIP listed in `RECOVERY.txt`.

## If DMS Will Not Start

1. Open the DMS user data folder manually.
2. Check `recovery/RECOVERY.txt` for the backup path and previous version.
3. Reinstall the previous working DMS version from GitHub Releases.
4. Start DMS and import the listed backup ZIP if needed.

## Notes

DMS backs up user data before update install, but it does not silently replace the installed application files. The safest rollback path is to reinstall the previous version and restore the verified data backup if needed.

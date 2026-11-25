# Managed Template Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store template image bytes in a DMS-managed folder while templates remain in SQLite, with portable archive backups and safe restores.

**Architecture:** Image assets remain hash-addressed in SQLite but store a relative filename rather than a BLOB. Schema migration stages verified files before dropping BLOB data. A `.dmsbackup` ZIP contains `dms.db`, `template-images/`, and a manifest; legacy `.db` backups remain restorable.

**Tech Stack:** WinUI 3, C#, Microsoft.Data.Sqlite, System.IO.Compression, xUnit.

**Spec:** User-approved managed image-folder design, 2026-11-24.

## Global Constraints

- Template Builder, renderers, and `MenuTemplate` interfaces remain unchanged.
- DMS owns copied images under `<data folder>/template-images`; no user-selected external paths are retained.
- New backups are archives and include all referenced image files; existing `.db` backups migrate on restore.
- Migration verifies file hashes before deleting SQLite BLOBs and preserves a usable pre-migration database on failure.
- Work on `future`; no release until Windows verification passes.

## Review Focus

- Existing BLOB images migrate to files and hydrate into the same data URIs.
- Duplicate uploads retain one hash-named file and one asset row.
- A missing, corrupt, oversized, or hash-mismatched file is rejected without replacing live data.
- Archive restore rejects unsafe ZIP paths and incomplete manifests before changing current data.
- Interrupted backup, restore, or migration retains a usable prior database and image folder.

### Task 1: Add file-backed image storage and migration

**Files:** `DMS/Services/DatabaseService.Images.cs`, `DMS/Services/DatabaseService.cs`, `DMS.Tests/DatabaseRoundTripTests.cs`.

- [x] Write failing tests for file-backed save/load, deduplication, and BLOB-to-file migration.
- [x] Add image root resolution, relative asset paths, hash validation, and schema version 7 migration.
- [x] Replace BLOB reads/writes with managed-file reads/writes while preserving public image APIs.
- [x] Run portable database tests.

### Task 2: Add archive backup and restore

**Files:** `DMS/Services/DatabaseService.Backup.cs`, `DMS/Services/DatabaseService.cs`, `DMS.Tests/DatabaseRestoreSafetyTests.cs`, `DMS.Tests/DatabaseRoundTripTests.cs`.

- [x] Write failing archive round-trip and malformed archive tests.
- [x] Create `.dmsbackup` archives with a manifest, SQLite snapshot, and image files.
- [x] Stage and validate archives before replacement; retain current database and image folder for recovery.
- [x] Preserve restore support for legacy `.db` backups.
- [x] Run portable backup and restore tests.

### Task 3: Update application backup workflows and handoff

**Files:** `DMS/Services/AutomaticBackup.cs`, `DMS/Services/UpgradeBackup.cs`, `DMS/Views/SettingsPage.xaml.cs`, corresponding tests and documentation.

- [x] Update automatic, pre-update, and manual backup selection to archive format.
- [x] Update manual restore selection to support archives and legacy databases.
- [x] Run portable tests, localization, release-preparation, previous-release, and diff checks.
- [ ] Build/test on Windows and manually verify existing-data migration, image load/save, export, archive backup, legacy backup restore, and recovery after a simulated failure.

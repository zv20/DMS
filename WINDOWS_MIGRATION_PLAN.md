# DMS Windows Desktop Migration Plan

## Purpose

Move DMS from its current browser-delivered HTML/CSS/JavaScript application into a dependable Windows desktop application while preserving existing business workflows, templates, and local-first behavior.

## Target Architecture

Use Electron with contextIsolation enabled, nodeIntegration disabled, and a narrow preload bridge exposing only business-level operations for database, files, printers, and app diagnostics.

## Persistent Storage

Use SQLite stored in the Windows per-user application-data folder (%APPDATA%\DMS), never inside the installation directory. Include backups, exports, imports, documents, and logs subfolders.

## Templates

Separate ui-template, print-template, receipt-template, and label-template document types. Use versioned JSON schemas, immutable presets, a component registry, and a DOM/CSS-based live preview rather than a freeform canvas.

## A4 and Windows Printing

Use @page CSS rules for A4 portrait with defined margins, a deterministic print-rendering pipeline, named Windows printer profiles, a Print Test Page workflow, PDF export, and print audit logging.

## Backup, Restore, and Audit

Implement automatic and manual backups, verified restore with pre-restore backup, and an append-only audit log for inventory, sales, template, and printer changes.

## Delivery Phases

Phase 0 Discovery, Phase 1 Electron Shell, Phase 2 Desktop Storage Foundation, Phase 3 Core Data Migration, Phase 4 POS Operations, Phase 5 Template Builder Modernization, Phase 6 A4/Windows Printing, Phase 7 Release Hardening, Phase 8 Future Sync and Multi-Terminal Support.

## Definition of Done

DMS installs and runs as a native Windows app, retains data reliably across restarts/upgrades, supports responsive templates, prints correct A4 documents via Windows printers, supports backup/restore, and remains local-first with a future synchronization path.
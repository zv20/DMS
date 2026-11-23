# Final Relational Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task.

**Goal:** Remove the remaining active JSON storage from DMS while preserving Template Builder, images, backups, restores, and current UI behavior.

**Architecture:** Keep `MenuTemplate` and `TemplateDocument` as UI/rendering models. Add database mappers that persist them as normalized template rows. Keep PNG/JPEG bytes in `template_image_assets.data` BLOBs; they remain portable and transactionally included in SQLite backups.

**Tech Stack:** WinUI 3, C#, Microsoft.Data.Sqlite, xUnit.

**Spec:** User-approved final no-compatibility schema migration, 2026-11-23.

## Global Constraints

- One migration version and one transaction for schema conversion; do not publish an intermediate JSON/SQL hybrid.
- Existing databases and current backups must migrate without loss; future active schema has no recipe, ingredient, template, or settings-list JSON fields.
- Preserve visible UI and `MenuTemplate`/`TemplateDocument` renderer interfaces.
- Image assets remain SHA-256-addressed SQLite BLOBs.
- Work on `future`; do not release; push only after all verification passes.

## Review Focus

- A saved template with background and decorative images preserves asset references and placement after upgrade.
- Preset templates seed and remain protected after a fresh database migration.
- Rename/delete cascades update template child rows and image usage correctly.
- A current backup restores and migrates; malformed normalized rows are rejected before replacing live data.
- Settings category/color order survives save, restart, backup, and restore.

### Task 1: Add normalized schema and migration mapper

**Files:** `DMS/Services/DatabaseService.TemplateStorage.cs`, `DMS/Services/DatabaseService.Relationships.cs`, `DMS/Services/DatabaseService.cs`, `DMS.Tests/DatabaseRoundTripTests.cs`.

- [ ] Write failing fresh-schema and legacy-upgrade tests proving no JSON columns remain and a representative template survives conversion.
- [ ] Create `template_documents`, `template_day_layouts`, `template_text_styles`, `template_block_appearances`, and `template_image_placements` with FK/cascade rules.
- [ ] Convert each legacy document JSON in a transaction, normalize data-URI images through `StoreTemplateImage`, synchronize references, then drop `templates.data_json`.
- [ ] Run portable database tests; commit migration-only checkpoint.

### Task 2: Replace template data access and preset seeding

**Files:** `DMS/Services/DatabaseService.cs`, `DMS/Services/DatabaseService.Images.cs`, new template storage partial, `DMS.Tests/DatabaseRoundTripTests.cs`.

- [ ] Write failing load/save/rename/delete/preset tests against normalized rows.
- [ ] Implement SQL-row to `MenuTemplate`/`TemplateDocument` mapping and transactional save mapper.
- [ ] Replace JSON-dependent CRUD, seasonal preset seeding, and image-reference extraction.
- [ ] Run portable database tests; commit template behavior checkpoint.

### Task 3: Normalize settings lists and restore validation

**Files:** `DMS/Services/DatabaseService.SettingsStorage.cs`, `DMS/Services/DatabaseService.cs`, `DMS.Tests/DatabaseRestoreSafetyTests.cs`, `DMS.Tests/DatabaseRoundTripTests.cs`.

- [ ] Write failing persistence/restore tests for ordered meal categories and recent colors.
- [ ] Add `meal_categories` and `recent_template_colors`; migrate list JSON, update settings load/save, then delete old settings keys.
- [ ] Raise restore schema version; validate normalized template/settings tables and reject malformed rows.
- [ ] Run portable tests, localization, release-preparation, previous-release, and diff checks.

### Task 4: Windows verification and handoff

**Files:** no production changes unless tests uncover an issue.

- [ ] Build/test on Windows and manually confirm Template Builder load/save, image placement, export, fresh setup, existing upgrade, backup, and restore.
- [ ] Produce the final ER diagram from actual schema; review the complete diff; commit and push `future`.

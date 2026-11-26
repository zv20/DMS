# Clean Uninstall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a person opt into permanently deleting DMS local data during an MSI uninstall while retaining the default, data-preserving uninstall.

**Architecture:** Extend the existing WiX maintenance flow with one explicit confirmation dialog before the built-in removal confirmation. Its unchecked public property gates a `util:RemoveFolderEx` action whose target is an installer-authored, non-overridable `%APPDATA%\DMS` path. The release packaging smoke test verifies both the default and opted-in uninstall paths on a disposable Windows runner.

**Tech Stack:** WiX Toolset 5.0.2, WiX Util extension, Windows Installer, PowerShell, xUnit.

**Spec:** `docs/superpowers/specs/2026-11-26-clean-uninstall-design.md`

## Global Constraints

- The delete-data choice is unchecked by default and appears only in the MSI uninstall flow.
- Deletion removes only `%APPDATA%\DMS`; `Documents\DMS Backups` and manually saved backups elsewhere remain untouched.
- Repair, initial installation, and major upgrades must never select or execute local-data deletion.
- The target path must not be supplied by a command-line-overridable MSI property.
- Preserve the existing normal uninstall behavior and existing release packaging validation.

## Review Focus

- A direct/silent uninstall without `DELETE_DMS_DATA=1` preserves a populated `%APPDATA%\DMS` folder.
- A direct/silent uninstall with `DELETE_DMS_DATA=1` recursively removes only `%APPDATA%\DMS`.
- A major upgrade cannot activate the deletion action even if an MSI property is supplied.
- A malicious or accidental public-property override cannot redirect deletion outside DMS’s own data folder.
- The confirmation UI makes the deletion permanent and the affected folder unambiguous before removal begins.

### Task 1: MSI opt-in data cleanup

**Files:**
- Create: `scripts/test-installer-definition.py`
- Modify: `installer/DMS.wxs:4-83`

**Interfaces:**
- Consumes: WiX Util `RemoveFolderEx` with `Property`, `On`, and `Condition` attributes.
- Produces: `DELETE_DMS_DATA` (unchecked MSI UI property) and private `DmsDataFolder` (`%APPDATA%\DMS`) used only by the recursive cleanup action.

- [ ] **Step 1: Write the failing installer-source regression test**

Create `scripts/test-installer-definition.py` that parses `installer/DMS.wxs` and asserts: the `RemoveDataDlg` exists; `MaintenanceTypeDlg` directs `RemoveButton` to it; the `DELETE_DMS_DATA` checkbox is explicitly unchecked; `DmsDataFolder` is `%APPDATA%\DMS`; the Util cleanup has `On="uninstall"` and `Condition="DELETE_DMS_DATA = 1 AND NOT UPGRADINGPRODUCTCODE"`; and no cleanup targets `Documents\DMS Backups`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `python3 scripts/test-installer-definition.py`

Expected: FAIL because the uninstall dialog and cleanup action are absent.

- [ ] **Step 3: Author the WiX maintenance confirmation and cleanup**

In `installer/DMS.wxs`, add an explicit `RemoveDataDlg` with a plain-language warning, an unchecked `DELETE_DMS_DATA` checkbox, and Back/Next/Cancel actions. Redirect only `MaintenanceTypeDlg`’s `RemoveButton` to it. Add private `DmsDataFolder` with the literal value `%APPDATA%\DMS`, then attach `util:RemoveFolderEx` to an existing MSI-owned component with `On="uninstall"` and `Condition="DELETE_DMS_DATA = 1 AND NOT UPGRADINGPRODUCTCODE"`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `python3 scripts/test-installer-definition.py`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add installer/DMS.wxs scripts/test-installer-definition.py
git commit -m "feat: add opt-in clean uninstall"
```

### Task 2: Release-runner uninstall coverage

**Files:**
- Modify: `.github/workflows/auto-release.yml:203-246`, `scripts/test-installer-definition.py`

**Interfaces:**
- Consumes: `DELETE_DMS_DATA=1` from Task 1 and the MSI produced by the existing packaging step.
- Produces: Windows CI proof that normal uninstall preserves data and opted-in uninstall removes only DMS local data.

- [ ] **Step 1: Add the failing release-source assertion to the installer-definition test**

Extend `scripts/test-installer-definition.py` to assert the release packaging workflow invokes an MSI removal with `DELETE_DMS_DATA=1` and explicitly checks that the DMS data folder is gone while `Documents\DMS Backups` remains.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `python3 scripts/test-installer-definition.py`

Expected: FAIL because the release smoke test has no opted-in cleanup path.

- [ ] **Step 3: Extend the disposable Windows packaging smoke test**

After its existing default-uninstall assertions in `.github/workflows/auto-release.yml`, reinstall the just-built MSI, create a marker in `%APPDATA%\DMS` and one in `Documents\DMS Backups`, execute `msiexec /x` with `DELETE_DMS_DATA=1`, then fail if the data folder still exists or the Documents backup marker was removed. Keep the runner’s existing default-uninstall preservation check unchanged.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `python3 scripts/test-installer-definition.py`

Expected: PASS.

- [ ] **Step 5: Run the non-performance test suite**

Run: `dotnet test DMS.Tests/DMS.Tests.csproj --configuration Release -p:Platform=x64 --filter "Category!=PerformanceBaseline"`

Expected: PASS with no failures.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/auto-release.yml scripts/test-installer-definition.py
git commit -m "test: cover clean uninstall packaging"
```

## Self-review

- The sole persistent-data target is the private `%APPDATA%\DMS` property in Task 1; Task 2 checks both cleanup and preservation requirements on Windows.
- Task 1 owns user-visible opt-in UI, uninstall-only gating, private path ownership, and exclusion of external backups.
- Task 2 owns the direct/silent and release-runner coverage that the static source test cannot prove locally.
- `DELETE_DMS_DATA` is consumed by Task 2 exactly as Task 1 exposes it; no other task interface is shared.

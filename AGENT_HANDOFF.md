# 🤝 KitchenPro DMS — Agent Handoff Document

> **Last Updated:** February 22, 2026  
> **Repo:** [zv20/DMS](https://github.com/zv20/DMS)  
> **Active branch:** `beta`  
> **Current version:** 14.8  
> **App type:** Vanilla JS SPA — no framework, no build step, open `index.html` directly in browser

---

## 🧠 What This App Does

**KitchenPro DMS** is a kitchen/restaurant menu planning tool built for a Bulgarian kitchen. It runs as a local HTML file (no server needed). Staff can:

- Manage **recipes** (name, category, ingredients, allergens, calories, portion size)
- Manage **ingredients** and link them to allergens
- Plan a **weekly/monthly menu** on a calendar
- **Print/export** beautifully styled weekly menu PDFs
- Customise the printed menu look with a **Template Builder** (backgrounds, headers, footers, fonts, borders, 5-layer image system)
- Switch between 🇧🇬 **Bulgarian** and 🇺🇸 **English** at any time

Data is saved to a **local folder** (File System Access API — Chrome/Edge) or **IndexedDB** (browser fallback — Firefox/Safari).

---

## 📁 Repo Structure

```
DMS/
├── index.html                          # Single entry point — the whole app
├── css/
│   ├── styles.css                      # Main UI styles
│   ├── calendar.css                    # Calendar / week view
│   └── template-styles.css             # Template builder panel styles
├── js/
│   ├── i18n.js                         # ⭐ ALL translations (EN + BG)
│   ├── constants.js                    # Centralised magic numbers / defaults
│   ├── storage-adapter.js              # File System API ↔ IndexedDB abstraction
│   ├── store.js                        # CRUD + save/load wiring
│   ├── calendar.js                     # Calendar logic, date helpers, view modes
│   ├── render.js                       # Data → DOM (pure, no events)
│   ├── ui.js                           # Event handlers, modals, navigation
│   ├── ui-combobox.js                  # Reusable autocomplete widget
│   ├── clock.js                        # Live clock in header
│   ├── print.js                        # ⭐ Print / Save Image / Save PDF (v8.1)
│   ├── main.js                         # App boot, splash screen
│   ├── template.js                     # Thin init wrapper for TemplateManager
│   ├── template-presets.js             # 6 built-in preset template definitions
│   └── template/
│       └── template-builder-steps.js   # ⭐ Full step-based Template Builder
├── data/                               # Runtime data (user folder — not tracked in git)
├── img/
│   └── logo.png
├── .github/
│   ├── workflows/sync-demo.yml         # CI: auto-syncs main → demo on push
│   └── scripts/inject-demo.py          # Injects demo-mode.js into index.html
├── ARCHITECTURE.md                     # Deep-dive module reference
└── AGENT_HANDOFF.md                    # This file
```

---

## ✅ Session Log

### February 22, 2026 — Dead Code Cleanup

**What was done:**

1. **Removed PDF Archive card from `index.html`** — the Settings page had a card referencing `openArchiveFolder()` which never existed in JS. Removed entirely.

2. **Cleaned `storage-adapter.js`** — removed `ensureDataFolderStructure()` (was creating a useless `data/archive/menus/` folder on disk) and its call in `selectFolder()`. Also trimmed orphaned inline comments.

3. **Cleaned `ui.js`** — removed dead `loadBuilderSettings()`, `updateBuilderPreview()`, `setVal()` stubs that referenced non-existent DOM elements. `initStyleBuilder()` is now a clean 3-line delegate to `window.TemplateManager`.

4. **Cleaned `i18n.js`** — removed `settings_archive_title`, `settings_archive_desc`, `btn_open_archive` from both `en` and `bg` locales.

5. **Updated `ARCHITECTURE.md`** — fully rewritten to reflect current file structure, real module sizes, actual storage schema, and current patterns. Old stale content (references to the old monolithic `template.js`, phantom `archive/` folder, outdated storage docs) removed.

**Commit:** `09f6a42` — `chore: remove dead PDF archive code, orphaned i18n keys, and dead builder stubs`

---

### February 21, 2026 — PDF Print Overhaul + Demo Branch

#### 🖨️ Print System (print.js v8.1)
The old single print button now opens a **three-action dialog**:
- 🖨️ **Print Menu** — new tab → `window.print()` → auto-close via `afterprint` event
- 🖼️ **Save as Image** — html2canvas → preview modal → PNG download
- 📄 **Save as PDF** — html2canvas + jsPDF → preview modal → PDF download

**Key commits:** `76c9bc9`, `bd69e4b`, `d027929` (merge PR #29)

#### 🌐 Demo Branch + GitHub Pages
- `demo` branch serves the app publicly via GitHub Pages with read-only sample data
- `js/demo-mode.js` overrides `storageAdapter.init()` to use `fetch()` — all writes are memory-only
- The folder picker is suppressed entirely on demo
- **`demo-mode.js` must never be committed to `main` or `beta`**

#### 🤖 GitHub Actions: Auto-Sync main → demo
- `.github/workflows/sync-demo.yml` fires on every push to `main`
- Copies all files from `main`, restores `demo-mode.js`, injects script tag into `index.html`
- Repo → Settings → Actions → General → Workflow permissions = **Read and write** (do not change)
- The `demo` branch will always show "X ahead, Y behind" `main` — this is by design

---

### Pre February 21 — Foundation Work

- Full Bulgarian translation across all modules
- Language preference persisted in both `settings.json` and `localStorage` (`dms_language_hint`)
- Step-based Template Builder (Background → Header → Weekly Menu → Footer accordion)
- Combobox widget for ingredient/allergen search in modals
- Monthly/weekly calendar view switcher

---

## 🔧 Key Technical Patterns

### Global function exposure
```javascript
window.saveRecipe = function(event) { ... };
window.openRecipeModal = function(id) { ... };
```

### Module pattern (IIFE)
```javascript
(function(window) {
    // module code
})(window);
```

### Translation
```javascript
// Static HTML — auto-translated on language change
<h1 data-i18n="nav_recipes">Recipes</h1>

// Dynamic JS — must call window.t() explicitly
const html = `<button>${window.t('btn_edit')}</button>`;
```
**⚠️ Dynamically generated HTML does NOT auto-translate.** Always use `window.t('key')` when building strings in JS, or call `window.applyTranslations()` after injecting HTML.

### Storage abstraction
```javascript
window.storageAdapter.save('recipes', data);  // saves to whichever backend is active
window.storageAdapter.useFileSystem           // boolean — true = File System API
```

### Cache busting
All `<script src="...">` and `<link rel="stylesheet">` tags use `?v=14.8`. **Manually increment** after any JS/CSS change. No automatic versioning.

---

## ⚠️ Known Issues / Things to Watch Out For

| Issue | Details |
|---|---|
| **Settings storage banner not i18n'd** | `#storage-method-text` in `index.html` uses hardcoded strings in an inline `<script>`. Needs `window.t()`. |
| **No automated tests** | Zero coverage. Manually test all changes in Chrome/Edge. |
| **demo branch history diverges** | `demo` always shows "X behind Y ahead" vs `main` — expected, not a bug. |
| **print.js is large** | 41 KB, uses html2canvas + jsPDF. Treat carefully. |
| **template-builder-steps.js is large** | 78 KB monolith — works well but be careful editing. |
| **Stale dev docs in root** | `CLEANUP_PLAN.md`, `REFACTOR_SUMMARY.md`, `NEW_TEMPLATE_BUILDER_READY.md`, `TEMPLATE_SYSTEM_CLEANUP.md`, `js/template/DELETED_OLD_FILES.md` — can be deleted when convenient. |

---

## 🚀 Suggested Next Steps

### Ready for testing (owner is testing now)
- [ ] Full regression test in Chrome — recipes, ingredients, allergens CRUD
- [ ] Menu planning — add/clear meals, week navigation
- [ ] Template builder — all 4 steps, save/load/delete templates, preset loading
- [ ] Print dialog — Print / Save Image / Save PDF
- [ ] Language switch BG ↔ EN
- [ ] Folder change / Export backup / Import data

### After testing passes
- [ ] **Bump version** — increment `?v=14.8` → `?v=14.9` in `index.html` after any further JS/CSS changes
- [ ] **Delete stale dev docs** — `CLEANUP_PLAN.md`, `REFACTOR_SUMMARY.md`, `NEW_TEMPLATE_BUILDER_READY.md`, `TEMPLATE_SYSTEM_CLEANUP.md`, `js/template/DELETED_OLD_FILES.md`
- [ ] **Fix Settings banner i18n** — wire `#storage-method-text` to `window.t()`
- [ ] **Write a real README.md** — currently only 33 bytes
- [ ] **Merge `beta` → `main`** when stable

### Medium priority
- [ ] Template builder i18n audit — scan `template-builder-steps.js` for hardcoded English
- [ ] Add JSDoc to major public functions

### Future / nice to have
- [ ] Split `print.js` into smaller modules
- [ ] Shopping list generator
- [ ] Nutrition calculator
- [ ] Multi-week planning view

---

## 🧪 How to Test

1. Open `index.html` directly in **Chrome or Edge** (File System API requires Chromium)
2. Select the DMS folder when prompted on first load
3. Switch language with 🇧🇬/🇺🇸 flag in top-right
4. Check browser **Console** for `❌` errors
5. **Print test:** Menu → Print → try all three actions (Print / Image / PDF)
6. **Template builder:** Menu → 📝 Template Builder → test all 4 steps
7. **Demo:** open GitHub Pages URL on `demo` branch — verify folder picker absent, data loads, writes don't persist

---

## 📌 Key Commits Reference

| Commit | What it did |
|---|---|
| `09f6a42` | chore: dead code cleanup — archive card, i18n keys, builder stubs |
| `978da5e` | CI: finalised sync-demo workflow |
| `d027929` | Merge PR #29 — PDF/print overhaul into main |
| `bd69e4b` | fix: auto-close print tab via afterprint event |
| `76c9bc9` | feat: three-action print dialog + preview modal |
| `821aa44` | feat: add demo-mode.js |
| `a85ba5e` | Restored ALL Bulgarian translations + localStorage hint |

---

## 💬 Notes for the Next Agent

- **Owner is Bulgarian** — default language is `bg`, not `en`
- **Always use `window.t('key')`** for user-visible text in JS; add matching `bg:` key to `i18n.js`
- **No backend, no npm, no build step** — plain HTML/CSS/JS only
- **GitHub MCP tool works perfectly** on this repo — read and commit files directly
- When editing large files (`i18n.js`, `print.js`, `template-builder-steps.js`) — always fetch the current SHA first to avoid overwriting concurrent changes
- **`demo-mode.js` must never be on `main` or `beta`** — demo branch only
- The CI handles main → demo sync automatically — just push to `main`
- Repo Settings → Actions → Workflow permissions = **Read and write** — do not change
- Read `ARCHITECTURE.md` for the full module reference — it's up to date as of this session

---

*The codebase is clean and well-organised. Good luck! 🚀*

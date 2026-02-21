# 🤝 KitchenPro DMS — Agent Handoff Document

> **Last Updated:** February 21, 2026  
> **Repo:** [zv20/DMS](https://github.com/zv20/DMS)  
> **Current version:** 14.6  
> **App type:** Vanilla JS single-page app (no framework, no build step — open `index.html` directly in a browser)

---

## 🧠 What This App Does

**KitchenPro DMS** is a kitchen/restaurant menu planning tool built for a Bulgarian kitchen. It runs as a local HTML file (no server needed). Staff can:

- Manage **recipes** (name, category, ingredients, allergens, calories, portion size)
- Manage **ingredients** and link them to allergens
- Plan a **weekly/monthly menu** on a calendar
- **Print/export** beautifully styled weekly menu PDFs
- Customize the printed menu look with a **Template Builder** (backgrounds, headers, footers, fonts, borders)
- Switch between 🇧🇬 **Bulgarian** and 🇺🇸 **English** at any time

Data is saved either to a **local folder** (via File System Access API) or to **IndexedDB** (browser fallback).

---

## 📁 Repo Structure (Quick Reference)

```
DMS/
├── index.html                          # Single entry point — the whole app
├── css/
│   ├── styles.css                      # Main UI styles
│   ├── calendar.css                    # Calendar / week view
│   └── template-styles.css             # Template builder panel styles
├── js/
│   ├── i18n.js                         # ⭐ Translations (EN + BG) — ALL keys live here
│   ├── constants.js                    # Centralised magic numbers / defaults
│   ├── store.js                        # CRUD + data persistence
│   ├── storage-adapter.js              # File System API ↔ IndexedDB abstraction
│   ├── calendar.js                     # Calendar logic, date helpers
│   ├── render.js                       # Data → DOM rendering (pure, no events)
│   ├── ui.js                           # Event handlers, modals, navigation
│   ├── main.js                         # App boot, splash screen
│   ├── clock.js                        # Live clock in header
│   ├── print.js                        # ⭐ PDF/print/image export (v8.1 — see below)
│   ├── demo-mode.js                    # ⭐ DEMO BRANCH ONLY — fetch-based storage, memory writes
│   ├── template.js                     # Legacy template file (mostly superseded)
│   ├── template-presets.js             # Preset template definitions
│   └── template/
│       └── template-builder-steps.js   # ⭐ NEW step-based Template Builder UI
├── data/
│   └── preset-templates.js             # Built-in template presets (6 designs)
├── img/
│   └── logo.png                        # App logo
├── .github/
│   ├── workflows/
│   │   └── sync-demo.yml               # ⭐ CI: auto-syncs main → demo on every push
│   └── scripts/
│       └── inject-demo.py              # Python script used by the CI workflow
└── AGENT_HANDOFF.md                    # This file
```

---

## ✅ What Was Completed — February 21, 2026 Session

### 1. 🖨️ PDF Print Overhaul (print.js v8.1) — merged via PR #29

The print system was completely upgraded. The old print-only button now opens a **three-action dialog**:

- 🖨️ **Print Menu** — opens a new tab with the rendered menu and triggers `window.print()`, then auto-closes the tab after the dialog is confirmed/cancelled via `afterprint` event
- 🖼️ **Save as Image** — renders to canvas via html2canvas, shows a **preview modal**, then downloads as PNG
- 📄 **Save as PDF** — renders via html2canvas + jsPDF, shows a **preview modal**, then downloads as PDF

**Key files changed:** `js/print.js` (v8.1, 40 KB)

**Key commits:**
- `76c9bc9` — three-action dialog + preview modal
- `bd69e4b` — auto-close print tab via `afterprint` event
- `d027929` — merge PR #29 into main

### 2. 🌐 Demo Branch + GitHub Pages

A `demo` branch was set up to serve the app publicly via **GitHub Pages** without exposing real production data.

**How the demo works:**
- `js/demo-mode.js` overrides `storageAdapter.init()` to use `fetch()` instead of the File System API
- Data is loaded from `data/data.json` and `data/templates.json` in the repo (read-only from the user's perspective)
- All writes are **memory-only** — changes are lost on page refresh, which is correct for a demo
- The folder picker prompt is suppressed entirely

**The only difference between `main` and `demo` index.html** is one extra script tag:
```html
<!-- After storage-adapter.js, before store.js -->
<script src="js/demo-mode.js"></script>
```

### 3. 🤖 GitHub Actions: Auto-Sync main → demo

A CI workflow was created at `.github/workflows/sync-demo.yml` that **automatically syncs `demo` from `main`** on every push.

**What it does:**
1. Checks out the repo with full history
2. Switches to `demo` branch
3. Overwrites all files with `main`'s versions (`git checkout main -- .`)
4. Restores `js/demo-mode.js` from `demo` (prevents it from being deleted since it doesn't exist on main)
5. Runs `.github/scripts/inject-demo.py` to inject the `demo-mode.js` script tag into `index.html` after `storage-adapter.js`
6. Commits and pushes to `demo` only if there are actual changes

**Important settings required:**
- Repo → Settings → Actions → General → **Workflow permissions** must be set to **"Read and write permissions"** — this was already done.

**Why demo shows "X ahead, Y behind" main:**
This is expected and harmless. The action copies *files* from main but doesn't merge *git history*, so the commit counts diverge. The files are always in sync.

**Key files:**
- `.github/workflows/sync-demo.yml`
- `.github/scripts/inject-demo.py`

---

## ✅ What Was Completed — Previous Sessions (pre Feb 21)

### Full Bulgarian Translation
The app is fully translated into Bulgarian. All `data-i18n` keys in `index.html` and dynamically rendered strings in JS use `window.t('key')` from `js/i18n.js`.

### Language Preference Persistence
Saved in both `settings.json` and `localStorage` (`dms_language_hint`) so the correct language shows even on first load before the folder is selected.

### Step-Based Template Builder
Refactored from flat list to 4-step accordion: Background → Header → Weekly Menu → Footer. Lives in `js/template/template-builder-steps.js`.

---

## 🔧 Key Technical Patterns to Know

### Global Function Exposure
```javascript
window.saveRecipe = function(event) { ... };
window.openRecipeModal = function(id) { ... };
```

### Module Pattern (IIFE)
```javascript
(function(window) {
    // module code
})(window);
```

### Translation Pattern
```javascript
// Static HTML — auto-translated on language change
<h1 data-i18n="nav_recipes">Recipes</h1>

// Dynamic JS — must call window.t() explicitly
const html = `<button>${window.t('btn_edit')}</button>`;
```
**Important:** Dynamically generated HTML does NOT auto-translate. Call `window.t('key')` when building the string, OR call `window.applyTranslations()` after injecting HTML.

### Storage Abstraction
```javascript
window.storageAdapter.saveData(data);   // saves to either backend
window.storageAdapter.loadData();       // loads from either backend
window.storageAdapter.useFileSystem     // boolean — which mode is active
```

### Version Cache-Busting
All `<script src="...">` and `<link rel="stylesheet">` tags use `?v=14.6`. **Manually increment this** when making JS/CSS changes to bust the browser cache. There is no automatic versioning.

---

## ⚠️ Known Issues / Things to Watch Out For

| Issue | Details |
|---|---|
| **Settings page text not translated** | The `#storage-info` banner in Settings uses hardcoded strings inside an inline `<script>` in `index.html`. Needs `window.t()` calls. |
| **Export/Import button labels** | Export/Import buttons in Settings use hardcoded English — not wired to `data-i18n`. |
| **`template.js` still exists** | Legacy file, mostly superseded by `template-builder-steps.js`. Should eventually be removed. |
| **No automated tests** | Zero test coverage. Manually test all changes in Chrome/Edge. |
| **demo branch history diverges** | `demo` will always show "X behind Y ahead" vs `main` — this is by design, not a bug. |
| **print.js is large** | 40 KB, uses html2canvas + jsPDF. Treat carefully. |

---

## 🚀 Suggested Next Steps

### High Priority
- [ ] **Fix Settings page translations** — wire `storage-info` banner and Export/Import buttons to `window.t()` / `data-i18n`
- [ ] **Test the demo on GitHub Pages** — verify `demo-mode.js` loads correctly, data appears, writes are memory-only, no folder picker shows
- [ ] **Christmas background image** — generate or source `img/xmas-bg.jpg` (A4 portrait ~2480×3508px) and add to Image Library in Template Builder

### Medium Priority
- [ ] **Template builder i18n audit** — scan `template-builder-steps.js` for hardcoded English strings not using `window.t()`
- [ ] **Version bump** — increment `?v=14.6` in `index.html` after any JS/CSS changes
- [ ] **Clean up legacy `template.js`** — evaluate what's still used vs replaced

### Low Priority / Future
- [ ] Split `print.js` into smaller modules
- [ ] Add JSDoc to major functions
- [ ] Shopping list generator
- [ ] Nutrition calculator
- [ ] Multi-week planning view
- [ ] Consider Personal Access Token (PAT) for CI if more granular permissions are ever needed

---

## 🧪 How to Test Changes

1. **Open `index.html` directly** in Chrome/Edge (File System API requires Chromium)
2. **Select the DMS folder** when prompted on first load
3. Switch language with 🇧🇬/🇺🇸 flag dropdown in top-right
4. Check browser **Console** for `❌` errors
5. For print: Menu → Print → choose Print / Save Image / Save PDF
6. For template builder: Menu → 📝 Template Builder
7. For demo: open the GitHub Pages URL on the `demo` branch

---

## 📌 Key Commits for Context

| Commit | What it did |
|---|---|
| `978da5e` | CI: finalized sync-demo workflow (last fix) |
| `69c57c2` | CI: split inject script into `.github/scripts/inject-demo.py` |
| `a092600` | CI: initial sync-demo workflow added |
| `d027929` | Merge PR #29 — PDF/print overhaul into main |
| `bd69e4b` | fix: auto-close print tab via afterprint event |
| `76c9bc9` | feat: three-action print dialog + preview modal |
| `821aa44` | feat: add demo-mode.js (demo branch origin) |
| `a85ba5ea` | Restored ALL Bulgarian translations + localStorage hint |

---

## 💬 Notes for the Next Agent

- The **owner is Bulgarian** — default language is `bg`, not `en`
- Always use `window.t('key')` for any user-visible text in JS; add matching `bg:` key to `i18n.js`
- The app has **no backend, no npm, no build step** — plain HTML/CSS/JS only
- The **GitHub MCP tool works perfectly** on this repo — read and commit files directly
- When committing large files (like `i18n.js` or `print.js`), always fetch the current SHA first
- **`demo-mode.js` must never be committed to `main`** — it belongs only on `demo`
- The CI workflow handles main → demo sync automatically. Just push to `main` and demo updates within ~30 seconds
- The "X ahead, Y behind" on the demo branch is **expected and harmless** — files are always in sync
- Repo Settings → Actions → General → Workflow permissions is set to **Read and write** — do not change this or the CI will break

---

*Good luck! The codebase is clean and well-organised. Read `ARCHITECTURE.md` for a deeper dive into each module.* 🚀

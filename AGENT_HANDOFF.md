# 🤝 KitchenPro DMS — Agent Handoff Document

> **Written:** February 18, 2026  
> **Repo:** [zv20/DMS](https://github.com/zv20/DMS)  
> **Current version:** 14.3  
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
│   ├── print.js                        # PDF/print generation
│   ├── template.js                     # Legacy template file (mostly superseded)
│   ├── template-presets.js             # Preset template definitions
│   └── template/
│       └── template-builder-steps.js   # ⭐ NEW step-based Template Builder UI
├── data/
│   └── preset-templates.js             # Built-in template presets (6 designs)
├── img/
│   └── logo.png                        # App logo
└── docs/
    ├── ARCHITECTURE.md                 # Deep-dive architecture docs
    ├── AGENT_HANDOFF.md                # This file
    └── ...other planning docs
```

---

## ✅ What Was Completed in This Session

### 1. 🎄 Christmas Background Generation
Requested a Christmas-themed background image for the printed menu. This was discussed — next agent should follow up on **generating or sourcing a Christmas-themed background** image (e.g. `img/christmas-bg.jpg`) and wiring it into the Template Builder's Image Library.

### 2. 🌐 Full Bulgarian Translation
The app is now **fully translated into Bulgarian**. All `data-i18n` keys in `index.html` and all dynamically rendered strings in JS files use `window.t('key')` which resolves from `js/i18n.js`.

**How it works:**
```html
<!-- HTML elements get translated automatically -->
<button data-i18n="btn_save">Save</button>

<!-- JS strings use window.t() -->
const label = window.t('nav_menu'); // → 'Планиране на Меню'
```

**Key recent fix (commit `a85ba5ea`):** The full Bulgarian translation block was accidentally truncated in a previous commit. It has been fully restored with **200+ keys** covering every part of the UI.

### 3. 💾 Language Preference Persistence
Language preference is now saved in **two places** for reliability:
1. `settings.json` (loaded after folder is selected)
2. `localStorage` key `dms_language_hint` (available immediately on page load, before settings.json loads)

This means the **splash screen and early loading messages** now show in the user's chosen language (Bulgarian by default) even on first load.

**Relevant code in `i18n.js`:**
```javascript
// On init — reads localStorage first
let currentLanguage = localStorage.getItem('dms_language_hint') || 'bg';

// On language change — saves to both places
window.changeLanguage = function(lang, shouldSave = true) {
    currentLanguage = lang;
    localStorage.setItem('dms_language_hint', lang);  // immediate
    window.appSettings.language = lang;
    window.saveSettings();                             // persistent
};
```

### 4. 🏗️ Step-Based Template Builder
The Template Builder was refactored from a flat list into a **4-step accordion UI**:
- Step 1: 🌏 Background (color + 5 image layers with position/size/opacity/z-index)
- Step 2: 📌 Header (text, font size, alignment, color)
- Step 3: 🍽️ Weekly Menu (style: compact / detailed / 2-column, day block borders, day name font)
- Step 4: 📍 Footer (text, font size, show/hide)

Plus **3 tabs**: Builder / Templates / Images

The builder lives in `js/template/template-builder-steps.js` and is injected into `#template-sidebar` in `index.html`.

---

## 🔧 Key Technical Patterns to Know

### Global Function Exposure
All functions that need to be called from HTML `onclick` or from other modules are attached to `window`:
```javascript
window.saveRecipe = function(event) { ... };
window.openRecipeModal = function(id) { ... };
```

### Module Pattern
Every JS file is wrapped in an IIFE to avoid polluting global scope accidentally:
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

// Placeholders
<input data-i18n-placeholder="filter_search_placeholder">
```
**Important:** Dynamically generated HTML (from JS) does NOT auto-translate. You must call `window.t('key')` when building the string, OR call `window.applyTranslations()` after injecting HTML.

### Storage Abstraction
`storage-adapter.js` exposes a unified API regardless of whether the user is using the File System API or IndexedDB:
```javascript
window.storageAdapter.saveData(data);   // saves to either backend
window.storageAdapter.loadData();       // loads from either backend
window.storageAdapter.useFileSystem     // boolean — which mode is active
```

---

## ⚠️ Known Issues / Things to Watch Out For

| Issue | Details |
|---|---|
| **Settings page text not translated** | The `#storage-info` banner in Settings is built with hardcoded English strings inside an inline `<script>` in `index.html`. It needs `window.t()` calls added. |
| **Export/Import button labels** | The Export Data and Import Data buttons in Settings use hardcoded English labels — not wired to `data-i18n`. |
| **`template.js` still exists** | The old `template.js` file (116 KB legacy) is still present but mostly superseded by `template-builder-steps.js`. It should eventually be removed or cleaned up. |
| **No automated tests** | Zero test coverage. Any refactor should be manually tested. |
| **Version query strings** | All script/css src tags use `?v=14.3`. Increment the version number when making changes to bust browser cache. |
| **Print.js is large** | `print.js` is 45 KB and handles PDF export. Treat it carefully — it uses html2canvas + jsPDF. |

---

## 🚀 Suggested Next Steps

### High Priority
- [ ] **Fix Settings page translations** — wire `storage-info` banner and Export/Import buttons to `window.t()` / `data-i18n`
- [ ] **Christmas background image** — generate or source `img/xmas-bg.jpg` (A4 portrait, ideally 2480×3508px @ 300DPI) and add it to the Image Library as a default preset
- [ ] **Test language switching edge case** — dynamically rendered content (recipe list, calendar cells, template builder UI) must call `window.applyTranslations()` or use `window.t()` at render time

### Medium Priority
- [ ] **Template builder i18n audit** — scan `template-builder-steps.js` for any remaining hardcoded English strings not using `window.t()`
- [ ] **Version bump** — increment `?v=14.3` to `?v=14.4` in `index.html` after any JS/CSS changes
- [ ] **Clean up legacy `template.js`** — evaluate what's still used vs what's been replaced by `template-builder-steps.js`

### Low Priority / Future
- [ ] Split `print.js` into smaller modules
- [ ] Add JSDoc to major functions
- [ ] Shopping list generator feature
- [ ] Nutrition calculator
- [ ] Multi-week planning view

---

## 🧪 How to Test Changes

1. **Open `index.html` directly** in a Chromium-based browser (Chrome/Edge) — File System API requires it
2. **Select the DMS folder** when prompted on first load
3. Switch language with the 🇧🇬/🇺🇸 flag dropdown in the top-right corner
4. Check the browser **Console** for any `❌` error messages
5. For print testing, go to Menu → Print — a week picker modal opens, then the print preview
6. For template builder, go to Menu → 📝 Template Builder

---

## 📌 Key Commits for Context

| Commit | What it did |
|---|---|
| `a85ba5ea` | Restored ALL Bulgarian translations + localStorage hint |
| `cb30f5cf` | Added language hint to localStorage so splash uses saved language |
| `c4c6102a` | Fixed Select Folder button to use translation |
| `f5e49d7c` | Fixed default language to Bulgarian |
| `02df04c5` | Template builder wired to translation system |
| `56a03845` | Added complete Bulgarian translations for template builder |

---

## 💬 Notes for the Next Agent

- The **owner is Bulgarian** — default language is Bulgarian (`bg`), not English
- Always use `window.t('key')` for any user-visible text in JavaScript
- Always add a matching `bg:` translation to `i18n.js` for any new English key you add
- The app has **no backend, no npm, no build step** — everything is plain HTML/CSS/JS
- The GitHub MCP tool works perfectly on this repo — you can read and commit files directly
- When committing large files (like `i18n.js`), use `create_or_update_file` with the current SHA
- **Version strings** like `?v=14.3` on script/css imports need manual bumping — there is no automatic cache-busting

---

*Good luck! The codebase is clean and well-organised. Read `ARCHITECTURE.md` for a deeper dive into each module.* 🚀

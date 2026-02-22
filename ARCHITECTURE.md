# KitchenPro DMS — Architecture Documentation

> **Last Updated:** February 22, 2026  
> **Version:** 14.8  
> **Branch:** `beta`

---

## 📁 Project Structure

```
DMS/
├── index.html                          # Single entry point — the whole app
├── css/
│   ├── styles.css                      # Main UI styles
│   ├── calendar.css                    # Calendar / week view styles
│   └── template-styles.css             # Template builder panel styles
├── js/
│   ├── libs/                           # Vendored libraries (no CDN)
│   │   ├── html2canvas.min.js          # DOM → canvas (used by print.js)
│   │   └── jspdf.umd.min.js            # Canvas → PDF (used by print.js)
│   ├── i18n.js                         # ⭐ All translations (EN + BG)
│   ├── constants.js                    # Centralised magic numbers / defaults
│   ├── storage-adapter.js              # File System API ↔ IndexedDB abstraction
│   ├── store.js                        # CRUD + save/load wiring
│   ├── calendar.js                     # Calendar logic, date helpers, view modes
│   ├── render.js                       # Data → DOM (pure rendering, no events)
│   ├── ui.js                           # Event handlers, modals, navigation
│   ├── ui-combobox.js                  # Reusable combobox/autocomplete widget
│   ├── clock.js                        # Live clock widget in header
│   ├── print.js                        # ⭐ Print / Save Image / Save PDF (v8.1)
│   ├── main.js                         # App boot, splash screen, init sequence
│   ├── template.js                     # Thin init wrapper for TemplateManager
│   ├── template-presets.js             # 6 built-in preset template definitions
│   └── template/
│       └── template-builder-steps.js   # ⭐ Full step-based Template Builder UI
├── data/                               # Runtime data files (user folder, not tracked)
├── img/
│   └── logo.png
└── .github/
    ├── workflows/
    │   └── sync-demo.yml               # CI: auto-syncs main → demo on every push
    └── scripts/
        └── inject-demo.py              # Injects demo-mode.js script tag into index.html
```

---

## 🔄 Module Responsibilities

### Storage Layer

#### `storage-adapter.js`
**Purpose:** Abstracts the two storage backends so the rest of the app never needs to know which one is active.

| Method | What it does |
|---|---|
| `init()` | Auto-detects File System API vs IndexedDB, loads all data |
| `selectFolder()` | Opens folder picker (Chrome/Edge only), saves handle to IndexedDB |
| `save(type, data)` | Unified save — routes to `saveToFileSystem` or `saveToIndexedDB` |
| `exportData()` | Exports all data as a `.json` backup file (download) |
| `importData(file)` | Imports a `.json` backup and saves to active backend |
| `migrateLegacyTemplates()` | One-time migration from old `localStorage` template format |

**Storage backends:**

- **File System API** (Chrome/Edge): data lives in `data/data.json`, `data/menus.json`, `data/settings.json`, `data/templates.json` inside user-selected folder
- **IndexedDB** (Firefox/Safari): stores `recipes`, `ingredients`, `allergens`, `menu`, `settings`, `templates`, `handles` object stores in `KitchenProDB` (v2)

#### `store.js`
**Purpose:** CRUD operations and save/load wiring on top of `storage-adapter.js`.

**Key functions:**
- `window.saveRecipe(event)` / `window.deleteRecipe(id)`
- `window.saveIngredient(event)` / `window.deleteIngredient(id)`
- `window.saveAllergen(event)` / `window.deleteAllergen(id)`
- `window.saveMeal(date, slot, recipeId)` / `window.clearMeal(date, slot)`
- `window.saveSettings()` — persists `window.appSettings`
- `window.saveTemplates()` — persists `window.menuTemplates`
- `window.exportAllData()` / `window.importData(event)`

---

### Core UI Modules

#### `i18n.js`
**Purpose:** All translation strings and language switching logic.
- Supports 🇧🇬 Bulgarian (default) and 🇺🇸 English
- `window.t('key')` — returns translated string for current language
- `window.changeLanguage(lang)` — switches language, saves preference, re-renders
- `window.applyTranslations()` — updates all `data-i18n` and `data-i18n-placeholder` elements
- Language preference stored in both `settings.json` and `localStorage` (`dms_language_hint`) so it's available before folder loads

**⚠️ Rule:** Every user-visible string in JS must use `window.t('key')`. Add matching key to both `en` and `bg` objects.

#### `render.js`
**Purpose:** Pure data → DOM rendering. No event listeners here.
- `window.renderAll()` — re-renders the whole app
- `window.renderRecipes()` / `window.renderIngredients()` / `window.renderAllergens()`
- `window.renderCalendar(date)` — weekly/monthly calendar view
- `window.getRecipeAllergens(recipe)` — derives allergen list from linked ingredients
- `window.getAllergenName(allergen)` — returns display name (i18n-aware)

#### `ui.js`
**Purpose:** All user interaction — clicks, modals, navigation, theme.
- `window.navigateTo(pageId)` — switches active page
- `window.toggleNav()` — hamburger menu open/close
- `window.openRecipeModal(id)` / `window.closeRecipeModal()`
- `window.openIngredientModal(id)` / `window.closeIngredientModal()`
- `window.openAllergenModal(id)` / `window.closeAllergenModal()`
- `window.addIngredientTagToModal(ing)` / `window.addManualAllergenTag(alg)` / `window.addLinkedAllergenTag(alg)`
- `window.updateAutoAllergens()` — live allergen detection as ingredients are added
- `window.setAppTheme(name)` — applies CSS data-theme attribute
- `window.initStyleBuilder()` — delegates to `window.TemplateManager.init()`

**Design principle:** `ui.js` = *what happens when user clicks X*. `render.js` = *how to display X*.

#### `ui-combobox.js`
**Purpose:** Reusable autocomplete/combobox widget used in recipe and ingredient modals.
- `window.initCombobox({ inputId, dropdownId, getItems, onSelect, placeholder })`

---

### Feature Modules

#### `calendar.js`
**Purpose:** Calendar views and date logic.
- Week start/end calculations
- `window.changeMonth(delta)` — navigate forward/backward
- Weekly ↔ Monthly view switching
- Date formatting utilities

#### `print.js` (v8.1 — 41 KB)
**Purpose:** All print and export functionality.

Opens a three-action dialog:
- 🖨️ **Print Menu** — opens styled new tab, triggers `window.print()`, auto-closes via `afterprint` event
- 🖼️ **Save as Image** — html2canvas render → preview modal → PNG download
- 📄 **Save as PDF** — html2canvas render → jsPDF embed → preview modal → PDF download

**Treat this file carefully** — it's the most complex module.

#### `template-builder-steps.js` (78 KB)
**Purpose:** The full step-based Template Builder UI, registered as `window.TemplateManager`.

Four accordion steps:
1. 🌏 **Background** — up to 5 image layers with position/size/opacity/z-index controls
2. 📌 **Header** — text, font, size, color, alignment
3. 🍽️ **Weekly Menu** — day block style, meal slot visibility, ingredient display options
4. 📍 **Footer** — text, font, size, color

Also manages the **Templates tab** (save/load/delete named templates) and **Images tab** (upload, library, delete).

#### `template-presets.js`
**Purpose:** Defines `window.DMSPresets` — array of 6 built-in preset template objects.

Presets: Classic, Modern Minimalist, Colorful & Bold, Professional Corporate, Elegant Casual, Health-Focused.

#### `template.js`
**Purpose:** Thin init wrapper only. Checks for `window.TemplateManager` and calls `.init()` on `DOMContentLoaded`. No logic lives here.

#### `constants.js`
**Purpose:** Centralised `DMS_CONSTANTS` object — layout dimensions, default colours, typography values. Prevents magic numbers scattered across files.

#### `clock.js`
**Purpose:** Live clock and date display in the app header. Self-contained.

#### `main.js`
**Purpose:** App boot sequence.
1. Shows splash screen
2. Calls `storageAdapter.init()`
3. If File System API — prompts folder selection if no saved handle
4. Runs `window.renderAll()` once data is loaded
5. Binds global navigation (`ui.bindNavigation()`)
6. Initialises language from `appSettings`

---

## 🗂️ Data Flow

```
User Action (click)
      ↓
  ui.js  (event handler)
      ↓
  store.js  (CRUD operation)
      ↓
  storage-adapter.js  (persist to File System / IndexedDB)
      ↓
  render.js  (update DOM)
      ↓
User sees result
```

### Example: Adding a Recipe

```javascript
// 1. User clicks "+ Add Recipe"
window.openRecipeModal()       // ui.js — opens modal

// 2. User fills form and submits
window.saveRecipe(event)       // store.js — validates, pushes to window.recipes
  → window.storageAdapter.save('recipes', window.recipes)
  → window.renderRecipes()     // render.js — updates table
```

---

## 💾 Storage Details

### File System API (Chrome/Edge)

```
User Selected Folder/
└── data/
    ├── data.json        # Combined recipes + ingredients + allergens
    ├── menus.json       # Current menu (keyed by date string)
    ├── settings.json    # { language: 'bg' }
    └── templates.json   # Named user templates
```

The folder handle is persisted to IndexedDB (`handles` store) so permission only needs to be re-granted once per browser session, not on every page load.

### IndexedDB (Firefox/Safari)

Database: `KitchenProDB` (version 2)

| Store | Key | Content |
|---|---|---|
| `recipes` | `id` (keyPath) | Recipe objects |
| `ingredients` | `id` (keyPath) | Ingredient objects |
| `allergens` | `id` (keyPath) | Allergen objects |
| `menu` | `'currentMenu'` | Date-keyed menu object |
| `settings` | `'appSettings'` | `{ language }` |
| `templates` | `'menuTemplates'` | Named template objects |
| `handles` | `'rootDirectory'` | FileSystemDirectoryHandle |

---

## 🌐 Internationalisation

- Default language: **Bulgarian (`bg`)**
- All keys live in `js/i18n.js` under `translations.en` and `translations.bg`
- HTML: `<button data-i18n="btn_save">Save</button>` — auto-replaced on language switch
- JS: `window.t('btn_save')` — must be called explicitly for dynamic HTML
- Adding a key: add to both `en` and `bg` objects, then use `data-i18n` or `window.t()`

---

## 🔧 External Dependencies

| Library | Size | Purpose |
|---|---|---|
| `html2canvas.min.js` | 199 KB | Converts DOM to `<canvas>` for print/export |
| `jspdf.umd.min.js` | 364 KB | Generates PDF from canvas image |

Both are vendored locally in `js/libs/` — no CDN, works fully offline.

---

## 🎨 CSS Architecture

| File | What it covers |
|---|---|
| `styles.css` | Global layout, components, themes (default / dark / teal), modals, buttons |
| `calendar.css` | Monthly/weekly grid, meal slots, allergen dots, category badges |
| `template-styles.css` | Template builder sidebar, accordion steps, preview panel |

Themes are applied via `data-theme` on `<body>`. CSS variables control colours.

---

## 🚀 Cache Busting

All `<script>` and `<link>` tags use `?v=14.8`. **Manually increment this version** after any JS/CSS change to bust the browser cache. There is no build process.

---

## ⚡ Known Technical Debt

| Item | Notes |
|---|---|
| No automated tests | Manually test in Chrome/Edge after every change |
| No build step | No minification, no bundling — raw files served directly |
| `print.js` is large (41 KB) | Works well but treat carefully |
| `template-builder-steps.js` is large (78 KB) | Monolithic but well-structured internally |
| Inline `<script>` in `index.html` | The storage info banner uses hardcoded strings, not `window.t()` |

---

## 📖 For New Developers

### Quick Start
1. Open `index.html` directly in **Chrome or Edge**
2. Select your DMS data folder when prompted
3. Start reading `main.js` → `store.js` → `ui.js` → `render.js`

### Debugging Tips

```javascript
console.log(window.recipes);       // current recipe data
console.log(window.currentMenu);   // current menu state
console.log(window.appSettings);   // language etc.
window.renderAll();                 // force full re-render
```

### Adding a New Data Type
1. Add array to `window` globals in `store.js`
2. Add CRUD functions in `store.js`
3. Add `save` call in `storage-adapter.js` (`saveToFileSystem` + `saveToIndexedDB`)
4. Add render function in `render.js`
5. Add modal HTML in `index.html`
6. Add modal handlers in `ui.js`
7. Add translation keys in `i18n.js` (both `en` and `bg`)

---

**Last Updated:** February 22, 2026  
**Version:** 14.8  
**Branch:** `beta`

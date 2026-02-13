# KitchenPro DMS - Architecture Documentation

## 📁 Project Structure

```
DMS/
├── index.html                  # Main HTML entry point
├── css/
│   ├── styles.css              # Main stylesheet (18 KB)
│   ├── calendar.css            # Calendar-specific styles
│   └── template-builder.css    # Template builder UI styles
├── js/
│   ├── libs/                   # External libraries
│   │   ├── html2canvas.min.js  # HTML to canvas conversion
│   │   └── jspdf.umd.min.js    # PDF generation
│   ├── i18n.js                 # Internationalization (EN/BG)
│   ├── constants.js            # Centralized constants
│   ├── store.js                # Data persistence layer
│   ├── calendar.js             # Calendar/week view logic
│   ├── render.js               # DOM rendering functions
│   ├── ui.js                   # UI interactions & modals
│   ├── template.js             # Template builder (LARGE - 116 KB)
│   └── main.js                 # App initialization
└── data/
    └── preset-templates.js     # Predefined templates
```

---

## 🔄 Module Responsibilities

### Core Modules

#### `i18n.js` (26 KB)
**Purpose:** Internationalization support  
**Provides:**
- Translation strings (English & Bulgarian)
- `window.t(key)` - Get translated string
- `window.changeLanguage(lang)` - Switch language
- Auto-updates all `data-i18n` attributes

#### `constants.js` (6.9 KB)
**Purpose:** Centralized configuration  
**Provides:**
- `DMS_CONSTANTS` - All magic numbers and defaults
- Layout dimensions, colors, typography
- Prevents hardcoded values scattered across codebase

#### `store.js` (23.7 KB)
**Purpose:** Data persistence and state management  
**Provides:**
- CRUD operations for recipes, ingredients, allergens
- Menu planning data management
- LocalStorage/FileSystem persistence
- Auto-save functionality
- Sync indicator updates

**Key Functions:**
- `window.saveData()` - Persist all data
- `window.loadData()` - Load from storage
- `window.saveRecipe(event)` - Create/update recipe
- `window.deleteRecipe(id)` - Remove recipe
- Similar functions for ingredients and allergens

---

### UI & Rendering Modules

#### `render.js` (14.9 KB)
**Purpose:** Pure rendering logic (data → DOM)  
**Responsibilities:**
- Convert data structures to HTML
- Populate tables, lists, calendar
- Calculate derived data (allergens from ingredients)
- No user interaction handling

**Key Functions:**
- `window.renderAll()` - Re-render entire app
- `window.renderRecipes()` - Recipe table
- `window.renderIngredients()` - Ingredient table
- `window.renderAllergens()` - Allergen table
- `window.renderCalendar(date)` - Weekly meal slots
- `window.getRecipeAllergens(recipe)` - Calculate allergens

#### `ui.js` (13.3 KB)
**Purpose:** User interactions and modal management  
**Responsibilities:**
- Event handlers for clicks, navigation
- Modal open/close logic
- Tag management in forms
- Theme switching
- Navigation menu behavior

**Key Functions:**
- `window.navigateTo(pageId)` - Page switching
- `window.toggleNav()` - Hamburger menu
- `window.openRecipeModal(id)` - Open recipe form
- `window.addIngredientTagToModal(ing)` - Tag UI
- `window.updateAutoAllergens()` - Live allergen detection

**Design Principle:**  
`ui.js` = "What happens when user clicks X"  
`render.js` = "How to display X"

---

### Feature Modules

#### `calendar.js` (15.8 KB)
**Purpose:** Calendar/week view logic  
**Provides:**
- Week start calculations
- Date formatting utilities
- Week navigation
- View mode switching (weekly/monthly)

**Key Functions:**
- `window.getWeekStart(date)` - Get Monday of week
- `window.changeMonth(delta)` - Navigate weeks/months
- View mode management

#### `template.js` (116 KB) ⚠️ **NEEDS REFACTORING**
**Purpose:** Template builder and print functionality  
**Problems:**
- Too large (2,800+ lines)
- Multiple responsibilities mixed together
- Hard to maintain

**Current Contents:**
- Template UI generation
- Settings management
- Print preview
- Template save/load
- Image upload handling
- Week picker modal
- Print execution

**Planned Refactor** (See Issue #23):
```
js/template/
├── template-manager.js     # Orchestration
├── template-ui.js          # UI rendering
├── template-settings.js    # Settings get/set
├── template-print.js       # Print logic
├── template-storage.js     # Save/load
└── template-modals.js      # Picker dialogs
```

#### `main.js` (9 KB)
**Purpose:** App initialization and startup  
**Responsibilities:**
- Load data on startup
- Initialize all modules
- Bind event listeners
- Show/hide splash screen
- Check for Electron environment

---

## 🗂️ Data Flow

### Typical User Action Flow

```
1. User Action (Button Click)
      ↓
2. ui.js (Event Handler)
      ↓
3. store.js (Data Operation)
      ↓
4. localStorage/FileSystem (Persistence)
      ↓
5. render.js (Update Display)
      ↓
6. User sees result
```

### Example: Adding a Recipe

```javascript
// 1. User clicks "Add Recipe" button
ui.js: window.openRecipeModal()
  → Opens modal, sets up form

// 2. User fills form and clicks Save
ui.js: Form submit event
  ↓
store.js: window.saveRecipe(event)
  → Validates data
  → Adds to window.recipes array
  → Calls window.saveData()
  ↓
store.js: window.saveData()
  → Persists to storage
  → Shows sync indicator
  ↓
render.js: window.renderRecipes()
  → Updates recipe table
  → Recipe now visible
```

---

## 🎨 Styling Architecture

### CSS Organization

**styles.css (18 KB)** - Main stylesheet
- CSS variables for theming
- Component styles (buttons, modals, cards)
- Responsive layouts
- Theme variations (default, dark, teal)

**calendar.css (7.8 KB)** - Calendar-specific
- Weekly view grid
- Meal slot styles
- Allergen dots
- Category indicators

**template-builder.css (3.8 KB)** - Builder UI
- Collapsible sections
- Form controls
- Preview panel
- Layout styles for print

---

## 💾 Data Persistence

### Storage Strategy

The app supports two storage backends:

#### 1. LocalStorage (Web Version)
```javascript
localStorage.setItem('dmsData', JSON.stringify({
  recipes: [...],
  ingredients: [...],
  allergens: [...],
  currentMenu: {...},
  savedTemplates: [...],
  imageUploads: [...]
}));
```

#### 2. FileSystem (Electron Version)
```
User Selected Folder/
├── data/
│   ├── recipes.json
│   ├── ingredients.json
│   ├── allergens.json
│   ├── menu.json
│   ├── templates.json
│   └── pictures/
│       └── [uploaded images]
└── archive/
    └── menus/
        └── [exported PDFs]
```

### Auto-Save
- Triggered after every data modification
- Debounced to prevent excessive writes
- Sync indicator shows save status

---

## 🌐 Internationalization

### Supported Languages
- 🇺🇸 English (default)
- 🇧🇬 Bulgarian

### How It Works

```html
<!-- HTML markup -->
<button data-i18n="btn_save">Save</button>

<!-- JavaScript translation -->
const text = window.t('btn_save'); // Returns "Save" or "Запази"
```

### Adding New Translations

1. Add key to `translations` object in `i18n.js`
2. Use `data-i18n="key"` in HTML
3. Or `window.t('key')` in JavaScript

---

## 🔧 External Dependencies

### PDF Generation Stack

**html2canvas** (199 KB)
- Converts DOM to canvas
- Captures template preview
- Handles CSS rendering

**jsPDF** (364 KB)
- Generates PDF files
- Embeds canvas as image
- Saves to archive folder

### Why Not Use Browser Print?

Browser print dialog is used, but PDF libraries provide:
- Automatic archiving
- Programmatic file naming
- Pre-rendered previews
- Better print templates

---

## ⚡ Performance Considerations

### Current Bottlenecks

1. **template.js is too large** (116 KB)
   - Loads entire template builder on page load
   - Should be lazy-loaded

2. **No code splitting**
   - All JavaScript loads upfront
   - Template builder rarely used but always loaded

3. **Synchronous rendering**
   - Large recipe lists can block UI
   - Should implement virtual scrolling

### Optimization Opportunities

```javascript
// Future: Lazy load template builder
if (pageId === 'style-editor') {
  import('./js/template/index.js').then(module => {
    module.init();
  });
}
```

---

## 🐛 Known Issues

### Tracked in GitHub Issues

- **#22** - Add layout style options to template builder
- **#23** - Code cleanup & refactoring plan (this effort)

### Technical Debt

1. `template.js` needs splitting (Phase 2)
2. No automated tests
3. No build process (future enhancement)
4. Inline styles in calendar rendering (should be CSS classes)

---

## 🚀 Future Improvements

### Phase 2 Refactoring (Next)

- [ ] Split `template.js` into modules
- [ ] Add JSDoc comments
- [ ] Implement lazy loading
- [ ] Create build script for minification

### Feature Roadmap

- [ ] Export/import data (JSON backup)
- [ ] Recipe search and filtering
- [ ] Nutrition calculator
- [ ] Shopping list generator
- [ ] Multi-week planning
- [ ] Recipe sharing

---

## 📖 For New Developers

### Quick Start

1. **Entry Point:** Start reading `main.js`
2. **Data Layer:** Understand `store.js` next
3. **UI Flow:** Follow `ui.js` → `render.js`
4. **Features:** Explore `calendar.js`, `template.js`

### Debugging Tips

```javascript
// Check current data state
console.log(window.recipes);
console.log(window.currentMenu);

// Watch for saves
window.addEventListener('dataSaved', () => {
  console.log('Data saved!');
});

// Force re-render
window.renderAll();
```

### Common Patterns

**Adding a new data type:**
1. Add array to `store.js` data structure
2. Create CRUD functions in `store.js`
3. Add render function in `render.js`
4. Add modal handlers in `ui.js`
5. Create HTML modal in `index.html`
6. Add translations to `i18n.js`

---

## 📝 Code Style

### Conventions

- ✅ Use `window.functionName` for global functions
- ✅ Wrap modules in IIFEs: `(function(window) { ... })(window)`
- ✅ Use `const` for immutable, `let` for mutable
- ✅ Prefer template literals over string concatenation
- ✅ Use `dataset` for HTML data attributes
- ❌ Avoid `var` (legacy)
- ❌ Don't use jQuery (vanilla JS only)

### File Headers

```javascript
// ModuleName - Brief Description (Global Scope)

(function(window) {
    // Module code here
})(window);
```

---

## 🔗 Related Documentation

- [README.md](./README.md) - Project overview
- [Issue #23](https://github.com/zv20/DMS/issues/23) - Refactoring plan
- [Issue #22](https://github.com/zv20/DMS/issues/22) - Layout styles feature

---

**Last Updated:** February 13, 2026  
**Version:** 11.0  
**Maintained by:** Development Team

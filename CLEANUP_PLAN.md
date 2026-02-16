# 🧹 Template System Cleanup Plan
**Date**: February 16, 2026

## ❌ OLD FILES TO DELETE (Unused from old complex system)

All these files are from the old 11-layout system and are NO LONGER USED:

```
js/template/
├─ ❌ template-builder.js          (21KB - old complex builder)
├─ ❌ template-core.js              (11KB - old core)
├─ ❌ template-defaults.js          (5KB - old defaults)
├─ ❌ template-images.js            (9KB - old image handler)
├─ ❌ template-library.js           (3KB - old library)
├─ ❌ template-loader.js            (9KB - old loader)
├─ ❌ template-picker.js            (14KB - old picker)
├─ ❌ template-presets.js           (1KB - old presets)
├─ ❌ template-preview.js           (12KB - old preview)
├─ ❌ template-print.js             (18KB - old print)
├─ ❌ template-renderer.js          (31KB - old renderer)
├─ ❌ template-sections.js          (37KB - old sections)
├─ ❌ template-settings.js          (8KB - old settings)
```

**Total old code**: ~180KB of unused files!

---

## ✅ NEW FILES (Clean, modern system)

```
js/template/
├─ ✅ template-builder-simple.js    (36KB - current simple builder)
└─ ✅ template-builder-steps.js     (NEW - step-by-step accordion builder)
```

---

## 🎯 NEW STEP-BASED BUILDER FEATURES

### **1. Background Section**
- Upload full page background image
- Background color picker
- Opacity slider
- Image saved to: `data/images/backgrounds/`

### **2. Header Section**
- Show/hide toggle
- Text editor
- **Header image upload** (logos, decorations)
  - Image position: left, center, right
  - Image size: small, medium, large
  - Saved to: `data/images/header/`
- Alignment
- Font size, color

### **3. Weekly Menu Section**
- Template style (Compact/Detailed)
- **Day Block Styling:**
  - Border (show/hide, color, thickness)
  - Background color
  - Padding
- **Day Name:**
  - Font size
  - Font color
  - Font weight (bold/normal)
- **Meals:**
  - Font size
  - Line height
- **Ingredients:**
  - Font color
  - Font size
- **Allergens:**
  - Highlight color
  - Underline (yes/no)
  - Bold/Italic
- Content toggles (portions, calories, ingredients)

### **4. Footer Section**
- Show/hide toggle
- Text editor
- **Footer image upload** (logos, contact info graphics)
  - Image position: left, center, right
  - Image size: small, medium, large
  - Saved to: `data/images/footer/`
- Alignment
- Font size

---

## 📂 NEW IMAGE FOLDER STRUCTURE

```
data/
└── images/
    ├── backgrounds/     ← Full page backgrounds
    ├── header/          ← Header logos/decorations
    └── footer/          ← Footer logos/icons
```

---

## 🔄 ACCORDION UI

```
┌─────────────────────────────────────────────┐
│ ▼ 1. BACKGROUND                             │
│   Controls visible...                       │
├─────────────────────────────────────────────┤
│ ▶ 2. HEADER                                 │
├─────────────────────────────────────────────┤
│ ▶ 3. WEEKLY MENU                            │
├─────────────────────────────────────────────┤
│ ▶ 4. FOOTER                                 │
└─────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Less overwhelming
- ✅ Organized workflow
- ✅ Focus on one section at a time
- ✅ Professional UX

---
## ⚠️ BEFORE DELETING OLD FILES:

1. ✅ Build new step-based builder
2. ✅ Test thoroughly
3. ✅ Migrate any needed functionality
4. ✅ Update index.html
5. ✅ Get user approval
6. ❌ Then delete old files

---

## 🚀 NEXT STEPS:

1. **Create** `template-builder-steps.js` with accordion UI
2. **Add** header/footer image upload functionality
3. **Test** with real data
4. **Switch** index.html to new builder
5. **Delete** all old template files
6. **Clean up** index.html (remove references to old files)

---

**Result**: Clean, modern, step-based template builder with personality! 🎨

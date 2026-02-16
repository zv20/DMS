# Template System Cleanup
**Date**: February 16, 2026

## What Was Done

### ✅ Created New Simplified System

**File**: `js/template/template-builder-simple.js`

A brand new, clean template builder that matches your real-world Bulgarian school menu format.

### 🎯 Features

#### **Simple Controls**
- ✅ Show/hide: Date range, Ingredients, Calories, Portions
- ✅ Text size: Small (10pt), Medium (12pt), Large (14pt)
- ✅ Allergen highlight color picker (red by default)
- ✅ Day name style: Bold or Normal
- ✅ Header text customization

#### **Background Images** 🆕
- ✅ Upload background images
- ✅ Images saved to `data/images/backgrounds/`
- ✅ Background opacity slider (0-100%)
- ✅ Fallback background color
- ✅ Remove background button

#### **Clean Bulgarian Format**
```
Седмично меню
13.02-17.02 2026г.

Понеделник
1. Супа топчета - 150гр; кайма БДС, лук, морков, ориз, яйца, кис.мляко БДС ККАЛ 129
2. Зрял боб яхния - 150гр; боб, лук, морков, джоджен, сл.олио, сол, брашно ККАЛ 175
3. Плод - 150-200гр.
4. Филийки хляб по Утвърден стандарт / глутен /

Вторник
...
```

### 📂 New Folder Structure

```
data/
├── data.json
├── menus.json
├── settings.json
├── templates.json
├── images/                    ← NEW
│   └── backgrounds/           ← Background images stored here
│       ├── background1.jpg
│       ├── background2.png
│       └── ...
└── archive/
    └── menus/
```

### 🗑️ Files To Be Removed (Old System)

These files contain the overcomplicated old template system with 11 layouts:

- ❌ `js/template/template-builder.js` (old version with 11 layouts)
- ❌ `js/template/template-renderer.js` (if it exists - not needed anymore)

**Note**: Do NOT delete these yet until the new system is tested and working!

### 🔄 Files To Update

#### **index.html**
Change script reference from:
```html
<script src="js/template/template-builder.js"></script>
```

To:
```html
<script src="js/template/template-builder-simple.js"></script>
```

#### **print.js**
Update to use new simple builder:
```javascript
// Old: window.templateBuilder
// New: window.simpleTemplateBuilder
```

### 🎨 Template Settings Structure

**Old (Complex)**:
```javascript
{
  layoutStyle: 'elegant-single', // 11 options!
  showHeader: true,
  headerText: 'Weekly Meal Plan',
  headerAlignment: 'center',
  headerSize: '28',
  showDateRange: true,
  dateFormat: 'long',
  dayBlockBg: '#ffffff',
  dayBlockBorder: '#e0e0e0',
  dayBlockPadding: '15',
  dayNameSize: '18',
  dayNameColor: '#333333',
  dayNameWeight: 'bold',
  showMealTitles: true,
  mealTitleSize: '14',
  mealTitleColor: '#666666',
  showIngredients: true,
  ingredientLayout: 'list',
  numberingStyle: 'none',
  showFooter: true,
  footerText: 'Meal plan created with DMS',
  backgroundColor: '#f5f5f5',
  showBranding: true,
  separatorStyle: 'line',
  pageBorder: false
  // ... and more!
}
```

**New (Simple)**:
```javascript
{
  // Content
  showDateRange: true,
  showIngredients: true,
  showCalories: true,
  showPortions: true,
  
  // Style
  textSize: 'medium', // small, medium, large
  allergenColor: '#ff0000',
  dayNameStyle: 'bold',
  
  // Background
  backgroundImage: null, // filename
  backgroundColor: '#ffffff',
  backgroundOpacity: 0.8,
  
  // Header
  headerText: 'Седмично меню',
  showHeader: true
}
```

### 📊 Comparison

| Feature | Old System | New System |
|---------|-----------|------------|
| **Layout Options** | 11 complex layouts | 1 practical format |
| **Settings Count** | 25+ options | 11 essential options |
| **Code Lines** | ~800+ lines | ~600 lines |
| **Complexity** | High | Low |
| **Bulgarian Format** | ❌ English focused | ✅ Bulgarian native |
| **Background Images** | ❌ No | ✅ Yes |
| **Allergen Highlighting** | Basic | ✅ Customizable color |
| **File Size** | Large | Smaller |
| **Maintenance** | Difficult | Easy |

### ✅ Benefits of New System

1. **Simpler** - Only options you actually need
2. **Cleaner** - Bulgarian format matches your example
3. **Practical** - Designed for real-world school menu printing
4. **Extensible** - Background images for branding
5. **Maintainable** - Less code, easier to modify
6. **Familiar** - Matches format you're already using

### 🧪 Testing Checklist

- [ ] Load template builder in browser
- [ ] Verify all controls work
- [ ] Upload background image
- [ ] Check image saved to `data/images/backgrounds/`
- [ ] Adjust opacity slider
- [ ] Change allergen color
- [ ] Preview with real menu data
- [ ] Save template
- [ ] Load saved template
- [ ] Print menu
- [ ] Verify allergens highlighted in red
- [ ] Test on different browsers

### 🚀 Migration Path

1. **Phase 1**: Keep both systems (current)
   - New simplified builder available
   - Old builder still works
   - User can choose

2. **Phase 2**: Test new system
   - Use new builder for 1-2 weeks
   - Verify all features work
   - Collect feedback

3. **Phase 3**: Remove old system
   - Delete `template-builder.js` (old)
   - Delete `template-renderer.js` (if exists)
   - Update all references
   - Clean up templates.json (remove old complex settings)

### 📝 Notes

- Background images are stored in File System API folders (Chrome/Edge)
- For Firefox/Safari (IndexedDB), images are converted to base64
- Templates auto-save to unified storage system
- Compatible with existing backup/export system
- Allergen detection uses existing ingredient allergen data

### 🎯 Next Steps

1. Update `index.html` to use new simplified builder
2. Test background image upload
3. Verify print output matches format
4. Get user approval
5. Remove old system files

---

**Result**: Clean, practical template system focused on real Bulgarian school menu format! 🎉

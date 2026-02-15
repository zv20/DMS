# Template Wizard Implementation Guide

## 🎉 Complete Implementation Status

All 7 phases of the Template Wizard have been successfully implemented!

---

## 📁 File Structure

```
DMS/
├── js/template/
│   ├── template-wizard.js        # Main wizard controller (Phase 1)
│   ├── wizard-steps.js           # Steps 1-4 definitions (Phases 2-5)
│   ├── wizard-step5.js           # Step 5: Content Options (Phase 6)
│   └── wizard-step6.js           # Step 6: Preview & Save (Phase 7)
└── css/
    └── wizard-styles.css         # Complete wizard styling (All phases)
```

---

## 🚀 Integration Instructions

### Step 1: Add HTML Structure

Add this to your HTML file (e.g., `meal-plan.html` or `template-builder.html`):

```html
<!-- Template Builder Container -->
<div id="templateBuilder" class="container">
    <!-- Mode Switcher -->
    <div class="mode-switcher">
        <button class="mode-btn" data-mode="wizard">🧙 Wizard Mode</button>
        <button class="mode-btn" data-mode="advanced">⚙️ Advanced Mode</button>
    </div>

    <!-- Wizard Container -->
    <div id="wizardContainer" class="wizard-container" style="display: none;">
        <!-- Wizard content will be dynamically inserted here -->
    </div>

    <!-- Advanced Mode Container -->
    <div id="advancedContainer" class="advanced-container" style="display: none;">
        <!-- Your existing advanced template builder -->
    </div>
</div>
```

### Step 2: Include CSS

Add the wizard stylesheet to your `<head>`:

```html
<link rel="stylesheet" href="css/wizard-styles.css">
```

### Step 3: Include JavaScript Files

Add these scripts before your closing `</body>` tag **in this order**:

```html
<!-- Wizard Scripts (in order!) -->
<script src="js/template/wizard-steps.js"></script>
<script src="js/template/wizard-step5.js"></script>
<script src="js/template/wizard-step6.js"></script>
<script src="js/template/template-wizard.js"></script>

<!-- Initialize Wizard -->
<script>
    // Initialize wizard when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Mode switcher logic
        const modeBtns = document.querySelectorAll('.mode-btn');
        const wizardContainer = document.getElementById('wizardContainer');
        const advancedContainer = document.getElementById('advancedContainer');
        
        modeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                
                // Update active button
                modeBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Show/hide containers
                if (mode === 'wizard') {
                    wizardContainer.style.display = 'block';
                    advancedContainer.style.display = 'none';
                    
                    // Initialize wizard if not already done
                    if (!window.templateWizard) {
                        window.templateWizard = new TemplateWizard();
                    }
                } else {
                    wizardContainer.style.display = 'none';
                    advancedContainer.style.display = 'block';
                }
            });
        });
        
        // Auto-select wizard mode on load
        document.querySelector('[data-mode="wizard"]').click();
    });
</script>
```

---

## ✨ Features Overview

### Phase 1: Core Wizard Structure ✅
- Modal-style wizard interface
- Progress bar with step indicators
- Navigation buttons (Previous/Next/Finish)
- Step validation
- Data persistence across steps

### Phase 2: Step 1 - Layout Selection ✅
**11 Layout Options:**
- **Modern:** Grid Cards, Timeline, Minimalist, Magazine, Bordered Cards, Checklist
- **Classic:** Elegant Single, Single Column, Two Column, Table, Compact Cards

**Features:**
- Visual preview cards with icons
- Click to select
- Categories (Modern vs Classic)
- Current selection display

### Phase 3: Step 2 - Week Styling ✅
**Day Header Customization:**
- Font size slider (0.8em - 2em)
- Color picker

**Day Block Customization:**
- Background color
- Border color
- Padding slider (5-30px)
- Spacing slider (5-40px)

**Features:**
- Live preview of sample day
- Real-time updates

### Phase 4: Step 3 - Meal Display Options ✅
**Display Toggles:**
- Show/hide meal titles
- Show/hide ingredients (with style options)
- Show/hide portion sizes
- Show/hide calories

**Allergen Highlighting:**
- Enable/disable highlighting
- Style options: Underline, Bold, Background

**Features:**
- Live preview with 2 sample meals
- Conditional sub-options

### Phase 5: Step 4 - Typography & Colors ✅
**Quick Themes (One-Click Apply):**
- Orange (Default)
- Teal Fresh
- Purple Dream
- Blue Ocean
- Dark Mode
- Rose Gold

**Font Controls:**
- Header text size (1-3em)
- Meal text size (0.8-1.5em)

**Custom Colors:**
- Primary color
- Background color
- Text color

**Features:**
- Visual theme preview cards
- Live preview with full meal plan

### Phase 6: Step 5 - Content Options ✅
**Header:**
- Show/hide toggle
- Custom text input
- Alignment (left/center/right)

**Date Range:**
- Show/hide toggle
- Format options: Short, Long, Numeric

**Footer:**
- Show/hide toggle
- Custom text input

**Page Options:**
- Page border toggle

**Features:**
- Conditional display of options
- Live preview

### Phase 7: Step 6 - Preview & Save ✅
**Preview Modes:**
- Desktop view
- Tablet view
- Mobile view

**Full Preview:**
- 3 sample days (Monday-Wednesday)
- All customizations applied
- Realistic meal data

**Settings Summary:**
- Layout choice
- Theme colors
- Display options
- Header/Footer status

**Actions:**
- 💾 **Save Template** - Saves to localStorage
- 📄 **Export PDF** - (Placeholder for future)
- 🖨️ **Print** - Uses window.print()
- 🔄 **Start Over** - Reset wizard

---

## 💾 Data Storage

Templates are saved to `localStorage` with this structure:

```javascript
{
    id: 1234567890,
    name: "My Weekly Meal Plan",
    createdAt: "2026-02-15T17:00:00Z",
    data: {
        // Step 1
        layoutStyle: "grid",
        
        // Step 2
        dayHeaderSize: "1.2em",
        dayHeaderColor: "#333333",
        dayBlockBg: "#ffffff",
        dayBlockBorder: "#ddd",
        dayBlockPadding: 15,
        daySpacing: 15,
        
        // Step 3
        showMealTitles: true,
        showIngredients: true,
        ingredientDisplay: "list",
        showPortions: true,
        showCalories: false,
        highlightAllergens: true,
        allergenStyle: "underline",
        
        // Step 4
        primaryColor: "#ff6b35",
        backgroundColor: "#ffffff",
        textColor: "#333333",
        headerFontSize: 2,
        mealFontSize: 1,
        
        // Step 5
        showHeader: true,
        headerText: "Weekly Meal Plan",
        headerAlignment: "center",
        showDateRange: true,
        dateFormat: "long",
        showFooter: false,
        footerText: "Prepared with love",
        showPageBorder: true,
        
        // Step 6
        templateName: "My Weekly Meal Plan"
    }
}
```

---

## 🎨 Customization

### Adding New Themes

Edit `js/template/wizard-steps.js` and add to the `themes` array:

```javascript
themes: [
    // ... existing themes
    {
        name: 'My Custom Theme',
        primaryColor: '#your-color',
        backgroundColor: '#your-bg',
        textColor: '#your-text'
    }
]
```

### Adding New Layouts

Edit `js/template/wizard-steps.js` and add to the `layouts` array:

```javascript
layouts: [
    // ... existing layouts
    {
        id: 'my-layout',
        name: 'My Layout',
        description: 'Description here',
        icon: '🎯',
        category: 'Modern'
    }
]
```

---

## 🧪 Testing Checklist

### Phase 1-2: Core & Layout
- [ ] Wizard opens correctly
- [ ] Progress bar updates
- [ ] Can navigate between steps
- [ ] Layout selection works
- [ ] Selected layout persists

### Phase 3: Week Styling
- [ ] All sliders work
- [ ] Color pickers update preview
- [ ] Preview updates in real-time
- [ ] Values persist when navigating back

### Phase 4: Meal Display
- [ ] All checkboxes toggle correctly
- [ ] Sub-options appear/disappear
- [ ] Radio buttons work
- [ ] Allergen styles preview correctly

### Phase 5: Typography
- [ ] All 6 themes apply correctly
- [ ] Font sliders update preview
- [ ] Custom colors work
- [ ] Theme selection persists

### Phase 6: Content Options
- [ ] Header/footer toggles work
- [ ] Text inputs update preview
- [ ] Alignment options work
- [ ] Date formats display correctly
- [ ] Border toggle works

### Phase 7: Preview & Save
- [ ] Full preview displays correctly
- [ ] Preview modes change width
- [ ] Template name is required
- [ ] Save button stores data
- [ ] Print button works
- [ ] Start over resets wizard
- [ ] Settings summary is accurate

---

## 🐛 Troubleshooting

### Wizard doesn't appear
- Check that all JS files are loaded in correct order
- Verify `#wizardContainer` exists in HTML
- Check browser console for errors

### Preview not updating
- Ensure wizard data object is being updated
- Check that update functions are being called
- Verify preview element IDs match

### Step 5 or 6 not showing
- Confirm `wizard-step5.js` and `wizard-step6.js` are loaded
- Check that steps are being pushed to steps array
- Verify steps array length in console

### Styles not applying
- Confirm `wizard-styles.css` is loaded
- Check for CSS conflicts with existing styles
- Verify class names match between JS and CSS

---

## 📈 Future Enhancements

### Potential Additions:
1. **PDF Export** - Implement actual PDF generation
2. **Template Sharing** - Export/import template JSON
3. **More Layouts** - Add additional layout options
4. **Font Family Selection** - Let users choose fonts
5. **Image Upload** - Add custom header images
6. **Recipe Integration** - Link meals to full recipes
7. **Nutrition Summary** - Calculate total daily nutrition
8. **Multi-week Support** - Create templates for multiple weeks
9. **Meal Categories** - Beyond breakfast/lunch/dinner
10. **Template Library** - Pre-made templates to start from

---

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review console errors
3. Verify file paths
4. Test in different browsers

---

## 🎯 Summary

**Total Implementation:**
- ✅ 7 Phases complete
- ✅ 6 Interactive steps
- ✅ 11 Layout options
- ✅ 6 Theme presets
- ✅ 30+ customization options
- ✅ Real-time previews
- ✅ Complete data persistence
- ✅ Mobile responsive

**Files Created:**
- `template-wizard.js` (core)
- `wizard-steps.js` (steps 1-4)
- `wizard-step5.js` (step 5)
- `wizard-step6.js` (step 6)
- `wizard-styles.css` (complete styling)

**Ready to use!** 🚀

---

*Last updated: February 15, 2026*
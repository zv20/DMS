# Template Wizard Implementation Plan

## 🎯 Goal
Transform the template builder into a guided step-by-step wizard that makes it easy for users to create custom meal plan templates without feeling overwhelmed.

## 📋 Overview
- **Branch**: `feature/template-wizard`
- **Approach**: Create new wizard system alongside existing builder (can toggle between modes)
- **Timeline**: Implement in phases
- **Priority**: User experience and simplicity

---

## 🗂️ Implementation Phases

### **PHASE 1: Core Wizard Structure** ✅
**Goal**: Build the wizard navigation and step management system

#### Files to Create:
1. `js/template/template-wizard.js` - Main wizard controller
2. `css/wizard-styles.css` - Wizard-specific styling
3. `js/template/wizard-steps.js` - Individual step definitions

#### Tasks:
- [ ] Create wizard navigation (Previous/Next buttons, progress bar)
- [ ] Implement step state management
- [ ] Add step validation before proceeding
- [ ] Create smooth step transitions
- [ ] Add progress indicator (Step 1 of 6)

#### Key Features:
```javascript
class TemplateWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.wizardData = {}; // Collected settings
    }
    
    nextStep() { ... }
    previousStep() { ... }
    goToStep(num) { ... }
    validateStep() { ... }
    saveProgress() { ... }
}
```

---

### **PHASE 2: Step 1 - Layout Selection** 📐
**Goal**: Visual layout picker with previews

#### Implementation:
- [ ] Create layout preview cards (all 11 layouts)
- [ ] Add thumbnail images or CSS previews
- [ ] Implement selection highlighting
- [ ] Show brief description of each layout
- [ ] Add search/filter by layout type

#### UI Design:
```
┌─────────────────────────────────────┐
│   Step 1: Choose Your Layout        │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                      │
│   ┌───────┐  ┌───────┐  ┌───────┐ │
│   │ Grid  │  │Timeline│  │Minimal│ │
│   │ Cards │  │ Style │  │ Clean │ │
│   └───────┘  └───────┘  └───────┘ │
│                                      │
│   [Selected: Grid Cards]            │
│                                      │
│             [Next Step →]           │
└─────────────────────────────────────┘
```

---

### **PHASE 3: Step 2 - Week Styling** 🗓️
**Goal**: Customize how days of the week appear

#### Implementation:
- [ ] Day header customization
- [ ] Day block styling (background, border, padding)
- [ ] Option: "Apply to all days" or customize individually
- [ ] Live preview of a sample day

#### Settings:
- Day name font size
- Day name color
- Day block background
- Day block border style
- Spacing between days

---

### **PHASE 4: Step 3 - Meal Display Options** 🍽️
**Goal**: Choose what meal information to show and how

#### Implementation:
- [ ] Checkboxes for show/hide options
- [ ] Meal title display toggle
- [ ] Ingredient display options (list, inline, hidden)
- [ ] Portion size visibility
- [ ] Calorie display toggle
- [ ] Allergen highlighting preferences

#### UI:
```
✅ Show meal titles
✅ Show ingredients (○ List  ● Inline  ○ Hidden)
✅ Show portion sizes
✅ Show calories
✅ Highlight allergens
   ↳ Style: [Underline ▼] Color: [🔴]
```

---

### **PHASE 5: Step 4 - Typography & Colors** 🎨
**Goal**: Font and color customization

#### Implementation:
- [ ] Header font size slider
- [ ] Day name font size slider
- [ ] Meal text font size slider
- [ ] Color pickers for:
  - Primary color (headers, accents)
  - Background color
  - Text color
  - Border colors
- [ ] Theme presets (Orange, Teal, Dark, etc.)

---

### **PHASE 6: Step 5 - Content Options** ✅
**Goal**: Header, footer, and additional content settings

#### Implementation:
- [ ] Show/hide header toggle
- [ ] Custom header text input
- [ ] Header alignment (left, center, right)
- [ ] Show/hide date range
- [ ] Date format options
- [ ] Show/hide footer
- [ ] Custom footer text
- [ ] Page border toggle

---

### **PHASE 7: Step 6 - Preview & Save** 👀
**Goal**: Final preview and template saving

#### Implementation:
- [ ] Full-size preview with real meal data
- [ ] "Preview with my meals" button
- [ ] Template name input
- [ ] Save template button
- [ ] Export options (PDF, Print)
- [ ] "Start Over" button
- [ ] "Switch to Advanced Mode" link

#### Preview Features:
- Toggle between sample data and user's actual meals
- Zoom controls
- Full-screen preview mode

---

## 🎨 UI/UX Requirements

### Navigation:
```
┌────────────────────────────────────────┐
│  Step 2 of 6: Week Styling            │
│  ━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░  │  (Progress bar)
│                                        │
│  [Step content here]                   │
│                                        │
│  [← Previous]         [Next Step →]   │
└────────────────────────────────────────┘
```

### Key UX Principles:
1. **Clear Progress** - Always show which step user is on
2. **Non-destructive** - Can go back and change previous steps
3. **Save Progress** - Auto-save to localStorage
4. **Visual Feedback** - Live previews whenever possible
5. **Helpful Tips** - Tooltips and examples for each option
6. **Mobile-Friendly** - Stack options vertically on small screens

---

## 🔄 Integration with Existing System

### Mode Switcher:
Add toggle in Template Builder page:
```html
<div class="mode-switcher">
  <button class="mode-btn active">🧙 Wizard Mode</button>
  <button class="mode-btn">⚙️ Advanced Mode</button>
</div>
```

### Data Compatibility:
Wizard should output the same settings object as current builder:
```javascript
{
  layoutStyle: 'grid',
  showHeader: true,
  headerText: 'Weekly Meal Plan',
  // ... all existing settings
}
```

---

## 📁 File Structure

```
DMS/
├── js/
│   └── template/
│       ├── template-builder.js      (existing - advanced mode)
│       ├── template-renderer.js     (existing - no changes)
│       ├── template-wizard.js       (NEW - wizard controller)
│       └── wizard-steps.js          (NEW - step definitions)
├── css/
│   ├── template-styles.css          (existing)
│   └── wizard-styles.css            (NEW - wizard UI)
└── index.html                       (update to load wizard)
```

---

## ✅ Testing Checklist

### Phase 1:
- [ ] All steps navigate correctly
- [ ] Progress bar updates
- [ ] Previous/Next buttons work
- [ ] Can't skip required fields

### Phase 2-6:
- [ ] Each step saves data correctly
- [ ] Live previews update instantly
- [ ] Settings persist when going back
- [ ] Mobile responsive on all steps

### Final:
- [ ] Generated template matches preview
- [ ] Saved templates load correctly
- [ ] Export/print works
- [ ] Can switch between Wizard/Advanced modes

---

## 🚀 Rollout Strategy

1. **Phase 1**: Build core wizard structure (can show empty steps)
2. **Phase 2-3**: Implement Steps 1-2 (layout and week styling)
3. **Phase 4-5**: Implement Steps 3-4 (meal options and typography)
4. **Phase 6**: Implement Step 5-6 (content and preview)
5. **Testing**: Full QA with real data
6. **Merge**: Merge `feature/template-wizard` → `main`

---

## 📝 Notes & Decisions

### Design Decisions:
- Keep existing template-builder.js as "Advanced Mode"
- Wizard is default for new users
- Advanced users can switch modes anytime
- Wizard auto-saves progress to localStorage
- Each step validates before allowing "Next"

### Future Enhancements:
- Import/export wizard presets
- Template marketplace/sharing
- AI-suggested designs based on preferences
- A/B testing different wizard flows

---

## 🎯 Success Metrics

- ✅ Users complete templates faster
- ✅ Fewer abandoned template creations
- ✅ More diverse template usage (not just default)
- ✅ Positive user feedback on ease of use
- ✅ Mobile template creation increases

---

**Last Updated**: February 15, 2026
**Status**: Planning Phase - Ready for Implementation
**Next Action**: Begin Phase 1 - Core Wizard Structure
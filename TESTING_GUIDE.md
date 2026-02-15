# 🧪 Template Wizard Testing Guide

## Getting Started

### 1. Open Test Page
Open `test-wizard.html` in your browser:
```
file:///path/to/DMS/test-wizard.html
```

Or use a local server:
```bash
# Using Python
python -m http.server 8000
# Then visit: http://localhost:8000/test-wizard.html

# Using Node.js (with npx)
npx http-server
# Then visit: http://localhost:8080/test-wizard.html
```

### 2. Check Initialization

When the page loads, you should see:
- ✅ Purple gradient background
- ✅ Header: "Template Wizard Test"
- ✅ Green badge: "All 7 Phases Implemented"
- ✅ Mode switcher with "Wizard Mode" active (orange)
- ✅ Progress bar showing "Step 1 of 6"
- ✅ Debug panel at bottom showing initialization logs
- ✅ An alert showing integrity check results

**Expected Integrity Check Results:**
```
✅ WizardSteps loaded
   - Steps: 6
   - Layouts: 11
   - Themes: 6
✅ TemplateWizard class loaded
✅ Wizard instance initialized
   - Current step: 1
✅ Wizard UI rendered
```

If you see any ❌ errors, check browser console (F12) for details.

---

## 📝 Step-by-Step Testing

### Step 1: Layout Selection

**What to test:**
1. ✅ **Visual Check**: See 11 layout cards with icons
2. ✅ **Categories**: Verify "Modern" (6 cards) and "Classic" (5 cards) sections
3. ✅ **Click a Layout**: Card should highlight with orange border and background
4. ✅ **Selection Display**: Bottom shows "Selected: [Layout Name]"
5. ✅ **Switch Selections**: Click different layouts - only one should be selected
6. ✅ **Navigation**: "Next Step" button should be enabled

**Test Each Layout:**
- [ ] Grid Cards 🎴
- [ ] Timeline ⏱️
- [ ] Minimalist ✨
- [ ] Magazine 📰
- [ ] Bordered Cards 🖼️
- [ ] Checklist ☑️
- [ ] Elegant Single 🎯
- [ ] Single Column 📄
- [ ] Two Column 📑
- [ ] Table 📊
- [ ] Compact Cards 🗂️

**Click "Next Step"** →

---

### Step 2: Week Styling

**What to test:**
1. ✅ **Day Header Section**:
   - [ ] Drag "Font Size" slider (0.8em - 2em)
   - [ ] Value updates next to slider
   - [ ] Preview updates in real-time
   - [ ] Click color picker, choose a color
   - [ ] Preview header color changes

2. ✅ **Day Block Section**:
   - [ ] Change background color
   - [ ] Change border color
   - [ ] Adjust padding slider (5-30px)
   - [ ] Adjust spacing slider (5-40px)
   - [ ] All changes reflect in preview

3. ✅ **Live Preview**:
   - [ ] Shows "Monday" sample
   - [ ] Has 3 meals (Breakfast, Lunch, Dinner)
   - [ ] Styling matches your selections

4. ✅ **Navigation**:
   - [ ] Click "Previous" - goes back to Step 1
   - [ ] Click "Next" again - returns to Step 2 with saved settings

**Try extreme values:**
- Set font size to 0.8em (very small)
- Set font size to 2em (very large)
- Set padding to 5px (tight)
- Set padding to 30px (spacious)

**Click "Next Step"** →

---

### Step 3: Meal Display Options

**What to test:**
1. ✅ **Display Options**:
   - [ ] Uncheck "Show meal titles" - preview removes "1. Breakfast" labels
   - [ ] Check it back - labels reappear
   - [ ] Uncheck "Show ingredients" - ingredient text disappears
   - [ ] Check it back, select "inline" - ingredients appear in parentheses
   - [ ] Select "list" - ingredients show as bullet list
   - [ ] Uncheck "Show portion sizes" - portions disappear
   - [ ] Uncheck "Show calories" - verify it was unchecked by default
   - [ ] Check "Show calories" - calorie counts appear

2. ✅ **Allergen Highlighting**:
   - [ ] Check "Highlight allergens in meal names"
   - [ ] Sub-options appear (style selection)
   - [ ] Select "Underline" - allergens are underlined in preview
   - [ ] Select "Bold" - allergens are bold
   - [ ] Select "Background" - allergens have colored background
   - [ ] Uncheck allergen highlighting - options disappear

3. ✅ **Live Preview**:
   - [ ] Shows 2 complete meals
   - [ ] All toggles update preview instantly
   - [ ] Conditional options only appear when parent is checked

**Test combinations:**
- All options ON
- All options OFF
- Only meal titles ON
- Only ingredients and portions ON

**Click "Next Step"** →

---

### Step 4: Typography & Colors

**What to test:**
1. ✅ **Quick Themes**:
   - [ ] Click "Orange (Default)" - preview turns orange
   - [ ] Click "Teal Fresh" - preview turns teal
   - [ ] Click "Purple Dream" - purple with gray background
   - [ ] Click "Blue Ocean" - professional blue
   - [ ] Click "Dark Mode" - dark background, yellow accents
   - [ ] Click "Rose Gold" - pink/rose colors
   - [ ] Selected theme has orange border
   - [ ] Color pickers update to match theme

2. ✅ **Font Sizes**:
   - [ ] Drag "Header Text Size" (1-3em)
   - [ ] Value shows next to slider
   - [ ] Preview header size changes
   - [ ] Drag "Meal Text Size" (0.8-1.5em)
   - [ ] Preview meal text size changes

3. ✅ **Custom Colors**:
   - [ ] Click primary color picker
   - [ ] Choose a custom color
   - [ ] Hex value updates
   - [ ] Preview updates
   - [ ] Repeat for background color
   - [ ] Repeat for text color

4. ✅ **Live Preview**:
   - [ ] Shows "Weekly Meal Plan" header
   - [ ] Shows Monday with 3 meals
   - [ ] Uses all selected colors and fonts
   - [ ] Updates in real-time

**Test workflow:**
1. Apply a theme
2. Adjust font sizes
3. Tweak one color manually
4. Apply a different theme - all colors change

**Click "Next Step"** →

---

### Step 5: Content Options

**What to test:**
1. ✅ **Header Section**:
   - [ ] Uncheck "Show header" - options disappear, preview has no header
   - [ ] Check it back - text input and alignment appear
   - [ ] Change text to "My Meal Plan"
   - [ ] Preview updates immediately
   - [ ] Select "Left" alignment - header moves left
   - [ ] Select "Center" - header centers
   - [ ] Select "Right" - header moves right

2. ✅ **Date Range Section**:
   - [ ] Uncheck "Show date range" - format options disappear
   - [ ] Check it back - format options appear
   - [ ] Select "Short" - shows "Feb 15 - Feb 21, 2026"
   - [ ] Select "Long" - shows "February 15 - February 21, 2026"
   - [ ] Select "Numeric" - shows "02/15/2026 - 02/21/2026"

3. ✅ **Footer Section**:
   - [ ] Check "Show footer" - text input appears
   - [ ] Change text to "Made by [Your Name]"
   - [ ] Preview shows footer at bottom
   - [ ] Uncheck - footer disappears

4. ✅ **Page Options**:
   - [ ] Uncheck "Show page border" - border disappears
   - [ ] Check it back - colored border appears

5. ✅ **Live Preview**:
   - [ ] Shows complete page layout
   - [ ] Header with alignment
   - [ ] Date in selected format
   - [ ] Sample Monday content
   - [ ] Footer (if enabled)
   - [ ] Border (if enabled)

**Test all combinations:**
- Header only
- Header + Date
- Header + Date + Footer
- Everything ON
- Everything OFF

**Click "Next Step"** →

---

### Step 6: Preview & Save (FINAL STEP)

**What to test:**
1. ✅ **Template Name**:
   - [ ] Field is empty by default
   - [ ] Enter "Test Template 1"
   - [ ] This is required for saving

2. ✅ **Preview Modes**:
   - [ ] Click "🖥️ Desktop" - full width preview
   - [ ] Click "📱 Tablet" - medium width (768px)
   - [ ] Click "📱 Mobile" - narrow width (375px)
   - [ ] Active button has orange background

3. ✅ **Template Preview**:
   - [ ] Shows complete template
   - [ ] Header displays (if enabled in Step 5)
   - [ ] Date range displays (if enabled)
   - [ ] Shows 3 days: Monday, Tuesday, Wednesday
   - [ ] Each day has 3 meals with realistic data
   - [ ] Footer displays (if enabled)
   - [ ] Border displays (if enabled)
   - [ ] All colors from Step 4 applied
   - [ ] All styling from Step 2 applied
   - [ ] All display options from Step 3 applied

4. ✅ **Settings Summary**:
   - [ ] Shows selected layout with icon
   - [ ] Shows 3 color swatches
   - [ ] Lists display options
   - [ ] Lists header/footer status

5. ✅ **Action Buttons**:
   
   **💾 Save Template:**
   - [ ] Click without entering name - shows alert "Please enter a template name"
   - [ ] Enter name "Test Template 1"
   - [ ] Click "Save Template"
   - [ ] Shows success alert
   - [ ] Click debug button "Show Saved Templates" below
   - [ ] Verify your template is saved
   
   **📄 Export PDF:**
   - [ ] Click "Export PDF"
   - [ ] Shows "coming soon" message (placeholder)
   
   **🖨️ Print:**
   - [ ] Click "Print"
   - [ ] Browser print dialog opens
   - [ ] Preview shows clean template (no wizard UI)
   - [ ] Cancel print dialog
   
   **🔄 Start Over:**
   - [ ] Click "Start Over"
   - [ ] Shows confirmation dialog
   - [ ] Click OK
   - [ ] Wizard resets to Step 1
   - [ ] All settings cleared

**Navigation:**
- [ ] "Previous" button works
- [ ] "Finish" button (instead of "Next")
- [ ] Clicking "Finish" without template name shows validation error

---

## 🐛 Debug Panel Testing

At the bottom of the page, test these debug features:

### 1. 📊 Show Wizard Data
- [ ] Click button
- [ ] Alert shows current wizard data as JSON
- [ ] All your selections should be in the data

### 2. 💾 Show Saved Templates
- [ ] Click button after saving a template
- [ ] Alert shows all saved templates from localStorage
- [ ] Your template should be listed with ID, name, and data

### 3. 🗑️ Clear Storage
- [ ] Save a template first
- [ ] Click "Clear Storage"
- [ ] Confirm the dialog
- [ ] Click "Show Saved Templates" - should show "No templates saved"

### 4. 📥 Export Data (JSON)
- [ ] Configure wizard with custom settings
- [ ] Click "Export Data (JSON)"
- [ ] File `wizard-data.json` downloads
- [ ] Open file - should contain your wizard data

### 5. ✅ Check Integrity
- [ ] Click at any time
- [ ] Shows status of all components
- [ ] All items should show ✅
- [ ] Shows current step number

---

## 📱 Mobile Responsive Testing

### Browser Dev Tools Method:
1. Press F12 (open DevTools)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select device (iPhone, iPad, etc.)
4. Test the wizard on different screen sizes

### What to Check:
- [ ] All steps display correctly on mobile
- [ ] Layout cards stack vertically
- [ ] Sliders are touch-friendly
- [ ] Buttons are large enough
- [ ] Preview fits screen width
- [ ] Navigation buttons stack vertically
- [ ] No horizontal scrolling (except preview modes)
- [ ] Text is readable

---

## ✅ Final Validation Checklist

### Core Functionality
- [ ] Wizard initializes without errors
- [ ] All 6 steps accessible
- [ ] Progress bar updates correctly
- [ ] Can navigate forward and backward
- [ ] Data persists when navigating
- [ ] Can complete entire wizard flow

### Visual & UX
- [ ] All colors render correctly
- [ ] Animations are smooth
- [ ] Hover effects work
- [ ] Selected states are clear
- [ ] Typography is readable
- [ ] Layout is clean and organized

### Data Management
- [ ] All inputs save to wizardData
- [ ] Templates save to localStorage
- [ ] Can save multiple templates
- [ ] Export works
- [ ] Clear storage works

### Previews
- [ ] Step 2 preview works
- [ ] Step 3 preview works
- [ ] Step 4 preview works
- [ ] Step 5 preview works
- [ ] Step 6 full preview works
- [ ] All previews update in real-time

### Error Handling
- [ ] Template name validation works
- [ ] Can't finish without template name
- [ ] No console errors during normal use
- [ ] Graceful handling of missing data

---

## 🎯 Advanced Testing Scenarios

### Scenario 1: Quick User
1. Select a layout (Step 1)
2. Keep all defaults (Steps 2-5)
3. Name template and save (Step 6)
4. Should work perfectly with defaults

### Scenario 2: Customization Expert
1. Try every layout option
2. Adjust every slider to extremes
3. Test every color combination
4. Toggle every checkbox
5. Save and verify all settings preserved

### Scenario 3: Mode Switcher
1. Start in Wizard Mode
2. Configure some settings
3. Switch to Advanced Mode
4. Switch back to Wizard Mode
5. Wizard should remember settings

### Scenario 4: Multiple Templates
1. Create "Work Week Meals"
2. Save it
3. Click Start Over
4. Create "Weekend Special"
5. Save it
6. Check localStorage - both should exist

---

## 🐛 Known Issues to Watch For

If you encounter these, report them:
- [ ] Preview not updating when changing values
- [ ] Settings lost when navigating back
- [ ] Layout cards not responding to clicks
- [ ] Theme presets not applying colors
- [ ] Save button not working
- [ ] Console errors (check F12)
- [ ] Visual glitches or layout breaks
- [ ] Mobile: elements too small to tap
- [ ] Mobile: horizontal scrolling issues

---

## 📊 Test Results Template

Use this to report results:

```
## Test Results - [Date]

Browser: [Chrome/Firefox/Safari] [Version]
OS: [Windows/Mac/Linux]
Screen: [Desktop/Tablet/Mobile]

### Core Tests
- Initialization: [✅/❌]
- All 6 Steps: [✅/❌]
- Navigation: [✅/❌]
- Data Persistence: [✅/❌]

### Step-by-Step
- Step 1 (Layouts): [✅/❌]
- Step 2 (Styling): [✅/❌]
- Step 3 (Display): [✅/❌]
- Step 4 (Colors): [✅/❌]
- Step 5 (Content): [✅/❌]
- Step 6 (Preview): [✅/❌]

### Features
- Live Previews: [✅/❌]
- Theme Presets: [✅/❌]
- Save Template: [✅/❌]
- Export/Print: [✅/❌]
- Debug Panel: [✅/❌]

### Issues Found
1. [Describe any issues]
2. [With steps to reproduce]

### Overall Rating
[Excellent/Good/Needs Work]

Notes: [Any additional feedback]
```

---

## 🎉 Success Criteria

The wizard test is successful if:
- ✅ All 6 steps complete without errors
- ✅ All interactive elements respond correctly
- ✅ All previews update in real-time
- ✅ Templates save and load correctly
- ✅ Mobile responsive works well
- ✅ No console errors
- ✅ User can complete entire flow smoothly

---

**Happy Testing!** 🧪✨

*If you find any issues, check the browser console (F12) for detailed error messages.*
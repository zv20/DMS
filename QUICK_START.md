# 🚀 Quick Start - Test the Wizard NOW!

## ⚡ 5-Minute Setup

### Option 1: Direct File Open (Simplest)
1. Clone or download the `feature/template-wizard` branch
2. Navigate to the DMS folder
3. Double-click `test-wizard.html`
4. Browser opens with the wizard ready to test!

### Option 2: Local Server (Recommended)
```bash
# Clone the repo
git clone https://github.com/zv20/DMS.git
cd DMS
git checkout feature/template-wizard

# Start a local server (choose one):

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (npx)
npx http-server

# PHP
php -S localhost:8000
```

Then open: `http://localhost:8000/test-wizard.html`

---

## 🎯 3-Minute Test Flow

### 👀 Quick Visual Test
1. **Page loads** → See purple gradient, wizard interface
2. **Integrity check alert** → All items should show ✅
3. **Click through all 6 steps** → Use "Next Step" button
4. **Watch previews update** → Try changing a few values
5. **Save a template** → Enter name "Test" and click Save
6. **Check debug panel** → Click "Show Saved Templates"

**If all of the above works → Wizard is working! 🎉**

---

## 📄 What You Should See

### Initial Screen
```
┌───────────────────────────────────┐
│   🧙 Template Wizard Test      │
│   Complete template customization  │
│   ✅ All 7 Phases Implemented     │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ [🧙 Wizard Mode] [⚙️ Advanced]  │
│                                   │
│ Step 1 of 6 - 🎴 Layout Selection│
│ ██████░░░░░░░░░░░░░░░░░░░░ 20%│
│                                   │
│  [Grid]  [Timeline]  [Minimal]   │
│  [Magazine] [Bordered] [Checklist]│
│  ... (11 total layouts)           │
│                                   │
│  [Previous]          [Next Step]  │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ 🐛 Debug Panel                  │
│ [Show Data] [Show Templates]     │
│ [Clear Storage] [Export] [Check] │
└───────────────────────────────────┘
```

---

## ✅ Quick Functionality Checks

### 1. Layout Selection Works
- Click any layout card
- Card highlights orange
- "Selected: [Name]" appears

### 2. Sliders Work
- Go to Step 2
- Drag any slider
- Value updates
- Preview changes

### 3. Theme Presets Work
- Go to Step 4
- Click "Teal Fresh"
- Preview turns teal
- Colors update

### 4. Save Works
- Go to Step 6
- Enter name: "Test"
- Click "Save Template"
- See success alert

### 5. Debug Panel Works
- Click "Check Integrity"
- See all ✅ checkmarks
- Click "Show Saved Templates"
- See your saved template

**All 5 checks pass? You're good to go! 🎉**

---

## 🐛 Common Issues & Fixes

### Issue: Blank page or wizard doesn't appear
**Fix:** Check browser console (F12) for errors
- Missing file? Check all files are in correct folders
- Script error? Ensure files loaded in correct order

### Issue: Integrity check shows ❌
**Fix:** 
```
❌ WizardSteps NOT loaded
  → Check: js/template/wizard-steps.js exists
  → Check: Script tag is present and path is correct
```

### Issue: Preview not updating
**Fix:** Check browser console for JavaScript errors
- Function not found? Missing script file
- Object undefined? Check initialization order

### Issue: Can't save templates
**Fix:** 
- Enter a template name first
- Check localStorage is enabled (private browsing disables it)
- Try different browser

---

## 📱 Quick Mobile Test

1. Press `F12` (Developer Tools)
2. Click device icon or press `Ctrl+Shift+M`
3. Select "iPhone 12 Pro" or similar
4. Test wizard on mobile view
5. Should work without horizontal scroll

---

## 📊 Test Results - Share These

After testing, share these details:

```
Browser: [Chrome/Firefox/Safari]
Version: [XX]
OS: [Windows/Mac/Linux]

Initialization: [✅/❌]
All Steps Load: [✅/❌]
Previews Work: [✅/❌]
Save Works: [✅/❌]
Mobile Responsive: [✅/❌]

Issues: [None / Describe any problems]
```

---

## 📚 Full Documentation

For detailed testing:
- **Complete Guide:** `TESTING_GUIDE.md`
- **Implementation:** `WIZARD_IMPLEMENTATION.md`
- **File Structure:** See README in feature branch

---

## ⚡ Power User Tips

### Test ALL Features in 10 Minutes:
1. **Step 1:** Click each layout (30 seconds)
2. **Step 2:** Drag all sliders to extremes (1 minute)
3. **Step 3:** Toggle all checkboxes on/off (1 minute)
4. **Step 4:** Click all 6 themes (30 seconds)
5. **Step 5:** Test all toggles and formats (2 minutes)
6. **Step 6:** Test all preview modes and save (2 minutes)
7. **Debug:** Test all 5 debug buttons (2 minutes)
8. **Mobile:** Quick responsive check (1 minute)

### Stress Test (Find Bugs):
- Set all sliders to minimum
- Set all sliders to maximum
- Turn everything OFF
- Turn everything ON
- Click buttons rapidly
- Navigate back and forth quickly
- Switch themes while typing
- Change preview modes rapidly

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ No console errors
- ✅ All previews update smoothly
- ✅ Navigation is smooth
- ✅ Can complete entire flow
- ✅ Templates save successfully
- ✅ All 6 steps are accessible

---

## 📧 Reporting Results

Found an issue? Note:
1. **What you did** (steps to reproduce)
2. **What happened** (actual result)
3. **What you expected** (expected result)
4. **Browser/OS** (environment details)
5. **Console errors** (if any)

Example:
```
Steps:
1. Went to Step 4
2. Clicked "Dark Mode" theme
3. Preview didn't update

Expected: Preview should turn dark
Actual: Preview stayed same color

Browser: Chrome 120
OS: Windows 11
Console: "TypeError: Cannot read property..."
```

---

## 🚀 Ready to Test!

**Start here:**
1. Open `test-wizard.html`
2. Follow the 3-minute test flow above
3. Report results

**Questions?**
- Check `TESTING_GUIDE.md` for detailed steps
- Check browser console for error messages
- Verify all files are present

---

**Let's make sure this wizard is perfect!** 🎯✨

*Last updated: February 15, 2026*
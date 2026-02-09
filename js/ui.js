// UI Interactions & Theme Logic
import { getCurrentLanguage, setCurrentLanguage, applyTranslations, t } from './i18n.js';
import { saveData, updateStyleSettings, savedTemplates, currentStyleSettings, addSavedTemplate } from './store.js';

let templateBackgroundImage = localStorage.getItem('templateBackgroundImage') || '';

// --- Navigation ---
export function toggleNav() {
    const overlay = document.getElementById('navOverlay');
    if(overlay) overlay.classList.toggle('active');
}

export function bindNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-page], .sub-nav-item[data-page]');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item, .sub-nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.page;
      const page = document.getElementById(targetId);
      if (page) page.classList.add('active');
      toggleNav();
    });
  });
}

export function toggleSettingsSubmenu() {
    const menu = document.getElementById('settingsSubmenu');
    const btn = document.querySelector('.settings-toggle .arrow');
    if(menu) {
        menu.classList.toggle('open');
        if(menu.classList.contains('open') && btn) {
            btn.style.transform = 'rotate(180deg)';
        } else if(btn) {
            btn.style.transform = 'rotate(0deg)';
        }
    }
}

export function toggleSyncDropdown() { 
    const dropdown = document.getElementById('syncDropdown'); 
    if (dropdown) dropdown.classList.toggle('show'); 
}

// --- Theme ---
export function setAppTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('appTheme', themeName);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.classList.contains(`theme-${themeName}`)) {
            btn.style.transform = 'scale(1.2)';
            btn.style.borderColor = 'var(--color-primary)';
        } else {
            btn.style.transform = 'scale(1)';
            btn.style.borderColor = 'var(--color-border)';
        }
    });
}

// --- Language ---
export function changeLanguage(lang) {
    setCurrentLanguage(lang);
    localStorage.setItem('recipeManagerLang', lang);
    saveData();
    applyTranslations();
}

// --- Builder Logic ---
export function initStyleBuilder() { 
    const ids = ['styleFont', 'stylePageBg', 'styleHeaderBg', 'styleHeaderText', 'styleCardBg', 'styleBorderColor', 'styleBorderWidth', 'styleSlot1Color', 'styleSlot2Color', 'styleSlot3Color', 'styleSlot4Color', 'styleSlot1Font', 'styleSlot2Font', 'styleSlot3Font', 'styleSlot4Font'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateBuilderPreview);
    });
    
    const saveBtn = document.getElementById('btnSaveStyle');
    if(saveBtn) saveBtn.addEventListener('click', saveNewTemplate);
    
    const newBtn = document.getElementById('btnNewTemplate');
    if(newBtn) newBtn.addEventListener('click', () => {
        const sel = document.getElementById('savedTemplatesSelect');
        if (sel) sel.value = '';
        updateStyleSettings({ font: 'Segoe UI', pageBg: '#ffffff', headerBg: '#ffffff', headerText: '#21808d', cardBg: '#ffffff', borderColor: '#333333', borderWidth: '1', slotColors: { slot1:'#000', slot2:'#000', slot3:'#000', slot4:'#000' } });
        loadBuilderSettings();
        updateBuilderPreview();
    });

    // Background Image Handling
    const uploadBgInput = document.getElementById('styleBgImageInput');
    const styleBgRemoveBtn = document.getElementById('styleBgRemoveBtn');
    
    if (uploadBgInput) uploadBgInput.addEventListener('change', uploadBackgroundImage);
    if (styleBgRemoveBtn) styleBgRemoveBtn.addEventListener('click', removeBackgroundImage);

    loadBuilderSettings();
    updateBuilderPreview();
}

export function loadBuilderSettings() { 
    const s = currentStyleSettings;
    if (!s) return;
    setVal('styleFont', s.font);
    setVal('stylePageBg', s.pageBg);
    setVal('styleHeaderBg', s.headerBg);
    setVal('styleHeaderText', s.headerText);
    setVal('styleCardBg', s.cardBg);
    setVal('styleBorderColor', s.borderColor);
    setVal('styleBorderWidth', s.borderWidth);
    if(s.slotColors) {
        setVal('styleSlot1Color', s.slotColors.slot1);
        setVal('styleSlot2Color', s.slotColors.slot2);
        setVal('styleSlot3Color', s.slotColors.slot3);
        setVal('styleSlot4Color', s.slotColors.slot4);
    }
    
    const removeBtn = document.getElementById('styleBgRemoveBtn');
    if (removeBtn) removeBtn.style.display = templateBackgroundImage ? 'block' : 'none';
}

export function updateBuilderPreview() { 
    const fontEl = document.getElementById('styleFont');
    // ... (rest of getting elements) ...
    // Simplified for brevity, assumes elements exist
    
    if (!fontEl) return;
    
    const s = {
        font: fontEl.value,
        pageBg: document.getElementById('stylePageBg').value,
        headerBg: document.getElementById('styleHeaderBg').value,
        headerText: document.getElementById('styleHeaderText').value,
        cardBg: document.getElementById('styleCardBg').value,
        borderColor: document.getElementById('styleBorderColor').value,
        borderWidth: document.getElementById('styleBorderWidth').value,
        slotColors: {
            slot1: document.getElementById('styleSlot1Color')?.value || '#000',
            slot2: document.getElementById('styleSlot2Color')?.value || '#000',
            slot3: document.getElementById('styleSlot3Color')?.value || '#000',
            slot4: document.getElementById('styleSlot4Color')?.value || '#000'
        }
    };
    
    updateStyleSettings(s);
    
    const sheet = document.getElementById('livePreviewSheet');
    if (!sheet) return;
    
    sheet.style.fontFamily = s.font;
    sheet.style.backgroundColor = s.pageBg;
    sheet.style.backgroundImage = templateBackgroundImage ? `url('${templateBackgroundImage}')` : 'none';

    // Apply styles to preview elements
    const cards = sheet.querySelectorAll('.preview-day-card');
    cards.forEach(card => {
        card.style.backgroundColor = s.cardBg;
        card.style.borderColor = s.borderColor;
        card.style.borderWidth = s.borderWidth + 'px';
        const header = card.querySelector('.preview-day-header');
        if (header) {
            header.style.backgroundColor = s.headerBg;
            header.style.color = s.headerText;
            header.style.borderBottomColor = s.borderColor;
        }
    });
    
    ['slot1','slot2','slot3','slot4'].forEach(slot => {
         sheet.querySelectorAll(`.preview-slot.${slot}`).forEach(el => {
             el.style.borderLeft = `3px solid ${s.slotColors[slot]}`;
         });
    });
}

function saveNewTemplate() {
    const name = prompt("Enter a name for this template:", "My Custom Theme");
    if (!name) return;
    const newTmpl = { id: Date.now().toString(), name: name, settings: { ...currentStyleSettings } };
    addSavedTemplate(newTmpl);
    alert(t('alert_template_saved'));
}

function uploadBackgroundImage(e) {
  const file = e.target.files[0];
  if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
          templateBackgroundImage = evt.target.result;
          localStorage.setItem('templateBackgroundImage', templateBackgroundImage);
          updateBuilderPreview();
          loadBuilderSettings();
      };
      reader.readAsDataURL(file);
  }
}

function removeBackgroundImage() {
  templateBackgroundImage = '';
  localStorage.setItem('templateBackgroundImage', '');
  updateBuilderPreview();
  loadBuilderSettings();
  document.getElementById('styleBgImageInput').value = '';
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

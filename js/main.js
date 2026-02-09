// Main Entry Point
import { autoLoadOnStartup, saveData, selectSaveLocation, loadFromFolder, exportDataFile, importDataFile, currentStyleSettings } from './store.js';
import { initStyleBuilder, toggleNav, toggleSettingsSubmenu, setAppTheme, changeLanguage, toggleSyncDropdown, bindNavigation } from './ui.js';
import { renderAll } from './render.js';
import { getCurrentLanguage } from './i18n.js';

// --- Initialization ---
async function init() {
  const hamburger = document.getElementById('hamburgerBtn');
  if(hamburger) hamburger.addEventListener('click', toggleNav);
  
  const closeBtn = document.getElementById('closeNavBtn');
  if(closeBtn) closeBtn.addEventListener('click', toggleNav);
  
  // Bind Global Inputs
  const printStartDateInput = document.getElementById('printStartDate');
  const importInput = document.getElementById('importInput');
  const langSel = document.getElementById('languageSelect');

  if (importInput) importInput.addEventListener('change', (e) => importDataFile(e.target.files[0], renderAll));
  
  if (printStartDateInput) {
    printStartDateInput.addEventListener('change', (e) => {
       // Date change logic to move to render or ui
       renderAll();
    });
  }

  if (langSel) {
    langSel.value = getCurrentLanguage();
    langSel.addEventListener('change', (e) => changeLanguage(e.target.value));
  }

  bindNavigation();
  setAppTheme(localStorage.getItem('appTheme') || 'default');

  try {
      await autoLoadOnStartup(renderAll);
      initStyleBuilder();
      renderAll();
  } catch (err) {
      console.error("Initialization error:", err);
  }

  if (window.$) {
    window.$(document).ready(function () {
       // Summernote init if needed
    });
  }
}

// --- Expose Global Functions for HTML onClick ---
window.toggleNav = toggleNav;
window.toggleSettingsSubmenu = toggleSettingsSubmenu;
window.toggleSyncDropdown = toggleSyncDropdown;
window.setAppTheme = setAppTheme;
window.selectSaveLocation = () => selectSaveLocation(renderAll);
window.manualSave = () => saveData(() => alert('Data Saved!'));
window.manualLoad = () => loadFromFolder(renderAll);
window.exportData = exportDataFile;
window.changeMonth = (delta) => { /* Logic */ renderAll(); };
window.toggleView = (mode) => { localStorage.setItem('calendarViewMode', mode); renderAll(); };
window.togglePrintDay = (day) => { /* Logic */ };

// Start App
window.addEventListener('DOMContentLoaded', init);

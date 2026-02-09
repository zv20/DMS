// Main Entry Point (Global Scope)

(function(window) {
    // --- Initialization ---
    async function init() {
        const hamburger = document.getElementById('hamburgerBtn');
        if(hamburger) hamburger.addEventListener('click', window.toggleNav);
        
        const closeBtn = document.getElementById('closeNavBtn');
        if(closeBtn) closeBtn.addEventListener('click', window.toggleNav);
        
        // Bind Global Inputs
        const printStartDateInput = document.getElementById('printStartDate');
        const importInput = document.getElementById('importInput');
        const langSel = document.getElementById('languageSelect');

        if (importInput) importInput.addEventListener('change', (e) => window.importDataFile(e.target.files[0], window.renderAll));
        
        if (printStartDateInput) {
            printStartDateInput.addEventListener('change', (e) => {
                // Date change logic to move to render or ui
                window.renderAll();
            });
        }

        if (langSel) {
            langSel.value = window.getCurrentLanguage();
            langSel.addEventListener('change', (e) => window.changeLanguage(e.target.value));
        }

        window.bindNavigation();
        window.setAppTheme(localStorage.getItem('appTheme') || 'default');

        try {
            await window.autoLoadOnStartup(window.renderAll);
            window.initStyleBuilder();
            window.renderAll();
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
    // (Most are already exposed in their respective files, but ensuring here)
    window.manualSave = () => window.saveData(() => alert('Data Saved!'));
    window.manualLoad = () => window.loadFromFolder(window.renderAll);
    window.exportData = window.exportDataFile;
    window.changeMonth = (delta) => { /* Logic */ window.renderAll(); };
    window.toggleView = (mode) => { localStorage.setItem('calendarViewMode', mode); window.renderAll(); };
    window.togglePrintDay = (day) => { /* Logic */ };

    // Start App
    window.addEventListener('DOMContentLoaded', init);
})(window);

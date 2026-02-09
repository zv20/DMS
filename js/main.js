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
                window.renderAll();
            });
        }

        if (langSel) {
            langSel.value = window.getCurrentLanguage();
            langSel.addEventListener('change', (e) => window.changeLanguage(e.target.value));
        }

        window.bindNavigation();
        window.setAppTheme(localStorage.getItem('appTheme') || 'default');

        // --- Splash Screen Logic ---
        await handleSplashScreen();

        if (window.$) {
            window.$(document).ready(function () {
                // Summernote init if needed
            });
        }
    }

    async function handleSplashScreen() {
        const splash = document.getElementById('splashScreen');
        const actions = document.getElementById('splashActions');
        
        // Check if we have a saved directory handle
        const hasSavedHandle = await window.checkSavedHandle();

        // Min wait time for smooth animation (1.5s)
        const minWait = new Promise(resolve => setTimeout(resolve, 1500));

        if (hasSavedHandle) {
            // Returning user: Show "Resume" button
            // We cannot auto-load without gesture due to browser security
            actions.innerHTML = `
                <button class="btn-splash btn-splash-primary" onclick="resumeSession()">
                    <span>▶</span> Resume Session
                </button>
                <button class="btn-splash btn-splash-secondary" onclick="startFresh()">
                    <span>📂</span> Switch Folder
                </button>
            `;
        } else {
            // New user: Show "Start" button
            actions.innerHTML = `
                <button class="btn-splash btn-splash-primary" onclick="startFresh()">
                    <span>🚀</span> Get Started
                </button>
            `;
        }

        // Expose functions to global scope for the buttons
        window.resumeSession = async () => {
            actions.innerHTML = '<div class="loader-spinner"></div>';
            try {
                await window.autoLoadOnStartup(window.renderAll); // Uses saved handle
                await minWait; // Ensure at least 1.5s spinner
                hideSplash();
            } catch (e) {
                console.error("Resume failed", e);
                alert("Could not access folder. Please select it again.");
                startFresh();
            }
        };

        window.startFresh = async () => {
            actions.innerHTML = '<div class="loader-spinner"></div>';
            try {
                // Trigger file picker
                await window.selectSaveLocation(window.renderAll);
                await minWait;
                hideSplash();
            } catch (e) {
                // Cancelled or failed
                actions.innerHTML = `
                    <button class="btn-splash btn-splash-primary" onclick="startFresh()">
                        <span>🚀</span> Get Started
                    </button>
                `;
            }
        };

        function hideSplash() {
            splash.style.opacity = '0';
            document.body.classList.add('app-loaded');
            setTimeout(() => {
                splash.style.display = 'none';
                window.initStyleBuilder();
                window.renderAll();
            }, 500);
        }
    }

    // --- Expose Global Functions for HTML onClick ---
    window.manualSave = () => window.saveData(() => alert('Data Saved!'));
    window.manualLoad = () => window.loadFromFolder(window.renderAll);
    window.exportData = window.exportDataFile;
    window.changeMonth = (delta) => { /* Logic */ window.renderAll(); };
    window.toggleView = (mode) => { localStorage.setItem('calendarViewMode', mode); window.renderAll(); };
    window.togglePrintDay = (day) => { /* Logic */ };

    // Start App
    window.addEventListener('DOMContentLoaded', init);
})(window);

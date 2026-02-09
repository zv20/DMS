// Data Store & Persistence Layer (Global Scope)

(function(window) {
    // Global Data Containers
    window.recipes = [];
    window.ingredients = [];
    window.allergens = [];
    window.currentMenu = {};
    window.menuHistory = [];
    window.savedTemplates = [];
    window.printTemplate = "<h1>{title}</h1><p>{recipes}<br></p>"; // Default Template
    window.currentStyleSettings = {
        font: 'Segoe UI',
        pageBg: '#ffffff',
        headerBg: '#ffffff',
        headerText: '#21808d',
        cardBg: '#ffffff',
        borderColor: '#333333',
        borderWidth: '1',
        slotColors: { slot1: '#000000', slot2: '#000000', slot3: '#000000', slot4: '#000000' }
    };

    // Configuration
    const DB_NAME = 'RecipeManagerDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'directoryHandles';
    let db = null;
    let directoryHandle = null;
    const isFileSystemSupported = 'showDirectoryPicker' in window;

    window.PREDEFINED_ALLERGENS = [
        { id: 'alg_gluten', name: 'Gluten', color: '#f59f00', name_bg: 'Глутен' },
        { id: 'alg_crustaceans', name: 'Crustaceans', color: '#ff6b6b', name_bg: 'Ракообразни' },
        { id: 'alg_eggs', name: 'Eggs', color: '#ffd43b', name_bg: 'Яйца' },
        { id: 'alg_fish', name: 'Fish', color: '#339af0', name_bg: 'Риба' },
        { id: 'alg_peanuts', name: 'Peanuts', color: '#d9480f', name_bg: 'Фъстъци' },
        { id: 'alg_soybeans', name: 'Soybeans', color: '#5c940d', name_bg: 'Соя' },
        { id: 'alg_milk', name: 'Milk', color: '#74c0fc', name_bg: 'Мляко' },
        { id: 'alg_nuts', name: 'Nuts', color: '#e67700', name_bg: 'Ядки' },
        { id: 'alg_celery', name: 'Celery', color: '#82c91e', name_bg: 'Целина' },
        { id: 'alg_mustard', name: 'Mustard', color: '#fcc419', name_bg: 'Горчица' },
        { id: 'alg_sesame', name: 'Sesame', color: '#adb5bd', name_bg: 'Сусам' },
        { id: 'alg_sulphites', name: 'Sulphites', color: '#868e96', name_bg: 'Сулфити' },
        { id: 'alg_lupin', name: 'Lupin', color: '#ffec99', name_bg: 'Лупина' },
        { id: 'alg_molluscs', name: 'Molluscs', color: '#ff922b', name_bg: 'Мекотели' }
    ];

    // --- DB Initialization ---
    window.initDB = async function() {
        if(db) return db; // Singleton
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { db = request.result; resolve(db); };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
            };
        });
    };

    // --- Helper to check if handle exists (for splash screen) ---
    window.checkSavedHandle = async function() {
        try {
            if (!isFileSystemSupported) return false;
            await window.initDB();
            const handle = await getDirectoryHandle();
            return !!handle;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    // --- Persistence Operations ---

    window.saveData = function(callback) {
        const lang = localStorage.getItem('recipeManagerLang') || 'en';
        const theme = localStorage.getItem('appTheme') || 'default';
        
        const data = {
            recipes: window.recipes, 
            ingredients: window.ingredients, 
            allergens: window.allergens, 
            currentMenu: window.currentMenu, 
            menuHistory: window.menuHistory,
            savedTemplates: window.savedTemplates, 
            printTemplate: window.printTemplate,
            currentStyleSettings: window.currentStyleSettings,
            preferences: { lang: lang, theme: theme }
        };
        
        localStorage.setItem('recipeManagerData', JSON.stringify(data));

        if (directoryHandle) {
            (async () => {
                try {
                    window.showSyncAnimation('syncing');
                    const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(data, null, 2));
                    await writable.close();
                    window.showSyncAnimation('success');
                } catch (err) { 
                    console.error(err); 
                    window.showSyncAnimation('error'); 
                }
            })();
        } else {
             window.showSyncAnimation('local');
        }
        
        if (callback) callback();
    };

    window.loadData = function(renderCallback) {
        const dataStr = localStorage.getItem('recipeManagerData');
        if (dataStr) { 
            try {
                parseData(dataStr, false);
            } catch(e) { console.error("Parse error", e); }
        } else { 
            window.populateDefaultAllergens(); 
        }
        
        if (renderCallback) renderCallback();
    };

    window.autoLoadOnStartup = async function(renderCallback) {
        if (!isFileSystemSupported) { window.loadData(renderCallback); return; }
        try {
            await window.initDB();
            const savedHandle = await getDirectoryHandle();
            if (!savedHandle) { window.loadData(renderCallback); return; }
            
            const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                directoryHandle = savedHandle;
                await window.loadFromFolder(renderCallback);
            } else { 
                const newPerm = await savedHandle.requestPermission({ mode: 'readwrite' });
                if (newPerm === 'granted') {
                     directoryHandle = savedHandle;
                     await window.loadFromFolder(renderCallback);
                } else {
                     window.loadData(renderCallback);
                }
            }
        } catch { 
            window.loadData(renderCallback); 
        }
    };

    window.loadFromFolder = async function(renderCallback) {
        if (directoryHandle) {
            try {
                const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
                const file = await fileHandle.getFile();
                const text = await file.text();
                if (text) { 
                    parseData(text, true); 
                    if(renderCallback) renderCallback();
                }
            } catch (err) { 
                console.error(err); 
                window.showSyncAnimation('error'); 
            }
        }
    };

    function parseData(jsonText, isFileImport) {
        const data = JSON.parse(jsonText);
        window.recipes = data.recipes || [];
        window.ingredients = data.ingredients || [];
        window.allergens = data.allergens || [];
        window.currentMenu = data.currentMenu || {};
        window.menuHistory = data.menuHistory || [];
        window.savedTemplates = data.savedTemplates || [];
        window.printTemplate = data.printTemplate || "<h1>{title}</h1><p>{recipes}<br></p>";
        
        if (data.currentStyleSettings) {
            window.currentStyleSettings = {
                ...window.currentStyleSettings,
                ...data.currentStyleSettings,
                slotColors: { ...window.currentStyleSettings.slotColors, ...(data.currentStyleSettings.slotColors || {}) }
            };
        }
        
        if(data.preferences) {
            if(data.preferences.lang) {
                localStorage.setItem('recipeManagerLang', data.preferences.lang);
                if(window.changeLanguage) window.changeLanguage(data.preferences.lang); 
            }
            if(data.preferences.theme) {
                localStorage.setItem('appTheme', data.preferences.theme);
                if(window.setAppTheme) window.setAppTheme(data.preferences.theme);
            }
        }
        
        if (window.allergens.length === 0) window.populateDefaultAllergens();
        
        if (isFileImport && document.body.classList.contains('app-loaded')) {
             window.showSyncAnimation('success');
             alert(window.t('alert_import_success'));
        }
    }

    window.populateDefaultAllergens = function() {
        window.PREDEFINED_ALLERGENS.forEach(def => {
            if (!window.allergens.find(a => a.id === def.id)) {
                window.allergens.push({ id: def.id, name: def.name, color: def.color, isSystem: true });
            }
        });
    };

    async function getDirectoryHandle() {
        if (!db) await window.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('mainDirectory');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function saveDirectoryHandle(handle) {
        if (!db) await window.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(handle, 'mainDirectory');
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    window.showSyncAnimation = function(status) {
        const indicator = document.getElementById('syncIndicator');
        if (!indicator) return;
        
        indicator.classList.remove('sync-hidden', 'sync-spin', 'sync-success', 'sync-error');
        indicator.style.display = 'flex';
        
        if (status === 'syncing') {
            indicator.innerHTML = '↻';
            indicator.classList.add('sync-spin');
            indicator.title = "Saving...";
        } else if (status === 'success') {
            indicator.innerHTML = '✓';
            indicator.classList.add('sync-success');
            indicator.title = "Saved!";
            setTimeout(() => {
                indicator.classList.add('sync-hidden');
            }, 2000);
        } else if (status === 'error') {
            indicator.innerHTML = '⚠';
            indicator.classList.add('sync-error');
            indicator.title = "Error Saving";
        } else {
            indicator.innerHTML = '💾';
            indicator.title = "Saved Locally";
             setTimeout(() => {
                indicator.classList.add('sync-hidden');
            }, 2000);
        }
    };

    window.selectSaveLocation = async function(renderCallback) {
        if (!isFileSystemSupported) {
            alert(window.t('alert_file_api_unsupported'));
            return;
        }
        try {
            const handle = await window.showDirectoryPicker();
            if (handle) {
                directoryHandle = handle;
                await saveDirectoryHandle(handle);
                try {
                    await window.loadFromFolder(renderCallback);
                    alert(window.t('alert_data_loaded'));
                } catch (e) {
                    window.saveData();
                    alert(window.t('alert_data_saved'));
                }
            }
        } catch (err) { console.error(err); }
    };

    window.exportDataFile = function() {
        const data = { 
            recipes: window.recipes, 
            ingredients: window.ingredients, 
            allergens: window.allergens, 
            currentMenu: window.currentMenu, 
            menuHistory: window.menuHistory, 
            savedTemplates: window.savedTemplates, 
            printTemplate: window.printTemplate,
            currentStyleSettings: window.currentStyleSettings 
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recipe_manager_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.importDataFile = function(file, renderCallback) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            parseData(e.target.result, true);
            if(renderCallback) renderCallback();
        };
        reader.readAsText(file);
    };

    window.updateRecipes = function(newRecipes) { window.recipes = newRecipes; window.saveData(); };
    window.updateIngredients = function(newIng) { window.ingredients = newIng; window.saveData(); };
    window.updateAllergens = function(newAlg) { window.allergens = newAlg; window.saveData(); };
    window.updateMenu = function(date, slotId, data) {
        if (!window.currentMenu[date]) window.currentMenu[date] = {};
        window.currentMenu[date][slotId] = data;
        window.saveData();
    };
    window.updateStyleSettings = function(settings) {
        window.currentStyleSettings = settings;
        window.saveData();
    };
    window.addSavedTemplate = function(tmpl) {
        window.savedTemplates.push(tmpl);
        window.saveData();
    };
    window.updatePrintTemplate = function(html) {
        window.printTemplate = html;
        window.saveData();
    };
})(window);

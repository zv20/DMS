/**
 * Data Store Manager
 * Handles ALL data persistence with separate files:
 * - data.json: recipes, ingredients, allergens
 * - menus.json: all menu planning by date
 * - settings.json: templates and preferences (including language)
 * 
 * All files are stored in a "data" subfolder for better organization
 */

(function(window) {
    let saveLocation = null;
    let dataFolder = null; // Subfolder for data files
    let autoSaveTimeout = null;
    let db = null;

    const DB_NAME = 'KitchenProDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'settings';
    const HANDLE_KEY = 'directoryHandle';
    const DATA_FOLDER_NAME = 'data'; // Subfolder name

    // Global data stores
    window.recipes = [];
    window.ingredients = [];
    window.allergens = [];
    window.currentMenu = {};
    window.savedTemplates = [];
    window.imageUploads = []; // Image uploads storage
    window.appSettings = {
        language: 'en'
    };
    window.currentCalendarDate = new Date();
    window.currentViewMode = 'weekly';

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

    // Initialize IndexedDB
    window.initDB = async function() {
        if (db) return db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME);
                }
            };
        });
    };

    // Save directory handle to IndexedDB
    async function saveDirectoryHandle(handle) {
        try {
            await window.initDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(handle, HANDLE_KEY);
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (err) {
            console.error('Error saving directory handle:', err);
        }
    }

    // Get directory handle from IndexedDB
    async function getDirectoryHandle() {
        try {
            await window.initDB();
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(HANDLE_KEY);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error('Error getting directory handle:', err);
            return null;
        }
    }

    // Check if user has previously selected a folder
    window.checkPreviousFolder = async function() {
        const handle = await getDirectoryHandle();
        return !!handle;
    };

    // Get or create the data subfolder
    async function getDataFolder(parentHandle) {
        try {
            return await parentHandle.getDirectoryHandle(DATA_FOLDER_NAME, { create: true });
        } catch (err) {
            console.error('Error creating data folder:', err);
            throw err;
        }
    }

    // Select folder and save handle
    window.selectSaveLocation = async function() {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            saveLocation = dirHandle;
            
            // Create/get the data subfolder
            dataFolder = await getDataFolder(dirHandle);
            console.log('✅ dataFolder set:', dataFolder);
            
            // Save handle to IndexedDB for persistence
            await saveDirectoryHandle(dirHandle);
            
            // Check if files exist, if not create them
            await window.ensureFilesExist();
            await window.loadAllData();
            
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('File system access denied:', err);
            }
            return false;
        }
    };

    // Auto-load from previously selected folder
    window.autoLoadFromFolder = async function() {
        try {
            const handle = await getDirectoryHandle();
            if (!handle) {
                return false;
            }

            // Verify permission
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            
            if (permission === 'granted') {
                saveLocation = handle;
                dataFolder = await getDataFolder(handle);
                console.log('✅ dataFolder set (auto-load):', dataFolder);
                await window.loadAllData();
                return true;
            } else {
                // Request permission
                const newPermission = await handle.requestPermission({ mode: 'readwrite' });
                
                if (newPermission === 'granted') {
                    saveLocation = handle;
                    dataFolder = await getDataFolder(handle);
                    console.log('✅ dataFolder set (after permission):', dataFolder);
                    await window.loadAllData();
                    return true;
                } else {
                    console.log('Permission denied');
                    return false;
                }
            }
        } catch (err) {
            console.error('Could not access previous folder:', err);
            return false;
        }
    };

    // Ensure all data files exist (create if missing) in the data subfolder
    window.ensureFilesExist = async function() {
        if (!dataFolder) return;

        try {
            // Check/create data.json
            const dataExists = await window.fileExists(dataFolder, 'data.json');
            if (!dataExists) {
                await window.writeFile(dataFolder, 'data.json', JSON.stringify({
                    recipes: [],
                    ingredients: [],
                    allergens: []
                }, null, 2));
            }

            // Check/create menus.json
            const menusExists = await window.fileExists(dataFolder, 'menus.json');
            if (!menusExists) {
                await window.writeFile(dataFolder, 'menus.json', JSON.stringify({}, null, 2));
            }

            // Check/create settings.json
            const settingsExists = await window.fileExists(dataFolder, 'settings.json');
            if (!settingsExists) {
                await window.writeFile(dataFolder, 'settings.json', JSON.stringify({
                    templates: [],
                    imageUploads: [],
                    language: 'en'
                }, null, 2));
            }
        } catch (err) {
            console.error('Error ensuring files exist:', err);
        }
    };

    // Check if file exists
    window.fileExists = async function(dirHandle, filename) {
        try {
            await dirHandle.getFileHandle(filename);
            return true;
        } catch (err) {
            return false;
        }
    };

    // Load all data from files in data subfolder
    window.loadAllData = async function() {
        if (!dataFolder) return;

        try {
            // Load data.json (recipes, ingredients, allergens)
            const dataContent = await window.readFile(dataFolder, 'data.json');
            if (dataContent) {
                const parsed = JSON.parse(dataContent);
                window.recipes = parsed.recipes || [];
                window.ingredients = parsed.ingredients || [];
                window.allergens = parsed.allergens || [];
            }

            // Load menus.json (all menu planning by date)
            const menusContent = await window.readFile(dataFolder, 'menus.json');
            if (menusContent) {
                window.currentMenu = JSON.parse(menusContent);
            }

            // Load settings.json (templates, preferences, image uploads)
            const settingsContent = await window.readFile(dataFolder, 'settings.json');
            if (settingsContent) {
                const parsed = JSON.parse(settingsContent);
                window.savedTemplates = parsed.templates || [];
                window.imageUploads = parsed.imageUploads || [];
                
                console.log('📋 Loaded templates:', window.savedTemplates.length);
                console.log('🖼️ Loaded image uploads:', window.imageUploads.length);
                
                // Load language preference
                if (parsed.language) {
                    window.appSettings.language = parsed.language;
                    console.log('🌍 Loaded language from settings.json:', parsed.language);
                    // Apply language
                    if (typeof window.changeLanguage === 'function') {
                        window.changeLanguage(parsed.language, false); // Don't save again
                    }
                    // Update language selector
                    const langSelect = document.getElementById('languageSelect');
                    if (langSelect) langSelect.value = parsed.language;
                }
            }

            // Populate default allergens if empty
            if (window.allergens.length === 0) {
                window.populateDefaultAllergens();
                window.saveData(); // Save defaults
            }

            console.log('✅ All data loaded successfully from "data" folder');
            
            // DISPATCH EVENT TO NOTIFY TEMPLATE BUILDER
            window.dispatchEvent(new CustomEvent('dataLoaded', {
                detail: {
                    templates: window.savedTemplates,
                    imageUploads: window.imageUploads
                }
            }));
            
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    window.populateDefaultAllergens = function() {
        window.PREDEFINED_ALLERGENS.forEach(def => {
            if (!window.allergens.find(a => a.id === def.id)) {
                window.allergens.push({ id: def.id, name: def.name, color: def.color, isSystem: true });
            }
        });
    };

    // Save data.json (recipes, ingredients, allergens) to data subfolder
    window.saveData = function() {
        if (!dataFolder) return;

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            try {
                const data = {
                    recipes: window.recipes,
                    ingredients: window.ingredients,
                    allergens: window.allergens
                };
                await window.writeFile(dataFolder, 'data.json', JSON.stringify(data, null, 2));
                window.showSyncIndicator();
            } catch (err) {
                console.error('Error saving data.json:', err);
            }
        }, 300);
    };

    // Save menus.json (all menu planning) to data subfolder
    window.saveMenus = function() {
        if (!dataFolder) return;

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            try {
                await window.writeFile(dataFolder, 'menus.json', JSON.stringify(window.currentMenu, null, 2));
                window.showSyncIndicator();
            } catch (err) {
                console.error('Error saving menus.json:', err);
            }
        }, 300);
    };

    // Save settings.json (templates, language preference, image uploads) to data subfolder
    window.saveSettings = function() {
        console.log('💾 saveSettings() called. dataFolder exists:', !!dataFolder);
        console.log('💾 Current language in appSettings:', window.appSettings.language);
        
        if (!dataFolder) {
            console.error('❌ Cannot save settings: dataFolder is null! Please select a folder first.');
            return;
        }

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            try {
                const settings = {
                    templates: window.savedTemplates,
                    imageUploads: window.imageUploads || [],
                    language: window.appSettings.language
                };
                console.log('💾 Writing settings to file:', settings);
                await window.writeFile(dataFolder, 'settings.json', JSON.stringify(settings, null, 2));
                console.log('✅ Settings saved successfully!');
                window.showSyncIndicator();
            } catch (err) {
                console.error('❌ Error saving settings.json:', err);
            }
        }, 300);
    };

    // Wrapper functions for compatibility
    window.updateRecipes = function(recipes) {
        window.recipes = recipes;
        window.saveData();
    };

    window.updateIngredients = function(ingredients) {
        window.ingredients = ingredients;
        window.saveData();
    };

    window.updateAllergens = function(allergens) {
        window.allergens = allergens;
        window.saveData();
    };

    // File I/O Helpers
    window.readFile = async function(dirHandle, filename) {
        try {
            const fileHandle = await dirHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return await file.text();
        } catch (err) {
            if (err.name === 'NotFoundError') {
                console.log(`${filename} not found, will create on save`);
                return null;
            }
            throw err;
        }
    };

    window.writeFile = async function(dirHandle, filename, content) {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    };

    // Visual feedback for auto-save
    window.showSyncIndicator = function() {
        const indicator = document.getElementById('syncIndicator');
        if (!indicator) return;
        
        indicator.classList.remove('sync-hidden');
        indicator.classList.add('sync-visible', 'sync-success');
        indicator.textContent = '✓';
        
        setTimeout(() => {
            indicator.classList.remove('sync-visible', 'sync-success');
            indicator.classList.add('sync-hidden');
        }, 2000);
    };

    // Update menu for specific date
    window.updateMenuForDate = function(dateStr, slotId, category, recipeId) {
        if (!window.currentMenu[dateStr]) {
            window.currentMenu[dateStr] = {
                slot1: { category: 'soup', recipe: null },
                slot2: { category: 'main', recipe: null },
                slot3: { category: 'dessert', recipe: null },
                slot4: { category: 'other', recipe: null }
            };
        }

        window.currentMenu[dateStr][slotId] = {
            category: category,
            recipe: recipeId
        };

        window.saveMenus();
    };

    // Get menu for specific date
    window.getMenuForDate = function(dateStr) {
        return window.currentMenu[dateStr] || {
            slot1: { category: 'soup', recipe: null },
            slot2: { category: 'main', recipe: null },
            slot3: { category: 'dessert', recipe: null },
            slot4: { category: 'other', recipe: null }
        };
    };

    // Check if date has any meals
    window.dateHasMeals = function(dateStr) {
        const menu = window.currentMenu[dateStr];
        if (!menu) return false;
        return Object.values(menu).some(slot => slot.recipe !== null);
    };

})(window);

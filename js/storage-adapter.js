/**
 * Smart Storage Adapter
 * - Chrome/Edge: File System API with LocalStorage folder hints
 * - Firefox/Safari: IndexedDB
 * - Auto-detects capabilities and uses best available method
 * - Compatible with existing data.json file structure
 */

class StorageAdapter {
    constructor() {
        this.useFileSystem = 'showDirectoryPicker' in window;
        this.dbName = 'KitchenProDB';
        this.dbVersion = 2; // Bumped version to add templates store
        this.db = null;
        
        console.log(`📦 Storage Mode: ${this.useFileSystem ? 'File System API' : 'IndexedDB'}`);
    }
    
    // Initialize storage based on browser capabilities
    async init() {
        if (this.useFileSystem) {
            return await this.initFileSystem();
        } else {
            return await this.initIndexedDB();
        }
    }
    
    // ==================== FILE SYSTEM API (Chrome/Edge) ====================
    
    async initFileSystem() {
        // Check if user has previously selected a folder
        console.log('🔎 Checking for previous folder...');
        const handle = await this.getStoredDirectoryHandle();
        
        if (handle) {
            console.log('📁 Found previous folder handle, checking type:', typeof handle, handle);
            
            // Verify it's actually a FileSystemDirectoryHandle
            if (handle && typeof handle === 'object' && 'queryPermission' in handle) {
                console.log('✅ Handle is valid FileSystemDirectoryHandle');
                
                // Check permission (will auto-request if needed)
                try {
                    const permission = await this.verifyPermission(handle);
                    if (permission) {
                        console.log('✅ Permission granted, loading data...');
                        window.directoryHandle = handle;
                        
                        // Save folder name hint to LocalStorage
                        this.saveFolderHint(handle.name);
                        
                        await this.loadFromFileSystem();
                        return true;
                    } else {
                        console.log('❌ Permission denied');
                        await this.clearStoredDirectoryHandle();
                    }
                } catch (err) {
                    console.log('❌ Error verifying permission:', err);
                    await this.clearStoredDirectoryHandle();
                }
            } else {
                console.log('⚠️ Handle is not a valid FileSystemDirectoryHandle, clearing...');
                await this.clearStoredDirectoryHandle();
            }
        } else {
            console.log('ℹ️ No previous folder found');
        }
        
        return false; // Need user to select folder
    }
    
    async selectFolder() {
        if (!this.useFileSystem) {
            console.log('File System API not available');
            return false;
        }
        
        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            console.log('📁 Selected folder:', dirHandle.name, 'Type:', typeof dirHandle);
            
            window.directoryHandle = dirHandle;
            
            // Save folder name to LocalStorage (this WILL persist!)
            this.saveFolderHint(dirHandle.name);
            
            await this.storeDirectoryHandle(dirHandle);
            await this.loadFromFileSystem();
            return true;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('User cancelled folder selection');
            } else {
                console.error('Folder selection failed:', err);
            }
            return false;
        }
    }
    
    // LocalStorage methods for folder hints (persists in file:// protocol!)
    saveFolderHint(folderName) {
        try {
            localStorage.setItem('kitchenpro_last_folder', folderName);
            console.log('💾 Saved folder hint to LocalStorage:', folderName);
        } catch (err) {
            console.error('Failed to save folder hint:', err);
        }
    }
    
    getFolderHint() {
        try {
            return localStorage.getItem('kitchenpro_last_folder');
        } catch (err) {
            return null;
        }
    }
    
    async loadFromFileSystem() {
        try {
            // Try to get data subfolder
            let dataDir;
            try {
                dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: false });
                console.log('📂 Found data/ subfolder');
            } catch (e) {
                // No data subfolder, use root
                dataDir = window.directoryHandle;
                console.log('📂 Using root folder (no data/ subfolder)');
            }
            
            // Try loading from data.json (old format)
            try {
                const dataFile = await dataDir.getFileHandle('data.json');
                const fileData = await dataFile.getFile();
                const fileText = await fileData.text();
                const parsed = JSON.parse(fileText);
                
                window.recipes = parsed.recipes || [];
                window.ingredients = parsed.ingredients || [];
                window.allergens = parsed.allergens || [];
                
                console.log('✅ Loaded from data.json:', {
                    recipes: window.recipes.length,
                    ingredients: window.ingredients.length,
                    allergens: window.allergens.length
                });
            } catch (e) {
                console.log('⚠️ data.json not found, trying separate files...');
                
                // Try separate files (new format)
                try {
                    const recipesFile = await dataDir.getFileHandle('recipes.json');
                    const recipesData = await recipesFile.getFile();
                    window.recipes = JSON.parse(await recipesData.text());
                } catch (e2) {
                    window.recipes = [];
                }
                
                try {
                    const ingredientsFile = await dataDir.getFileHandle('ingredients.json');
                    const ingredientsData = await ingredientsFile.getFile();
                    window.ingredients = JSON.parse(await ingredientsData.text());
                } catch (e2) {
                    window.ingredients = [];
                }
                
                try {
                    const allergensFile = await dataDir.getFileHandle('allergens.json');
                    const allergensData = await allergensFile.getFile();
                    window.allergens = JSON.parse(await allergensData.text());
                } catch (e2) {
                    window.allergens = [];
                }
            }
            
            // Load menus.json or currentMenu.json
            try {
                const menuFile = await dataDir.getFileHandle('menus.json');
                const menuData = await menuFile.getFile();
                window.currentMenu = JSON.parse(await menuData.text());
                console.log('✅ Loaded from menus.json');
            } catch (e) {
                try {
                    const menuFile = await dataDir.getFileHandle('currentMenu.json');
                    const menuData = await menuFile.getFile();
                    window.currentMenu = JSON.parse(await menuData.text());
                    console.log('✅ Loaded from currentMenu.json');
                } catch (e2) {
                    window.currentMenu = {};
                }
            }
            
            // Load settings.json
            try {
                const settingsFile = await dataDir.getFileHandle('settings.json');
                const settingsData = await settingsFile.getFile();
                window.appSettings = JSON.parse(await settingsData.text());
                console.log('✅ Loaded settings:', window.appSettings);
            } catch (e) {
                window.appSettings = { language: 'bg' };
                console.log('ℹ️ No settings.json found, defaulting to Bulgarian');
            }
            
            // Load templates.json
            try {
                const templatesFile = await dataDir.getFileHandle('templates.json');
                const templatesData = await templatesFile.getFile();
                window.menuTemplates = JSON.parse(await templatesData.text());
                console.log('✅ Loaded templates:', Object.keys(window.menuTemplates).length, 'templates');
            } catch (e) {
                // Try migrating from localStorage
                const legacyTemplates = this.migrateLegacyTemplates();
                window.menuTemplates = legacyTemplates;
                
                if (Object.keys(legacyTemplates).length > 0) {
                    console.log('📦 Migrated', Object.keys(legacyTemplates).length, 'templates from localStorage');
                    await this.saveToFileSystem('templates', legacyTemplates);
                } else {
                    console.log('ℹ️ No templates.json found, starting with empty templates');
                }
            }
            
            console.log('✅ File System data loaded successfully!');
        } catch (err) {
            console.error('❌ Error loading from file system:', err);
        }
    }
    
    async saveToFileSystem(type, data) {
        if (!window.directoryHandle) return;
        
        try {
            // Get or create data subfolder
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: true });
            
            if (type === 'recipes' || type === 'ingredients' || type === 'allergens') {
                const combined = {
                    recipes: type === 'recipes' ? data : window.recipes,
                    ingredients: type === 'ingredients' ? data : window.ingredients,
                    allergens: type === 'allergens' ? data : window.allergens
                };
                
                const fileHandle = await dataDir.getFileHandle('data.json', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(combined, null, 2));
                await writable.close();
                
                console.log(`✅ Saved ${type} to data.json`);
            } else if (type === 'currentMenu') {
                const fileHandle = await dataDir.getFileHandle('menus.json', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(data, null, 2));
                await writable.close();
                
                console.log('✅ Saved menu to menus.json');
            } else if (type === 'appSettings') {
                const fileHandle = await dataDir.getFileHandle('settings.json', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(data, null, 2));
                await writable.close();
                
                console.log('✅ Saved settings to settings.json:', data);
            } else if (type === 'templates') {
                const fileHandle = await dataDir.getFileHandle('templates.json', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(data, null, 2));
                await writable.close();
                
                console.log('✅ Saved templates to templates.json:', Object.keys(data).length, 'templates');
            }
        } catch (err) {
            console.error(`❌ Error saving ${type}:`, err);
        }
    }
    
    async storeDirectoryHandle(dirHandle) {
        try {
            console.log('💾 Attempting to save handle to IndexedDB...');
            const db = await this.openIDB();
            const tx = db.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            
            store.put(dirHandle, 'rootDirectory');
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log('✅ Folder handle saved to IndexedDB (may not persist in file://)'); 
                    resolve();
                };
                tx.onerror = () => {
                    console.error('❌ Failed to save handle:', tx.error);
                    reject(tx.error);
                };
            });
        } catch (err) {
            console.error('❌ Error storing handle:', err);
        }
    }
    
    async getStoredDirectoryHandle() {
        try {
            const db = await this.openIDB();
            const tx = db.transaction('handles', 'readonly');
            const store = tx.objectStore('handles');
            
            const handle = await new Promise((resolve, reject) => {
                const request = store.get('rootDirectory');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return handle || null;
        } catch (err) {
            console.error('❌ Error getting handle:', err);
            return null;
        }
    }
    
    async clearStoredDirectoryHandle() {
        try {
            const db = await this.openIDB();
            const tx = db.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            
            store.delete('rootDirectory');
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log('🗑️ Cleared stored folder handle');
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error('❌ Error clearing handle:', err);
        }
    }
    
    async verifyPermission(handle) {
        const opts = { mode: 'readwrite' };
        
        const currentPermission = await handle.queryPermission(opts);
        
        if (currentPermission === 'granted') {
            console.log('✅ Permission already granted (no prompt needed)');
            return true;
        }
        
        console.log('🔐 Requesting folder permission...');
        const requestedPermission = await handle.requestPermission(opts);
        
        if (requestedPermission === 'granted') {
            console.log('✅ Permission granted by user');
            return true;
        }
        
        console.log('❌ Permission denied by user');
        return false;
    }
    
    // ==================== INDEXED DB (Firefox/Safari) ====================
    
    async initIndexedDB() {
        try {
            this.db = await this.openIDB();
            
            await this.loadFromIndexedDB();
            
            if (window.recipes.length === 0) {
                await this.prePopulateData();
            }
            
            return true;
        } catch (err) {
            console.error('IndexedDB init failed:', err);
            return false;
        }
    }
    
    openIDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('recipes')) {
                    db.createObjectStore('recipes', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('ingredients')) {
                    db.createObjectStore('ingredients', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('allergens')) {
                    db.createObjectStore('allergens', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('menu')) {
                    db.createObjectStore('menu');
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
                if (!db.objectStoreNames.contains('templates')) {
                    db.createObjectStore('templates');
                    console.log('📦 Created templates store in IndexedDB');
                }
            };
        });
    }
    
    async loadFromIndexedDB() {
        try {
            const db = await this.openIDB();
            
            const recipesTx = db.transaction('recipes', 'readonly');
            const recipesStore = recipesTx.objectStore('recipes');
            const recipesRequest = recipesStore.getAll();
            window.recipes = await new Promise((resolve) => {
                recipesRequest.onsuccess = () => resolve(recipesRequest.result || []);
                recipesRequest.onerror = () => resolve([]);
            });
            
            const ingredientsTx = db.transaction('ingredients', 'readonly');
            const ingredientsStore = ingredientsTx.objectStore('ingredients');
            const ingredientsRequest = ingredientsStore.getAll();
            window.ingredients = await new Promise((resolve) => {
                ingredientsRequest.onsuccess = () => resolve(ingredientsRequest.result || []);
                ingredientsRequest.onerror = () => resolve([]);
            });
            
            const allergensTx = db.transaction('allergens', 'readonly');
            const allergensStore = allergensTx.objectStore('allergens');
            const allergensRequest = allergensStore.getAll();
            window.allergens = await new Promise((resolve) => {
                allergensRequest.onsuccess = () => resolve(allergensRequest.result || []);
                allergensRequest.onerror = () => resolve([]);
            });
            
            const menuTx = db.transaction('menu', 'readonly');
            const menuStore = menuTx.objectStore('menu');
            const menuRequest = menuStore.get('currentMenu');
            window.currentMenu = await new Promise((resolve) => {
                menuRequest.onsuccess = () => resolve(menuRequest.result || {});
                menuRequest.onerror = () => resolve({});
            });
            
            const settingsTx = db.transaction('settings', 'readonly');
            const settingsStore = settingsTx.objectStore('settings');
            const settingsRequest = settingsStore.get('appSettings');
            window.appSettings = await new Promise((resolve) => {
                settingsRequest.onsuccess = () => resolve(settingsRequest.result || { language: 'bg' });
                settingsRequest.onerror = () => resolve({ language: 'bg' });
            });
            
            const templatesTx = db.transaction('templates', 'readonly');
            const templatesStore = templatesTx.objectStore('templates');
            const templatesRequest = templatesStore.get('menuTemplates');
            let templates = await new Promise((resolve) => {
                templatesRequest.onsuccess = () => resolve(templatesRequest.result || null);
                templatesRequest.onerror = () => resolve(null);
            });
            
            if (!templates || Object.keys(templates).length === 0) {
                templates = this.migrateLegacyTemplates();
                if (Object.keys(templates).length > 0) {
                    console.log('📦 Migrated', Object.keys(templates).length, 'templates from localStorage');
                    await this.saveToIndexedDB('templates', templates);
                }
            }
            
            window.menuTemplates = templates;
            
            console.log('✅ IndexedDB data loaded');
            console.log('✅ Settings loaded:', window.appSettings);
            console.log('✅ Templates loaded:', Object.keys(window.menuTemplates).length, 'templates');
        } catch (err) {
            console.error('Error loading from IndexedDB:', err);
            window.recipes = [];
            window.ingredients = [];
            window.allergens = [];
            window.currentMenu = {};
            window.appSettings = { language: 'bg' };
            window.menuTemplates = {};
        }
    }
    
    async saveToIndexedDB(type, data) {
        try {
            const db = await this.openIDB();
            
            if (type === 'recipes' || type === 'ingredients' || type === 'allergens') {
                const tx = db.transaction(type, 'readwrite');
                const store = tx.objectStore(type);
                await store.clear();
                
                for (const item of data) {
                    await store.put(item);
                }
            } else if (type === 'currentMenu') {
                const tx = db.transaction('menu', 'readwrite');
                const store = tx.objectStore('menu');
                await store.put(data, 'currentMenu');
            } else if (type === 'appSettings') {
                const tx = db.transaction('settings', 'readwrite');
                const store = tx.objectStore('settings');
                await store.put(data, 'appSettings');
                console.log('✅ Settings saved to IndexedDB:', data);
            } else if (type === 'templates') {
                const tx = db.transaction('templates', 'readwrite');
                const store = tx.objectStore('templates');
                await store.put(data, 'menuTemplates');
                console.log('✅ Templates saved to IndexedDB:', Object.keys(data).length, 'templates');
            }
            
            console.log(`✅ ${type} saved to IndexedDB`);
        } catch (err) {
            console.error(`Error saving ${type} to IndexedDB:`, err);
        }
    }
    
    // Migrate legacy templates from localStorage
    migrateLegacyTemplates() {
        try {
            const legacyTemplates = localStorage.getItem('meal-templates');
            if (legacyTemplates) {
                const templates = JSON.parse(legacyTemplates);
                console.log('🔄 Found legacy templates in localStorage:', Object.keys(templates).length);
                return templates;
            }
        } catch (err) {
            console.error('Error migrating legacy templates:', err);
        }
        return {};
    }
    
    async prePopulateData() {
        console.log('🌱 Pre-populating with sample data...');
        
        const sampleAllergens = [
            { id: 'alg_dairy', name: 'Dairy', color: '#ffd700', isSystem: true },
            { id: 'alg_gluten', name: 'Gluten', color: '#ff6347', isSystem: true },
            { id: 'alg_nuts', name: 'Nuts', color: '#8b4513', isSystem: true },
            { id: 'alg_fish', name: 'Fish', color: '#4682b4', isSystem: true }
        ];
        
        const sampleIngredients = [
            { id: 'ing_chicken', name: 'Chicken', allergens: [] },
            { id: 'ing_pasta', name: 'Pasta', allergens: ['alg_gluten'] },
            { id: 'ing_cheese', name: 'Cheese', allergens: ['alg_dairy'] },
            { id: 'ing_tomato', name: 'Tomato', allergens: [] },
            { id: 'ing_lettuce', name: 'Lettuce', allergens: [] }
        ];
        
        const sampleRecipes = [
            {
                id: 'rcp_pasta',
                name: 'Pasta with Tomato Sauce',
                category: 'main',
                portionSize: '350g',
                calories: 450,
                ingredients: [{ id: 'ing_pasta' }, { id: 'ing_tomato' }, { id: 'ing_cheese' }],
                manualAllergens: [],
                instructions: 'Cook pasta, add sauce, top with cheese'
            },
            {
                id: 'rcp_salad',
                name: 'Chicken Salad',
                category: 'main',
                portionSize: '300g',
                calories: 320,
                ingredients: [{ id: 'ing_chicken' }, { id: 'ing_lettuce' }, { id: 'ing_tomato' }],
                manualAllergens: [],
                instructions: 'Grill chicken, mix with vegetables'
            }
        ];
        
        window.allergens = sampleAllergens;
        window.ingredients = sampleIngredients;
        window.recipes = sampleRecipes;
        window.currentMenu = {};
        window.appSettings = { language: 'bg' };
        window.menuTemplates = {};
        
        await this.saveToIndexedDB('allergens', sampleAllergens);
        await this.saveToIndexedDB('ingredients', sampleIngredients);
        await this.saveToIndexedDB('recipes', sampleRecipes);
        await this.saveToIndexedDB('currentMenu', {});
        await this.saveToIndexedDB('appSettings', { language: 'bg' });
        await this.saveToIndexedDB('templates', {});
        
        console.log('✅ Sample data populated!');
    }
    
    // ==================== UNIFIED API ====================
    
    async save(type, data) {
        if (this.useFileSystem) {
            await this.saveToFileSystem(type, data);
        } else {
            await this.saveToIndexedDB(type, data);
        }
    }
    
    async exportData() {
        const exportData = {
            recipes: window.recipes,
            ingredients: window.ingredients,
            allergens: window.allergens,
            currentMenu: window.currentMenu,
            appSettings: window.appSettings,
            templates: window.menuTemplates || {},
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kitchenpro-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.recipes) window.recipes = data.recipes;
            if (data.ingredients) window.ingredients = data.ingredients;
            if (data.allergens) window.allergens = data.allergens;
            if (data.currentMenu) window.currentMenu = data.currentMenu;
            if (data.appSettings) window.appSettings = data.appSettings;
            if (data.templates) window.menuTemplates = data.templates;
            
            await this.save('recipes', window.recipes);
            await this.save('ingredients', window.ingredients);
            await this.save('allergens', window.allergens);
            await this.save('currentMenu', window.currentMenu);
            await this.save('appSettings', window.appSettings);
            await this.save('templates', window.menuTemplates);
            
            return true;
        } catch (err) {
            console.error('Import failed:', err);
            return false;
        }
    }
}

// Create global instance
window.storageAdapter = new StorageAdapter();

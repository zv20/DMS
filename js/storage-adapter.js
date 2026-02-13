/**
 * Smart Storage Adapter
 * - Chrome/Edge: File System API with persistent permission handling
 * - Firefox/Safari: IndexedDB
 * - Auto-detects capabilities and uses best available method
 * - Compatible with existing data.json file structure
 */

class StorageAdapter {
    constructor() {
        this.useFileSystem = 'showDirectoryPicker' in window;
        this.dbName = 'KitchenProDB';
        this.dbVersion = 1;
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
                        await this.loadFromFileSystem();
                        return true;
                    } else {
                        console.log('❌ Permission denied');
                        // Clear the stored handle since permission was denied
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
            await this.storeDirectoryHandle(dirHandle);
            await this.ensureDataFolderStructure();
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
                window.appSettings = { language: 'en' };
                console.log('ℹ️ No settings.json found, using defaults');
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
            
            // Save to data.json (combined format for compatibility)
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
            }
        } catch (err) {
            console.error(`❌ Error saving ${type}:`, err);
        }
    }
    
    async ensureDataFolderStructure() {
        if (!window.directoryHandle) return;
        
        try {
            await window.directoryHandle.getDirectoryHandle('data', { create: true });
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: false });
            await dataDir.getDirectoryHandle('archive', { create: true });
            const archiveDir = await dataDir.getDirectoryHandle('archive', { create: false });
            await archiveDir.getDirectoryHandle('menus', { create: true });
            console.log('✅ Folder structure created');
        } catch (err) {
            console.error('❌ Error creating structure:', err);
        }
    }
    
    async storeDirectoryHandle(dirHandle) {
        try {
            console.log('💾 Attempting to save handle to IndexedDB...');
            const db = await this.openIDB();
            const tx = db.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            
            // Put the handle
            store.put(dirHandle, 'rootDirectory');
            
            // Wait for transaction to complete
            await new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log('✅ Folder handle saved to IndexedDB');
                    resolve();
                };
                tx.onerror = () => {
                    console.error('❌ Failed to save handle:', tx.error);
                    reject(tx.error);
                };
            });
            
            // Verify it was saved by reading it back
            const verifyTx = db.transaction('handles', 'readonly');
            const verifyStore = verifyTx.objectStore('handles');
            const verifyResult = await new Promise((resolve) => {
                const req = verifyStore.get('rootDirectory');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
            
            if (verifyResult) {
                console.log('✅ Verified handle was saved, type:', typeof verifyResult);
            } else {
                console.log('⚠️ Warning: Could not verify saved handle');
            }
        } catch (err) {
            console.error('❌ Error storing handle:', err);
        }
    }
    
    async getStoredDirectoryHandle() {
        try {
            console.log('💾 Attempting to retrieve handle from IndexedDB...');
            const db = await this.openIDB();
            const tx = db.transaction('handles', 'readonly');
            const store = tx.objectStore('handles');
            
            const handle = await new Promise((resolve, reject) => {
                const request = store.get('rootDirectory');
                request.onsuccess = () => {
                    const result = request.result;
                    console.log('💾 IndexedDB returned:', result ? `Object of type ${typeof result}` : 'null');
                    if (result) {
                        console.log('💾 Result keys:', Object.keys(result));
                        console.log('💾 Has queryPermission?', 'queryPermission' in result);
                    }
                    resolve(result);
                };
                request.onerror = () => {
                    console.error('❌ Error reading from IndexedDB:', request.error);
                    reject(request.error);
                };
            });
            
            if (handle) {
                console.log('✅ Retrieved folder handle from IndexedDB');
            } else {
                console.log('⚠️ No handle found in IndexedDB');
            }
            
            return handle;
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
        
        // Check if we already have permission
        const currentPermission = await handle.queryPermission(opts);
        
        if (currentPermission === 'granted') {
            console.log('✅ Permission already granted (no prompt needed)');
            return true;
        }
        
        // Only request if not already granted
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
            
            // Load data from IndexedDB
            await this.loadFromIndexedDB();
            
            // If empty, pre-populate with sample data
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
                
                // Create object stores
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
            };
        });
    }
    
    async loadFromIndexedDB() {
        try {
            const db = await this.openIDB();
            
            // Load recipes
            const recipesTx = db.transaction('recipes', 'readonly');
            const recipesStore = recipesTx.objectStore('recipes');
            const recipesRequest = recipesStore.getAll();
            window.recipes = await new Promise((resolve) => {
                recipesRequest.onsuccess = () => resolve(recipesRequest.result || []);
                recipesRequest.onerror = () => resolve([]);
            });
            
            // Load ingredients
            const ingredientsTx = db.transaction('ingredients', 'readonly');
            const ingredientsStore = ingredientsTx.objectStore('ingredients');
            const ingredientsRequest = ingredientsStore.getAll();
            window.ingredients = await new Promise((resolve) => {
                ingredientsRequest.onsuccess = () => resolve(ingredientsRequest.result || []);
                ingredientsRequest.onerror = () => resolve([]);
            });
            
            // Load allergens
            const allergensTx = db.transaction('allergens', 'readonly');
            const allergensStore = allergensTx.objectStore('allergens');
            const allergensRequest = allergensStore.getAll();
            window.allergens = await new Promise((resolve) => {
                allergensRequest.onsuccess = () => resolve(allergensRequest.result || []);
                allergensRequest.onerror = () => resolve([]);
            });
            
            // Load menu
            const menuTx = db.transaction('menu', 'readonly');
            const menuStore = menuTx.objectStore('menu');
            const menuRequest = menuStore.get('currentMenu');
            window.currentMenu = await new Promise((resolve) => {
                menuRequest.onsuccess = () => resolve(menuRequest.result || {});
                menuRequest.onerror = () => resolve({});
            });
            
            // Load settings
            const settingsTx = db.transaction('settings', 'readonly');
            const settingsStore = settingsTx.objectStore('settings');
            const settingsRequest = settingsStore.get('appSettings');
            window.appSettings = await new Promise((resolve) => {
                settingsRequest.onsuccess = () => resolve(settingsRequest.result || { language: 'en' });
                settingsRequest.onerror = () => resolve({ language: 'en' });
            });
            
            console.log('✅ IndexedDB data loaded');
            console.log('✅ Settings loaded:', window.appSettings);
        } catch (err) {
            console.error('Error loading from IndexedDB:', err);
            window.recipes = [];
            window.ingredients = [];
            window.allergens = [];
            window.currentMenu = {};
            window.appSettings = { language: 'en' };
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
            }
            
            console.log(`✅ ${type} saved to IndexedDB`);
        } catch (err) {
            console.error(`Error saving ${type} to IndexedDB:`, err);
        }
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
        window.appSettings = { language: 'en' };
        
        await this.saveToIndexedDB('allergens', sampleAllergens);
        await this.saveToIndexedDB('ingredients', sampleIngredients);
        await this.saveToIndexedDB('recipes', sampleRecipes);
        await this.saveToIndexedDB('currentMenu', {});
        await this.saveToIndexedDB('appSettings', { language: 'en' });
        
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
            
            await this.save('recipes', window.recipes);
            await this.save('ingredients', window.ingredients);
            await this.save('allergens', window.allergens);
            await this.save('currentMenu', window.currentMenu);
            await this.save('appSettings', window.appSettings);
            
            return true;
        } catch (err) {
            console.error('Import failed:', err);
            return false;
        }
    }
}

// Create global instance
window.storageAdapter = new StorageAdapter();

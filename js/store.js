// Data Store & Storage Adapter Integration

(function(window) {
    // Global Data Arrays
    window.recipes = [];
    window.ingredients = [];
    window.allergens = [];
    window.currentMenu = {};
    window.menuHistory = [];
    window.directoryHandle = null;
    window.savedTemplates = [];
    window.imageUploads = [];
    window.appSettings = { language: 'en' };
    window.imageCache = {};

    // Predefined allergens
    window.PREDEFINED_ALLERGENS = [
        { id: 'alg_gluten', name: 'Gluten', color: '#f59f00', name_bg: 'Глутен', isSystem: true },
        { id: 'alg_crustaceans', name: 'Crustaceans', color: '#ff6b6b', name_bg: 'Ракообразни', isSystem: true },
        { id: 'alg_eggs', name: 'Eggs', color: '#ffd43b', name_bg: 'Яйца', isSystem: true },
        { id: 'alg_fish', name: 'Fish', color: '#339af0', name_bg: 'Риба', isSystem: true },
        { id: 'alg_peanuts', name: 'Peanuts', color: '#d9480f', name_bg: 'Фъстъци', isSystem: true },
        { id: 'alg_soybeans', name: 'Soybeans', color: '#5c940d', name_bg: 'Соя', isSystem: true },
        { id: 'alg_milk', name: 'Milk', color: '#74c0fc', name_bg: 'Мляко', isSystem: true },
        { id: 'alg_nuts', name: 'Nuts', color: '#e67700', name_bg: 'Ядки', isSystem: true },
        { id: 'alg_celery', name: 'Celery', color: '#82c91e', name_bg: 'Целина', isSystem: true },
        { id: 'alg_mustard', name: 'Mustard', color: '#fcc419', name_bg: 'Горчица', isSystem: true },
        { id: 'alg_sesame', name: 'Sesame', color: '#adb5bd', name_bg: 'Сусам', isSystem: true },
        { id: 'alg_sulphites', name: 'Sulphites', color: '#868e96', name_bg: 'Сулфити', isSystem: true },
        { id: 'alg_lupin', name: 'Lupin', color: '#ffec99', name_bg: 'Лупина', isSystem: true },
        { id: 'alg_molluscs', name: 'Molluscs', color: '#ff922b', name_bg: 'Мекотели', isSystem: true }
    ];

    // ==================== INITIALIZATION ====================
    
    window.checkPreviousFolder = async function() {
        const initialized = await window.storageAdapter.init();
        
        // Populate default allergens if empty
        if (initialized && window.allergens.length === 0) {
            window.populateDefaultAllergens();
            await window.storageAdapter.save('allergens', window.allergens);
        }
        
        return initialized;
    };

    window.autoLoadFromFolder = async function() {
        // Storage adapter handles this in init()
        return true;
    };

    window.selectSaveLocation = async function() {
        if (window.storageAdapter.useFileSystem) {
            // Chrome/Edge: Show folder picker
            const success = await window.storageAdapter.selectFolder();
            if (success && window.allergens.length === 0) {
                window.populateDefaultAllergens();
                await window.storageAdapter.save('allergens', window.allergens);
            }
            return success;
        } else {
            // Firefox/Safari: Already using IndexedDB, no folder needed
            console.log('Using IndexedDB storage (no folder selection needed)');
            return true;
        }
    };

    window.populateDefaultAllergens = function() {
        window.PREDEFINED_ALLERGENS.forEach(def => {
            if (!window.allergens.find(a => a.id === def.id)) {
                window.allergens.push({ ...def });
            }
        });
        console.log('✅ Populated default allergens');
    };

    // ==================== SAVE FUNCTIONS ====================

    window.updateRecipes = async function(recipes) {
        window.recipes = recipes;
        await window.storageAdapter.save('recipes', recipes);
        window.showSyncIndicator();
    };

    window.updateIngredients = async function(ingredients) {
        window.ingredients = ingredients;
        await window.storageAdapter.save('ingredients', ingredients);
        window.showSyncIndicator();
    };

    window.updateAllergens = async function(allergens) {
        window.allergens = allergens;
        await window.storageAdapter.save('allergens', allergens);
        window.showSyncIndicator();
    };

    window.saveData = async function() {
        await window.storageAdapter.save('currentMenu', window.currentMenu);
        window.showSyncIndicator();
    };
    
    // Legacy compatibility
    window.saveMenus = window.saveData;

    window.saveMenu = async function(name) {
        const menu = {
            id: window.generateId('menu'),
            name: name,
            date: new Date().toISOString(),
            data: JSON.stringify(window.currentMenu)
        };
        window.menuHistory.push(menu);
        await window.storageAdapter.save('menuHistory', window.menuHistory);
        window.renderMenuHistory();
    };

    window.loadSavedMenu = function(id) {
        const menu = window.menuHistory.find(m => m.id === id);
        if (!menu) return;
        window.currentMenu = JSON.parse(menu.data);
        window.saveData();
        window.renderCalendar(window.currentCalendarDate);
    };

    window.deleteSavedMenu = async function(id) {
        if (!confirm(window.t('alert_delete_menu'))) return;
        window.menuHistory = window.menuHistory.filter(m => m.id !== id);
        await window.storageAdapter.save('menuHistory', window.menuHistory);
        window.renderMenuHistory();
    };

    // ==================== IMPORT/EXPORT ====================
    
    window.exportAllData = async function() {
        await window.storageAdapter.exportData();
    };
    
    window.importData = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const success = await window.storageAdapter.importData(file);
        if (success) {
            alert('Data imported successfully!');
            window.renderAll();
        } else {
            alert('Import failed. Please check the file format.');
        }
    };

    // ==================== SYNC INDICATOR ====================

    window.showSyncIndicator = function() {
        const indicator = document.getElementById('syncIndicator');
        if (!indicator) return;
        indicator.classList.remove('sync-hidden');
        indicator.classList.add('sync-visible');
        setTimeout(() => {
            indicator.classList.remove('sync-visible');
            indicator.classList.add('sync-hidden');
        }, 2000);
    };

    // ==================== ARCHIVE FOLDER (Chrome/Edge only) ====================

    window.openArchiveFolder = async function() {
        if (!window.storageAdapter.useFileSystem) {
            alert('Archive folder is only available in Chrome/Edge.\n\nUse Export Data to backup your meals.');
            return;
        }
        
        if (!window.directoryHandle) {
            alert('No folder selected. Please select a storage folder first.');
            return;
        }
        
        try {
            const archiveDir = await window.directoryHandle.getDirectoryHandle('archive', { create: true });
            await archiveDir.getDirectoryHandle('menus', { create: true });
            
            alert('Archive folder opened!\n\nNote: Browser limitations prevent direct folder opening.\nYou can find your PDFs in the selected folder under:\narchive/menus/');
        } catch (err) {
            alert('Could not access archive folder.');
        }
    };

    // ==================== MENU HELPERS ====================

    window.getMenuForDate = function(dateStr) {
        if (!window.currentMenu[dateStr]) {
            window.currentMenu[dateStr] = {};
        }
        return window.currentMenu[dateStr];
    };
    
    window.updateMenuForDate = function(dateStr, slotId, category, recipeId) {
        if (!window.currentMenu[dateStr]) {
            window.currentMenu[dateStr] = {};
        }
        window.currentMenu[dateStr][slotId] = {
            type: category,
            recipe: recipeId
        };
        window.saveData();
    };
    
    window.dateHasMeals = function(dateStr) {
        const menu = window.currentMenu[dateStr];
        if (!menu) return false;
        return Object.values(menu).some(slot => slot && slot.recipe);
    };

})(window);

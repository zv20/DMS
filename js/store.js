// Data Store & Storage Adapter Integration

(function(window) {
    // Global Data Arrays
    window.recipes = [];
    window.ingredients = [];
    window.allergens = [];
    window.currentMenu = {};
    window.menuHistory = [];
    window.savedTemplates = [];
    window.imageUploads = [];
    window.appSettings = { language: 'bg', theme: 'default', autoBackupLimit: 3 };  // Changed default from 'en' to 'bg'
    window.imageCache = {};

    // Predefined allergens (only used for initial population on brand new installs)
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
        
        // Initialize language from loaded settings
        if (window.appSettings && window.appSettings.language) {
            console.log('🌍 Setting language from loaded settings:', window.appSettings.language);
            window.changeLanguage(window.appSettings.language, false); // false = don't save again
        }
        if (window.appSettings && window.appSettings.theme && typeof window.setAppTheme === 'function') {
            window.setAppTheme(window.appSettings.theme, false);
        }
        const autoBackupLimit = document.getElementById('autoBackupLimit');
        if (autoBackupLimit) autoBackupLimit.value = String(Number.isInteger(window.appSettings.autoBackupLimit) ? window.appSettings.autoBackupLimit : 3);
        
        return initialized;
    };

    window.autoLoadFromFolder = async function() {
        // Storage adapter handles this in init()
        return true;
    };

    window.selectSaveLocation = async function() {
        return true;
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

    // Save app settings (language, theme, etc.)
    window.saveSettings = async function() {
        console.log('💾 saveSettings called, saving:', window.appSettings);
        await window.storageAdapter.save('appSettings', window.appSettings);
        window.showSyncIndicator();
        console.log('✅ Settings saved successfully');
    };

    window.updateAutoBackupLimit = async function(value) {
        const limit = Math.max(0, Math.min(20, parseInt(value, 10) || 0));
        window.appSettings.autoBackupLimit = limit;
        const input = document.getElementById('autoBackupLimit');
        if (input) input.value = String(limit);
        await window.saveSettings();
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
            alert(window.t('alert_import_success'));
            window.renderAll();
        } else {
            alert(window.t('alert_import_error'));
        }
    };

    window.openImportData = async function() {
        try {
            const preview = await window.storageAdapter.chooseImport();
            if (!preview) return;
            const summary = window.t('alert_import_preview')
                .replace('{recipes}', preview.recipes)
                .replace('{ingredients}', preview.ingredients)
                .replace('{allergens}', preview.allergens)
                .replace('{menus}', preview.menuDates)
                .replace('{templates}', preview.templates)
                .replace('{images}', preview.images || 0);
            if (!confirm(summary)) return;
            await window.storageAdapter.applyImport(preview.id);
            window.renderAll();
            alert(window.t('alert_import_success'));
        } catch (error) {
            console.error('Desktop import failed:', error);
            alert(window.t('alert_import_error'));
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

    // ==================== MENU HELPERS ====================

    window.getMenuForDate = function(dateStr) {
        if (!window.currentMenu[dateStr]) {
            window.currentMenu[dateStr] = {};
        }
        return window.currentMenu[dateStr];
    };
    
    window.saveMenuSlot = async function(dateStr, slotId, item) {
        if (!window.currentMenu[dateStr]) {
            window.currentMenu[dateStr] = {};
        }
        if (window.storageAdapter.isDesktop && window.storageAdapter.upsertMenuSlot) {
            await window.storageAdapter.upsertMenuSlot(dateStr, slotId, item);
            window.currentMenu[dateStr][slotId] = item;
            window.showSyncIndicator();
            return;
        }
        window.currentMenu[dateStr][slotId] = item;
        await window.saveData();
    };

    // FIXED: Use 'category' instead of 'type' to match calendar.js expectations
    window.updateMenuForDate = function(dateStr, slotId, category, recipeId) {
        return window.saveMenuSlot(dateStr, slotId, {
            category: category,  // Changed from 'type' to 'category'
            recipe: recipeId
        });
    };
    
    window.dateHasMeals = function(dateStr) {
        const menu = window.currentMenu[dateStr];
        if (!menu) return false;
        return Object.values(menu).some(slot => slot && slot.recipe);
    };

})(window);

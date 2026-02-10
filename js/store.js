/**
 * Data Store Manager
 * Handles ALL data persistence with separate files:
 * - data.json: recipes, ingredients, allergens
 * - menus.json: all menu planning by date
 * - settings.json: templates and preferences
 */

(function(window) {
    let saveLocation = null;
    let autoSaveTimeout = null;

    // Global data stores
    window.recipes = [];
    window.ingredients = [];
    window.allergens = [];
    window.currentMenu = {}; // Now holds ALL menus by date {"2026-02-10": {slot1: {...}, ...}}
    window.savedTemplates = [];
    window.currentCalendarDate = new Date();
    window.currentViewMode = 'weekly'; // 'weekly' or 'monthly'

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

    // Initialize File System
    window.initFileSystem = async function() {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            saveLocation = dirHandle;
            localStorage.setItem('lastSaveLocation', 'granted');
            await window.loadAllData();
            return true;
        } catch (err) {
            console.error('File system access denied:', err);
            return false;
        }
    };

    window.selectSaveLocation = async function() {
        const granted = await window.initFileSystem();
        if (granted) {
            alert('Storage folder selected successfully!');
            window.renderUI();
        }
    };

    // Load all data from files
    window.loadAllData = async function() {
        if (!saveLocation) {
            const lastAccess = localStorage.getItem('lastSaveLocation');
            if (lastAccess === 'granted') {
                try {
                    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                    saveLocation = dirHandle;
                } catch (err) {
                    console.log('No folder selected');
                    return;
                }
            } else {
                return;
            }
        }

        try {
            // Load data.json (recipes, ingredients, allergens)
            const dataContent = await window.readFile(saveLocation, 'data.json');
            if (dataContent) {
                const parsed = JSON.parse(dataContent);
                window.recipes = parsed.recipes || [];
                window.ingredients = parsed.ingredients || [];
                window.allergens = parsed.allergens || [];
            }

            // Load menus.json (all menu planning by date)
            const menusContent = await window.readFile(saveLocation, 'menus.json');
            if (menusContent) {
                window.currentMenu = JSON.parse(menusContent);
            }

            // Load settings.json (templates, preferences)
            const settingsContent = await window.readFile(saveLocation, 'settings.json');
            if (settingsContent) {
                const parsed = JSON.parse(settingsContent);
                window.savedTemplates = parsed.templates || [];
            }

            // Populate default allergens if empty
            if (window.allergens.length === 0) {
                window.populateDefaultAllergens();
            }

            console.log('All data loaded successfully');
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

    // Save data.json (recipes, ingredients, allergens)
    window.saveData = function() {
        if (!saveLocation) return;

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            try {
                const data = {
                    recipes: window.recipes,
                    ingredients: window.ingredients,
                    allergens: window.allergens
                };
                await window.writeFile(saveLocation, 'data.json', JSON.stringify(data, null, 2));
                window.showSyncIndicator();
            } catch (err) {
                console.error('Error saving data.json:', err);
            }
        }, 300);
    };

    // Save menus.json (all menu planning)
    window.saveMenus = function() {
        if (!saveLocation) return;

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            try {
                await window.writeFile(saveLocation, 'menus.json', JSON.stringify(window.currentMenu, null, 2));
                window.showSyncIndicator();
            } catch (err) {
                console.error('Error saving menus.json:', err);
            }
        }, 300);
    };

    // Save settings.json (templates, preferences)
    window.saveSettings = function() {
        if (!saveLocation) return;

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            try {
                const settings = {
                    templates: window.savedTemplates
                };
                await window.writeFile(saveLocation, 'settings.json', JSON.stringify(settings, null, 2));
                window.showSyncIndicator();
            } catch (err) {
                console.error('Error saving settings.json:', err);
            }
        }, 300);
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
        indicator.classList.add('sync-visible');
        indicator.textContent = '✓';
        
        setTimeout(() => {
            indicator.classList.remove('sync-visible');
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

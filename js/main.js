// Main Entry Point with Animated Loading

(function(window) {
    
    // --- Utility Functions ---
    window.generateId = function(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // ─── DUPLICATE DETECTION HELPERS ─────────────────────────────────────────
    function isDuplicateName(arr, name, excludeId) {
        const normalized = name.trim().toLowerCase();
        return arr.some(item => item.id !== excludeId && item.name.trim().toLowerCase() === normalized);
    }
    function isDuplicateAllergenName(arr, name, excludeId) {
        const normalized = name.trim().toLowerCase();
        return arr.some(item => item.id !== excludeId && window.getAllergenName(item).trim().toLowerCase() === normalized);
    }
    
    // --- Initialization ---
    async function init() {
        const closeBtn = document.getElementById('closeNavBtn');
        if(closeBtn) closeBtn.addEventListener('click', window.toggleNav);
        
        const langSel = document.getElementById('languageSelect');
        if (langSel) {
            langSel.addEventListener('change', (e) => window.changeLanguage(e.target.value));
        }

        window.bindNavigation();
        window.setAppTheme(localStorage.getItem('appTheme') || 'default');

        await handleAnimatedLoading();
    }

    // --- Animated Loading with Messages ---
    async function handleAnimatedLoading() {
        const splash = document.getElementById('splashScreen');
        const actions = document.getElementById('splashActions');
        const subtitle = splash.querySelector('.splash-subtitle');
        
        const loadingMessages = [
            window.t('loading_detecting'),
            window.t('loading_data'),
            window.t('loading_recipes'),
            window.t('loading_ingredients'),
            window.t('loading_ready')
        ];
        
        let messageIndex = 0;
        
        function showNextMessage() {
            if (messageIndex < loadingMessages.length) {
                subtitle.textContent = loadingMessages[messageIndex];
                messageIndex++;
            }
        }
        
        actions.innerHTML = '<div class="loader-spinner"></div>';
        showNextMessage();
        const messageInterval = setInterval(showNextMessage, 600);
        
        try {
            const initialized = await window.checkPreviousFolder();
            
            if (initialized) {
                clearInterval(messageInterval);
                
                if (window.storageAdapter.useFileSystem) {
                    subtitle.textContent = window.t('loading_loaded_folder');
                } else {
                    subtitle.textContent = window.t('loading_loaded_browser');
                }
                
                await new Promise(resolve => setTimeout(resolve, 800));
                hideSplash();
            } else {
                clearInterval(messageInterval);
                askForFolder();
            }
        } catch (err) {
            console.error('Loading error:', err);
            clearInterval(messageInterval);
            
            if (!window.storageAdapter.useFileSystem) {
                subtitle.textContent = window.t('loading_fresh');
                await new Promise(resolve => setTimeout(resolve, 500));
                hideSplash();
            } else {
                askForFolder();
            }
        }
        
        function askForFolder() {
            if (window.storageAdapter && !window.storageAdapter.useFileSystem) {
                subtitle.textContent = window.t('loading_ready_go');
                setTimeout(hideSplash, 500);
                return;
            }
            
            const lastFolder = window.storageAdapter.getFolderHint();
            
            if (lastFolder) {
                subtitle.innerHTML = `${window.t('loading_select_folder')}<br><small style="color: #666; font-size: 0.85em;">${window.t('loading_last_folder')} <strong>${lastFolder}</strong></small>`;
            } else {
                subtitle.textContent = window.t('loading_select_folder');
            }
            
            const buttonText = window.getCurrentLanguage() === 'bg' ? 'Избери Папка' : 'Select Folder';
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="window.selectFolderAndStart()" style="min-width: 200px; height: 48px;">
                    <span>📁</span> ${buttonText}
                </button>
            `;
        }
        
        function hideSplash() {
            splash.style.opacity = '0';
            document.body.classList.add('app-loaded');
            setTimeout(() => {
                splash.style.display = 'none';
                
                if (window.appSettings && window.appSettings.language) {
                    console.log('🌍 Applying language from settings:', window.appSettings.language);
                    window.changeLanguage(window.appSettings.language, false);
                } else {
                    window.applyTranslations();
                }
                
                window.initStyleBuilder();
                window.renderAll();
                if (window.CalendarManager) {
                    window.CalendarManager.init();
                }
            }, 500);
        }
        
        window.selectFolderAndStart = async function() {
            actions.innerHTML = '<div class="loader-spinner"></div>';
            subtitle.textContent = window.t('loading_setup');
            
            const selected = await window.selectSaveLocation();
            
            if (selected) {
                subtitle.textContent = window.t('loading_complete');
                await new Promise(resolve => setTimeout(resolve, 500));
                hideSplash();
            } else {
                askForFolder();
            }
        };
    }

    // --- CRUD Save Functions ---
    window.saveRecipe = function(e) {
        e.preventDefault();
        const id = window.editingRecipeId || window.generateId('rcp');
        const name = document.getElementById('recipeName').value.trim();
        const cat = document.getElementById('recipeCategory').value;
        const portion = document.getElementById('recipePortionSize').value;
        const calories = document.getElementById('recipeCalories').value;
        const instr = document.getElementById('recipeInstructions').value;

        if (isDuplicateName(window.recipes, name, window.editingRecipeId)) {
            alert(`A recipe named "${name}" already exists. Please use a different name.`);
            return;
        }
        
        const ingTags = document.getElementById('recipeIngredients').querySelectorAll('.tag');
        const ingredients = Array.from(ingTags).map(t => ({ id: t.dataset.id }));
        
        const algTags = document.getElementById('recipeManualAllergens').querySelectorAll('.tag');
        const manualAllergens = Array.from(algTags).map(t => ({ id: t.dataset.id }));

        const newRecipe = {
            id, name, category: cat, portionSize: portion, 
            calories: calories ? parseInt(calories) : null,
            instructions: instr, ingredients, manualAllergens
        };

        if (window.editingRecipeId) {
            const idx = window.recipes.findIndex(r => r.id === id);
            if (idx !== -1) window.recipes[idx] = newRecipe;
        } else {
            window.recipes.push(newRecipe);
        }
        
        window.updateRecipes(window.recipes);
        window.closeRecipeModal();
        window.renderRecipes();
        // Re-render calendar so slot dropdowns immediately reflect the new/updated recipe
        window.renderCalendar(window.currentCalendarDate);
    };

    window.saveIngredient = function(e) {
        e.preventDefault();
        const id = window.editingIngredientId || window.generateId('ing');
        const name = document.getElementById('ingredientName').value.trim();

        if (isDuplicateName(window.ingredients, name, window.editingIngredientId)) {
            alert(`An ingredient named "${name}" already exists. Please use a different name.`);
            return;
        }
        
        const algTags = document.getElementById('ingredientLinkedAllergens').querySelectorAll('.tag');
        const allergens = Array.from(algTags).map(t => t.dataset.id);

        const newIng = { id, name, allergens };
        
        if (window.editingIngredientId) {
            const idx = window.ingredients.findIndex(i => i.id === id);
            if (idx !== -1) window.ingredients[idx] = newIng;
        } else {
            window.ingredients.push(newIng);
        }
        
        window.updateIngredients(window.ingredients);
        window.closeIngredientModal();
        window.renderIngredients();
        window.updateSelects();
    };

    window.saveAllergen = function(e) {
        e.preventDefault();
        const id = window.editingAllergenId || window.generateId('alg');
        const name = document.getElementById('allergenName').value.trim();
        const color = document.getElementById('allergenColor').value;

        if (isDuplicateAllergenName(window.allergens, name, window.editingAllergenId)) {
            alert(`An allergen named "${name}" already exists. Please use a different name.`);
            return;
        }

        const newAlg = { id, name, color };
        
        if (window.editingAllergenId) {
            const idx = window.allergens.findIndex(a => a.id === id);
            if (idx !== -1) window.allergens[idx] = newAlg;
        } else {
            window.allergens.push(newAlg);
        }
        
        window.updateAllergens(window.allergens);
        window.closeAllergenModal();
        window.renderAllergens();
        window.updateSelects();
    };

    window.deleteRecipe = function(id) {
        if(confirm(window.t('alert_delete_recipe'))) {
            window.recipes = window.recipes.filter(r => r.id !== id);
            window.updateRecipes(window.recipes);
            window.renderRecipes();
            // Re-render calendar so deleted recipe disappears from slot dropdowns immediately
            window.renderCalendar(window.currentCalendarDate);
        }
    };
    
    window.deleteIngredient = function(id) {
        if(confirm(window.t('alert_delete_ingredient'))) {
            window.ingredients = window.ingredients.filter(i => i.id !== id);
            window.updateIngredients(window.ingredients);
            window.renderIngredients();
            window.updateSelects();
        }
    };
    
    window.deleteAllergen = function(id) {
        if(confirm(window.t('alert_delete_allergen'))) {
            window.allergens = window.allergens.filter(a => a.id !== id);
            window.updateAllergens(window.allergens);
            window.renderAllergens();
            window.updateSelects();
        }
    };

    // --- Expose Global Functions ---
    window.changeMonth = (delta) => {
        if (window.CalendarManager) {
            window.CalendarManager.changeMonth(delta);
        }
    };

    // Start App
    window.addEventListener('DOMContentLoaded', init);
})(window);

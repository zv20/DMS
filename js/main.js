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

    // Refresh the calendar through CalendarManager so it respects current view mode
    function refreshCalendar() {
        if (window.CalendarManager) {
            window.CalendarManager.render();
        }
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
        window.setAppTheme(window.storageAdapter?.isDesktop ? 'default' : localStorage.getItem('appTheme') || 'default', false);

        await handleAnimatedLoading();
    }

    // --- Animated Loading with Messages ---
    async function handleAnimatedLoading() {
        const splash = document.getElementById('splashScreen');
        const actions = document.getElementById('splashActions');
        const subtitle = splash.querySelector('.splash-subtitle');
        const progressFill = document.getElementById('splashProgressFill');
        const minimumSplashMs = 2200;
        const startedAt = Date.now();
        
        const loadingMessages = [
            window.t('loading_preparing_menu'),
            window.t('loading_mixing_ingredients'),
            window.t('loading_checking_allergens'),
            window.t('loading_templates'),
            window.t('loading_workspace')
        ];
        
        let messageIndex = 0;
        let progress = 8;
        
        function showNextMessage() {
            if (messageIndex < loadingMessages.length) {
                subtitle.textContent = loadingMessages[messageIndex];
                messageIndex++;
            }
        }

        function setProgress(value) {
            progress = Math.max(progress, Math.min(100, value));
            if (progressFill) progressFill.style.width = `${progress}%`;
        }
        
        actions.innerHTML = '<div class="loader-spinner"></div>';
        showNextMessage();
        setProgress(12);
        const messageInterval = setInterval(() => {
            showNextMessage();
            setProgress(progress + 18);
        }, 480);
        
        try {
            const initialized = await window.checkPreviousFolder();
            setProgress(88);
            const remaining = Math.max(0, minimumSplashMs - (Date.now() - startedAt));
            if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
            
            if (initialized) {
                clearInterval(messageInterval);
                subtitle.textContent = window.t('loading_ready_go');
                setProgress(100);
                await new Promise(resolve => setTimeout(resolve, 800));
                hideSplash();
            } else {
                clearInterval(messageInterval);
                subtitle.textContent = window.t('loading_ready_go');
                setProgress(100);
                setTimeout(hideSplash, 500);
            }
        } catch (err) {
            console.error('Loading error:', err);
            clearInterval(messageInterval);
            subtitle.textContent = window.t('sync_error');
            actions.innerHTML = '';
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
                window.showOnboardingIfNeeded?.();
            }, 500);
        }
    }

    window.showOnboardingIfNeeded = function() {
        if (window.appSettings?.onboardingComplete) return;
        const modal = document.getElementById('onboarding-modal');
        if (!modal) return;
        modal.style.display = 'grid';
        window.applyTranslations?.();
        document.getElementById('btn-finish-onboarding')?.addEventListener('click', async () => {
            window.appSettings.onboardingComplete = true;
            await window.saveSettings();
            modal.style.display = 'none';
            window.showToast?.(window.t ? window.t('toast_settings_saved') : 'Settings saved.', { type: 'success' });
        }, { once: true });
    };

    // --- CRUD Save Functions ---
    window.saveRecipe = async function(e) {
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

        const nextRecipes = window.editingRecipeId
            ? window.recipes.map(recipe => recipe.id === id ? newRecipe : recipe)
            : [...window.recipes, newRecipe];
        try {
            if (window.storageAdapter.isDesktop) {
                await window.storageAdapter.upsert('recipes', newRecipe);
                window.recipes = nextRecipes;
            } else {
                await window.updateRecipes(nextRecipes);
            }
        } catch (error) {
            console.error('Recipe save failed:', error);
            alert(window.t('alert_save_recipe_failed'));
            return;
        }
        window.closeRecipeModal();
        window.renderRecipes();
        // Re-render calendar via CalendarManager so view mode (weekly/monthly) is preserved
        refreshCalendar();
    };

    window.saveIngredient = async function(e) {
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
        
        const nextIngredients = window.editingIngredientId
            ? window.ingredients.map(ingredient => ingredient.id === id ? newIng : ingredient)
            : [...window.ingredients, newIng];
        try {
            if (window.storageAdapter.isDesktop) {
                await window.storageAdapter.upsert('ingredients', newIng);
                window.ingredients = nextIngredients;
            } else {
                await window.updateIngredients(nextIngredients);
            }
        } catch (error) {
            console.error('Ingredient save failed:', error);
            alert(window.t('alert_save_ingredient_failed'));
            return;
        }
        window.closeIngredientModal();
        window.renderIngredients();
        window.updateSelects();
    };

    window.saveAllergen = async function(e) {
        e.preventDefault();
        const id = window.editingAllergenId || window.generateId('alg');
        const name = document.getElementById('allergenName').value.trim();
        const color = document.getElementById('allergenColor').value;

        if (isDuplicateAllergenName(window.allergens, name, window.editingAllergenId)) {
            alert(`An allergen named "${name}" already exists. Please use a different name.`);
            return;
        }

        const newAlg = { id, name, color };
        
        const nextAllergens = window.editingAllergenId
            ? window.allergens.map(allergen => allergen.id === id ? newAlg : allergen)
            : [...window.allergens, newAlg];
        try {
            if (window.storageAdapter.isDesktop) {
                await window.storageAdapter.upsert('allergens', newAlg);
                window.allergens = nextAllergens;
            } else {
                await window.updateAllergens(nextAllergens);
            }
        } catch (error) {
            console.error('Allergen save failed:', error);
            alert(window.t('alert_save_allergen_failed'));
            return;
        }
        window.closeAllergenModal();
        window.renderAllergens();
        window.updateSelects();
    };

    window.deleteRecipe = async function(id) {
        if(confirm(window.t('alert_delete_recipe'))) {
            const removed = window.recipes.find(r => r.id === id);
            const nextRecipes = window.recipes.filter(r => r.id !== id);
            try {
                if (window.storageAdapter.isDesktop) {
                    await window.storageAdapter.delete('recipes', id);
                    window.recipes = nextRecipes;
                } else {
                    await window.updateRecipes(nextRecipes);
                }
            } catch (error) {
                console.error('Recipe delete failed:', error);
                alert(window.t('alert_delete_recipe_failed'));
                return;
            }
            window.renderRecipes();
            // Re-render calendar via CalendarManager so view mode is preserved
            refreshCalendar();
            if (removed) {
                window.pushUndoAction?.({
                    message: window.t ? window.t('toast_recipe_deleted') : 'Recipe deleted.',
                    undo: async () => {
                        if (window.storageAdapter.isDesktop) await window.storageAdapter.upsert('recipes', removed);
                        else await window.updateRecipes([...window.recipes, removed]);
                        window.recipes = [...window.recipes.filter(r => r.id !== removed.id), removed];
                        window.renderRecipes();
                        refreshCalendar();
                    }
                });
            }
        }
    };
    
    window.deleteIngredient = async function(id) {
        if(confirm(window.t('alert_delete_ingredient'))) {
            const removed = window.ingredients.find(ingredient => ingredient.id === id);
            const nextIngredients = window.ingredients.filter(ingredient => ingredient.id !== id);
            try {
                if (window.storageAdapter.isDesktop) {
                    await window.storageAdapter.delete('ingredients', id);
                    window.ingredients = nextIngredients;
                } else {
                    await window.updateIngredients(nextIngredients);
                }
            } catch (error) {
                console.error('Ingredient delete failed:', error);
                alert(window.t('alert_delete_ingredient_failed'));
                return;
            }
            window.renderIngredients();
            window.updateSelects();
            if (removed) {
                window.pushUndoAction?.({
                    message: window.t ? window.t('toast_ingredient_deleted') : 'Ingredient deleted.',
                    undo: async () => {
                        if (window.storageAdapter.isDesktop) await window.storageAdapter.upsert('ingredients', removed);
                        else await window.updateIngredients([...window.ingredients, removed]);
                        window.ingredients = [...window.ingredients.filter(ingredient => ingredient.id !== removed.id), removed];
                        window.renderIngredients();
                        window.updateSelects();
                    }
                });
            }
        }
    };
    
    window.deleteAllergen = async function(id) {
        if(confirm(window.t('alert_delete_allergen'))) {
            const removed = window.allergens.find(allergen => allergen.id === id);
            const nextAllergens = window.allergens.filter(allergen => allergen.id !== id);
            try {
                if (window.storageAdapter.isDesktop) {
                    await window.storageAdapter.delete('allergens', id);
                    window.allergens = nextAllergens;
                } else {
                    await window.updateAllergens(nextAllergens);
                }
            } catch (error) {
                console.error('Allergen delete failed:', error);
                alert(window.t('alert_delete_allergen_failed'));
                return;
            }
            window.renderAllergens();
            window.updateSelects();
            if (removed) {
                window.pushUndoAction?.({
                    message: window.t ? window.t('toast_allergen_deleted') : 'Allergen deleted.',
                    undo: async () => {
                        if (window.storageAdapter.isDesktop) await window.storageAdapter.upsert('allergens', removed);
                        else await window.updateAllergens([...window.allergens, removed]);
                        window.allergens = [...window.allergens.filter(allergen => allergen.id !== removed.id), removed];
                        window.renderAllergens();
                        window.updateSelects();
                    }
                });
            }
        }
    };

    // --- Expose Global Functions ---
    window.changeMonth = (delta) => {
        if (window.CalendarManager) {
            window.CalendarManager.changeMonth(delta);
        }
    };

    window.goToToday = () => {
        if (window.CalendarManager) {
            window.CalendarManager.goToToday();
        }
    };

    // Start App
    window.addEventListener('DOMContentLoaded', init);
})(window);

// Main Entry Point with Animated Loading

(function(window) {
    
    // --- Utility Functions ---
    window.generateId = function(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };
    
    // --- Initialization ---
    async function init() {
        // Hamburger menu is now handled in bindNavigation() in ui.js
        // Removed duplicate event listener that was causing conflicts
        
        const closeBtn = document.getElementById('closeNavBtn');
        if(closeBtn) closeBtn.addEventListener('click', window.toggleNav);
        
        const langSel = document.getElementById('languageSelect');
        if (langSel) {
            langSel.value = window.getCurrentLanguage();
            langSel.addEventListener('change', (e) => window.changeLanguage(e.target.value));
        }

        window.bindNavigation();
        window.setAppTheme(localStorage.getItem('appTheme') || 'default');

        // --- Animated Loading Screen ---
        await handleAnimatedLoading();
    }

    // --- Animated Loading with Messages ---
    async function handleAnimatedLoading() {
        const splash = document.getElementById('splashScreen');
        const actions = document.getElementById('splashActions');
        const subtitle = splash.querySelector('.splash-subtitle');
        
        const loadingMessages = [
            '🔍 Checking for data folder...',
            '📂 Loading settings...',
            '📋 Loading templates...',
            '🥘 Loading recipes...',
            '🧂 Loading ingredients...'
        ];
        
        let messageIndex = 0;
        
        // Function to show loading messages
        function showNextMessage() {
            if (messageIndex < loadingMessages.length) {
                subtitle.textContent = loadingMessages[messageIndex];
                messageIndex++;
            }
        }
        
        // Start message rotation
        actions.innerHTML = '<div class="loader-spinner"></div>';
        showNextMessage();
        const messageInterval = setInterval(showNextMessage, 800);
        
        try {
            // Check if user has previously selected folder (AWAIT THIS)
            const hasPreviousFolder = await window.checkPreviousFolder();
            
            if (hasPreviousFolder) {
                // Try to auto-load from previous folder
                const loaded = await window.autoLoadFromFolder();
                
                if (loaded) {
                    // Successfully loaded
                    clearInterval(messageInterval);
                    subtitle.textContent = '✅ Ready!';
                    await new Promise(resolve => setTimeout(resolve, 800));
                    hideSplash();
                } else {
                    // Failed to access previous folder, ask user
                    clearInterval(messageInterval);
                    askForFolder();
                }
            } else {
                // First time user - ask for folder
                clearInterval(messageInterval);
                askForFolder();
            }
        } catch (err) {
            console.error('Loading error:', err);
            clearInterval(messageInterval);
            askForFolder();
        }
        
        function askForFolder() {
            subtitle.textContent = 'Select a folder to store your data';
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="window.selectFolderAndStart()" style="min-width: 200px; height: 48px;">
                    <span>📁</span> Select Folder
                </button>
            `;
        }
        
        function hideSplash() {
            splash.style.opacity = '0';
            document.body.classList.add('app-loaded');
            setTimeout(() => {
                splash.style.display = 'none';
                
                // FIXED: Apply translations after settings are loaded
                window.applyTranslations();
                
                window.initStyleBuilder();
                window.renderAll();
                if (window.CalendarManager) {
                    window.CalendarManager.init();
                }
            }, 500);
        }
        
        // Global function for folder selection button
        window.selectFolderAndStart = async function() {
            actions.innerHTML = '<div class="loader-spinner"></div>';
            subtitle.textContent = '⏳ Setting up your workspace...';
            
            const selected = await window.selectSaveLocation();
            
            if (selected) {
                subtitle.textContent = '✅ All set!';
                await new Promise(resolve => setTimeout(resolve, 500));
                hideSplash();
            } else {
                // User cancelled, show button again
                askForFolder();
            }
        };
    }

    // --- CRUD Save Functions ---
    window.saveRecipe = function(e) {
        e.preventDefault();
        const id = window.editingRecipeId || window.generateId('rcp');
        const name = document.getElementById('recipeName').value;
        const cat = document.getElementById('recipeCategory').value;
        const portion = document.getElementById('recipePortionSize').value;
        const calories = document.getElementById('recipeCalories').value;
        const instr = document.getElementById('recipeInstructions').value;
        
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
    };

    window.saveIngredient = function(e) {
        e.preventDefault();
        const id = window.editingIngredientId || window.generateId('ing');
        const name = document.getElementById('ingredientName').value;
        
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
        const name = document.getElementById('allergenName').value;
        const color = document.getElementById('allergenColor').value;

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

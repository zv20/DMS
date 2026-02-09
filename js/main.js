// Main Entry Point (Global Scope)

(function(window) {
    // --- Initialization ---
    async function init() {
        const hamburger = document.getElementById('hamburgerBtn');
        if(hamburger) hamburger.addEventListener('click', window.toggleNav);
        
        const closeBtn = document.getElementById('closeNavBtn');
        if(closeBtn) closeBtn.addEventListener('click', window.toggleNav);
        
        // Bind Global Inputs
        const printStartDateInput = document.getElementById('printStartDate');
        const importInput = document.getElementById('importInput');
        const langSel = document.getElementById('languageSelect');

        if (importInput) importInput.addEventListener('change', (e) => window.importDataFile(e.target.files[0], window.renderAll));
        
        if (printStartDateInput) {
            printStartDateInput.addEventListener('change', (e) => {
                window.renderAll();
            });
        }

        if (langSel) {
            langSel.value = window.getCurrentLanguage();
            langSel.addEventListener('change', (e) => window.changeLanguage(e.target.value));
        }

        window.bindNavigation();
        window.setAppTheme(localStorage.getItem('appTheme') || 'default');

        // --- Splash Screen Logic ---
        await handleSplashScreen();

        if (window.$) {
            window.$(document).ready(function () {
                // Summernote init if needed
            });
        }
    }

    // --- CRUD Save Functions (Moved here or exposed from modal logic) ---
    // These need to be global for the form onsubmit handlers in index.html
    window.saveRecipe = function(e) {
        e.preventDefault();
        const id = window.editingRecipeId || window.generateId('rcp');
        const name = document.getElementById('recipeName').value;
        const cat = document.getElementById('recipeCategory').value;
        const portion = document.getElementById('recipePortionSize').value;
        const instr = document.getElementById('recipeInstructions').value;
        
        // Collect Ingredients from tags
        const ingTags = document.getElementById('recipeIngredients').querySelectorAll('.tag');
        const ingredients = Array.from(ingTags).map(t => ({ id: t.dataset.id }));
        
        // Collect Manual Allergens
        const algTags = document.getElementById('recipeManualAllergens').querySelectorAll('.tag');
        const manualAllergens = Array.from(algTags).map(t => ({ id: t.dataset.id }));

        const newRecipe = {
            id, name, category: cat, portionSize: portion, instructions: instr,
            ingredients, manualAllergens
        };

        if (window.editingRecipeId) {
            const idx = window.recipes.findIndex(r => r.id === id);
            if (idx !== -1) window.recipes[idx] = newRecipe;
        } else {
            window.recipes.push(newRecipe);
        }
        
        window.updateRecipes(window.recipes); // Saves and triggers sync
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
        window.updateSelects(); // Refresh dropdowns
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
    
    // Add item functions for modals
    window.addIngredientToRecipe = function() {
        const sel = document.getElementById('ingredientSelect');
        const id = sel.value;
        if (!id) return;
        const ing = window.ingredients.find(i => i.id === id);
        if (ing) {
            window.addIngredientTagToModal(ing);
            sel.value = '';
        }
    };
    
    window.addManualAllergenToRecipe = function() {
        const sel = document.getElementById('allergenSelect');
        const id = sel.value;
        if (!id) return;
        const alg = window.allergens.find(a => a.id === id);
        if (alg) {
            window.addManualAllergenTag(alg);
            sel.value = '';
        }
    };
    
    window.addLinkedAllergen = function() {
        const sel = document.getElementById('ingredientAllergenSelect');
        const id = sel.value;
        if (!id) return;
        const alg = window.allergens.find(a => a.id === id);
        if (alg) {
            window.addLinkedAllergenTag(alg);
            sel.value = '';
        }
    };


    async function handleSplashScreen() {
        const splash = document.getElementById('splashScreen');
        const actions = document.getElementById('splashActions');
        const hasSavedHandle = await window.checkSavedHandle();
        const minWait = new Promise(resolve => setTimeout(resolve, 1500));

        if (hasSavedHandle) {
            actions.innerHTML = `
                <button class="btn-splash btn-splash-primary" onclick="resumeSession()">
                    <span>▶</span> Resume Session
                </button>
                <button class="btn-splash btn-splash-secondary" onclick="startFresh()">
                    <span>📂</span> Switch Folder
                </button>
            `;
        } else {
            actions.innerHTML = `
                <button class="btn-splash btn-splash-primary" onclick="startFresh()">
                    <span>🚀</span> Get Started
                </button>
            `;
        }

        window.resumeSession = async () => {
            actions.innerHTML = '<div class="loader-spinner"></div>';
            try {
                await window.autoLoadOnStartup(window.renderAll); 
                await minWait; 
                hideSplash();
            } catch (e) {
                console.error("Resume failed", e);
                alert("Could not access folder. Please select it again.");
                startFresh();
            }
        };

        window.startFresh = async () => {
            actions.innerHTML = '<div class="loader-spinner"></div>';
            try {
                await window.selectSaveLocation(window.renderAll);
                await minWait;
                hideSplash();
            } catch (e) {
                actions.innerHTML = `
                    <button class="btn-splash btn-splash-primary" onclick="startFresh()">
                        <span>🚀</span> Get Started
                    </button>
                `;
            }
        };

        function hideSplash() {
            splash.style.opacity = '0';
            document.body.classList.add('app-loaded');
            setTimeout(() => {
                splash.style.display = 'none';
                window.initStyleBuilder();
                window.renderAll();
            }, 500);
        }
    }

    // --- Expose Global Functions ---
    window.manualSave = () => window.saveData(() => console.log('Manual save triggered')); // Feedback handled by animation
    window.manualLoad = () => window.loadFromFolder(window.renderAll);
    window.exportData = window.exportDataFile;
    window.changeMonth = (delta) => { /* Logic needed in render.js or here for date state */ window.renderAll(); };
    window.toggleView = (mode) => { localStorage.setItem('calendarViewMode', mode); window.renderAll(); };
    window.togglePrintDay = (day) => { 
        const btn = document.getElementById('printDay' + day);
        if(btn) btn.classList.toggle('active');
        // Save print preferences if needed
    };

    // Start App
    window.addEventListener('DOMContentLoaded', init);
})(window);

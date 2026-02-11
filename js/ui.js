// UI Interactions & Theme Logic (Global Scope)

(function(window) {
    let templateBackgroundImage = localStorage.getItem('templateBackgroundImage') || '';

    // --- Navigation ---
    window.toggleNav = function() {
        const overlay = document.getElementById('navOverlay');
        if(overlay) overlay.classList.toggle('active');
    };

    window.navigateTo = function(pageId) {
         document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
         const targetPage = document.getElementById(pageId);
         if (targetPage) targetPage.classList.add('active');

         document.querySelectorAll('.nav-item, .sub-nav-item').forEach(b => {
             b.classList.remove('active');
             if(b.dataset.page === pageId) b.classList.add('active');
         });

         const overlay = document.getElementById('navOverlay');
         if(overlay && overlay.classList.contains('active')) {
             window.toggleNav();
         }
    };

    window.bindNavigation = function() {
        const navItems = document.querySelectorAll('.nav-item[data-page], .sub-nav-item[data-page]');
        navItems.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.navigateTo(btn.dataset.page);
            });
        });
    };

    // --- Theme ---
    window.setAppTheme = function(themeName) {
        document.body.setAttribute('data-theme', themeName);
        localStorage.setItem('appTheme', themeName);
        document.querySelectorAll('.theme-btn').forEach(btn => {
            if (btn.classList.contains(`theme-${themeName}`)) {
                btn.style.transform = 'scale(1.2)';
                btn.style.borderColor = 'var(--color-primary)';
            } else {
                btn.style.transform = 'scale(1)';
                btn.style.borderColor = 'var(--color-border)';
            }
        });
    };

    // NOTE: changeLanguage is now defined in i18n.js only
    // Removed duplicate definition that was overwriting the i18n.js version

    // --- Modal Logic ---
    window.openRecipeModal = function(id = null) {
        const modal = document.getElementById('recipeModal');
        if (!modal) return;
        modal.style.display = 'block';
        
        document.getElementById('recipeForm').reset();
        document.getElementById('recipeIngredients').innerHTML = '';
        document.getElementById('recipeManualAllergens').innerHTML = '';
        document.getElementById('recipeAutoAllergens').textContent = '-';
        
        const catSelect = document.getElementById('recipeCategory');
        catSelect.innerHTML = `
            <option value="soup">${window.t('category_soup')}</option>
            <option value="main">${window.t('category_main')}</option>
            <option value="dessert">${window.t('category_dessert')}</option>
            <option value="other">${window.t('category_other')}</option>
        `;

        if (id) {
            window.editingRecipeId = id;
            const recipe = window.recipes.find(r => r.id === id);
            if (recipe) {
                document.getElementById('recipeModalTitle').textContent = window.t('modal_edit_recipe');
                document.getElementById('recipeName').value = recipe.name;
                document.getElementById('recipeCategory').value = recipe.category || 'other';
                document.getElementById('recipePortionSize').value = recipe.portionSize || '';
                document.getElementById('recipeCalories').value = recipe.calories || '';
                document.getElementById('recipeInstructions').value = recipe.instructions || '';
                
                if (recipe.ingredients) {
                    recipe.ingredients.forEach(ing => {
                        const fullIng = window.ingredients.find(i => i.id === ing.id);
                        if(fullIng) window.addIngredientTagToModal(fullIng);
                    });
                }
                
                if (recipe.manualAllergens) {
                    recipe.manualAllergens.forEach(alg => {
                        const fullAlg = window.allergens.find(a => a.id === alg.id);
                        if(fullAlg) window.addManualAllergenTag(fullAlg);
                    });
                }
                window.updateAutoAllergens();
            }
        } else {
            window.editingRecipeId = null;
            document.getElementById('recipeModalTitle').textContent = window.t('modal_add_recipe');
        }
    };

    window.closeRecipeModal = function() {
        document.getElementById('recipeModal').style.display = 'none';
        window.editingRecipeId = null;
    };

    window.openIngredientModal = function(id = null) {
        const modal = document.getElementById('ingredientModal');
        if (!modal) return;
        modal.style.display = 'block';
        document.getElementById('ingredientForm').reset();
        document.getElementById('ingredientLinkedAllergens').innerHTML = '';
        
        if (id) {
            window.editingIngredientId = id;
            const ing = window.ingredients.find(i => i.id === id);
            if (ing) {
                document.getElementById('ingredientName').value = ing.name;
                if (ing.allergens) {
                    ing.allergens.forEach(aid => {
                        const a = window.allergens.find(x => x.id === aid);
                        if (a) window.addLinkedAllergenTag(a);
                    });
                }
            }
        } else {
            window.editingIngredientId = null;
        }
    };

    window.closeIngredientModal = function() {
        document.getElementById('ingredientModal').style.display = 'none';
        window.editingIngredientId = null;
    };

    window.openAllergenModal = function(id = null) {
        const modal = document.getElementById('allergenModal');
        if (!modal) return;
        modal.style.display = 'block';
        document.getElementById('allergenForm').reset();
        
        if (id) {
            window.editingAllergenId = id;
            const alg = window.allergens.find(a => a.id === id);
            if (alg) {
                document.getElementById('allergenName').value = alg.name;
                document.getElementById('allergenColor').value = alg.color;
            }
        } else {
            window.editingAllergenId = null;
        }
    };

    window.closeAllergenModal = function() {
        document.getElementById('allergenModal').style.display = 'none';
        window.editingAllergenId = null;
    };

    // --- Helpers ---
    window.addIngredientFromSelect = function() {
        const sel = document.getElementById('ingredientSelect');
        if (sel && sel.value) {
            const ing = window.ingredients.find(i => i.id === sel.value);
            if (ing) {
                window.addIngredientTagToModal(ing);
                sel.value = '';
            }
        }
    };

    window.addAllergenFromSelect = function() {
        const sel = document.getElementById('allergenSelect');
        if (sel && sel.value) {
            const alg = window.allergens.find(a => a.id === sel.value);
            if (alg) {
                window.addManualAllergenTag(alg);
                sel.value = '';
            }
        }
    };

    window.addIngredientAllergenFromSelect = function() {
        const sel = document.getElementById('ingredientAllergenSelect');
        if (sel && sel.value) {
            const alg = window.allergens.find(a => a.id === sel.value);
            if (alg) {
                window.addLinkedAllergenTag(alg);
                sel.value = '';
            }
        }
    };

    // --- Modal Helpers (Tag Management) ---
    window.addIngredientTagToModal = function(ingredient) {
        const container = document.getElementById('recipeIngredients');
        if (!container.querySelector(`[data-id="${ingredient.id}"]`)) {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.dataset.id = ingredient.id;
            tag.innerHTML = `${ingredient.name} <span class="remove" onclick="this.parentElement.remove(); window.updateAutoAllergens()">×</span>`;
            container.appendChild(tag);
            window.updateAutoAllergens();
        }
    };

    window.addManualAllergenTag = function(allergen) {
        const container = document.getElementById('recipeManualAllergens');
        if (!container.querySelector(`[data-id="${allergen.id}"]`)) {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.style.borderColor = allergen.color;
            tag.dataset.id = allergen.id;
            tag.innerHTML = `${window.getAllergenName(allergen)} <span class="remove" onclick="this.parentElement.remove()">×</span>`;
            container.appendChild(tag);
        }
    };
    
    window.addLinkedAllergenTag = function(allergen) {
        const container = document.getElementById('ingredientLinkedAllergens');
        if (!container.querySelector(`[data-id="${allergen.id}"]`)) {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.style.borderColor = allergen.color;
            tag.dataset.id = allergen.id;
            tag.innerHTML = `${window.getAllergenName(allergen)} <span class="remove" onclick="this.parentElement.remove()">×</span>`;
            container.appendChild(tag);
        }
    };

    window.updateAutoAllergens = function() {
        const container = document.getElementById('recipeIngredients');
        const ids = Array.from(container.children).map(tag => tag.dataset.id);
        
        const detected = new Set();
        ids.forEach(ingId => {
            const ing = window.ingredients.find(i => i.id === ingId);
            if (ing && ing.allergens) {
                ing.allergens.forEach(aid => detected.add(aid));
            }
        });
        
        const label = document.getElementById('recipeAutoAllergens');
        if (detected.size === 0) {
            label.textContent = '-';
        } else {
            label.innerHTML = Array.from(detected).map(aid => {
                const a = window.allergens.find(x => x.id === aid);
                return a ? `<span class="tag allergen-mini" style="background:${a.color}20; color:${a.color}; padding:3px 8px; border-radius:12px; font-size:0.85rem;">${window.getAllergenName(a)}</span>` : '';
            }).join(' ');
        }
    };

    // --- Builder Logic (Robust) ---
    window.initStyleBuilder = function() { 
        if (window.TemplateManager && window.TemplateManager.init) {
            window.TemplateManager.init();
            return;
        }

        const ids = ['styleFont', 'stylePageBg'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', window.updateBuilderPreview);
        });
        
        window.loadBuilderSettings();
        window.updateBuilderPreview();
    };

    window.loadBuilderSettings = function() { 
        const s = window.currentStyleSettings;
        if (!s) return;
        setVal('styleFont', s.font);
        setVal('stylePageBg', s.pageBg);
    };

    window.updateBuilderPreview = function() { 
        const fontEl = document.getElementById('styleFont');
        if (!fontEl) return;
        
        const pageBgEl = document.getElementById('stylePageBg');
        
        const s = {
            font: fontEl.value,
            pageBg: pageBgEl ? pageBgEl.value : '#ffffff'
        };
        
        const sheet = document.getElementById('livePreviewSheet');
        if (!sheet) return;
        
        sheet.style.fontFamily = s.font;
        sheet.style.backgroundColor = s.pageBg;
    };

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }
})(window);

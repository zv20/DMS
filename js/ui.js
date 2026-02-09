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
         const targetPage = document.getElementById(pageId);\n         if (targetPage) targetPage.classList.add('active');

         document.querySelectorAll('.nav-item, .sub-nav-item').forEach(b => {\n             b.classList.remove('active');
             if(b.dataset.page === pageId) b.classList.add('active');\n         });

         const overlay = document.getElementById('navOverlay');
         if(overlay && overlay.classList.contains('active')) {
             window.toggleNav();
         }
    };

    window.bindNavigation = function() {
        const navItems = document.querySelectorAll('.nav-item[data-page], .sub-nav-item[data-page]');
        navItems.forEach(btn => {\n            btn.addEventListener('click', (e) => {\n                e.preventDefault();
                window.navigateTo(btn.dataset.page);
            });\n        });
    };

    // --- Theme ---
    window.setAppTheme = function(themeName) {\n        document.body.setAttribute('data-theme', themeName);
        localStorage.setItem('appTheme', themeName);
        document.querySelectorAll('.theme-btn').forEach(btn => {\n            if (btn.classList.contains(`theme-${themeName}`)) {\n                btn.style.transform = 'scale(1.2)';
                btn.style.borderColor = 'var(--color-primary)';\n            } else {\n                btn.style.transform = 'scale(1)';
                btn.style.borderColor = 'var(--color-border)';\n            }
        });
    };

    // --- Language ---
    window.changeLanguage = function(lang) {
        window.setCurrentLanguage(lang);
        localStorage.setItem('recipeManagerLang', lang);
        window.saveData(); 
        window.applyTranslations();
        
        const sel = document.getElementById('languageSelect');
        if (sel) sel.value = lang;
    };

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
            <option value=\"soup\">${window.t('category_soup')}</option>
            <option value=\"main\">${window.t('category_main')}</option>
            <option value=\"dessert\">${window.t('category_dessert')}</option>
            <option value=\"other\">${window.t('category_other')}</option>
        `;

        if (id) {
            window.editingRecipeId = id;
            const recipe = window.recipes.find(r => r.id === id);
            if (recipe) {
                document.getElementById('recipeModalTitle').textContent = window.t('modal_edit_recipe');
                document.getElementById('recipeName').value = recipe.name;
                document.getElementById('recipeCategory').value = recipe.category || 'other';
                document.getElementById('recipePortionSize').value = recipe.portionSize || '';
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
    };\n
    window.openAllergenModal = function(id = null) {
        const modal = document.getElementById('allergenModal');
        if (!modal) return;
        modal.style.display = 'block';
        document.getElementById('allergenForm').reset();
        
        if (id) {\n            window.editingAllergenId = id;
            const alg = window.allergens.find(a => a.id === id);
            if (alg) {
                document.getElementById('allergenName').value = alg.name;
                document.getElementById('allergenColor').value = alg.color;
            }\n        } else {
            window.editingAllergenId = null;
        }
    };\n
    window.closeAllergenModal = function() {
        document.getElementById('allergenModal').style.display = 'none';
        window.editingAllergenId = null;
    };

    // --- Modal Helpers (Tag Management) ---
    window.addIngredientTagToModal = function(ingredient) {\n        const container = document.getElementById('recipeIngredients');\n        if (!container.querySelector(`[data-id=\"${ingredient.id}\"]`)) {\n            const tag = document.createElement('span');\n            tag.className = 'tag';\n            tag.dataset.id = ingredient.id;\n            tag.innerHTML = `${ingredient.name} <span class=\"remove\" onclick=\"this.parentElement.remove(); window.updateAutoAllergens()\">×</span>`;\n            container.appendChild(tag);\n            window.updateAutoAllergens();\n        }\n    };\n\n    window.addManualAllergenTag = function(allergen) {\n        const container = document.getElementById('recipeManualAllergens');\n        if (!container.querySelector(`[data-id=\"${allergen.id}\"]`)) {\n            const tag = document.createElement('span');\n            tag.className = 'tag';\n            tag.style.borderColor = allergen.color;\n            tag.dataset.id = allergen.id;\n            tag.innerHTML = `${window.getAllergenName(allergen)} <span class=\"remove\" onclick=\"this.parentElement.remove()\">×</span>`;\n            container.appendChild(tag);\n        }\n    };\n    \n    window.addLinkedAllergenTag = function(allergen) {\n        const container = document.getElementById('ingredientLinkedAllergens');\n        if (!container.querySelector(`[data-id=\"${allergen.id}\"]`)) {\n            const tag = document.createElement('span');\n            tag.className = 'tag';\n            tag.style.borderColor = allergen.color;\n            tag.dataset.id = allergen.id;\n            tag.innerHTML = `${window.getAllergenName(allergen)} <span class=\"remove\" onclick=\"this.parentElement.remove()\">×</span>`;\n            container.appendChild(tag);\n        }\n    };\n\n    window.updateAutoAllergens = function() {\n        const container = document.getElementById('recipeIngredients');\n        const ids = Array.from(container.children).map(tag => tag.dataset.id);\n        \n        const detected = new Set();\n        ids.forEach(ingId => {\n            const ing = window.ingredients.find(i => i.id === ingId);\n            if (ing && ing.allergens) {\n                ing.allergens.forEach(aid => detected.add(aid));\n            }\n        });\n        \n        const label = document.getElementById('recipeAutoAllergens');\n        if (detected.size === 0) {\n            label.textContent = '-';\n        } else {\n            label.innerHTML = Array.from(detected).map(aid => {\n                const a = window.allergens.find(x => x.id === aid);\n                return a ? `<span class=\"tag allergen-mini\" style=\"background:${a.color}20; color:${a.color}\">${window.getAllergenName(a)}</span>` : '';\n            }).join(' ');\n        }\n    };\n\n    // --- Builder Logic (Robust) ---
    window.initStyleBuilder = function() { 
        // Delegate to new TemplateManager if available
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
        const s = window.currentStyleSettings;\n        if (!s) return;
        setVal('styleFont', s.font);\n        setVal('stylePageBg', s.pageBg);
    };

    window.updateBuilderPreview = function() { 
        const fontEl = document.getElementById('styleFont');\n        if (!fontEl) return;
        
        const pageBgEl = document.getElementById('stylePageBg');
        
        const s = {\n            font: fontEl.value,
            pageBg: pageBgEl ? pageBgEl.value : '#ffffff'
        };
        
        const sheet = document.getElementById('livePreviewSheet');\n        if (!sheet) return;
        
        sheet.style.fontFamily = s.font;\n        sheet.style.backgroundColor = s.pageBg;
    };\n
    function setVal(id, val) {\n        const el = document.getElementById(id);\n        if (el) el.value = val;\n    }\n})(window);

// UI Interactions & Theme Logic (Global Scope)

(function(window) {
    let templateBackgroundImage = localStorage.getItem('templateBackgroundImage') || '';

    // --- Navigation ---
    window.toggleNav = function() {
        const overlay = document.getElementById('navOverlay');
        if(overlay) overlay.classList.toggle('active');
    };

    // New Helper: Navigate without toggling menu blindly
    window.navigateTo = function(pageId) {
         // 1. Update Active Page
         document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
         const targetPage = document.getElementById(pageId);
         if (targetPage) targetPage.classList.add('active');

         // 2. Update Nav State (Visually match active item)
         document.querySelectorAll('.nav-item, .sub-nav-item').forEach(b => {
             b.classList.remove('active');
             if(b.dataset.page === pageId) b.classList.add('active');
         });

         // 3. Close Nav ONLY if it is currently open
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
                // If the button is NOT inside the nav overlay (e.g. from Settings page),
                // we should just navigate. Use our smart helper.
                window.navigateTo(btn.dataset.page);
            });
        });
    };

    // --- Settings & Menus ---
    window.toggleSettingsSubmenu = function() {
        const menu = document.getElementById('settingsSubmenu');
        const btn = document.querySelector('.settings-toggle .arrow');
        if(menu) {
            menu.classList.toggle('open');
            if(menu.classList.contains('open') && btn) {
                btn.style.transform = 'rotate(180deg)';
            } else if(btn) {
                btn.style.transform = 'rotate(0deg)';
            }
        }
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
                return a ? `<span class="tag allergen-mini" style="background:${a.color}20; color:${a.color}">${window.getAllergenName(a)}</span>` : '';
            }).join(' ');
        }
    };

    // --- Print Logic ---
    window.printMenu = function() {
        const daysToPrint = [];
        for(let i=0; i<=6; i++) {
             const btn = document.getElementById('printDay' + i);
             if(btn && btn.classList.contains('active')) {
                 daysToPrint.push(i);
             }
        }

        if (daysToPrint.length === 0) {
            alert(window.t('alert_select_days'));
            return;
        }
        window.print();
    };


    // --- Builder Logic ---
    window.initStyleBuilder = function() { 
        const ids = ['styleFont', 'stylePageBg', 'styleHeaderBg', 'styleHeaderText', 'styleCardBg', 'styleBorderColor', 'styleBorderWidth', 'styleSlot1Color', 'styleSlot2Color', 'styleSlot3Color', 'styleSlot4Color', 'styleSlot1Font', 'styleSlot2Font', 'styleSlot3Font', 'styleSlot4Font'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', window.updateBuilderPreview);
        });
        
        const saveBtn = document.getElementById('btnSaveStyle');
        if(saveBtn) saveBtn.addEventListener('click', saveNewTemplate);
        
        const newBtn = document.getElementById('btnNewTemplate');
        if(newBtn) newBtn.addEventListener('click', () => {
            const sel = document.getElementById('savedTemplatesSelect');
            if (sel) sel.value = '';
            window.updateStyleSettings({ font: 'Segoe UI', pageBg: '#ffffff', headerBg: '#ffffff', headerText: '#21808d', cardBg: '#ffffff', borderColor: '#333333', borderWidth: '1', slotColors: { slot1:'#000', slot2:'#000', slot3:'#000', slot4:'#000' } });
            window.loadBuilderSettings();
            window.updateBuilderPreview();
        });

        const uploadBgInput = document.getElementById('styleBgImageInput');
        const styleBgRemoveBtn = document.getElementById('styleBgRemoveBtn');
        
        if (uploadBgInput) uploadBgInput.addEventListener('change', uploadBackgroundImage);
        if (styleBgRemoveBtn) styleBgRemoveBtn.addEventListener('click', removeBackgroundImage);

        window.loadBuilderSettings();
        window.updateBuilderPreview();
    };

    window.loadBuilderSettings = function() { 
        const s = window.currentStyleSettings;
        if (!s) return;
        setVal('styleFont', s.font);
        setVal('stylePageBg', s.pageBg);
        setVal('styleHeaderBg', s.headerBg);
        setVal('styleHeaderText', s.headerText);
        setVal('styleCardBg', s.cardBg);
        setVal('styleBorderColor', s.borderColor);
        setVal('styleBorderWidth', s.borderWidth);
        if(s.slotColors) {
            setVal('styleSlot1Color', s.slotColors.slot1);
            setVal('styleSlot2Color', s.slotColors.slot2);
            setVal('styleSlot3Color', s.slotColors.slot3);
            setVal('styleSlot4Color', s.slotColors.slot4);
        }
        
        const removeBtn = document.getElementById('styleBgRemoveBtn');
        if (removeBtn) removeBtn.style.display = templateBackgroundImage ? 'block' : 'none';
    };

    window.updateBuilderPreview = function() { 
        const fontEl = document.getElementById('styleFont');
        if (!fontEl) return;
        
        const s = {
            font: fontEl.value,
            pageBg: document.getElementById('stylePageBg').value,
            headerBg: document.getElementById('styleHeaderBg').value,
            headerText: document.getElementById('styleHeaderText').value,
            cardBg: document.getElementById('styleCardBg').value,
            borderColor: document.getElementById('styleBorderColor').value,
            borderWidth: document.getElementById('styleBorderWidth').value,
            slotColors: {
                slot1: document.getElementById('styleSlot1Color')?.value || '#000',
                slot2: document.getElementById('styleSlot2Color')?.value || '#000',
                slot3: document.getElementById('styleSlot3Color')?.value || '#000',
                slot4: document.getElementById('styleSlot4Color')?.value || '#000'
            }
        };
        
        window.updateStyleSettings(s);
        
        const sheet = document.getElementById('livePreviewSheet');
        if (!sheet) return;
        
        sheet.style.fontFamily = s.font;
        sheet.style.backgroundColor = s.pageBg;
        sheet.style.backgroundImage = templateBackgroundImage ? `url('${templateBackgroundImage}')` : 'none';

        const cards = sheet.querySelectorAll('.preview-day-card');
        cards.forEach(card => {
            card.style.backgroundColor = s.cardBg;
            card.style.borderColor = s.borderColor;
            card.style.borderWidth = s.borderWidth + 'px';
            const header = card.querySelector('.preview-day-header');
            if (header) {
                header.style.backgroundColor = s.headerBg;
                header.style.color = s.headerText;
                header.style.borderBottomColor = s.borderColor;
            }
        });
        
        ['slot1','slot2','slot3','slot4'].forEach(slot => {
            sheet.querySelectorAll(`.preview-slot.${slot}`).forEach(el => {
                el.style.borderLeft = `3px solid ${s.slotColors[slot]}`;
            });
        });
    };

    function saveNewTemplate() {
        const name = prompt("Enter a name for this template:", "My Custom Theme");
        if (!name) return;
        const newTmpl = { id: Date.now().toString(), name: name, settings: { ...window.currentStyleSettings } };
        window.addSavedTemplate(newTmpl);
        alert(window.t('alert_template_saved'));
    }

    function uploadBackgroundImage(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                templateBackgroundImage = evt.target.result;
                localStorage.setItem('templateBackgroundImage', templateBackgroundImage);
                window.updateBuilderPreview();
                window.loadBuilderSettings();
            };
            reader.readAsDataURL(file);
        }
    }

    function removeBackgroundImage() {
        templateBackgroundImage = '';
        localStorage.setItem('templateBackgroundImage', '');
        window.updateBuilderPreview();
        window.loadBuilderSettings();
        document.getElementById('styleBgImageInput').value = '';
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }
})(window);

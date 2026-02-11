// Rendering Logic (Global Scope)

(function(window) {
    let viewMode = localStorage.getItem('calendarViewMode') || 'week';
    window.currentCalendarDate = new Date();

    function getCategoryIcon(cat) { 
        return { soup: '🥣', main: '🍽️', dessert: '🍰', other: '➕' }[cat] || '➕'; 
    }

    window.getAllergenName = function(allergen) {
        if (allergen.isSystem) {
            const def = window.PREDEFINED_ALLERGENS.find(d => d.id === allergen.id);
            if (def) return window.getCurrentLanguage() === 'bg' ? def.name_bg : def.name;
        }
        return allergen.name;
    };

    window.getRecipeAllergens = function(recipe) {
        if (!recipe) return [];
        const all = new Set();
        if (recipe.ingredients) {
            recipe.ingredients.forEach(ing => {
                const fullIng = window.ingredients.find(i => i.id === ing.id);
                if (fullIng && fullIng.allergens) {
                    fullIng.allergens.forEach(aid => all.add(aid));
                }
            });
        }
        if (recipe.manualAllergens) {
            recipe.manualAllergens.forEach(ma => all.add(ma.id));
        }
        const result = [];
        all.forEach(id => {
            const alg = window.allergens.find(a => a.id === id);
            if (alg) result.push(alg);
        });
        return result;
    };

    window.renderAll = function() {
        window.updateSelects();
        window.renderRecipes();
        window.renderIngredients();
        window.renderAllergens();
        window.renderCalendar(window.currentCalendarDate);
        window.renderMenuHistory();
    };

    window.updateSelects = function() {
        const ingredientSelect = document.getElementById('ingredientSelect');
        const allergenSelect = document.getElementById('allergenSelect');
        const ingAllSelect = document.getElementById('ingredientAllergenSelect');
        
        if(ingredientSelect) ingredientSelect.innerHTML = `<option value="">${window.t('select_ingredient')}</option>` + window.ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        if(allergenSelect) allergenSelect.innerHTML = `<option value="">${window.t('select_allergen')}</option>` + window.allergens.map(a => `<option value="${a.id}">${window.getAllergenName(a)}</option>`).join('');
        if(ingAllSelect) ingAllSelect.innerHTML = `<option value="">${window.t('select_allergen')}</option>` + window.allergens.map(a => `<option value="${a.id}">${window.getAllergenName(a)}</option>`).join('');
    };

    window.renderRecipes = function() {
        const tbody = document.getElementById('recipeList');
        if (!tbody) return;
        tbody.innerHTML = '';
        const search = document.getElementById('recipeSearch');
        const catFilter = document.getElementById('recipeCategoryFilter');
        const term = search ? search.value.toLowerCase() : '';
        const cat = catFilter ? catFilter.value : '';
        
        if (window.recipes.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">${window.t('empty_recipes')}</td></tr>`; 
            return; 
        }
        
        window.recipes.forEach(recipe => {
            if (term && !recipe.name.toLowerCase().includes(term)) return;
            if (cat && recipe.category !== cat) return;
            const tr = document.createElement('tr');
            const recipeAllergens = window.getRecipeAllergens(recipe);
            let allergensHtml = '-';
            if (recipeAllergens.length > 0) { 
                allergensHtml = `<div class="tag-container" style="gap:5px;">${recipeAllergens.map(a => `<span class="tag allergen" style="border-color:${a.color};background:${a.color}15; font-size:0.75rem; padding:2px 6px;">${window.getAllergenName(a)}</span>`).join('')}</div>`; 
            }
            // FIXED: Removed getCategoryIcon() - translation already includes icon
            tr.innerHTML = `
                <td><strong>${recipe.name}</strong></td>
                <td>${window.t('category_' + (recipe.category || 'other'))}</td>
                <td>${recipe.portionSize || '-'}</td>
                <td>${allergensHtml}</td>
                <td>
                    <button class="icon-btn edit" onclick="window.openRecipeModal('${recipe.id}')">✏️</button>
                    <button class="icon-btn delete" onclick="window.deleteRecipe('${recipe.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.renderIngredients = function() {
        const tbody = document.getElementById('ingredientList');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (window.ingredients.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">${window.t('empty_ingredients')}</td></tr>`; 
            return; 
        }
        
        window.ingredients.forEach(ing => {
            const tr = document.createElement('tr');
            let tags = '-';
            if (ing.allergens && ing.allergens.length) { 
                tags = '<div class="tag-container" style="gap:5px;">' + ing.allergens.map(aid => { 
                    const a = window.allergens.find(x => x.id === aid); 
                    return a ? `<span class="tag allergen" style="border-color:${a.color};background:${a.color}15; font-size:0.75rem; padding:2px 6px;">${window.getAllergenName(a)}</span>` : ''; 
                }).join('') + '</div>'; 
            }

            tr.innerHTML = `
                <td><strong>${ing.name}</strong></td>
                <td>${tags}</td>
                <td>
                    <button class="icon-btn edit" onclick="window.openIngredientModal('${ing.id}')">✏️</button>
                    <button class="icon-btn delete" onclick="window.deleteIngredient('${ing.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.renderAllergens = function() {
        const tbody = document.getElementById('allergenList');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (window.allergens.length === 0) { 
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">${window.t('empty_allergens')}</td></tr>`; 
            return; 
        }
        
        window.allergens.forEach(al => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${window.getAllergenName(al)}</strong></td>
                <td><div style="width:20px; height:20px; background:${al.color}; border-radius:50%; border:1px solid #ddd;"></div></td>
                <td>
                    <button class="icon-btn edit" onclick="window.openAllergenModal('${al.id}')">✏️</button>
                    <button class="icon-btn delete" onclick="window.deleteAllergen('${al.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.renderCalendar = function(date) {
        if (!date) date = new Date();
        window.currentCalendarDate = date;

        const calendarEl = document.getElementById('calendar');
        const currentMonthEl = document.getElementById('currentMonth');
        if (!calendarEl) return;
        calendarEl.innerHTML = '';
        
        if (currentMonthEl) {
            const options = { month: 'long', year: 'numeric' };
            const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
            currentMonthEl.textContent = date.toLocaleDateString(lang, options);
        }

        if (viewMode === 'week') {
            // Set class for CSS Grid styling
            calendarEl.className = 'week-view';
            const weekStart = window.getWeekStart(date);
            
            // NO WRAPPER - Add day columns directly to calendar element
            const SLOTS = [{id:'slot1',type:'soup'},{id:'slot2',type:'main'},{id:'slot3',type:'dessert'},{id:'slot4',type:'other'}];

            for (let i = 0; i < 5; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                if (!window.currentMenu[dateStr]) window.currentMenu[dateStr] = {};

                const dayColumn = document.createElement('div');
                dayColumn.className = 'day-column';
                
                // Day header with proper class from calendar.css
                const langStr = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header-weekly';
                const dayName = day.toLocaleDateString(langStr, { weekday: 'long' });
                const dayDate = day.toLocaleDateString(langStr, { month: 'short', day: 'numeric' });
                dayHeader.innerHTML = `<strong>${dayName}</strong><small>${dayDate}</small>`;
                dayColumn.appendChild(dayHeader);
                
                // Add meal slots
                SLOTS.forEach((conf, index) => { 
                    const slotData = window.currentMenu[dateStr][conf.id] || { type: conf.type, recipe: null }; 
                    dayColumn.appendChild(renderSlot(dateStr, conf.id, slotData, index + 1)); 
                });
                
                // Add directly to calendar (no wrapper!)
                calendarEl.appendChild(dayColumn);
            }
        }
    };

    function renderSlot(dateStr, slotId, slotData, indexLabel) {
        const slotEl = document.createElement('div');
        slotEl.className = 'meal-slot ' + slotData.type;
        
        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '8px';
        
        const slotLabel = document.createElement('span');
        slotLabel.style.fontSize = '0.85rem';
        slotLabel.style.fontWeight = 'bold';
        slotLabel.style.color = '#7f8c8d';
        slotLabel.textContent = `${indexLabel}. ${window.t('slot_' + slotData.type)}`;
        headerRow.appendChild(slotLabel);
        
        const dotBar = document.createElement('div');
        dotBar.className = 'slot-allergen-dots';
        dotBar.style.display = 'flex';
        dotBar.style.gap = '3px';
        headerRow.appendChild(dotBar);
        slotEl.appendChild(headerRow);
        
        // NEW: Add category switcher + recipe selector in a flex row
        const selectorRow = document.createElement('div');
        selectorRow.style.display = 'flex';
        selectorRow.style.gap = '8px';
        selectorRow.style.alignItems = 'center';
        
        // Category icon button group
        const categoryGroup = document.createElement('div');
        categoryGroup.style.display = 'flex';
        categoryGroup.style.gap = '4px';
        categoryGroup.style.flexShrink = '0';
        
        const categories = ['soup', 'main', 'dessert', 'other'];
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-icon-btn';
            btn.textContent = getCategoryIcon(cat);
            btn.title = window.t('category_' + cat);
            btn.style.cssText = `
                width: 32px;
                height: 32px;
                border: 2px solid ${slotData.type === cat ? '#fd7e14' : '#dee2e6'};
                background: ${slotData.type === cat ? '#fd7e14' : '#fff'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                padding: 0;
            `;
            
            btn.addEventListener('click', () => {
                // Update slot type
                if (!window.currentMenu[dateStr]) window.currentMenu[dateStr] = {};
                window.currentMenu[dateStr][slotId] = { type: cat, recipe: null };
                window.saveData();
                // Re-render entire calendar to update UI
                window.renderCalendar(window.currentCalendarDate);
            });
            
            categoryGroup.appendChild(btn);
        });
        
        selectorRow.appendChild(categoryGroup);
        
        // Recipe dropdown
        const select = document.createElement('select');
        select.className = 'recipe-select';
        select.style.flex = '1';
        select.innerHTML = `<option value="">${window.t('select_recipe')}</option>`;
        
        window.recipes.filter(r => (slotData.type === 'other' || r.category === slotData.type)).forEach(r => { 
            const opt = document.createElement('option'); 
            opt.value = r.id; opt.textContent = r.name; 
            if (slotData.recipe === r.id) opt.selected = true; 
            select.appendChild(opt); 
        });

        const updateDots = (recipeId) => {
            dotBar.innerHTML = '';
            if (!recipeId) return;
            const recipe = window.recipes.find(r => r.id === recipeId);
            window.getRecipeAllergens(recipe).forEach(a => {
                const dot = document.createElement('div');
                dot.style.cssText = `width:8px; height:8px; border-radius:50%; background-color:${a.color};`;
                dot.title = window.getAllergenName(a);
                dotBar.appendChild(dot);
            });
        };

        updateDots(slotData.recipe);
        select.addEventListener('change', () => { 
            const recipeId = select.value || null;
            if (!window.currentMenu[dateStr]) window.currentMenu[dateStr] = {}; 
            window.currentMenu[dateStr][slotId] = { type: slotData.type, recipe: recipeId };
            updateDots(recipeId);
            window.saveData(); 
        });
        
        selectorRow.appendChild(select);
        slotEl.appendChild(selectorRow);
        
        return slotEl;
    }

    window.changeMonth = (delta) => {
        const d = new Date(window.currentCalendarDate);
        if (viewMode === 'week') d.setDate(d.getDate() + (delta * 7));
        else d.setMonth(d.getMonth() + delta);
        window.renderCalendar(d);
    };

    window.renderMenuHistory = function() {
        const list = document.getElementById('menuHistory');
        if (!list) return;
        list.innerHTML = '';
        if (!window.menuHistory.length) { 
            list.innerHTML = `<div class="empty-state">${window.t('empty_menus')}</div>`; 
            return; 
        }
        window.menuHistory.forEach(m => {
            const item = document.createElement('div');
            item.className = 'menu-history-item';
            const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
            item.innerHTML = `
                <div class="menu-history-name">${m.name}</div>
                <div class="menu-history-date">${new Date(m.date).toLocaleString(lang)}</div>
                <div class="menu-history-actions">
                    <button onclick="window.loadSavedMenu('${m.id}')">${window.t('btn_load')}</button>
                    <button onclick="window.deleteSavedMenu('${m.id}')">${window.t('btn_delete')}</button>
                </div>`;
            list.appendChild(item);
        });
    };

})(window);

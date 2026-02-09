// Rendering Logic
import { t, getCurrentLanguage } from './i18n.js';
import { recipes, ingredients, allergens, currentMenu, menuHistory, saveData, updateRecipes, updateIngredients, updateAllergens, PREDEFINED_ALLERGENS } from './store.js';
import { getWeekStart } from './utils.js';

let viewMode = localStorage.getItem('calendarViewMode') || 'week';
let selectedPrintDays = [1, 2, 3, 4, 5];
let editingRecipeId = null;
let editingIngredientId = null;
let editingAllergenId = null;

// --- Helper Renderers ---
function getCategoryIcon(cat) { 
    return { soup: '🥣', main: '🍽️', dessert: '🍰', other: '➕' }[cat] || '➕'; 
}

export function getAllergenName(allergen) {
    if (allergen.isSystem) {
        const def = PREDEFINED_ALLERGENS.find(d => d.id === allergen.id);
        if (def) return getCurrentLanguage() === 'bg' ? def.name_bg : def.name;
    }
    return allergen.name;
}

function getRecipeAllergens(recipe) {
    const all = new Set();
    if (recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
            const fullIng = ingredients.find(i => i.id === ing.id);
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
        const alg = allergens.find(a => a.id === id);
        if (alg) result.push(alg);
    });
    return result;
}

// --- Main Renderers ---
export function renderAll() {
  updateSelects();
  renderRecipes();
  renderIngredients();
  renderAllergens();
  renderCalendar();
  renderMenuHistory();
  updatePrintDatePicker();
}

export function updateSelects() {
    const ingredientSelect = document.getElementById('ingredientSelect');
    const allergenSelect = document.getElementById('allergenSelect');
    const ingAllSelect = document.getElementById('ingredientAllergenSelect');
    
    if(ingredientSelect) ingredientSelect.innerHTML = `<option value="">${t('select_ingredient')}</option>` + ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
    if(allergenSelect) allergenSelect.innerHTML = `<option value="">${t('select_allergen')}</option>` + allergens.map(a => `<option value="${a.id}">${getAllergenName(a)}</option>`).join('');
    if(ingAllSelect) ingAllSelect.innerHTML = `<option value="">${t('select_allergen')}</option>` + allergens.map(a => `<option value="${a.id}">${getAllergenName(a)}</option>`).join('');
}

export function renderRecipes() {
  const tbody = document.getElementById('recipeList');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const search = document.getElementById('recipeSearch');
  const catFilter = document.getElementById('recipeCategoryFilter');
  const term = search ? search.value.toLowerCase() : '';
  const cat = catFilter ? catFilter.value : '';
  
  if (recipes.length === 0) { 
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">${t('empty_recipes')}</td></tr>`; 
      return; 
  }
  
  recipes.forEach(recipe => {
    if (term && !recipe.name.toLowerCase().includes(term)) return;
    if (cat && recipe.category !== cat) return;
    
    const tr = document.createElement('tr');
    const recipeAllergens = getRecipeAllergens(recipe);
    let allergensHtml = '-';
    if (recipeAllergens.length > 0) { 
        allergensHtml = `<div class="tag-container" style="gap:5px;">${recipeAllergens.map(a => `<span class="tag allergen" style="border-color:${a.color};background:${a.color}15; font-size:0.75rem; padding:2px 6px;">${getAllergenName(a)}</span>`).join('')}</div>`; 
    }

    const catName = t('category_' + (recipe.category || 'other'));

    tr.innerHTML = `
        <td><strong>${recipe.name}</strong></td>
        <td>${getCategoryIcon(recipe.category || 'other')} ${catName}</td>
        <td>${recipe.portionSize || '-'}</td>
        <td>${allergensHtml}</td>
        <td>
            <button class="icon-btn edit" onclick="window.openRecipeModal('${recipe.id}')" title="${t('btn_edit')}">✏️</button>
            <button class="icon-btn delete" onclick="window.deleteRecipe('${recipe.id}')" title="${t('btn_delete')}">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderIngredients() {
  const tbody = document.getElementById('ingredientList');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (ingredients.length === 0) { 
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">${t('empty_ingredients')}</td></tr>`; 
      return; 
  }
  
  ingredients.forEach(ing => {
    const tr = document.createElement('tr');
    let tags = '-';
    if (ing.allergens && ing.allergens.length) { 
        tags = '<div class="tag-container" style="gap:5px;">' + ing.allergens.map(aid => { 
            const a = allergens.find(x => x.id === aid); 
            return a ? `<span class="tag allergen" style="border-color:${a.color};background:${a.color}15; font-size:0.75rem; padding:2px 6px;">${getAllergenName(a)}</span>` : ''; 
        }).join('') + '</div>'; 
    }

    tr.innerHTML = `
        <td><strong>${ing.name}</strong></td>
        <td>${tags}</td>
        <td>
            <button class="icon-btn edit" onclick="window.openIngredientModal('${ing.id}')" title="${t('btn_edit')}">✏️</button>
            <button class="icon-btn delete" onclick="window.deleteIngredient('${ing.id}')" title="${t('btn_delete')}">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderAllergens() {
  const tbody = document.getElementById('allergenList');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (allergens.length === 0) { 
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">${t('empty_allergens')}</td></tr>`; 
      return; 
  }
  
  allergens.forEach(al => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${getAllergenName(al)}</strong></td>
        <td><div style="width:20px; height:20px; background:${al.color}; border-radius:50%; border:1px solid #ddd;"></div></td>
        <td>
            <button class="icon-btn edit" onclick="window.openAllergenModal('${al.id}')" title="${t('btn_edit')}">✏️</button>
            <button class="icon-btn delete" onclick="window.deleteAllergen('${al.id}')" title="${t('btn_delete')}">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderCalendar(currentDate) {
  const calendarEl = document.getElementById('calendar');
  const currentMonthEl = document.getElementById('currentMonth');
  if (!calendarEl) return;
  calendarEl.innerHTML = '';
  
  if (currentMonthEl) {
      const options = { month: 'long', year: 'numeric' };
      if (viewMode === 'week') {
          const weekStart = getWeekStart(currentDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (weekStart.getMonth() === weekEnd.getMonth()) { 
              currentMonthEl.textContent = weekStart.toLocaleDateString(getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', options); 
          } else { 
              const m1 = weekStart.toLocaleDateString(getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { month: 'short' }); 
              const m2 = weekEnd.toLocaleDateString(getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { month: 'short', year: 'numeric' }); 
              currentMonthEl.textContent = `${m1} - ${m2}`; 
          }
      } else { 
          currentMonthEl.textContent = currentDate.toLocaleDateString(getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', options); 
      }
  }

  if (viewMode === 'week') {
    calendarEl.className = 'week-view';
    const weekStart = getWeekStart(currentDate);
    const weekDaysContainer = document.createElement('div');
    weekDaysContainer.className = 'week-days';
    weekDaysContainer.style.display = 'grid';
    weekDaysContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    weekDaysContainer.style.gap = '10px';
    
    const DEFAULT_SLOTS_CONFIG = [
      { id: 'slot1', type: 'soup', label: '1' },
      { id: 'slot2', type: 'main', label: '2' },
      { id: 'slot3', type: 'dessert', label: '3' },
      { id: 'slot4', type: 'other', label: '4' }
    ];

    for (let i = 0; i < 5; i++) {
       const day = new Date(weekStart);
       day.setDate(weekStart.getDate() + i);
       const dateStr = day.toISOString().split('T')[0];
       
       if (!currentMenu[dateStr]) currentMenu[dateStr] = {};
       DEFAULT_SLOTS_CONFIG.forEach(conf => { if (!currentMenu[dateStr][conf.id]) { currentMenu[dateStr][conf.id] = { type: conf.type, recipe: null }; } });

       const dayColumn = document.createElement('div');
       dayColumn.className = 'day-column';
       dayColumn.innerHTML = `<div class="day-header" style="text-align:center;font-weight:bold;color:var(--color-primary);margin-bottom:10px;">${day.toLocaleDateString(getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>`;
       
       DEFAULT_SLOTS_CONFIG.forEach((conf, index) => { 
           const slotId = conf.id; 
           const slotData = currentMenu[dateStr][slotId]; 
           const slotEl = renderSlot(dateStr, slotId, slotData, index + 1); 
           dayColumn.appendChild(slotEl); 
       });
       weekDaysContainer.appendChild(dayColumn);
    }
    calendarEl.appendChild(weekDaysContainer);
  } else {
    // Month View (Simplified)
    calendarEl.className = 'calendar';
    // ... (Month view logic)
  }
}

function renderSlot(dateStr, slotId, slotData, indexLabel) {
  const slotEl = document.createElement('div');
  slotEl.className = 'menu-slot';
  slotEl.dataset.date = dateStr;
  slotEl.dataset.slotId = slotId;
  
  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.marginBottom = '4px';
  headerRow.innerHTML = `<span style="font-size:0.85rem;font-weight:bold;color:#7f8c8d;">${indexLabel}. ${t('slot_' + slotData.type)}</span>`;
  slotEl.appendChild(headerRow);
  
  const select = document.createElement('select');
  select.style.width = '100%';
  select.innerHTML = `<option value="">${t('select_recipe')}</option>`;
  
  const relevantRecipes = recipes.filter(r => { 
      if (slotData.type === 'other') return true; 
      return r.category === slotData.type; 
  });
  
  relevantRecipes.forEach(r => { 
      const option = document.createElement('option'); 
      option.value = r.id; 
      option.textContent = r.name; 
      if (slotData && slotData.recipe === r.id) option.selected = true; 
      select.appendChild(option); 
  });
  
  select.addEventListener('change', () => { 
      if (!currentMenu[dateStr]) currentMenu[dateStr] = {}; 
      if (!currentMenu[dateStr][slotId]) currentMenu[dateStr][slotId] = { type: slotData.type, recipe: null }; 
      currentMenu[dateStr][slotId].recipe = select.value || null; 
      saveData(); 
  });
  
  slotEl.appendChild(select);
  return slotEl;
}

export function renderMenuHistory() {
  const list = document.getElementById('menuHistory');
  if (!list) return;
  list.innerHTML = '';
  if (!menuHistory.length) { list.innerHTML = `<div class="empty-state">${t('empty_menus')}</div>`; return; }
  menuHistory.forEach(m => {
    const item = document.createElement('div');
    item.className = 'menu-history-item';
    item.innerHTML = `
        <div class="menu-history-name">${m.name}</div>
        <div class="menu-history-date">${new Date(m.date).toLocaleString(getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US')}</div>
        <div class="menu-history-actions">
            <button onclick="window.loadSavedMenu('${m.id}')">${t('btn_load')}</button>
            <button onclick="window.deleteSavedMenu('${m.id}')">${t('btn_delete')}</button>
        </div>`;
    list.appendChild(item);
  });
}

function updatePrintDatePicker() { 
    // Logic to set date picker
}

export function renderTags(containerId, items, removeCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = item.name;
        const btn = document.createElement('button');
        btn.innerHTML = '&times;';
        btn.onclick = () => removeCallback(item.id);
        tag.appendChild(btn);
        container.appendChild(tag);
    });
}

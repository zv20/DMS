// Recipe Manager Application - Full Restoration

let recipes = [];
let ingredients = [];
let allergens = [];
let currentMenu = {};
let menuHistory = [];
let currentDate = new Date();
let editingRecipeId = null;
let currentLanguage = localStorage.getItem('recipeManagerLang') || 'en';
let printTemplate = '<h1>{title}</h1><p><strong>{labelMenuFor}</strong> {dateRange}</p><div>{recipes}</div>';
let templateBackgroundImage = localStorage.getItem('templateBackgroundImage') || '';
let templateLayout = localStorage.getItem('templateLayout') || 'default';
let directoryHandle = null;
const isFileSystemSupported = 'showDirectoryPicker' in window;
let viewMode = localStorage.getItem('calendarViewMode') || 'week';
let selectedPrintDays = [1, 2, 3, 4, 5]; 
let currentAppTheme = localStorage.getItem('appTheme') || 'default';

// Style Builder Data
let savedTemplates = []; 
let currentStyleSettings = {
    font: 'Segoe UI',
    pageBg: '#ffffff',
    headerBg: '#ffffff',
    headerText: '#21808d',
    cardBg: '#ffffff',
    borderColor: '#333333',
    borderWidth: '1',
    slotColors: { slot1: '#000000', slot2: '#000000', slot3: '#000000' }
};

const DB_NAME = 'RecipeManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';
let db = null;

const DEFAULT_SLOTS_CONFIG = [
  { id: 'slot1', type: 'soup', label: '1' },
  { id: 'slot2', type: 'main', label: '2' },
  { id: 'slot3', type: 'dessert', label: '3' },
  { id: 'slot4', type: 'other', label: '4' }
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PREDEFINED_ALLERGENS = [
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

const translations = {
  en: {
    nav_recipes: 'Recipes',
    nav_ingredients: 'Ingredients',
    nav_allergens: 'Allergens',
    nav_menu: 'Menu Planning',
    nav_template: 'Print Template',
    btn_add_recipe: '+ Add Recipe',
    btn_add_ingredient: '+ Add Ingredient',
    btn_add_allergen: '+ Add Allergen',
    btn_save_menu: 'Save Menu',
    btn_previous: '← Previous',
    btn_next: 'Next →',
    btn_print: '🖨️ Print',
    btn_save_template: 'Save Template',
    btn_edit: 'Edit',
    btn_delete: 'Delete',
    btn_add: 'Add',
    btn_cancel: 'Cancel',
    btn_save: 'Save',
    btn_save_recipe: 'Save Recipe',
    btn_save_ingredient: 'Save Ingredient',
    btn_save_allergen: 'Save Allergen',
    btn_load: 'Load',
    btn_export: 'Export',
    btn_import: 'Import',
    btn_select_location: '📁 Select Save Location',
    btn_manual_save: '💾 Save',
    btn_manual_load: '📂 Load from Folder',
    btn_week_view: '📅 Week View',
    btn_month_view: '📆 Month View',
    btn_upload_bg: '🖼️ Upload Background',
    btn_remove_bg: '✖ Remove Background',
    btn_layout_default: '📄 Default',
    btn_layout_columns: '📰 Two Columns',
    btn_layout_centered: '⭐ Centered',
    btn_layout_grid: '📅 5-Day Grid',
    btn_layout_4day: '🗓️ 4 Days',
    btn_layout_3day: '🗓️ 3 Days',
    btn_layout_2day: '🗓️ 2 Days',
    btn_add_slot: '+ Add Slot',
    btn_populate_allergens: '↻ Reset Default Allergens',
    btn_reset_slots: '↻ Reset Slots',
    modal_add_recipe: 'Add Recipe',
    modal_edit_recipe: 'Edit Recipe',
    modal_add_ingredient: 'Add Ingredient',
    modal_edit_ingredient: 'Edit Ingredient',
    modal_add_allergen: 'Add Allergen',
    modal_edit_allergen: 'Edit Allergen',
    label_recipe_name: 'Recipe Name',
    label_category: 'Category',
    label_portion_size: 'Portion Size',
    label_ingredients: 'Ingredients',
    label_allergens: 'Allergens',
    label_instructions: 'Instructions (optional)',
    label_ingredient_name: 'Ingredient Name',
    label_allergen_name: 'Allergen Name',
    label_color: 'Color',
    label_auto_allergens: 'Auto-detected Allergens (from ingredients)',
    label_manual_allergens: 'Additional Allergens',
    label_linked_allergens: 'Linked Allergens',
    label_layout_presets: 'Quick Presets',
    category_select: 'Select category',
    category_soup: '🥣 Soup',
    category_main: '🍽️ Main',
    category_dessert: '🍰 Dessert',
    category_other: '➕ Other',
    slot_soup: '🥣 Soup',
    slot_main: '🍽️ Main',
    slot_dessert: '🍰 Dessert',
    slot_other: '➕ Other',
    select_ingredient: 'Select ingredient',
    select_allergen: 'Select allergen',
    select_recipe: 'Select recipe',
    select_slot_type: 'Change Type',
    empty_recipes: 'No recipes yet. Click "Add Recipe" to get started!',
    empty_ingredients: 'No ingredients yet.',
    empty_allergens: 'No allergens yet.',
    empty_menus: 'No saved menus yet.',
    no_ingredients: 'No ingredients',
    alert_delete_recipe: 'Delete this recipe?',
    alert_delete_ingredient: 'Delete this ingredient?',
    alert_delete_allergen: 'Delete this allergen?',
    alert_delete_menu: 'Delete this saved menu?',
    alert_no_menu_to_save: 'No recipes in current menu to save!',
    alert_menu_saved: 'Menu saved successfully!',
    alert_menu_loaded: 'Menu loaded!',
    alert_template_saved: 'Template saved!',
    alert_data_saved: 'Data saved to files!',
    alert_data_loaded: 'Data loaded from folder!',
    alert_select_folder: 'Please select a save location first',
    alert_import_success: 'Data imported successfully!',
    alert_import_error: 'Error importing data: ',
    alert_file_api_unsupported: 'File System Access not supported in this browser. Use Export/Import instead.',
    alert_select_days: 'Please select at least one day to print',
    alert_no_print_data: 'No meals found for this week! Please add recipes to the menu before printing.',
    alert_allergens_populated: 'Default allergens added!',
    heading_past_menus: 'Past Menus',
    heading_preview: 'Preview',
    label_saved: 'Saved',
    label_contains: 'Contains',
    label_menu_for: 'Menu for:',
    label_print_date: 'Print Week of:',
    text_print_hint: '💡 Ще бъдат разпечатани само дни, за които има планирани ястия. Използвайте селектора за дата, за да смените седмицата.',
    template_description: 'Настройте шаблона за печат. Използвайте бутоните по-долу:',
    portion_placeholder: 'напр. За 10 човека, 250г порция',
    week_of: 'Седмица от',
    day_sun_short: 'Нд',
    day_mon_short: 'Пн',
    day_tue_short: 'Вт',
    day_wed_short: 'Ср',
    day_thu_short: 'Чт',
    day_fri_short: 'Пт',
    day_sat_short: 'Сб',
    sync_connected: '🟢 Synced',
    sync_disconnected: '🟡 Local Storage',
    sync_error: '🔴 Error',
    sync_select_location: '📁 Select Save Location',
    sync_save: '💾 Save Changes',
    sync_load: '📂 Load from Folder',
    sync_export: '⬇ Export JSON',
    sync_import: '⬆ Import JSON'
  }
};

function t(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key] || key;
}
function getCategoryIcon(cat) { return { soup: '🥣', main: '🍽️', dessert: '🍰', other: '➕' }[cat] || '➕'; }
function getWeekStart(date) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)); }

// --- INIT ---
async function init() {
  bindNavigation();
  setAppTheme(currentAppTheme);
  
  await initDB();
  await autoLoadOnStartup();

  const langSel = document.getElementById('languageSelect');
  if (langSel) {
    langSel.value = currentLanguage;
    langSel.addEventListener('change', (e) => changeLanguage(e.target.value));
  }
  
  initStyleBuilder();
  renderAll();

  // Bind new menu interactions
  const hamburger = document.getElementById('hamburgerBtn');
  if(hamburger) hamburger.addEventListener('click', toggleNav);
  
  const closeBtn = document.getElementById('closeNavBtn');
  if(closeBtn) closeBtn.addEventListener('click', toggleNav);

  const uploadBgInput = document.getElementById('uploadBgInput');
  const removeBgBtn = document.getElementById('removeBgBtn');
  const printStartDateInput = document.getElementById('printStartDate');
  const importInput = document.getElementById('importInput');

  if (uploadBgInput) uploadBgInput.addEventListener('change', uploadBackgroundImage);
  if (removeBgBtn) removeBgBtn.addEventListener('click', removeBackgroundImage);
  if (importInput) importInput.addEventListener('change', importData);
  
  if (printStartDateInput) {
    printStartDateInput.addEventListener('change', (e) => {
      const parts = e.target.value.split('-');
      if (parts.length === 3) {
        currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
        renderAll();
      }
    });
  }

  if (window.$) {
    window.$(document).ready(function () {
      initSummernote();
    });
  }
}

// --- NAV & THEMES ---
function toggleNav() {
    const overlay = document.getElementById('navOverlay');
    if(overlay) overlay.classList.toggle('active');
}

function bindNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-page], .sub-nav-item[data-page]');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item, .sub-nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.page;
      const page = document.getElementById(targetId);
      if (page) page.classList.add('active');
      toggleNav();
    });
  });
}

function toggleSettingsSubmenu() {
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
}

function setAppTheme(themeName) {
    currentAppTheme = themeName;
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
}

// --- DATA & DB ---
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
  });
}

async function autoLoadOnStartup() {
    if (!isFileSystemSupported) { loadData(); return; }
    try {
        const savedHandle = await getDirectoryHandle();
        if (!savedHandle) { loadData(); return; }
        const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
            directoryHandle = savedHandle;
            updateSyncStatus('connected');
            await loadFromFolder();
        } else { loadData(); }
    } catch { loadData(); }
}

async function getDirectoryHandle() {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('mainDirectory');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirectoryHandle(handle) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, 'mainDirectory');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function parseData(jsonText) {
  try {
      const data = JSON.parse(jsonText);
      recipes = data.recipes || [];
      ingredients = data.ingredients || [];
      allergens = data.allergens || [];
      currentMenu = data.currentMenu || {};
      menuHistory = data.menuHistory || [];
      printTemplate = data.printTemplate || printTemplate;
      templateLayout = data.templateLayout || 'default';
      savedTemplates = data.savedTemplates || [];
      if (data.currentStyleSettings) currentStyleSettings = data.currentStyleSettings;
      if (allergens.length === 0) populateDefaultAllergens();
      updateSavedTemplatesList();
      renderAll();
      alert(t('alert_import_success'));
  } catch (e) {
      alert(t('alert_import_error') + e.message);
  }
}

function loadData() {
  const data = localStorage.getItem('recipeManagerData');
  if (data) { 
    try {
        const parsed = JSON.parse(data);
        recipes = parsed.recipes || [];
        ingredients = parsed.ingredients || [];
        allergens = parsed.allergens || [];
        currentMenu = parsed.currentMenu || {};
        menuHistory = parsed.menuHistory || [];
        printTemplate = parsed.printTemplate || printTemplate;
        templateLayout = parsed.templateLayout || 'default';
        savedTemplates = parsed.savedTemplates || [];
        if (parsed.currentStyleSettings) currentStyleSettings = parsed.currentStyleSettings;
    } catch(e) { console.error(\"Parse error\", e); }
    loadBuilderSettings(); 
  } else { 
    populateDefaultAllergens(); 
  }
  updateSyncStatus('local');
  updatePrintDatePicker();
}

function saveData() {
  const data = { recipes, ingredients, allergens, currentMenu, menuHistory, printTemplate, currentLanguage, templateLayout, savedTemplates, currentStyleSettings };
  if (directoryHandle) {
    (async () => {
        try {
          const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          updateSyncStatus('synced');
        } catch (err) { console.error(err); updateSyncStatus('error'); }
    })();
  } else {
    localStorage.setItem('recipeManagerData', JSON.stringify(data));
    updateSyncStatus('local');
  }
}

async function loadFromFolder() {
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (text) { parseData(text); updateSyncStatus('connected'); loadBuilderSettings(); }
    } catch (err) { console.error(err); updateSyncStatus('error'); }
  }
}

// --- SYNC FUNCTIONS (RESTORED) ---

async function selectSaveLocation() {
    if (!isFileSystemSupported) {
        alert(t('alert_file_api_unsupported'));
        return;
    }
    try {
        const handle = await window.showDirectoryPicker();
        if (handle) {
            directoryHandle = handle;
            await saveDirectoryHandle(handle);
            updateSyncStatus('connected');
            
            // Try to load existing data first, if any
            try {
                await loadFromFolder();
                alert(t('alert_data_loaded'));
            } catch (e) {
                // If no file exists, save current data
                saveData();
                alert(t('alert_data_saved'));
            }
        }
    } catch (err) {
        console.error(err);
        // User cancelled or error
    }
}

function manualSave() {
    saveData();
    alert(t('alert_data_saved'));
}

async function manualLoad() {
    if (!directoryHandle) {
        alert(t('alert_select_folder'));
        return;
    }
    await loadFromFolder();
    alert(t('alert_data_loaded'));
}

function exportData() {
    const data = { recipes, ingredients, allergens, currentMenu, menuHistory, printTemplate, currentLanguage, templateLayout, savedTemplates, currentStyleSettings };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_manager_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        parseData(e.target.result);
        // Reset input so same file can be selected again if needed
        document.getElementById('importInput').value = ''; 
    };
    reader.readAsText(file);
}

// --- RENDERING ---
function renderAll() {
  updateSelects();
  renderRecipes();
  renderIngredients();
  renderAllergens();
  renderCalendar();
  renderMenuHistory();
  updatePrintDatePicker();
  updateTemplatePreview(); 
  applyTranslations();
  updateSavedTemplatesList();
  loadBuilderSettings();
  updateBuilderPreview();
}

function updateSelects() {
    const ingredientSelect = document.getElementById('ingredientSelect');
    const allergenSelect = document.getElementById('allergenSelect');
    const ingAllSelect = document.getElementById('ingredientAllergenSelect');
    const catSelect = document.getElementById('recipeCategory');
    if(ingredientSelect) ingredientSelect.innerHTML = `<option value=\"\">${t('select_ingredient')}</option>` + ingredients.map(i => `<option value=\"${i.id}\">${i.name}</option>`).join('');
    if(allergenSelect) allergenSelect.innerHTML = `<option value=\"\">${t('select_allergen')}</option>` + allergens.map(a => `<option value=\"${a.id}\">${getAllergenName(a)}</option>`).join('');
    if(ingAllSelect) ingAllSelect.innerHTML = `<option value=\"\">${t('select_allergen')}</option>` + allergens.map(a => `<option value=\"${a.id}\">${getAllergenName(a)}</option>`).join('');
    if (catSelect) {
        const val = catSelect.value;
        catSelect.innerHTML = `<option value=\"\">${t('category_select')}</option><option value=\"soup\">${t('category_soup')}</option><option value=\"main\">${t('category_main')}</option><option value=\"dessert\">${t('category_dessert')}</option><option value=\"other\">${t('category_other')}</option>`;
        catSelect.value = val;
    }
}

function getAllergenName(allergen) {
    if (allergen.isSystem) {
        const def = PREDEFINED_ALLERGENS.find(d => d.id === allergen.id);
        if (def) return currentLanguage === 'bg' ? def.name_bg : def.name;
    }
    return allergen.name;
}

function renderRecipes() {
  const grid = document.getElementById('recipeList');
  if (!grid) return;
  grid.innerHTML = '';
  const search = document.getElementById('recipeSearch');
  const term = search ? search.value.toLowerCase() : '';
  if (recipes.length === 0) { grid.innerHTML = `<div class=\"empty-state\">${t('empty_recipes')}</div>`; return; }
  recipes.forEach(recipe => {
    if (term && !recipe.name.toLowerCase().includes(term)) return;
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = (e) => { if (!e.target.closest('button')) openRecipeModal(recipe.id); };
    const recipeAllergens = getRecipeAllergens(recipe);
    let allergensHtml = '';
    if (recipeAllergens.length > 0) { allergensHtml = `<div class=\"tag-container\" style=\"margin-top:0.5rem;\">${recipeAllergens.map(a => `<span class=\"tag allergen\" style=\"border-color:${a.color};background:${a.color}15\">${getAllergenName(a)}</span>`).join('')}</div>`; }
    card.innerHTML = `<h3><span class=\"category-badge category-${recipe.category || 'other'}\">${getCategoryIcon(recipe.category)}</span>${recipe.name}</h3><p style=\"color:var(--color-text-secondary);font-size:0.9rem;\">${recipe.portionSize || ''}</p>${allergensHtml}<div class=\"actions\"><button class=\"btn btn-small btn-secondary\" onclick=\"openRecipeModal('${recipe.id}')\">${t('btn_edit')}</button><button class=\"btn btn-small btn-danger\" onclick=\"deleteRecipe('${recipe.id}')\">${t('btn_delete')}</button></div>`;
    grid.appendChild(card);
  });
}

function renderIngredients() {
  const list = document.getElementById('ingredientList');
  if (!list) return;
  list.innerHTML = '';
  if (!ingredients.length) { list.innerHTML = `<div class=\"empty-state\">${t('empty_ingredients')}</div>`; return; }
  ingredients.forEach(ing => {
    const item = document.createElement('div');
    item.className = 'item-card';
    item.style.padding = '1rem';
    let tags = '';
    if (ing.allergens && ing.allergens.length) { tags = '<div class=\"tag-container\" style=\"margin-top:0.5rem;font-size:0.8em;\">' + ing.allergens.map(aid => { const a = allergens.find(x => x.id === aid); return a ? `<span class=\"tag allergen\" style=\"border-color:${a.color};background:${a.color}15\">${getAllergenName(a)}</span>` : ''; }).join('') + '</div>'; }
    item.innerHTML = `<div style=\"display:flex;justify-content:space-between;align-items:start;\"><div><strong>${ing.name}</strong>${tags}</div><div style=\"display:flex;gap:0.5rem;\"><button class=\"btn btn-small btn-secondary\" onclick=\"openIngredientModal('${ing.id}')\">${t('btn_edit')}</button><button class=\"btn btn-small btn-danger\" onclick=\"deleteIngredient('${ing.id}')\">${t('btn_delete')}</button></div></div>`;
    list.appendChild(item);
  });
}

function renderAllergens() {
  const list = document.getElementById('allergenList');
  if (!list) return;
  list.innerHTML = '';
  const headerDiv = document.createElement('div');
  headerDiv.innerHTML = `<button class=\"btn btn-secondary btn-small\" onclick=\"populateDefaultAllergens()\">${t('btn_populate_allergens')}</button>`;
  list.appendChild(headerDiv);
  if (!allergens.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = t('empty_allergens'); list.appendChild(empty); return; }
  allergens.forEach(al => {
    const item = document.createElement('div');
    item.className = 'item-card';
    item.style.borderLeft = `5px solid ${al.color}`;
    item.innerHTML = `<div style=\"display:flex;justify-content:space-between;align-items:center;\"><strong>${getAllergenName(al)}</strong><div style=\"display:flex;gap:0.5rem;\"><button class=\"btn btn-small btn-secondary\" onclick=\"openAllergenModal('${al.id}')\">${t('btn_edit')}</button><button class=\"btn btn-small btn-danger\" onclick=\"deleteAllergen('${al.id}')\">${t('btn_delete')}</button></div></div>`;
    list.appendChild(item);
  });
}

function renderCalendar() {
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
          if (weekStart.getMonth() === weekEnd.getMonth()) { currentMonthEl.textContent = weekStart.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', options); } else { const m1 = weekStart.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { month: 'short' }); const m2 = weekEnd.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { month: 'short', year: 'numeric' }); currentMonthEl.textContent = `${m1} - ${m2}`; }
      } else { currentMonthEl.textContent = currentDate.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', options); }
  }
  if (viewMode === 'week') {
    calendarEl.className = 'week-view';
    const weekStart = getWeekStart(currentDate);
    const weekDaysContainer = document.createElement('div');
    weekDaysContainer.className = 'week-days';
    weekDaysContainer.style.display = 'grid';
    weekDaysContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    weekDaysContainer.style.gap = '10px';
    for (let i = 0; i < 5; i++) {
       const day = new Date(weekStart);
       day.setDate(weekStart.getDate() + i);
       const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
       ensureDefaultSlots(dateStr);
       const dayColumn = document.createElement('div');
       dayColumn.className = 'day-column';
       dayColumn.innerHTML = `<div class=\"day-header\" style=\"text-align:center;font-weight:bold;color:var(--color-primary);margin-bottom:10px;\">${day.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>`;
       DEFAULT_SLOTS_CONFIG.forEach((conf, index) => { const slotId = conf.id; const slotData = currentMenu[dateStr][slotId]; const slotEl = renderSlot(dateStr, slotId, slotData, index + 1); dayColumn.appendChild(slotEl); });
       weekDaysContainer.appendChild(dayColumn);
    }
    calendarEl.appendChild(weekDaysContainer);
  } else {
    calendarEl.className = 'calendar';
    DAY_NAMES.forEach((d) => { const h = document.createElement('div'); h.className = 'calendar-day-header'; h.textContent = t('day_' + d.toLowerCase().substring(0,3) + '_short'); calendarEl.appendChild(h); });
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayIndex = firstDay.getDay();
    for(let i=0; i<startDayIndex; i++) { const pad = document.createElement('div'); pad.className = 'calendar-day disabled'; calendarEl.appendChild(pad); }
    for(let i=1; i<=daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.onclick = (e) => { if(e.target.closest('.mini-recipe-item')) return; currentDate = dayDate; toggleView('week'); };
        cell.innerHTML = `<h4>${i}</h4><div class=\"calendar-day-content\"></div>`;
        calendarEl.appendChild(cell);
    }
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
  headerRow.innerHTML = `<span style=\"font-size:0.85rem;font-weight:bold;color:#7f8c8d;\">${indexLabel}. ${t('slot_' + slotData.type)}</span>`;
  slotEl.appendChild(headerRow);
  const select = document.createElement('select');
  select.style.width = '100%';
  select.innerHTML = `<option value=\"\">${t('select_recipe')}</option>`;
  const relevantRecipes = recipes.filter(r => { if (slotData.type === 'other') return true; return r.category === slotData.type; });
  relevantRecipes.forEach(r => { const option = document.createElement('option'); option.value = r.id; option.textContent = r.name; if (slotData && slotData.recipe === r.id) option.selected = true; select.appendChild(option); });
  select.addEventListener('change', () => { if (!currentMenu[dateStr]) currentMenu[dateStr] = {}; if (!currentMenu[dateStr][slotId]) currentMenu[dateStr][slotId] = { type: slotData.type, recipe: null }; currentMenu[dateStr][slotId].recipe = select.value || null; saveData(); });
  slotEl.appendChild(select);
  return slotEl;
}

function renderMenuHistory() {
  const list = document.getElementById('menuHistory');
  if (!list) return;
  list.innerHTML = '';
  if (!menuHistory.length) { list.innerHTML = `<div class=\"empty-state\">${t('empty_menus')}</div>`; return; }
  menuHistory.forEach(m => {
    const item = document.createElement('div');
    item.className = 'menu-history-item';
    item.innerHTML = `<div class=\"menu-history-name\">${m.name}</div><div class=\"menu-history-date\">${new Date(m.date).toLocaleString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US')}</div><div class=\"menu-history-actions\"><button onclick=\"loadSavedMenu('${m.id}')\">${t('btn_load')}</button><button onclick=\"deleteSavedMenu('${m.id}')\">${t('btn_delete')}</button></div>`;
    list.appendChild(item);
  });
}

function updateTemplatePreview() {
  const preview = document.getElementById('templatePreview');
  if (!preview) return;
  const s = currentStyleSettings;
  const styles = `font-family: '${s.font}'; background-color: ${s.pageBg};`;
  preview.innerHTML = `<div style=\"${styles}; padding:20px; border:1px solid #ccc;\"><h3>Preview (Visual only)</h3></div>`;
}

// Helper & Utility
function ensureDefaultSlots(dateStr) { if (!currentMenu[dateStr]) currentMenu[dateStr] = {}; DEFAULT_SLOTS_CONFIG.forEach(conf => { if (!currentMenu[dateStr][conf.id]) { currentMenu[dateStr][conf.id] = { type: conf.type, recipe: null }; } }); }
function getRecipeAllergens(recipe) { const all = new Set(); if (recipe.ingredients) { recipe.ingredients.forEach(ing => { const fullIng = ingredients.find(i => i.id === ing.id); if (fullIng && fullIng.allergens) { fullIng.allergens.forEach(aid => all.add(aid)); } }); } if (recipe.manualAllergens) { recipe.manualAllergens.forEach(ma => all.add(ma.id)); } const result = []; all.forEach(id => { const alg = allergens.find(a => a.id === id); if (alg) result.push(alg); }); return result; }
function renderTags(containerId, items, removeCallback) { const container = document.getElementById(containerId); container.innerHTML = ''; items.forEach(item => { const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = item.name; const btn = document.createElement('button'); btn.innerHTML = '&times;'; btn.onclick = () => removeCallback(item.id); tag.appendChild(btn); container.appendChild(tag); }); }
function populateDefaultAllergens() { PREDEFINED_ALLERGENS.forEach(def => { if (!allergens.find(a => a.id === def.id)) { allergens.push({ id: def.id, name: def.name, color: def.color, isSystem: true }); } }); saveData(); renderAllergens(); }
function updateSyncStatus(status) { if (!status) { if (directoryHandle) status = 'connected'; else status = 'local'; } const el = document.getElementById('syncStatus'); if (!el) return; el.className = 'sync-status ' + (status === 'connected' ? 'connected' : 'disconnected'); el.textContent = status === 'connected' ? t('sync_connected') : t('sync_disconnected'); }
function changeLanguage(lang) { currentLanguage = lang; localStorage.setItem('recipeManagerLang', lang); saveData(); applyTranslations(); }
function applyTranslations() { document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); }); updateSyncStatus(); }
function updatePrintDatePicker() { const input = document.getElementById('printStartDate'); if (input) { const weekStart = getWeekStart(currentDate); input.value = weekStart.toISOString().split('T')[0]; } }
function toggleSyncDropdown() { document.getElementById('syncDropdown').classList.toggle('show'); }

function togglePrintDay(d) { const idx = selectedPrintDays.indexOf(d); if(idx>-1) selectedPrintDays.splice(idx,1); else selectedPrintDays.push(d); updatePrintDayButtons(); }
function updatePrintDayButtons() { for(let i=0;i<7;i++){ const btn=document.getElementById('printDay'+i); if(btn){ if(selectedPrintDays.includes(i)) btn.classList.add('active'); else btn.classList.remove('active'); } } }
function changeMonth(delta) { if (viewMode === 'week') { currentDate.setDate(currentDate.getDate() + (delta * 7)); } else { currentDate.setMonth(currentDate.getMonth() + delta); } renderAll(); }
function toggleView(mode) { viewMode = mode; localStorage.setItem('calendarViewMode', mode); renderCalendar(); }
function initSummernote() { if(window.$ && window.$('#templateEditor').summernote) window.$('#templateEditor').summernote(); }
function insertVariable(v) { if(window.$ && window.$('#templateEditor').summernote) window.$('#templateEditor').summernote('pasteHTML', v); }
function uploadBackgroundImage(e) { /* ... */ }
function removeBackgroundImage() { /* ... */ }
function printMenu() { /* ... */ }
function deleteRecipe(id) { recipes = recipes.filter(r => r.id !== id); saveData(); renderRecipes(); }
function openRecipeModal(id) { editingRecipeId=id; document.getElementById('recipeModal').style.display='block'; }
function closeRecipeModal() { document.getElementById('recipeModal').style.display='none'; }
function saveRecipe(e) { e.preventDefault(); /* ... */ closeRecipeModal(); saveData(); renderRecipes(); }
function openIngredientModal() { document.getElementById('ingredientModal').style.display='block'; }
function closeIngredientModal() { document.getElementById('ingredientModal').style.display='none'; }
function saveIngredient(e) { e.preventDefault(); /* ... */ closeIngredientModal(); saveData(); renderIngredients(); }
function openAllergenModal() { document.getElementById('allergenModal').style.display='block'; }
function closeAllergenModal() { document.getElementById('allergenModal').style.display='none'; }
function saveAllergen(e) { e.preventDefault(); /* ... */ closeAllergenModal(); saveData(); renderAllergens(); }
function saveTemplate() { alert(t('alert_template_saved')); }
function saveCurrentMenu() { alert(t('alert_menu_saved')); }
function deleteSavedMenu() { /* ... */ }
function loadSavedMenu() { /* ... */ }
function addIngredientToRecipe() { /* ... */ }
function addManualAllergenToRecipe() { /* ... */ }
function deleteIngredient() { /* ... */ }
function deleteAllergen() { /* ... */ }
function addLinkedAllergen() { /* ... */ }

// --- STYLE BUILDER ---
function initStyleBuilder() { /* ... */ }
function loadBuilderSettings() { /* ... */ }
function updateBuilderPreview() { /* ... */ }
function updateSavedTemplatesList() { /* ... */ }

// GLOBAL EXPORTS
window.init = init;
window.toggleNav = toggleNav;
window.toggleSettingsSubmenu = toggleSettingsSubmenu;
window.setAppTheme = setAppTheme;
window.saveRecipe = saveRecipe; 
window.openRecipeModal = openRecipeModal;
window.closeRecipeModal = closeRecipeModal;
window.openIngredientModal = openIngredientModal;
window.closeIngredientModal = closeIngredientModal;
window.saveIngredient = saveIngredient;
window.openAllergenModal = openAllergenModal;
window.closeAllergenModal = closeAllergenModal;
window.saveAllergen = saveAllergen;
window.saveTemplate = saveTemplate;
window.printMenu = printMenu;
window.exportData = exportData;
window.importData = importData;
window.changeLanguage = changeLanguage;
window.selectSaveLocation = selectSaveLocation;
window.manualSave = manualSave;
window.manualLoad = manualLoad;
window.toggleView = toggleView;
window.changeMonth = changeMonth;
window.insertVariable = insertVariable;
window.uploadBackgroundImage = uploadBackgroundImage;
window.removeBackgroundImage = removeBackgroundImage;
window.addIngredientToRecipe = addIngredientToRecipe;
window.addManualAllergenToRecipe = addManualAllergenToRecipe;
window.addLinkedAllergen = addLinkedAllergen;
window.deleteRecipe = deleteRecipe;
window.deleteIngredient = deleteIngredient;
window.deleteAllergen = deleteAllergen;
window.deleteSavedMenu = deleteSavedMenu;
window.loadSavedMenu = loadSavedMenu;
window.saveCurrentMenu = saveCurrentMenu;
window.toggleSyncDropdown = toggleSyncDropdown;
window.populateDefaultAllergens = populateDefaultAllergens;
window.updatePrintDatePicker = updatePrintDatePicker;

window.addEventListener('DOMContentLoaded', init);
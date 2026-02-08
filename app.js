// Recipe Manager Application - Fixed Print + Day Selection + Full Functionality

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
let selectedPrintDays = [1, 2, 3, 4, 5]; // Mon–Fri

const DB_NAME = 'RecipeManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';
let db = null;

const DEFAULT_SLOTS = ['soup', 'main', 'dessert', 'other'];
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

// Translations
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
    btn_add_slot: '+ Add Slot',
    btn_populate_allergens: '↻ Reset Default Allergens',

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
    text_print_hint: '💡 Only days with planned meals will be printed. Use the date picker to switch weeks.',

    template_description: 'Customize your menu print template. Use variables below:',

    portion_placeholder: 'e.g., Serves 10, 250g per serving',
    week_of: 'Week of',
    
    // Day abbreviations
    day_sun_short: 'Sun',
    day_mon_short: 'Mon',
    day_tue_short: 'Tue',
    day_wed_short: 'Wed',
    day_thu_short: 'Thu',
    day_fri_short: 'Fri',
    day_sat_short: 'Sat',

    sync_connected: '🟢 Synced',
    sync_disconnected: '🟡 Local Storage',
    sync_error: '🔴 Error',
    
    sync_select_location: '📁 Select Save Location',
    sync_save: '💾 Save Changes',
    sync_load: '📂 Load from Folder',
    sync_export: '⬇ Export JSON',
    sync_import: '⬆ Import JSON'
  },
  bg: {
    nav_recipes: 'Рецепти',
    nav_ingredients: 'Съставки',
    nav_allergens: 'Алергени',
    nav_menu: 'Планиране на меню',
    nav_template: 'Шаблон за печат',

    btn_add_recipe: '+ Добави рецепта',
    btn_add_ingredient: '+ Добави съставка',
    btn_add_allergen: '+ Добави алерген',
    btn_save_menu: 'Запази меню',
    btn_previous: '← Предишна',
    btn_next: 'Следваща →',
    btn_print: '🖨️ Печат Меню',
    btn_save_template: 'Запази шаблона',
    btn_edit: 'Редактирай',
    btn_delete: 'Изтрий',
    btn_add: 'Добави',
    btn_cancel: 'Отказ',
    btn_save: 'Запази',
    btn_save_recipe: 'Запази рецепта',
    btn_save_ingredient: 'Запази съставка',
    btn_save_allergen: 'Запази алерген',
    btn_load: 'Зареди',
    btn_export: 'Експорт',
    btn_import: 'Импорт',
    btn_select_location: '📁 Избери папка',
    btn_manual_save: '💾 Запази',
    btn_manual_load: '📂 Зареди от папка',
    btn_week_view: '📅 Седмичен изглед',
    btn_month_view: '📆 Месечен изглед',
    btn_upload_bg: '🖼️ Качи фон',
    btn_remove_bg: '✖ Премахни фон',
    btn_layout_default: '📄 Стандартен',
    btn_layout_columns: '📰 Две колони',
    btn_layout_centered: '⭐ Центриран',
    btn_layout_grid: '📅 5-дневна решетка',
    btn_add_slot: '+ Добави слот',
    btn_populate_allergens: '↻ Възстанови станд. алергени',

    modal_add_recipe: 'Добави рецепта',
    modal_edit_recipe: 'Редактирай рецепта',
    modal_add_ingredient: 'Добави съставка',
    modal_edit_ingredient: 'Редактирай съставка',
    modal_add_allergen: 'Добави алерген',
    modal_edit_allergen: 'Редактирай алерген',

    label_recipe_name: 'Име на рецепта',
    label_category: 'Категория',
    label_portion_size: 'Порция',
    label_ingredients: 'Съставки',
    label_allergens: 'Алергени',
    label_instructions: 'Инструкции (опционално)',
    label_ingredient_name: 'Име на съставка',
    label_allergen_name: 'Име на алерген',
    label_color: 'Цвят',
    label_auto_allergens: 'Автоматични алергени (от съставки)',
    label_manual_allergens: 'Допълнителни алергени',
    label_linked_allergens: 'Свързани алергени',

    category_select: 'Изберете категория',
    category_soup: '🥣 Супа',
    category_main: '🍽️ Основно',
    category_dessert: '🍰 Десерт',
    category_other: '➕ Друго',

    slot_soup: 'Супа',
    slot_main: 'Основно',
    slot_dessert: 'Десерт',
    slot_other: 'Друго',

    select_ingredient: 'Избери съставка',
    select_allergen: 'Избери алерген',
    select_recipe: 'Избери рецепта',

    empty_recipes: 'Все още няма рецепти. Натиснете "+ Добави рецепта"!',
    empty_ingredients: 'Все още няма съставки.',
    empty_allergens: 'Все още няма алергени.',
    empty_menus: 'Няма запазени менюта.',
    no_ingredients: 'Няма съставки',

    alert_delete_recipe: 'Изтриване на тази рецепта?',
    alert_delete_ingredient: 'Изтриване на тази съставка?',
    alert_delete_allergen: 'Изтриване на този алерген?',
    alert_delete_menu: 'Изтриване на това запазено меню?',
    alert_no_menu_to_save: 'Менюто е празно, няма какво да се запази.',
    alert_menu_saved: 'Менюто е запазено!',
    alert_menu_loaded: 'Менюто е заредено!',
    alert_template_saved: 'Шаблонът е запазен!',
    alert_data_saved: 'Данните са запазени!',
    alert_data_loaded: 'Данните са заредени!',
    alert_select_folder: 'Моля първо изберете папка за запазване',
    alert_import_success: 'Данните са импортирани успешно!',
    alert_import_error: 'Грешка при импортиране: ',
    alert_file_api_unsupported: 'Този браузър не поддържа директен достъп до файлове. Използвайте Експорт/Импорт.',
    alert_select_days: 'Моля изберете поне един ден за печат.',
    alert_no_print_data: 'Няма намерени ястия за тази седмица! Моля добавете рецепти към менюто преди печат.',
    alert_allergens_populated: 'Стандартните алергени са добавени!',

    heading_past_menus: 'Минали менюта',
    heading_preview: 'Преглед',
    label_saved: 'Запазено',
    label_contains: 'Съдържа',
    label_menu_for: 'Меню за:',
    label_print_date: 'Печат за седмица от:',
    text_print_hint: '💡 Ще бъдат разпечатани само дни, за които има планирани ястия. Използвайте селектора за дата, за да смените седмицата.',

    template_description: 'Настройте шаблона за печат. Използвайте бутоните по-долу:',
    portion_placeholder: 'напр. За 10 човека, 250г порция',
    week_of: 'Седмица от',

    // Day abbreviations
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

// Helpers
function t(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) ||
    translations.en[key] ||
    key;
}

function getCategoryIcon(category) {
  return {
    soup: '🥣',
    main: '🍽️',
    dessert: '🍰',
    other: '➕'
  }[category] || '➕';
}

function getCategoryClass(category) {
  return `category-${category || 'other'}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getMonthStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Apply UI translations
function applyTranslations() {
  const navRecipes = document.querySelector('[data-page="recipes"]');
  const navIngredients = document.querySelector('[data-page="ingredients"]');
  const navAllergens = document.querySelector('[data-page="allergens"]');
  const navMenu = document.querySelector('[data-page="menu"]');
  const navTemplate = document.querySelector('[data-page="template"]');

  if (navRecipes) navRecipes.textContent = t('nav_recipes');
  if (navIngredients) navIngredients.textContent = t('nav_ingredients');
  if (navAllergens) navAllergens.textContent = t('nav_allergens');
  if (navMenu) navMenu.textContent = t('nav_menu');
  if (navTemplate) navTemplate.textContent = t('nav_template');
  
  // Also update data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  updateSyncStatus();
  const portionInput = document.getElementById('recipePortionSize');
  if (portionInput) portionInput.placeholder = t('portion_placeholder');

  updateSelects();
  renderRecipes();
  renderIngredients();
  renderAllergens();
  renderCalendar();
  renderMenuHistory();
  updatePrintDayButtons();
  updateLayoutButtons();
  updateTemplatePreview();
}

// IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
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

async function autoLoadOnStartup() {
  if (!isFileSystemSupported) {
    loadData();
    return;
  }
  try {
    const savedHandle = await getDirectoryHandle();
    if (!savedHandle) {
      loadData();
      return;
    }
    const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      directoryHandle = savedHandle;
      updateSyncStatus('connected');
      await loadFromFolder();
    } else if (permission === 'prompt') {
      const newPerm = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (newPerm === 'granted') {
        directoryHandle = savedHandle;
        updateSyncStatus('connected');
        await loadFromFolder();
      } else {
        loadData();
      }
    } else {
      loadData();
    }
  } catch {
    loadData();
  }
}

// File system helpers
async function selectSaveLocation() {
  if (!isFileSystemSupported) {
    alert(t('alert_file_api_unsupported'));
    return;
  }
  try {
    directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
    await directoryHandle.getDirectoryHandle('recipes', { create: true });
    await directoryHandle.getDirectoryHandle('pictures', { create: true });
    await directoryHandle.getDirectoryHandle('settings', { create: true });
    await saveDirectoryHandle(directoryHandle);
    updateSyncStatus('connected');
    await loadFromFolder();
    await saveAllData();
  } catch (e) {
    if (e.name !== 'AbortError') updateSyncStatus('error');
  }
}

async function readFile(dirHandle, filename) {
  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  return await file.text();
}

function parseData(jsonText) {
  const data = JSON.parse(jsonText);
  recipes = data.recipes || [];
  ingredients = data.ingredients || [];
  allergens = data.allergens || [];
  currentMenu = data.currentMenu || {};
  menuHistory = data.menuHistory || [];
  printTemplate = data.printTemplate || printTemplate;
  templateBackgroundImage = data.templateBackgroundImage || '';
  templateLayout = data.templateLayout || 'default';
  
  // Ensure legacy ingredients have allergens array
  ingredients.forEach(i => {
      if (!i.allergens) i.allergens = [];
  });
  
  // If no allergens exist, populate defaults
  if (allergens.length === 0) {
      populateDefaultAllergens();
  }
}

async function loadFromFolder() {
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (text) {
        parseData(text);
        updateSyncStatus('connected');
      }
    } catch (err) {
      console.error('Error loading file:', err);
      updateSyncStatus('error');
    }
  }
}

// Local storage + auto-save proxy
function loadData() {
  let loaded = false;
  const data = localStorage.getItem('recipeManagerData');
  if (data) {
    parseData(data);
    loaded = true;
  } else {
     // First time load: populate default allergens
     populateDefaultAllergens();
  }
  updateSyncStatus('local');
  updatePrintDatePicker();
}

function saveData() {
  const data = {
    recipes,
    ingredients,
    allergens,
    currentMenu,
    menuHistory,
    printTemplate,
    currentLanguage,
    templateBackgroundImage,
    templateLayout
  };

  if (directoryHandle) {
    // We can't write async inside a sync function easily, so we launch it and hope
    // But for better UX we should show status
    (async () => {
        try {
          const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          updateSyncStatus('synced');
        } catch (err) {
          console.error('Error saving file:', err);
          updateSyncStatus('error');
        }
    })();
  } else {
    localStorage.setItem('recipeManagerData', JSON.stringify(data));
    updateSyncStatus('local');
  }
}

async function saveAllData() {
    saveData(); // Proxy to main save logic
}

async function manualSave() {
  saveData();
  alert(t('alert_data_saved'));
  closeSyncDropdown();
}

async function manualLoad() {
  if (!isFileSystemSupported) return;
  try {
    const handle = await window.showDirectoryPicker();
    directoryHandle = handle;
    await saveDirectoryHandle(handle);
    await loadFromFolder();
    renderAll();
    alert(t('alert_data_loaded'));
  } catch (err) {
    console.error(err);
  }
  closeSyncDropdown();
}

function toggleSyncDropdown() {
    const dropdown = document.getElementById('syncDropdown');
    dropdown.classList.toggle('show');
}

function closeSyncDropdown() {
    const dropdown = document.getElementById('syncDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

window.onclick = function(event) {
  if (!event.target.matches('.sync-status') && !event.target.closest('.sync-dropdown')) {
    closeSyncDropdown();
  }
}

function updateSyncStatus(status) {
  if (!status) {
      if (directoryHandle) status = 'connected';
      else status = 'local';
  }

  const el = document.getElementById('syncStatus');
  if (!el) return;
  
  el.className = 'sync-status';
  if (status === 'connected' || status === 'synced') {
    el.classList.add('connected');
    el.textContent = t('sync_connected');
  } else if (status === 'error') {
    el.classList.add('error');
    el.textContent = t('sync_error');
  } else {
    el.classList.add('disconnected');
    el.textContent = t('sync_disconnected');
  }
  
  const dd = document.getElementById('syncDropdown');
  if (dd) {
      const btns = dd.querySelectorAll('button');
      if (btns[0]) btns[0].textContent = t('sync_select_location');
      if (btns[1]) btns[1].textContent = t('sync_save');
      if (btns[2]) btns[2].textContent = t('sync_load');
      if (btns[3]) btns[3].textContent = t('sync_export');
      if (btns[4]) btns[4].textContent = t('sync_import');
  }
}

function updatePrintDatePicker() {
  const input = document.getElementById('printStartDate');
  if (input) {
    const weekStart = getWeekStart(currentDate);
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const day = String(weekStart.getDate()).padStart(2, '0');
    input.value = `${year}-${month}-${day}`;
  }
}

function populateDefaultAllergens() {
    PREDEFINED_ALLERGENS.forEach(def => {
        if (!allergens.find(a => a.id === def.id)) {
            allergens.push({
                id: def.id,
                name: def.name, 
                color: def.color,
                isSystem: true
            });
        }
    });
    saveData();
    renderAllergens();
}

function getAllergenName(allergen) {
    if (allergen.isSystem) {
        const def = PREDEFINED_ALLERGENS.find(d => d.id === allergen.id);
        if (def) {
            return currentLanguage === 'bg' ? def.name_bg : def.name;
        }
    }
    return allergen.name;
}

// Update select dropdowns (ingredients, allergens, category)
function updateSelects() {
  const ingredientSelect = document.getElementById('ingredientSelect');
  const allergenSelect = document.getElementById('allergenSelect');
  const catSelect = document.getElementById('recipeCategory');
  const ingAllSelect = document.getElementById('ingredientAllergenSelect');
  
  if (ingredientSelect) {
    ingredientSelect.innerHTML = `<option value="">${t('select_ingredient')}</option>` + 
      ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  }
  
  if (allergenSelect) {
    allergenSelect.innerHTML = `<option value="">${t('select_allergen')}</option>` + 
      allergens.map(a => `<option value="${a.id}">${getAllergenName(a)}</option>`).join('');
  }
  
  if (ingAllSelect) {
      ingAllSelect.innerHTML = `<option value="">${t('select_allergen')}</option>` + 
      allergens.map(a => `<option value="${a.id}">${getAllergenName(a)}</option>`).join('');
  }

  if (catSelect) {
    const currentValue = catSelect.value;
    catSelect.innerHTML = `
      <option value="">${t('category_select')}</option>
      <option value="soup">${t('category_soup')}</option>
      <option value="main">${t('category_main')}</option>
      <option value="dessert">${t('category_dessert')}</option>
      <option value="other">${t('category_other')}</option>
    `;
    catSelect.value = currentValue;
  }
}

// Day selector for printing
function togglePrintDay(dayIndex) {
  const idx = selectedPrintDays.indexOf(dayIndex);
  if (idx > -1) selectedPrintDays.splice(idx, 1);
  else selectedPrintDays.push(dayIndex);
  selectedPrintDays.sort((a, b) => a - b);
  updatePrintDayButtons();
  updateTemplatePreview();
}

function updatePrintDayButtons() {
  for (let i = 0; i <= 6; i++) {
    const btn = document.getElementById(`printDay${i}`);
    if (btn) {
      if (selectedPrintDays.includes(i)) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  }
}

// Print menu (fixed)
function printMenu() {
  // If selectedPrintDays is empty, maybe default to Mon-Fri (1-5) or 0-6
  // But let's check
  let daysToPrint = selectedPrintDays;
  if (daysToPrint.length === 0) {
      // If user hasn't selected any, assume all week? Or prompt?
      // Let's assume Mon-Fri if empty, for safety
      daysToPrint = [1, 2, 3, 4, 5];
  }

  const weekStart = getWeekStart(currentDate);
  const locale = currentLanguage === 'bg' ? 'bg-BG' : 'en-US';

  const selectedDates = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const weekday = day.getDay();
    if (daysToPrint.includes(weekday)) selectedDates.push(day);
  }
  
  if (!selectedDates.length) {
    alert(t('alert_select_days'));
    return;
  }

  const firstDate = selectedDates[0];
  const lastDate = selectedDates[selectedDates.length - 1];

  const title = `${firstDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })} - ${lastDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })} ${currentLanguage === 'bg' ? 'Меню' : 'Menu'}`;
  const dateRange = `${firstDate.toLocaleDateString(locale)} - ${lastDate.toLocaleDateString(locale)}`;

  let recipesHtml = '<div>';

  selectedDates.forEach(day => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const dayMenu = currentMenu[dateStr];
    if (!dayMenu || !Object.keys(dayMenu).length) return;
    const hasAny = Object.values(dayMenu).some(slot => slot && slot.recipe);
    if (!hasAny) return;

    recipesHtml += `<h3 style="font-size:1.1rem;margin:0.7rem 0 0.4rem 0;color:#21808d;border-bottom:2px solid #21808d;padding-bottom:0.3rem;">${day.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>`;
    recipesHtml += '<div style="margin-left:0.5rem;font-size:0.9rem;">';

    const soupSlots = [];
    const mainSlots = [];
    const dessertSlots = [];
    const otherSlots = [];

    Object.keys(dayMenu).forEach(slotId => {
      const slotData = dayMenu[slotId];
      if (!slotData || !slotData.recipe) return;
      const recipe = recipes.find(r => r.id === slotData.recipe);
      if (!recipe) return;
      const item = { recipe, slotData };
      if (slotData.type === 'soup') soupSlots.push(item);
      else if (slotData.type === 'main') mainSlots.push(item);
      else if (slotData.type === 'dessert') dessertSlots.push(item);
      else otherSlots.push(item);
    });

    function renderGroup(label, icon, list) {
      if (!list.length) return '';
      let html = `<div style="margin-bottom:0.5rem;"><strong style="color:#666;">${icon} ${label}:</strong>`;
      list.forEach(item => {
        html += `<p style="margin:0.2rem 0 0.2rem 1rem;">${item.recipe.name}`;
        if (item.recipe.allergens && item.recipe.allergens.length) {
          // map allergen IDs to names
          const algNames = item.recipe.allergens.map(a => {
             // 'a' might be object or ID depending on how it's stored. 
             // In recipe objects, it's typically {id, name}.
             return a.name;
          }).join(', ');
          html += ` <em style="font-size:0.75rem;color:#c00;">(${algNames})</em>`;
        }
        html += '</p>';
      });
      html += '</div>';
      return html;
    }

    recipesHtml += renderGroup('Soups', '🥣', soupSlots);
    recipesHtml += renderGroup('Main Dishes', '🍽️', mainSlots);
    recipesHtml += renderGroup('Desserts', '🍰', dessertSlots);
    recipesHtml += renderGroup('Other', '➕', otherSlots);

    recipesHtml += '</div>';
  });

  recipesHtml += '</div>';

  const printContent = printTemplate
    .replace(/{title}/g, title)
    .replace(/{dateRange}/g, dateRange)
    .replace(/{recipes}/g, recipesHtml)
    .replace(/{labelMenuFor}/g, t('label_menu_for'));

  const layoutStyles = getLayoutStyles();
  const bgStyle = templateBackgroundImage
    ? `background-image: url('${templateBackgroundImage}'); background-size: cover; background-position: center;`
    : '';

  const win = window.open('', '', 'width=800,height=600');
  win.document.write(`
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 1cm; }
        body {
          font-family: Arial, sans-serif;
          padding: 0.5rem;
          max-width: ${layoutStyles.maxWidth};
          margin: 0 auto;
          font-size: 10pt;
          ${bgStyle}
        }
        ${layoutStyles.css}
        h1 {
          color: #21808d;
          font-size: 1.5rem;
          margin: 0 0 0.5rem 0;
        }
        h3 {
          margin-top: 0.7rem;
          color: #21808d;
          border-bottom: 2px solid #21808d;
          padding-bottom: 0.3rem;
          font-size: 1.1rem;
        }
        p {
          margin: 0.2rem 0;
          font-size: 0.9rem;
        }
        em {
          color: #c00;
          font-weight: 500;
          font-size: 0.75rem;
        }
        strong {
          color: #666;
        }
      </style>
    </head>
    <body${templateLayout !== 'default' ? ' class="' + templateLayout + '"' : ''}>
      ${printContent}
    </body>
    </html>
  `);
  win.document.close();
  // Wait for images if any
  setTimeout(() => {
      win.print();
  }, 500);
}

// Calendar and menu planning (simplified core)
function ensureDefaultSlots(dateStr) {
  if (!currentMenu[dateStr]) currentMenu[dateStr] = {};
  DEFAULT_SLOTS.forEach(slotType => {
    if (!currentMenu[dateStr][slotType]) {
      currentMenu[dateStr][slotType] = { type: slotType, recipe: null };
    }
  });
}


function toggleView(mode) {
  viewMode = mode;
  localStorage.setItem('calendarViewMode', mode);
  renderCalendar();
}

function changeMonth(delta) {
  if (viewMode === 'week') {
      currentDate.setDate(currentDate.getDate() + (delta * 7));
  } else {
      currentDate.setMonth(currentDate.getMonth() + delta);
  }
  updatePrintDatePicker();
  renderCalendar();
}

function getCategoryColor(cat) {
  switch(cat) {
      case 'soup': return '#e67e22';
      case 'main': return '#27ae60';
      case 'dessert': return '#9b59b6';
      default: return '#7f8c8d';
  }
}

function renderCalendar() {
  const calendarEl = document.getElementById('calendar');
  const currentMonthEl = document.getElementById('currentMonth');
  if (!calendarEl) return;

  calendarEl.innerHTML = '';

  // Update header title
  if (currentMonthEl) {
      const options = { month: 'long', year: 'numeric' };
      if (viewMode === 'week') {
          const weekStart = getWeekStart(currentDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (weekStart.getMonth() === weekEnd.getMonth()) {
              currentMonthEl.textContent = weekStart.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', options);
          } else {
              const m1 = weekStart.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { month: 'short' });
              const m2 = weekEnd.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { month: 'short', year: 'numeric' });
              currentMonthEl.textContent = `${m1} - ${m2}`;
          }
      } else {
          currentMonthEl.textContent = currentDate.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', options);
      }
  }

  if (viewMode === 'week') {
    calendarEl.className = 'week-view';
    const weekStart = getWeekStart(currentDate);

    // Let's stick to the column layout for week view as it was.
    const weekDaysContainer = document.createElement('div');
    weekDaysContainer.className = 'week-days';
    weekDaysContainer.style.display = 'grid';
    weekDaysContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
    weekDaysContainer.style.gap = '10px';

    for (let i = 0; i < 7; i++) {
       const day = new Date(weekStart);
       day.setDate(weekStart.getDate() + i);
       const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
       ensureDefaultSlots(dateStr);

       const dayColumn = document.createElement('div');
       dayColumn.className = 'day-column';
       dayColumn.style.border = '1px solid #eee';
       dayColumn.style.padding = '10px';
       dayColumn.style.borderRadius = '8px';
       dayColumn.style.background = '#fff';

       const dayHeader = document.createElement('div');
       dayHeader.className = 'day-header';
       dayHeader.style.textAlign = 'center';
       dayHeader.style.fontWeight = 'bold';
       dayHeader.style.marginBottom = '10px';
       dayHeader.style.color = '#21808d';
       dayHeader.textContent = day.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

       dayColumn.appendChild(dayHeader);

       DEFAULT_SLOTS.forEach(slotType => {
           const slot = currentMenu[dateStr][slotType];
           const slotEl = renderSlot(dateStr, slotType, slot);
           dayColumn.appendChild(slotEl);
       });

       weekDaysContainer.appendChild(dayColumn);
    }
    calendarEl.appendChild(weekDaysContainer);

  } else {
    // MONTH VIEW
    calendarEl.className = 'calendar';
    
    // Headers
    DAY_NAMES.forEach((d) => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.textContent = t('day_' + d.toLowerCase().substring(0,3) + '_short');
        calendarEl.appendChild(h);
    });

    // Days logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayIndex = firstDay.getDay(); // 0-6

    // Padding
    for(let i=0; i<startDayIndex; i++) {
        const pad = document.createElement('div');
        pad.className = 'calendar-day disabled';
        calendarEl.appendChild(pad);
    }

    // Dates
    for(let i=1; i<=daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.onclick = (e) => {
             if(e.target.closest('.mini-recipe-item')) return;
             currentDate = dayDate;
             toggleView('week');
        };

        cell.innerHTML = `<h4>${i}</h4><div class="calendar-day-content"></div>`;

        const contentDiv = cell.querySelector('.calendar-day-content');
        if (currentMenu[dateStr]) {
            DEFAULT_SLOTS.forEach(slot => {
                const s = currentMenu[dateStr][slot];
                if (s && s.recipe) {
                    const r = recipes.find(x => x.id === s.recipe);
                    if (r) {
                        const badge = document.createElement('div');
                        badge.className = 'mini-recipe-item';
                        badge.textContent = r.name;
                        badge.style.backgroundColor = getCategoryColor(r.category);
                        contentDiv.appendChild(badge);
                    }
                }
            });
        }

        calendarEl.appendChild(cell);
    }
  }
}


function renderSlot(dateStr, slotType, slotData) {
  const slotEl = document.createElement('div');
  slotEl.className = 'menu-slot';
  slotEl.dataset.date = dateStr;
  slotEl.dataset.slot = slotType;
  slotEl.style.marginBottom = '10px';

  const label = document.createElement('div');
  label.className = 'menu-slot-label';
  label.style.fontSize = '0.85rem';
  label.style.fontWeight = '600';
  label.style.color = '#7f8c8d';
  label.textContent = t(`slot_${slotType}`) || slotType;

  const select = document.createElement('select');
  select.className = 'menu-slot-select';
  select.style.width = '100%';
  select.style.padding = '5px';
  select.style.fontSize = '0.9rem';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = t('select_recipe');
  select.appendChild(emptyOption);

  recipes.forEach(r => {
    const option = document.createElement('option');
    option.value = r.id;
    option.textContent = r.name;
    if (slotData && slotData.recipe === r.id) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    if (!currentMenu[dateStr]) currentMenu[dateStr] = {};
    if (!currentMenu[dateStr][slotType]) currentMenu[dateStr][slotType] = { type: slotType, recipe: null };
    currentMenu[dateStr][slotType].recipe = select.value || null;
    saveData();
  });

  slotEl.appendChild(label);
  slotEl.appendChild(select);

  return slotEl;
}

// Recipes CRUD
function openRecipeModal(id = null) {
  editingRecipeId = id;
  const modal = document.getElementById('recipeModal');
  const title = document.getElementById('recipeModalTitle');
  const form = document.getElementById('recipeForm');
  
  document.getElementById('recipeAutoAllergens').innerHTML = '';

  if (id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    title.textContent = t('modal_edit_recipe');
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('recipeCategory').value = recipe.category;
    document.getElementById('recipePortionSize').value = recipe.portionSize || '';
    document.getElementById('recipeInstructions').value = recipe.instructions || '';
    
    // Manual Allergens
    renderTags('recipeManualAllergens', recipe.manualAllergens || [], removeManualAllergenFromRecipe);
    form.dataset.tempManualAllergens = JSON.stringify(recipe.manualAllergens || []);
    
    // Ingredients
    renderTags('recipeIngredients', recipe.ingredients, removeIngredientFromRecipe);
    form.dataset.tempIngredients = JSON.stringify(recipe.ingredients);
    
    updateAutoAllergensDisplay();
    
  } else {
    title.textContent = t('modal_add_recipe');
    form.reset();
    document.getElementById('recipeIngredients').innerHTML = '';
    document.getElementById('recipeManualAllergens').innerHTML = '';
    form.dataset.tempIngredients = '[]';
    form.dataset.tempManualAllergens = '[]';
  }
  
  modal.style.display = 'block';
}

function closeRecipeModal() {
  document.getElementById('recipeModal').style.display = 'none';
  editingRecipeId = null;
}

function updateAutoAllergensDisplay() {
    const form = document.getElementById('recipeForm');
    const ingredientsList = JSON.parse(form.dataset.tempIngredients || '[]');
    const autoContainer = document.getElementById('recipeAutoAllergens');
    autoContainer.innerHTML = '';
    
    // Collect unique allergens from ingredients
    const autoIds = new Set();
    const autoAllergens = [];
    
    ingredientsList.forEach(ing => {
        const fullIng = ingredients.find(i => i.id === ing.id);
        if (fullIng && fullIng.allergens) {
            fullIng.allergens.forEach(algId => {
                if (!autoIds.has(algId)) {
                    autoIds.add(algId);
                    const fullAlg = allergens.find(a => a.id === algId);
                    if (fullAlg) autoAllergens.push(fullAlg);
                }
            });
        }
    });

    if (autoAllergens.length === 0) {
        autoContainer.textContent = '-';
        return;
    }

    autoAllergens.forEach(alg => {
        const tag = document.createElement('span');
        tag.className = 'tag allergen';
        tag.textContent = getAllergenName(alg);
        tag.style.backgroundColor = alg.color + '20'; // light bg
        tag.style.borderColor = alg.color;
        autoContainer.appendChild(tag);
    });
}

function saveRecipe(event) {
  event.preventDefault();
  const name = document.getElementById('recipeName').value;
  const category = document.getElementById('recipeCategory').value;
  const portionSize = document.getElementById('recipePortionSize').value;
  const instructions = document.getElementById('recipeInstructions').value;
  const form = document.getElementById('recipeForm');
  const ingredientsList = JSON.parse(form.dataset.tempIngredients || '[]');
  const manualAllergensList = JSON.parse(form.dataset.tempManualAllergens || '[]');

  const recipeData = {
      id: editingRecipeId || Date.now().toString(),
      name,
      category,
      portionSize,
      instructions,
      ingredients: ingredientsList,
      manualAllergens: manualAllergensList
  };

  if (editingRecipeId) {
    const index = recipes.findIndex(r => r.id === editingRecipeId);
    recipes[index] = recipeData;
  } else {
    recipes.push(recipeData);
  }

  saveData();
  renderRecipes();
  closeRecipeModal();
}

function addIngredientToRecipe() {
  const select = document.getElementById('ingredientSelect');
  const id = select.value;
  if (!id) return;
  const ingredient = ingredients.find(i => i.id === id);
  const form = document.getElementById('recipeForm');
  const list = JSON.parse(form.dataset.tempIngredients || '[]');
  
  if (!list.find(i => i.id === id)) {
    list.push({ id: ingredient.id, name: ingredient.name });
    form.dataset.tempIngredients = JSON.stringify(list);
    renderTags('recipeIngredients', list, removeIngredientFromRecipe);
    updateAutoAllergensDisplay();
  }
  select.value = '';
}

function removeIngredientFromRecipe(id) {
  const form = document.getElementById('recipeForm');
  let list = JSON.parse(form.dataset.tempIngredients || '[]');
  list = list.filter(i => i.id !== id);
  form.dataset.tempIngredients = JSON.stringify(list);
  renderTags('recipeIngredients', list, removeIngredientFromRecipe);
  updateAutoAllergensDisplay();
}

function addManualAllergenToRecipe() {
  const select = document.getElementById('allergenSelect');
  const id = select.value;
  if (!id) return;
  const allergen = allergens.find(a => a.id === id);
  const form = document.getElementById('recipeForm');
  const list = JSON.parse(form.dataset.tempManualAllergens || '[]');
  
  if (!list.find(a => a.id === id)) {
    list.push({ id: allergen.id, name: getAllergenName(allergen) }); 
    form.dataset.tempManualAllergens = JSON.stringify(list);
    renderTags('recipeManualAllergens', list, removeManualAllergenFromRecipe);
  }
  select.value = '';
}

function removeManualAllergenFromRecipe(id) {
  const form = document.getElementById('recipeForm');
  let list = JSON.parse(form.dataset.tempManualAllergens || '[]');
  list = list.filter(a => a.id !== id);
  form.dataset.tempManualAllergens = JSON.stringify(list);
  renderTags('recipeManualAllergens', list, removeManualAllergenFromRecipe);
}

// Ingredients
let editingIngredientId = null;

function openIngredientModal(id = null) {
  editingIngredientId = id;
  const modal = document.getElementById('ingredientModal');
  const title = modal.querySelector('h2');
  const nameInput = document.getElementById('ingredientName');
  const container = document.getElementById('ingredientLinkedAllergens');
  const form = document.getElementById('ingredientForm');

  container.innerHTML = '';
  
  if (id) {
      const ing = ingredients.find(i => i.id === id);
      title.textContent = t('modal_edit_ingredient');
      nameInput.value = ing.name;
      form.dataset.linkedAllergens = JSON.stringify(ing.allergens || []);
  } else {
      title.textContent = t('modal_add_ingredient');
      nameInput.value = '';
      form.dataset.linkedAllergens = '[]';
  }
  
  updateLinkedAllergensDisplay();
  modal.style.display = 'block';
  nameInput.focus();
}

function closeIngredientModal() {
  document.getElementById('ingredientModal').style.display = 'none';
  editingIngredientId = null;
}

function addLinkedAllergen() {
    const select = document.getElementById('ingredientAllergenSelect');
    const id = select.value;
    if (!id) return;
    
    const form = document.getElementById('ingredientForm');
    const list = JSON.parse(form.dataset.linkedAllergens || '[]');
    
    if (!list.includes(id)) {
        list.push(id);
        form.dataset.linkedAllergens = JSON.stringify(list);
        updateLinkedAllergensDisplay();
    }
    select.value = '';
}

function removeLinkedAllergen(id) {
    const form = document.getElementById('ingredientForm');
    let list = JSON.parse(form.dataset.linkedAllergens || '[]');
    list = list.filter(aid => aid !== id);
    form.dataset.linkedAllergens = JSON.stringify(list);
    updateLinkedAllergensDisplay();
}

function updateLinkedAllergensDisplay() {
    const form = document.getElementById('ingredientForm');
    const list = JSON.parse(form.dataset.linkedAllergens || '[]');
    const container = document.getElementById('ingredientLinkedAllergens');
    container.innerHTML = '';
    
    list.forEach(id => {
        const alg = allergens.find(a => a.id === id);
        if (alg) {
            const tag = document.createElement('span');
            tag.className = 'tag allergen';
            tag.textContent = getAllergenName(alg);
            tag.style.borderColor = alg.color;
            
            const btn = document.createElement('button');
            btn.innerHTML = '&times;';
            btn.onclick = () => removeLinkedAllergen(id);
            tag.appendChild(btn);
            container.appendChild(tag);
        }
    });
}

function saveIngredient(event) {
  event.preventDefault();
  const nameInput = document.getElementById('ingredientName');
  const name = nameInput.value.trim();
  if (!name) return;
  
  const form = document.getElementById('ingredientForm');
  const linked = JSON.parse(form.dataset.linkedAllergens || '[]');
  
  if (editingIngredientId) {
      const idx = ingredients.findIndex(i => i.id === editingIngredientId);
      ingredients[idx] = { ...ingredients[idx], name, allergens: linked };
  } else {
      ingredients.push({ id: Date.now().toString(), name, allergens: linked });
  }

  saveData();
  renderIngredients();
  updateSelects(); 
  closeIngredientModal();
}

function deleteIngredient(id) {
  if (!confirm(t('alert_delete_ingredient'))) return;
  ingredients = ingredients.filter(i => i.id !== id);
  recipes.forEach(r => {
    r.ingredients = r.ingredients.filter(ing => ing.id !== id);
  });
  saveData();
  renderIngredients();
  renderRecipes();
  updateSelects();
}

function renderIngredients() {
  const list = document.getElementById('ingredientList');
  if (!list) return;
  list.innerHTML = '';

  if (!ingredients.length) {
    list.innerHTML = `<div class="empty-state">${t('empty_ingredients')}</div>`;
    return;
  }

  ingredients.forEach(ing => {
    const item = document.createElement('div');
    item.className = 'item-card';
    item.style.padding = '1rem';
    
    let tags = '';
    if (ing.allergens && ing.allergens.length) {
        tags = '<div class="tag-container" style="margin-top:0.5rem;font-size:0.8em;">' + 
            ing.allergens.map(aid => {
                const a = allergens.find(x => x.id === aid);
                return a ? `<span class="tag allergen" style="border-color:${a.color};background:${a.color}15">${getAllergenName(a)}</span>` : '';
            }).join('') + '</div>';
    }

    item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
                <strong>${ing.name}</strong>
                ${tags}
            </div>
            <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-small btn-secondary" onclick="openIngredientModal('${ing.id}')">${t('btn_edit')}</button>
                <button class="btn btn-small btn-danger" onclick="deleteIngredient('${ing.id}')">${t('btn_delete')}</button>
            </div>
        </div>
    `;
    list.appendChild(item);
  });
}

// Allergens
let editingAllergenId = null;

function openAllergenModal(id = null) {
  editingAllergenId = id;
  const modal = document.getElementById('allergenModal');
  const title = modal.querySelector('h2');
  const nameInput = document.getElementById('allergenName');
  const colorInput = document.getElementById('allergenColor');
  
  if (id) {
      const alg = allergens.find(a => a.id === id);
      title.textContent = t('modal_edit_allergen');
      nameInput.value = alg.name;
      colorInput.value = alg.color || '#000000';
  } else {
      title.textContent = t('modal_add_allergen');
      nameInput.value = '';
      colorInput.value = '#000000';
  }
  
  modal.style.display = 'block';
  nameInput.focus();
}

function closeAllergenModal() {
  document.getElementById('allergenModal').style.display = 'none';
  editingAllergenId = null;
}

function saveAllergen(event) {
  event.preventDefault();
  const nameInput = document.getElementById('allergenName');
  const colorInput = document.getElementById('allergenColor');
  const name = nameInput.value.trim();
  if (!name) return;
  
  if (editingAllergenId) {
      const idx = allergens.findIndex(a => a.id === editingAllergenId);
      allergens[idx] = { ...allergens[idx], name, color: colorInput.value };
  } else {
      allergens.push({ id: Date.now().toString(), name, color: colorInput.value, isSystem: false });
  }

  saveData();
  renderAllergens();
  updateSelects();
  closeAllergenModal();
}

function deleteAllergen(id) {
  if (!confirm(t('alert_delete_allergen'))) return;
  allergens = allergens.filter(a => a.id !== id);
  // Cleanup references
  ingredients.forEach(i => {
      if (i.allergens) i.allergens = i.allergens.filter(aid => aid !== id);
  });
  recipes.forEach(r => {
      if (r.manualAllergens) r.manualAllergens = r.manualAllergens.filter(a => a.id !== id);
  });
  
  saveData();
  renderAllergens();
  renderIngredients();
  renderRecipes();
  updateSelects();
}

function renderAllergens() {
  const list = document.getElementById('allergenList');
  if (!list) return;
  list.innerHTML = '';

  const headerDiv = document.createElement('div');
  headerDiv.style.gridColumn = '1 / -1';
  headerDiv.style.marginBottom = '1rem';
  headerDiv.innerHTML = `<button class="btn btn-secondary btn-small" onclick="populateDefaultAllergens()">${t('btn_populate_allergens')}</button>`;
  list.appendChild(headerDiv);

  if (!allergens.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('empty_allergens');
    list.appendChild(empty);
    return;
  }

  allergens.forEach(al => {
    const item = document.createElement('div');
    item.className = 'item-card';
    item.style.padding = '1rem';
    item.style.borderLeft = `5px solid ${al.color}`;
    
    const displayName = getAllergenName(al);

    item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${displayName}</strong>
            <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-small btn-secondary" onclick="openAllergenModal('${al.id}')">${t('btn_edit')}</button>
                <button class="btn btn-small btn-danger" onclick="deleteAllergen('${al.id}')">${t('btn_delete')}</button>
            </div>
        </div>
    `;
    list.appendChild(item);
  });
}

function getRecipeAllergens(recipe) {
    const all = new Set();
    const result = [];
    
    // Auto from ingredients
    if (recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
            const fullIng = ingredients.find(i => i.id === ing.id);
            if (fullIng && fullIng.allergens) {
                fullIng.allergens.forEach(aid => all.add(aid));
            }
        });
    }
    
    // Manual
    if (recipe.manualAllergens) {
        recipe.manualAllergens.forEach(ma => all.add(ma.id));
    }
    
    all.forEach(id => {
        const alg = allergens.find(a => a.id === id);
        if (alg) result.push(alg);
    });
    
    return result;
}

function renderTags(containerId, items, removeCallback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const tag = document.createElement('span');
    const isAllergen = containerId.includes('Allergen');
    tag.className = 'tag' + (isAllergen ? ' allergen' : '');
    
    let displayText = item.name;
    if (isAllergen && item.id) {
        const fresh = allergens.find(a => a.id === item.id);
        if (fresh) {
            displayText = getAllergenName(fresh);
            tag.style.borderColor = fresh.color;
        }
    }

    tag.textContent = displayText;
    const btn = document.createElement('button');
    btn.innerHTML = '&times;';
    btn.onclick = () => removeCallback(item.id);
    tag.appendChild(btn);
    container.appendChild(tag);
  });
}

function renderRecipes() {
  const grid = document.getElementById('recipeList');
  if (!grid) return;
  grid.innerHTML = '';

  if (recipes.length === 0) {
    grid.innerHTML = `<div class="empty-state">${t('empty_recipes')}</div>`;
    return;
  }

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = (e) => {
      if (!e.target.closest('button')) openRecipeModal(recipe.id);
    };

    const recipeAllergens = getRecipeAllergens(recipe);
    let allergensHtml = '';
    if (recipeAllergens.length > 0) {
      allergensHtml = `<div class="tag-container" style="margin-top:0.5rem;">
        ${recipeAllergens.map(a => `<span class="tag allergen" style="border-color:${a.color};background:${a.color}15">${getAllergenName(a)}</span>`).join('')}
      </div>`;
    }

    card.innerHTML = `
      <h3>
        <span class="category-badge category-${recipe.category || 'other'}">
          ${getCategoryIcon(recipe.category)}
        </span>
        ${recipe.name}
      </h3>
      <p style="color:var(--color-text-secondary);font-size:0.9rem;">${recipe.portionSize || ''}</p>
      ${allergensHtml}
      <div class="actions">
        <button class="btn btn-small btn-secondary" onclick="openRecipeModal('${recipe.id}')">${t('btn_edit')}</button>
        <button class="btn btn-small btn-danger" onclick="deleteRecipe('${recipe.id}')">${t('btn_delete')}</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function deleteRecipe(id) {
  if (confirm(t('alert_delete_recipe'))) {
    recipes = recipes.filter(r => r.id !== id);
    saveData();
    renderRecipes();
  }
}

// Menu history
function saveCurrentMenu() {
  const dates = Object.keys(currentMenu);
  const hasRecipes = dates.some(date =>
    Object.values(currentMenu[date]).some(slot => slot && slot.recipe)
  );
  if (!hasRecipes) {
    alert(t('alert_no_menu_to_save'));
    return;
  }
  const id = Date.now().toString();
  const name = `${t('week_of')} ${getWeekStart(currentDate).toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US')}`;
  menuHistory.push({
    id,
    name,
    date: new Date().toISOString(),
    menu: JSON.parse(JSON.stringify(currentMenu))
  });
  saveData();
  renderMenuHistory();
  alert(t('alert_menu_saved'));
}

function loadSavedMenu(id) {
  const entry = menuHistory.find(m => m.id === id);
  if (!entry) return;
  currentMenu = JSON.parse(JSON.stringify(entry.menu));
  saveData();
  renderCalendar();
  alert(t('alert_menu_loaded'));
}

function deleteSavedMenu(id) {
  if (!confirm(t('alert_delete_menu'))) return;
  menuHistory = menuHistory.filter(m => m.id !== id);
  saveData();
  renderMenuHistory();
}

function renderMenuHistory() {
  const list = document.getElementById('menuHistory');
  if (!list) return;
  list.innerHTML = '';

  if (!menuHistory.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('empty_menus');
    list.appendChild(empty);
    return;
  }

  menuHistory.forEach(m => {
    const item = document.createElement('div');
    item.className = 'menu-history-item';

    const name = document.createElement('div');
    name.className = 'menu-history-name';
    name.textContent = m.name;

    const date = document.createElement('div');
    date.className = 'menu-history-date';
    date.textContent = new Date(m.date).toLocaleString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US');

    const actions = document.createElement('div');
    actions.className = 'menu-history-actions';

    const loadBtn = document.createElement('button');
    loadBtn.textContent = t('btn_load');
    loadBtn.addEventListener('click', () => loadSavedMenu(m.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = t('btn_delete');
    deleteBtn.addEventListener('click', () => deleteSavedMenu(m.id));

    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(name);
    item.appendChild(date);
    item.appendChild(actions);

    list.appendChild(item);
  });
}

// Template editor helpers
function initSummernote() {
  if (!window.$ || !window.$.fn || !window.$.fn.summernote) return;
  const $editor = window.$('#templateEditor');
  $editor.summernote({
    height: 200,
    callbacks: {
      onChange: function (contents) {
        printTemplate = contents;
        saveData();
        updateTemplatePreview();
      }
    }
  });
  $editor.summernote('code', printTemplate);
  updateTemplatePreview();
}

function insertVariable(variable) {
  if (window.$ && window.$('#templateEditor').summernote) {
    window.$('#templateEditor').summernote('pasteHTML', variable);
  } else {
    printTemplate += variable;
    saveData();
    updateTemplatePreview();
  }
}

function saveTemplate() {
  if (window.$ && window.$('#templateEditor').summernote) {
    printTemplate = window.$('#templateEditor').summernote('code');
  }
  saveData();
  alert(t('alert_template_saved'));
}

function uploadBackgroundImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    templateBackgroundImage = e.target.result;
    localStorage.setItem('templateBackgroundImage', templateBackgroundImage);
    updateTemplatePreview();
  };
  reader.readAsDataURL(file);
}

function removeBackgroundImage() {
  templateBackgroundImage = '';
  localStorage.removeItem('templateBackgroundImage');
  updateTemplatePreview();
}

function setLayout(layout) {
  templateLayout = layout;
  localStorage.setItem('templateLayout', templateLayout);
  updateLayoutButtons();
  updateTemplatePreview();
}

function updateLayoutButtons() {
  const layouts = ['default', 'columns', 'centered', 'grid'];
  layouts.forEach(l => {
    const btn = document.getElementById(`layout_${l}`);
    if (btn) {
      if (l === templateLayout) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

function getLayoutStyles() {
  if (templateLayout === 'columns') {
    return {
      maxWidth: '1000px',
      css: `
        body.columns {
          column-count: 2;
          column-gap: 2rem;
        }
      `
    };
  }
  if (templateLayout === 'centered') {
    return {
      maxWidth: '700px',
      css: `
        body.centered {
          text-align: center;
        }
        body.centered h3 {
          text-align: center;
        }
        .print-day {
          text-align: center;
        }
      `
    };
  }
  if (templateLayout === 'grid') {
    return {
      maxWidth: '100%',
      css: `
        @page { size: landscape; margin: 0.5cm; }
        .print-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          width: 100%;
        }
        .print-day {
          border: 1px solid #ddd;
          padding: 10px;
          height: 100%;
          background: #fff;
          page-break-inside: avoid;
        }
        .print-day h3 {
          margin-top: 0;
          font-size: 1.1em;
          text-align: center;
          border-bottom: 2px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
          color: #21808d;
        }
        .print-slot {
          margin-bottom: 8px;
          font-size: 0.9em;
        }
      `
    };
  }
  return {
    maxWidth: '900px',
    css: ''
  };
}

function updateTemplatePreview() {
  const preview = document.getElementById('templatePreview');
  if (!preview) return;

  const weekStart = getWeekStart(currentDate);
  const locale = currentLanguage === 'bg' ? 'bg-BG' : 'en-US';

  const daysToShow = templateLayout === 'grid' ? 5 : 2;
  const previewDates = [];
  for (let i = 0; i < daysToShow; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + (i + 1)); 
    previewDates.push(day);
  }

  const firstDate = previewDates[0];
  const lastDate = previewDates[previewDates.length - 1];

  const title = `${firstDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })} - ${lastDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })} ${currentLanguage === 'bg' ? 'Меню' : 'Menu'}`;
  const dateRange = `${firstDate.toLocaleDateString(locale)} - ${lastDate.toLocaleDateString(locale)}`;

  let recipesHtml = '<div class="print-grid">';
  previewDates.forEach(day => {
    recipesHtml += `<div class="print-day">
      <h3>${day.toLocaleDateString(locale, { weekday: 'long' })}</h3>`;
    recipesHtml += `<div class="print-slot"><strong>${t('slot_soup')}:</strong> Sample Soup</div>`;
    recipesHtml += `<div class="print-slot"><strong>${t('slot_main')}:</strong> Sample Main</div>`;
    recipesHtml += '</div>';
  });
  recipesHtml += '</div>';

  const styles = getLayoutStyles();
  
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles.css;
  
  const html = printTemplate
    .replace(/{title}/g, title)
    .replace(/{dateRange}/g, dateRange)
    .replace(/{recipes}/g, recipesHtml)
    .replace(/{labelMenuFor}/g, t('label_menu_for'));

  preview.innerHTML = html;
  if (templateLayout === 'grid') {
     preview.style.display = 'block'; 
  }
}

// Export/import (JSON)
function exportData() {
  const data = {
    recipes,
    ingredients,
    allergens,
    currentMenu,
    menuHistory,
    printTemplate,
    currentLanguage,
    templateBackgroundImage,
    templateLayout
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'recipe_data.json';
  a.click();

  URL.revokeObjectURL(url);
  closeSyncDropdown();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      recipes = data.recipes || [];
      ingredients = data.ingredients || [];
      allergens = data.allergens || [];
      currentMenu = data.currentMenu || {};
      menuHistory = data.menuHistory || [];
      printTemplate = data.printTemplate || printTemplate;
      currentLanguage = data.currentLanguage || currentLanguage;
      templateBackgroundImage = data.templateBackgroundImage || '';
      templateLayout = data.templateLayout || 'default';
      
      localStorage.setItem('recipeManagerLang', currentLanguage);
      localStorage.setItem('templateBackgroundImage', templateBackgroundImage);
      localStorage.setItem('templateLayout', templateLayout);

      saveData();
      renderAll();
      alert(t('alert_import_success'));
    } catch (err) {
      alert(t('alert_import_error') + err.message);
    }
  };
  reader.readAsText(file);
  closeSyncDropdown();
}

// Language
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('recipeManagerLang', lang);
  saveData();
  applyTranslations();
}

// Navigation
function bindNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const page = document.getElementById(btn.dataset.page);
      if (page) page.classList.add('active');
    });
  });
}

// Init
async function init() {
  bindNavigation(); // Ensure tabs work immediately
  
  await initDB();
  await autoLoadOnStartup();

  templateBackgroundImage = localStorage.getItem('templateBackgroundImage') || '';
  templateLayout = localStorage.getItem('templateLayout') || 'default';

  const langSel = document.getElementById('languageSelect');
  if (langSel) {
    langSel.value = currentLanguage;
    langSel.addEventListener('change', (e) => changeLanguage(e.target.value));
  }
  
  // Render everything initial
  renderAll();

  // Attach event listeners
  const uploadBgInput = document.getElementById('uploadBgInput');
  const removeBgBtn = document.getElementById('removeBgBtn');
  const layoutDefaultBtn = document.getElementById('layout_default');
  const layoutColumnsBtn = document.getElementById('layout_columns');
  const layoutCenteredBtn = document.getElementById('layout_centered');
  const layoutGridBtn = document.getElementById('layout_grid');
  const printStartDateInput = document.getElementById('printStartDate');
  const importInput = document.getElementById('importInput');

  if (uploadBgInput) uploadBgInput.addEventListener('change', uploadBackgroundImage);
  if (removeBgBtn) removeBgBtn.addEventListener('click', removeBackgroundImage);
  if (layoutDefaultBtn) layoutDefaultBtn.addEventListener('click', () => setLayout('default'));
  if (layoutColumnsBtn) layoutColumnsBtn.addEventListener('click', () => setLayout('columns'));
  if (layoutCenteredBtn) layoutCenteredBtn.addEventListener('click', () => setLayout('centered'));
  if (layoutGridBtn) layoutGridBtn.addEventListener('click', () => setLayout('grid'));
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

function renderAll() {
  updateSelects();
  renderRecipes();
  renderIngredients();
  renderAllergens();
  renderCalendar(); // THIS IS CRITICAL
  renderMenuHistory();
  updateTemplatePreview();
  updatePrintDatePicker();
  updateLayoutButtons();
  applyTranslations();
}

window.addEventListener('DOMContentLoaded', init);

// Expose functions globally for HTML onclick attributes
window.openRecipeModal = openRecipeModal;
window.closeRecipeModal = closeRecipeModal;
window.saveRecipe = saveRecipe;
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
window.setLayout = setLayout;
window.insertVariable = insertVariable;
window.uploadBackgroundImage = uploadBackgroundImage;
window.removeBackgroundImage = removeBackgroundImage;
window.addRecipeToMenu = addRecipeToMenu; // Unused but safe to keep if referenced
window.removeRecipeFromMenu = removeRecipeFromMenu; // Unused
window.addIngredientToRecipe = addIngredientToRecipe;
window.addManualAllergenToRecipe = addManualAllergenToRecipe;
window.removeManualAllergenFromRecipe = removeManualAllergenFromRecipe;
window.addLinkedAllergen = addLinkedAllergen;
window.removeLinkedAllergen = removeLinkedAllergen;
window.deleteRecipe = deleteRecipe;
window.deleteIngredient = deleteIngredient;
window.deleteAllergen = deleteAllergen;
window.deleteSavedMenu = deleteSavedMenu;
window.loadSavedMenu = loadSavedMenu;
window.saveCurrentMenu = saveCurrentMenu;
window.toggleSyncDropdown = toggleSyncDropdown;
window.populateDefaultAllergens = populateDefaultAllergens;
window.updatePrintDatePicker = updatePrintDatePicker;
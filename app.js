// Recipe Manager Application - Sync Dropdown + Detailed Month View + Smart Allergens

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

const DB_NAME = 'RecipeManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';
let db = null;

const DEFAULT_SLOTS = ['soup', 'main', 'dessert', 'other'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Predefined Allergens (EU Top 14 + Common)
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
    btn_print: '🖨️ Print Menu',
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

    slot_soup: 'Soup',
    slot_main: 'Main',
    slot_dessert: 'Dessert',
    slot_other: 'Other',

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

    sync_connected: '🟢 Синхронизирано',
    sync_disconnected: '🟡 Локално (Local)',
    sync_error: '🔴 Грешка',

    sync_select_location: '📁 Избери папка',
    sync_save: '💾 Запази промените',
    sync_load: '📂 Зареди от папка',
    sync_export: '⬇ Експорт JSON',
    sync_import: '⬆ Импорт JSON'
  }
};

function t(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  updateSyncStatus();
  const portionInput = document.getElementById('recipePortionSize');
  if (portionInput) portionInput.placeholder = t('portion_placeholder');

  updateSelects();
  renderCalendar();
  renderMenuHistory();
  updateTemplatePreview();
  updatePrintDatePicker();
  
  // Re-render lists to update names
  renderRecipes();
  renderIngredients();
  renderAllergens();
}

// Database & File System (Unchanged)
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

async function getDirectoryHandle() {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('defaultHandle');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDirectoryHandle(handle) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, 'defaultHandle');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Data Management
async function loadData() {
  let loaded = false;
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (text) {
        parseData(text);
        loaded = true;
        updateSyncStatus('connected');
      }
    } catch (err) {
      console.error('Error loading file:', err);
      updateSyncStatus('error');
    }
  } 
  
  if (!loaded) {
    const data = localStorage.getItem('recipeManagerData');
    if (data) {
      parseData(data);
    } else {
       // First time load: populate default allergens
       populateDefaultAllergens();
    }
    updateSyncStatus('local');
  }
  updatePrintDatePicker();
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

async function saveData() {
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
  } else {
    localStorage.setItem('recipeManagerData', JSON.stringify(data));
    updateSyncStatus('local');
  }
}

// ... (Select location, manual save/load same as before)
async function selectSaveLocation() {
  if (!isFileSystemSupported) {
    alert(t('alert_file_api_unsupported'));
    return;
  }
  try {
    directoryHandle = await window.showDirectoryPicker();
    await saveDirectoryHandle(directoryHandle);
    await loadData();
    renderAll();
    alert(t('alert_data_loaded'));
  } catch (err) {
    console.error(err);
  }
  closeSyncDropdown();
}

async function autoLoadOnStartup() {
  if (isFileSystemSupported) {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        const opts = { mode: 'readwrite' };
        if ((await handle.queryPermission(opts)) === 'granted') {
          directoryHandle = handle;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
  await loadData();
}

function manualSave() {
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
    await loadData();
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

function renderAll() {
  updateSelects();
  renderRecipes();
  renderIngredients();
  renderAllergens();
  renderCalendar();
  renderMenuHistory();
  updateTemplatePreview();
  applyTranslations();
}

// --- NEW LOGIC: Allergens & Ingredients ---

function populateDefaultAllergens() {
    // Only add if not exists by ID
    PREDEFINED_ALLERGENS.forEach(def => {
        if (!allergens.find(a => a.id === def.id)) {
            // Save localized names? Or save object that supports both?
            // For simplicity, we save the English name as default, but in display we check ID.
            allergens.push({
                id: def.id,
                name: def.name, // Fallback name
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

// Recipes
function openRecipeModal(recipeId = null) {
  editingRecipeId = recipeId;
  const modal = document.getElementById('recipeModal');
  const title = document.getElementById('recipeModalTitle');
  const form = document.getElementById('recipeForm');
  
  document.getElementById('recipeAutoAllergens').innerHTML = '';

  if (recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
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
        // Need to find full ingredient object to get allergens
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
    // We store just ID and name in recipe to save space, but UI needs lookup
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
    list.push({ id: allergen.id, name: getAllergenName(allergen) }); // Save minimal info
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
  updateSelects(); // Updates ingredient select in recipe modal
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
      nameInput.value = alg.isSystem ? '' : alg.name; // Don't show name for system ones if we want them readonly? No, allow edit of custom name
      nameInput.value = alg.name; // Actually, allow renaming even system ones locally
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
  renderIngredients(); // Re-render in case tags removed
  renderRecipes();
  updateSelects();
}

function renderAllergens() {
  const list = document.getElementById('allergenList');
  if (!list) return;
  list.innerHTML = '';

  // Add Populate Button
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
    // Combine auto and manual
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
    
    // Convert IDs to objects
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
    // If it's a manual allergen item, it might have saved name, but let's try to lookup fresh name
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

// ... (renderRecipes updated to use getRecipeAllergens)
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

// ... (All other functions remain same, just update updateSelects)
function updateSelects() {
  const ingSelect = document.getElementById('ingredientSelect');
  const allSelect = document.getElementById('allergenSelect');
  const catSelect = document.getElementById('recipeCategory');
  const ingAllSelect = document.getElementById('ingredientAllergenSelect');
  
  if (ingSelect) {
    ingSelect.innerHTML = `<option value="">${t('select_ingredient')}</option>` + 
      ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  }
  
  if (allSelect) {
    allSelect.innerHTML = `<option value="">${t('select_allergen')}</option>` + 
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

// Update Print Function to show allergens
function printMenu() {
  const weekStart = getWeekStart(currentDate);
  const locale = currentLanguage === 'bg' ? 'bg-BG' : 'en-US';
  const selectedDates = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dateKey = day.toISOString().split('T')[0];
    const dayData = currentMenu[dateKey];
    let hasRecipe = false;
    if (dayData) {
        hasRecipe = Object.values(dayData).some(slot => slot && slot.recipe);
    }
    if (hasRecipe) selectedDates.push(day);
  }

  if (!selectedDates.length) {
    alert(t('alert_no_print_data'));
    return;
  }

  const firstDate = selectedDates[0];
  const lastDate = selectedDates[selectedDates.length - 1];

  const title = `${firstDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })} - ${lastDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })} ${currentLanguage === 'bg' ? 'Меню' : 'Menu'}`;
  const dateRange = `${firstDate.toLocaleDateString(locale)} - ${lastDate.toLocaleDateString(locale)}`;

  let recipesHtml = '<div class="print-grid">';
  
  selectedDates.forEach(day => {
    const dateKey = day.toISOString().split('T')[0];
    const dayMenu = currentMenu[dateKey];
    
    recipesHtml += `<div class="print-day">
      <h3>${day.toLocaleDateString(locale, { weekday: 'long', month: 'numeric', day: 'numeric' })}</h3>`;
    
    if (dayMenu) {
      DEFAULT_SLOTS.forEach(slot => {
        if (dayMenu[slot] && dayMenu[slot].recipe) {
          const r = recipes.find(x => x.id === dayMenu[slot].recipe.id);
          if (r) {
            const rAllergens = getRecipeAllergens(r);
            let allergensText = '';
            if (rAllergens.length) {
              allergensText = ` <span class="print-allergens">(${rAllergens.map(a => getAllergenName(a)).join(', ')})</span>`;
            }
            recipesHtml += `<div class="print-slot"><strong>${t('slot_' + slot)}:</strong> ${r.name}${allergensText}</div>`;
          }
        }
      });
    }
    recipesHtml += '</div>';
  });
  recipesHtml += '</div>';

  const styles = getLayoutStyles();
  const printWindow = window.open('', '_blank');
  const bgStyle = templateBackgroundImage ? 
    `body::before { content: ""; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${templateBackgroundImage}'); background-size: cover; background-position: center; opacity: 0.15; z-index: -1; }` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: sans-serif; padding: 2rem; max-width: ${styles.maxWidth}; margin: 0 auto; position: relative; }
        h1 { text-align: center; color: #21808d; }
        .print-day { margin-bottom: 1.5rem; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 1rem; }
        .print-day h3 { margin-top: 0; color: #333; }
        .print-slot { margin-bottom: 0.25rem; }
        .print-allergens { font-size: 0.85em; color: #d32f2f; font-style: italic; }
        ${bgStyle}
        ${styles.css}
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body class="${templateLayout}">
      ${printTemplate
        .replace(/{title}/g, title)
        .replace(/{dateRange}/g, dateRange)
        .replace(/{recipes}/g, recipesHtml)
        .replace(/{labelMenuFor}/g, t('label_menu_for'))}
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 500);
}

// Expose
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
window.addRecipeToMenu = addRecipeToMenu;
window.removeRecipeFromMenu = removeRecipeFromMenu;
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
window.toggleSyncDropdown = toggleSyncDropdown;
window.populateDefaultAllergens = populateDefaultAllergens;
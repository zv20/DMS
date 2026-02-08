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

    modal_add_recipe: 'Add Recipe',
    modal_edit_recipe: 'Edit Recipe',
    modal_add_ingredient: 'Add Ingredient',
    modal_add_allergen: 'Add Allergen',

    label_recipe_name: 'Recipe Name',
    label_category: 'Category',
    label_portion_size: 'Portion Size',
    label_ingredients: 'Ingredients',
    label_allergens: 'Allergens',
    label_instructions: 'Instructions (optional)',
    label_ingredient_name: 'Ingredient Name',
    label_allergen_name: 'Allergen Name',
    label_portion: 'Portion',
    label_layout: 'Layout Style',
    label_background: 'Background Image',

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

    heading_past_menus: 'Past Menus',
    heading_preview: 'Preview',
    label_saved: 'Saved',
    label_contains: 'Contains',
    label_menu_for: 'Menu for:',
    label_print_date: 'Print Week of:',

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
    day_sat_short: 'Sat'
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
    btn_print: '🖨️ Печат',
    btn_save_template: 'Запази шаблона',
    btn_edit: 'Редактирай',
    btn_delete: 'Изтрий',
    btn_add: 'Добави',
    btn_cancel: 'Отказ',
    btn_save: 'Запази',
    btn_save_recipe: 'Запази рецепта',
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

    modal_add_recipe: 'Добави рецепта',
    modal_edit_recipe: 'Редактирай рецепта',
    modal_add_ingredient: 'Добави съставка',
    modal_add_allergen: 'Добави алерген',

    label_recipe_name: 'Име на рецепта',
    label_category: 'Категория',
    label_portion_size: 'Порция',
    label_ingredients: 'Съставки',
    label_allergens: 'Алергени',
    label_instructions: 'Инструкции (опционално)',
    label_ingredient_name: 'Име на съставка',
    label_allergen_name: 'Име на алерген',
    label_portion: 'Порция',
    label_layout: 'Стил на подредба',
    label_background: 'Фоново изображение',

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

    heading_past_menus: 'Минали менюта',
    heading_preview: 'Преглед',
    label_saved: 'Запазено',
    label_contains: 'Съдържа',
    label_menu_for: 'Меню за:',
    label_print_date: 'Печат за седмица от:',

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
    day_sat_short: 'Сб'
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
  
  // Update placeholders
  const portionInput = document.getElementById('recipePortionSize');
  if (portionInput) portionInput.placeholder = t('portion_placeholder');

  updateSelects(); // Re-render selects with translated options
  renderCalendar(); // Re-render calendar for headers
  renderMenuHistory(); // Update history text
  updateTemplatePreview();
  updatePrintDayButtons();
}

// Database
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
  if (directoryHandle) {
    try {
      const fileHandle = await directoryHandle.getFileHandle('recipe_data.json', { create: true });
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (text) {
        const data = JSON.parse(text);
        recipes = data.recipes || [];
        ingredients = data.ingredients || [];
        allergens = data.allergens || [];
        currentMenu = data.currentMenu || {};
        menuHistory = data.menuHistory || [];
        printTemplate = data.printTemplate || printTemplate;
        // Don't overwrite language from file, use local preference
        templateBackgroundImage = data.templateBackgroundImage || '';
        templateLayout = data.templateLayout || 'default';
        selectedPrintDays = data.selectedPrintDays || [1, 2, 3, 4, 5];
        updateSyncStatus('connected');
      }
    } catch (err) {
      console.error('Error loading file:', err);
      updateSyncStatus('error');
    }
  } else {
    const data = localStorage.getItem('recipeManagerData');
    if (data) {
      const parsed = JSON.parse(data);
      recipes = parsed.recipes || [];
      ingredients = parsed.ingredients || [];
      allergens = parsed.allergens || [];
      currentMenu = parsed.currentMenu || {};
      menuHistory = parsed.menuHistory || [];
      printTemplate = parsed.printTemplate || printTemplate;
      templateBackgroundImage = parsed.templateBackgroundImage || '';
      templateLayout = parsed.templateLayout || 'default';
      selectedPrintDays = parsed.selectedPrintDays || [1, 2, 3, 4, 5];
    }
    updateSyncStatus('local');
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
    templateLayout,
    selectedPrintDays
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
}

async function autoLoadOnStartup() {
  if (isFileSystemSupported) {
    try {
      const handle = await getDirectoryHandle();
      if (handle) {
        // Check permissions
        const opts = { mode: 'readwrite' };
        if ((await handle.queryPermission(opts)) === 'granted') {
          directoryHandle = handle;
        } else {
          // Request permission again if needed (requires user gesture, might fail here)
          // We'll leave directoryHandle null and use localStorage until user clicks button
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
}

function updateSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = 'sync-status';
  if (status === 'connected' || status === 'synced') {
    el.classList.add('connected');
    el.textContent = '🟢 ' + (currentLanguage === 'bg' ? 'Синхронизирано' : 'Synced');
  } else if (status === 'error') {
    el.classList.add('error');
    el.textContent = '🔴 ' + (currentLanguage === 'bg' ? 'Грешка' : 'Error');
  } else {
    el.classList.add('disconnected');
    el.textContent = '🟡 ' + (currentLanguage === 'bg' ? 'Локално (Local)' : 'Local Storage');
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
  applyTranslations(); // Apply translation to new content
}

// Recipes
function openRecipeModal(recipeId = null) {
  editingRecipeId = recipeId;
  const modal = document.getElementById('recipeModal');
  const title = document.getElementById('recipeModalTitle');
  const form = document.getElementById('recipeForm');
  
  if (recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    title.textContent = t('modal_edit_recipe');
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('recipeCategory').value = recipe.category;
    document.getElementById('recipePortionSize').value = recipe.portionSize || '';
    document.getElementById('recipeInstructions').value = recipe.instructions || '';
    renderTags('recipeIngredients', recipe.ingredients, removeIngredientFromRecipe);
    renderTags('recipeAllergens', recipe.allergens, removeAllergenFromRecipe);
    form.dataset.tempIngredients = JSON.stringify(recipe.ingredients);
    form.dataset.tempAllergens = JSON.stringify(recipe.allergens);
  } else {
    title.textContent = t('modal_add_recipe');
    form.reset();
    document.getElementById('recipeIngredients').innerHTML = '';
    document.getElementById('recipeAllergens').innerHTML = '';
    form.dataset.tempIngredients = '[]';
    form.dataset.tempAllergens = '[]';
  }
  
  modal.style.display = 'block';
}

function closeRecipeModal() {
  document.getElementById('recipeModal').style.display = 'none';
  editingRecipeId = null;
}

function saveRecipe(event) {
  event.preventDefault();
  const name = document.getElementById('recipeName').value;
  const category = document.getElementById('recipeCategory').value;
  const portionSize = document.getElementById('recipePortionSize').value;
  const instructions = document.getElementById('recipeInstructions').value;
  const form = document.getElementById('recipeForm');
  const ingredientsList = JSON.parse(form.dataset.tempIngredients || '[]');
  const allergensList = JSON.parse(form.dataset.tempAllergens || '[]');

  if (editingRecipeId) {
    const index = recipes.findIndex(r => r.id === editingRecipeId);
    recipes[index] = { ...recipes[index], name, category, portionSize, instructions, ingredients: ingredientsList, allergens: allergensList };
  } else {
    recipes.push({
      id: Date.now().toString(),
      name,
      category,
      portionSize,
      instructions,
      ingredients: ingredientsList,
      allergens: allergensList
    });
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
    list.push(ingredient);
    form.dataset.tempIngredients = JSON.stringify(list);
    renderTags('recipeIngredients', list, removeIngredientFromRecipe);
  }
  select.value = '';
}

function removeIngredientFromRecipe(id) {
  const form = document.getElementById('recipeForm');
  let list = JSON.parse(form.dataset.tempIngredients || '[]');
  list = list.filter(i => i.id !== id);
  form.dataset.tempIngredients = JSON.stringify(list);
  renderTags('recipeIngredients', list, removeIngredientFromRecipe);
}

function addAllergenToRecipe() {
  const select = document.getElementById('allergenSelect');
  const id = select.value;
  if (!id) return;
  const allergen = allergens.find(a => a.id === id);
  const form = document.getElementById('recipeForm');
  const list = JSON.parse(form.dataset.tempAllergens || '[]');
  
  if (!list.find(a => a.id === id)) {
    list.push(allergen);
    form.dataset.tempAllergens = JSON.stringify(list);
    renderTags('recipeAllergens', list, removeAllergenFromRecipe);
  }
  select.value = '';
}

function removeAllergenFromRecipe(id) {
  const form = document.getElementById('recipeForm');
  let list = JSON.parse(form.dataset.tempAllergens || '[]');
  list = list.filter(a => a.id !== id);
  form.dataset.tempAllergens = JSON.stringify(list);
  renderTags('recipeAllergens', list, removeAllergenFromRecipe);
}

function renderTags(containerId, items, removeCallback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const tag = document.createElement('span');
    tag.className = 'tag' + (containerId.includes('Allergen') ? ' allergen' : '');
    tag.textContent = item.name;
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

    let allergensHtml = '';
    if (recipe.allergens && recipe.allergens.length > 0) {
      allergensHtml = `<div class="tag-container" style="margin-top:0.5rem;">
        ${recipe.allergens.map(a => `<span class="tag allergen">${a.name}</span>`).join('')}
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

function getCategoryIcon(cat) {
  switch (cat) {
    case 'soup': return '🥣';
    case 'main': return '🍽️';
    case 'dessert': return '🍰';
    default: return '➕';
  }
}

// Ingredients
function openIngredientModal() {
  const modal = document.getElementById('ingredientModal');
  if (modal) {
    modal.style.display = 'block';
    const input = document.getElementById('ingredientName');
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}

function closeIngredientModal() {
  const modal = document.getElementById('ingredientModal');
  if (modal) modal.style.display = 'none';
}

function saveIngredient(event) {
  event.preventDefault(); // Stop the form from reloading the page
  const nameInput = document.getElementById('ingredientName');
  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) return;
  
  ingredients.push({ id: Date.now().toString(), name: name });
  nameInput.value = '';
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
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('empty_ingredients');
    list.appendChild(empty);
    return;
  }

  ingredients.forEach(ing => {
    const item = document.createElement('div');
    item.className = 'ingredient-item';
    item.textContent = ing.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = t('btn_delete');
    deleteBtn.addEventListener('click', () => deleteIngredient(ing.id));

    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
}

// Allergens
function openAllergenModal() {
  const modal = document.getElementById('allergenModal');
  if (modal) {
    modal.style.display = 'block';
    const input = document.getElementById('allergenName');
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}

function closeAllergenModal() {
  const modal = document.getElementById('allergenModal');
  if (modal) modal.style.display = 'none';
}

function saveAllergen(event) {
  event.preventDefault();
  const nameInput = document.getElementById('allergenName');
  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) return;
  
  allergens.push({ id: Date.now().toString(), name: name });
  nameInput.value = '';
  saveData();
  renderAllergens();
  updateSelects();
  closeAllergenModal();
}

function deleteAllergen(id) {
  if (!confirm(t('alert_delete_allergen'))) return;
  allergens = allergens.filter(a => a.id !== id);
  recipes.forEach(r => {
    r.allergens = r.allergens.filter(al => al.id !== id);
  });
  saveData();
  renderAllergens();
  renderRecipes();
  updateSelects();
}

function renderAllergens() {
  const list = document.getElementById('allergenList');
  if (!list) return;
  list.innerHTML = '';

  if (!allergens.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('empty_allergens');
    list.appendChild(empty);
    return;
  }

  allergens.forEach(al => {
    const item = document.createElement('div');
    item.className = 'allergen-item';
    item.textContent = al.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = t('btn_delete');
    deleteBtn.addEventListener('click', () => deleteAllergen(al.id));

    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
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

  // Fake preview for first 5 days for grid view, or 2 for others
  const daysToShow = templateLayout === 'grid' ? 5 : 2;
  const previewDates = [];
  for (let i = 0; i < daysToShow; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + (i + 1)); // Mon-Fri
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
  
  // Inject style for preview
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles.css;
  
  const html = printTemplate
    .replace(/{title}/g, title)
    .replace(/{dateRange}/g, dateRange)
    .replace(/{recipes}/g, recipesHtml)
    .replace(/{labelMenuFor}/g, t('label_menu_for'));

  preview.innerHTML = html;
  // Apply grid styles to preview if needed
  if (templateLayout === 'grid') {
     preview.style.display = 'block'; // Reset
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
    templateLayout,
    selectedPrintDays
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'recipe_manager_export.json';
  a.click();

  URL.revokeObjectURL(url);
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
      selectedPrintDays = data.selectedPrintDays || [1, 2, 3, 4, 5];

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
  await initDB();
  await autoLoadOnStartup();

  templateBackgroundImage = localStorage.getItem('templateBackgroundImage') || '';
  templateLayout = localStorage.getItem('templateLayout') || 'default';

  const langSel = document.getElementById('languageSelect');
  if (langSel) {
    langSel.value = currentLanguage;
    langSel.addEventListener('change', (e) => changeLanguage(e.target.value));
  }

  renderAll();
  updatePrintDayButtons();
  updateLayoutButtons();
  updateSyncStatus();

  if (window.$) {
    window.$(document).ready(function () {
      initSummernote();
    });
  }

  bindNavigation();

  const prevWeekBtn = document.getElementById('prevWeek');
  const nextWeekBtn = document.getElementById('nextWeek');
  const saveMenuBtn = document.getElementById('saveMenu');
  const printMenuBtn = document.getElementById('printMenuBtn');
  const selectLocationBtn = document.getElementById('selectLocationBtn');
  const manualSaveBtn = document.getElementById('manualSaveBtn');
  const manualLoadBtn = document.getElementById('manualLoadBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importInput = document.getElementById('importInput');
  const uploadBgInput = document.getElementById('uploadBgInput');
  const removeBgBtn = document.getElementById('removeBgBtn');
  const layoutDefaultBtn = document.getElementById('layout_default');
  const layoutColumnsBtn = document.getElementById('layout_columns');
  const layoutCenteredBtn = document.getElementById('layout_centered');
  const layoutGridBtn = document.getElementById('layout_grid');
  const printStartDateInput = document.getElementById('printStartDate');

  if (uploadBgInput) uploadBgInput.addEventListener('change', uploadBackgroundImage);
  if (removeBgBtn) removeBgBtn.addEventListener('click', removeBackgroundImage);
  if (layoutDefaultBtn) layoutDefaultBtn.addEventListener('click', () => setLayout('default'));
  if (layoutColumnsBtn) layoutColumnsBtn.addEventListener('click', () => setLayout('columns'));
  if (layoutCenteredBtn) layoutCenteredBtn.addEventListener('click', () => setLayout('centered'));
  if (layoutGridBtn) layoutGridBtn.addEventListener('click', () => setLayout('grid'));
  if (printStartDateInput) {
    printStartDateInput.addEventListener('change', (e) => {
      currentDate = new Date(e.target.value);
      renderAll();
    });
  }

  for (let i = 0; i <= 6; i++) {
    const btn = document.getElementById(`printDay${i}`);
    if (btn) {
      btn.addEventListener('click', () => togglePrintDay(i));
    }
  }
}

window.addEventListener('DOMContentLoaded', init);

// Helper functions (defined here to be accessible)
function updateSelects() {
  const ingSelect = document.getElementById('ingredientSelect');
  const allSelect = document.getElementById('allergenSelect');
  const catSelect = document.getElementById('recipeCategory');
  
  if (ingSelect) {
    ingSelect.innerHTML = `<option value="">${t('select_ingredient')}</option>` + 
      ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  }
  
  if (allSelect) {
    allSelect.innerHTML = `<option value="">${t('select_allergen')}</option>` + 
      allergens.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
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
  if (idx > -1) {
    selectedPrintDays.splice(idx, 1);
  } else {
    selectedPrintDays.push(dayIndex);
  }
  saveData(); // Save selection to storage
  updatePrintDayButtons();
}

function updatePrintDayButtons() {
  for (let i = 0; i <= 6; i++) {
    const btn = document.getElementById(`printDay${i}`);
    if (btn) {
      if (selectedPrintDays.includes(i)) {
        btn.classList.add('active');
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('active');
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    }
  }
  
  // Sync date picker if exists
  const input = document.getElementById('printStartDate');
  if (input) {
    const weekStart = getWeekStart(currentDate);
    input.value = weekStart.toISOString().split('T')[0];
  }
}

// Helpers for calendar logic
function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  // Adjust to start on Monday? Default JS is Sunday=0.
  // If we want Monday start:
  const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
  const diffToMon = (dayOfWeek + 6) % 7; 
  date.setDate(date.getDate() - diffToMon);
  date.setHours(0,0,0,0);
  return date;
}

function getMonthStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toggleView(mode) {
  viewMode = mode;
  localStorage.setItem('calendarViewMode', mode);
  renderCalendar();
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

// Calendar Rendering (simplified for brevity, ensuring it exists)
function renderCalendar() {
  const container = document.getElementById('calendar');
  if (!container) return;
  
  if (viewMode === 'week') {
    renderWeekView(container);
  } else {
    renderMonthView(container);
  }
}

function renderWeekView(container) {
  container.innerHTML = '';
  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const header = document.getElementById('currentMonth');
  if (header) {
    const locale = currentLanguage === 'bg' ? 'bg-BG' : 'en-US';
    header.textContent = `${weekStart.toLocaleDateString(locale)} - ${weekEnd.toLocaleDateString(locale)}`;
  }
  
  container.className = 'week-view'; // Use week view styling if any
  container.style.display = 'block';

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dateKey = day.toISOString().split('T')[0];
    
    const dayRow = document.createElement('div');
    dayRow.className = 'week-day-row';
    const dayName = day.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long', month: 'numeric', day: 'numeric' });
    
    dayRow.innerHTML = `<h3>${dayName}</h3><div class="week-slots-grid" id="slots-${dateKey}"></div>`;
    container.appendChild(dayRow);
    
    renderSlots(dateKey, `slots-${dateKey}`);
  }
}

function renderMonthView(container) {
  container.innerHTML = '';
  const monthStart = getMonthStart(currentDate);
  const header = document.getElementById('currentMonth');
  if (header) {
    header.textContent = monthStart.toLocaleDateString(currentLanguage === 'bg' ? 'bg-BG' : 'en-US', { month: 'long', year: 'numeric' });
  }

  container.className = 'calendar';
  container.style.display = 'grid';

  // Days header
  DAY_NAMES.forEach(d => {
    const el = document.createElement('div');
    el.className = 'calendar-day-header';
    // Translated headers? 
    // We can just use date locale for this too, or map it.
    // For simplicity, let's use the first 3 chars of English day names for now, or use map.
    // Actually, let's use the translation keys!
    // But DAY_NAMES is English.
    // Let's rely on locale for now or just hardcode english short names for layout structure.
    el.textContent = d.substring(0, 3);
    container.appendChild(el);
  });

  // Empty slots for start
  const firstDay = monthStart.getDay();
  for (let i = 0; i < firstDay; i++) {
    container.appendChild(document.createElement('div'));
  }

  // Days
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dateKey = day.toISOString().split('T')[0];
    const el = document.createElement('div');
    el.className = 'calendar-day';
    el.innerHTML = `<h4>${i}</h4>`;
    el.onclick = () => {
      // Switch to week view for this day?
      currentDate = day;
      toggleView('week');
    };
    
    // Show mini indicators
    if (currentMenu[dateKey]) {
      const slots = Object.values(currentMenu[dateKey]);
      if (slots.some(s => s.recipe)) {
        el.style.background = '#e3f2fd';
      }
    }
    
    container.appendChild(el);
  }
}

function renderSlots(dateKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  DEFAULT_SLOTS.forEach(slotType => {
    const slotData = currentMenu[dateKey] && currentMenu[dateKey][slotType];
    const slotEl = document.createElement('div');
    slotEl.className = 'meal-slot';
    
    let content = '';
    if (slotData && slotData.recipe) {
      const recipe = recipes.find(r => r.id === slotData.recipe.id);
      if (recipe) {
        content = `
          <div class="calendar-recipe">
            <span>${getCategoryIcon(recipe.category)} ${recipe.name}</span>
            <button class="remove" onclick="removeRecipeFromMenu('${dateKey}', '${slotType}')">&times;</button>
          </div>
        `;
      }
    } else {
      content = `
        <div class="meal-slot-content">
          <select onchange="addRecipeToMenu('${dateKey}', '${slotType}', this.value)">
            <option value="">${t('btn_add_slot')}</option>
            ${recipes.filter(r => r.category === slotType || slotType === 'other').map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>
      `;
    }
    
    const slotLabel = t('slot_' + slotType);
    
    slotEl.innerHTML = `
      <div class="meal-slot-header"><strong>${slotLabel}</strong></div>
      ${content}
    `;
    container.appendChild(slotEl);
  });
}

function addRecipeToMenu(date, slot, recipeId) {
  if (!recipeId) return;
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return;
  
  if (!currentMenu[date]) currentMenu[date] = {};
  currentMenu[date][slot] = { recipe: { id: recipe.id, name: recipe.name } };
  
  saveData();
  renderCalendar();
}

function removeRecipeFromMenu(date, slot) {
  if (currentMenu[date] && currentMenu[date][slot]) {
    delete currentMenu[date][slot];
    saveData();
    renderCalendar();
  }
}

function printMenu() {
  if (selectedPrintDays.length === 0) {
    alert(t('alert_select_days'));
    return;
  }

  const weekStart = getWeekStart(currentDate);
  const locale = currentLanguage === 'bg' ? 'bg-BG' : 'en-US';

  const selectedDates = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const weekday = day.getDay();
    if (selectedPrintDays.includes(weekday)) selectedDates.push(day);
  }
  if (!selectedDates.length) {
    alert(t('alert_select_days'));
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
    
    // For grid view, we always render the cell even if empty, to maintain grid structure?
    // User asked for "5 block system".
    // If empty, let's render an empty block or just the header.
    
    recipesHtml += `<div class="print-day">
      <h3>${day.toLocaleDateString(locale, { weekday: 'long', month: 'numeric', day: 'numeric' })}</h3>`;
    
    if (dayMenu) {
      DEFAULT_SLOTS.forEach(slot => {
        if (dayMenu[slot] && dayMenu[slot].recipe) {
          const r = recipes.find(x => x.id === dayMenu[slot].recipe.id);
          if (r) {
            let allergensText = '';
            if (r.allergens && r.allergens.length) {
              allergensText = ` <span class="print-allergens">(${r.allergens.map(a => a.name).join(', ')})</span>`;
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
  // Wait for images
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Expose functions for HTML buttons
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
window.togglePrintDay = togglePrintDay;
window.toggleView = toggleView;
window.changeMonth = changeMonth;
window.setLayout = setLayout;
window.insertVariable = insertVariable;
window.uploadBackgroundImage = uploadBackgroundImage;
window.removeBackgroundImage = removeBackgroundImage;
window.addRecipeToMenu = addRecipeToMenu;
window.removeRecipeFromMenu = removeRecipeFromMenu;
window.addIngredientToRecipe = addIngredientToRecipe;
window.addAllergenToRecipe = addAllergenToRecipe;
window.deleteRecipe = deleteRecipe;
window.deleteSavedMenu = deleteSavedMenu;
window.loadSavedMenu = loadSavedMenu;
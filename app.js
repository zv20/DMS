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
    menu_planning: "Menu Planning",
    recipes: "Recipes",
    ingredients: "Ingredients",
    allergens: "Allergens",
    template: "Print Template",
    week_view: "Week View",
    month_view: "Month View",
    save_menu: "Save Menu",
    week_of: "Week of",
    print_selected: "Print Selected Days",
    label_menu_for: "Menu for:",
    category_select: "Select category",
    category_soup: "Soup",
    category_main: "Main",
    category_dessert: "Dessert",
    category_other: "Other",
    btn_delete: "Delete",
    btn_load: "Load",
    alert_delete_ingredient: "Delete this ingredient?",
    alert_delete_allergen: "Delete this allergen?",
    alert_delete_menu: "Delete this saved menu?",
    alert_delete_recipe: "Delete this recipe?",
    alert_menu_saved: "Menu saved to history!",
    alert_menu_loaded: "Menu loaded!",
    alert_no_menu_to_save: "Menu is empty, nothing to save.",
    alert_select_days: "Please select at least one day to print.",
    alert_template_saved: "Template saved!",
    alert_import_success: "Data imported successfully!",
    alert_import_error: "Error importing data: ",
    empty_ingredients: "No ingredients added yet.",
    empty_allergens: "No allergens added yet.",
    empty_menus: "No saved menus.",
    empty_recipes: "No recipes found."
  },
  bg: {
    menu_planning: "Планиране на Меню",
    recipes: "Рецепти",
    ingredients: "Съставки",
    allergens: "Алергени",
    template: "Шаблон за Печат",
    week_view: "Седмичен Изглед",
    month_view: "Месечен Изглед",
    save_menu: "Запази Меню",
    week_of: "Седмица от",
    print_selected: "Принтирай Избраните Дни",
    label_menu_for: "Меню за:",
    category_select: "Изберете категория",
    category_soup: "Супа",
    category_main: "Основно",
    category_dessert: "Десерт",
    category_other: "Друго",
    btn_delete: "Изтрий",
    btn_load: "Зареди",
    alert_delete_ingredient: "Изтриване на тази съставка?",
    alert_delete_allergen: "Изтриване на този алерген?",
    alert_delete_menu: "Изтриване на това запазено меню?",
    alert_delete_recipe: "Изтриване на тази рецепта?",
    alert_menu_saved: "Менюто е запазено в историята!",
    alert_menu_loaded: "Менюто е заредено!",
    alert_no_menu_to_save: "Менюто е празно, няма какво да се запази.",
    alert_select_days: "Моля изберете поне един ден за печат.",
    alert_template_saved: "Шаблонът е запазен!",
    alert_import_success: "Данните са импортирани успешно!",
    alert_import_error: "Грешка при импортиране: ",
    empty_ingredients: "Все още няма добавени съставки.",
    empty_allergens: "Все още няма добавени алергени.",
    empty_menus: "Няма запазени менюта.",
    empty_recipes: "Няма намерени рецепти."
  }
};

function t(key) {
  return translations[currentLanguage][key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  // Update buttons text manually if needed (omitted for brevity, relying on render functions)
  updateSelects(); // Re-render selects with translated options
  renderCalendar(); // Re-render calendar for headers
  updateTemplatePreview();
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

async function selectSaveLocation() {
  if (!isFileSystemSupported) {
    alert('Your browser does not support file system access. Data will be saved to LocalStorage.');
    return;
  }
  try {
    directoryHandle = await window.showDirectoryPicker();
    await saveDirectoryHandle(directoryHandle);
    await loadData();
    updateSelects();
    renderRecipes();
    renderIngredients();
    renderAllergens();
    renderCalendar();
    renderMenuHistory();
    alert('Save location set! Data will now sync to this folder.');
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
  alert('Data saved successfully!');
}

async function manualLoad() {
  if (!isFileSystemSupported) return;
  try {
    const handle = await window.showDirectoryPicker();
    directoryHandle = handle;
    await saveDirectoryHandle(handle);
    await loadData();
    renderAll();
    alert('Data loaded from folder!');
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
    el.textContent = '🟢 Synced to Folder';
  } else if (status === 'error') {
    el.classList.add('error');
    el.textContent = '🔴 Sync Error';
  } else {
    el.classList.add('disconnected');
    el.textContent = '🟡 Local Storage Only';
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
}

// Recipes
function openRecipeModal(recipeId = null) {
  editingRecipeId = recipeId;
  const modal = document.getElementById('recipeModal');
  const title = document.getElementById('recipeModalTitle');
  const form = document.getElementById('recipeForm');
  
  if (recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    title.textContent = 'Edit Recipe';
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('recipeCategory').value = recipe.category;
    document.getElementById('recipePortionSize').value = recipe.portionSize || '';
    document.getElementById('recipeInstructions').value = recipe.instructions || '';
    renderTags('recipeIngredients', recipe.ingredients, removeIngredientFromRecipe);
    renderTags('recipeAllergens', recipe.allergens, removeAllergenFromRecipe);
    form.dataset.tempIngredients = JSON.stringify(recipe.ingredients);
    form.dataset.tempAllergens = JSON.stringify(recipe.allergens);
  } else {
    title.textContent = 'Add Recipe';
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
        <button class="btn btn-small btn-secondary" onclick="openRecipeModal('${recipe.id}')">Edit</button>
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
  const layouts = ['default', 'columns', 'centered'];
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
          text-align: left;
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

  // Fake preview for first two days
  const previewDates = [];
  for (let i = 0; i < 2; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    previewDates.push(day);
  }

  const firstDate = previewDates[0];
  const lastDate = previewDates[previewDates.length - 1];

  const title = `${firstDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })} - ${lastDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })} ${currentLanguage === 'bg' ? 'Меню' : 'Menu'}`;
  const dateRange = `${firstDate.toLocaleDateString(locale)} - ${lastDate.toLocaleDateString(locale)}`;

  let recipesHtml = '<div>';
  previewDates.forEach(day => {
    recipesHtml += `<h3>${day.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>`;
    recipesHtml += '<p>Sample Soup</p>';
    recipesHtml += '<p>Sample Main Dish</p>';
  });
  recipesHtml += '</div>';

  const html = printTemplate
    .replace(/{title}/g, title)
    .replace(/{dateRange}/g, dateRange)
    .replace(/{recipes}/g, recipesHtml)
    .replace(/{labelMenuFor}/g, t('label_menu_for'));

  preview.innerHTML = html;
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

      localStorage.setItem('recipeManagerLang', currentLanguage);
      localStorage.setItem('templateBackgroundImage', templateBackgroundImage);
      localStorage.setItem('templateLayout', templateLayout);

      saveData();
      updateSelects();
      renderRecipes();
      renderIngredients();
      renderAllergens();
      renderCalendar();
      renderMenuHistory();
      updateLayoutButtons();
      updateTemplatePreview();
      applyTranslations();

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

  updateSelects();
  renderRecipes();
  renderIngredients();
  renderAllergens();
  renderCalendar();
  renderMenuHistory();
  updatePrintDayButtons();
  updateLayoutButtons();
  updateTemplatePreview();
  updateSyncStatus();

  if (window.$) {
    window.$(document).ready(function () {
      initSummernote();
    });
  }

  applyTranslations();
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

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() - 7);
      renderCalendar();
    });
  }
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() + 7);
      renderCalendar();
    });
  }
  if (saveMenuBtn) saveMenuBtn.addEventListener('click', saveCurrentMenu);
  if (printMenuBtn) printMenuBtn.addEventListener('click', printMenu);
  if (selectLocationBtn) selectLocationBtn.addEventListener('click', selectSaveLocation);
  if (manualSaveBtn) manualSaveBtn.addEventListener('click', manualSave);
  if (manualLoadBtn) manualLoadBtn.addEventListener('click', manualLoad);
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  if (importInput) importInput.addEventListener('change', importData);

  for (let i = 0; i <= 6; i++) {
    const btn = document.getElementById(`printDay${i}`);
    if (btn) {
      btn.addEventListener('click', () => togglePrintDay(i));
    }
  }

  const uploadBgInput = document.getElementById('uploadBgInput');
  const removeBgBtn = document.getElementById('removeBgBtn');
  const layoutDefaultBtn = document.getElementById('layout_default');
  const layoutColumnsBtn = document.getElementById('layout_columns');
  const layoutCenteredBtn = document.getElementById('layout_centered');

  if (uploadBgInput) uploadBgInput.addEventListener('change', uploadBackgroundImage);
  if (removeBgBtn) removeBgBtn.addEventListener('click', removeBackgroundImage);
  if (layoutDefaultBtn) layoutDefaultBtn.addEventListener('click', () => setLayout('default'));
  if (layoutColumnsBtn) layoutColumnsBtn.addEventListener('click', () => setLayout('columns'));
  if (layoutCenteredBtn) layoutCenteredBtn.addEventListener('click', () => setLayout('centered'));
}

window.addEventListener('DOMContentLoaded', init);

// Helper functions (defined here to be accessible)
function updateSelects() {
  const ingSelect = document.getElementById('ingredientSelect');
  const allSelect = document.getElementById('allergenSelect');
  const catSelect = document.getElementById('recipeCategory');
  
  if (ingSelect) {
    ingSelect.innerHTML = '<option value="">Select ingredient</option>' + 
      ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  }
  
  if (allSelect) {
    allSelect.innerHTML = '<option value="">Select allergen</option>' + 
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
}

// Helpers for calendar logic
function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when week starts on Monday
  // But code seems to use Sunday as 0. Let's stick to standard.
  // Actually, if we want Monday start:
  const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
  // If 0 (Sun), go back 6 days to Monday. If 1 (Mon), go back 0.
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
            <option value="">+ Add ${t('category_' + slotType) || slotType}</option>
            ${recipes.filter(r => r.category === slotType || slotType === 'other').map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>
      `;
    }
    
    slotEl.innerHTML = `
      <div class="meal-slot-header"><strong>${t('category_' + slotType) || slotType}</strong></div>
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
    
    if (dayMenu) {
      recipesHtml += `<div class="print-day">
        <h3>${day.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>`;
      
      DEFAULT_SLOTS.forEach(slot => {
        if (dayMenu[slot] && dayMenu[slot].recipe) {
          const r = recipes.find(x => x.id === dayMenu[slot].recipe.id);
          if (r) {
            let allergensText = '';
            if (r.allergens && r.allergens.length) {
              allergensText = ` <span class="print-allergens">(${r.allergens.map(a => a.name).join(', ')})</span>`;
            }
            recipesHtml += `<div class="print-slot"><strong>${t('category_' + slot)}:</strong> ${r.name}${allergensText}</div>`;
          }
        }
      });
      recipesHtml += '</div>';
    }
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
    // printWindow.close(); // Optional
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
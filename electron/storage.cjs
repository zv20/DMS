const path = require('node:path');
const { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } = require('node:fs');
const Database = require('better-sqlite3');

const DOCUMENT_KEYS = new Set(['recipes', 'ingredients', 'allergens', 'currentMenu', 'appSettings', 'templates', 'menuHistory']);
const CATALOG_PROJECTIONS = Object.freeze({
  recipes: 'recipes_projection',
  ingredients: 'ingredients_projection',
  allergens: 'allergens_projection'
});
const DEFAULTS = Object.freeze({
  recipes: [], ingredients: [], allergens: [], currentMenu: {},
  appSettings: { language: 'bg', theme: 'default', autoBackupLimit: 3, onboardingComplete: false }, templates: {}, menuHistory: []
});
const IMAGE_FOLDERS = new Set(['backgrounds', 'template-objects']);
const IMAGE_EXTENSIONS = Object.freeze({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' });
const DEFAULT_AUTO_BACKUP_LIMIT = 3;

function cloneDefault(key) { return JSON.parse(JSON.stringify(DEFAULTS[key])); }

function assertDocument(key, value) {
  if (!DOCUMENT_KEYS.has(key)) throw new Error(`Unsupported storage document: ${key}`);
  let valueJson;
  try { valueJson = JSON.stringify(value); } catch { throw new Error(`Invalid ${key} payload.`); }
  if (valueJson === undefined || Buffer.byteLength(valueJson, 'utf8') > 20 * 1024 * 1024) {
    throw new Error(`Invalid ${key} payload.`);
  }
  return valueJson;
}

function assertMenuSlot(date, slot, item) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid menu date.');
  if (typeof slot !== 'string' || !/^slot\d+$/.test(slot)) throw new Error('Invalid menu slot.');
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid menu item.');
  const itemJson = JSON.stringify(item);
  if (itemJson === undefined || Buffer.byteLength(itemJson, 'utf8') > 1024 * 1024) throw new Error('Invalid menu item.');
}

function assertTemplate(name, template) {
  if (typeof name !== 'string' || name.trim().length === 0) throw new Error('Invalid template name.');
  if (!template || typeof template !== 'object' || Array.isArray(template)) throw new Error('Invalid template payload.');
  const templateJson = JSON.stringify(template);
  if (templateJson === undefined || Buffer.byteLength(templateJson, 'utf8') > 5 * 1024 * 1024) throw new Error('Invalid template payload.');
}

function assertImage(folder, name, mimeType, dataUrl) {
  if (!IMAGE_FOLDERS.has(folder)) throw new Error('Invalid image folder.');
  if (typeof name !== 'string' || !/^[^\\/:*?"<>|]+$/.test(name) || !/\.(png|jpe?g|gif|webp)$/i.test(name)) throw new Error('Invalid image name.');
  if (typeof mimeType !== 'string' || !/^image\/(png|jpeg|gif|webp)$/i.test(mimeType)) throw new Error('Invalid image type.');
  const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/i) : null;
  if (!match || match[1].toLowerCase() !== mimeType.toLowerCase()) throw new Error('Invalid image payload.');
  const data = Buffer.from(match[2], 'base64');
  if (!data.length || data.length > 10 * 1024 * 1024) throw new Error('Invalid image size.');
  return data;
}

function safeImageFilename(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+$/, 'image').slice(0, 120);
}

function createDesktopDatabase(userDataPath) {
  mkdirSync(userDataPath, { recursive: true });
  const imageRoot = path.join(userDataPath, 'images');
  for (const folder of IMAGE_FOLDERS) mkdirSync(path.join(imageRoot, folder), { recursive: true });
  const database = new Database(path.join(userDataPath, 'dms.sqlite'));
  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS application_documents (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY, occurred_at TEXT NOT NULL, operation TEXT NOT NULL, document_key TEXT, detail_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recipes_projection (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, portion_size TEXT, calories INTEGER, instructions TEXT, data_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ingredients_projection (id TEXT PRIMARY KEY, name TEXT NOT NULL, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS allergens_projection (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      recipe_id TEXT NOT NULL REFERENCES recipes_projection(id) ON DELETE CASCADE,
      ingredient_id TEXT NOT NULL REFERENCES ingredients_projection(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (recipe_id, ingredient_id)
    );
    CREATE TABLE IF NOT EXISTS ingredient_allergens (
      ingredient_id TEXT NOT NULL REFERENCES ingredients_projection(id) ON DELETE CASCADE,
      allergen_id TEXT NOT NULL REFERENCES allergens_projection(id) ON DELETE CASCADE,
      PRIMARY KEY (ingredient_id, allergen_id)
    );
    CREATE TABLE IF NOT EXISTS recipe_manual_allergens (
      recipe_id TEXT NOT NULL REFERENCES recipes_projection(id) ON DELETE CASCADE,
      allergen_id TEXT NOT NULL REFERENCES allergens_projection(id) ON DELETE CASCADE,
      PRIMARY KEY (recipe_id, allergen_id)
    );
    CREATE TABLE IF NOT EXISTS menu_items_projection (
      menu_date TEXT NOT NULL, slot TEXT NOT NULL, category TEXT, recipe_id TEXT REFERENCES recipes_projection(id) ON DELETE SET NULL,
      PRIMARY KEY (menu_date, slot)
    );
    CREATE TABLE IF NOT EXISTS templates_projection (name TEXT PRIMARY KEY, data_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS template_images (
      folder TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data BLOB NOT NULL,
      relative_path TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (folder, name)
    );
  `);
  const templateImageColumns = database.prepare('PRAGMA table_info(template_images)').all().map((row) => row.name);
  if (!templateImageColumns.includes('relative_path')) database.exec('ALTER TABLE template_images ADD COLUMN relative_path TEXT;');
  database.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString());

  const get = database.prepare('SELECT value_json FROM application_documents WHERE key = ?');
  const upsert = database.prepare(`INSERT INTO application_documents (key, value_json, updated_at) VALUES (@key, @valueJson, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`);
  const audit = database.prepare('INSERT INTO audit_events (occurred_at, operation, document_key, detail_json) VALUES (@occurredAt, @operation, @documentKey, @detailJson)');
  const insertRecipe = database.prepare('INSERT INTO recipes_projection (id, name, category, portion_size, calories, instructions, data_json) VALUES (@id, @name, @category, @portionSize, @calories, @instructions, @dataJson)');
  const insertIngredient = database.prepare('INSERT INTO ingredients_projection (id, name, data_json) VALUES (@id, @name, @dataJson)');
  const insertAllergen = database.prepare('INSERT INTO allergens_projection (id, name, color, data_json) VALUES (@id, @name, @color, @dataJson)');
  const insertRecipeIngredient = database.prepare('INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, position) VALUES (?, ?, ?)');
  const insertIngredientAllergen = database.prepare('INSERT OR IGNORE INTO ingredient_allergens (ingredient_id, allergen_id) VALUES (?, ?)');
  const insertRecipeAllergen = database.prepare('INSERT OR IGNORE INTO recipe_manual_allergens (recipe_id, allergen_id) VALUES (?, ?)');
  const insertMenuItem = database.prepare('INSERT INTO menu_items_projection (menu_date, slot, category, recipe_id) VALUES (?, ?, ?, ?)');
  const insertTemplate = database.prepare('INSERT INTO templates_projection (name, data_json) VALUES (?, ?)');
  const upsertImage = database.prepare(`INSERT INTO template_images (folder, name, mime_type, data, relative_path, updated_at)
    VALUES (@folder, @name, @mimeType, @data, @relativePath, @updatedAt)
    ON CONFLICT(folder, name) DO UPDATE SET mime_type = excluded.mime_type, data = excluded.data, relative_path = excluded.relative_path, updated_at = excluded.updated_at`);
  const deleteImage = database.prepare('DELETE FROM template_images WHERE folder = ? AND name = ?');
  const renameImage = database.prepare('UPDATE template_images SET name = ?, relative_path = ?, updated_at = ? WHERE folder = ? AND name = ?');
  const listImages = database.prepare('SELECT folder, name, mime_type, data, relative_path, updated_at FROM template_images WHERE folder = ? ORDER BY name COLLATE NOCASE');
  const getImage = database.prepare('SELECT folder, name, mime_type, data, relative_path FROM template_images WHERE folder = ? AND name = ?');

  function imageRelativePath(folder, name, mimeType) {
    const extension = IMAGE_EXTENSIONS[String(mimeType || '').toLowerCase()] || path.extname(name) || '.img';
    const parsed = path.parse(safeImageFilename(name));
    const base = parsed.name || 'image';
    const filename = `${base}${extension}`;
    return path.posix.join('images', folder, filename);
  }

  function imageDiskPath(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/');
    if (!normalized.startsWith('images/')) throw new Error('Invalid image path.');
    return path.join(userDataPath, ...normalized.split('/'));
  }

  function writeImageFile(folder, name, mimeType, data) {
    const relativePath = imageRelativePath(folder, name, mimeType);
    const diskPath = imageDiskPath(relativePath);
    mkdirSync(path.dirname(diskPath), { recursive: true });
    writeFileSync(diskPath, data);
    return relativePath;
  }

  function migrateImageRowsToFiles() {
    const rows = database.prepare('SELECT folder, name, mime_type, data, relative_path FROM template_images').all();
    const update = database.prepare('UPDATE template_images SET relative_path = ? WHERE folder = ? AND name = ?');
    for (const row of rows) {
      if (row.relative_path && existsSync(imageDiskPath(row.relative_path))) continue;
      if (!row.data || !row.data.length) continue;
      const relativePath = writeImageFile(row.folder, row.name, row.mime_type, row.data);
      update.run(relativePath, row.folder, row.name);
    }
  }

  function loadSnapshot() {
    const snapshot = {};
    for (const key of DOCUMENT_KEYS) {
      const row = get.get(key);
      if (!row) snapshot[key] = cloneDefault(key);
      else {
        try { snapshot[key] = JSON.parse(row.value_json); }
        catch { throw new Error(`Stored ${key} document is corrupt.`); }
      }
    }
    return snapshot;
  }

  function getId(reference) {
    return typeof reference === 'string' ? reference : reference && typeof reference.id === 'string' ? reference.id : null;
  }

  function rebuildProjection(snapshot) {
    const recipes = Array.isArray(snapshot.recipes) ? snapshot.recipes : [];
    const ingredients = Array.isArray(snapshot.ingredients) ? snapshot.ingredients : [];
    const allergens = Array.isArray(snapshot.allergens) ? snapshot.allergens : [];
    const templates = snapshot.templates && typeof snapshot.templates === 'object' ? snapshot.templates : {};
    const menu = snapshot.currentMenu && typeof snapshot.currentMenu === 'object' ? snapshot.currentMenu : {};

    database.exec(`
      DELETE FROM recipe_ingredients;
      DELETE FROM ingredient_allergens;
      DELETE FROM recipe_manual_allergens;
      DELETE FROM menu_items_projection;
      DELETE FROM templates_projection;
      DELETE FROM recipes_projection;
      DELETE FROM ingredients_projection;
      DELETE FROM allergens_projection;
    `);

    const allergenIds = new Set();
    for (const allergen of allergens) {
      if (!allergen || typeof allergen.id !== 'string' || typeof allergen.name !== 'string') continue;
      insertAllergen.run({ id: allergen.id, name: allergen.name, color: allergen.color || null, dataJson: JSON.stringify(allergen) });
      allergenIds.add(allergen.id);
    }

    const ingredientIds = new Set();
    for (const ingredient of ingredients) {
      if (!ingredient || typeof ingredient.id !== 'string' || typeof ingredient.name !== 'string') continue;
      insertIngredient.run({ id: ingredient.id, name: ingredient.name, dataJson: JSON.stringify(ingredient) });
      ingredientIds.add(ingredient.id);
      for (const allergen of Array.isArray(ingredient.allergens) ? ingredient.allergens : []) {
        const allergenId = getId(allergen);
        if (allergenId && allergenIds.has(allergenId)) insertIngredientAllergen.run(ingredient.id, allergenId);
      }
    }

    const recipeIds = new Set();
    for (const recipe of recipes) {
      if (!recipe || typeof recipe.id !== 'string' || typeof recipe.name !== 'string') continue;
      insertRecipe.run({
        id: recipe.id, name: recipe.name, category: recipe.category || null, portionSize: recipe.portionSize || null,
        calories: Number.isInteger(recipe.calories) ? recipe.calories : null, instructions: recipe.instructions || null, dataJson: JSON.stringify(recipe)
      });
      recipeIds.add(recipe.id);
      for (const [position, ingredient] of (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).entries()) {
        const ingredientId = getId(ingredient);
        if (ingredientId && ingredientIds.has(ingredientId)) insertRecipeIngredient.run(recipe.id, ingredientId, position);
      }
      for (const allergen of Array.isArray(recipe.manualAllergens) ? recipe.manualAllergens : []) {
        const allergenId = getId(allergen);
        if (allergenId && allergenIds.has(allergenId)) insertRecipeAllergen.run(recipe.id, allergenId);
      }
    }

    for (const [date, slots] of Object.entries(menu)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slots || typeof slots !== 'object') continue;
      for (const [slot, item] of Object.entries(slots)) {
        if (!item || typeof item !== 'object') continue;
        const recipeId = typeof item.recipe === 'string' && recipeIds.has(item.recipe) ? item.recipe : null;
        const category = typeof item.category === 'string' ? item.category : typeof item.type === 'string' ? item.type : null;
        insertMenuItem.run(date, slot, category, recipeId);
      }
    }

    for (const [name, template] of Object.entries(templates)) {
      if (typeof template !== 'object' || template === null) continue;
      insertTemplate.run(name, JSON.stringify(template));
    }
  }

  function refreshProjection() {
    rebuildProjection(loadSnapshot());
    database.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(2, new Date().toISOString());
  }

  function saveDocument(key, value) {
    const valueJson = assertDocument(key, value);
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      upsert.run({ key, valueJson, updatedAt: timestamp });
      refreshProjection();
      audit.run({ occurredAt: timestamp, operation: 'save', documentKey: key, detailJson: JSON.stringify({ bytes: Buffer.byteLength(valueJson) }) });
    })();
  }

  function replaceCatalog(type, entries) {
    const table = CATALOG_PROJECTIONS[type];
    if (!table || !Array.isArray(entries)) throw new Error(`Invalid ${type} catalog payload.`);
    const valueJson = assertDocument(type, entries);
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      upsert.run({ key: type, valueJson, updatedAt: timestamp });
      refreshProjection();
      audit.run({
        occurredAt: timestamp,
        operation: 'catalog.replace',
        documentKey: type,
        detailJson: JSON.stringify({ records: entries.length, projection: table })
      });
    })();
  }

  function loadCatalog(type) {
    const table = CATALOG_PROJECTIONS[type];
    if (!table) throw new Error(`Unsupported catalog: ${type}`);
    return database.prepare(`SELECT data_json FROM ${table} ORDER BY id`).all().map(({ data_json }) => JSON.parse(data_json));
  }

  function upsertCatalogRecord(type, record) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || record.id.length === 0) {
      throw new Error(`Invalid ${type} record.`);
    }
    const records = loadSnapshot()[type];
    if (!Array.isArray(records)) throw new Error(`Stored ${type} catalog is invalid.`);
    const index = records.findIndex((entry) => entry && entry.id === record.id);
    if (index === -1) records.push(record);
    else records[index] = record;
    replaceCatalog(type, records);
  }

  function deleteCatalogRecord(type, id) {
    if (!CATALOG_PROJECTIONS[type] || typeof id !== 'string' || id.length === 0) {
      throw new Error(`Invalid ${type} record id.`);
    }
    const records = loadSnapshot()[type];
    if (!Array.isArray(records)) throw new Error(`Stored ${type} catalog is invalid.`);
    if (!records.some((entry) => entry && entry.id === id)) return false;
    replaceCatalog(type, records.filter((entry) => entry && entry.id !== id));
    return true;
  }

  function upsertMenuSlot(date, slot, item) {
    assertMenuSlot(date, slot, item);
    const snapshot = loadSnapshot();
    if (!snapshot.currentMenu || typeof snapshot.currentMenu !== 'object' || Array.isArray(snapshot.currentMenu)) snapshot.currentMenu = {};
    if (!snapshot.currentMenu[date] || typeof snapshot.currentMenu[date] !== 'object' || Array.isArray(snapshot.currentMenu[date])) snapshot.currentMenu[date] = {};
    snapshot.currentMenu[date][slot] = item;
    const valueJson = assertDocument('currentMenu', snapshot.currentMenu);
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      upsert.run({ key: 'currentMenu', valueJson, updatedAt: timestamp });
      refreshProjection();
      audit.run({
        occurredAt: timestamp,
        operation: 'menu.upsertSlot',
        documentKey: 'currentMenu',
        detailJson: JSON.stringify({ date, slot })
      });
    })();
  }

  function clearMenuSlot(date, slot) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid menu date.');
    if (typeof slot !== 'string' || !/^slot\d+$/.test(slot)) throw new Error('Invalid menu slot.');
    const snapshot = loadSnapshot();
    const menu = snapshot.currentMenu && typeof snapshot.currentMenu === 'object' && !Array.isArray(snapshot.currentMenu) ? snapshot.currentMenu : {};
    if (!menu[date] || typeof menu[date] !== 'object' || !Object.prototype.hasOwnProperty.call(menu[date], slot)) return false;
    delete menu[date][slot];
    if (Object.keys(menu[date]).length === 0) delete menu[date];
    const valueJson = assertDocument('currentMenu', menu);
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      upsert.run({ key: 'currentMenu', valueJson, updatedAt: timestamp });
      refreshProjection();
      audit.run({
        occurredAt: timestamp,
        operation: 'menu.clearSlot',
        documentKey: 'currentMenu',
        detailJson: JSON.stringify({ date, slot })
      });
    })();
    return true;
  }

  function upsertTemplate(name, template) {
    assertTemplate(name, template);
    const snapshot = loadSnapshot();
    if (!snapshot.templates || typeof snapshot.templates !== 'object' || Array.isArray(snapshot.templates)) snapshot.templates = {};
    snapshot.templates[name] = template;
    const valueJson = assertDocument('templates', snapshot.templates);
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      upsert.run({ key: 'templates', valueJson, updatedAt: timestamp });
      refreshProjection();
      audit.run({
        occurredAt: timestamp,
        operation: 'templates.upsert',
        documentKey: 'templates',
        detailJson: JSON.stringify({ name })
      });
    })();
  }

  function deleteTemplate(name) {
    if (typeof name !== 'string' || name.trim().length === 0) throw new Error('Invalid template name.');
    const snapshot = loadSnapshot();
    const templates = snapshot.templates && typeof snapshot.templates === 'object' && !Array.isArray(snapshot.templates) ? snapshot.templates : {};
    if (!Object.prototype.hasOwnProperty.call(templates, name)) return false;
    delete templates[name];
    const valueJson = assertDocument('templates', templates);
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      upsert.run({ key: 'templates', valueJson, updatedAt: timestamp });
      refreshProjection();
      audit.run({
        occurredAt: timestamp,
        operation: 'templates.delete',
        documentKey: 'templates',
        detailJson: JSON.stringify({ name })
      });
    })();
    return true;
  }

  function replaceSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Invalid import payload.');
    const next = loadSnapshot();
    for (const key of DOCUMENT_KEYS) if (Object.prototype.hasOwnProperty.call(snapshot, key)) next[key] = snapshot[key];
    const documents = [...DOCUMENT_KEYS].map((key) => ({ key, valueJson: assertDocument(key, next[key]) }));
    const timestamp = new Date().toISOString();
    database.transaction(() => {
      for (const document of documents) upsert.run({ ...document, updatedAt: timestamp });
      if (Array.isArray(snapshot.templateImages)) {
        database.prepare('DELETE FROM template_images').run();
        for (const image of snapshot.templateImages) {
          if (!image || typeof image !== 'object') continue;
          const data = assertImage(image.folder, image.name, image.mimeType, image.dataUrl);
          const relativePath = writeImageFile(image.folder, image.name, image.mimeType, data);
          upsertImage.run({ folder: image.folder, name: image.name, mimeType: image.mimeType, data: Buffer.alloc(0), relativePath, updatedAt: timestamp });
        }
      }
      refreshProjection();
      audit.run({ occurredAt: timestamp, operation: 'import', documentKey: null, detailJson: JSON.stringify({ documents: [...DOCUMENT_KEYS] }) });
    })();
  }

  function imageRowToDto(row, includeData = true) {
    const dto = { name: row.name, mimeType: row.mime_type, relativePath: row.relative_path || null, updatedAt: row.updated_at };
    if (includeData) {
      const data = getImageBuffer(row);
      if (data) dto.dataUrl = `data:${row.mime_type};base64,${data.toString('base64')}`;
    }
    return dto;
  }

  function getImageBuffer(row) {
    if (!row) return null;
    if (row.relative_path) {
      const diskPath = imageDiskPath(row.relative_path);
      if (existsSync(diskPath)) return readFileSync(diskPath);
    }
    return row.data && row.data.length ? row.data : null;
  }

  function saveTemplateImage(folder, name, mimeType, dataUrl) {
    const data = assertImage(folder, name, mimeType, dataUrl);
    const timestamp = new Date().toISOString();
    const relativePath = writeImageFile(folder, name, mimeType, data);
    database.transaction(() => {
      upsertImage.run({ folder, name, mimeType, data: Buffer.alloc(0), relativePath, updatedAt: timestamp });
      audit.run({ occurredAt: timestamp, operation: 'images.upsert', documentKey: null, detailJson: JSON.stringify({ folder, name, bytes: data.length }) });
    })();
    return { name, mimeType, relativePath, updatedAt: timestamp };
  }

  function listTemplateImages(folder) {
    if (!IMAGE_FOLDERS.has(folder)) throw new Error('Invalid image folder.');
    return listImages.all(folder).map((row) => imageRowToDto(row));
  }

  function getTemplateImageDataUrl(folder, name) {
    if (!IMAGE_FOLDERS.has(folder) || typeof name !== 'string') throw new Error('Invalid image.');
    const row = getImage.get(folder, name);
    const data = getImageBuffer(row);
    return row && data ? `data:${row.mime_type};base64,${data.toString('base64')}` : null;
  }

  function deleteTemplateImage(folder, name) {
    if (!IMAGE_FOLDERS.has(folder) || typeof name !== 'string') throw new Error('Invalid image.');
    const timestamp = new Date().toISOString();
    const result = database.transaction(() => {
      const row = getImage.get(folder, name);
      const deleted = deleteImage.run(folder, name);
      if (deleted.changes && row?.relative_path) {
        try { unlinkSync(imageDiskPath(row.relative_path)); } catch {}
      }
      audit.run({ occurredAt: timestamp, operation: 'images.delete', documentKey: null, detailJson: JSON.stringify({ folder, name, deleted: deleted.changes }) });
      return deleted;
    })();
    return result.changes > 0;
  }

  function renameTemplateImage(folder, oldName, newName) {
    if (!IMAGE_FOLDERS.has(folder) || typeof oldName !== 'string' || typeof newName !== 'string') throw new Error('Invalid image.');
    const cleanName = safeImageFilename(newName.trim());
    if (!cleanName) throw new Error('Image name is required.');
    if (getImage.get(folder, cleanName)) throw new Error('An image with that name already exists.');
    const timestamp = new Date().toISOString();
    return database.transaction(() => {
      const row = getImage.get(folder, oldName);
      if (!row) throw new Error('Image not found.');
      const data = getImageBuffer(row);
      const relativePath = imageRelativePath(folder, cleanName, row.mime_type);
      if (row.relative_path && existsSync(imageDiskPath(row.relative_path))) {
        mkdirSync(path.dirname(imageDiskPath(relativePath)), { recursive: true });
        renameSync(imageDiskPath(row.relative_path), imageDiskPath(relativePath));
      } else if (data) {
        writeFileSync(imageDiskPath(relativePath), data);
      }
      renameImage.run(cleanName, relativePath, timestamp, folder, oldName);
      audit.run({ occurredAt: timestamp, operation: 'images.rename', documentKey: null, detailJson: JSON.stringify({ folder, oldName, newName: cleanName }) });
      return { name: cleanName, mimeType: row.mime_type, relativePath, updatedAt: timestamp };
    })();
  }

  function exportTemplateImages() {
    return database.prepare('SELECT folder, name, mime_type, data, relative_path, updated_at FROM template_images ORDER BY folder, name COLLATE NOCASE')
      .all()
      .map((row) => ({ folder: row.folder, ...imageRowToDto(row) }));
  }

  function getImportSummary(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Invalid import payload.');
    const count = (key) => Array.isArray(snapshot[key]) ? snapshot[key].length : 0;
    const menuDates = snapshot.currentMenu && typeof snapshot.currentMenu === 'object' ? Object.keys(snapshot.currentMenu).length : 0;
    const templates = snapshot.templates && typeof snapshot.templates === 'object' ? Object.keys(snapshot.templates).length : 0;
    const images = Array.isArray(snapshot.templateImages) ? snapshot.templateImages.length : 0;
    return { recipes: count('recipes'), ingredients: count('ingredients'), allergens: count('allergens'), menuDates, templates, images };
  }

  function getDataHealth() {
    const snapshot = loadSnapshot();
    const issues = [];
    const recipes = Array.isArray(snapshot.recipes) ? snapshot.recipes : [];
    const ingredients = Array.isArray(snapshot.ingredients) ? snapshot.ingredients : [];
    const allergens = Array.isArray(snapshot.allergens) ? snapshot.allergens : [];
    const templates = snapshot.templates && typeof snapshot.templates === 'object' ? snapshot.templates : {};
    const menu = snapshot.currentMenu && typeof snapshot.currentMenu === 'object' ? snapshot.currentMenu : {};
    const recipeIds = new Set(recipes.map((recipe) => recipe?.id).filter(Boolean));
    const ingredientIds = new Set(ingredients.map((ingredient) => ingredient?.id).filter(Boolean));
    const allergenIds = new Set(allergens.map((allergen) => allergen?.id).filter(Boolean));

    recipes.forEach((recipe, index) => {
      if (!recipe?.id || !recipe?.name) issues.push({ level: 'error', area: 'recipes', message: `Recipe ${index + 1} is missing an id or name.` });
      for (const ingredient of Array.isArray(recipe?.ingredients) ? recipe.ingredients : []) {
        const id = getId(ingredient);
        if (id && !ingredientIds.has(id)) issues.push({ level: 'warn', area: 'recipes', message: `Recipe "${recipe.name || recipe.id}" references a missing ingredient.` });
      }
      for (const allergen of Array.isArray(recipe?.manualAllergens) ? recipe.manualAllergens : []) {
        const id = getId(allergen);
        if (id && !allergenIds.has(id)) issues.push({ level: 'warn', area: 'recipes', message: `Recipe "${recipe.name || recipe.id}" references a missing allergen.` });
      }
    });

    for (const [date, slots] of Object.entries(menu)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) issues.push({ level: 'warn', area: 'menu', message: `Menu date "${date}" is not valid.` });
      for (const [slot, item] of Object.entries(slots || {})) {
        if (!/^slot\d+$/.test(slot)) issues.push({ level: 'warn', area: 'menu', message: `Menu slot "${slot}" is not valid.` });
        if (typeof item?.recipe === 'string' && !recipeIds.has(item.recipe)) issues.push({ level: 'warn', area: 'menu', message: `Menu slot ${date} ${slot} references a missing recipe.` });
      }
    }

    for (const [name, template] of Object.entries(templates)) {
      if (!template || typeof template !== 'object') issues.push({ level: 'warn', area: 'templates', message: `Template "${name}" is not valid.` });
      for (const block of Array.isArray(template?.editorBlocks) ? template.editorBlocks : []) {
        if (block?.type === 'image' && block.style?.imageName && !getImage.get(block.style.imageFolder || 'template-objects', block.style.imageName)) {
          issues.push({ level: 'warn', area: 'templates', message: `Template "${name}" references a missing image "${block.style.imageName}".` });
        }
      }
    }

    return { ok: issues.length === 0, issues, counts: getImportSummary({ ...snapshot, templateImages: exportTemplateImages() }) };
  }

  function getProjectionStats() {
    const tables = ['recipes_projection', 'ingredients_projection', 'allergens_projection', 'recipe_ingredients', 'ingredient_allergens', 'recipe_manual_allergens', 'menu_items_projection', 'templates_projection', 'template_images'];
    return Object.fromEntries(tables.map((table) => [table, database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  }

  function getIntegrityReport() {
    const rows = database.prepare('PRAGMA integrity_check').all();
    const messages = rows.map((row) => row.integrity_check || Object.values(row)[0]).filter(Boolean);
    return {
      ok: messages.length === 1 && messages[0] === 'ok',
      messages
    };
  }

  function createBackupZip(filePath) {
    const AdmZip = require('adm-zip');
    const data = { ...loadSnapshot(), templateImages: exportTemplateImages(), exportDate: new Date().toISOString() };
    const zip = new AdmZip();
    const manifest = { ...data, templateImages: data.templateImages.map(({ dataUrl, ...image }) => image) };
    zip.addFile('backup.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
    for (const image of data.templateImages) {
      if (!image.relativePath || !image.dataUrl) continue;
      const base64 = image.dataUrl.split(',')[1];
      if (base64) zip.addFile(image.relativePath.replace(/\\/g, '/'), Buffer.from(base64, 'base64'));
    }
    zip.writeZip(filePath);
    return verifyBackupZip(filePath);
  }

  function verifyBackupZip(filePath) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const manifestEntry = zip.getEntry('backup.json');
    if (!manifestEntry) throw new Error('Backup verification failed: missing backup.json.');
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    const summary = getImportSummary(manifest);
    for (const image of Array.isArray(manifest.templateImages) ? manifest.templateImages : []) {
      if (image.relativePath && !zip.getEntry(image.relativePath.replace(/\\/g, '/'))) {
        throw new Error(`Backup verification failed: missing image ${image.relativePath}.`);
      }
    }
    return { filePath, summary };
  }

  function createRequiredBackup(reason = 'backup') {
    const backupDir = path.join(userDataPath, 'auto-backups');
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeReason = String(reason || 'backup').replace(/[^a-z0-9_-]/gi, '-').slice(0, 32);
    const filePath = path.join(backupDir, `dms-auto-${safeReason}-${stamp}.zip`);
    return createBackupZip(filePath);
  }

  function createAutoBackup(reason = 'close') {
    const snapshot = loadSnapshot();
    const settings = snapshot.appSettings && typeof snapshot.appSettings === 'object' ? snapshot.appSettings : {};
    const limit = Number.isInteger(settings.autoBackupLimit) ? Math.max(0, settings.autoBackupLimit) : DEFAULT_AUTO_BACKUP_LIMIT;
    if (limit <= 0) return null;

    const backupDir = path.join(userDataPath, 'auto-backups');
    const backup = createRequiredBackup(reason);

    const backups = readdirSync(backupDir)
      .filter((name) => /^dms-auto-.*\.zip$/i.test(name))
      .map((name) => ({ name, path: path.join(backupDir, name) }))
      .sort((a, b) => b.name.localeCompare(a.name));
    for (const backup of backups.slice(limit)) rmSync(backup.path, { force: true });
    return backup;
  }

  function close() {
    database.close();
  }

  migrateImageRowsToFiles();
  database.transaction(refreshProjection)();

  return {
    clearMenuSlot,
    close,
    deleteTemplate,
    deleteTemplateImage,
    deleteCatalogRecord,
    createAutoBackup,
    createBackupZip,
    createRequiredBackup,
    exportTemplateImages,
    getDataHealth,
    getImportSummary,
    getIntegrityReport,
    getProjectionStats,
    verifyBackupZip,
    getTemplateImageDataUrl,
    listTemplateImages,
    renameTemplateImage,
    loadCatalog,
    loadSnapshot,
    replaceCatalog,
    replaceSnapshot,
    saveDocument,
    saveTemplateImage,
    upsertCatalogRecord,
    upsertTemplate,
    upsertMenuSlot
  };
}

module.exports = { createDesktopDatabase };

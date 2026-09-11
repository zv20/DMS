const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDesktopDatabase } = require('./storage.cjs');

function runStorageProjectionTest() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dms-sqlite-test-'));
  let storage;
  try {
    storage = createDesktopDatabase(directory);
    assert.deepEqual(storage.getImportSummary({ recipes: [{ id: 'x' }], currentMenu: { '2026-09-10': {} }, templates: { Basic: {} } }), {
      recipes: 1, ingredients: 0, allergens: 0, menuDates: 1, templates: 1, images: 0
    });
    storage.replaceSnapshot({
      allergens: [{ id: 'alg-milk', name: 'Milk', color: '#fff' }],
      ingredients: [{ id: 'ing-cheese', name: 'Cheese', allergens: ['alg-milk'] }],
      recipes: [{ id: 'recipe-toast', name: 'Toast', category: 'main', ingredients: [{ id: 'ing-cheese' }], manualAllergens: [{ id: 'alg-milk' }] }],
      currentMenu: { '2026-09-10': { slot1: { category: 'main', recipe: 'recipe-toast' } } },
      templates: { Classic: { headerText: 'Menu' } },
      menuHistory: [{ id: 'menu-1', name: 'Saved week', data: '{}' }],
      appSettings: { language: 'bg' }
    });
    assert.deepEqual(storage.getProjectionStats(), {
      recipes_projection: 1, ingredients_projection: 1, allergens_projection: 1, recipe_ingredients: 1,
      ingredient_allergens: 1, recipe_manual_allergens: 1, menu_items_projection: 1, templates_projection: 1, template_images: 0
    });
    assert.equal(storage.loadCatalog('recipes')[0].id, 'recipe-toast');
    storage.replaceCatalog('ingredients', [{ id: 'ing-bread', name: 'Bread', allergens: [] }]);
    assert.equal(storage.loadCatalog('ingredients')[0].name, 'Bread');
    assert.equal(storage.getProjectionStats().recipe_ingredients, 0);
    storage.upsertCatalogRecord('recipes', { id: 'recipe-soup', name: 'Soup', ingredients: [] });
    assert.equal(storage.loadCatalog('recipes').length, 2);
    assert.equal(storage.deleteCatalogRecord('recipes', 'recipe-soup'), true);
    assert.equal(storage.loadCatalog('recipes').length, 1);
    storage.upsertCatalogRecord('allergens', { id: 'alg-gluten', name: 'Gluten' });
    storage.upsertCatalogRecord('ingredients', { id: 'ing-pasta', name: 'Pasta', allergens: ['alg-gluten'] });
    assert.equal(storage.getProjectionStats().ingredient_allergens, 1);
    assert.equal(storage.deleteCatalogRecord('allergens', 'alg-gluten'), true);
    assert.equal(storage.getProjectionStats().ingredient_allergens, 0);
    storage.upsertMenuSlot('2026-09-11', 'slot2', { type: 'main', recipe: 'recipe-toast' });
    assert.equal(storage.getProjectionStats().menu_items_projection, 2);
    assert.equal(storage.loadSnapshot().currentMenu['2026-09-11'].slot2.recipe, 'recipe-toast');
    assert.equal(storage.clearMenuSlot('2026-09-11', 'slot2'), true);
    assert.equal(storage.getProjectionStats().menu_items_projection, 1);
    assert.equal(storage.loadSnapshot().currentMenu['2026-09-11'], undefined);
    storage.upsertTemplate('Weekly', { headerText: 'Weekly menu' });
    assert.equal(storage.getProjectionStats().templates_projection, 2);
    assert.equal(storage.loadSnapshot().templates.Weekly.headerText, 'Weekly menu');
    assert.equal(storage.deleteTemplate('Weekly'), true);
    assert.equal(storage.getProjectionStats().templates_projection, 1);
    assert.equal(storage.loadSnapshot().menuHistory[0].name, 'Saved week');
    const imageDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    storage.saveTemplateImage('backgrounds', 'test.png', 'image/png', imageDataUrl);
    assert.equal(storage.getProjectionStats().template_images, 1);
    assert.equal(storage.listTemplateImages('backgrounds')[0].name, 'test.png');
    assert.equal(storage.getTemplateImageDataUrl('backgrounds', 'test.png'), imageDataUrl);
    assert.equal(storage.exportTemplateImages()[0].dataUrl, imageDataUrl);
    assert.equal(storage.deleteTemplateImage('backgrounds', 'test.png'), true);
    assert.equal(storage.getProjectionStats().template_images, 0);
    storage.saveDocument('menuHistory', [{ id: 'menu-2', name: 'Second saved week', data: '{}' }]);
    assert.equal(storage.loadSnapshot().menuHistory[0].id, 'menu-2');
    assert.equal(storage.loadSnapshot().recipes[0].name, 'Toast');
  } finally {
    if (storage) storage.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { runStorageProjectionTest };

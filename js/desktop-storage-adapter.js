// SQLite storage adapter for the Windows desktop app.
(function(window) {
  if (!window.dmsDesktop || !window.dmsDesktop.storage) return;

  class DesktopStorageAdapter {
    constructor() {
      this.isDesktop = true;
      this.writeQueue = Promise.resolve();
      console.log('Storage Mode: Desktop SQLite');
    }

    async init() { this.applySnapshot(await window.dmsDesktop.storage.load()); return true; }

    applySnapshot(snapshot) {
      window.recipes = snapshot.recipes || [];
      window.ingredients = snapshot.ingredients || [];
      window.allergens = snapshot.allergens || [];
      window.currentMenu = snapshot.currentMenu || {};
      window.appSettings = { language: 'bg', theme: 'default', autoBackupLimit: 3, ...(snapshot.appSettings || {}) };
      window.menuTemplates = window.mergeBuiltInMenuTemplates
        ? window.mergeBuiltInMenuTemplates(snapshot.templates)
        : (snapshot.templates || {});
      window.menuHistory = snapshot.menuHistory || [];
    }

    async save(type, data) {
      return this.enqueueWrite(() => {
        if (type === 'recipes') return window.dmsDesktop.catalog.recipes.replace(data);
        if (type === 'ingredients') return window.dmsDesktop.catalog.ingredients.replace(data);
        if (type === 'allergens') return window.dmsDesktop.catalog.allergens.replace(data);
        if (['currentMenu', 'appSettings', 'templates', 'menuHistory'].includes(type)) return window.dmsDesktop.storage.save(type, data);
        throw new Error(`Unsupported desktop document: ${type}`);
      });
    }

    enqueueWrite(operation) {
      this.writeQueue = this.writeQueue.then(operation, operation);
      return this.writeQueue;
    }

    async upsert(type, record) {
      if (!window.dmsDesktop.catalog[type]) throw new Error(`Unsupported desktop catalog: ${type}`);
      return this.enqueueWrite(() => window.dmsDesktop.catalog[type].upsert(record));
    }

    async delete(type, id) {
      if (!window.dmsDesktop.catalog[type]) throw new Error(`Unsupported desktop catalog: ${type}`);
      return this.enqueueWrite(() => window.dmsDesktop.catalog[type].delete(id));
    }

    async upsertMenuSlot(date, slot, item) { return this.enqueueWrite(() => window.dmsDesktop.menu.upsertSlot(date, slot, item)); }
    async clearMenuSlot(date, slot) { return this.enqueueWrite(() => window.dmsDesktop.menu.clearSlot(date, slot)); }
    async upsertTemplate(name, template) { return this.enqueueWrite(() => window.dmsDesktop.templates.upsert(name, template)); }
    async deleteTemplate(name) { return this.enqueueWrite(() => window.dmsDesktop.templates.delete(name)); }

    async exportData() { return window.dmsDesktop.storage.export(); }

    async importData(file) {
      try {
        this.applySnapshot(await window.dmsDesktop.storage.import(JSON.parse(await file.text())));
        return true;
      } catch (error) {
        console.error('Desktop import failed:', error);
        return false;
      }
    }

    async chooseImport() { return window.dmsDesktop.storage.chooseImport(); }

    async applyImport(importId) {
      this.applySnapshot(await window.dmsDesktop.storage.applyImport(importId));
      return true;
    }
  }

  window.storageAdapter = new DesktopStorageAdapter();
})(window);

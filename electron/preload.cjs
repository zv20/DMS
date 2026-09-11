const { contextBridge, ipcRenderer } = require('electron');

// Keep this bridge intentionally small. New capabilities must be explicit,
// input-validated in the main process, and documented in the IPC contract.
contextBridge.exposeInMainWorld('dmsDesktop', Object.freeze({
  getRuntimeInfo: () => ipcRenderer.invoke('desktop:get-runtime-info'),
  storage: Object.freeze({
    load: () => ipcRenderer.invoke('desktop:storage:load'),
    save: (type, value) => ipcRenderer.invoke('desktop:storage:save', type, value),
    import: (snapshot) => ipcRenderer.invoke('desktop:storage:import', snapshot),
    export: () => ipcRenderer.invoke('desktop:storage:export'),
    chooseImport: () => ipcRenderer.invoke('desktop:storage:choose-import'),
    applyImport: (importId) => ipcRenderer.invoke('desktop:storage:apply-import', importId)
  }),
  catalog: Object.freeze({
    recipes: Object.freeze({
      list: () => ipcRenderer.invoke('desktop:recipes:list'),
      replace: (entries) => ipcRenderer.invoke('desktop:recipes:replace', entries),
      upsert: (record) => ipcRenderer.invoke('desktop:recipes:upsert', record),
      delete: (id) => ipcRenderer.invoke('desktop:recipes:delete', id)
    }),
    ingredients: Object.freeze({
      list: () => ipcRenderer.invoke('desktop:ingredients:list'),
      replace: (entries) => ipcRenderer.invoke('desktop:ingredients:replace', entries),
      upsert: (record) => ipcRenderer.invoke('desktop:ingredients:upsert', record),
      delete: (id) => ipcRenderer.invoke('desktop:ingredients:delete', id)
    }),
    allergens: Object.freeze({
      list: () => ipcRenderer.invoke('desktop:allergens:list'),
      replace: (entries) => ipcRenderer.invoke('desktop:allergens:replace', entries),
      upsert: (record) => ipcRenderer.invoke('desktop:allergens:upsert', record),
      delete: (id) => ipcRenderer.invoke('desktop:allergens:delete', id)
    })
  }),
  menu: Object.freeze({
    upsertSlot: (date, slot, item) => ipcRenderer.invoke('desktop:menu:upsert-slot', date, slot, item),
    clearSlot: (date, slot) => ipcRenderer.invoke('desktop:menu:clear-slot', date, slot)
  }),
  templates: Object.freeze({
    upsert: (name, template) => ipcRenderer.invoke('desktop:templates:upsert', name, template),
    delete: (name) => ipcRenderer.invoke('desktop:templates:delete', name)
  }),
  images: Object.freeze({
    list: (folder) => ipcRenderer.invoke('desktop:images:list', folder),
    save: (folder, image) => ipcRenderer.invoke('desktop:images:save', folder, image),
    delete: (folder, name) => ipcRenderer.invoke('desktop:images:delete', folder, name),
    getDataUrl: (folder, name) => ipcRenderer.invoke('desktop:images:get-data-url', folder, name)
  }),
  print: Object.freeze({
    menu: (payload) => ipcRenderer.invoke('desktop:print-menu', payload)
  }),
  updates: Object.freeze({
    getStatus: () => ipcRenderer.invoke('desktop:updates:get-status'),
    check: () => ipcRenderer.invoke('desktop:updates:check'),
    download: () => ipcRenderer.invoke('desktop:updates:download'),
    install: () => ipcRenderer.invoke('desktop:updates:install')
  })
}));

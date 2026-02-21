/**
 * Demo Mode — GitHub Pages only
 * Loaded AFTER storage-adapter.js, BEFORE store.js.
 *
 * What it does:
 *  1. Overrides storageAdapter.init() — fetches data/data.json, data/menus.json,
 *     data/templates.json via plain HTTP fetch (works in every browser).
 *  2. Overrides all save/write functions to be memory-only.
 *  3. Skips the folder-picker splash and launches straight into the app.
 *
 * Why storageAdapter.init() and not window.checkPreviousFolder?
 *  store.js redefines window.checkPreviousFolder AFTER this script runs,
 *  overwriting our version. store.js's checkPreviousFolder calls
 *  storageAdapter.init() — so we patch that instead. It runs first, every time.
 *
 * Merging main → demo:
 *  Only index.html needs a trivial conflict resolve (keep the <script> tag).
 *  This file is never touched during that merge.
 */
(function(window) {
    'use strict';

    // ── 1. Tell the rest of the app we are in demo mode ──────────────────────
    window.DEMO_MODE = true;

    // ── 2. Patch storageAdapter right now (it exists synchronously) ────────────
    //
    // storageAdapter.init() is the function store.js calls inside
    // window.checkPreviousFolder. By replacing it here we intercept
    // the entire storage bootstrap before any real File API / IndexedDB work.

    window.storageAdapter.init = async function() {
        console.log('🎬 Demo mode: loading data from static files...');

        try {
            // --- data.json (recipes, ingredients, allergens) ---
            const dataResp = await fetch('data/data.json');
            if (dataResp.ok) {
                const parsed = await dataResp.json();
                window.recipes     = parsed.recipes     || [];
                window.ingredients = parsed.ingredients || [];
                window.allergens   = parsed.allergens   || [];
                console.log('✅ Demo: loaded data.json —',
                    window.recipes.length, 'recipes,',
                    window.ingredients.length, 'ingredients,',
                    window.allergens.length, 'allergens');
            } else {
                window.recipes = []; window.ingredients = []; window.allergens = [];
                console.warn('⚠️ Demo: data.json not found, starting empty');
            }

            // --- menus.json ---
            const menuResp = await fetch('data/menus.json');
            if (menuResp.ok) {
                window.currentMenu = await menuResp.json();
                console.log('✅ Demo: loaded menus.json');
            } else {
                window.currentMenu = {};
                console.warn('⚠️ Demo: menus.json not found');
            }

            // --- templates.json ---
            const tplResp = await fetch('data/templates.json');
            if (tplResp.ok) {
                window.menuTemplates = await tplResp.json();
                console.log('✅ Demo: loaded templates.json —',
                    Object.keys(window.menuTemplates).length, 'templates');
            } else {
                window.menuTemplates = {};
                console.warn('⚠️ Demo: templates.json not found');
            }

            // Keep language from settings if set, otherwise default to bg
            window.appSettings = window.appSettings || {};
            if (!window.appSettings.language) window.appSettings.language = 'bg';

            return true; // tells splash: data ready, skip folder picker
        } catch (err) {
            console.error('❌ Demo mode fetch error:', err);
            window.recipes = []; window.ingredients = []; window.allergens = [];
            window.currentMenu = {}; window.menuTemplates = {};
            window.appSettings = { language: 'bg' };
            return true; // still return true so app opens
        }
    };

    // ── 3. Patch all write functions to memory-only ───────────────────────────
    window.storageAdapter.save             = async function(type) {
        console.log(`🎬 Demo: save('${type}') → memory only`);
    };
    window.storageAdapter.saveToFileSystem = async function() {};
    window.storageAdapter.saveToIndexedDB  = async function() {};
    window.storageAdapter.useFileSystem    = false; // hides folder-change button

    // selectSaveLocation is defined in store.js (after this script),
    // so we override it via a DOMContentLoaded-safe approach —
    // by the time it's called by the user it will already be overwritten.
    // We also set it now as a safety net.
    window.selectSaveLocation = async function() {
        console.log('🎬 Demo mode: folder selection disabled');
        return false;
    };
    // store.js will redefine selectSaveLocation — patch it again after load
    window.addEventListener('load', function() {
        window.selectSaveLocation = async function() {
            console.log('🎬 Demo mode: folder selection disabled');
            return false;
        };
    });

    // ── 4. UI tweaks after DOM is ready ─────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function() {
        // Hide storage management buttons that don't apply in demo
        ['btn-change-folder', 'btn-import', 'btn-export'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Replace storage info banner
        const info = document.getElementById('storage-method-text');
        if (info) {
            info.innerHTML = '<strong>🎬 Demo Mode</strong><br>Data is pre-loaded from the repository. Changes work during your session but reset on page refresh.';
        }

        console.log('🎬 Demo mode active — memory-only session, all browsers supported');
    });

})(window);

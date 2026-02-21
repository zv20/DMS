/**
 * Demo Mode — GitHub Pages only
 * Loaded AFTER storage-adapter.js, BEFORE store.js.
 *
 * What it does:
 *  1. Fetches data/data.json, data/menus.json, data/templates.json
 *     via plain HTTP fetch (works in every browser — no File API, no IndexedDB).
 *  2. Overrides all save/write functions to be memory-only
 *     (changes work during the session but reset on refresh — perfect for a demo).
 *  3. Patches checkPreviousFolder() so the splash screen skips the
 *     folder-picker step and goes straight into the app.
 *
 * Merging main → demo:
 *  Only index.html needs a trivial conflict resolve (keep the <script> tag below).
 *  This file and storage-adapter.js are never touched during that merge.
 */
(function(window) {
    'use strict';

    // ── 1. Tell the rest of the app we are in demo mode ──────────────────────
    window.DEMO_MODE = true;

    // ── 2. Override checkPreviousFolder ──────────────────────────────────────
    // main.js calls this during the splash. Returning true means
    // "data is ready, skip the folder picker and launch the app".
    window.checkPreviousFolder = async function() {
        console.log('🎬 Demo mode: loading data from static files...');

        try {
            // --- data.json (recipes, ingredients, allergens) ---
            const dataResp = await fetch('data/data.json');
            if (dataResp.ok) {
                const parsed = await dataResp.json();
                window.recipes     = parsed.recipes     || [];
                window.ingredients = parsed.ingredients || [];
                window.allergens   = parsed.allergens   || [];
                console.log('✅ Demo: loaded data.json',
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
                console.warn('⚠️ Demo: menus.json not found, starting empty');
            }

            // --- templates.json ---
            const tplResp = await fetch('data/templates.json');
            if (tplResp.ok) {
                window.menuTemplates = await tplResp.json();
                console.log('✅ Demo: loaded templates.json',
                    Object.keys(window.menuTemplates).length, 'templates');
            } else {
                window.menuTemplates = {};
                console.warn('⚠️ Demo: templates.json not found, starting empty');
            }

            // Default settings
            window.appSettings = { language: 'bg' };

            return true; // tell the splash: data ready, launch the app
        } catch (err) {
            console.error('❌ Demo mode fetch error:', err);
            // Fallback to empty state so app still opens
            window.recipes = []; window.ingredients = []; window.allergens = [];
            window.currentMenu = {}; window.menuTemplates = {};
            window.appSettings = { language: 'bg' };
            return true;
        }
    };

    // ── 3. Override selectSaveLocation ───────────────────────────────────────
    // Called if user somehow hits "Select Folder" — just no-op in demo.
    window.selectSaveLocation = async function() {
        console.log('🎬 Demo mode: selectSaveLocation is disabled');
        return false;
    };

    // ── 4. Override all write/save functions to memory-only ──────────────────
    // The storageAdapter.save() is the single funnel for all persistence.
    // We replace it with a no-op so nothing tries to touch the File API or IndexedDB.
    // The in-memory window.recipes / window.currentMenu etc. are already updated
    // by store.js before save() is called, so the UI stays fully functional.

    // Wait for storageAdapter to exist (it's created synchronously at the bottom
    // of storage-adapter.js, so it's available immediately), then patch it.
    const _patch = function() {
        if (!window.storageAdapter) {
            // Shouldn't happen since this script loads after storage-adapter.js,
            // but guard just in case.
            setTimeout(_patch, 50);
            return;
        }
        window.storageAdapter.save = async function(type, data) {
            // Memory only — no File API, no IndexedDB writes in demo
            console.log(`🎬 Demo mode: save('${type}') → memory only`);
        };
        window.storageAdapter.saveToFileSystem = async function() {};
        window.storageAdapter.saveToIndexedDB  = async function() {};
        window.storageAdapter.useFileSystem    = false; // hide the folder-change button
        console.log('🎬 Demo mode: storageAdapter write functions patched to memory-only');
    };
    _patch();

    // ── 5. Hide settings buttons that make no sense in demo ──────────────────
    document.addEventListener('DOMContentLoaded', () => {
        // Hide "Change Storage Folder" and "Import Data" buttons in Settings
        const hideIds = ['btn-change-folder', 'btn-import', 'btn-export'];
        hideIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Update storage info banner to say Demo Mode
        const info = document.getElementById('storage-method-text');
        if (info) {
            info.innerHTML = '<strong>🎬 Demo Mode</strong><br>Data is loaded from the repository. Changes work during your session but reset on page refresh.';
        }

        console.log('🎬 Demo mode active — read-only session, all browsers supported');
    });

})(window);

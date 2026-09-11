/**
 * Template Manager - Main Entry Point
 * 
 * This is a thin wrapper that loads all template modules.
 * The actual implementation is split across files in js/template/
 * 
 * Architecture:
 * - template-core.js: Main initialization and lifecycle
 * - template-sections.js: Collapsible UI sections renderer
 * - template-defaults.js: Default settings and value setters
 * - template-settings.js: Settings collection from UI
 * - template-images.js: Image upload and gallery management
 * - template-library.js: Saved template CRUD operations
 * - template-presets.js: Preset template handling
 */

// All modules are loaded via <script> tags in index.html
// This file simply ensures initialization happens at the right time

(function(window) {
    'use strict';
    
    // Wait for DOM and ensure all dependencies are loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTemplateManager);
    } else {
        initializeTemplateManager();
    }
    
    function initializeTemplateManager() {
        // Verify all modules are loaded
        if (!window.TemplateManager) {
            console.error('❌ TemplateManager not found! Ensure all template modules are loaded.');
            return;
        }
        
        // Initialize only if we're on the template builder page
        if (document.getElementById('collapsibleSections')) {
            console.log('🎨 Initializing Template Manager...');
            window.TemplateManager.init();
        }
    }
    
})(window);

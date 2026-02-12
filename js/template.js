/**
 * Advanced Template Manager - COMPLETE IMPLEMENTATION
 * 20+ customization features with full rendering support
 * 
 * NEW FEATURES:
 * - Layout: Page margins, spacing controls, padding options
 * - Typography: Font families, line height, text alignment, transforms  
 * - Visual: Logo upload, shadows, customizable separators
 * - Content: Date range styling, meal numbering options
 * - Background: Opacity, positioning, overlays, multiple images
 * - Borders: Outer page borders, selective sides, corner styles
 */

(function(window) {
    let activeTemplateId = null;
    let selectedWeekStart = null;
    let presetsExpanded = false;
    
    // Track which sections are expanded
    const sectionStates = {
        presets: false,
        layout: true,
        background: true,
        branding: false,
        header: true,
        dateRange: false,
        dayBlock: false,
        dayName: false,
        mealTitle: false,
        mealNumbering: false,
        ingredients: false,
        mealVisibility: false,
        separators: false,
        footer: false,
        pageBorder: false
    };

    const TemplateManager = {
        // Load presets from external file (template-presets.js)
        presets: window.DMSPresets || [],

        init: function() {
            console.log('🎪 Enhanced Template Manager init() - ' + this.presets.length + ' presets loaded');
            
            this.loadActiveTemplate();
            this.renderPresetTemplates();  // ✅ NEW: Render presets
            this.renderCollapsibleSections();
            this.bindImageUpload();
            this.bindLogoUpload();
            this.renderTemplateLibrary();
            this.refreshPreview();
            
            window.addEventListener('dataLoaded', (e) => {
                console.log('🔄 dataLoaded event - refreshing');
                this.renderTemplateLibrary();
                this.renderUploadsGallery();
            });
        },

        // ✅ NEW: Render preset templates in the builder menu
        renderPresetTemplates: function() {
            const container = document.getElementById('presetTemplatesContainer');
            if (!container) return;

            container.innerHTML = '';

            this.presets.forEach(preset => {
                const card = document.createElement('div');
                card.style.cssText = 'border: 2px solid #dee2e6; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: white; cursor: pointer; transition: all 0.2s;';
                
                card.onmouseenter = () => card.style.borderColor = 'var(--color-primary)';
                card.onmouseleave = () => card.style.borderColor = '#dee2e6';

                const title = document.createElement('div');
                title.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #333;';
                title.textContent = preset.nameKey || 'Template';

                card.appendChild(title);
                card.onclick = () => this.applyPresetTemplate(preset);
                container.appendChild(card);
            });
        },

        applyPresetTemplate: async function(preset) {
            console.log('🎨 Applying preset template:', preset.nameKey);
            await this.applyTemplateToUI(preset);
            activeTemplateId = 'default';
            localStorage.setItem('activeTemplateId', 'default');
            this.renderTemplateLibrary();
            alert('Preset template "' + preset.nameKey + '" loaded!');
        },
/**
 * Template Core Module
 * Main entry point and coordination for the template system
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;
    
    let activeTemplateId = null;
    let selectedWeekStart = null;
    let isBound = false; // Track if UI is already bound
    
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
        presets: window.DMSPresets || [],

        init: function() {
            console.log('🎪 Enhanced Template Manager init()');
            console.log('📋 Loaded presets:', this.presets.length);
            
            this.loadActiveTemplate();
            window.TemplatePresets.render(this.presets, this.applyPresetTemplate.bind(this));
            window.TemplateSections.render(sectionStates, this);
            window.TemplateImages.bindImageUpload(this);
            window.TemplateImages.bindLogoUpload(this);
            this.renderTemplateLibrary();
            this.refreshPreview();
            
            window.addEventListener('dataLoaded', (e) => {
                console.log('🔄 dataLoaded event - refreshing');
                this.renderTemplateLibrary();
                window.TemplateImages.renderUploadsGallery(this);
            });
        },

        applyPresetTemplate: async function(preset) {
            console.log('🎨 Applying preset template:', preset.nameKey);
            await this.applyTemplateToUI(preset);
            activeTemplateId = 'default';
            localStorage.setItem('activeTemplateId', 'default');
            this.renderTemplateLibrary();
            alert(window.t('alert_preset_loaded') || 'Preset template loaded!');
        },

        loadActiveTemplate: function() {
            const stored = localStorage.getItem('activeTemplateId');
            if (stored && stored !== 'default') {
                const tmpl = window.savedTemplates.find(t => t.id === stored);
                if (tmpl) {
                    activeTemplateId = stored;
                    this.applyTemplateToUI(tmpl);
                    return;
                }
            }
            window.TemplateDefaults.apply(this);
        },

        applyTemplateToUI: async function(template) {
            await window.TemplateLoader.applyToUI(template, this);
            this.refreshPreview();
        },

        bindUI: function() {
            // FIXED: Only bind once to prevent duplicate listeners
            if (isBound) {
                console.log('⚠️ UI already bound, skipping');
                return;
            }
            
            console.log('🔗 Binding UI listeners (one-time)');
            
            // FIXED: Added layoutStyle to the list
            const inputs = ['layoutStyle', 'headerText', 'headerColor', 'headerSize', 'headerWeight', 'headerFont', 'headerAlign', 'headerTransform',
                           'dayBg', 'dayRadius', 'dayBorderWidth', 'dayBorderColor', 'dayBorderStyle', 'dayBorderSides', 'dayShadow',
                           'dayNameSize', 'dayNameColor', 'dayNameWeight',
                           'mealTitleSize', 'mealTitleColor', 'mealTitleWeight',
                           'mealNumberStyle', 'mealNumberPrefix', 'mealNumberSuffix',
                           'ingredientsSize', 'ingredientsColor', 'ingredientsStyle',
                           'footerSize', 'footerColor', 'backgroundImage', 'footerText',
                           'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'dayBlockSpacing', 'columnGap',
                           'dateRangeSize', 'dateRangeColor', 'dateRangeWeight',
                           'bgPosition', 'bgOverlay',
                           'logoImage', 'logoPosition', 'logoWidth', 'logoHeight',
                           'headerSepStyle', 'headerSepColor', 'headerSepWidth',
                           'footerSepStyle', 'footerSepColor', 'footerSepWidth',
                           'pageBorderWidth', 'pageBorderColor', 'pageBorderStyle', 'pageBorderRadius'];
            
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', () => this.refreshPreview());
                    el.addEventListener('change', () => this.refreshPreview()); // Also listen to change for dropdowns
                }
            });

            const checkboxes = ['showDateRange', 'headerSepEnabled', 'footerSepEnabled', 'pageBorderEnabled'];
            checkboxes.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', () => this.refreshPreview());
            });

            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
                ['showIngredients', 'showCalories', 'showAllergens'].forEach(setting => {
                    const el = document.getElementById(`slot${i}_${setting}`);
                    if (el) el.addEventListener('change', () => this.refreshPreview());
                });
            }
            
            isBound = true;
            console.log('✅ UI binding complete');
        },

        setVal: function(id, val) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        },

        setChecked: function(id, val) {
            const el = document.getElementById(id);
            if (el) el.checked = val;
        },

        getSettingsFromUI: function() {
            return window.TemplateSettings.getFromUI();
        },

        refreshPreview: async function() {
            await window.TemplatePreview.refresh(this);
        },

        renderTemplateLibrary: function() {
            window.TemplateLibrary.render(activeTemplateId, this);
        },

        loadTemplate: async function(id) {
            const template = window.savedTemplates.find(t => t.id === id);
            if (!template) {
                alert(window.t('alert_template_not_found'));
                return;
            }

            await this.applyTemplateToUI(template);
            activeTemplateId = id;
            localStorage.setItem('activeTemplateId', id);
            this.renderTemplateLibrary();
            this.refreshPreview();
            alert(`${window.t('alert_template_loaded')}: "${template.name}"`);
        },

        deleteTemplate: function(id) {
            const template = window.savedTemplates.find(t => t.id === id);
            if (!template) return;

            if (!confirm(`${window.t('alert_delete_template')} "${template.name}"?`)) {
                return;
            }

            window.savedTemplates = window.savedTemplates.filter(t => t.id !== id);
            window.saveSettings();

            if (activeTemplateId === id) {
                activeTemplateId = 'default';
                localStorage.setItem('activeTemplateId', 'default');
                window.TemplateDefaults.apply(this);
                this.refreshPreview();
            }

            this.renderTemplateLibrary();
            alert(window.t('alert_template_deleted'));
        },

        getDateRangeText: function(startOffset, endOffset, customWeekStart) {
            const start = customWeekStart || window.getWeekStart(window.currentCalendarDate || new Date());
            const startDay = new Date(start);
            startDay.setDate(start.getDate() + startOffset);
            const endDay = new Date(start);
            endDay.setDate(start.getDate() + endOffset);
            
            const options = { month: 'short', day: 'numeric' };
            const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
            return `${startDay.toLocaleDateString(lang, options)} — ${endDay.toLocaleDateString(lang, options)}, ${endDay.getFullYear()}`;
        },

        hasMeals: function(dayMenu) {
            if (!dayMenu) return false;
            return Object.values(dayMenu).some(slot => slot.recipe !== null);
        },

        getWeeksWithMeals: function() {
            const weeks = [];
            const dates = Object.keys(window.currentMenu).filter(dateStr => {
                return this.hasMeals(window.currentMenu[dateStr]);
            });

            if (dates.length === 0) return [];

            const weekMap = new Map();
            dates.forEach(dateStr => {
                const parts = dateStr.split('-');
                const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                
                const weekStart = window.getWeekStart(date);
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!weekMap.has(weekKey)) {
                    weekMap.set(weekKey, {
                        weekStart: weekStart,
                        dates: []
                    });
                }
                weekMap.get(weekKey).dates.push(dateStr);
            });

            weekMap.forEach((value, key) => {
                weeks.push({
                    weekStart: value.weekStart,
                    label: this.getDateRangeText(0, 4, value.weekStart),
                    dateCount: value.dates.length
                });
            });

            weeks.sort((a, b) => b.weekStart - a.weekStart);
            return weeks;
        }
    };

    // Global functions
    window.saveCurrentTemplate = function() {
        const name = prompt(window.t('alert_template_name_prompt'), window.t('template_my_template') + ' ' + (window.savedTemplates.length + 1));
        if (!name) return;
        
        const settings = TemplateManager.getSettingsFromUI();
        settings.name = name;
        settings.id = CONST.FILE.TEMPLATE_PREFIX + Date.now();
        
        window.savedTemplates.push(settings);
        window.saveSettings();
        
        activeTemplateId = settings.id;
        localStorage.setItem('activeTemplateId', settings.id);
        TemplateManager.renderTemplateLibrary();
        alert(window.t('alert_template_saved'));
    };

    window.openTemplatePicker = function() {
        window.TemplatePicker.open(TemplateManager);
    };

    window.printWithTemplate = async function(templateId) {
        await window.TemplatePrint.print(templateId, selectedWeekStart, TemplateManager);
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('collapsibleSections')) {
            TemplateManager.init();
        }
    });

    // Export getWeekStart utility if not already defined
    window.getWeekStart = window.getWeekStart || function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === CONST.WEEK.SUNDAY ? -6 : CONST.WEEK.START_DAY);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    window.TemplateManager = TemplateManager;
    window.templateBuilderManager = TemplateManager; // FIXED: Make available globally for tab switching
    window.setSelectedWeekStart = function(weekStart) {
        selectedWeekStart = weekStart;
    };
    window.getSelectedWeekStart = function() {
        return selectedWeekStart;
    };

})(window);
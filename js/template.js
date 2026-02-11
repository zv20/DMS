/**
 * Advanced Template Manager
 * Per-block settings, template library, detailed meal printing, and preset templates
 * Auto-detects days with meals for printing
 * NOW WITH: Combined week selection + template picker in one modal
 */

(function(window) {
    let activeTemplateId = null;
    let selectedWeekStart = null; // Track selected week for printing

    const TemplateManager = {
        // Preset Templates (12 total)
        presets: [
            // ORIGINAL 5 PRESETS
            {
                id: 'preset_classic',
                name: '🎨 Classic Orange',
                header: { text: 'Weekly Menu', color: '#fd7e14', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '8px', borderWidth: '2', borderColor: '#e0e0e0', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#2c3e50', fontWeight: '600' },
                mealTitle: { fontSize: '9pt', color: '#333333', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#555555', fontStyle: 'italic' },
                footer: { text: 'Prepared with care by KitchenPro', fontSize: '8pt', color: '#7f8c8d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            {
                id: 'preset_modern',
                name: '⚡ Modern Bold',
                header: { text: 'THIS WEEK', color: '#2c3e50', fontSize: '24pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ecf0f1', borderRadius: '12px', borderWidth: '0', borderColor: '#bdc3c7', borderStyle: 'solid' },
                dayName: { fontSize: '14pt', color: '#e74c3c', fontWeight: 'bold' },
                mealTitle: { fontSize: '10pt', color: '#2c3e50', fontWeight: 'bold' },
                ingredients: { fontSize: '8pt', color: '#7f8c8d', fontStyle: 'normal' },
                footer: { text: '✨ Enjoy your meals!', fontSize: '9pt', color: '#95a5a6' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: true, showAllergens: false }
                }
            },
            {
                id: 'preset_minimal',
                name: '🌿 Minimal Clean',
                header: { text: 'Menu', color: '#27ae60', fontSize: '18pt', fontWeight: 'normal' },
                dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '1', borderColor: '#bdc3c7', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#27ae60', fontWeight: '500' },
                mealTitle: { fontSize: '9pt', color: '#34495e', fontWeight: 'normal' },
                ingredients: { fontSize: '7pt', color: '#7f8c8d', fontStyle: 'italic' },
                footer: { text: '', fontSize: '7pt', color: '#95a5a6' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_colorful',
                name: '🌈 Colorful Fun',
                header: { text: '🍽️ Menu Time!', color: '#9b59b6', fontSize: '22pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fef5e7', borderRadius: '15px', borderWidth: '3', borderColor: '#f39c12', borderStyle: 'dashed' },
                dayName: { fontSize: '13pt', color: '#e67e22', fontWeight: 'bold' },
                mealTitle: { fontSize: '10pt', color: '#8e44ad', fontWeight: '600' },
                ingredients: { fontSize: '8pt', color: '#16a085', fontStyle: 'normal' },
                footer: { text: '🌟 Bon Appétit!', fontSize: '10pt', color: '#e74c3c' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            {
                id: 'preset_professional',
                name: '💼 Professional',
                header: { text: 'Weekly Meal Plan', color: '#1a1a2e', fontSize: '20pt', fontWeight: '600' },
                dayBlock: { bg: '#f8f9fa', borderRadius: '6px', borderWidth: '2', borderColor: '#34495e', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#1a1a2e', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#2c3e50', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#5a6c7d', fontStyle: 'normal' },
                footer: { text: 'Nutritionally Balanced Meals', fontSize: '8pt', color: '#7f8c8d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            
            // NEW 7 PRESETS
            {
                id: 'preset_weekend',
                name: '🌅 Weekend Brunch (2 days)',
                header: { text: 'Weekend Specials', color: '#ff6b6b', fontSize: '22pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fff8f0', borderRadius: '10px', borderWidth: '2', borderColor: '#ffa94d', borderStyle: 'solid' },
                dayName: { fontSize: '13pt', color: '#d9480f', fontWeight: 'bold' },
                mealTitle: { fontSize: '10pt', color: '#495057', fontWeight: '600' },
                ingredients: { fontSize: '8pt', color: '#6c757d', fontStyle: 'italic' },
                footer: { text: '☕ Relax & Enjoy Your Weekend!', fontSize: '9pt', color: '#868e96' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_school',
                name: '🎒 School Days (3 days)',
                header: { text: '📚 School Lunch Menu', color: '#4c6ef5', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#e7f5ff', borderRadius: '12px', borderWidth: '3', borderColor: '#74c0fc', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#1864ab', fontWeight: 'bold' },
                mealTitle: { fontSize: '10pt', color: '#1971c2', fontWeight: 'bold' },
                ingredients: { fontSize: '8pt', color: '#495057', fontStyle: 'normal' },
                footer: { text: '🌟 Healthy Choices for Growing Minds', fontSize: '8pt', color: '#5c7cfa' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: true, showAllergens: true }
                }
            },
            {
                id: 'preset_business',
                name: '💼 Business Week (4 days)',
                header: { text: 'Executive Dining Menu', color: '#212529', fontSize: '19pt', fontWeight: '600' },
                dayBlock: { bg: '#f1f3f5', borderRadius: '4px', borderWidth: '1', borderColor: '#868e96', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#212529', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#343a40', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#6c757d', fontStyle: 'normal' },
                footer: { text: 'Professionally Catered | All Rights Reserved', fontSize: '7pt', color: '#adb5bd' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_bistro',
                name: '🍷 Bistro Style (2 days)',
                header: { text: 'Bistro du Chef', color: '#862e9c', fontSize: '24pt', fontWeight: 'normal' },
                dayBlock: { bg: '#f8f0fc', borderRadius: '8px', borderWidth: '2', borderColor: '#d0bfff', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#862e9c', fontWeight: '500' },
                mealTitle: { fontSize: '9pt', color: '#5f3dc4', fontWeight: 'normal' },
                ingredients: { fontSize: '7.5pt', color: '#7950f2', fontStyle: 'italic' },
                footer: { text: '✨ Bon Appétit | Chef Recommended', fontSize: '8pt', color: '#9775fa' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_wellness',
                name: '🥗 Wellness Plan (3 days)',
                header: { text: 'Wellness Menu', color: '#2f9e44', fontSize: '21pt', fontWeight: '600' },
                dayBlock: { bg: '#ebfbee', borderRadius: '10px', borderWidth: '2', borderColor: '#8ce99a', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#2b8a3e', fontWeight: '600' },
                mealTitle: { fontSize: '9pt', color: '#2f9e44', fontWeight: '600' },
                ingredients: { fontSize: '8pt', color: '#37b24d', fontStyle: 'normal' },
                footer: { text: '🌱 Nourish Your Body & Soul', fontSize: '8pt', color: '#51cf66' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            {
                id: 'preset_mediterranean',
                name: '🌊 Mediterranean (4 days)',
                header: { text: 'Mediterranean Menu', color: '#0b7285', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#e3fafc', borderRadius: '10px', borderWidth: '2', borderColor: '#66d9e8', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#0c8599', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#1098ad', fontWeight: '600' },
                ingredients: { fontSize: '8pt', color: '#1864ab', fontStyle: 'italic' },
                footer: { text: '🌞 Fresh & Flavorful Mediterranean Cuisine', fontSize: '8pt', color: '#15aabf' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_traditional',
                name: '📋 Traditional (5 days)',
                header: { text: 'WEEKLY MENU PLAN', color: '#5c940d', fontSize: '18pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '4px', borderWidth: '2', borderColor: '#a9d18e', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#5c940d', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#495057', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#6c757d', fontStyle: 'italic' },
                footer: { text: 'Home-Cooked Goodness Since 1995', fontSize: '8pt', color: '#82c91e' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            }
        ],

        init: function() {
            this.loadActiveTemplate();
            this.bindUI();
            this.renderTemplateLibrary();
            this.refreshPreview();
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
            this.applyDefaultSettings();
        },

        applyDefaultSettings: function() {
            activeTemplateId = 'default';
            this.setVal('headerText', 'Weekly Menu');
            this.setVal('headerColor', '#fd7e14');
            this.setVal('headerSize', '20pt');
            this.setVal('headerWeight', 'bold');
            this.setVal('dayBg', '#ffffff');
            this.setVal('dayRadius', 8);
            this.setVal('dayBorderWidth', 2);
            this.setVal('dayBorderColor', '#e0e0e0');
            this.setVal('dayBorderStyle', 'solid');
            this.setVal('dayNameSize', '11pt');
            this.setVal('dayNameColor', '#2c3e50');
            this.setVal('dayNameWeight', '600');
            this.setVal('mealTitleSize', '9pt');
            this.setVal('mealTitleColor', '#333333');
            this.setVal('mealTitleWeight', '600');
            this.setVal('ingredientsSize', '7.5pt');
            this.setVal('ingredientsColor', '#555555');
            this.setVal('ingredientsStyle', 'italic');
            this.setVal('footerSize', '8pt');
            this.setVal('footerColor', '#7f8c8d');
            this.setVal('backgroundImage', '');
            this.setVal('footerText', 'Prepared with care by KitchenPro');
            
            for (let i = 1; i <= 4; i++) {
                this.setChecked(`slot${i}_showIngredients`, true);
                this.setChecked(`slot${i}_showCalories`, true);
                this.setChecked(`slot${i}_showAllergens`, true);
            }
        },

        applyTemplateToUI: function(template) {
            this.setVal('headerText', template.header.text);
            this.setVal('headerColor', template.header.color);
            this.setVal('headerSize', template.header.fontSize);
            this.setVal('headerWeight', template.header.fontWeight || 'bold');
            this.setVal('dayBg', template.dayBlock.bg);
            this.setVal('dayRadius', template.dayBlock.borderRadius.replace('px', ''));
            this.setVal('dayBorderWidth', template.dayBlock.borderWidth || 2);
            this.setVal('dayBorderColor', template.dayBlock.borderColor || '#e0e0e0');
            this.setVal('dayBorderStyle', template.dayBlock.borderStyle || 'solid');
            this.setVal('dayNameSize', template.dayName?.fontSize || '11pt');
            this.setVal('dayNameColor', template.dayName?.color || '#2c3e50');
            this.setVal('dayNameWeight', template.dayName?.fontWeight || '600');
            this.setVal('mealTitleSize', template.mealTitle?.fontSize || '9pt');
            this.setVal('mealTitleColor', template.mealTitle?.color || '#333333');
            this.setVal('mealTitleWeight', template.mealTitle?.fontWeight || '600');
            this.setVal('ingredientsSize', template.ingredients?.fontSize || '7.5pt');
            this.setVal('ingredientsColor', template.ingredients?.color || '#555555');
            this.setVal('ingredientsStyle', template.ingredients?.fontStyle || 'italic');
            this.setVal('footerSize', template.footer?.fontSize || '8pt');
            this.setVal('footerColor', template.footer?.color || '#7f8c8d');
            this.setVal('backgroundImage', template.backgroundImage || '');
            this.setVal('footerText', template.footer.text);
            
            if (template.slotSettings) {
                for (let i = 1; i <= 4; i++) {
                    const slot = template.slotSettings[`slot${i}`];
                    if (slot) {
                        this.setChecked(`slot${i}_showIngredients`, slot.showIngredients);
                        this.setChecked(`slot${i}_showCalories`, slot.showCalories);
                        this.setChecked(`slot${i}_showAllergens`, slot.showAllergens);
                    }
                }
            }
        },

        bindUI: function() {
            const inputs = ['headerText', 'headerColor', 'headerSize', 'headerWeight',
                           'dayBg', 'dayRadius', 'dayBorderWidth', 'dayBorderColor', 'dayBorderStyle',
                           'dayNameSize', 'dayNameColor', 'dayNameWeight',
                           'mealTitleSize', 'mealTitleColor', 'mealTitleWeight',
                           'ingredientsSize', 'ingredientsColor', 'ingredientsStyle',
                           'footerSize', 'footerColor', 'backgroundImage', 'footerText'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.refreshPreview());
            });

            for (let i = 1; i <= 4; i++) {
                ['showIngredients', 'showCalories', 'showAllergens'].forEach(setting => {
                    const el = document.getElementById(`slot${i}_${setting}`);
                    if (el) el.addEventListener('change', () => this.refreshPreview());
                });
            }
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
            const slotSettings = {};
            for (let i = 1; i <= 4; i++) {
                slotSettings[`slot${i}`] = {
                    showIngredients: document.getElementById(`slot${i}_showIngredients`)?.checked || false,
                    showCalories: document.getElementById(`slot${i}_showCalories`)?.checked || false,
                    showAllergens: document.getElementById(`slot${i}_showAllergens`)?.checked || false
                };
            }

            return {
                header: { 
                    text: document.getElementById('headerText')?.value || 'Weekly Menu',
                    color: document.getElementById('headerColor')?.value || '#fd7e14',
                    fontSize: document.getElementById('headerSize')?.value || '20pt',
                    fontWeight: document.getElementById('headerWeight')?.value || 'bold'
                },
                dayBlock: {
                    bg: document.getElementById('dayBg')?.value || '#ffffff',
                    borderRadius: (document.getElementById('dayRadius')?.value || '8') + 'px',
                    borderWidth: document.getElementById('dayBorderWidth')?.value || '2',
                    borderColor: document.getElementById('dayBorderColor')?.value || '#e0e0e0',
                    borderStyle: document.getElementById('dayBorderStyle')?.value || 'solid'
                },
                dayName: {
                    fontSize: document.getElementById('dayNameSize')?.value || '11pt',
                    color: document.getElementById('dayNameColor')?.value || '#2c3e50',
                    fontWeight: document.getElementById('dayNameWeight')?.value || '600'
                },
                mealTitle: {
                    fontSize: document.getElementById('mealTitleSize')?.value || '9pt',
                    color: document.getElementById('mealTitleColor')?.value || '#333333',
                    fontWeight: document.getElementById('mealTitleWeight')?.value || '600'
                },
                ingredients: {
                    fontSize: document.getElementById('ingredientsSize')?.value || '7.5pt',
                    color: document.getElementById('ingredientsColor')?.value || '#555555',
                    fontStyle: document.getElementById('ingredientsStyle')?.value || 'italic'
                },
                footer: {
                    text: document.getElementById('footerText')?.value || '',
                    fontSize: document.getElementById('footerSize')?.value || '8pt',
                    color: document.getElementById('footerColor')?.value || '#7f8c8d'
                },
                backgroundImage: document.getElementById('backgroundImage')?.value || '',
                slotSettings: slotSettings
            };
        },

        refreshPreview: function() {
            const settings = this.getSettingsFromUI();
            
            // Apply background image to preview sheet
            const sheet = document.getElementById('livePreviewSheet');
            if (sheet && settings.backgroundImage) {
                sheet.style.backgroundImage = `url(${settings.backgroundImage})`;
                sheet.style.backgroundSize = 'cover';
                sheet.style.backgroundPosition = 'center';
                sheet.style.backgroundRepeat = 'no-repeat';
            } else if (sheet) {
                sheet.style.backgroundImage = 'none';
            }
            
            // Header - show full 5 days in preview
            const h = document.getElementById('previewHeader');
            const dateRange = this.getDateRangeText(0, 4);
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; text-align:center; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                    <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                `;
            }

            // Days List - preview shows all 5 days
            const list = document.getElementById('previewDaysList');
            if (list) {
                list.innerHTML = '';
                const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
                
                for (let i = 0; i < 5; i++) {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    const dateStr = day.toISOString().split('T')[0];
                    const dayMenu = window.currentMenu[dateStr];
                    
                    const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
                    const block = this.createDetailedDayBlock(dayName, dayMenu, settings, dateStr);
                    
                    if (!this.hasMeals(dayMenu)) {
                        block.style.opacity = '0.4';
                    }
                    list.appendChild(block);
                }
            }

            // Footer
            const f = document.getElementById('previewFooter');
            if (f) {
                f.innerHTML = `<div style="border-top:1px solid #eee; padding-top:4px; margin-top:6px; color:${settings.footer.color}; font-size:${settings.footer.fontSize}; text-align:center; line-height:1;">${settings.footer.text}</div>`;
            }
        },

        createDetailedDayBlock: function(dayName, dayMenu, settings, dateStr) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 10px 12px;
                margin-bottom: 6px;
                border: ${settings.dayBlock.borderWidth}px ${settings.dayBlock.borderStyle} ${settings.dayBlock.borderColor};
                page-break-inside: avoid;
            `;

            // Day header
            let contentHtml = `
                <div style="border-bottom:1px solid #d0d0d0; margin-bottom:6px; padding-bottom:3px;">
                    <h2 style="margin:0; font-size:${settings.dayName.fontSize}; color:${settings.dayName.color}; font-weight:${settings.dayName.fontWeight}; line-height:1.2;">${dayName}</h2>
                </div>
            `;

            if (dayMenu) {
                const slots = [
                    { id: 'slot1', type: 'soup', label: window.t('slot_soup') },
                    { id: 'slot2', type: 'main', label: window.t('slot_main') },
                    { id: 'slot3', type: 'dessert', label: window.t('slot_dessert') },
                    { id: 'slot4', type: 'other', label: window.t('slot_other') }
                ];

                slots.forEach((slotConfig, index) => {
                    const slot = dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            contentHtml += this.createMealBlock(recipe, slotConfig, slotSettings, settings, index + 1);
                        }
                    }
                });
            }

            if (!this.hasMeals(dayMenu)) {
                contentHtml += `<p style="color:#aaa; font-style:italic; text-align:center; padding:8px 0; font-size:8pt; margin:0; line-height:1;">${window.t('empty_day') || 'No meals planned'}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, settings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';
            
            let html = `<div style="margin-bottom:5px;">`;
            
            // Title line with portion and calories
            let titleLine = `<div style="font-size:${settings.mealTitle.fontSize}; font-weight:${settings.mealTitle.fontWeight}; color:${settings.mealTitle.color}; margin-bottom:2px; line-height:1.2;">${index}. ${recipe.name}`;
            
            // Add portion size and calories with language-specific units
            let metadata = [];
            if (recipe.portionSize) {
                const portionUnit = isBulgarian ? 'гр' : 'g';
                const portionValue = recipe.portionSize.replace(/g|gr|гр/gi, '').trim();
                metadata.push(`${portionValue}${portionUnit}`);
            }
            if (slotSettings.showCalories && recipe.calories) {
                const calorieUnit = isBulgarian ? 'ККАЛ' : 'kcal';
                metadata.push(`${recipe.calories} ${calorieUnit}`);
            }
            if (metadata.length) titleLine += ` <span style="font-weight:normal; color:#666; font-size:8pt;">(${metadata.join(', ')})</span>`;
            
            titleLine += `</div>`;
            html += titleLine;

            // Ingredients with red underlined allergens
            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                const recipeAllergens = window.getRecipeAllergens(recipe);
                const allergenIds = new Set(recipeAllergens.map(a => a.id));
                
                const ingredientsList = recipe.ingredients.map(ing => {
                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                    if (!fullIng) return '';
                    
                    const hasAllergen = fullIng.allergens && fullIng.allergens.some(aid => allergenIds.has(aid));
                    
                    if (slotSettings.showAllergens && hasAllergen) {
                        return `<span style="color:#dc3545; text-decoration:underline; font-weight:500;">${fullIng.name}</span>`;
                    }
                    return fullIng.name;
                }).filter(n => n).join(', ');
                
                if (ingredientsList) {
                    html += `<div style="font-size:${settings.ingredients.fontSize}; color:${settings.ingredients.color}; font-style:${settings.ingredients.fontStyle}; margin-top:1px; margin-left:10px; line-height:1.2;"><em>Ingredients:</em> ${ingredientsList}</div>`;
                }
            }

            html += `</div>`;
            return html;
        },

        hasMeals: function(dayMenu) {
            if (!dayMenu) return false;
            return Object.values(dayMenu).some(slot => slot.recipe !== null);
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

        // NEW: Get all weeks that have meals planned
        getWeeksWithMeals: function() {
            const weeks = [];
            const dates = Object.keys(window.currentMenu).filter(dateStr => {
                return this.hasMeals(window.currentMenu[dateStr]);
            });

            if (dates.length === 0) return [];

            // Group dates by week
            const weekMap = new Map();
            dates.forEach(dateStr => {
                const date = new Date(dateStr);
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

            // Convert to array and sort by date (latest first)
            weekMap.forEach((value, key) => {
                weeks.push({
                    weekStart: value.weekStart,
                    label: this.getDateRangeText(0, 4, value.weekStart),
                    dateCount: value.dates.length
                });
            });

            // Sort: latest first
            weeks.sort((a, b) => b.weekStart - a.weekStart);
            return weeks;
        },

        renderTemplateLibrary: function() {
            const container = document.getElementById('templateLibrary');
            if (!container) return;
            
            container.innerHTML = '';

            // Preset Templates
            const presetHeader = document.createElement('h4');
            presetHeader.textContent = '🎨 Preset Templates';
            presetHeader.style.cssText = 'margin: 0 0 10px 0; color: #fd7e14; font-size: 11pt;';
            container.appendChild(presetHeader);

            this.presets.forEach(preset => {
                const card = this.createPresetCard(preset);
                container.appendChild(card);
            });

            // Separator
            const separator = document.createElement('div');
            separator.style.cssText = 'height: 1px; background: #ddd; margin: 20px 0;';
            container.appendChild(separator);

            // Default Template
            const customHeader = document.createElement('h4');
            customHeader.textContent = '📝 My Templates';
            customHeader.style.cssText = 'margin: 0 0 10px 0; color: #6c757d; font-size: 11pt;';
            container.appendChild(customHeader);

            const defaultCard = this.createTemplateCard({
                id: 'default',
                name: 'Default Template'
            }, activeTemplateId === 'default');
            container.appendChild(defaultCard);

            // Saved Templates
            window.savedTemplates.forEach(tmpl => {
                const card = this.createTemplateCard(tmpl, activeTemplateId === tmpl.id);
                container.appendChild(card);
            });
        },

        createPresetCard: function(preset) {
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 8px;
                border: 2px solid #ddd;
                border-radius: 6px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            card.onmouseenter = () => card.style.borderColor = '#fd7e14';
            card.onmouseleave = () => card.style.borderColor = '#ddd';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = preset.name;
            nameSpan.style.cssText = 'font-weight: 500; font-size: 9pt; color: #333;';
            
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Use';
            loadBtn.className = 'btn btn-small btn-primary';
            loadBtn.style.height = '28px';
            loadBtn.onclick = (e) => {
                e.stopPropagation();
                this.applyTemplateToUI(preset);
                this.refreshPreview();
            };

            card.appendChild(nameSpan);
            card.appendChild(loadBtn);
            return card;
        },

        createTemplateCard: function(template, isActive) {
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 10px;
                border: 2px solid ${isActive ? '#fd7e14' : '#ddd'};
                border-radius: 6px;
                background: ${isActive ? '#fff5e6' : '#f9f9f9'};
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            `;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = template.name;
            nameSpan.style.fontWeight = isActive ? '600' : '400';
            nameSpan.style.color = isActive ? '#fd7e14' : '#333';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '5px';

            if (!isActive) {
                const loadBtn = document.createElement('button');
                loadBtn.textContent = 'Load';
                loadBtn.className = 'btn btn-small btn-secondary';
                loadBtn.onclick = () => this.loadTemplate(template.id);
                btnContainer.appendChild(loadBtn);
            }

            if (template.id !== 'default') {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.onclick = () => this.deleteTemplate(template.id);
                btnContainer.appendChild(deleteBtn);
            }

            card.appendChild(nameSpan);
            card.appendChild(btnContainer);
            return card;
        },

        loadTemplate: function(id) {
            if (id === 'default') {
                this.applyDefaultSettings();
            } else {
                const tmpl = window.savedTemplates.find(t => t.id === id);
                if (tmpl) this.applyTemplateToUI(tmpl);
            }
            activeTemplateId = id;
            localStorage.setItem('activeTemplateId', id);
            this.renderTemplateLibrary();
            this.refreshPreview();
        },

        deleteTemplate: function(id) {
            if (!confirm('Delete this template?')) return;
            window.savedTemplates = window.savedTemplates.filter(t => t.id !== id);
            if (activeTemplateId === id) {
                this.loadTemplate('default');
            }
            window.saveSettings(); // Save to settings.json file
            this.renderTemplateLibrary();
        }
    };

    // Global Functions
    window.saveCurrentTemplate = function() {
        const name = prompt('Template Name:', 'My Template ' + (window.savedTemplates.length + 1));
        if (!name) return;
        
        const settings = TemplateManager.getSettingsFromUI();
        settings.name = name;
        settings.id = 'tmpl_' + Date.now();
        
        window.savedTemplates.push(settings);
        window.saveSettings(); // Save to settings.json file
        
        activeTemplateId = settings.id;
        localStorage.setItem('activeTemplateId', settings.id);
        TemplateManager.renderTemplateLibrary();
        alert('Template saved!');
    };

    // NEW: Combined Week + Template Selection Modal
    window.openTemplatePicker = function() {
        const modal = document.getElementById('templatePickerModal');
        const grid = document.getElementById('templateGrid');
        if (!modal || !grid) return;
        
        modal.style.display = 'block';
        grid.innerHTML = '';

        // Get weeks with meals
        const weeksWithMeals = TemplateManager.getWeeksWithMeals();
        
        if (weeksWithMeals.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">No weeks with meals found. Please plan some meals first!</p>';
            return;
        }

        // Week Selector Section
        const weekSection = document.createElement('div');
        weekSection.style.cssText = 'margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;';
        
        const weekLabel = document.createElement('label');
        weekLabel.textContent = '📅 Select Week to Print:';
        weekLabel.style.cssText = 'display: block; font-weight: 600; margin-bottom: 10px; font-size: 14pt;';
        
        const weekSelect = document.createElement('select');
        weekSelect.id = 'weekSelector';
        weekSelect.style.cssText = 'width: 100%; padding: 12px; font-size: 12pt; border-radius: 6px; border: 2px solid #dee2e6;';
        
        weeksWithMeals.forEach((week, index) => {
            const option = document.createElement('option');
            option.value = week.weekStart.toISOString().split('T')[0];
            option.textContent = `${week.label} (${week.dateCount} days with meals)`;
            if (index === 0) option.selected = true; // Select latest week by default
            weekSelect.appendChild(option);
        });
        
        weekSection.appendChild(weekLabel);
        weekSection.appendChild(weekSelect);
        grid.appendChild(weekSection);

        // Set selected week
        selectedWeekStart = new Date(weekSelect.value);
        weekSelect.addEventListener('change', (e) => {
            selectedWeekStart = new Date(e.target.value);
        });

        // Template Grid Section
        const templateSection = document.createElement('div');
        const templateLabel = document.createElement('h3');
        templateLabel.textContent = '📝 Select Template:';
        templateLabel.style.cssText = 'margin: 0 0 20px 0; font-size: 14pt;';
        templateSection.appendChild(templateLabel);

        const templateGridContainer = document.createElement('div');
        templateGridContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;';

        const allTemplates = [
            { id: 'current', name: 'Current Active Template' },
            ...window.savedTemplates
        ];

        allTemplates.forEach(t => {
            const card = document.createElement('div');
            card.style.cssText = 'padding:15px; border:2px solid #ddd; border-radius:8px; text-align:center; background:#f9f9f9; cursor:pointer; transition: all 0.2s;';
            card.onmouseenter = () => card.style.borderColor = '#fd7e14';
            card.onmouseleave = () => card.style.borderColor = '#ddd';
            card.innerHTML = `
                <div style="font-size:30pt; margin-bottom:10px;">📝</div>
                <h4 style="margin:0 0 10px 0;">${t.name}</h4>
                <button class="btn btn-primary" onclick="event.stopPropagation(); window.printWithTemplate('${t.id}')" style="width:100%;">🖨️ Print</button>
            `;
            templateGridContainer.appendChild(card);
        });

        templateSection.appendChild(templateGridContainer);
        grid.appendChild(templateSection);
    };

    // Updated print function to use selected week
    window.printWithTemplate = function(id) {
        let settings;
        if (id === 'current') {
            settings = TemplateManager.getSettingsFromUI();
        } else {
            settings = window.savedTemplates.find(t => t.id === id);
        }
        
        if (!settings) {
            alert('Template not found');
            return;
        }

        // Use selectedWeekStart if available, otherwise use current week
        const weekStart = selectedWeekStart || window.getWeekStart(window.currentCalendarDate || new Date());

        const printWindow = window.open('', '_blank');
        const lang = window.getCurrentLanguage();
        const isBulgarian = lang === 'bg';
        
        // AUTO-DETECT: Find days with meals
        let daysHtml = '';
        let daysWithMeals = [];
        
        // Scan all 5 weekdays to find which have meals
        for (let i = 0; i < 5; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            
            if (TemplateManager.hasMeals(dayMenu)) {
                const dayName = day.toLocaleDateString(isBulgarian ? 'bg-BG' : 'en-US', { weekday: 'long' });
                const block = TemplateManager.createDetailedDayBlock(dayName, dayMenu, settings, dateStr);
                daysHtml += block.outerHTML;
                daysWithMeals.push(i);
            }
        }

        // If no meals planned, show message
        if (daysWithMeals.length === 0) {
            alert('No meals planned for this week. Please add meals before printing.');
            printWindow.close();
            return;
        }

        // Calculate date range based on actual days with meals
        const firstDay = daysWithMeals[0];
        const lastDay = daysWithMeals[daysWithMeals.length - 1];
        const dateRange = TemplateManager.getDateRangeText(firstDay, lastDay, weekStart);

        const backgroundStyle = settings.backgroundImage ? `background-image: url(${settings.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat;` : '';

        const html = `
            <html>
            <head>
                <title>Print Menu</title>
                <style>
                    @page { 
                        size: A4;
                        margin: 10mm;
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 0;
                        margin: 0;
                        background: #fff;
                        font-size: 9pt;
                        line-height: 1.2;
                        ${backgroundStyle}
                    }
                    .print-day-block { 
                        page-break-inside: avoid; 
                    }
                    @media print { 
                        body { 
                            padding: 0; 
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; text-align:center; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                ${daysHtml}
                <div style="margin-top:6px; border-top:1px solid #eee; padding-top:4px; text-align:center; color:${settings.footer.color}; font-size:${settings.footer.fontSize}; line-height:1;">${settings.footer.text}</div>
                <script>window.onload = () => { window.print(); };</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        document.getElementById('templatePickerModal').style.display = 'none';
        
        // Reset selected week
        selectedWeekStart = null;
    };

    // Helper function for getting week start (needed for template manager)
    window.getWeekStart = window.getWeekStart || function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('headerText')) {
            TemplateManager.init();
        }
    });

})(window);

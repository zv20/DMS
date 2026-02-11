/**
 * Advanced Template Manager
 * Per-block settings, template library, detailed meal printing, and preset templates
 * Auto-detects days with meals for printing
 * NOW WITH: Full Bulgarian/English translation support
 * FIXED: Background images now print correctly by storing filenames
 * FIXED: Templates now properly load images by awaiting async operations
 * FIXED: Print now converts background images to base64 BEFORE opening window
 * FIXED: Force browsers to actually PRINT backgrounds with print-color-adjust CSS
 */

(function(window) {
    let activeTemplateId = null;
    let selectedWeekStart = null;
    let presetsExpanded = false;
    
    // Track which sections are expanded (all start collapsed except first 2)
    const sectionStates = {
        presets: false,
        background: true,
        header: true,
        dayBlock: false,
        dayName: false,
        mealTitle: false,
        ingredients: false,
        mealVisibility: false,
        footer: false
    };

    const TemplateManager = {
        // Preset Templates (15 total - now using translation keys for names)
        presets: [
            {
                id: 'preset_classic',
                nameKey: 'preset_classic',
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
                nameKey: 'preset_modern',
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
                nameKey: 'preset_minimal',
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
                nameKey: 'preset_colorful',
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
                nameKey: 'preset_professional',
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
            {
                id: 'preset_double_column',
                nameKey: 'preset_double_column',
                isDoubleColumn: true,
                header: { text: 'Weekly Menu', color: '#fd7e14', fontSize: '18pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '6px', borderWidth: '1', borderColor: '#dee2e6', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#2c3e50', fontWeight: 'bold' },
                mealTitle: { fontSize: '8pt', color: '#333333', fontWeight: '600' },
                ingredients: { fontSize: '7pt', color: '#555555', fontStyle: 'italic' },
                footer: { text: 'KitchenPro © 2026', fontSize: '7pt', color: '#7f8c8d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_compact_grid',
                nameKey: 'preset_compact_grid',
                isDoubleColumn: true,
                header: { text: 'Menu at a Glance', color: '#495057', fontSize: '16pt', fontWeight: 'bold' },
                dayBlock: { bg: '#f8f9fa', borderRadius: '4px', borderWidth: '1', borderColor: '#adb5bd', borderStyle: 'solid' },
                dayName: { fontSize: '9pt', color: '#343a40', fontWeight: 'bold' },
                mealTitle: { fontSize: '7.5pt', color: '#495057', fontWeight: '600' },
                ingredients: { fontSize: '6.5pt', color: '#6c757d', fontStyle: 'normal' },
                footer: { text: '', fontSize: '6pt', color: '#868e96' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_elegant',
                nameKey: 'preset_elegant',
                header: { text: 'Culinary Selection', color: '#6c5ce7', fontSize: '22pt', fontWeight: 'normal' },
                dayBlock: { bg: '#fdfcfb', borderRadius: '10px', borderWidth: '2', borderColor: '#a29bfe', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#6c5ce7', fontWeight: '500' },
                mealTitle: { fontSize: '9pt', color: '#5f3dc4', fontWeight: 'normal' },
                ingredients: { fontSize: '7.5pt', color: '#7950f2', fontStyle: 'italic' },
                footer: { text: '♥️ Crafted with Love', fontSize: '8pt', color: '#a29bfe' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_retro',
                nameKey: 'preset_retro',
                header: { text: "JOE'S DINER WEEKLY SPECIALS", color: '#e63946', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fff3e0', borderRadius: '8px', borderWidth: '3', borderColor: '#e63946', borderStyle: 'double' },
                dayName: { fontSize: '12pt', color: '#d62828', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#6a040f', fontWeight: 'bold' },
                ingredients: { fontSize: '8pt', color: '#9d0208', fontStyle: 'normal' },
                footer: { text: '🍔 Open 24/7 - Your Favorite Spot Since Forever', fontSize: '8pt', color: '#f77f00' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_zen',
                nameKey: 'preset_zen',
                header: { text: 'menu', color: '#2d3436', fontSize: '16pt', fontWeight: 'normal' },
                dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '0', borderColor: 'transparent', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#636e72', fontWeight: 'normal' },
                mealTitle: { fontSize: '8pt', color: '#2d3436', fontWeight: 'normal' },
                ingredients: { fontSize: '7pt', color: '#95a5a6', fontStyle: 'italic' },
                footer: { text: '―', fontSize: '10pt', color: '#dfe6e9' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: false },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: false },
                    slot3: { showIngredients: false, showCalories: false, showAllergens: false },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_bright_cafe',
                nameKey: 'preset_bright_cafe',
                header: { text: 'Cafe Menu of the Week', color: '#ff9ff3', fontSize: '21pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fff5f7', borderRadius: '12px', borderWidth: '2', borderColor: '#feca57', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#ff6348', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#1e90ff', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#5f27cd', fontStyle: 'normal' },
                footer: { text: '🍰 Fresh Daily - Smile Included!', fontSize: '8pt', color: '#ff9ff3' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_forest',
                nameKey: 'preset_forest',
                header: { text: 'Nature\'s Kitchen', color: '#2d6a4f', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#f1faee', borderRadius: '10px', borderWidth: '2', borderColor: '#52b788', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#1b4332', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#2d6a4f', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#40916c', fontStyle: 'italic' },
                footer: { text: '🌱 Farm to Table - Organic & Fresh', fontSize: '8pt', color: '#74c69d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_ocean',
                nameKey: 'preset_ocean',
                header: { text: 'Seaside Dining', color: '#023e8a', fontSize: '21pt', fontWeight: 'bold' },
                dayBlock: { bg: '#caf0f8', borderRadius: '8px', borderWidth: '2', borderColor: '#0077b6', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#03045e', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#023e8a', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#0096c7', fontStyle: 'italic' },
                footer: { text: '🌊 Fresh Catch Daily', fontSize: '8pt', color: '#00b4d8' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_luxury',
                nameKey: 'preset_luxury',
                header: { text: 'PRESTIGE MENU', color: '#c9920d', fontSize: '22pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fffaf0', borderRadius: '6px', borderWidth: '3', borderColor: '#d4af37', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#8b6914', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#6b5414', fontWeight: 'bold' },
                ingredients: { fontSize: '7.5pt', color: '#9a7b2f', fontStyle: 'normal' },
                footer: { text: '⭐ Five-Star Excellence', fontSize: '8pt', color: '#c9920d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_newspaper',
                nameKey: 'preset_newspaper',
                isDoubleColumn: true,
                header: { text: 'THE KITCHEN GAZETTE', color: '#000000', fontSize: '18pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '1', borderColor: '#000000', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#000000', fontWeight: 'bold' },
                mealTitle: { fontSize: '8pt', color: '#333333', fontWeight: 'bold' },
                ingredients: { fontSize: '7pt', color: '#666666', fontStyle: 'normal' },
                footer: { text: 'Volume 1, Issue 1 - All Rights Reserved', fontSize: '7pt', color: '#000000' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            }
        ],

        init: function() {
            console.log('🎪 Template Manager init() called');
            console.log('📋 savedTemplates on init:', window.savedTemplates.length);
            
            this.loadActiveTemplate();
            this.renderCollapsibleSections();
            this.bindImageUpload();
            this.renderTemplateLibrary();
            this.refreshPreview();
            
            // Listen for dataLoaded event to refresh template library
            window.addEventListener('dataLoaded', (e) => {
                console.log('🔄 dataLoaded event received! Refreshing template library...');
                console.log('📋 Templates loaded:', e.detail.templates.length);
                this.renderTemplateLibrary();
                this.renderUploadsGallery();
            });
        },

        renderCollapsibleSections: function() {
            const container = document.getElementById('collapsibleSections');
            if (!container) return;
            
            const sections = [
                {
                    id: 'background',
                    iconKey: 'section_background',
                    titleKey: 'section_background',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:4px; display:block;">${window.t('label_image_url')}</label>
                        <input type="text" id="backgroundImage" class="form-control" placeholder="https://..." style="font-size:0.85rem; height:32px;" data-filename="">
                        <small style="color:#666; font-size:0.7rem; display:block; margin-top:4px; line-height:1.3;">
                            <strong>${window.t('text_recommended_size')}</strong> ${window.t('text_image_dimensions')}
                        </small>
                    `
                },
                {
                    id: 'header',
                    iconKey: 'section_header',
                    titleKey: 'section_header',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_title')}</label>
                        <input type="text" id="headerText" class="form-control" placeholder="Weekly Menu" value="Weekly Menu" style="font-size:0.85rem; height:32px; margin-bottom:8px;">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_color')}</label>
                                <input type="color" id="headerColor" value="#fd7e14" style="width:100%; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_size')}</label>
                                <input type="text" id="headerSize" class="form-control" value="20pt" style="font-size:0.85rem; height:32px;">
                            </div>
                        </div>
                        
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_weight')}</label>
                        <select id="headerWeight" class="form-control" style="font-size:0.85rem; height:32px;">
                            <option value="normal">${window.t('font_weight_normal')}</option>
                            <option value="600">${window.t('font_weight_semibold')}</option>
                            <option value="bold" selected>${window.t('font_weight_bold')}</option>
                        </select>
                    `
                },
                {
                    id: 'dayBlock',
                    iconKey: 'section_day_block',
                    titleKey: 'section_day_block',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_background_color')}</label>
                        <input type="color" id="dayBg" value="#ffffff" style="width:100%; height:32px; margin-bottom:8px;">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_border_radius')}</label>
                                <input type="number" id="dayRadius" value="8" class="form-control" style="font-size:0.85rem; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_border_width')}</label>
                                <input type="number" id="dayBorderWidth" value="2" min="0" max="10" class="form-control" style="font-size:0.85rem; height:32px;">
                            </div>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_border_color')}</label>
                                <input type="color" id="dayBorderColor" value="#e0e0e0" style="width:100%; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_border_style')}</label>
                                <select id="dayBorderStyle" class="form-control" style="font-size:0.85rem; height:32px;">
                                    <option value="solid">${window.t('border_style_solid')}</option>
                                    <option value="dashed">${window.t('border_style_dashed')}</option>
                                    <option value="dotted">${window.t('border_style_dotted')}</option>
                                    <option value="double">${window.t('border_style_double')}</option>
                                </select>
                            </div>
                        </div>
                    `
                },
                {
                    id: 'dayName',
                    iconKey: 'section_day_name',
                    titleKey: 'section_day_name',
                    html: `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_size')}</label>
                                <input type="text" id="dayNameSize" class="form-control" value="11pt" style="font-size:0.85rem; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_color')}</label>
                                <input type="color" id="dayNameColor" value="#2c3e50" style="width:100%; height:32px;">
                            </div>
                        </div>
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_weight')}</label>
                        <select id="dayNameWeight" class="form-control" style="font-size:0.85rem; height:32px;">
                            <option value="normal">${window.t('font_weight_normal')}</option>
                            <option value="500">${window.t('font_weight_medium')}</option>
                            <option value="600" selected>${window.t('font_weight_semibold')}</option>
                            <option value="bold">${window.t('font_weight_bold')}</option>
                        </select>
                    `
                },
                {
                    id: 'mealTitle',
                    iconKey: 'section_meal_title',
                    titleKey: 'section_meal_title',
                    html: `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_size')}</label>
                                <input type="text" id="mealTitleSize" class="form-control" value="9pt" style="font-size:0.85rem; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_color')}</label>
                                <input type="color" id="mealTitleColor" value="#333333" style="width:100%; height:32px;">
                            </div>
                        </div>
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_weight')}</label>
                        <select id="mealTitleWeight" class="form-control" style="font-size:0.85rem; height:32px;">
                            <option value="normal">${window.t('font_weight_normal')}</option>
                            <option value="500">${window.t('font_weight_medium')}</option>
                            <option value="600" selected>${window.t('font_weight_semibold')}</option>
                            <option value="bold">${window.t('font_weight_bold')}</option>
                        </select>
                    `
                },
                {
                    id: 'ingredients',
                    iconKey: 'section_ingredients',
                    titleKey: 'section_ingredients',
                    html: `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_size')}</label>
                                <input type="text" id="ingredientsSize" class="form-control" value="7.5pt" style="font-size:0.85rem; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_color')}</label>
                                <input type="color" id="ingredientsColor" value="#555555" style="width:100%; height:32px;">
                            </div>
                        </div>
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_style')}</label>
                        <select id="ingredientsStyle" class="form-control" style="font-size:0.85rem; height:32px;">
                            <option value="normal">${window.t('font_style_normal')}</option>
                            <option value="italic" selected>${window.t('font_style_italic')}</option>
                        </select>
                    `
                },
                {
                    id: 'mealVisibility',
                    iconKey: 'section_meal_visibility',
                    titleKey: 'section_meal_visibility',
                    html: `
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:6px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_1_label')}</h4>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot1_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot1_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.8rem; display:block;"><input type="checkbox" id="slot1_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>

                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:6px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_2_label')}</h4>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot2_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot2_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.8rem; display:block;"><input type="checkbox" id="slot2_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>

                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:6px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_3_label')}</h4>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot3_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot3_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.8rem; display:block;"><input type="checkbox" id="slot3_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>

                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_4_label')}</h4>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot4_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.8rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot4_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.8rem; display:block;"><input type="checkbox" id="slot4_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                    `
                },
                {
                    id: 'footer',
                    iconKey: 'section_footer',
                    titleKey: 'section_footer',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_text')}</label>
                        <textarea id="footerText" class="form-control" rows="2" placeholder="Additional notes..." style="font-size:0.85rem; margin-bottom:8px;">Prepared with care by KitchenPro</textarea>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_font_size')}</label>
                                <input type="text" id="footerSize" class="form-control" value="8pt" style="font-size:0.85rem; height:32px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_color')}</label>
                                <input type="color" id="footerColor" value="#7f8c8d" style="width:100%; height:32px;">
                            </div>
                        </div>
                    `
                }
            ];

            sections.forEach(section => {
                const sectionDiv = this.createCollapsibleSection(section);
                container.appendChild(sectionDiv);
            });
            
            // Bind UI after sections are created
            this.bindUI();
        },

        createCollapsibleSection: function(section) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'margin-bottom: 10px;';
            
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--color-background); border-radius: 5px; cursor: pointer; transition: background 0.2s;';
            header.onmouseenter = () => header.style.background = '#e9ecef';
            header.onmouseleave = () => header.style.background = 'var(--color-background)';
            
            const title = document.createElement('h4');
            title.textContent = window.t(section.titleKey);
            title.style.cssText = 'margin: 0; color: #495057; font-size: 9.5pt; font-weight: 600;';
            
            const toggleIcon = document.createElement('span');
            const isExpanded = sectionStates[section.id] !== undefined ? sectionStates[section.id] : false;
            toggleIcon.textContent = isExpanded ? '▼' : '▶';
            toggleIcon.style.cssText = 'font-size: 9pt; color: #6c757d; transition: transform 0.2s;';
            
            header.appendChild(title);
            header.appendChild(toggleIcon);
            wrapper.appendChild(header);
            
            const content = document.createElement('div');
            content.innerHTML = section.html;
            content.style.cssText = `
                max-height: ${isExpanded ? '1000px' : '0'};
                overflow: hidden;
                transition: max-height 0.3s ease;
                padding: ${isExpanded ? '10px' : '0'} 10px;
            `;
            
            wrapper.appendChild(content);
            
            header.onclick = () => {
                const expanded = sectionStates[section.id];
                sectionStates[section.id] = !expanded;
                toggleIcon.textContent = sectionStates[section.id] ? '▼' : '▶';
                content.style.maxHeight = sectionStates[section.id] ? '1000px' : '0';
                content.style.padding = sectionStates[section.id] ? '10px' : '0 10px';
            };
            
            return wrapper;
        },

        bindImageUpload: function() {
            const bgInput = document.getElementById('backgroundImage');
            if (!bgInput) return;
            
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'btn btn-secondary';
            uploadBtn.textContent = window.t('btn_upload_image');
            uploadBtn.type = 'button';
            uploadBtn.style.marginTop = '6px';
            uploadBtn.style.width = '100%';
            uploadBtn.style.fontSize = '0.8rem';
            uploadBtn.style.height = '32px';
            
            uploadBtn.onclick = () => this.uploadBackgroundImage();
            bgInput.parentNode.insertBefore(uploadBtn, bgInput.nextSibling);
            
            this.renderUploadsGallery();
        },

        uploadBackgroundImage: async function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const timestamp = Date.now();
                const filename = `bg_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
                // Save file to pictures folder
                const filepath = await window.saveImageFile(file, filename);
                
                if (!filepath) {
                    alert('Failed to save image file. Please try again.');
                    return;
                }
                
                // Store metadata only (not base64)
                if (!window.imageUploads) window.imageUploads = [];
                window.imageUploads.push({
                    id: filename,
                    name: file.name,
                    filename: filename,
                    timestamp: timestamp
                });
                
                window.saveSettings();
                
                // Load the image for preview and store filename in data attribute
                const imageUrl = await window.loadImageFile(filename);
                const bgInput = document.getElementById('backgroundImage');
                bgInput.value = imageUrl; // Display blob URL for preview
                bgInput.dataset.filename = filename; // Store actual filename
                
                this.refreshPreview();
                this.renderUploadsGallery();
                
                alert(window.t('alert_image_uploaded'));
            };
            
            input.click();
        },

        renderUploadsGallery: async function() {
            const bgInput = document.getElementById('backgroundImage');
            if (!bgInput) return;
            
            const existingGallery = document.getElementById('uploadsGallery');
            if (existingGallery) existingGallery.remove();
            
            const gallery = document.createElement('div');
            gallery.id = 'uploadsGallery';
            gallery.style.cssText = 'margin-top: 8px; padding: 6px; background: #f8f9fa; border-radius: 4px;';
            
            if (!window.imageUploads || window.imageUploads.length === 0) {
                gallery.innerHTML = `<small style="color: #6c757d; font-size: 0.75rem;">${window.t('text_no_uploads')}</small>`;
            } else {
                const header = document.createElement('div');
                header.style.cssText = 'font-weight: 600; margin-bottom: 4px; font-size: 0.75rem; color: #495057;';
                header.textContent = window.t('text_my_uploads');
                gallery.appendChild(header);
                
                for (const img of window.imageUploads) {
                    const imageUrl = await window.loadImageFile(img.filename);
                    
                    const imgCard = document.createElement('div');
                    imgCard.style.cssText = 'display: flex; align-items: center; gap: 5px; padding: 3px; background: white; border-radius: 3px; margin-bottom: 3px; border: 1px solid #dee2e6;';
                    
                    const thumbnail = document.createElement('img');
                    thumbnail.src = imageUrl || '';
                    thumbnail.style.cssText = 'width: 28px; height: 28px; object-fit: cover; border-radius: 2px;';
                    
                    const info = document.createElement('div');
                    info.style.flex = '1';
                    info.style.overflow = 'hidden';
                    info.innerHTML = `<div style="font-size: 0.7rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.name}</div>`;
                    
                    const useBtn = document.createElement('button');
                    useBtn.className = 'btn btn-small btn-primary';
                    useBtn.textContent = window.t('btn_use');
                    useBtn.style.fontSize = '0.65rem';
                    useBtn.style.height = '22px';
                    useBtn.style.padding = '0 6px';
                    useBtn.onclick = async () => {
                        const url = await window.loadImageFile(img.filename);
                        const bgInput = document.getElementById('backgroundImage');
                        bgInput.value = url; // Display blob URL for preview
                        bgInput.dataset.filename = img.filename; // Store filename for saving/printing
                        this.refreshPreview();
                    };
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'icon-btn delete';
                    deleteBtn.textContent = '🗑️';
                    deleteBtn.style.width = '22px';
                    deleteBtn.style.height = '22px';
                    deleteBtn.style.fontSize = '0.8rem';
                    deleteBtn.onclick = async () => {
                        if (confirm(`${window.t('alert_delete_image')} "${img.name}"?`)) {
                            await window.deleteImageFile(img.filename);
                            window.imageUploads = window.imageUploads.filter(i => i.id !== img.id);
                            window.saveSettings();
                            this.renderUploadsGallery();
                        }
                    };
                    
                    imgCard.appendChild(thumbnail);
                    imgCard.appendChild(info);
                    imgCard.appendChild(useBtn);
                    imgCard.appendChild(deleteBtn);
                    gallery.appendChild(imgCard);
                }
            }
            
            const uploadBtnSibling = bgInput.nextSibling.nextSibling;
            if (uploadBtnSibling) {
                bgInput.parentNode.insertBefore(gallery, uploadBtnSibling);
            } else {
                bgInput.parentNode.appendChild(gallery);
            }
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
            
            const bgInput = document.getElementById('backgroundImage');
            if (bgInput) bgInput.dataset.filename = '';
            
            for (let i = 1; i <= 4; i++) {
                this.setChecked(`slot${i}_showIngredients`, true);
                this.setChecked(`slot${i}_showCalories`, true);
                this.setChecked(`slot${i}_showAllergens`, true);
            }
        },

        applyTemplateToUI: async function(template) {
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
            this.setVal('footerText', template.footer.text);
            
            // Handle background image - convert filename to blob URL for display
            const bgInput = document.getElementById('backgroundImage');
            if (template.backgroundImage) {
                // If it's a filename (not a URL), load it as blob
                if (!template.backgroundImage.startsWith('http') && !template.backgroundImage.startsWith('blob:')) {
                    const imageUrl = await window.loadImageFile(template.backgroundImage);
                    bgInput.value = imageUrl || '';
                    bgInput.dataset.filename = template.backgroundImage;
                } else {
                    bgInput.value = template.backgroundImage;
                    bgInput.dataset.filename = '';
                }
            } else {
                bgInput.value = '';
                bgInput.dataset.filename = '';
            }
            
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

            // Get filename from data attribute, not the blob URL value
            const bgInput = document.getElementById('backgroundImage');
            const backgroundImage = bgInput?.dataset.filename || bgInput?.value || '';

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
                backgroundImage: backgroundImage, // This is now the filename, not blob URL
                slotSettings: slotSettings
            };
        },

        refreshPreview: async function() {
            const settings = this.getSettingsFromUI();
            
            const sheet = document.getElementById('livePreviewSheet');
            if (sheet && settings.backgroundImage) {
                // Convert filename to blob URL for preview
                let previewUrl = settings.backgroundImage;
                if (!previewUrl.startsWith('http') && !previewUrl.startsWith('blob:')) {
                    previewUrl = await window.loadImageFile(settings.backgroundImage);
                }
                if (previewUrl) {
                    sheet.style.backgroundImage = `url(${previewUrl})`;
                    sheet.style.backgroundSize = 'cover';
                    sheet.style.backgroundPosition = 'center';
                    sheet.style.backgroundRepeat = 'no-repeat';
                }
            } else if (sheet) {
                sheet.style.backgroundImage = 'none';
            }
            
            const h = document.getElementById('previewHeader');
            const dateRange = this.getDateRangeText(0, 4);
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; text-align:center; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                    <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                `;
            }

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
                contentHtml += `<p style="color:#aaa; font-style:italic; text-align:center; padding:8px 0; font-size:8pt; margin:0; line-height:1;">${window.t('empty_day')}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, settings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';
            
            let html = `<div style="margin-bottom:5px;">`;
            
            let titleLine = `<div style="font-size:${settings.mealTitle.fontSize}; font-weight:${settings.mealTitle.fontWeight}; color:${settings.mealTitle.color}; margin-bottom:2px; line-height:1.2;">${index}. ${recipe.name}`;
            
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
                    html += `<div style="font-size:${settings.ingredients.fontSize}; color:${settings.ingredients.color}; font-style:${settings.ingredients.fontStyle}; margin-top:1px; margin-left:10px; line-height:1.2;"><em>${window.t('text_ingredients_prefix')}</em> ${ingredientsList}</div>`;
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
        },

        renderTemplateLibrary: function() {
            const container = document.getElementById('templateLibrary');
            if (!container) return;
            
            console.log('🔄 Rendering template library. Templates available:', window.savedTemplates.length);
            
            container.innerHTML = '';

            // COLLAPSIBLE Preset Templates Section
            const presetSection = document.createElement('div');
            presetSection.style.cssText = 'margin-bottom: 10px;';
            
            const presetHeader = document.createElement('div');
            presetHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--color-background); border-radius: 5px; cursor: pointer; transition: background 0.2s;';
            presetHeader.onmouseenter = () => presetHeader.style.background = '#e9ecef';
            presetHeader.onmouseleave = () => presetHeader.style.background = 'var(--color-background)';
            
            const presetTitle = document.createElement('h4');
            presetTitle.textContent = window.t('heading_preset_templates');
            presetTitle.style.cssText = 'margin: 0; color: #fd7e14; font-size: 9.5pt; font-weight: 600;';
            
            const toggleIcon = document.createElement('span');
            toggleIcon.textContent = presetsExpanded ? '▼' : '▶';
            toggleIcon.style.cssText = 'font-size: 9pt; color: #6c757d; transition: transform 0.2s;';
            
            presetHeader.appendChild(presetTitle);
            presetHeader.appendChild(toggleIcon);
            presetSection.appendChild(presetHeader);
            
            // Collapsible content
            const presetContent = document.createElement('div');
            presetContent.id = 'presetContent';
            presetContent.style.cssText = `
                max-height: ${presetsExpanded ? '2000px' : '0'};
                overflow: hidden;
                transition: max-height 0.3s ease;
                padding-top: ${presetsExpanded ? '6px' : '0'};
            `;
            
            this.presets.forEach(preset => {
                const card = this.createPresetCard(preset);
                presetContent.appendChild(card);
            });
            
            presetSection.appendChild(presetContent);
            container.appendChild(presetSection);
            
            // Toggle functionality
            presetHeader.onclick = () => {
                presetsExpanded = !presetsExpanded;
                toggleIcon.textContent = presetsExpanded ? '▼' : '▶';
                presetContent.style.maxHeight = presetsExpanded ? '2000px' : '0';
                presetContent.style.paddingTop = presetsExpanded ? '6px' : '0';
            };

            // Separator
            const separator = document.createElement('div');
            separator.style.cssText = 'height: 1px; background: #ddd; margin: 10px 0;';
            container.appendChild(separator);

            // My Templates Section
            const customHeader = document.createElement('h4');
            customHeader.textContent = window.t('heading_my_templates');
            customHeader.style.cssText = 'margin: 0 0 6px 0; color: #6c757d; font-size: 9.5pt; font-weight: 600;';
            container.appendChild(customHeader);

            const defaultCard = this.createTemplateCard({
                id: 'default',
                name: window.t('template_default')
            }, activeTemplateId === 'default');
            container.appendChild(defaultCard);

            if (window.savedTemplates && window.savedTemplates.length > 0) {
                window.savedTemplates.forEach(tmpl => {
                    const card = this.createTemplateCard(tmpl, activeTemplateId === tmpl.id);
                    container.appendChild(card);
                });
            }
        },

        createPresetCard: function(preset) {
            const card = document.createElement('div');
            const isDoubleColumn = preset.isDoubleColumn || false;
            const badge = isDoubleColumn ? ' <span style="background:#fd7e14; color:white; padding:1px 4px; border-radius:2px; font-size:0.6rem; font-weight:bold;">2-COL</span>' : '';
            
            card.style.cssText = `
                padding: 5px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #ffffff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            card.onmouseenter = () => {
                card.style.borderColor = '#fd7e14';
                card.style.background = '#fff5e6';
            };
            card.onmouseleave = () => {
                card.style.borderColor = '#ddd';
                card.style.background = '#ffffff';
            };

            const nameSpan = document.createElement('span');
            nameSpan.innerHTML = window.t(preset.nameKey) + badge;
            nameSpan.style.cssText = 'font-weight: 500; font-size: 0.75rem; color: #333; flex: 1;';
            
            const loadBtn = document.createElement('button');
            loadBtn.textContent = window.t('btn_use');
            loadBtn.className = 'btn btn-small btn-primary';
            loadBtn.style.height = '24px';
            loadBtn.style.padding = '0 8px';
            loadBtn.style.fontSize = '0.7rem';
            loadBtn.onclick = async (e) => {
                e.stopPropagation();
                await this.applyTemplateToUI(preset);
                this.refreshPreview();
            };

            card.appendChild(nameSpan);
            card.appendChild(loadBtn);
            return card;
        },

        createTemplateCard: function(template, isActive) {
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 6px 8px;
                border: 1px solid ${isActive ? '#fd7e14' : '#ddd'};
                border-radius: 4px;
                background: ${isActive ? '#fff5e6' : '#f9f9f9'};
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            `;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = template.name;
            nameSpan.style.fontWeight = isActive ? '600' : '400';
            nameSpan.style.color = isActive ? '#fd7e14' : '#333';
            nameSpan.style.fontSize = '0.8rem';
            nameSpan.style.flex = '1';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '4px';

            if (!isActive) {
                const loadBtn = document.createElement('button');
                loadBtn.textContent = window.t('btn_load');
                loadBtn.className = 'btn btn-small btn-secondary';
                loadBtn.style.height = '24px';
                loadBtn.style.padding = '0 8px';
                loadBtn.style.fontSize = '0.7rem';
                loadBtn.onclick = () => this.loadTemplate(template.id);
                btnContainer.appendChild(loadBtn);
            }

            if (template.id !== 'default') {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.style.width = '24px';
                deleteBtn.style.height = '24px';
                deleteBtn.style.fontSize = '0.85rem';
                deleteBtn.onclick = () => this.deleteTemplate(template.id);
                btnContainer.appendChild(deleteBtn);
            }

            card.appendChild(nameSpan);
            card.appendChild(btnContainer);
            return card;
        },

        loadTemplate: async function(id) {
            if (id === 'default') {
                this.applyDefaultSettings();
            } else {
                const tmpl = window.savedTemplates.find(t => t.id === id);
                if (tmpl) await this.applyTemplateToUI(tmpl);
            }
            activeTemplateId = id;
            localStorage.setItem('activeTemplateId', id);
            this.renderTemplateLibrary();
            this.refreshPreview();
        },

        deleteTemplate: function(id) {
            if (!confirm(window.t('alert_delete_template'))) return;
            window.savedTemplates = window.savedTemplates.filter(t => t.id !== id);
            if (activeTemplateId === id) {
                this.loadTemplate('default');
            }
            window.saveSettings();
            this.renderTemplateLibrary();
        }
    };

    // Global Functions
    window.saveCurrentTemplate = function() {
        const name = prompt(window.t('alert_template_name_prompt'), window.t('template_my_template') + ' ' + (window.savedTemplates.length + 1));
        if (!name) return;
        
        const settings = TemplateManager.getSettingsFromUI();
        settings.name = name;
        settings.id = 'tmpl_' + Date.now();
        
        window.savedTemplates.push(settings);
        window.saveSettings();
        
        activeTemplateId = settings.id;
        localStorage.setItem('activeTemplateId', settings.id);
        TemplateManager.renderTemplateLibrary();
        alert(window.t('alert_template_saved'));
    };

    window.openTemplatePicker = function() {
        const modal = document.getElementById('templatePickerModal');
        const grid = document.getElementById('templateGrid');
        if (!modal || !grid) return;
        
        modal.style.display = 'block';
        grid.innerHTML = '';

        const weeksWithMeals = TemplateManager.getWeeksWithMeals();
        
        if (weeksWithMeals.length === 0) {
            grid.innerHTML = `<p style="text-align:center; color:#999; padding:40px;">${window.t('alert_no_meals_week')}</p>`;
            return;
        }

        const weekSection = document.createElement('div');
        weekSection.style.cssText = 'margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;';
        
        const weekLabel = document.createElement('label');
        weekLabel.textContent = window.t('heading_select_week');
        weekLabel.style.cssText = 'display: block; font-weight: 600; margin-bottom: 10px; font-size: 14pt;';
        
        const weekSelect = document.createElement('select');
        weekSelect.id = 'weekSelector';
        weekSelect.style.cssText = 'width: 100%; padding: 12px; font-size: 12pt; border-radius: 6px; border: 2px solid #dee2e6;';
        
        weeksWithMeals.forEach((week, index) => {
            const option = document.createElement('option');
            option.value = week.weekStart.toISOString().split('T')[0];
            option.textContent = `${week.label} (${week.dateCount} days with meals)`;
            if (index === 0) option.selected = true;
            weekSelect.appendChild(option);
        });
        
        weekSection.appendChild(weekLabel);
        weekSection.appendChild(weekSelect);
        grid.appendChild(weekSection);

        const parts = weekSelect.value.split('-');
        selectedWeekStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        
        weekSelect.addEventListener('change', (e) => {
            const parts = e.target.value.split('-');
            selectedWeekStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        });

        const templateSection = document.createElement('div');
        const templateLabel = document.createElement('h3');
        templateLabel.textContent = window.t('heading_select_template');
        templateLabel.style.cssText = 'margin: 0 0 20px 0; font-size: 14pt;';
        templateSection.appendChild(templateLabel);

        const templateGridContainer = document.createElement('div');
        templateGridContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;';

        const allTemplates = [
            { id: 'current', name: window.t('template_current') },
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
                <button class="btn btn-primary" onclick="event.stopPropagation(); window.printWithTemplate('${t.id}')" style="width:100%;">${window.t('btn_print')}</button>
            `;
            templateGridContainer.appendChild(card);
        });

        templateSection.appendChild(templateGridContainer);
        grid.appendChild(templateSection);
    };

    window.printWithTemplate = async function(id) {
        let settings;
        if (id === 'current') {
            settings = TemplateManager.getSettingsFromUI();
        } else {
            settings = window.savedTemplates.find(t => t.id === id);
        }
        
        if (!settings) {
            alert(window.t('alert_template_not_found'));
            return;
        }

        const weekStart = selectedWeekStart || window.getWeekStart(window.currentCalendarDate || new Date());

        // CONVERT BACKGROUND IMAGE TO BASE64 BEFORE OPENING PRINT WINDOW
        console.log('🖼️ Converting background image to base64...');
        let backgroundStyle = '';
        if (settings.backgroundImage) {
            // If it's not a URL, it's a filename - convert to base64
            if (!settings.backgroundImage.startsWith('http')) {
                try {
                    console.log('📁 Loading file:', settings.backgroundImage);
                    const base64 = await window.convertImageFileToBase64(settings.backgroundImage);
                    if (base64) {
                        console.log('✅ Base64 conversion successful, length:', base64.length);
                        backgroundStyle = `background-image: url(${base64}); background-size: cover; background-position: center; background-repeat: no-repeat;`;
                    } else {
                        console.warn('⚠️ Base64 conversion returned null');
                    }
                } catch (error) {
                    console.error('❌ Failed to convert background image for printing:', error);
                }
            } else {
                // It's a regular URL, use as-is
                backgroundStyle = `background-image: url(${settings.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat;`;
            }
        }

        const lang = window.getCurrentLanguage();
        const isBulgarian = lang === 'bg';
        
        let daysHtml = '';
        let daysWithMeals = [];
        
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

        if (daysWithMeals.length === 0) {
            alert(window.t('alert_no_meals_week'));
            return;
        }

        const firstDay = daysWithMeals[0];
        const lastDay = daysWithMeals[daysWithMeals.length - 1];
        const dateRange = TemplateManager.getDateRangeText(firstDay, lastDay, weekStart);

        const html = `
            <html>
            <head>
                <title>${window.t('modal_print_menu')}</title>
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
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .print-day-block { 
                        page-break-inside: avoid; 
                    }
                    @media print { 
                        body { 
                            padding: 0; 
                            margin: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
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

        console.log('🖨️ Opening print window...');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        document.getElementById('templatePickerModal').style.display = 'none';
        
        selectedWeekStart = null;
    };

    window.getWeekStart = window.getWeekStart || function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('collapsibleSections')) {
            TemplateManager.init();
        }
    });

})(window);

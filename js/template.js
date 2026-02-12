/**
 * Advanced Template Manager
 * 20+ customization features with full rendering support
 */

(function(window) {
    let activeTemplateId = null;
    let selectedWeekStart = null;
    let presetsExpanded = false;
    
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
            this.renderPresetTemplates();
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
                title.textContent = preset.nameKey || 'Classic Template';

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
            alert(window.t('alert_preset_loaded') || 'Preset template loaded!');
        },

        renderCollapsibleSections: function() {
            const container = document.getElementById('collapsibleSections');
            if (!container) return;
            
            const sections = [
                // LAYOUT SECTION
                {
                    id: 'layout',
                    titleKey: 'Layout & Spacing',
                    html: `
                        <div style="margin-bottom:8px;">
                            <label style="font-size:0.85rem; font-weight:600; margin-bottom:4px; display:block;">Page Margins (mm)</label>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                                <div>
                                    <label style="font-size:0.75rem;">Top</label>
                                    <input type="number" id="marginTop" value="8" min="0" max="30" class="form-control" style="font-size:0.85rem; height:28px;">
                                </div>
                                <div>
                                    <label style="font-size:0.75rem;">Bottom</label>
                                    <input type="number" id="marginBottom" value="8" min="0" max="30" class="form-control" style="font-size:0.85rem; height:28px;">
                                </div>
                                <div>
                                    <label style="font-size:0.75rem;">Left</label>
                                    <input type="number" id="marginLeft" value="8" min="0" max="30" class="form-control" style="font-size:0.85rem; height:28px;">
                                </div>
                                <div>
                                    <label style="font-size:0.75rem;">Right</label>
                                    <input type="number" id="marginRight" value="8" min="0" max="30" class="form-control" style="font-size:0.85rem; height:28px;">
                                </div>
                            </div>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <div>
                                <label style="font-size:0.85rem;">Day Block Spacing (px)</label>
                                <input type="number" id="dayBlockSpacing" value="6" min="0" max="20" class="form-control" style="font-size:0.85rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.85rem;">Column Gap (px)</label>
                                <input type="number" id="columnGap" value="10" min="0" max="30" class="form-control" style="font-size:0.85rem; height:28px;">
                            </div>
                        </div>
                    `
                },
                
                // BACKGROUND SECTION
                {
                    id: 'background',
                    titleKey: 'Background',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:4px; display:block;">Background Image</label>
                        <input type="text" id="backgroundImage" class="form-control" placeholder="https://..." style="font-size:0.85rem; height:32px;" data-filename="">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px; margin-top:8px;">
                            <div>
                                <label style="font-size:0.75rem;">Opacity</label>
                                <input type="range" id="bgOpacity" min="0" max="1" step="0.1" value="1" style="width:100%;">
                                <small id="bgOpacityValue" style="font-size:0.7rem;">100%</small>
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Position</label>
                                <select id="bgPosition" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="center">Center</option>
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Overlay</label>
                                <input type="color" id="bgOverlay" value="#000000" style="width:100%; height:28px;">
                            </div>
                        </div>
                        <div style="margin-top:4px;">
                            <label style="font-size:0.75rem;">Overlay Opacity</label>
                            <input type="range" id="bgOverlayOpacity" min="0" max="1" step="0.1" value="0" style="width:100%;">
                            <small id="bgOverlayOpacityValue" style="font-size:0.7rem;">0%</small>
                        </div>
                    `
                },
                
                // BRANDING SECTION
                {
                    id: 'branding',
                    titleKey: 'Branding & Logo',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:4px; display:block;">Logo Image</label>
                        <input type="text" id="logoImage" class="form-control" placeholder="Upload logo..." style="font-size:0.85rem; height:32px;" data-filename="" readonly>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px; margin-top:8px;">
                            <div>
                                <label style="font-size:0.75rem;">Position</label>
                                <select id="logoPosition" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="top-left">Top Left</option>
                                    <option value="top-center">Top Center</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="header">In Header</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Width (px)</label>
                                <input type="number" id="logoWidth" value="80" min="20" max="200" class="form-control" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Height (px)</label>
                                <input type="number" id="logoHeight" value="80" min="20" max="200" class="form-control" style="font-size:0.75rem; height:28px;">
                            </div>
                        </div>
                    `
                },
                
                // HEADER SECTION
                {
                    id: 'header',
                    titleKey: 'Header',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">${window.t('label_title')}</label>
                        <input type="text" id="headerText" class="form-control" value="Weekly Menu" style="font-size:0.85rem; height:32px; margin-bottom:8px;">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="headerColor" value="#fd7e14" style="width:100%; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Size</label>
                                <input type="text" id="headerSize" class="form-control" value="20pt" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Weight</label>
                                <select id="headerWeight" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="normal">Normal</option>
                                    <option value="600">Semibold</option>
                                    <option value="bold" selected>Bold</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Font</label>
                                <select id="headerFont" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="Segoe UI" selected>Segoe UI</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Times New Roman">Times</option>
                                    <option value="Courier New">Courier</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Align</label>
                                <select id="headerAlign" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="left">Left</option>
                                    <option value="center" selected>Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Transform</label>
                                <select id="headerTransform" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="none" selected>None</option>
                                    <option value="uppercase">UPPERCASE</option>
                                    <option value="lowercase">lowercase</option>
                                    <option value="capitalize">Capitalize</option>
                                </select>
                            </div>
                        </div>
                    `
                },
                
                // DATE RANGE SECTION
                {
                    id: 'dateRange',
                    titleKey: 'Date Range',
                    html: `
                        <label style="font-size:0.8rem; display:block; margin-bottom:8px;">
                            <input type="checkbox" id="showDateRange" checked> Show Date Range
                        </label>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Size</label>
                                <input type="text" id="dateRangeSize" class="form-control" value="9pt" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="dateRangeColor" value="#7f8c8d" style="width:100%; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Weight</label>
                                <select id="dateRangeWeight" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="normal" selected>Normal</option>
                                    <option value="600">Semibold</option>
                                    <option value="bold">Bold</option>
                                </select>
                            </div>
                        </div>
                    `
                },
                
                // DAY BLOCK SECTION
                {
                    id: 'dayBlock',
                    titleKey: 'Day Block',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">Background Color</label>
                        <input type="color" id="dayBg" value="#ffffff" style="width:100%; height:32px; margin-bottom:8px;">
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:0.75rem;">Border Radius</label>
                                <input type="number" id="dayRadius" value="8" class="form-control" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Border Width</label>
                                <input type="number" id="dayBorderWidth" value="2" min="0" max="10" class="form-control" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Border Style</label>
                                <select id="dayBorderStyle" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                    <option value="double">Double</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="margin-bottom:8px;">
                            <label style="font-size:0.75rem;">Border Sides</label>
                            <select id="dayBorderSides" class="form-control" style="font-size:0.75rem; height:28px;">
                                <option value="all" selected>All</option>
                                <option value="top">Top Only</option>
                                <option value="bottom">Bottom Only</option>
                                <option value="left-right">Left & Right</option>
                                <option value="top-bottom">Top & Bottom</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Border Color</label>
                                <input type="color" id="dayBorderColor" value="#e0e0e0" style="width:100%; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Shadow</label>
                                <select id="dayShadow" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="none" selected>None</option>
                                    <option value="light">Light</option>
                                    <option value="medium">Medium</option>
                                    <option value="strong">Strong</option>
                                </select>
                            </div>
                        </div>
                    `
                },
                
                // Additional sections...
                {
                    id: 'dayName',
                    titleKey: 'Day Name',
                    html: `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Size</label>
                                <input type="text" id="dayNameSize" class="form-control" value="11pt" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="dayNameColor" value="#2c3e50" style="width:100%; height:28px;">
                            </div>
                        </div>
                        <label style="font-size:0.75rem;">Weight</label>
                        <select id="dayNameWeight" class="form-control" style="font-size:0.75rem; height:28px;">
                            <option value="normal">Normal</option>
                            <option value="500">Medium</option>
                            <option value="600" selected>Semibold</option>
                            <option value="bold">Bold</option>
                        </select>
                    `
                },
                {
                    id: 'mealTitle',
                    titleKey: 'Meal Title',
                    html: `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Size</label>
                                <input type="text" id="mealTitleSize" class="form-control" value="9pt" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="mealTitleColor" value="#333333" style="width:100%; height:28px;">
                            </div>
                        </div>
                        <label style="font-size:0.75rem;">Weight</label>
                        <select id="mealTitleWeight" class="form-control" style="font-size:0.75rem; height:28px;">
                            <option value="normal">Normal</option>
                            <option value="500">Medium</option>
                            <option value="600" selected>Semibold</option>
                            <option value="bold">Bold</option>
                        </select>
                    `
                },
                
                // MEAL NUMBERING SECTION
                {
                    id: 'mealNumbering',
                    titleKey: 'Meal Numbering',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:4px; display:block;">Numbering Style</label>
                        <select id="mealNumberStyle" class="form-control" style="font-size:0.85rem; height:32px; margin-bottom:8px;">
                            <option value="numbers" selected>Numbers (1. 2. 3. 4.)</option>
                            <option value="bullets">Bullets (•)</option>
                            <option value="letters">Letters (A. B. C. D.)</option>
                            <option value="roman">Roman (I. II. III. IV.)</option>
                            <option value="none">None</option>
                        </select>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Prefix</label>
                                <input type="text" id="mealNumberPrefix" class="form-control" placeholder="e.g., #" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Suffix</label>
                                <input type="text" id="mealNumberSuffix" class="form-control" value="." placeholder="e.g., )" style="font-size:0.75rem; height:28px;">
                            </div>
                        </div>
                    `
                },
                
                // SEPARATORS SECTION
                {
                    id: 'separators',
                    titleKey: 'Separators',
                    html: `
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:8px; background:#fafafa;">
                            <label style="font-size:0.8rem; display:block; margin-bottom:6px;">
                                <input type="checkbox" id="headerSepEnabled"> Header Separator
                            </label>
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px;">
                                <select id="headerSepStyle" class="form-control" style="font-size:0.7rem; height:24px;">
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                </select>
                                <input type="color" id="headerSepColor" value="#ddd" style="width:100%; height:24px;">
                                <input type="number" id="headerSepWidth" value="1" min="1" max="5" class="form-control" style="font-size:0.7rem; height:24px;">
                            </div>
                        </div>
                        
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; background:#fafafa;">
                            <label style="font-size:0.8rem; display:block; margin-bottom:6px;">
                                <input type="checkbox" id="footerSepEnabled" checked> Footer Separator
                            </label>
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px;">
                                <select id="footerSepStyle" class="form-control" style="font-size:0.7rem; height:24px;">
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                </select>
                                <input type="color" id="footerSepColor" value="#eee" style="width:100%; height:24px;">
                                <input type="number" id="footerSepWidth" value="1" min="1" max="5" class="form-control" style="font-size:0.7rem; height:24px;">
                            </div>
                        </div>
                    `
                },
                
                {
                    id: 'ingredients',
                    titleKey: 'Ingredients',
                    html: `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Size</label>
                                <input type="text" id="ingredientsSize" class="form-control" value="7.5pt" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="ingredientsColor" value="#555555" style="width:100%; height:28px;">
                            </div>
                        </div>
                        <label style="font-size:0.75rem;">Style</label>
                        <select id="ingredientsStyle" class="form-control" style="font-size:0.75rem; height:28px;">
                            <option value="normal">Normal</option>
                            <option value="italic" selected>Italic</option>
                        </select>
                    `
                },
                {
                    id: 'mealVisibility',
                    titleKey: 'Meal Visibility',
                    html: `
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:6px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_1_label')}</h4>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot1_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot1_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.75rem; display:block;"><input type="checkbox" id="slot1_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:6px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_2_label')}</h4>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot2_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot2_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.75rem; display:block;"><input type="checkbox" id="slot2_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; margin-bottom:6px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_3_label')}</h4>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot3_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot3_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.75rem; display:block;"><input type="checkbox" id="slot3_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                        <div style="border:1px solid #ddd; padding:8px; border-radius:4px; background:#fafafa;">
                            <h4 style="margin:0 0 6px 0; color:#fd7e14; font-size:9pt; font-weight:600;">${window.t('slot_4_label')}</h4>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot4_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label style="font-size:0.75rem; display:block; margin-bottom:2px;"><input type="checkbox" id="slot4_showCalories" checked> ${window.t('show_calories')}</label>
                            <label style="font-size:0.75rem; display:block;"><input type="checkbox" id="slot4_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                    `
                },
                
                // PAGE BORDER SECTION
                {
                    id: 'pageBorder',
                    titleKey: 'Page Border',
                    html: `
                        <label style="font-size:0.8rem; display:block; margin-bottom:8px;">
                            <input type="checkbox" id="pageBorderEnabled"> Enable Page Border
                        </label>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Width</label>
                                <input type="number" id="pageBorderWidth" value="1" min="1" max="10" class="form-control" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="pageBorderColor" value="#000000" style="width:100%; height:28px;">
                            </div>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Style</label>
                                <select id="pageBorderStyle" class="form-control" style="font-size:0.75rem; height:28px;">
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                    <option value="double">Double</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Corner Radius</label>
                                <input type="number" id="pageBorderRadius" value="0" min="0" max="20" class="form-control" style="font-size:0.75rem; height:28px;">
                            </div>
                        </div>
                    `
                },
                
                {
                    id: 'footer',
                    titleKey: 'Footer',
                    html: `
                        <label style="font-size:0.85rem; margin-bottom:3px; display:block;">Text</label>
                        <textarea id="footerText" class="form-control" rows="2" placeholder="Additional notes..." style="font-size:0.85rem; margin-bottom:8px;">Prepared with care by KitchenPro</textarea>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div>
                                <label style="font-size:0.75rem;">Size</label>
                                <input type="text" id="footerSize" class="form-control" value="8pt" style="font-size:0.75rem; height:28px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem;">Color</label>
                                <input type="color" id="footerColor" value="#7f8c8d" style="width:100%; height:28px;">
                            </div>
                        </div>
                    `
                }
            ];

            sections.forEach(section => {
                const sectionDiv = this.createCollapsibleSection(section);
                container.appendChild(sectionDiv);
            });
            
            this.bindUI();
            this.setupOpacitySliders();
        },

        createCollapsibleSection: function(section) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'margin-bottom: 10px;';
            
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--color-background); border-radius: 5px; cursor: pointer; transition: background 0.2s;';
            header.onmouseenter = () => header.style.background = '#e9ecef';
            header.onmouseleave = () => header.style.background = 'var(--color-background)';
            
            const title = document.createElement('h4');
            title.textContent = section.titleKey;
            title.style.cssText = 'margin: 0; color: #495057; font-size: 9.5pt; font-weight: 600;';
            
            const toggleIcon = document.createElement('span');
            const isExpanded = sectionStates[section.id] !== undefined ? sectionStates[section.id] : false;
            toggleIcon.textContent = isExpanded ? '▼' : '▶';
            toggleIcon.style.cssText = 'font-size: 9pt; color: #6c757d;';
            
            header.appendChild(title);
            header.appendChild(toggleIcon);
            wrapper.appendChild(header);
            
            const content = document.createElement('div');
            content.innerHTML = section.html;
            content.style.cssText = `
                max-height: ${isExpanded ? '2000px' : '0'};
                overflow: hidden;
                transition: max-height 0.3s ease;
                padding: ${isExpanded ? '10px' : '0'} 10px;
            `;
            
            wrapper.appendChild(content);
            
            header.onclick = () => {
                sectionStates[section.id] = !sectionStates[section.id];
                toggleIcon.textContent = sectionStates[section.id] ? '▼' : '▶';
                content.style.maxHeight = sectionStates[section.id] ? '2000px' : '0';
                content.style.padding = sectionStates[section.id] ? '10px' : '0 10px';
            };
            
            return wrapper;
        },

        setupOpacitySliders: function() {
            const bgOpacity = document.getElementById('bgOpacity');
            const bgOpacityValue = document.getElementById('bgOpacityValue');
            if (bgOpacity && bgOpacityValue) {
                bgOpacity.addEventListener('input', (e) => {
                    bgOpacityValue.textContent = Math.round(e.target.value * 100) + '%';
                    this.refreshPreview();
                });
            }
            
            const bgOverlayOpacity = document.getElementById('bgOverlayOpacity');
            const bgOverlayOpacityValue = document.getElementById('bgOverlayOpacityValue');
            if (bgOverlayOpacity && bgOverlayOpacityValue) {
                bgOverlayOpacity.addEventListener('input', (e) => {
                    bgOverlayOpacityValue.textContent = Math.round(e.target.value * 100) + '%';
                    this.refreshPreview();
                });
            }
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

        bindLogoUpload: function() {
            const logoInput = document.getElementById('logoImage');
            if (!logoInput) return;
            
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'btn btn-secondary';
            uploadBtn.textContent = 'Upload Logo';
            uploadBtn.type = 'button';
            uploadBtn.style.marginTop = '6px';
            uploadBtn.style.width = '100%';
            uploadBtn.style.fontSize = '0.8rem';
            uploadBtn.style.height = '32px';
            
            uploadBtn.onclick = () => this.uploadLogo();
            logoInput.parentNode.insertBefore(uploadBtn, logoInput.nextSibling);
        },

        uploadLogo: async function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const timestamp = Date.now();
                const filename = `logo_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
                const filepath = await window.saveImageFile(file, filename);
                if (!filepath) {
                    alert('Failed to save logo. Please try again.');
                    return;
                }
                
                if (!window.imageUploads) window.imageUploads = [];
                window.imageUploads.push({
                    id: filename,
                    name: file.name,
                    filename: filename,
                    timestamp: timestamp,
                    type: 'logo'
                });
                
                window.saveSettings();
                
                const imageUrl = await window.loadImageFile(filename);
                const logoInput = document.getElementById('logoImage');
                logoInput.value = imageUrl;
                logoInput.dataset.filename = filename;
                
                this.refreshPreview();
                alert('Logo uploaded successfully!');
            };
            
            input.click();
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
                
                const filepath = await window.saveImageFile(file, filename);
                if (!filepath) {
                    alert('Failed to save image file. Please try again.');
                    return;
                }
                
                if (!window.imageUploads) window.imageUploads = [];
                window.imageUploads.push({
                    id: filename,
                    name: file.name,
                    filename: filename,
                    timestamp: timestamp
                });
                
                window.saveSettings();
                
                const imageUrl = await window.loadImageFile(filename);
                const bgInput = document.getElementById('backgroundImage');
                bgInput.value = imageUrl;
                bgInput.dataset.filename = filename;
                
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
                    if (img.type === 'logo') continue;
                    
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
                        bgInput.value = url;
                        bgInput.dataset.filename = img.filename;
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
            
            this.setVal('marginTop', 8);
            this.setVal('marginBottom', 8);
            this.setVal('marginLeft', 8);
            this.setVal('marginRight', 8);
            this.setVal('dayBlockSpacing', 6);
            this.setVal('columnGap', 10);
            
            this.setVal('headerText', 'Weekly Menu');
            this.setVal('headerColor', '#fd7e14');
            this.setVal('headerSize', '20pt');
            this.setVal('headerWeight', 'bold');
            this.setVal('headerFont', 'Segoe UI');
            this.setVal('headerAlign', 'center');
            this.setVal('headerTransform', 'none');
            
            this.setChecked('showDateRange', true);
            this.setVal('dateRangeSize', '9pt');
            this.setVal('dateRangeColor', '#7f8c8d');
            this.setVal('dateRangeWeight', 'normal');
            
            this.setVal('dayBg', '#ffffff');
            this.setVal('dayRadius', 8);
            this.setVal('dayBorderWidth', 2);
            this.setVal('dayBorderColor', '#e0e0e0');
            this.setVal('dayBorderStyle', 'solid');
            this.setVal('dayBorderSides', 'all');
            this.setVal('dayShadow', 'none');
            
            this.setVal('dayNameSize', '11pt');
            this.setVal('dayNameColor', '#2c3e50');
            this.setVal('dayNameWeight', '600');
            
            this.setVal('mealTitleSize', '9pt');
            this.setVal('mealTitleColor', '#333333');
            this.setVal('mealTitleWeight', '600');
            
            this.setVal('mealNumberStyle', 'numbers');
            this.setVal('mealNumberPrefix', '');
            this.setVal('mealNumberSuffix', '.');
            
            this.setVal('ingredientsSize', '7.5pt');
            this.setVal('ingredientsColor', '#555555');
            this.setVal('ingredientsStyle', 'italic');
            
            this.setChecked('headerSepEnabled', false);
            this.setVal('headerSepStyle', 'solid');
            this.setVal('headerSepColor', '#ddd');
            this.setVal('headerSepWidth', 1);
            this.setChecked('footerSepEnabled', true);
            this.setVal('footerSepStyle', 'solid');
            this.setVal('footerSepColor', '#eee');
            this.setVal('footerSepWidth', 1);
            
            this.setVal('footerSize', '8pt');
            this.setVal('footerColor', '#7f8c8d');
            this.setVal('footerText', 'Prepared with care by KitchenPro');
            
            this.setVal('backgroundImage', '');
            this.setVal('bgOpacity', 1);
            this.setVal('bgPosition', 'center');
            this.setVal('bgOverlay', '#000000');
            this.setVal('bgOverlayOpacity', 0);
            
            this.setVal('logoImage', '');
            this.setVal('logoPosition', 'top-right');
            this.setVal('logoWidth', 80);
            this.setVal('logoHeight', 80);
            
            this.setChecked('pageBorderEnabled', false);
            this.setVal('pageBorderWidth', 1);
            this.setVal('pageBorderColor', '#000000');
            this.setVal('pageBorderStyle', 'solid');
            this.setVal('pageBorderRadius', 0);
            
            const bgInput = document.getElementById('backgroundImage');
            if (bgInput) bgInput.dataset.filename = '';
            
            for (let i = 1; i <= 4; i++) {
                this.setChecked(`slot${i}_showIngredients`, true);
                this.setChecked(`slot${i}_showCalories`, true);
                this.setChecked(`slot${i}_showAllergens`, true);
            }
        },

        applyTemplateToUI: async function(template) {
            this.setVal('headerText', template.header?.text || 'Weekly Menu');
            this.setVal('headerColor', template.header?.color || '#fd7e14');
            this.setVal('headerSize', template.header?.fontSize || '20pt');
            this.setVal('headerWeight', template.header?.fontWeight || 'bold');
            this.setVal('headerFont', template.header?.fontFamily || 'Segoe UI');
            this.setVal('headerAlign', template.header?.textAlign || 'center');
            this.setVal('headerTransform', template.header?.textTransform || 'none');
            
            this.setChecked('showDateRange', template.dateRange?.show !== false);
            this.setVal('dateRangeSize', template.dateRange?.fontSize || '9pt');
            this.setVal('dateRangeColor', template.dateRange?.color || '#7f8c8d');
            this.setVal('dateRangeWeight', template.dateRange?.fontWeight || 'normal');
            
            this.setVal('dayBg', template.dayBlock?.bg || '#ffffff');
            this.setVal('dayRadius', parseInt(template.dayBlock?.borderRadius) || 8);
            this.setVal('dayBorderWidth', parseInt(template.dayBlock?.borderWidth) || 2);
            this.setVal('dayBorderColor', template.dayBlock?.borderColor || '#e0e0e0');
            this.setVal('dayBorderStyle', template.dayBlock?.borderStyle || 'solid');
            this.setVal('dayBorderSides', template.dayBlock?.borderSides || 'all');
            this.setVal('dayShadow', template.dayBlock?.shadow || 'none');
            
            this.setVal('marginTop', template.layout?.marginTop || 8);
            this.setVal('marginBottom', template.layout?.marginBottom || 8);
            this.setVal('marginLeft', template.layout?.marginLeft || 8);
            this.setVal('marginRight', template.layout?.marginRight || 8);
            this.setVal('dayBlockSpacing', template.layout?.dayBlockSpacing || 6);
            this.setVal('columnGap', template.layout?.columnGap || 10);
            
            this.setVal('dayNameSize', template.dayName?.fontSize || '11pt');
            this.setVal('dayNameColor', template.dayName?.color || '#2c3e50');
            this.setVal('dayNameWeight', template.dayName?.fontWeight || '600');
            
            this.setVal('mealTitleSize', template.mealTitle?.fontSize || '9pt');
            this.setVal('mealTitleColor', template.mealTitle?.color || '#333333');
            this.setVal('mealTitleWeight', template.mealTitle?.fontWeight || '600');
            
            this.setVal('mealNumberStyle', template.mealNumbering?.style || 'numbers');
            this.setVal('mealNumberPrefix', template.mealNumbering?.prefix || '');
            this.setVal('mealNumberSuffix', template.mealNumbering?.suffix || '.');
            
            this.setVal('ingredientsSize', template.ingredients?.fontSize || '7.5pt');
            this.setVal('ingredientsColor', template.ingredients?.color || '#555555');
            this.setVal('ingredientsStyle', template.ingredients?.fontStyle || 'italic');
            
            this.setChecked('headerSepEnabled', template.separators?.headerEnabled || false);
            this.setVal('headerSepStyle', template.separators?.headerStyle || 'solid');
            this.setVal('headerSepColor', template.separators?.headerColor || '#ddd');
            this.setVal('headerSepWidth', template.separators?.headerWidth || 1);
            this.setChecked('footerSepEnabled', template.separators?.footerEnabled !== false);
            this.setVal('footerSepStyle', template.separators?.footerStyle || 'solid');
            this.setVal('footerSepColor', template.separators?.footerColor || '#eee');
            this.setVal('footerSepWidth', template.separators?.footerWidth || 1);
            
            this.setVal('footerSize', template.footer?.fontSize || '8pt');
            this.setVal('footerColor', template.footer?.color || '#7f8c8d');
            this.setVal('footerText', template.footer?.text || '');
            
            const bgInput = document.getElementById('backgroundImage');
            if (template.backgroundImage) {
                try {
                    const imageUrl = await window.loadImageFile(template.backgroundImage);
                    if (bgInput && imageUrl) {
                        bgInput.value = imageUrl;
                        bgInput.dataset.filename = template.backgroundImage;
                    }
                } catch (err) {
                    console.error('Error loading background image:', err);
                    if (bgInput) {
                        bgInput.value = '';
                        bgInput.dataset.filename = '';
                    }
                }
            } else {
                if (bgInput) {
                    bgInput.value = '';
                    bgInput.dataset.filename = '';
                }
            }
            
            this.setVal('bgOpacity', template.background?.opacity || 1);
            this.setVal('bgPosition', template.background?.position || 'center');
            this.setVal('bgOverlay', template.background?.overlay || '#000000');
            this.setVal('bgOverlayOpacity', template.background?.overlayOpacity || 0);
            
            const logoInput = document.getElementById('logoImage');
            if (template.branding?.logo) {
                try {
                    const logoUrl = await window.loadImageFile(template.branding.logo);
                    if (logoInput && logoUrl) {
                        logoInput.value = logoUrl;
                        logoInput.dataset.filename = template.branding.logo;
                    }
                } catch (err) {
                    console.error('Error loading logo:', err);
                    if (logoInput) {
                        logoInput.value = '';
                        logoInput.dataset.filename = '';
                    }
                }
            } else {
                if (logoInput) {
                    logoInput.value = '';
                    logoInput.dataset.filename = '';
                }
            }
            this.setVal('logoPosition', template.branding?.logoPosition || 'top-right');
            this.setVal('logoWidth', template.branding?.logoWidth || 80);
            this.setVal('logoHeight', template.branding?.logoHeight || 80);
            
            this.setChecked('pageBorderEnabled', template.pageBorder?.enabled || false);
            this.setVal('pageBorderWidth', template.pageBorder?.width || 1);
            this.setVal('pageBorderColor', template.pageBorder?.color || '#000000');
            this.setVal('pageBorderStyle', template.pageBorder?.style || 'solid');
            this.setVal('pageBorderRadius', template.pageBorder?.radius || 0);
            
            for (let i = 1; i <= 4; i++) {
                const slot = template.slotSettings?.[`slot${i}`];
                this.setChecked(`slot${i}_showIngredients`, slot?.showIngredients !== false);
                this.setChecked(`slot${i}_showCalories`, slot?.showCalories !== false);
                this.setChecked(`slot${i}_showAllergens`, slot?.showAllergens !== false);
            }
            
            this.refreshPreview();
        },

        bindUI: function() {
            const inputs = ['headerText', 'headerColor', 'headerSize', 'headerWeight', 'headerFont', 'headerAlign', 'headerTransform',
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
                if (el) el.addEventListener('input', () => this.refreshPreview());
            });

            const checkboxes = ['showDateRange', 'headerSepEnabled', 'footerSepEnabled', 'pageBorderEnabled'];
            checkboxes.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', () => this.refreshPreview());
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

            const bgInput = document.getElementById('backgroundImage');
            const backgroundImage = bgInput?.dataset.filename || '';

            const logoInput = document.getElementById('logoImage');
            const logoFilename = logoInput?.dataset.filename || '';

            return {
                layout: {
                    marginTop: document.getElementById('marginTop')?.value || 8,
                    marginBottom: document.getElementById('marginBottom')?.value || 8,
                    marginLeft: document.getElementById('marginLeft')?.value || 8,
                    marginRight: document.getElementById('marginRight')?.value || 8,
                    dayBlockSpacing: document.getElementById('dayBlockSpacing')?.value || 6,
                    columnGap: document.getElementById('columnGap')?.value || 10
                },
                header: { 
                    text: document.getElementById('headerText')?.value || 'Weekly Menu',
                    color: document.getElementById('headerColor')?.value || '#fd7e14',
                    fontSize: document.getElementById('headerSize')?.value || '20pt',
                    fontWeight: document.getElementById('headerWeight')?.value || 'bold',
                    fontFamily: document.getElementById('headerFont')?.value || 'Segoe UI',
                    textAlign: document.getElementById('headerAlign')?.value || 'center',
                    textTransform: document.getElementById('headerTransform')?.value || 'none'
                },
                dateRange: {
                    show: document.getElementById('showDateRange')?.checked || true,
                    fontSize: document.getElementById('dateRangeSize')?.value || '9pt',
                    color: document.getElementById('dateRangeColor')?.value || '#7f8c8d',
                    fontWeight: document.getElementById('dateRangeWeight')?.value || 'normal',
                    textAlign: 'center'
                },
                dayBlock: {
                    bg: document.getElementById('dayBg')?.value || '#ffffff',
                    borderRadius: (document.getElementById('dayRadius')?.value || '8') + 'px',
                    borderWidth: document.getElementById('dayBorderWidth')?.value || '2',
                    borderColor: document.getElementById('dayBorderColor')?.value || '#e0e0e0',
                    borderStyle: document.getElementById('dayBorderStyle')?.value || 'solid',
                    borderSides: document.getElementById('dayBorderSides')?.value || 'all',
                    shadow: document.getElementById('dayShadow')?.value || 'none'
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
                mealNumbering: {
                    style: document.getElementById('mealNumberStyle')?.value || 'numbers',
                    prefix: document.getElementById('mealNumberPrefix')?.value || '',
                    suffix: document.getElementById('mealNumberSuffix')?.value || '.'
                },
                ingredients: {
                    fontSize: document.getElementById('ingredientsSize')?.value || '7.5pt',
                    color: document.getElementById('ingredientsColor')?.value || '#555555',
                    fontStyle: document.getElementById('ingredientsStyle')?.value || 'italic'
                },
                separators: {
                    headerEnabled: document.getElementById('headerSepEnabled')?.checked || false,
                    headerStyle: document.getElementById('headerSepStyle')?.value || 'solid',
                    headerColor: document.getElementById('headerSepColor')?.value || '#ddd',
                    headerWidth: document.getElementById('headerSepWidth')?.value || 1,
                    footerEnabled: document.getElementById('footerSepEnabled')?.checked || true,
                    footerStyle: document.getElementById('footerSepStyle')?.value || 'solid',
                    footerColor: document.getElementById('footerSepColor')?.value || '#eee',
                    footerWidth: document.getElementById('footerSepWidth')?.value || 1
                },
                footer: {
                    text: document.getElementById('footerText')?.value || '',
                    fontSize: document.getElementById('footerSize')?.value || '8pt',
                    color: document.getElementById('footerColor')?.value || '#7f8c8d'
                },
                background: {
                    opacity: document.getElementById('bgOpacity')?.value || 1,
                    position: document.getElementById('bgPosition')?.value || 'center',
                    overlay: document.getElementById('bgOverlay')?.value || '#000000',
                    overlayOpacity: document.getElementById('bgOverlayOpacity')?.value || 0
                },
                branding: {
                    logo: logoFilename,
                    logoPosition: document.getElementById('logoPosition')?.value || 'top-right',
                    logoWidth: document.getElementById('logoWidth')?.value || 80,
                    logoHeight: document.getElementById('logoHeight')?.value || 80
                },
                pageBorder: {
                    enabled: document.getElementById('pageBorderEnabled')?.checked || false,
                    width: document.getElementById('pageBorderWidth')?.value || 1,
                    color: document.getElementById('pageBorderColor')?.value || '#000000',
                    style: document.getElementById('pageBorderStyle')?.value || 'solid',
                    radius: document.getElementById('pageBorderRadius')?.value || 0
                },
                backgroundImage: backgroundImage,
                slotSettings: slotSettings
            };
        },

        refreshPreview: async function() {
            const settings = this.getSettingsFromUI();
            
            const getShadowStyle = (shadow) => {
                switch(shadow) {
                    case 'light': return '0 1px 3px rgba(0,0,0,0.12)';
                    case 'medium': return '0 2px 6px rgba(0,0,0,0.16)';
                    case 'strong': return '0 4px 12px rgba(0,0,0,0.24)';
                    default: return 'none';
                }
            };
            
            const getBorderStyle = (width, style, color, sides) => {
                if (sides === 'none') return 'none';
                if (sides === 'all') return `${width}px ${style} ${color}`;
                
                const borders = {
                    top: sides.includes('top') ? `${width}px ${style} ${color}` : 'none',
                    bottom: sides.includes('bottom') ? `${width}px ${style} ${color}` : 'none',
                    left: sides.includes('left') || sides.includes('left-right') ? `${width}px ${style} ${color}` : 'none',
                    right: sides.includes('right') || sides.includes('left-right') ? `${width}px ${style} ${color}` : 'none'
                };
                
                return `${borders.top} ${borders.right} ${borders.bottom} ${borders.left}`.trim();
            };
            
            const sheet = document.getElementById('livePreviewSheet');
            if (sheet && settings.backgroundImage) {
                let previewUrl = await window.loadImageFile(settings.backgroundImage);
                if (previewUrl) {
                    sheet.style.backgroundImage = `url(${previewUrl})`;
                    sheet.style.backgroundSize = 'cover';
                    sheet.style.backgroundPosition = settings.background.position;
                    sheet.style.backgroundRepeat = 'no-repeat';
                    sheet.style.opacity = settings.background.opacity;
                } else {
                    sheet.style.backgroundImage = 'none';
                }
            } else if (sheet) {
                sheet.style.backgroundImage = 'none';
            }
            
            const h = document.getElementById('previewHeader');
            const dateRange = settings.dateRange.show ? this.getDateRangeText(0, 4) : '';
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; font-family:${settings.header.fontFamily}; text-align:${settings.header.textAlign}; text-transform:${settings.header.textTransform}; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                    ${settings.dateRange.show ? `<p style="text-align:${settings.dateRange.textAlign}; color:${settings.dateRange.color}; margin:0 0 8px 0; font-size:${settings.dateRange.fontSize}; font-weight:${settings.dateRange.fontWeight}; line-height:1;">${dateRange}</p>` : ''}
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
                const footerSep = settings.separators.footerEnabled ? `border-top:${settings.separators.footerWidth}px ${settings.separators.footerStyle} ${settings.separators.footerColor};` : '';
                f.innerHTML = `<div style="${footerSep} padding-top:4px; margin-top:6px; color:${settings.footer.color}; font-size:${settings.footer.fontSize}; text-align:center; line-height:1;">${settings.footer.text}</div>`;
            }
        },

        createDetailedDayBlock: function(dayName, dayMenu, settings, dateStr) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            
            const getShadowStyle = (shadow) => {
                switch(shadow) {
                    case 'light': return '0 1px 3px rgba(0,0,0,0.12)';
                    case 'medium': return '0 2px 6px rgba(0,0,0,0.16)';
                    case 'strong': return '0 4px 12px rgba(0,0,0,0.24)';
                    default: return 'none';
                }
            };
            
            const getBorderStyles = () => {
                const width = settings.dayBlock.borderWidth;
                const style = settings.dayBlock.borderStyle;
                const color = settings.dayBlock.borderColor;
                const sides = settings.dayBlock.borderSides;
                
                if (sides === 'none') return 'border: none;';
                if (sides === 'all') return `border: ${width}px ${style} ${color};`;
                
                let css = '';
                if (sides === 'top') css += `border-top: ${width}px ${style} ${color};`;
                else if (sides === 'bottom') css += `border-bottom: ${width}px ${style} ${color};`;
                else if (sides === 'left-right') css += `border-left: ${width}px ${style} ${color}; border-right: ${width}px ${style} ${color};`;
                else if (sides === 'top-bottom') css += `border-top: ${width}px ${style} ${color}; border-bottom: ${width}px ${style} ${color};`;
                
                return css;
            };
            
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 10px 12px;
                margin-bottom: ${settings.layout.dayBlockSpacing}px;
                ${getBorderStyles()}
                box-shadow: ${getShadowStyle(settings.dayBlock.shadow)};
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
            
            const getMealNumber = (idx, style, prefix, suffix) => {
                let num = '';
                switch(style) {
                    case 'numbers': num = idx.toString(); break;
                    case 'bullets': return '•';
                    case 'letters': num = String.fromCharCode(64 + idx); break;
                    case 'roman': 
                        const romans = ['I', 'II', 'III', 'IV'];
                        num = romans[idx - 1] || idx.toString();
                        break;
                    case 'none': return '';
                    default: num = idx.toString();
                }
                return `${prefix}${num}${suffix}`;
            };
            
            const numberStr = getMealNumber(index, settings.mealNumbering.style, settings.mealNumbering.prefix, settings.mealNumbering.suffix);
            
            let html = `<div style="margin-bottom:5px;">`;
            
            let titleLine = `<div style="font-size:${settings.mealTitle.fontSize}; font-weight:${settings.mealTitle.fontWeight}; color:${settings.mealTitle.color}; margin-bottom:2px; line-height:1.2;">${numberStr} ${recipe.name}`;
            
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

        getDateRangeFilename: function(weekStart) {
            const startDay = new Date(weekStart);
            const endDay = new Date(weekStart);
            endDay.setDate(weekStart.getDate() + 4);
            
            const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
            const startMonth = startDay.toLocaleDateString(lang, { month: 'short' }).replace('.', '');
            const endMonth = endDay.toLocaleDateString(lang, { month: 'short' }).replace('.', '');
            const startDate = startDay.getDate();
            const endDate = endDay.getDate();
            const year = endDay.getFullYear();
            
            return `${startMonth}${startDate}-${endMonth}${endDate}_${year}.pdf`;
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
            const container = document.getElementById('savedTemplatesLibrary');
            if (!container) return;

            container.innerHTML = '';

            if (!window.savedTemplates || window.savedTemplates.length === 0) {
                container.innerHTML = `<p style="color: #6c757d; font-size: 0.85rem; text-align: center; padding: 10px;">${window.t('text_no_templates')}</p>`;
                return;
            }

            window.savedTemplates.forEach(tmpl => {
                const card = document.createElement('div');
                card.style.cssText = 'border: 2px solid #dee2e6; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: white; transition: all 0.2s;';
                
                if (activeTemplateId === tmpl.id) {
                    card.style.borderColor = 'var(--color-primary)';
                    card.style.background = '#fff8f0';
                }

                const header = document.createElement('div');
                header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

                const title = document.createElement('div');
                title.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #333;';
                title.textContent = tmpl.name || window.t('template_unnamed');

                const actions = document.createElement('div');
                actions.style.cssText = 'display: flex; gap: 4px;';

                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn btn-small btn-primary';
                loadBtn.textContent = window.t('btn_load');
                loadBtn.style.fontSize = '0.75rem';
                loadBtn.style.height = '26px';
                loadBtn.style.padding = '0 8px';
                loadBtn.onclick = () => this.loadTemplate(tmpl.id);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.width = '26px';
                deleteBtn.style.height = '26px';
                deleteBtn.onclick = () => this.deleteTemplate(tmpl.id);

                actions.appendChild(loadBtn);
                actions.appendChild(deleteBtn);
                header.appendChild(title);
                header.appendChild(actions);
                card.appendChild(header);
                container.appendChild(card);
            });
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
                this.applyDefaultSettings();
                this.refreshPreview();
            }

            this.renderTemplateLibrary();
            alert(window.t('alert_template_deleted'));
        }
    };

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
        const weeks = TemplateManager.getWeeksWithMeals();
        if (weeks.length === 0) {
            alert(window.t('alert_no_weeks'));
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'templatePickerModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 10px; padding: 20px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

        content.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">📄 ${window.t('title_select_week')}</h3>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 15px;">${window.t('text_select_week_prompt')}</p>
            <div id="weekSelectList" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;"></div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelPrintBtn" class="btn btn-secondary">${window.t('btn_cancel')}</button>
                <button id="confirmPrintBtn" class="btn btn-primary" disabled>${window.t('btn_print')}</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const weekList = document.getElementById('weekSelectList');
        weeks.forEach((week, index) => {
            const weekCard = document.createElement('div');
            weekCard.style.cssText = 'border: 2px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;';
            weekCard.innerHTML = `
                <div style="font-weight: 600; font-size: 0.9rem; color: #333;">${week.label}</div>
                <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${week.dateCount} ${window.t('text_days_with_meals')}</div>
            `;

            weekCard.onclick = () => {
                document.querySelectorAll('#weekSelectList > div').forEach(card => {
                    card.style.borderColor = '#dee2e6';
                    card.style.background = 'white';
                });
                weekCard.style.borderColor = 'var(--color-primary)';
                weekCard.style.background = '#fff8f0';
                selectedWeekStart = week.weekStart;
                document.getElementById('confirmPrintBtn').disabled = false;
            };

            weekList.appendChild(weekCard);

            if (index === 0) {
                weekCard.click();
            }
        });

        document.getElementById('cancelPrintBtn').onclick = () => {
            modal.remove();
        };

        document.getElementById('confirmPrintBtn').onclick = () => {
            modal.remove();
            if (selectedWeekStart) {
                window.printWithTemplate(activeTemplateId || 'default');
            }
        };

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    };

    window.printWithTemplate = async function(templateId) {
        if (!selectedWeekStart) {
            alert(window.t('alert_no_week_selected'));
            return;
        }

        let settings;
        if (templateId === 'default') {
            settings = TemplateManager.getSettingsFromUI();
        } else {
            const template = window.savedTemplates.find(t => t.id === templateId);
            settings = template || TemplateManager.getSettingsFromUI();
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert(window.t('alert_popup_blocked'));
            return;
        }

        let bgImageUrl = '';
        if (settings.backgroundImage) {
            bgImageUrl = await window.loadImageFile(settings.backgroundImage);
        }

        let logoUrl = '';
        if (settings.branding?.logo) {
            logoUrl = await window.loadImageFile(settings.branding.logo);
        }

        let html = `
        <!DOCTYPE html>
        <html lang="${window.getCurrentLanguage()}">
        <head>
            <meta charset="UTF-8">
            <title>${settings.header.text} - ${TemplateManager.getDateRangeText(0, 4, selectedWeekStart)}</title>
            <style>
                @page {
                    size: A4;
                    margin: ${settings.layout.marginTop}mm ${settings.layout.marginRight}mm ${settings.layout.marginBottom}mm ${settings.layout.marginLeft}mm;
                }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    ${settings.pageBorder.enabled ? `
                        border: ${settings.pageBorder.width}px ${settings.pageBorder.style} ${settings.pageBorder.color};
                        border-radius: ${settings.pageBorder.radius}px;
                        padding: 10mm;
                    ` : ''}
                }
                ${bgImageUrl ? `
                body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: url('${bgImageUrl}');
                    background-size: cover;
                    background-position: ${settings.background.position};
                    background-repeat: no-repeat;
                    opacity: ${settings.background.opacity};
                    z-index: -1;
                }
                ` : ''}
                .print-header {
                    text-align: ${settings.header.textAlign};
                    margin-bottom: 12px;
                    ${settings.separators.headerEnabled ? `border-bottom: ${settings.separators.headerWidth}px ${settings.separators.headerStyle} ${settings.separators.headerColor}; padding-bottom: 6px;` : ''}
                }
                .print-header h1 {
                    color: ${settings.header.color};
                    font-size: ${settings.header.fontSize};
                    font-weight: ${settings.header.fontWeight};
                    font-family: ${settings.header.fontFamily};
                    text-transform: ${settings.header.textTransform};
                    margin: 0 0 4px 0;
                }
                .date-range {
                    font-size: ${settings.dateRange.fontSize};
                    color: ${settings.dateRange.color};
                    font-weight: ${settings.dateRange.fontWeight};
                    text-align: ${settings.dateRange.textAlign};
                    margin: 0;
                }
                .print-day-block {
                    background: ${settings.dayBlock.bg};
                    border-radius: ${settings.dayBlock.borderRadius};
                    padding: 10px 12px;
                    margin-bottom: ${settings.layout.dayBlockSpacing}px;
                    ${(() => {
                        const w = settings.dayBlock.borderWidth;
                        const s = settings.dayBlock.borderStyle;
                        const c = settings.dayBlock.borderColor;
                        const sides = settings.dayBlock.borderSides;
                        if (sides === 'none') return '';
                        if (sides === 'all') return `border: ${w}px ${s} ${c};`;
                        let css = '';
                        if (sides === 'top') css = `border-top: ${w}px ${s} ${c};`;
                        else if (sides === 'bottom') css = `border-bottom: ${w}px ${s} ${c};`;
                        else if (sides === 'left-right') css = `border-left: ${w}px ${s} ${c}; border-right: ${w}px ${s} ${c};`;
                        else if (sides === 'top-bottom') css = `border-top: ${w}px ${s} ${c}; border-bottom: ${w}px ${s} ${c};`;
                        return css;
                    })()}
                    ${(() => {
                        switch(settings.dayBlock.shadow) {
                            case 'light': return 'box-shadow: 0 1px 3px rgba(0,0,0,0.12);';
                            case 'medium': return 'box-shadow: 0 2px 6px rgba(0,0,0,0.16);';
                            case 'strong': return 'box-shadow: 0 4px 12px rgba(0,0,0,0.24);';
                            default: return '';
                        }
                    })()}
                    page-break-inside: avoid;
                }
                .day-name {
                    font-size: ${settings.dayName.fontSize};
                    color: ${settings.dayName.color};
                    font-weight: ${settings.dayName.fontWeight};
                    border-bottom: 1px solid #d0d0d0;
                    margin-bottom: 6px;
                    padding-bottom: 3px;
                }
                .meal-item {
                    margin-bottom: 5px;
                }
                .meal-title {
                    font-size: ${settings.mealTitle.fontSize};
                    color: ${settings.mealTitle.color};
                    font-weight: ${settings.mealTitle.fontWeight};
                    margin-bottom: 2px;
                }
                .ingredients {
                    font-size: ${settings.ingredients.fontSize};
                    color: ${settings.ingredients.color};
                    font-style: ${settings.ingredients.fontStyle};
                    margin-left: 10px;
                }
                .allergen-highlight {
                    color: #dc3545;
                    text-decoration: underline;
                    font-weight: 500;
                }
                .print-footer {
                    text-align: center;
                    font-size: ${settings.footer.fontSize};
                    color: ${settings.footer.color};
                    margin-top: 12px;
                    ${settings.separators.footerEnabled ? `border-top: ${settings.separators.footerWidth}px ${settings.separators.footerStyle} ${settings.separators.footerColor}; padding-top: 6px;` : ''}
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>${settings.header.text}</h1>
                ${settings.dateRange.show ? `<p class="date-range">${TemplateManager.getDateRangeText(0, 4, selectedWeekStart)}</p>` : ''}
            </div>
        `;

        for (let i = 0; i < 5; i++) {
            const day = new Date(selectedWeekStart);
            day.setDate(selectedWeekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });

            html += `<div class="print-day-block">`;
            html += `<div class="day-name">${dayName}</div>`;

            if (dayMenu && TemplateManager.hasMeals(dayMenu)) {
                const slots = [
                    { id: 'slot1', type: 'soup' },
                    { id: 'slot2', type: 'main' },
                    { id: 'slot3', type: 'dessert' },
                    { id: 'slot4', type: 'other' }
                ];

                let mealIndex = 1;
                slots.forEach(slotConfig => {
                    const slot = dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            const lang = window.getCurrentLanguage();
                            const isBulgarian = lang === 'bg';

                            let numberStr = '';
                            const style = settings.mealNumbering.style;
                            const prefix = settings.mealNumbering.prefix;
                            const suffix = settings.mealNumbering.suffix;
                            
                            switch(style) {
                                case 'numbers': numberStr = `${prefix}${mealIndex}${suffix}`; break;
                                case 'bullets': numberStr = '•'; break;
                                case 'letters': numberStr = `${prefix}${String.fromCharCode(64 + mealIndex)}${suffix}`; break;
                                case 'roman': 
                                    const romans = ['I', 'II', 'III', 'IV'];
                                    numberStr = `${prefix}${romans[mealIndex - 1]}${suffix}`;
                                    break;
                                case 'none': numberStr = ''; break;
                            }

                            html += `<div class="meal-item">`;
                            html += `<div class="meal-title">${numberStr} ${recipe.name}`;
                            
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
                            if (metadata.length) {
                                html += ` <span style="font-weight:normal; color:#666; font-size:8pt;">(${metadata.join(', ')})</span>`;
                            }
                            html += `</div>`;

                            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                                const recipeAllergens = window.getRecipeAllergens(recipe);
                                const allergenIds = new Set(recipeAllergens.map(a => a.id));
                                
                                const ingredientsList = recipe.ingredients.map(ing => {
                                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                                    if (!fullIng) return '';
                                    
                                    const hasAllergen = fullIng.allergens && fullIng.allergens.some(aid => allergenIds.has(aid));
                                    
                                    if (slotSettings.showAllergens && hasAllergen) {
                                        return `<span class="allergen-highlight">${fullIng.name}</span>`;
                                    }
                                    return fullIng.name;
                                }).filter(n => n).join(', ');
                                
                                if (ingredientsList) {
                                    html += `<div class="ingredients"><em>${window.t('text_ingredients_prefix')}</em> ${ingredientsList}</div>`;
                                }
                            }

                            html += `</div>`;
                            mealIndex++;
                        }
                    }
                });
            } else {
                html += `<p style="color:#aaa; font-style:italic; text-align:center; padding:8px 0; margin:0;">${window.t('empty_day')}</p>`;
            }

            html += `</div>`;
        }

        html += `
            <div class="print-footer">${settings.footer.text}</div>
        </body>
        </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();

        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
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
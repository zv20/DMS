/**
 * Advanced Template Manager
 * 20+ customization features with full rendering support
 * Refactored to use centralized constants
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;
    
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
                card.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: ${CONST.UI.CARD_PADDING}px; margin-bottom: ${CONST.UI.CARD_MARGIN}px; background: white; cursor: pointer; transition: all 0.2s;`;
                
                card.onmouseenter = () => card.style.borderColor = 'var(--color-primary)';
                card.onmouseleave = () => card.style.borderColor = CONST.COLORS.CARD_BORDER_COLOR;

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
                        <div class="tb-margin-grid">
                            <label class="tb-margin-label">Page Margins (mm)</label>
                            <div class="tb-grid-2">
                                <div>
                                    <label class="tb-label-sm">Top</label>
                                    <input type="number" id="marginTop" value="${CONST.LAYOUT.DEFAULT_MARGIN_TOP}" min="${CONST.LAYOUT.MIN_MARGIN}" max="${CONST.LAYOUT.MAX_MARGIN}" class="form-control tb-input-sm">
                                </div>
                                <div>
                                    <label class="tb-label-sm">Bottom</label>
                                    <input type="number" id="marginBottom" value="${CONST.LAYOUT.DEFAULT_MARGIN_BOTTOM}" min="${CONST.LAYOUT.MIN_MARGIN}" max="${CONST.LAYOUT.MAX_MARGIN}" class="form-control tb-input-sm">
                                </div>
                                <div>
                                    <label class="tb-label-sm">Left</label>
                                    <input type="number" id="marginLeft" value="${CONST.LAYOUT.DEFAULT_MARGIN_LEFT}" min="${CONST.LAYOUT.MIN_MARGIN}" max="${CONST.LAYOUT.MAX_MARGIN}" class="form-control tb-input-sm">
                                </div>
                                <div>
                                    <label class="tb-label-sm">Right</label>
                                    <input type="number" id="marginRight" value="${CONST.LAYOUT.DEFAULT_MARGIN_RIGHT}" min="${CONST.LAYOUT.MIN_MARGIN}" max="${CONST.LAYOUT.MAX_MARGIN}" class="form-control tb-input-sm">
                                </div>
                            </div>
                        </div>
                        
                        <div class="tb-grid-2 tb-mb-8">
                            <div>
                                <label class="tb-label">Day Block Spacing (px)</label>
                                <input type="number" id="dayBlockSpacing" value="${CONST.LAYOUT.DEFAULT_DAY_BLOCK_SPACING}" min="${CONST.LAYOUT.MIN_MARGIN}" max="${CONST.LAYOUT.MAX_SPACING}" class="form-control tb-input-sm">
                            </div>
                            <div>
                                <label class="tb-label">Column Gap (px)</label>
                                <input type="number" id="columnGap" value="${CONST.LAYOUT.DEFAULT_COLUMN_GAP}" min="${CONST.LAYOUT.MIN_MARGIN}" max="${CONST.LAYOUT.MAX_COLUMN_GAP}" class="form-control tb-input-sm">
                            </div>
                        </div>
                    `
                },
                
                // BACKGROUND SECTION
                {
                    id: 'background',
                    titleKey: 'Background',
                    html: `
                        <label class="tb-label tb-mb-6">Background Image</label>
                        <input type="text" id="backgroundImage" class="form-control tb-input" placeholder="https://..." data-filename="">
                        
                        <div class="tb-grid-3 tb-mt-8">
                            <div>
                                <label class="tb-label-sm">Opacity</label>
                                <input type="range" id="bgOpacity" min="${CONST.BACKGROUND.MIN_OPACITY}" max="${CONST.BACKGROUND.MAX_OPACITY}" step="${CONST.BACKGROUND.OPACITY_STEP}" value="${CONST.BACKGROUND.DEFAULT_OPACITY}" class="tb-range">
                                <small id="bgOpacityValue" class="tb-range-value">100%</small>
                            </div>
                            <div>
                                <label class="tb-label-sm">Position</label>
                                <select id="bgPosition" class="form-control tb-input-sm">
                                    <option value="center">Center</option>
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label class="tb-label-sm">Overlay</label>
                                <input type="color" id="bgOverlay" value="${CONST.COLORS.DEFAULT_OVERLAY}" class="tb-color">
                            </div>
                        </div>
                        <div class="tb-mt-4">
                            <label class="tb-label-sm">Overlay Opacity</label>
                            <input type="range" id="bgOverlayOpacity" min="${CONST.BACKGROUND.MIN_OPACITY}" max="${CONST.BACKGROUND.MAX_OPACITY}" step="${CONST.BACKGROUND.OPACITY_STEP}" value="${CONST.BACKGROUND.DEFAULT_OVERLAY_OPACITY}" class="tb-range">
                            <small id="bgOverlayOpacityValue" class="tb-range-value">0%</small>
                        </div>
                    `
                },
                
                // BRANDING SECTION
                {
                    id: 'branding',
                    titleKey: 'Branding & Logo',
                    html: `
                        <label class="tb-label tb-mb-6">Logo Image</label>
                        <input type="text" id="logoImage" class="form-control tb-input" placeholder="Upload logo..." data-filename="" readonly>
                        
                        <div class="tb-grid-3 tb-mt-8">
                            <div>
                                <label class="tb-label-sm">Position</label>
                                <select id="logoPosition" class="form-control tb-input-sm">
                                    <option value="top-left">Top Left</option>
                                    <option value="top-center">Top Center</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="header">In Header</option>
                                </select>
                            </div>
                            <div>
                                <label class="tb-label-sm">Width (px)</label>
                                <input type="number" id="logoWidth" value="${CONST.BRANDING.DEFAULT_LOGO_WIDTH}" min="${CONST.BRANDING.MIN_LOGO_SIZE}" max="${CONST.BRANDING.MAX_LOGO_SIZE}" class="form-control tb-input-sm">
                            </div>
                            <div>
                                <label class="tb-label-sm">Height (px)</label>
                                <input type="number" id="logoHeight" value="${CONST.BRANDING.DEFAULT_LOGO_HEIGHT}" min="${CONST.BRANDING.MIN_LOGO_SIZE}" max="${CONST.BRANDING.MAX_LOGO_SIZE}" class="form-control tb-input-sm">
                            </div>
                        </div>
                    `
                },
                
                // HEADER SECTION
                {
                    id: 'header',
                    titleKey: 'Header',
                    html: `
                        <label class="tb-label">${window.t('label_title')}</label>
                        <input type="text" id="headerText" class="form-control tb-input tb-mb-8" value="${CONST.TEXT.DEFAULT_HEADER}">
                        
                        <div class="tb-grid-3 tb-mb-8">
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="headerColor" value="${CONST.COLORS.HEADER_COLOR}" class="tb-color">
                            </div>
                            <div>
                                <label class="tb-label-sm">Size</label>
                                <input type="text" id="headerSize" class="form-control tb-input-sm" value="${CONST.TYPOGRAPHY.HEADER_FONT_SIZE}">
                            </div>
                            <div>
                                <label class="tb-label-sm">Weight</label>
                                <select id="headerWeight" class="form-control tb-input-sm">
                                    <option value="normal">Normal</option>
                                    <option value="600">Semibold</option>
                                    <option value="${CONST.TYPOGRAPHY.HEADER_FONT_WEIGHT}" selected>Bold</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="tb-grid-3">
                            <div>
                                <label class="tb-label-sm">Font</label>
                                <select id="headerFont" class="form-control tb-input-sm">
                                    <option value="${CONST.TYPOGRAPHY.HEADER_FONT_FAMILY}" selected>Segoe UI</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Times New Roman">Times</option>
                                    <option value="Courier New">Courier</option>
                                </select>
                            </div>
                            <div>
                                <label class="tb-label-sm">Align</label>
                                <select id="headerAlign" class="form-control tb-input-sm">
                                    <option value="left">Left</option>
                                    <option value="${CONST.TYPOGRAPHY.HEADER_ALIGN}" selected>Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label class="tb-label-sm">Transform</label>
                                <select id="headerTransform" class="form-control tb-input-sm">
                                    <option value="${CONST.TYPOGRAPHY.HEADER_TRANSFORM}" selected>None</option>
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
                        <label class="tb-label-xs">
                            <input type="checkbox" id="showDateRange" checked> Show Date Range
                        </label>
                        
                        <div class="tb-grid-3">
                            <div>
                                <label class="tb-label-sm">Size</label>
                                <input type="text" id="dateRangeSize" class="form-control tb-input-sm" value="${CONST.TYPOGRAPHY.DATE_RANGE_FONT_SIZE}">
                            </div>
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="dateRangeColor" value="${CONST.COLORS.DATE_RANGE_COLOR}" class="tb-color">
                            </div>
                            <div>
                                <label class="tb-label-sm">Weight</label>
                                <select id="dateRangeWeight" class="form-control tb-input-sm">
                                    <option value="${CONST.TYPOGRAPHY.DATE_RANGE_FONT_WEIGHT}" selected>Normal</option>
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
                        <label class="tb-label">Background Color</label>
                        <input type="color" id="dayBg" value="${CONST.COLORS.WHITE}" class="tb-color-lg tb-mb-8">
                        
                        <div class="tb-grid-3 tb-mb-8">
                            <div>
                                <label class="tb-label-sm">Border Radius</label>
                                <input type="number" id="dayRadius" value="${CONST.BORDERS.DAY_BORDER_RADIUS}" class="form-control tb-input-sm">
                            </div>
                            <div>
                                <label class="tb-label-sm">Border Width</label>
                                <input type="number" id="dayBorderWidth" value="${CONST.BORDERS.DEFAULT_WIDTH}" min="${CONST.BORDERS.MIN_WIDTH}" max="${CONST.BORDERS.MAX_WIDTH}" class="form-control tb-input-sm">
                            </div>
                            <div>
                                <label class="tb-label-sm">Border Style</label>
                                <select id="dayBorderStyle" class="form-control tb-input-sm">
                                    <option value="${CONST.BORDERS.DEFAULT_STYLE}">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                    <option value="double">Double</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="tb-mb-8">
                            <label class="tb-label-sm">Border Sides</label>
                            <select id="dayBorderSides" class="form-control tb-input-sm">
                                <option value="${CONST.BORDER_SIDES.ALL}" selected>All</option>
                                <option value="${CONST.BORDER_SIDES.TOP}">Top Only</option>
                                <option value="${CONST.BORDER_SIDES.BOTTOM}">Bottom Only</option>
                                <option value="${CONST.BORDER_SIDES.LEFT_RIGHT}">Left & Right</option>
                                <option value="${CONST.BORDER_SIDES.TOP_BOTTOM}">Top & Bottom</option>
                                <option value="${CONST.BORDER_SIDES.NONE}">None</option>
                            </select>
                        </div>
                        
                        <div class="tb-grid-2">
                            <div>
                                <label class="tb-label-sm">Border Color</label>
                                <input type="color" id="dayBorderColor" value="${CONST.COLORS.DAY_BORDER_COLOR}" class="tb-color">
                            </div>
                            <div>
                                <label class="tb-label-sm">Shadow</label>
                                <select id="dayShadow" class="form-control tb-input-sm">
                                    <option value="${CONST.SHADOW_OPTIONS.NONE}" selected>None</option>
                                    <option value="${CONST.SHADOW_OPTIONS.LIGHT}">Light</option>
                                    <option value="${CONST.SHADOW_OPTIONS.MEDIUM}">Medium</option>
                                    <option value="${CONST.SHADOW_OPTIONS.STRONG}">Strong</option>
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
                        <div class="tb-grid-2 tb-mb-6">
                            <div>
                                <label class="tb-label-sm">Size</label>
                                <input type="text" id="dayNameSize" class="form-control tb-input-sm" value="${CONST.TYPOGRAPHY.DAY_NAME_FONT_SIZE}">
                            </div>
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="dayNameColor" value="${CONST.COLORS.DAY_NAME_COLOR}" class="tb-color">
                            </div>
                        </div>
                        <label class="tb-label-sm">Weight</label>
                        <select id="dayNameWeight" class="form-control tb-input-sm">
                            <option value="normal">Normal</option>
                            <option value="500">Medium</option>
                            <option value="${CONST.TYPOGRAPHY.DAY_NAME_FONT_WEIGHT}" selected>Semibold</option>
                            <option value="bold">Bold</option>
                        </select>
                    `
                },
                {
                    id: 'mealTitle',
                    titleKey: 'Meal Title',
                    html: `
                        <div class="tb-grid-2 tb-mb-6">
                            <div>
                                <label class="tb-label-sm">Size</label>
                                <input type="text" id="mealTitleSize" class="form-control tb-input-sm" value="${CONST.TYPOGRAPHY.MEAL_TITLE_FONT_SIZE}">
                            </div>
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="mealTitleColor" value="${CONST.COLORS.MEAL_TITLE_COLOR}" class="tb-color">
                            </div>
                        </div>
                        <label class="tb-label-sm">Weight</label>
                        <select id="mealTitleWeight" class="form-control tb-input-sm">
                            <option value="normal">Normal</option>
                            <option value="500">Medium</option>
                            <option value="${CONST.TYPOGRAPHY.MEAL_TITLE_FONT_WEIGHT}" selected>Semibold</option>
                            <option value="bold">Bold</option>
                        </select>
                    `
                },
                
                // MEAL NUMBERING SECTION
                {
                    id: 'mealNumbering',
                    titleKey: 'Meal Numbering',
                    html: `
                        <label class="tb-label tb-mb-6">Numbering Style</label>
                        <select id="mealNumberStyle" class="form-control tb-input tb-mb-8">
                            <option value="${CONST.NUMBERING.NUMBERS}" selected>Numbers (1. 2. 3. 4.)</option>
                            <option value="${CONST.NUMBERING.BULLETS}">Bullets (•)</option>
                            <option value="${CONST.NUMBERING.LETTERS}">Letters (A. B. C. D.)</option>
                            <option value="${CONST.NUMBERING.ROMAN}">Roman (I. II. III. IV.)</option>
                            <option value="${CONST.NUMBERING.NONE}">None</option>
                        </select>
                        
                        <div class="tb-grid-2">
                            <div>
                                <label class="tb-label-sm">Prefix</label>
                                <input type="text" id="mealNumberPrefix" class="form-control tb-input-sm" placeholder="e.g., #">
                            </div>
                            <div>
                                <label class="tb-label-sm">Suffix</label>
                                <input type="text" id="mealNumberSuffix" class="form-control tb-input-sm" value="${CONST.TEXT.DEFAULT_MEAL_NUMBER_SUFFIX}" placeholder="e.g., )">
                            </div>
                        </div>
                    `
                },
                
                // SEPARATORS SECTION
                {
                    id: 'separators',
                    titleKey: 'Separators',
                    html: `
                        <div class="tb-section-box">
                            <label class="tb-label-xs">
                                <input type="checkbox" id="headerSepEnabled"> Header Separator
                            </label>
                            <div class="tb-grid-3-sm">
                                <select id="headerSepStyle" class="form-control tb-input-xs">
                                    <option value="${CONST.BORDERS.DEFAULT_STYLE}">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                </select>
                                <input type="color" id="headerSepColor" value="${CONST.COLORS.HEADER_SEPARATOR_COLOR}" class="tb-color-xs">
                                <input type="number" id="headerSepWidth" value="${CONST.BORDERS.SEPARATOR_WIDTH}" min="${CONST.BORDERS.MIN_SEPARATOR_WIDTH}" max="${CONST.BORDERS.MAX_SEPARATOR_WIDTH}" class="form-control tb-input-xs">
                            </div>
                        </div>
                        
                        <div class="tb-section-box">
                            <label class="tb-label-xs">
                                <input type="checkbox" id="footerSepEnabled" checked> Footer Separator
                            </label>
                            <div class="tb-grid-3-sm">
                                <select id="footerSepStyle" class="form-control tb-input-xs">
                                    <option value="${CONST.BORDERS.DEFAULT_STYLE}">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                </select>
                                <input type="color" id="footerSepColor" value="${CONST.COLORS.FOOTER_SEPARATOR_COLOR}" class="tb-color-xs">
                                <input type="number" id="footerSepWidth" value="${CONST.BORDERS.SEPARATOR_WIDTH}" min="${CONST.BORDERS.MIN_SEPARATOR_WIDTH}" max="${CONST.BORDERS.MAX_SEPARATOR_WIDTH}" class="form-control tb-input-xs">
                            </div>
                        </div>
                    `
                },
                
                {
                    id: 'ingredients',
                    titleKey: 'Ingredients',
                    html: `
                        <div class="tb-grid-2 tb-mb-6">
                            <div>
                                <label class="tb-label-sm">Size</label>
                                <input type="text" id="ingredientsSize" class="form-control tb-input-sm" value="${CONST.TYPOGRAPHY.INGREDIENTS_FONT_SIZE}">
                            </div>
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="ingredientsColor" value="${CONST.COLORS.INGREDIENTS_COLOR}" class="tb-color">
                            </div>
                        </div>
                        <label class="tb-label-sm">Style</label>
                        <select id="ingredientsStyle" class="form-control tb-input-sm">
                            <option value="normal">Normal</option>
                            <option value="${CONST.TYPOGRAPHY.INGREDIENTS_FONT_STYLE}" selected>Italic</option>
                        </select>
                    `
                },
                {
                    id: 'mealVisibility',
                    titleKey: 'Meal Visibility',
                    html: `
                        <div class="tb-section-box">
                            <h4 class="tb-slot-header">${window.t('slot_1_label')}</h4>
                            <label class="tb-slot-label"><input type="checkbox" id="slot1_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label class="tb-slot-label"><input type="checkbox" id="slot1_showCalories" checked> ${window.t('show_calories')}</label>
                            <label class="tb-slot-label-last"><input type="checkbox" id="slot1_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                        <div class="tb-section-box">
                            <h4 class="tb-slot-header">${window.t('slot_2_label')}</h4>
                            <label class="tb-slot-label"><input type="checkbox" id="slot2_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label class="tb-slot-label"><input type="checkbox" id="slot2_showCalories" checked> ${window.t('show_calories')}</label>
                            <label class="tb-slot-label-last"><input type="checkbox" id="slot2_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                        <div class="tb-section-box">
                            <h4 class="tb-slot-header">${window.t('slot_3_label')}</h4>
                            <label class="tb-slot-label"><input type="checkbox" id="slot3_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label class="tb-slot-label"><input type="checkbox" id="slot3_showCalories" checked> ${window.t('show_calories')}</label>
                            <label class="tb-slot-label-last"><input type="checkbox" id="slot3_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                        <div class="tb-section-box">
                            <h4 class="tb-slot-header">${window.t('slot_4_label')}</h4>
                            <label class="tb-slot-label"><input type="checkbox" id="slot4_showIngredients" checked> ${window.t('show_ingredients')}</label>
                            <label class="tb-slot-label"><input type="checkbox" id="slot4_showCalories" checked> ${window.t('show_calories')}</label>
                            <label class="tb-slot-label-last"><input type="checkbox" id="slot4_showAllergens" checked> ${window.t('show_allergens')}</label>
                        </div>
                    `
                },
                
                // PAGE BORDER SECTION
                {
                    id: 'pageBorder',
                    titleKey: 'Page Border',
                    html: `
                        <label class="tb-label-xs">
                            <input type="checkbox" id="pageBorderEnabled"> Enable Page Border
                        </label>
                        
                        <div class="tb-grid-2 tb-mb-6">
                            <div>
                                <label class="tb-label-sm">Width</label>
                                <input type="number" id="pageBorderWidth" value="${CONST.BORDERS.PAGE_BORDER_WIDTH}" min="${CONST.BORDERS.MIN_SEPARATOR_WIDTH}" max="${CONST.BORDERS.MAX_WIDTH}" class="form-control tb-input-sm">
                            </div>
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="pageBorderColor" value="${CONST.COLORS.BLACK}" class="tb-color">
                            </div>
                        </div>
                        
                        <div class="tb-grid-2">
                            <div>
                                <label class="tb-label-sm">Style</label>
                                <select id="pageBorderStyle" class="form-control tb-input-sm">
                                    <option value="${CONST.BORDERS.DEFAULT_STYLE}">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                    <option value="double">Double</option>
                                </select>
                            </div>
                            <div>
                                <label class="tb-label-sm">Corner Radius</label>
                                <input type="number" id="pageBorderRadius" value="${CONST.BORDERS.PAGE_BORDER_RADIUS}" min="0" max="20" class="form-control tb-input-sm">
                            </div>
                        </div>
                    `
                },
                
                {
                    id: 'footer',
                    titleKey: 'Footer',
                    html: `
                        <label class="tb-label">Text</label>
                        <textarea id="footerText" class="form-control tb-textarea" rows="2" placeholder="Additional notes...">${CONST.TEXT.DEFAULT_FOOTER}</textarea>
                        
                        <div class="tb-grid-2">
                            <div>
                                <label class="tb-label-sm">Size</label>
                                <input type="text" id="footerSize" class="form-control tb-input-sm" value="${CONST.TYPOGRAPHY.FOOTER_FONT_SIZE}">
                            </div>
                            <div>
                                <label class="tb-label-sm">Color</label>
                                <input type="color" id="footerColor" value="${CONST.COLORS.FOOTER_COLOR}" class="tb-color">
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
            wrapper.style.cssText = `margin-bottom: ${CONST.UI.SECTION_MARGIN}px;`;
            
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--color-background); border-radius: 5px; cursor: pointer; transition: background 0.2s;';
            header.onmouseenter = () => header.style.background = CONST.COLORS.HOVER_BACKGROUND;
            header.onmouseleave = () => header.style.background = 'var(--color-background)';
            
            const title = document.createElement('h4');
            title.textContent = section.titleKey;
            title.style.cssText = `margin: 0; color: #495057; font-size: ${CONST.TYPOGRAPHY.SECTION_TITLE_SIZE}; font-weight: 600;`;
            
            const toggleIcon = document.createElement('span');
            const isExpanded = sectionStates[section.id] !== undefined ? sectionStates[section.id] : false;
            toggleIcon.textContent = isExpanded ? '▼' : '▶';
            toggleIcon.style.cssText = `font-size: 9pt; color: ${CONST.COLORS.TEXT_MUTED};`;
            
            header.appendChild(title);
            header.appendChild(toggleIcon);
            wrapper.appendChild(header);
            
            const content = document.createElement('div');
            content.innerHTML = section.html;
            content.style.cssText = `
                max-height: ${isExpanded ? CONST.TIMING.COLLAPSIBLE_MAX_HEIGHT + 'px' : '0'};
                overflow: hidden;
                transition: max-height ${CONST.TIMING.ANIMATION_DURATION}ms ease;
                padding: ${isExpanded ? CONST.UI.COLLAPSIBLE_PADDING : '0'}px ${CONST.UI.COLLAPSIBLE_PADDING}px;
            `;
            
            wrapper.appendChild(content);
            
            header.onclick = () => {
                sectionStates[section.id] = !sectionStates[section.id];
                toggleIcon.textContent = sectionStates[section.id] ? '▼' : '▶';
                content.style.maxHeight = sectionStates[section.id] ? CONST.TIMING.COLLAPSIBLE_MAX_HEIGHT + 'px' : '0';
                content.style.padding = sectionStates[section.id] ? `${CONST.UI.COLLAPSIBLE_PADDING}px` : `0 ${CONST.UI.COLLAPSIBLE_PADDING}px`;
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
            uploadBtn.style.height = CONST.UI.BUTTON_HEIGHT_SM + 'px';
            
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
            uploadBtn.style.height = CONST.UI.BUTTON_HEIGHT_SM + 'px';
            
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
                const filename = `${CONST.FILE.LOGO_PREFIX}${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
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
                const filename = `${CONST.FILE.BACKGROUND_PREFIX}${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
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
            gallery.style.cssText = `margin-top: 8px; padding: 6px; background: ${CONST.COLORS.BACKGROUND_COLOR}; border-radius: 4px;`;
            
            if (!window.imageUploads || window.imageUploads.length === 0) {
                gallery.innerHTML = `<small style="color: ${CONST.COLORS.TEXT_MUTED}; font-size: 0.75rem;">${window.t('text_no_uploads')}</small>`;
            } else {
                const header = document.createElement('div');
                header.style.cssText = 'font-weight: 600; margin-bottom: 4px; font-size: 0.75rem; color: #495057;';
                header.textContent = window.t('text_my_uploads');
                gallery.appendChild(header);
                
                for (const img of window.imageUploads) {
                    if (img.type === 'logo') continue;
                    
                    const imageUrl = await window.loadImageFile(img.filename);
                    
                    const imgCard = document.createElement('div');
                    imgCard.style.cssText = `display: flex; align-items: center; gap: 5px; padding: 3px; background: white; border-radius: 3px; margin-bottom: 3px; border: 1px solid ${CONST.COLORS.CARD_BORDER_COLOR};`;
                    
                    const thumbnail = document.createElement('img');
                    thumbnail.src = imageUrl || '';
                    thumbnail.style.cssText = `width: ${CONST.UI.THUMBNAIL_SIZE}px; height: ${CONST.UI.THUMBNAIL_SIZE}px; object-fit: cover; border-radius: 2px;`;
                    
                    const info = document.createElement('div');
                    info.style.flex = '1';
                    info.style.overflow = 'hidden';
                    info.innerHTML = `<div style="font-size: 0.7rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.name}</div>`;
                    
                    const useBtn = document.createElement('button');
                    useBtn.className = 'btn btn-small btn-primary';
                    useBtn.textContent = window.t('btn_use');
                    useBtn.style.fontSize = '0.65rem';
                    useBtn.style.height = CONST.UI.BUTTON_HEIGHT_XXS + 'px';
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
                    deleteBtn.style.width = CONST.UI.ICON_BTN_SIZE + 'px';
                    deleteBtn.style.height = CONST.UI.ICON_BTN_SIZE + 'px';
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
            
            // Layout defaults
            this.setVal('marginTop', CONST.LAYOUT.DEFAULT_MARGIN_TOP);
            this.setVal('marginBottom', CONST.LAYOUT.DEFAULT_MARGIN_BOTTOM);
            this.setVal('marginLeft', CONST.LAYOUT.DEFAULT_MARGIN_LEFT);
            this.setVal('marginRight', CONST.LAYOUT.DEFAULT_MARGIN_RIGHT);
            this.setVal('dayBlockSpacing', CONST.LAYOUT.DEFAULT_DAY_BLOCK_SPACING);
            this.setVal('columnGap', CONST.LAYOUT.DEFAULT_COLUMN_GAP);
            
            // Header defaults
            this.setVal('headerText', CONST.TEXT.DEFAULT_HEADER);
            this.setVal('headerColor', CONST.COLORS.HEADER_COLOR);
            this.setVal('headerSize', CONST.TYPOGRAPHY.HEADER_FONT_SIZE);
            this.setVal('headerWeight', CONST.TYPOGRAPHY.HEADER_FONT_WEIGHT);
            this.setVal('headerFont', CONST.TYPOGRAPHY.HEADER_FONT_FAMILY);
            this.setVal('headerAlign', CONST.TYPOGRAPHY.HEADER_ALIGN);
            this.setVal('headerTransform', CONST.TYPOGRAPHY.HEADER_TRANSFORM);
            
            // Date range defaults
            this.setChecked('showDateRange', true);
            this.setVal('dateRangeSize', CONST.TYPOGRAPHY.DATE_RANGE_FONT_SIZE);
            this.setVal('dateRangeColor', CONST.COLORS.DATE_RANGE_COLOR);
            this.setVal('dateRangeWeight', CONST.TYPOGRAPHY.DATE_RANGE_FONT_WEIGHT);
            
            // Day block defaults
            this.setVal('dayBg', CONST.COLORS.WHITE);
            this.setVal('dayRadius', CONST.BORDERS.DAY_BORDER_RADIUS);
            this.setVal('dayBorderWidth', CONST.BORDERS.DEFAULT_WIDTH);
            this.setVal('dayBorderColor', CONST.COLORS.DAY_BORDER_COLOR);
            this.setVal('dayBorderStyle', CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('dayBorderSides', CONST.BORDER_SIDES.ALL);
            this.setVal('dayShadow', CONST.SHADOW_OPTIONS.NONE);
            
            // Day name defaults
            this.setVal('dayNameSize', CONST.TYPOGRAPHY.DAY_NAME_FONT_SIZE);
            this.setVal('dayNameColor', CONST.COLORS.DAY_NAME_COLOR);
            this.setVal('dayNameWeight', CONST.TYPOGRAPHY.DAY_NAME_FONT_WEIGHT);
            
            // Meal title defaults
            this.setVal('mealTitleSize', CONST.TYPOGRAPHY.MEAL_TITLE_FONT_SIZE);
            this.setVal('mealTitleColor', CONST.COLORS.MEAL_TITLE_COLOR);
            this.setVal('mealTitleWeight', CONST.TYPOGRAPHY.MEAL_TITLE_FONT_WEIGHT);
            
            // Meal numbering defaults
            this.setVal('mealNumberStyle', CONST.NUMBERING.NUMBERS);
            this.setVal('mealNumberPrefix', '');
            this.setVal('mealNumberSuffix', CONST.TEXT.DEFAULT_MEAL_NUMBER_SUFFIX);
            
            // Ingredients defaults
            this.setVal('ingredientsSize', CONST.TYPOGRAPHY.INGREDIENTS_FONT_SIZE);
            this.setVal('ingredientsColor', CONST.COLORS.INGREDIENTS_COLOR);
            this.setVal('ingredientsStyle', CONST.TYPOGRAPHY.INGREDIENTS_FONT_STYLE);
            
            // Separator defaults
            this.setChecked('headerSepEnabled', false);
            this.setVal('headerSepStyle', CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('headerSepColor', CONST.COLORS.HEADER_SEPARATOR_COLOR);
            this.setVal('headerSepWidth', CONST.BORDERS.SEPARATOR_WIDTH);
            this.setChecked('footerSepEnabled', true);
            this.setVal('footerSepStyle', CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('footerSepColor', CONST.COLORS.FOOTER_SEPARATOR_COLOR);
            this.setVal('footerSepWidth', CONST.BORDERS.SEPARATOR_WIDTH);
            
            // Footer defaults
            this.setVal('footerSize', CONST.TYPOGRAPHY.FOOTER_FONT_SIZE);
            this.setVal('footerColor', CONST.COLORS.FOOTER_COLOR);
            this.setVal('footerText', CONST.TEXT.DEFAULT_FOOTER);
            
            // Background defaults
            this.setVal('backgroundImage', '');
            this.setVal('bgOpacity', CONST.BACKGROUND.DEFAULT_OPACITY);
            this.setVal('bgPosition', CONST.BACKGROUND.DEFAULT_POSITION);
            this.setVal('bgOverlay', CONST.COLORS.DEFAULT_OVERLAY);
            this.setVal('bgOverlayOpacity', CONST.BACKGROUND.DEFAULT_OVERLAY_OPACITY);
            
            // Logo defaults
            this.setVal('logoImage', '');
            this.setVal('logoPosition', CONST.BRANDING.DEFAULT_LOGO_POSITION);
            this.setVal('logoWidth', CONST.BRANDING.DEFAULT_LOGO_WIDTH);
            this.setVal('logoHeight', CONST.BRANDING.DEFAULT_LOGO_HEIGHT);
            
            // Page border defaults
            this.setChecked('pageBorderEnabled', false);
            this.setVal('pageBorderWidth', CONST.BORDERS.PAGE_BORDER_WIDTH);
            this.setVal('pageBorderColor', CONST.COLORS.BLACK);
            this.setVal('pageBorderStyle', CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('pageBorderRadius', CONST.BORDERS.PAGE_BORDER_RADIUS);
            
            const bgInput = document.getElementById('backgroundImage');
            if (bgInput) bgInput.dataset.filename = '';
            
            // Slot visibility defaults
            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
                this.setChecked(`slot${i}_showIngredients`, true);
                this.setChecked(`slot${i}_showCalories`, true);
                this.setChecked(`slot${i}_showAllergens`, true);
            }
        },

        applyTemplateToUI: async function(template) {
            // Apply all template values with fallbacks to constants
            this.setVal('headerText', template.header?.text || CONST.TEXT.DEFAULT_HEADER);
            this.setVal('headerColor', template.header?.color || CONST.COLORS.HEADER_COLOR);
            this.setVal('headerSize', template.header?.fontSize || CONST.TYPOGRAPHY.HEADER_FONT_SIZE);
            this.setVal('headerWeight', template.header?.fontWeight || CONST.TYPOGRAPHY.HEADER_FONT_WEIGHT);
            this.setVal('headerFont', template.header?.fontFamily || CONST.TYPOGRAPHY.HEADER_FONT_FAMILY);
            this.setVal('headerAlign', template.header?.textAlign || CONST.TYPOGRAPHY.HEADER_ALIGN);
            this.setVal('headerTransform', template.header?.textTransform || CONST.TYPOGRAPHY.HEADER_TRANSFORM);
            
            this.setChecked('showDateRange', template.dateRange?.show !== false);
            this.setVal('dateRangeSize', template.dateRange?.fontSize || CONST.TYPOGRAPHY.DATE_RANGE_FONT_SIZE);
            this.setVal('dateRangeColor', template.dateRange?.color || CONST.COLORS.DATE_RANGE_COLOR);
            this.setVal('dateRangeWeight', template.dateRange?.fontWeight || CONST.TYPOGRAPHY.DATE_RANGE_FONT_WEIGHT);
            
            this.setVal('dayBg', template.dayBlock?.bg || CONST.COLORS.WHITE);
            this.setVal('dayRadius', parseInt(template.dayBlock?.borderRadius) || CONST.BORDERS.DAY_BORDER_RADIUS);
            this.setVal('dayBorderWidth', parseInt(template.dayBlock?.borderWidth) || CONST.BORDERS.DEFAULT_WIDTH);
            this.setVal('dayBorderColor', template.dayBlock?.borderColor || CONST.COLORS.DAY_BORDER_COLOR);
            this.setVal('dayBorderStyle', template.dayBlock?.borderStyle || CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('dayBorderSides', template.dayBlock?.borderSides || CONST.BORDER_SIDES.ALL);
            this.setVal('dayShadow', template.dayBlock?.shadow || CONST.SHADOW_OPTIONS.NONE);
            
            this.setVal('marginTop', template.layout?.marginTop || CONST.LAYOUT.DEFAULT_MARGIN_TOP);
            this.setVal('marginBottom', template.layout?.marginBottom || CONST.LAYOUT.DEFAULT_MARGIN_BOTTOM);
            this.setVal('marginLeft', template.layout?.marginLeft || CONST.LAYOUT.DEFAULT_MARGIN_LEFT);
            this.setVal('marginRight', template.layout?.marginRight || CONST.LAYOUT.DEFAULT_MARGIN_RIGHT);
            this.setVal('dayBlockSpacing', template.layout?.dayBlockSpacing || CONST.LAYOUT.DEFAULT_DAY_BLOCK_SPACING);
            this.setVal('columnGap', template.layout?.columnGap || CONST.LAYOUT.DEFAULT_COLUMN_GAP);
            
            this.setVal('dayNameSize', template.dayName?.fontSize || CONST.TYPOGRAPHY.DAY_NAME_FONT_SIZE);
            this.setVal('dayNameColor', template.dayName?.color || CONST.COLORS.DAY_NAME_COLOR);
            this.setVal('dayNameWeight', template.dayName?.fontWeight || CONST.TYPOGRAPHY.DAY_NAME_FONT_WEIGHT);
            
            this.setVal('mealTitleSize', template.mealTitle?.fontSize || CONST.TYPOGRAPHY.MEAL_TITLE_FONT_SIZE);
            this.setVal('mealTitleColor', template.mealTitle?.color || CONST.COLORS.MEAL_TITLE_COLOR);
            this.setVal('mealTitleWeight', template.mealTitle?.fontWeight || CONST.TYPOGRAPHY.MEAL_TITLE_FONT_WEIGHT);
            
            this.setVal('mealNumberStyle', template.mealNumbering?.style || CONST.NUMBERING.NUMBERS);
            this.setVal('mealNumberPrefix', template.mealNumbering?.prefix || '');
            this.setVal('mealNumberSuffix', template.mealNumbering?.suffix || CONST.TEXT.DEFAULT_MEAL_NUMBER_SUFFIX);
            
            this.setVal('ingredientsSize', template.ingredients?.fontSize || CONST.TYPOGRAPHY.INGREDIENTS_FONT_SIZE);
            this.setVal('ingredientsColor', template.ingredients?.color || CONST.COLORS.INGREDIENTS_COLOR);
            this.setVal('ingredientsStyle', template.ingredients?.fontStyle || CONST.TYPOGRAPHY.INGREDIENTS_FONT_STYLE);
            
            this.setChecked('headerSepEnabled', template.separators?.headerEnabled || false);
            this.setVal('headerSepStyle', template.separators?.headerStyle || CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('headerSepColor', template.separators?.headerColor || CONST.COLORS.HEADER_SEPARATOR_COLOR);
            this.setVal('headerSepWidth', template.separators?.headerWidth || CONST.BORDERS.SEPARATOR_WIDTH);
            this.setChecked('footerSepEnabled', template.separators?.footerEnabled !== false);
            this.setVal('footerSepStyle', template.separators?.footerStyle || CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('footerSepColor', template.separators?.footerColor || CONST.COLORS.FOOTER_SEPARATOR_COLOR);
            this.setVal('footerSepWidth', template.separators?.footerWidth || CONST.BORDERS.SEPARATOR_WIDTH);
            
            this.setVal('footerSize', template.footer?.fontSize || CONST.TYPOGRAPHY.FOOTER_FONT_SIZE);
            this.setVal('footerColor', template.footer?.color || CONST.COLORS.FOOTER_COLOR);
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
            
            this.setVal('bgOpacity', template.background?.opacity || CONST.BACKGROUND.DEFAULT_OPACITY);
            this.setVal('bgPosition', template.background?.position || CONST.BACKGROUND.DEFAULT_POSITION);
            this.setVal('bgOverlay', template.background?.overlay || CONST.COLORS.DEFAULT_OVERLAY);
            this.setVal('bgOverlayOpacity', template.background?.overlayOpacity || CONST.BACKGROUND.DEFAULT_OVERLAY_OPACITY);
            
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
            this.setVal('logoPosition', template.branding?.logoPosition || CONST.BRANDING.DEFAULT_LOGO_POSITION);
            this.setVal('logoWidth', template.branding?.logoWidth || CONST.BRANDING.DEFAULT_LOGO_WIDTH);
            this.setVal('logoHeight', template.branding?.logoHeight || CONST.BRANDING.DEFAULT_LOGO_HEIGHT);
            
            this.setChecked('pageBorderEnabled', template.pageBorder?.enabled || false);
            this.setVal('pageBorderWidth', template.pageBorder?.width || CONST.BORDERS.PAGE_BORDER_WIDTH);
            this.setVal('pageBorderColor', template.pageBorder?.color || CONST.COLORS.BLACK);
            this.setVal('pageBorderStyle', template.pageBorder?.style || CONST.BORDERS.DEFAULT_STYLE);
            this.setVal('pageBorderRadius', template.pageBorder?.radius || CONST.BORDERS.PAGE_BORDER_RADIUS);
            
            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
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

            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
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
            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
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
                    marginTop: document.getElementById('marginTop')?.value || CONST.LAYOUT.DEFAULT_MARGIN_TOP,
                    marginBottom: document.getElementById('marginBottom')?.value || CONST.LAYOUT.DEFAULT_MARGIN_BOTTOM,
                    marginLeft: document.getElementById('marginLeft')?.value || CONST.LAYOUT.DEFAULT_MARGIN_LEFT,
                    marginRight: document.getElementById('marginRight')?.value || CONST.LAYOUT.DEFAULT_MARGIN_RIGHT,
                    dayBlockSpacing: document.getElementById('dayBlockSpacing')?.value || CONST.LAYOUT.DEFAULT_DAY_BLOCK_SPACING,
                    columnGap: document.getElementById('columnGap')?.value || CONST.LAYOUT.DEFAULT_COLUMN_GAP
                },
                header: { 
                    text: document.getElementById('headerText')?.value || CONST.TEXT.DEFAULT_HEADER,
                    color: document.getElementById('headerColor')?.value || CONST.COLORS.HEADER_COLOR,
                    fontSize: document.getElementById('headerSize')?.value || CONST.TYPOGRAPHY.HEADER_FONT_SIZE,
                    fontWeight: document.getElementById('headerWeight')?.value || CONST.TYPOGRAPHY.HEADER_FONT_WEIGHT,
                    fontFamily: document.getElementById('headerFont')?.value || CONST.TYPOGRAPHY.HEADER_FONT_FAMILY,
                    textAlign: document.getElementById('headerAlign')?.value || CONST.TYPOGRAPHY.HEADER_ALIGN,
                    textTransform: document.getElementById('headerTransform')?.value || CONST.TYPOGRAPHY.HEADER_TRANSFORM
                },
                dateRange: {
                    show: document.getElementById('showDateRange')?.checked || true,
                    fontSize: document.getElementById('dateRangeSize')?.value || CONST.TYPOGRAPHY.DATE_RANGE_FONT_SIZE,
                    color: document.getElementById('dateRangeColor')?.value || CONST.COLORS.DATE_RANGE_COLOR,
                    fontWeight: document.getElementById('dateRangeWeight')?.value || CONST.TYPOGRAPHY.DATE_RANGE_FONT_WEIGHT,
                    textAlign: 'center'
                },
                dayBlock: {
                    bg: document.getElementById('dayBg')?.value || CONST.COLORS.WHITE,
                    borderRadius: (document.getElementById('dayRadius')?.value || CONST.BORDERS.DAY_BORDER_RADIUS) + 'px',
                    borderWidth: document.getElementById('dayBorderWidth')?.value || CONST.BORDERS.DEFAULT_WIDTH,
                    borderColor: document.getElementById('dayBorderColor')?.value || CONST.COLORS.DAY_BORDER_COLOR,
                    borderStyle: document.getElementById('dayBorderStyle')?.value || CONST.BORDERS.DEFAULT_STYLE,
                    borderSides: document.getElementById('dayBorderSides')?.value || CONST.BORDER_SIDES.ALL,
                    shadow: document.getElementById('dayShadow')?.value || CONST.SHADOW_OPTIONS.NONE
                },
                dayName: {
                    fontSize: document.getElementById('dayNameSize')?.value || CONST.TYPOGRAPHY.DAY_NAME_FONT_SIZE,
                    color: document.getElementById('dayNameColor')?.value || CONST.COLORS.DAY_NAME_COLOR,
                    fontWeight: document.getElementById('dayNameWeight')?.value || CONST.TYPOGRAPHY.DAY_NAME_FONT_WEIGHT
                },
                mealTitle: {
                    fontSize: document.getElementById('mealTitleSize')?.value || CONST.TYPOGRAPHY.MEAL_TITLE_FONT_SIZE,
                    color: document.getElementById('mealTitleColor')?.value || CONST.COLORS.MEAL_TITLE_COLOR,
                    fontWeight: document.getElementById('mealTitleWeight')?.value || CONST.TYPOGRAPHY.MEAL_TITLE_FONT_WEIGHT
                },
                mealNumbering: {
                    style: document.getElementById('mealNumberStyle')?.value || CONST.NUMBERING.NUMBERS,
                    prefix: document.getElementById('mealNumberPrefix')?.value || '',
                    suffix: document.getElementById('mealNumberSuffix')?.value || CONST.TEXT.DEFAULT_MEAL_NUMBER_SUFFIX
                },
                ingredients: {
                    fontSize: document.getElementById('ingredientsSize')?.value || CONST.TYPOGRAPHY.INGREDIENTS_FONT_SIZE,
                    color: document.getElementById('ingredientsColor')?.value || CONST.COLORS.INGREDIENTS_COLOR,
                    fontStyle: document.getElementById('ingredientsStyle')?.value || CONST.TYPOGRAPHY.INGREDIENTS_FONT_STYLE
                },
                separators: {
                    headerEnabled: document.getElementById('headerSepEnabled')?.checked || false,
                    headerStyle: document.getElementById('headerSepStyle')?.value || CONST.BORDERS.DEFAULT_STYLE,
                    headerColor: document.getElementById('headerSepColor')?.value || CONST.COLORS.HEADER_SEPARATOR_COLOR,
                    headerWidth: document.getElementById('headerSepWidth')?.value || CONST.BORDERS.SEPARATOR_WIDTH,
                    footerEnabled: document.getElementById('footerSepEnabled')?.checked || true,
                    footerStyle: document.getElementById('footerSepStyle')?.value || CONST.BORDERS.DEFAULT_STYLE,
                    footerColor: document.getElementById('footerSepColor')?.value || CONST.COLORS.FOOTER_SEPARATOR_COLOR,
                    footerWidth: document.getElementById('footerSepWidth')?.value || CONST.BORDERS.SEPARATOR_WIDTH
                },
                footer: {
                    text: document.getElementById('footerText')?.value || '',
                    fontSize: document.getElementById('footerSize')?.value || CONST.TYPOGRAPHY.FOOTER_FONT_SIZE,
                    color: document.getElementById('footerColor')?.value || CONST.COLORS.FOOTER_COLOR
                },
                background: {
                    opacity: document.getElementById('bgOpacity')?.value || CONST.BACKGROUND.DEFAULT_OPACITY,
                    position: document.getElementById('bgPosition')?.value || CONST.BACKGROUND.DEFAULT_POSITION,
                    overlay: document.getElementById('bgOverlay')?.value || CONST.COLORS.DEFAULT_OVERLAY,
                    overlayOpacity: document.getElementById('bgOverlayOpacity')?.value || CONST.BACKGROUND.DEFAULT_OVERLAY_OPACITY
                },
                branding: {
                    logo: logoFilename,
                    logoPosition: document.getElementById('logoPosition')?.value || CONST.BRANDING.DEFAULT_LOGO_POSITION,
                    logoWidth: document.getElementById('logoWidth')?.value || CONST.BRANDING.DEFAULT_LOGO_WIDTH,
                    logoHeight: document.getElementById('logoHeight')?.value || CONST.BRANDING.DEFAULT_LOGO_HEIGHT
                },
                pageBorder: {
                    enabled: document.getElementById('pageBorderEnabled')?.checked || false,
                    width: document.getElementById('pageBorderWidth')?.value || CONST.BORDERS.PAGE_BORDER_WIDTH,
                    color: document.getElementById('pageBorderColor')?.value || CONST.COLORS.BLACK,
                    style: document.getElementById('pageBorderStyle')?.value || CONST.BORDERS.DEFAULT_STYLE,
                    radius: document.getElementById('pageBorderRadius')?.value || CONST.BORDERS.PAGE_BORDER_RADIUS
                },
                backgroundImage: backgroundImage,
                slotSettings: slotSettings
            };
        },

        refreshPreview: async function() {
            const settings = this.getSettingsFromUI();
            
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
                
                for (let i = 0; i < CONST.WEEK.DAYS_COUNT; i++) {
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
            
            const getBorderStyles = () => {
                const width = settings.dayBlock.borderWidth;
                const style = settings.dayBlock.borderStyle;
                const color = settings.dayBlock.borderColor;
                const sides = settings.dayBlock.borderSides;
                
                if (sides === CONST.BORDER_SIDES.NONE) return 'border: none;';
                if (sides === CONST.BORDER_SIDES.ALL) return `border: ${width}px ${style} ${color};`;
                
                let css = '';
                if (sides === CONST.BORDER_SIDES.TOP) css += `border-top: ${width}px ${style} ${color};`;
                else if (sides === CONST.BORDER_SIDES.BOTTOM) css += `border-bottom: ${width}px ${style} ${color};`;
                else if (sides === CONST.BORDER_SIDES.LEFT_RIGHT) css += `border-left: ${width}px ${style} ${color}; border-right: ${width}px ${style} ${color};`;
                else if (sides === CONST.BORDER_SIDES.TOP_BOTTOM) css += `border-top: ${width}px ${style} ${color}; border-bottom: ${width}px ${style} ${color};`;
                
                return css;
            };
            
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 10px 12px;
                margin-bottom: ${settings.layout.dayBlockSpacing}px;
                ${getBorderStyles()}
                box-shadow: ${window.getShadowCSS(settings.dayBlock.shadow)};
                page-break-inside: avoid;
            `;

            let contentHtml = `
                <div style="border-bottom:1px solid ${CONST.COLORS.DAY_SEPARATOR_COLOR}; margin-bottom:6px; padding-bottom:3px;">
                    <h2 style="margin:0; font-size:${settings.dayName.fontSize}; color:${settings.dayName.color}; font-weight:${settings.dayName.fontWeight}; line-height:1.2;">${dayName}</h2>
                </div>
            `;

            if (dayMenu) {
                const slots = [
                    { id: CONST.SLOTS.SLOT_1, type: 'soup', label: window.t('slot_soup') },
                    { id: CONST.SLOTS.SLOT_2, type: 'main', label: window.t('slot_main') },
                    { id: CONST.SLOTS.SLOT_3, type: 'dessert', label: window.t('slot_dessert') },
                    { id: CONST.SLOTS.SLOT_4, type: 'other', label: window.t('slot_other') }
                ];

                let mealIndex = 1;
                slots.forEach((slotConfig) => {
                    const slot = dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            contentHtml += this.createMealBlock(recipe, slotConfig, slotSettings, settings, mealIndex);
                            mealIndex++;
                        }
                    }
                });
            }

            if (!this.hasMeals(dayMenu)) {
                contentHtml += `<p style="color:${CONST.COLORS.EMPTY_DAY_COLOR}; font-style:italic; text-align:center; padding:8px 0; font-size:8pt; margin:0; line-height:1;">${window.t('empty_day')}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, settings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';
            
            const numberStr = window.getMealNumber(index, settings.mealNumbering.style, settings.mealNumbering.prefix, settings.mealNumbering.suffix);
            
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
            if (metadata.length) titleLine += ` <span style="font-weight:normal; color:${CONST.COLORS.METADATA_COLOR}; font-size:8pt;">(${metadata.join(', ')})</span>`;
            
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
                        return `<span style="color:${CONST.COLORS.ALLERGEN_COLOR}; text-decoration:underline; font-weight:500;">${fullIng.name}</span>`;
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
                container.innerHTML = `<p style="color: ${CONST.COLORS.TEXT_MUTED}; font-size: 0.85rem; text-align: center; padding: 10px;">${window.t('text_no_templates')}</p>`;
                return;
            }

            window.savedTemplates.forEach(tmpl => {
                const card = document.createElement('div');
                card.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: ${CONST.UI.CARD_PADDING}px; margin-bottom: ${CONST.UI.CARD_MARGIN}px; background: white; transition: all 0.2s;`;
                
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
                loadBtn.style.height = CONST.UI.BUTTON_HEIGHT_XS + 'px';
                loadBtn.style.padding = '0 8px';
                loadBtn.onclick = () => this.loadTemplate(tmpl.id);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.width = CONST.UI.BUTTON_HEIGHT_XS + 'px';
                deleteBtn.style.height = CONST.UI.BUTTON_HEIGHT_XS + 'px';
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
        settings.id = CONST.FILE.TEMPLATE_PREFIX + Date.now();
        
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

        // Step 1: Template Selection Modal (ONLY User Templates)
        const modal = document.createElement('div');
        modal.id = 'templatePickerModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 10px; padding: 20px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

        content.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">🎨 Select Template</h3>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 15px;">Choose a template for your menu</p>
            
            <h4 style="margin: 15px 0 10px 0; font-size: 0.9rem; color: #495057;">💾 My Templates</h4>
            <div id="savedTemplatesList" style="margin-bottom: 20px;"></div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                <button id="cancelTemplateBtn" class="btn btn-secondary">${window.t('btn_cancel') || 'Cancel'}</button>
                <button id="nextToWeekBtn" class="btn btn-primary" disabled>${window.t('btn_next') || 'Next'} →</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        let selectedTemplateId = null;

        // Render ONLY Saved Templates (No Presets)
        const savedList = document.getElementById('savedTemplatesList');
        if (window.savedTemplates && window.savedTemplates.length > 0) {
            window.savedTemplates.forEach(tmpl => {
                const card = document.createElement('div');
                card.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; background: white;`;
                card.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.9rem; color: #333;">💾 ${tmpl.name || 'Unnamed Template'}</div>
                    <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">Custom saved template</div>
                `;

                card.onclick = () => {
                    document.querySelectorAll('#savedTemplatesList > div').forEach(c => {
                        c.style.borderColor = CONST.COLORS.CARD_BORDER_COLOR;
                        c.style.background = 'white';
                    });
                    card.style.borderColor = 'var(--color-primary)';
                    card.style.background = '#fff8f0';
                    selectedTemplateId = tmpl.id;
                    document.getElementById('nextToWeekBtn').disabled = false;
                };

                savedList.appendChild(card);
            });
        } else {
            savedList.innerHTML = '<p style="color: #999; font-size: 0.85rem; text-align: center; padding: 10px;">No saved templates yet. Create one in the Template Builder!</p>';
        }

        document.getElementById('cancelTemplateBtn').onclick = () => {
            modal.remove();
        };

        document.getElementById('nextToWeekBtn').onclick = () => {
            modal.remove();
            showWeekPicker(selectedTemplateId);
        };

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // Step 2: Week Selection with Month Grouping (collapsible, newest on top)
        function showWeekPicker(templateId) {
            // Group weeks by month
            const weeksByMonth = {};
            weeks.forEach(week => {
                const monthKey = week.weekStart.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { year: 'numeric', month: 'long' });
                if (!weeksByMonth[monthKey]) {
                    weeksByMonth[monthKey] = {
                        label: monthKey,
                        weeks: [],
                        timestamp: week.weekStart.getTime()
                    };
                }
                weeksByMonth[monthKey].weeks.push(week);
            });

            // Sort months (newest first) and weeks within each month
            const sortedMonths = Object.values(weeksByMonth).sort((a, b) => b.timestamp - a.timestamp);
            
            const modal2 = document.createElement('div');
            modal2.id = 'weekPickerModal';
            modal2.className = 'modal-overlay';
            modal2.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

            const content2 = document.createElement('div');
            content2.style.cssText = 'background: white; border-radius: 10px; padding: 20px; max-width: 500px; width: 90%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

            const header = document.createElement('div');
            header.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">📅 ${window.t('title_select_week') || 'Select Week'}</h3>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 15px;">${window.t('text_select_week_prompt') || 'Choose which week to print'}</p>
            `;

            const weekListContainer = document.createElement('div');
            weekListContainer.id = 'weekSelectList';
            weekListContainer.style.cssText = 'flex: 1; overflow-y: auto; margin-bottom: 15px;';

            const monthStates = {};

            // Render collapsible month sections
            sortedMonths.forEach((monthData, monthIndex) => {
                const isFirstMonth = monthIndex === 0;
                monthStates[monthData.label] = isFirstMonth; // First month expanded by default

                const monthSection = document.createElement('div');
                monthSection.style.cssText = 'margin-bottom: 10px;';

                const monthHeader = document.createElement('div');
                monthHeader.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-bottom: 6px;
                    transition: background 0.2s;
                `;
                monthHeader.onmouseenter = () => monthHeader.style.background = '#e9ecef';
                monthHeader.onmouseleave = () => monthHeader.style.background = '#f8f9fa';

                const monthTitle = document.createElement('div');
                monthTitle.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #333;';
                monthTitle.textContent = `${monthData.label} (${monthData.weeks.length})`;

                const toggleIcon = document.createElement('span');
                toggleIcon.textContent = isFirstMonth ? '▼' : '▶';
                toggleIcon.style.cssText = 'font-size: 0.7rem; color: #666;';

                monthHeader.appendChild(monthTitle);
                monthHeader.appendChild(toggleIcon);

                const weeksContainer = document.createElement('div');
                weeksContainer.style.cssText = `
                    max-height: ${isFirstMonth ? '1000px' : '0'};
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                    padding-left: 10px;
                `;

                // Render weeks for this month
                monthData.weeks.forEach((week, weekIndex) => {
                    const weekCard = document.createElement('div');
                    weekCard.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: 10px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s;`;
                    weekCard.innerHTML = `
                        <div style="font-weight: 600; font-size: 0.85rem; color: #333;">${week.label}</div>
                        <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">${week.dateCount} ${window.t('text_days_with_meals') || 'days with meals'}</div>
                    `;

                    weekCard.onclick = () => {
                        document.querySelectorAll('#weekSelectList .week-card-selected').forEach(card => {
                            card.classList.remove('week-card-selected');
                            card.style.borderColor = CONST.COLORS.CARD_BORDER_COLOR;
                            card.style.background = 'white';
                        });
                        weekCard.classList.add('week-card-selected');
                        weekCard.style.borderColor = 'var(--color-primary)';
                        weekCard.style.background = '#fff8f0';
                        selectedWeekStart = week.weekStart;
                        document.getElementById('confirmPrintBtn').disabled = false;
                    };

                    weeksContainer.appendChild(weekCard);

                    // Auto-select first week of first month
                    if (monthIndex === 0 && weekIndex === 0) {
                        setTimeout(() => weekCard.click(), 100);
                    }
                });

                monthHeader.onclick = () => {
                    monthStates[monthData.label] = !monthStates[monthData.label];
                    toggleIcon.textContent = monthStates[monthData.label] ? '▼' : '▶';
                    weeksContainer.style.maxHeight = monthStates[monthData.label] ? '1000px' : '0';
                };

                monthSection.appendChild(monthHeader);
                monthSection.appendChild(weeksContainer);
                weekListContainer.appendChild(monthSection);
            });

            const footer = document.createElement('div');
            footer.style.cssText = 'display: flex; gap: 10px; justify-content: space-between; padding-top: 15px; border-top: 1px solid #dee2e6;';
            footer.innerHTML = `
                <button id="backToTemplateBtn" class="btn btn-secondary">← ${window.t('btn_back') || 'Back'}</button>
                <div style="display: flex; gap: 10px;">
                    <button id="cancelPrintBtn" class="btn btn-secondary">${window.t('btn_cancel') || 'Cancel'}</button>
                    <button id="confirmPrintBtn" class="btn btn-primary" disabled>${window.t('btn_print') || 'Print'}</button>
                </div>
            `;

            content2.appendChild(header);
            content2.appendChild(weekListContainer);
            content2.appendChild(footer);
            modal2.appendChild(content2);
            document.body.appendChild(modal2);

            document.getElementById('backToTemplateBtn').onclick = () => {
                modal2.remove();
                window.openTemplatePicker();
            };

            document.getElementById('cancelPrintBtn').onclick = () => {
                modal2.remove();
            };

            document.getElementById('confirmPrintBtn').onclick = async () => {
                modal2.remove();
                if (selectedWeekStart) {
                    window.printWithTemplate(templateId);
                }
            };

            modal2.onclick = (e) => {
                if (e.target === modal2) modal2.remove();
            };
        }
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

        // Load and validate background image
        let bgImageUrl = '';
        if (settings.backgroundImage) {
            console.log('🖼️ Loading background image:', settings.backgroundImage);
            bgImageUrl = await window.loadImageFile(settings.backgroundImage);
            console.log('🖼️ Background image loaded, length:', bgImageUrl ? bgImageUrl.length : 0);
            
            // Verify it's a valid data URL
            if (bgImageUrl && !bgImageUrl.startsWith('data:')) {
                console.warn('⚠️ Background image is not a data URL');
                bgImageUrl = '';
            }
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
                
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                body {
                    font-family: '${CONST.TYPOGRAPHY.HEADER_FONT_FAMILY}', Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    position: relative;
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
                    background-image: url("${bgImageUrl}");
                    background-size: cover;
                    background-position: ${settings.background.position};
                    background-repeat: no-repeat;
                    opacity: ${settings.background.opacity};
                    z-index: -1;
                    pointer-events: none;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                @media print {
                    body::before {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
                ` : ''}
                .print-header {
                    text-align: ${settings.header.textAlign};
                    margin-bottom: 12px;
                    position: relative;
                    z-index: 1;
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
                    position: relative;
                    z-index: 1;
                    ${(() => {
                        const w = settings.dayBlock.borderWidth;
                        const s = settings.dayBlock.borderStyle;
                        const c = settings.dayBlock.borderColor;
                        const sides = settings.dayBlock.borderSides;
                        if (sides === CONST.BORDER_SIDES.NONE) return '';
                        if (sides === CONST.BORDER_SIDES.ALL) return `border: ${w}px ${s} ${c};`;
                        let css = '';
                        if (sides === CONST.BORDER_SIDES.TOP) css = `border-top: ${w}px ${s} ${c};`;
                        else if (sides === CONST.BORDER_SIDES.BOTTOM) css = `border-bottom: ${w}px ${s} ${c};`;
                        else if (sides === CONST.BORDER_SIDES.LEFT_RIGHT) css = `border-left: ${w}px ${s} ${c}; border-right: ${w}px ${s} ${c};`;
                        else if (sides === CONST.BORDER_SIDES.TOP_BOTTOM) css = `border-top: ${w}px ${s} ${c}; border-bottom: ${w}px ${s} ${c};`;
                        return css;
                    })()}
                    box-shadow: ${window.getShadowCSS(settings.dayBlock.shadow)};
                    page-break-inside: avoid;
                }
                .day-name {
                    font-size: ${settings.dayName.fontSize};
                    color: ${settings.dayName.color};
                    font-weight: ${settings.dayName.fontWeight};
                    border-bottom: 1px solid ${CONST.COLORS.DAY_SEPARATOR_COLOR};
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
                    color: ${CONST.COLORS.ALLERGEN_COLOR};
                    text-decoration: underline;
                    font-weight: 500;
                }
                .print-footer {
                    text-align: center;
                    font-size: ${settings.footer.fontSize};
                    color: ${settings.footer.color};
                    margin-top: 12px;
                    position: relative;
                    z-index: 1;
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

        for (let i = 0; i < CONST.WEEK.DAYS_COUNT; i++) {
            const day = new Date(selectedWeekStart);
            day.setDate(selectedWeekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });

            html += `<div class="print-day-block">`;
            html += `<div class="day-name">${dayName}</div>`;

            if (dayMenu && TemplateManager.hasMeals(dayMenu)) {
                const slots = [
                    { id: CONST.SLOTS.SLOT_1, type: 'soup' },
                    { id: CONST.SLOTS.SLOT_2, type: 'main' },
                    { id: CONST.SLOTS.SLOT_3, type: 'dessert' },
                    { id: CONST.SLOTS.SLOT_4, type: 'other' }
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

                            const numberStr = window.getMealNumber(mealIndex, settings.mealNumbering.style, settings.mealNumbering.prefix, settings.mealNumbering.suffix);

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
                                html += ` <span style="font-weight:normal; color:${CONST.COLORS.METADATA_COLOR}; font-size:8pt;">(${metadata.join(', ')})</span>`;
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
                html += `<p style="color:${CONST.COLORS.EMPTY_DAY_COLOR}; font-style:italic; text-align:center; padding:8px 0; margin:0;">${window.t('empty_day')}</p>`;
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
            }, CONST.TIMING.PRINT_DELAY);
        };
    };

    window.getWeekStart = window.getWeekStart || function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === CONST.WEEK.SUNDAY ? -6 : CONST.WEEK.START_DAY);
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
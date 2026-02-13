/**
 * Template Sections Module
 * Handles rendering of collapsible configuration sections
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    const TemplateSections = {
        render: function(sectionStates, manager) {
            const container = document.getElementById('collapsibleSections');
            if (!container) return;
            
            const sections = this.getSectionDefinitions();

            sections.forEach(section => {
                const sectionDiv = this.createCollapsibleSection(section, sectionStates);
                container.appendChild(sectionDiv);
            });
            
            manager.bindUI();
            this.setupOpacitySliders(manager);
        },

        getSectionDefinitions: function() {
            return [
                this.getLayoutSection(),
                this.getBackgroundSection(),
                this.getBrandingSection(),
                this.getHeaderSection(),
                this.getDateRangeSection(),
                this.getDayBlockSection(),
                this.getDayNameSection(),
                this.getMealTitleSection(),
                this.getMealNumberingSection(),
                this.getSeparatorsSection(),
                this.getIngredientsSection(),
                this.getMealVisibilitySection(),
                this.getPageBorderSection(),
                this.getFooterSection()
            ];
        },

        getLayoutSection: function() {
            return {
                id: 'layout',
                titleKey: 'Layout & Spacing',
                html: `
                    <label class="tb-label tb-mb-6">Layout Style</label>
                    <select id="layoutStyle" class="form-control tb-input tb-mb-8">
                        <option value="single-column" selected>Single Column</option>
                        <option value="two-column">Two Column</option>
                        <option value="table">Table Layout</option>
                        <option value="compact-cards">Compact Cards</option>
                    </select>
                    
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
            };
        },

        getBackgroundSection: function() {
            return {
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
            };
        },

        getBrandingSection: function() {
            return {
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
            };
        },

        getHeaderSection: function() {
            return {
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
            };
        },

        getDateRangeSection: function() {
            return {
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
            };
        },

        getDayBlockSection: function() {
            return {
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
            };
        },

        getDayNameSection: function() {
            return {
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
            };
        },

        getMealTitleSection: function() {
            return {
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
            };
        },

        getMealNumberingSection: function() {
            return {
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
            };
        },

        getSeparatorsSection: function() {
            return {
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
            };
        },

        getIngredientsSection: function() {
            return {
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
            };
        },

        getMealVisibilitySection: function() {
            return {
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
            };
        },

        getPageBorderSection: function() {
            return {
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
            };
        },

        getFooterSection: function() {
            return {
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
            };
        },

        createCollapsibleSection: function(section, sectionStates) {
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

        setupOpacitySliders: function(manager) {
            const bgOpacity = document.getElementById('bgOpacity');
            const bgOpacityValue = document.getElementById('bgOpacityValue');
            if (bgOpacity && bgOpacityValue) {
                bgOpacity.addEventListener('input', (e) => {
                    bgOpacityValue.textContent = Math.round(e.target.value * 100) + '%';
                    manager.refreshPreview();
                });
            }
            
            const bgOverlayOpacity = document.getElementById('bgOverlayOpacity');
            const bgOverlayOpacityValue = document.getElementById('bgOverlayOpacityValue');
            if (bgOverlayOpacity && bgOverlayOpacityValue) {
                bgOverlayOpacity.addEventListener('input', (e) => {
                    bgOverlayOpacityValue.textContent = Math.round(e.target.value * 100) + '%';
                    manager.refreshPreview();
                });
            }
        }
    };

    window.TemplateSections = TemplateSections;
})(window);
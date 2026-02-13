/**
 * Template Loader Module
 * Handles loading template settings into the UI
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;
    
    const TemplateLoader = {
        applyToUI: async function(template, manager) {
            // Apply all template values with fallbacks to constants
            manager.setVal('headerText', template.header?.text || CONST.TEXT.DEFAULT_HEADER);
            manager.setVal('headerColor', template.header?.color || CONST.COLORS.HEADER_COLOR);
            manager.setVal('headerSize', template.header?.fontSize || CONST.TYPOGRAPHY.HEADER_FONT_SIZE);
            manager.setVal('headerWeight', template.header?.fontWeight || CONST.TYPOGRAPHY.HEADER_FONT_WEIGHT);
            manager.setVal('headerFont', template.header?.fontFamily || CONST.TYPOGRAPHY.HEADER_FONT_FAMILY);
            manager.setVal('headerAlign', template.header?.textAlign || CONST.TYPOGRAPHY.HEADER_ALIGN);
            manager.setVal('headerTransform', template.header?.textTransform || CONST.TYPOGRAPHY.HEADER_TRANSFORM);
            
            manager.setChecked('showDateRange', template.dateRange?.show !== false);
            manager.setVal('dateRangeSize', template.dateRange?.fontSize || CONST.TYPOGRAPHY.DATE_RANGE_FONT_SIZE);
            manager.setVal('dateRangeColor', template.dateRange?.color || CONST.COLORS.DATE_RANGE_COLOR);
            manager.setVal('dateRangeWeight', template.dateRange?.fontWeight || CONST.TYPOGRAPHY.DATE_RANGE_FONT_WEIGHT);
            
            manager.setVal('dayBg', template.dayBlock?.bg || CONST.COLORS.WHITE);
            manager.setVal('dayRadius', parseInt(template.dayBlock?.borderRadius) || CONST.BORDERS.DAY_BORDER_RADIUS);
            manager.setVal('dayBorderWidth', parseInt(template.dayBlock?.borderWidth) || CONST.BORDERS.DEFAULT_WIDTH);
            manager.setVal('dayBorderColor', template.dayBlock?.borderColor || CONST.COLORS.DAY_BORDER_COLOR);
            manager.setVal('dayBorderStyle', template.dayBlock?.borderStyle || CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('dayBorderSides', template.dayBlock?.borderSides || CONST.BORDER_SIDES.ALL);
            manager.setVal('dayShadow', template.dayBlock?.shadow || CONST.SHADOW_OPTIONS.NONE);
            
            // FIXED: Load layoutStyle
            manager.setVal('layoutStyle', template.layout?.style || 'single-column');
            manager.setVal('marginTop', template.layout?.marginTop || CONST.LAYOUT.DEFAULT_MARGIN_TOP);
            manager.setVal('marginBottom', template.layout?.marginBottom || CONST.LAYOUT.DEFAULT_MARGIN_BOTTOM);
            manager.setVal('marginLeft', template.layout?.marginLeft || CONST.LAYOUT.DEFAULT_MARGIN_LEFT);
            manager.setVal('marginRight', template.layout?.marginRight || CONST.LAYOUT.DEFAULT_MARGIN_RIGHT);
            manager.setVal('dayBlockSpacing', template.layout?.dayBlockSpacing || CONST.LAYOUT.DEFAULT_DAY_BLOCK_SPACING);
            manager.setVal('columnGap', template.layout?.columnGap || CONST.LAYOUT.DEFAULT_COLUMN_GAP);
            
            manager.setVal('dayNameSize', template.dayName?.fontSize || CONST.TYPOGRAPHY.DAY_NAME_FONT_SIZE);
            manager.setVal('dayNameColor', template.dayName?.color || CONST.COLORS.DAY_NAME_COLOR);
            manager.setVal('dayNameWeight', template.dayName?.fontWeight || CONST.TYPOGRAPHY.DAY_NAME_FONT_WEIGHT);
            
            manager.setVal('mealTitleSize', template.mealTitle?.fontSize || CONST.TYPOGRAPHY.MEAL_TITLE_FONT_SIZE);
            manager.setVal('mealTitleColor', template.mealTitle?.color || CONST.COLORS.MEAL_TITLE_COLOR);
            manager.setVal('mealTitleWeight', template.mealTitle?.fontWeight || CONST.TYPOGRAPHY.MEAL_TITLE_FONT_WEIGHT);
            
            manager.setVal('mealNumberStyle', template.mealNumbering?.style || CONST.NUMBERING.NUMBERS);
            manager.setVal('mealNumberPrefix', template.mealNumbering?.prefix || '');
            manager.setVal('mealNumberSuffix', template.mealNumbering?.suffix || CONST.TEXT.DEFAULT_MEAL_NUMBER_SUFFIX);
            
            manager.setVal('ingredientsSize', template.ingredients?.fontSize || CONST.TYPOGRAPHY.INGREDIENTS_FONT_SIZE);
            manager.setVal('ingredientsColor', template.ingredients?.color || CONST.COLORS.INGREDIENTS_COLOR);
            manager.setVal('ingredientsStyle', template.ingredients?.fontStyle || CONST.TYPOGRAPHY.INGREDIENTS_FONT_STYLE);
            
            manager.setChecked('headerSepEnabled', template.separators?.headerEnabled || false);
            manager.setVal('headerSepStyle', template.separators?.headerStyle || CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('headerSepColor', template.separators?.headerColor || CONST.COLORS.HEADER_SEPARATOR_COLOR);
            manager.setVal('headerSepWidth', template.separators?.headerWidth || CONST.BORDERS.SEPARATOR_WIDTH);
            manager.setChecked('footerSepEnabled', template.separators?.footerEnabled !== false);
            manager.setVal('footerSepStyle', template.separators?.footerStyle || CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('footerSepColor', template.separators?.footerColor || CONST.COLORS.FOOTER_SEPARATOR_COLOR);
            manager.setVal('footerSepWidth', template.separators?.footerWidth || CONST.BORDERS.SEPARATOR_WIDTH);
            
            manager.setVal('footerSize', template.footer?.fontSize || CONST.TYPOGRAPHY.FOOTER_FONT_SIZE);
            manager.setVal('footerColor', template.footer?.color || CONST.COLORS.FOOTER_COLOR);
            manager.setVal('footerText', template.footer?.text || '');
            
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
            
            manager.setVal('bgOpacity', template.background?.opacity || CONST.BACKGROUND.DEFAULT_OPACITY);
            manager.setVal('bgPosition', template.background?.position || CONST.BACKGROUND.DEFAULT_POSITION);
            manager.setVal('bgOverlay', template.background?.overlay || CONST.COLORS.DEFAULT_OVERLAY);
            manager.setVal('bgOverlayOpacity', template.background?.overlayOpacity || CONST.BACKGROUND.DEFAULT_OVERLAY_OPACITY);
            
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
            manager.setVal('logoPosition', template.branding?.logoPosition || CONST.BRANDING.DEFAULT_LOGO_POSITION);
            manager.setVal('logoWidth', template.branding?.logoWidth || CONST.BRANDING.DEFAULT_LOGO_WIDTH);
            manager.setVal('logoHeight', template.branding?.logoHeight || CONST.BRANDING.DEFAULT_LOGO_HEIGHT);
            
            manager.setChecked('pageBorderEnabled', template.pageBorder?.enabled || false);
            manager.setVal('pageBorderWidth', template.pageBorder?.width || CONST.BORDERS.PAGE_BORDER_WIDTH);
            manager.setVal('pageBorderColor', template.pageBorder?.color || CONST.COLORS.BLACK);
            manager.setVal('pageBorderStyle', template.pageBorder?.style || CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('pageBorderRadius', template.pageBorder?.radius || CONST.BORDERS.PAGE_BORDER_RADIUS);
            
            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
                const slot = template.slotSettings?.[`slot${i}`];
                manager.setChecked(`slot${i}_showIngredients`, slot?.showIngredients !== false);
                manager.setChecked(`slot${i}_showCalories`, slot?.showCalories !== false);
                manager.setChecked(`slot${i}_showAllergens`, slot?.showAllergens !== false);
            }
        }
    };

    window.TemplateLoader = TemplateLoader;

})(window);

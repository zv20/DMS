/**
 * Template Defaults Module
 * Applies default template settings
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    window.TemplateDefaults = {
        apply: function(manager) {
            // Layout defaults
            manager.setVal('marginTop', CONST.LAYOUT.DEFAULT_MARGIN_TOP);
            manager.setVal('marginBottom', CONST.LAYOUT.DEFAULT_MARGIN_BOTTOM);
            manager.setVal('marginLeft', CONST.LAYOUT.DEFAULT_MARGIN_LEFT);
            manager.setVal('marginRight', CONST.LAYOUT.DEFAULT_MARGIN_RIGHT);
            manager.setVal('dayBlockSpacing', CONST.LAYOUT.DEFAULT_DAY_BLOCK_SPACING);
            manager.setVal('columnGap', CONST.LAYOUT.DEFAULT_COLUMN_GAP);
            
            // Header defaults
            manager.setVal('headerText', CONST.TEXT.DEFAULT_HEADER);
            manager.setVal('headerColor', CONST.COLORS.HEADER_COLOR);
            manager.setVal('headerSize', CONST.TYPOGRAPHY.HEADER_FONT_SIZE);
            manager.setVal('headerWeight', CONST.TYPOGRAPHY.HEADER_FONT_WEIGHT);
            manager.setVal('headerFont', CONST.TYPOGRAPHY.HEADER_FONT_FAMILY);
            manager.setVal('headerAlign', CONST.TYPOGRAPHY.HEADER_ALIGN);
            manager.setVal('headerTransform', CONST.TYPOGRAPHY.HEADER_TRANSFORM);
            
            // Date range defaults
            manager.setChecked('showDateRange', true);
            manager.setVal('dateRangeSize', CONST.TYPOGRAPHY.DATE_RANGE_FONT_SIZE);
            manager.setVal('dateRangeColor', CONST.COLORS.DATE_RANGE_COLOR);
            manager.setVal('dateRangeWeight', CONST.TYPOGRAPHY.DATE_RANGE_FONT_WEIGHT);
            
            // Day block defaults
            manager.setVal('dayBg', CONST.COLORS.WHITE);
            manager.setVal('dayRadius', CONST.BORDERS.DAY_BORDER_RADIUS);
            manager.setVal('dayBorderWidth', CONST.BORDERS.DEFAULT_WIDTH);
            manager.setVal('dayBorderColor', CONST.COLORS.DAY_BORDER_COLOR);
            manager.setVal('dayBorderStyle', CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('dayBorderSides', CONST.BORDER_SIDES.ALL);
            manager.setVal('dayShadow', CONST.SHADOW_OPTIONS.NONE);
            
            // Day name defaults
            manager.setVal('dayNameSize', CONST.TYPOGRAPHY.DAY_NAME_FONT_SIZE);
            manager.setVal('dayNameColor', CONST.COLORS.DAY_NAME_COLOR);
            manager.setVal('dayNameWeight', CONST.TYPOGRAPHY.DAY_NAME_FONT_WEIGHT);
            
            // Meal title defaults
            manager.setVal('mealTitleSize', CONST.TYPOGRAPHY.MEAL_TITLE_FONT_SIZE);
            manager.setVal('mealTitleColor', CONST.COLORS.MEAL_TITLE_COLOR);
            manager.setVal('mealTitleWeight', CONST.TYPOGRAPHY.MEAL_TITLE_FONT_WEIGHT);
            
            // Meal numbering defaults
            manager.setVal('mealNumberStyle', CONST.NUMBERING.NUMBERS);
            manager.setVal('mealNumberPrefix', '');
            manager.setVal('mealNumberSuffix', CONST.TEXT.DEFAULT_MEAL_NUMBER_SUFFIX);
            
            // Ingredients defaults
            manager.setVal('ingredientsSize', CONST.TYPOGRAPHY.INGREDIENTS_FONT_SIZE);
            manager.setVal('ingredientsColor', CONST.COLORS.INGREDIENTS_COLOR);
            manager.setVal('ingredientsStyle', CONST.TYPOGRAPHY.INGREDIENTS_FONT_STYLE);
            
            // Separator defaults
            manager.setChecked('headerSepEnabled', false);
            manager.setVal('headerSepStyle', CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('headerSepColor', CONST.COLORS.HEADER_SEPARATOR_COLOR);
            manager.setVal('headerSepWidth', CONST.BORDERS.SEPARATOR_WIDTH);
            manager.setChecked('footerSepEnabled', true);
            manager.setVal('footerSepStyle', CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('footerSepColor', CONST.COLORS.FOOTER_SEPARATOR_COLOR);
            manager.setVal('footerSepWidth', CONST.BORDERS.SEPARATOR_WIDTH);
            
            // Footer defaults
            manager.setVal('footerSize', CONST.TYPOGRAPHY.FOOTER_FONT_SIZE);
            manager.setVal('footerColor', CONST.COLORS.FOOTER_COLOR);
            manager.setVal('footerText', CONST.TEXT.DEFAULT_FOOTER);
            
            // Background defaults
            manager.setVal('backgroundImage', '');
            manager.setVal('bgOpacity', CONST.BACKGROUND.DEFAULT_OPACITY);
            manager.setVal('bgPosition', CONST.BACKGROUND.DEFAULT_POSITION);
            manager.setVal('bgOverlay', CONST.COLORS.DEFAULT_OVERLAY);
            manager.setVal('bgOverlayOpacity', CONST.BACKGROUND.DEFAULT_OVERLAY_OPACITY);
            
            // Logo defaults
            manager.setVal('logoImage', '');
            manager.setVal('logoPosition', CONST.BRANDING.DEFAULT_LOGO_POSITION);
            manager.setVal('logoWidth', CONST.BRANDING.DEFAULT_LOGO_WIDTH);
            manager.setVal('logoHeight', CONST.BRANDING.DEFAULT_LOGO_HEIGHT);
            
            // Page border defaults
            manager.setChecked('pageBorderEnabled', false);
            manager.setVal('pageBorderWidth', CONST.BORDERS.PAGE_BORDER_WIDTH);
            manager.setVal('pageBorderColor', CONST.COLORS.BLACK);
            manager.setVal('pageBorderStyle', CONST.BORDERS.DEFAULT_STYLE);
            manager.setVal('pageBorderRadius', CONST.BORDERS.PAGE_BORDER_RADIUS);
            
            const bgInput = document.getElementById('backgroundImage');
            if (bgInput) bgInput.dataset.filename = '';
            
            // Slot visibility defaults
            for (let i = 1; i <= CONST.SLOTS.COUNT; i++) {
                manager.setChecked(`slot${i}_showIngredients`, true);
                manager.setChecked(`slot${i}_showCalories`, true);
                manager.setChecked(`slot${i}_showAllergens`, true);
            }
        }
    };

})(window);
/**
 * Template Settings Module
 * Handles getting/setting template configuration from UI
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    const TemplateSettings = {
        getFromUI: function() {
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
        }
    };

    window.TemplateSettings = TemplateSettings;
})(window);
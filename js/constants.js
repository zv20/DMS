/**
 * Application Constants
 * Centralized configuration values for better maintainability
 */

(function(window) {
    'use strict';

    window.DMS_CONSTANTS = {
        // Layout & Spacing
        LAYOUT: {
            DEFAULT_MARGIN_TOP: 8,
            DEFAULT_MARGIN_BOTTOM: 8,
            DEFAULT_MARGIN_LEFT: 8,
            DEFAULT_MARGIN_RIGHT: 8,
            DEFAULT_DAY_BLOCK_SPACING: 6,
            DEFAULT_COLUMN_GAP: 10,
            MAX_MARGIN: 30,
            MIN_MARGIN: 0,
            MAX_SPACING: 20,
            MAX_COLUMN_GAP: 30
        },

        // Typography
        TYPOGRAPHY: {
            HEADER_FONT_SIZE: '20pt',
            HEADER_FONT_FAMILY: 'Segoe UI',
            HEADER_FONT_WEIGHT: 'bold',
            HEADER_ALIGN: 'center',
            HEADER_TRANSFORM: 'none',
            
            DATE_RANGE_FONT_SIZE: '9pt',
            DATE_RANGE_FONT_WEIGHT: 'normal',
            
            DAY_NAME_FONT_SIZE: '11pt',
            DAY_NAME_FONT_WEIGHT: '600',
            
            MEAL_TITLE_FONT_SIZE: '9pt',
            MEAL_TITLE_FONT_WEIGHT: '600',
            
            INGREDIENTS_FONT_SIZE: '7.5pt',
            INGREDIENTS_FONT_STYLE: 'italic',
            
            FOOTER_FONT_SIZE: '8pt',
            FOOTER_FONT_WEIGHT: 'normal',
            
            SECTION_TITLE_SIZE: '9.5pt'
        },

        // Colors
        COLORS: {
            PRIMARY: '#fd7e14',
            WHITE: '#ffffff',
            BLACK: '#000000',
            
            // Text colors
            HEADER_COLOR: '#fd7e14',
            DATE_RANGE_COLOR: '#7f8c8d',
            DAY_NAME_COLOR: '#2c3e50',
            MEAL_TITLE_COLOR: '#333333',
            INGREDIENTS_COLOR: '#555555',
            FOOTER_COLOR: '#7f8c8d',
            ALLERGEN_COLOR: '#dc3545',
            EMPTY_DAY_COLOR: '#aaaaaa',
            
            // Border colors
            DAY_BORDER_COLOR: '#e0e0e0',
            DAY_SEPARATOR_COLOR: '#d0d0d0',
            HEADER_SEPARATOR_COLOR: '#dddddd',
            FOOTER_SEPARATOR_COLOR: '#eeeeee',
            
            // UI colors
            CARD_BORDER_COLOR: '#dee2e6',
            BACKGROUND_COLOR: '#f8f9fa',
            HOVER_BACKGROUND: '#e9ecef',
            TEXT_MUTED: '#6c757d',
            METADATA_COLOR: '#666666',
            
            // Overlay
            DEFAULT_OVERLAY: '#000000'
        },

        // Borders & Shadows
        BORDERS: {
            DEFAULT_WIDTH: 2,
            DEFAULT_STYLE: 'solid',
            MIN_WIDTH: 0,
            MAX_WIDTH: 10,
            
            PAGE_BORDER_WIDTH: 1,
            PAGE_BORDER_RADIUS: 0,
            
            DAY_BORDER_RADIUS: 8,
            
            SEPARATOR_WIDTH: 1,
            MIN_SEPARATOR_WIDTH: 1,
            MAX_SEPARATOR_WIDTH: 5
        },

        SHADOWS: {
            NONE: 'none',
            LIGHT: '0 1px 3px rgba(0,0,0,0.12)',
            MEDIUM: '0 2px 6px rgba(0,0,0,0.16)',
            STRONG: '0 4px 12px rgba(0,0,0,0.24)'
        },

        // Logo & Branding
        BRANDING: {
            DEFAULT_LOGO_WIDTH: 80,
            DEFAULT_LOGO_HEIGHT: 80,
            MIN_LOGO_SIZE: 20,
            MAX_LOGO_SIZE: 200,
            DEFAULT_LOGO_POSITION: 'top-right'
        },

        // Background
        BACKGROUND: {
            DEFAULT_OPACITY: 1,
            DEFAULT_OVERLAY_OPACITY: 0,
            MIN_OPACITY: 0,
            MAX_OPACITY: 1,
            OPACITY_STEP: 0.1,
            DEFAULT_POSITION: 'center'
        },

        // Meal Slots
        SLOTS: {
            COUNT: 4,
            SLOT_1: 'slot1',
            SLOT_2: 'slot2',
            SLOT_3: 'slot3',
            SLOT_4: 'slot4'
        },

        // Week Configuration
        WEEK: {
            DAYS_COUNT: 5,
            START_DAY: 1, // Monday
            SUNDAY: 0
        },

        // Default Text Values
        TEXT: {
            DEFAULT_HEADER: 'Weekly Menu',
            DEFAULT_FOOTER: 'Prepared with care by KitchenPro',
            DEFAULT_MEAL_NUMBER_SUFFIX: '.'
        },

        // File Prefixes
        FILE: {
            BACKGROUND_PREFIX: 'bg_',
            LOGO_PREFIX: 'logo_',
            TEMPLATE_PREFIX: 'tmpl_'
        },

        // Timing
        TIMING: {
            PRINT_DELAY: 500,
            ANIMATION_DURATION: 300,
            COLLAPSIBLE_MAX_HEIGHT: 2000
        },

        // UI Dimensions
        UI: {
            CARD_BORDER_WIDTH: 2,
            CARD_BORDER_RADIUS: 6,
            CARD_PADDING: 10,
            CARD_MARGIN: 8,
            
            BUTTON_HEIGHT_SM: 32,
            BUTTON_HEIGHT_XS: 26,
            BUTTON_HEIGHT_XXS: 22,
            
            THUMBNAIL_SIZE: 28,
            ICON_BTN_SIZE: 22,
            
            SECTION_MARGIN: 10,
            COLLAPSIBLE_PADDING: 10
        },

        // Meal Numbering Styles
        NUMBERING: {
            NUMBERS: 'numbers',
            BULLETS: 'bullets',
            LETTERS: 'letters',
            ROMAN: 'roman',
            NONE: 'none',
            
            ROMAN_NUMERALS: ['I', 'II', 'III', 'IV']
        },

        // Border Sides Options
        BORDER_SIDES: {
            ALL: 'all',
            TOP: 'top',
            BOTTOM: 'bottom',
            LEFT_RIGHT: 'left-right',
            TOP_BOTTOM: 'top-bottom',
            NONE: 'none'
        },

        // Shadow Options
        SHADOW_OPTIONS: {
            NONE: 'none',
            LIGHT: 'light',
            MEDIUM: 'medium',
            STRONG: 'strong'
        }
    };

    // Helper function to get shadow CSS
    window.getShadowCSS = function(shadowType) {
        const SHADOWS = window.DMS_CONSTANTS.SHADOWS;
        switch(shadowType) {
            case window.DMS_CONSTANTS.SHADOW_OPTIONS.LIGHT: return SHADOWS.LIGHT;
            case window.DMS_CONSTANTS.SHADOW_OPTIONS.MEDIUM: return SHADOWS.MEDIUM;
            case window.DMS_CONSTANTS.SHADOW_OPTIONS.STRONG: return SHADOWS.STRONG;
            default: return SHADOWS.NONE;
        }
    };

    // Helper function to get meal number
    window.getMealNumber = function(index, style, prefix, suffix) {
        const NUMBERING = window.DMS_CONSTANTS.NUMBERING;
        let num = '';
        
        switch(style) {
            case NUMBERING.NUMBERS: 
                num = index.toString(); 
                break;
            case NUMBERING.BULLETS: 
                return '•';
            case NUMBERING.LETTERS: 
                num = String.fromCharCode(64 + index); 
                break;
            case NUMBERING.ROMAN: 
                num = NUMBERING.ROMAN_NUMERALS[index - 1] || index.toString();
                break;
            case NUMBERING.NONE: 
                return '';
            default: 
                num = index.toString();
        }
        
        return `${prefix}${num}${suffix}`;
    };

    console.log('✅ DMS Constants loaded');

})(window);

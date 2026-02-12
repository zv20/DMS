/**
 * DMS Preset Templates
 * 6 professional menu template presets
 * Loaded by template.js via window.DMSPresets
 */

window.DMSPresets = [
    // 1. CLASSIC (Original Default)
    {
        id: 'preset_classic',
        nameKey: 'Classic Menu',
        layout: { marginTop: 8, marginBottom: 8, marginLeft: 8, marginRight: 8, dayBlockSpacing: 6, dayBlockPadding: '10px 12px', columnGap: 10 },
        header: { text: 'Weekly Menu', color: '#fd7e14', fontSize: '20pt', fontWeight: 'bold', fontFamily: 'Segoe UI', textAlign: 'center', textTransform: 'none', lineHeight: '1.2' },
        dateRange: { show: true, fontSize: '9pt', color: '#7f8c8d', fontWeight: 'normal', textAlign: 'center' },
        dayBlock: { bg: '#ffffff', borderRadius: '8px', borderWidth: '2', borderColor: '#e0e0e0', borderStyle: 'solid', borderSides: 'all', shadow: 'none', padding: '10px 12px' },
        dayName: { fontSize: '11pt', color: '#2c3e50', fontWeight: '600', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left', textTransform: 'none' },
        mealTitle: { fontSize: '9pt', color: '#333333', fontWeight: '600', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left' },
        mealNumbering: { style: 'numbers', prefix: '', suffix: '.' },
        ingredients: { fontSize: '7.5pt', color: '#555555', fontStyle: 'italic', lineHeight: '1.2' },
        separators: { headerEnabled: false, headerStyle: 'solid', headerColor: '#ddd', headerWidth: 1, footerEnabled: true, footerStyle: 'solid', footerColor: '#eee', footerWidth: 1 },
        footer: { text: 'Prepared with care by KitchenPro', fontSize: '8pt', color: '#7f8c8d', textAlign: 'center' },
        background: { image: '', opacity: 1, position: 'center', overlay: '', overlayOpacity: 0 },
        branding: { logo: '', logoPosition: 'top-right', logoWidth: 80, logoHeight: 80 },
        pageBorder: { enabled: false, width: 1, color: '#000000', style: 'solid', radius: 0 },
        backgroundImage: '',
        slotSettings: {
            slot1: { showIngredients: true, showCalories: true, showAllergens: true },
            slot2: { showIngredients: true, showCalories: true, showAllergens: true },
            slot3: { showIngredients: true, showCalories: true, showAllergens: true },
            slot4: { showIngredients: true, showCalories: true, showAllergens: true }
        }
    },

    // 2. MODERN MINIMAL
    {
        id: 'preset_modern',
        nameKey: 'Modern Minimal',
        layout: { marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10, dayBlockSpacing: 8, dayBlockPadding: '12px 15px', columnGap: 12 },
        header: { text: 'This Week\'s Menu', color: '#2c3e50', fontSize: '24pt', fontWeight: '300', fontFamily: 'Arial', textAlign: 'left', textTransform: 'uppercase', lineHeight: '1.1' },
        dateRange: { show: true, fontSize: '8.5pt', color: '#95a5a6', fontWeight: 'normal', textAlign: 'left' },
        dayBlock: { bg: '#f8f9fa', borderRadius: '4px', borderWidth: '0', borderColor: '#000000', borderStyle: 'solid', borderSides: 'none', shadow: 'light', padding: '12px 15px' },
        dayName: { fontSize: '12pt', color: '#1abc9c', fontWeight: 'bold', fontFamily: 'inherit', lineHeight: '1.3', textAlign: 'left', textTransform: 'uppercase' },
        mealTitle: { fontSize: '9.5pt', color: '#2c3e50', fontWeight: '500', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left' },
        mealNumbering: { style: 'bullets', prefix: '', suffix: '' },
        ingredients: { fontSize: '7.5pt', color: '#7f8c8d', fontStyle: 'normal', lineHeight: '1.2' },
        separators: { headerEnabled: false, headerStyle: 'solid', headerColor: '#ddd', headerWidth: 1, footerEnabled: false, footerStyle: 'solid', footerColor: '#eee', footerWidth: 1 },
        footer: { text: '', fontSize: '8pt', color: '#95a5a6', textAlign: 'center' },
        background: { image: '', opacity: 1, position: 'center', overlay: '', overlayOpacity: 0 },
        branding: { logo: '', logoPosition: 'top-right', logoWidth: 60, logoHeight: 60 },
        pageBorder: { enabled: false, width: 1, color: '#000000', style: 'solid', radius: 0 },
        backgroundImage: '',
        slotSettings: {
            slot1: { showIngredients: true, showCalories: false, showAllergens: true },
            slot2: { showIngredients: true, showCalories: false, showAllergens: true },
            slot3: { showIngredients: true, showCalories: false, showAllergens: true },
            slot4: { showIngredients: true, showCalories: false, showAllergens: true }
        }
    },

    // 3. ELEGANT CLASSIC
    {
        id: 'preset_elegant',
        nameKey: 'Elegant Classic',
        layout: { marginTop: 12, marginBottom: 12, marginLeft: 12, marginRight: 12, dayBlockSpacing: 10, dayBlockPadding: '14px 16px', columnGap: 14 },
        header: { text: 'Weekly Menu', color: '#8b4513', fontSize: '22pt', fontWeight: '600', fontFamily: 'Georgia', textAlign: 'center', textTransform: 'capitalize', lineHeight: '1.3' },
        dateRange: { show: true, fontSize: '9pt', color: '#a0522d', fontWeight: 'normal', textAlign: 'center' },
        dayBlock: { bg: '#fffef9', borderRadius: '6px', borderWidth: '1', borderColor: '#d4af37', borderStyle: 'solid', borderSides: 'all', shadow: 'none', padding: '14px 16px' },
        dayName: { fontSize: '11.5pt', color: '#8b4513', fontWeight: '600', fontFamily: 'Georgia', lineHeight: '1.3', textAlign: 'center', textTransform: 'capitalize' },
        mealTitle: { fontSize: '9pt', color: '#654321', fontWeight: '600', fontFamily: 'Georgia', lineHeight: '1.3', textAlign: 'left' },
        mealNumbering: { style: 'roman', prefix: '', suffix: '.' },
        ingredients: { fontSize: '7.5pt', color: '#8b7355', fontStyle: 'italic', lineHeight: '1.3' },
        separators: { headerEnabled: true, headerStyle: 'solid', headerColor: '#d4af37', headerWidth: 2, footerEnabled: true, footerStyle: 'solid', footerColor: '#d4af37', footerWidth: 2 },
        footer: { text: 'Bon Appétit', fontSize: '9pt', color: '#a0522d', textAlign: 'center' },
        background: { image: '', opacity: 1, position: 'center', overlay: '', overlayOpacity: 0 },
        branding: { logo: '', logoPosition: 'top-center', logoWidth: 100, logoHeight: 100 },
        pageBorder: { enabled: true, width: 2, color: '#d4af37', style: 'double', radius: 0 },
        backgroundImage: '',
        slotSettings: {
            slot1: { showIngredients: true, showCalories: true, showAllergens: true },
            slot2: { showIngredients: true, showCalories: true, showAllergens: true },
            slot3: { showIngredients: true, showCalories: true, showAllergens: true },
            slot4: { showIngredients: true, showCalories: true, showAllergens: true }
        }
    },

    // 4. BOLD & BRIGHT
    {
        id: 'preset_bold',
        nameKey: 'Bold & Bright',
        layout: { marginTop: 8, marginBottom: 8, marginLeft: 8, marginRight: 8, dayBlockSpacing: 7, dayBlockPadding: '12px 14px', columnGap: 10 },
        header: { text: 'WEEKLY MENU', color: '#e74c3c', fontSize: '26pt', fontWeight: 'bold', fontFamily: 'Arial', textAlign: 'center', textTransform: 'uppercase', lineHeight: '1.0' },
        dateRange: { show: true, fontSize: '9pt', color: '#34495e', fontWeight: '600', textAlign: 'center' },
        dayBlock: { bg: '#ffffff', borderRadius: '10px', borderWidth: '3', borderColor: '#3498db', borderStyle: 'solid', borderSides: 'left', shadow: 'medium', padding: '12px 14px' },
        dayName: { fontSize: '12pt', color: '#e74c3c', fontWeight: 'bold', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left', textTransform: 'uppercase' },
        mealTitle: { fontSize: '9.5pt', color: '#2c3e50', fontWeight: 'bold', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left' },
        mealNumbering: { style: 'numbers', prefix: '#', suffix: '' },
        ingredients: { fontSize: '7.5pt', color: '#7f8c8d', fontStyle: 'normal', lineHeight: '1.2' },
        separators: { headerEnabled: true, headerStyle: 'solid', headerColor: '#3498db', headerWidth: 3, footerEnabled: true, footerStyle: 'solid', footerColor: '#3498db', footerWidth: 3 },
        footer: { text: 'Stay Healthy & Happy! 🍽️', fontSize: '8.5pt', color: '#e74c3c', textAlign: 'center' },
        background: { image: '', opacity: 1, position: 'center', overlay: '', overlayOpacity: 0 },
        branding: { logo: '', logoPosition: 'top-left', logoWidth: 70, logoHeight: 70 },
        pageBorder: { enabled: false, width: 1, color: '#000000', style: 'solid', radius: 0 },
        backgroundImage: '',
        slotSettings: {
            slot1: { showIngredients: true, showCalories: true, showAllergens: true },
            slot2: { showIngredients: true, showCalories: true, showAllergens: true },
            slot3: { showIngredients: false, showCalories: true, showAllergens: true },
            slot4: { showIngredients: false, showCalories: true, showAllergens: true }
        }
    },

    // 5. CLEAN PROFESSIONAL
    {
        id: 'preset_professional',
        nameKey: 'Clean Professional',
        layout: { marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10, dayBlockSpacing: 5, dayBlockPadding: '10px 12px', columnGap: 8 },
        header: { text: 'Menu Plan', color: '#34495e', fontSize: '20pt', fontWeight: '600', fontFamily: 'Arial', textAlign: 'left', textTransform: 'none', lineHeight: '1.2' },
        dateRange: { show: true, fontSize: '8.5pt', color: '#7f8c8d', fontWeight: 'normal', textAlign: 'left' },
        dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '1', borderColor: '#bdc3c7', borderStyle: 'solid', borderSides: 'top-bottom', shadow: 'none', padding: '10px 12px' },
        dayName: { fontSize: '11pt', color: '#2c3e50', fontWeight: '600', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left', textTransform: 'none' },
        mealTitle: { fontSize: '9pt', color: '#34495e', fontWeight: '600', fontFamily: 'inherit', lineHeight: '1.2', textAlign: 'left' },
        mealNumbering: { style: 'letters', prefix: '', suffix: ')' },
        ingredients: { fontSize: '7.5pt', color: '#95a5a6', fontStyle: 'normal', lineHeight: '1.2' },
        separators: { headerEnabled: false, headerStyle: 'solid', headerColor: '#ddd', headerWidth: 1, footerEnabled: true, footerStyle: 'dashed', footerColor: '#bdc3c7', footerWidth: 1 },
        footer: { text: 'Nutrition information available upon request', fontSize: '7.5pt', color: '#95a5a6', textAlign: 'right' },
        background: { image: '', opacity: 1, position: 'center', overlay: '', overlayOpacity: 0 },
        branding: { logo: '', logoPosition: 'top-left', logoWidth: 50, logoHeight: 50 },
        pageBorder: { enabled: false, width: 1, color: '#000000', style: 'solid', radius: 0 },
        backgroundImage: '',
        slotSettings: {
            slot1: { showIngredients: true, showCalories: true, showAllergens: true },
            slot2: { showIngredients: true, showCalories: true, showAllergens: true },
            slot3: { showIngredients: true, showCalories: true, showAllergens: true },
            slot4: { showIngredients: true, showCalories: true, showAllergens: true }
        }
    },

    // 6. VINTAGE NEWSPAPER
    {
        id: 'preset_vintage',
        nameKey: 'Vintage Newspaper',
        layout: { marginTop: 15, marginBottom: 15, marginLeft: 15, marginRight: 15, dayBlockSpacing: 8, dayBlockPadding: '12px 14px', columnGap: 12 },
        header: { text: 'The Weekly Menu', color: '#2c2c2c', fontSize: '28pt', fontWeight: 'bold', fontFamily: 'Times New Roman', textAlign: 'center', textTransform: 'capitalize', lineHeight: '1.1' },
        dateRange: { show: true, fontSize: '9pt', color: '#5a5a5a', fontWeight: 'normal', textAlign: 'center' },
        dayBlock: { bg: '#faf8f3', borderRadius: '0px', borderWidth: '2', borderColor: '#8b8b8b', borderStyle: 'double', borderSides: 'all', shadow: 'none', padding: '12px 14px' },
        dayName: { fontSize: '12pt', color: '#2c2c2c', fontWeight: 'bold', fontFamily: 'Times New Roman', lineHeight: '1.3', textAlign: 'center', textTransform: 'uppercase' },
        mealTitle: { fontSize: '9.5pt', color: '#3c3c3c', fontWeight: '600', fontFamily: 'Times New Roman', lineHeight: '1.3', textAlign: 'left' },
        mealNumbering: { style: 'numbers', prefix: '', suffix: '.' },
        ingredients: { fontSize: '8pt', color: '#6a6a6a', fontStyle: 'italic', lineHeight: '1.3' },
        separators: { headerEnabled: true, headerStyle: 'double', headerColor: '#8b8b8b', headerWidth: 2, footerEnabled: true, footerStyle: 'double', footerColor: '#8b8b8b', footerWidth: 2 },
        footer: { text: 'Established 2024 • Family Recipes', fontSize: '8.5pt', color: '#5a5a5a', textAlign: 'center' },
        background: { image: '', opacity: 1, position: 'center', overlay: '#f5f5dc', overlayOpacity: 0.3 },
        branding: { logo: '', logoPosition: 'top-center', logoWidth: 80, logoHeight: 80 },
        pageBorder: { enabled: true, width: 3, color: '#2c2c2c', style: 'double', radius: 0 },
        backgroundImage: '',
        slotSettings: {
            slot1: { showIngredients: true, showCalories: false, showAllergens: true },
            slot2: { showIngredients: true, showCalories: false, showAllergens: true },
            slot3: { showIngredients: true, showCalories: false, showAllergens: true },
            slot4: { showIngredients: true, showCalories: false, showAllergens: true }
        }
    }
];

console.log('✅ DMS Presets loaded:', window.DMSPresets.length, 'templates');
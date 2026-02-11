// Translations and Internationalization (Global Scope)

(function(window) {
    const translations = {
        en: {
            nav_recipes: 'Recipes',
            nav_ingredients: 'Ingredients',
            nav_allergens: 'Allergens',
            nav_menu: 'Menu Planning',
            nav_settings: 'Settings',
            nav_template_builder: 'Template Builder',
            btn_add_recipe: '+ Add Recipe',
            btn_add_ingredient: '+ Add Ingredient',
            btn_add_allergen: '+ Add Allergen',
            btn_save_menu: 'Save Menu',
            btn_previous: '← Previous',
            btn_next: 'Next →',
            btn_print: '🖨️ Print',
            btn_save_template: 'Save Template',
            btn_edit: 'Edit',
            btn_delete: 'Delete',
            btn_add: 'Add',
            btn_cancel: 'Cancel',
            btn_save: 'Save',
            btn_reset: 'Reset',
            btn_save_settings: 'Save Settings',
            btn_load: 'Load',
            btn_export: 'Export',
            btn_import: 'Import',
            btn_week_view: '📅 Week View',
            btn_month_view: '📆 Month View',
            btn_populate_allergens: '↻ Reset Default Allergens',
            btn_customize: '📝 Template Builder',
            modal_add_recipe: 'Add Recipe',
            modal_edit_recipe: 'Edit Recipe',
            modal_add_ingredient: 'Add Ingredient',
            modal_edit_ingredient: 'Edit Ingredient',
            modal_add_allergen: 'Add Allergen',
            modal_edit_allergen: 'Edit Allergen',
            label_recipe_name: 'Recipe Name',
            label_category: 'Category',
            label_portion_size: 'Portion Size',
            label_ingredients: 'Ingredients',
            label_allergens: 'Allergens',
            label_instructions: 'Instructions (optional)',
            label_ingredient_name: 'Ingredient Name',
            label_allergen_name: 'Allergen Name',
            label_color: 'Color',
            label_auto_allergens: 'Auto-detected Allergens',
            label_manual_allergens: 'Additional Allergens',
            label_linked_allergens: 'Linked Allergens',
            label_print_date: 'Print Week of:',
            label_print_days: 'Print Days:',
            label_menu_for: 'Menu for:',
            label_contains: 'Contains',
            label_app_theme: 'App Theme:',
            text_print_hint: '💡 Select days to print.',
            category_select: 'Select category',
            category_soup: '🥣 Soup',
            category_main: '🍽️ Main',
            category_dessert: '🍰 Dessert',
            category_other: '➕ Other',
            filter_all_categories: 'All Categories',
            filter_search_placeholder: 'Search recipes...',
            table_actions: 'Actions',
            empty_recipes: 'No recipes found.',
            empty_ingredients: 'No ingredients found.',
            empty_allergens: 'No allergens found.',
            empty_menus: 'No saved menus yet.',
            empty_day: 'No meals planned',
            alert_delete_recipe: 'Delete this recipe?',
            alert_delete_ingredient: 'Delete this ingredient?',
            alert_delete_allergen: 'Delete this allergen?',
            alert_delete_menu: 'Delete this saved menu?',
            alert_menu_saved: 'Menu saved successfully!',
            alert_menu_loaded: 'Menu loaded!',
            alert_data_saved: 'Data saved to files!',
            alert_data_loaded: 'Data loaded from folder!',
            alert_select_folder: 'Please select a save location first',
            alert_import_success: 'Data imported successfully!',
            alert_import_error: 'Error importing data: ',
            alert_file_api_unsupported: 'File System Access not supported. Use Export/Import.',
            alert_select_days: 'Please select at least one day to print',
            alert_no_print_data: 'No meals found for this week!',
            heading_past_menus: 'Past Menus',
            builder_page_settings: '1. Page Settings',
            builder_default_font: 'Default Font',
            builder_page_bg: 'Page Background',
            builder_bg_image: 'Background Image',
            builder_day_cards: '2. Day Cards',
            builder_header_bg: 'Header Background',
            builder_header_text: 'Header Text Color',
            builder_card_bg: 'Card Background',
            builder_border_color: 'Border Color',
            builder_border_width: 'Border Width',
            builder_menu_items: '3. Menu Items',
            builder_slot1: 'Slot 1 (Soup)',
            builder_slot2: 'Slot 2 (Main)',
            builder_slot3: 'Slot 3 (Dessert)',
            builder_slot4: 'Slot 4 (Other)',
            builder_font: 'Font',
            builder_preview_title: 'MENU PREVIEW',
            day_sun_short: 'Sun',
            day_mon_short: 'Mon',
            day_tue_short: 'Tue',
            day_wed_short: 'Wed',
            day_thu_short: 'Thu',
            day_fri_short: 'Fri',
            day_sat_short: 'Sat',
            sync_connected: '🟢 Synced',
            sync_disconnected: '🟡 Local',
            sync_error: '🔴 Error',
            sync_status_label: 'Status:',
            sync_select_location: '📁 Select Save Location',
            sync_save: '💾 Save Changes',
            sync_load: '📂 Load from Folder',
            sync_export: '⬇ Export JSON',
            sync_import: '⬆ Import JSON',
            slot_soup: '🥣 Soup',
            slot_main: '🍽️ Main',
            slot_dessert: '🍰 Dessert',
            slot_other: '➕ Other',
            select_ingredient: 'Select ingredient',
            select_allergen: 'Select allergen',
            select_recipe: 'Select recipe',
            alert_template_saved: 'Template saved!'
        },
        bg: {
            nav_recipes: 'Рецепти',
            nav_ingredients: 'Съставки',
            nav_allergens: 'Алергени',
            nav_menu: 'Планиране на Меню',
            nav_settings: 'Настройки',
            nav_template_builder: 'Дизайн на Шаблон',
            btn_add_recipe: '+ Добави Рецепта',
            btn_add_ingredient: '+ Добави Съставка',
            btn_add_allergen: '+ Добави Алерген',
            btn_save_menu: 'Запази Меню',
            btn_previous: '← Предишен',
            btn_next: 'Следващ →',
            btn_print: '🖨️ Печат',
            btn_save_template: 'Запази Шаблон',
            btn_edit: 'Редакция',
            btn_delete: 'Изтрий',
            btn_add: 'Добави',
            btn_cancel: 'Отказ',
            btn_save: 'Запази',
            btn_reset: 'Нулирай',
            btn_save_settings: 'Запази Настройки',
            btn_load: 'Зареди',
            btn_export: 'Експорт',
            btn_import: 'Импорт',
            btn_week_view: '📅 Седмичен Изглед',
            btn_month_view: '📆 Месечен Изглед',
            btn_populate_allergens: '↻ Възстанови Алергени',
            btn_customize: '📝 Дизайн на Шаблон',
            modal_add_recipe: 'Добави Рецепта',
            modal_edit_recipe: 'Редактирай Рецепта',
            modal_add_ingredient: 'Добави Съставка',
            modal_edit_ingredient: 'Редактирай Съставка',
            modal_add_allergen: 'Добави Алерген',
            modal_edit_allergen: 'Редактирай Алерген',
            label_recipe_name: 'Име на Рецепта',
            label_category: 'Категория',
            label_portion_size: 'Грамаж',
            label_ingredients: 'Съставки',
            label_allergens: 'Алергени',
            label_instructions: 'Инструкции (опция)',
            label_ingredient_name: 'Име на Съставка',
            label_allergen_name: 'Име на Алерген',
            label_color: 'Цвят',
            label_auto_allergens: 'Авто-алергени',
            label_manual_allergens: 'Допълнителни Алергени',
            label_linked_allergens: 'Съдържа Алергени',
            label_print_date: 'Седмица от:',
            label_print_days: 'Дни за печат:',
            label_menu_for: 'Меню за:',
            label_contains: 'Съдържа',
            label_app_theme: 'Тема на приложението:',
            text_print_hint: '💡 Изберете дни за печат.',
            category_select: 'Избери категория',
            category_soup: '🥣 Супа',
            category_main: '🍽️ Основно',
            category_dessert: '🍰 Десерт',
            category_other: '➕ Друго',
            filter_all_categories: 'Всички Категории',
            filter_search_placeholder: 'Търси рецепти...',
            table_actions: 'Действия',
            empty_recipes: 'Няма намерени рецепти.',
            empty_ingredients: 'Няма намерени съставки.',
            empty_allergens: 'Няма намерени алергени.',
            empty_menus: 'Няма запазени менюта.',
            empty_day: 'Няма планирани ядения',
            alert_delete_recipe: 'Изтриване на тази рецепта?',
            alert_delete_ingredient: 'Изтриване на тази съставка?',
            alert_delete_allergen: 'Изтриване на този алерген?',
            alert_delete_menu: 'Изтриване на това запазено меню?',
            alert_menu_saved: 'Менюто е запазено успешно!',
            alert_menu_loaded: 'Менюто е заредено!',
            alert_data_saved: 'Данните са запазени във файл!',
            alert_data_loaded: 'Данните са заредени!',
            alert_select_folder: 'Моля, изберете папка за запис',
            alert_import_success: 'Данните са импортирани успешно!',
            alert_import_error: 'Грешка при импорт: ',
            alert_file_api_unsupported: 'Браузърът не поддържа директен запис. Използвайте Експорт/Импорт.',
            alert_select_days: 'Моля, изберете поне един ден за печат',
            alert_no_print_data: 'Няма данни за печат за тази седмица!',
            heading_past_menus: 'История на Менюта',
            builder_page_settings: '1. Настройки на Страница',
            builder_default_font: 'Шрифт по подразбиране',
            builder_page_bg: 'Фон на страницата',
            builder_bg_image: 'Фоново изображение',
            builder_day_cards: '2. Дни от седмицата',
            builder_header_bg: 'Фон на заглавието',
            builder_header_text: 'Цвят на текста',
            builder_card_bg: 'Фон на картата',
            builder_border_color: 'Цвят на рамката',
            builder_border_width: 'Дебелина на рамката',
            builder_menu_items: '3. Елементи от менюто',
            builder_slot1: 'Слот 1 (Супа)',
            builder_slot2: 'Слот 2 (Основно)',
            builder_slot3: 'Слот 3 (Десерт)',
            builder_slot4: 'Слот 4 (Друго)',
            builder_font: 'Шрифт',
            builder_preview_title: 'ПРЕГЛЕД НА МЕНЮ',
            day_sun_short: 'Нед',
            day_mon_short: 'Пон',
            day_tue_short: 'Вто',
            day_wed_short: 'Сря',
            day_thu_short: 'Чет',
            day_fri_short: 'Пет',
            day_sat_short: 'Съб',
            sync_connected: '🟢 Синхронизиран',
            sync_disconnected: '🟡 Локален',
            sync_error: '🔴 Грешка',
            sync_status_label: 'Статус:',
            sync_select_location: '📁 Избери Папка',
            sync_save: '💾 Запази Промени',
            sync_load: '📂 Зареди от Папка',
            sync_export: '⬇ Експорт JSON',
            sync_import: '⬆ Импорт JSON',
            slot_soup: '🥣 Супа',
            slot_main: '🍽️ Основно',
            slot_dessert: '🍰 Десерт',
            slot_other: '➕ Друго',
            select_ingredient: 'Избери съставка',
            select_allergen: 'Избери алерген',
            select_recipe: 'Избери рецепта',
            alert_template_saved: 'Шаблонът е запазен!'
        }
    };

    // Initialize from appSettings, fallback to 'en'
    let currentLanguage = 'en';

    window.t = function(key) {
        return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key] || key;
    };

    // Update changeLanguage to only save to settings.json
    window.changeLanguage = function(lang, shouldSave = true) {
        console.log('🌍 changeLanguage called:', lang, 'shouldSave:', shouldSave);
        currentLanguage = lang;
        
        // Update the language selector dropdown
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) langSelect.value = lang;
        
        // Apply translations to all elements
        window.applyTranslations();
        
        // Save to settings.json if shouldSave is true
        if (shouldSave) {
            console.log('💾 Attempting to save language. appSettings exists:', !!window.appSettings);
            console.log('💾 saveSettings function exists:', typeof window.saveSettings);
            
            if (window.appSettings) {
                window.appSettings.language = lang;
                console.log('✅ Updated appSettings.language to:', lang);
                
                if (typeof window.saveSettings === 'function') {
                    console.log('📝 Calling saveSettings()...');
                    window.saveSettings();
                } else {
                    console.error('❌ saveSettings function not found!');
                }
            } else {
                console.error('❌ appSettings not found!');
            }
        } else {
            console.log('⏭️ Skipping save (shouldSave = false)');
        }
    };

    window.applyTranslations = function() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = window.t(el.dataset.i18n);
        });
        if(document.querySelector('[data-i18n-placeholder]')) {
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                el.placeholder = window.t(el.dataset.i18nPlaceholder);
            });
        }
    };

    window.getCurrentLanguage = function() {
        return currentLanguage;
    };

    window.setCurrentLanguage = function(lang) {
        currentLanguage = lang;
    };

    // Initialize language from appSettings on load
    window.initLanguage = function() {
        if (window.appSettings && window.appSettings.language) {
            currentLanguage = window.appSettings.language;
        }
    };
})(window);

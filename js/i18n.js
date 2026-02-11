// Translations and Internationalization (Global Scope)

(function(window) {
    const translations = {
        en: {
            // Navigation
            nav_recipes: 'Recipes',
            nav_ingredients: 'Ingredients',
            nav_allergens: 'Allergens',
            nav_menu: 'Menu Planning',
            nav_settings: 'Settings',
            nav_template_builder: 'Template Builder',
            
            // Common Buttons
            btn_add_recipe: '+ Add Recipe',
            btn_add_ingredient: '+ Add Ingredient',
            btn_add_allergen: '+ Add Allergen',
            btn_save_menu: 'Save Menu',
            btn_previous: '← Previous',
            btn_next: 'Next →',
            btn_print: '🖨️ Print Menu',
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
            btn_week_view: '📅 Weekly',
            btn_month_view: '📆 Monthly',
            btn_populate_allergens: '↻ Reset Default Allergens',
            btn_customize: '📝 Template Builder',
            btn_save_as_new: 'Save as New',
            btn_back_to_menu: '← Back to Menu',
            btn_use: 'Use',
            btn_upload_image: '📎 Upload Image',
            btn_change_folder: 'Change Storage Folder',
            btn_save_recipe: 'Save Recipe',
            btn_save_ingredient: 'Save Ingredient',
            btn_save_allergen: 'Save Allergen',
            
            // Modal Titles
            modal_add_recipe: 'Add Recipe',
            modal_edit_recipe: 'Edit Recipe',
            modal_add_ingredient: 'Add Ingredient',
            modal_edit_ingredient: 'Edit Ingredient',
            modal_add_allergen: 'Add Allergen',
            modal_edit_allergen: 'Edit Allergen',
            modal_print_menu: 'Print Menu',
            
            // Form Labels
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
            label_calories: 'Calories (optional)',
            label_title: 'Title',
            label_font_size: 'Font Size',
            label_font_weight: 'Font Weight',
            label_font_style: 'Font Style',
            label_background_color: 'Background Color',
            label_border_radius: 'Border Radius',
            label_border_width: 'Border Width',
            label_border_color: 'Border Color',
            label_border_style: 'Border Style',
            label_text: 'Text',
            label_image_url: 'Image URL (optional)',
            
            // Hints & Messages
            text_print_hint: '💡 Select days to print.',
            text_no_uploads: 'No uploads yet',
            text_my_uploads: '📎 My Uploads:',
            text_ingredients_prefix: 'Ingredients:',
            text_week_of: 'Week of',
            text_select_default: '-- Select --',
            text_recommended_size: 'Recommended:',
            text_image_dimensions: '2480x3508px (A4@300DPI) or 1654x2339px (A4@200DPI)',
            
            // Categories
            category_select: 'Select category',
            category_soup: '🥣 Soup',
            category_main: '🍽️ Main',
            category_dessert: '🍰 Dessert',
            category_other: '➕ Other',
            
            // Filters
            filter_all_categories: 'All Categories',
            filter_search_placeholder: 'Search recipes...',
            
            // Table Headers
            table_actions: 'Actions',
            
            // Empty States
            empty_recipes: 'No recipes found.',
            empty_ingredients: 'No ingredients found.',
            empty_allergens: 'No allergens found.',
            empty_menus: 'No saved menus yet.',
            empty_day: 'No meals planned',
            
            // Alerts & Confirmations
            alert_delete_recipe: 'Delete this recipe?',
            alert_delete_ingredient: 'Delete this ingredient?',
            alert_delete_allergen: 'Delete this allergen?',
            alert_delete_menu: 'Delete this saved menu?',
            alert_delete_template: 'Delete this template?',
            alert_delete_image: 'Delete',
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
            alert_template_saved: 'Template saved!',
            alert_image_uploaded: 'Image uploaded successfully!',
            alert_template_name_prompt: 'Template Name:',
            alert_no_meals_week: 'No meals planned for this week. Please add meals before printing.',
            
            // Headings
            heading_past_menus: 'Past Menus',
            heading_settings: 'Settings',
            heading_data: '💾 Data',
            heading_template_library: '📋 Template Library',
            heading_preset_templates: '🎨 Preset Templates',
            heading_my_templates: '📝 My Templates',
            heading_select_week: '📅 Select Week to Print:',
            heading_select_template: '📝 Select Template:',
            
            // Template Builder Sections
            section_background: '🖼️ Background',
            section_header: '🔝 Header',
            section_day_block: '📅 Day Block Style',
            section_day_name: '📌 Day Name Style',
            section_meal_title: '🍽️ Meal Title Style',
            section_ingredients: '🧂 Ingredients Style',
            section_meal_visibility: '🍲 Meal Visibility',
            section_footer: '🔚 Footer',
            
            // Template Presets
            preset_classic: '🎨 Classic Orange',
            preset_modern: '⚡ Modern Bold',
            preset_minimal: '🌿 Minimal Clean',
            preset_colorful: '🌈 Colorful Fun',
            preset_professional: '💼 Professional',
            preset_double_column: '📋 Double Column',
            preset_compact_grid: '📦 Compact Grid',
            preset_elegant: '✨ Elegant Serif',
            preset_retro: '🕰️ Retro Diner',
            preset_zen: '🧘 Zen Minimal',
            preset_bright_cafe: '☕ Bright Cafe',
            preset_forest: '🌲 Forest Green',
            preset_ocean: '🌊 Ocean Blue',
            preset_luxury: '🦂 Luxury Gold',
            preset_newspaper: '📰 Newspaper Style',
            
            // Template Names
            template_default: 'Default Template',
            template_current: 'Current Active Template',
            template_my_template: 'My Template',
            
            // Font Options
            font_weight_normal: 'Normal',
            font_weight_medium: 'Medium',
            font_weight_semibold: 'Semi-Bold',
            font_weight_bold: 'Bold',
            font_style_normal: 'Normal',
            font_style_italic: 'Italic',
            border_style_solid: 'Solid',
            border_style_dashed: 'Dashed',
            border_style_dotted: 'Dotted',
            border_style_double: 'Double',
            
            // Meal Slots
            slot_soup: '🥣 Soup',
            slot_main: '🍽️ Main',
            slot_dessert: '🍰 Dessert',
            slot_other: '➕ Other',
            slot_1_label: '🥣 Soup (Slot 1)',
            slot_2_label: '🍽️ Main (Slot 2)',
            slot_3_label: '🍰 Dessert (Slot 3)',
            slot_4_label: '➕ Other (Slot 4)',
            
            // Visibility Options
            show_ingredients: 'Show Ingredients',
            show_calories: 'Show Calories',
            show_allergens: 'Highlight Allergens',
            
            // Select Placeholders
            select_ingredient: 'Select ingredient',
            select_allergen: 'Select allergen',
            select_recipe: 'Select recipe',
            
            // Day Names (Short)
            day_sun_short: 'Sun',
            day_mon_short: 'Mon',
            day_tue_short: 'Tue',
            day_wed_short: 'Wed',
            day_thu_short: 'Thu',
            day_fri_short: 'Fri',
            day_sat_short: 'Sat',
            
            // Day Names (Full)
            day_monday: 'Monday',
            day_tuesday: 'Tuesday',
            day_wednesday: 'Wednesday',
            day_thursday: 'Thursday',
            day_friday: 'Friday',
            day_saturday: 'Saturday',
            day_sunday: 'Sunday',
            
            // Splash Screen
            splash_title: 'KitchenPro',
            splash_subtitle: 'Your personal recipe manager & menu planner',
            
            // Sync Status
            sync_connected: '🟢 Synced',
            sync_disconnected: '🟡 Local',
            sync_error: '🔴 Error',
            sync_status_label: 'Status:',
            sync_select_location: '📁 Select Save Location',
            sync_save: '💾 Save Changes',
            sync_load: '📂 Load from Folder',
            sync_export: '⬇ Export JSON',
            sync_import: '⬆ Import JSON'
        },
        bg: {
            // Navigation
            nav_recipes: 'Рецепти',
            nav_ingredients: 'Съставки',
            nav_allergens: 'Алергени',
            nav_menu: 'Планиране на Меню',
            nav_settings: 'Настройки',
            nav_template_builder: 'Дизайн на Шаблон',
            
            // Common Buttons
            btn_add_recipe: '+ Добави Рецепта',
            btn_add_ingredient: '+ Добави Съставка',
            btn_add_allergen: '+ Добави Алерген',
            btn_save_menu: 'Запази Меню',
            btn_previous: '← Предишен',
            btn_next: 'Следващ →',
            btn_print: '🖨️ Печат на Меню',
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
            btn_week_view: '📅 Седмичен',
            btn_month_view: '📆 Месечен',
            btn_populate_allergens: '↻ Възстанови Алергени',
            btn_customize: '📝 Дизайн на Шаблон',
            btn_save_as_new: 'Запази като Нов',
            btn_back_to_menu: '← Обратно към Меню',
            btn_use: 'Използвай',
            btn_upload_image: '📎 Качи Изображение',
            btn_change_folder: 'Смени Папка за Съхранение',
            btn_save_recipe: 'Запази Рецепта',
            btn_save_ingredient: 'Запази Съставка',
            btn_save_allergen: 'Запази Алерген',
            
            // Modal Titles
            modal_add_recipe: 'Добави Рецепта',
            modal_edit_recipe: 'Редактирай Рецепта',
            modal_add_ingredient: 'Добави Съставка',
            modal_edit_ingredient: 'Редактирай Съставка',
            modal_add_allergen: 'Добави Алерген',
            modal_edit_allergen: 'Редактирай Алерген',
            modal_print_menu: 'Печат на Меню',
            
            // Form Labels
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
            label_calories: 'Калории (опция)',
            label_title: 'Заглавие',
            label_font_size: 'Размер на Шрифт',
            label_font_weight: 'Дебелина на Шрифт',
            label_font_style: 'Стил на Шрифт',
            label_background_color: 'Цвят на Фона',
            label_border_radius: 'Закръгляне на Ръбовете',
            label_border_width: 'Дебелина на Рамката',
            label_border_color: 'Цвят на Рамката',
            label_border_style: 'Стил на Рамката',
            label_text: 'Текст',
            label_image_url: 'URL на Изображение (опция)',
            
            // Hints & Messages
            text_print_hint: '💡 Изберете дни за печат.',
            text_no_uploads: 'Няма качени файлове',
            text_my_uploads: '📎 Моите Качвания:',
            text_ingredients_prefix: 'Съставки:',
            text_week_of: 'Седмица от',
            text_select_default: '-- Избери --',
            text_recommended_size: 'Препоръчително:',
            text_image_dimensions: '2480x3508px (A4@300DPI) или 1654x2339px (A4@200DPI)',
            
            // Categories
            category_select: 'Избери категория',
            category_soup: '🥣 Супа',
            category_main: '🍽️ Основно',
            category_dessert: '🍰 Десерт',
            category_other: '➕ Друго',
            
            // Filters
            filter_all_categories: 'Всички Категории',
            filter_search_placeholder: 'Търси рецепти...',
            
            // Table Headers
            table_actions: 'Действия',
            
            // Empty States
            empty_recipes: 'Няма намерени рецепти.',
            empty_ingredients: 'Няма намерени съставки.',
            empty_allergens: 'Няма намерени алергени.',
            empty_menus: 'Няма запазени менюта.',
            empty_day: 'Няма планирани ядения',
            
            // Alerts & Confirmations
            alert_delete_recipe: 'Изтриване на тази рецепта?',
            alert_delete_ingredient: 'Изтриване на тази съставка?',
            alert_delete_allergen: 'Изтриване на този алерген?',
            alert_delete_menu: 'Изтриване на това запазено меню?',
            alert_delete_template: 'Изтриване на този шаблон?',
            alert_delete_image: 'Изтрий',
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
            alert_template_saved: 'Шаблонът е запазен!',
            alert_image_uploaded: 'Изображението е качено успешно!',
            alert_template_name_prompt: 'Име на Шаблон:',
            alert_no_meals_week: 'Няма планирани ядения за тази седмица. Моля, добавете ядения преди печат.',
            
            // Headings
            heading_past_menus: 'История на Менюта',
            heading_settings: 'Настройки',
            heading_data: '💾 Данни',
            heading_template_library: '📋 Библиотека с Шаблони',
            heading_preset_templates: '🎨 Готови Шаблони',
            heading_my_templates: '📝 Моите Шаблони',
            heading_select_week: '📅 Изберете Седмица за Печат:',
            heading_select_template: '📝 Изберете Шаблон:',
            
            // Template Builder Sections
            section_background: '🖼️ Фон',
            section_header: '🔝 Заглавие',
            section_day_block: '📅 Стил на Ден',
            section_day_name: '📌 Стил на Име на Ден',
            section_meal_title: '🍽️ Стил на Заглавие на Ядене',
            section_ingredients: '🧂 Стил на Съставки',
            section_meal_visibility: '🍲 Видимост на Ядения',
            section_footer: '🔚 Долен Колонтитул',
            
            // Template Presets
            preset_classic: '🎨 Класически Оранжев',
            preset_modern: '⚡ Модерен Смел',
            preset_minimal: '🌿 Минималистичен Чист',
            preset_colorful: '🌈 Цветен Забавен',
            preset_professional: '💼 Професионален',
            preset_double_column: '📋 Двойна Колона',
            preset_compact_grid: '📦 Компактна Мрежа',
            preset_elegant: '✨ Елегантен Serif',
            preset_retro: '🕰️ Ретро Ресторант',
            preset_zen: '🧘 Зен Минимал',
            preset_bright_cafe: '☕ Ярко Кафе',
            preset_forest: '🌲 Горски Зелен',
            preset_ocean: '🌊 Океански Син',
            preset_luxury: '🦂 Луксозно Злато',
            preset_newspaper: '📰 Стил Вестник',
            
            // Template Names
            template_default: 'Шаблон по Подразбиране',
            template_current: 'Текущ Активен Шаблон',
            template_my_template: 'Мой Шаблон',
            
            // Font Options
            font_weight_normal: 'Нормален',
            font_weight_medium: 'Среден',
            font_weight_semibold: 'Полу-Удебелен',
            font_weight_bold: 'Удебелен',
            font_style_normal: 'Нормален',
            font_style_italic: 'Курсив',
            border_style_solid: 'Плътна',
            border_style_dashed: 'Прекъсната',
            border_style_dotted: 'Точкирана',
            border_style_double: 'Двойна',
            
            // Meal Slots
            slot_soup: '🥣 Супа',
            slot_main: '🍽️ Основно',
            slot_dessert: '🍰 Десерт',
            slot_other: '➕ Друго',
            slot_1_label: '🥣 Супа (Слот 1)',
            slot_2_label: '🍽️ Основно (Слот 2)',
            slot_3_label: '🍰 Десерт (Слот 3)',
            slot_4_label: '➕ Друго (Слот 4)',
            
            // Visibility Options
            show_ingredients: 'Покажи Съставки',
            show_calories: 'Покажи Калории',
            show_allergens: 'Маркирай Алергени',
            
            // Select Placeholders
            select_ingredient: 'Избери съставка',
            select_allergen: 'Избери алерген',
            select_recipe: 'Избери рецепта',
            
            // Day Names (Short)
            day_sun_short: 'Нед',
            day_mon_short: 'Пон',
            day_tue_short: 'Вто',
            day_wed_short: 'Сря',
            day_thu_short: 'Чет',
            day_fri_short: 'Пет',
            day_sat_short: 'Съб',
            
            // Day Names (Full)
            day_monday: 'Понеделник',
            day_tuesday: 'Вторник',
            day_wednesday: 'Сряда',
            day_thursday: 'Четвъртък',
            day_friday: 'Петък',
            day_saturday: 'Събота',
            day_sunday: 'Неделя',
            
            // Splash Screen
            splash_title: 'KitchenPro',
            splash_subtitle: 'Вашият личен мениджър на рецепти и планиране на меню',
            
            // Sync Status
            sync_connected: '🟢 Синхронизиран',
            sync_disconnected: '🟡 Локален',
            sync_error: '🔴 Грешка',
            sync_status_label: 'Статус:',
            sync_select_location: '📁 Избери Папка',
            sync_save: '💾 Запази Промени',
            sync_load: '📂 Зареди от Папка',
            sync_export: '⬇ Експорт JSON',
            sync_import: '⬆ Импорт JSON'
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

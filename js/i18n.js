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
            btn_export_backup: '💾 Export Data (Backup)',
            btn_import_data: '📂 Import Data',
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
            btn_open_archive: 'Open Archive Folder',
            
            // Template Builder Tabs
            tab_builder: '🔧 Builder',
            tab_templates: '📋 Templates',
            tab_images: '🖼️ Images',
            
            // Template Builder Buttons
            btn_load_menu_data: '👁️ Load My Menu Data',
            btn_reset_default: '🔄 Reset to Default',
            btn_upload: '📄 Upload',
            btn_library: '🖼️ Library',
            btn_remove: '🗑️',
            btn_close: 'Close',
            
            // Template Builder Sections
            builder_title: '🎨 Menu Template Builder',
            builder_subtitle: 'Click each step to customize',
            section_background: '🌏 1. Background',
            section_header: '📌 2. Header',
            section_menu: '🍽️ 3. Weekly Menu',
            section_footer: '📍 4. Footer',
            
            // Background Controls
            label_background_color: 'Background Color',
            label_background_info: '🇺🇫 5 Image Layers + Background',
            label_background_desc: 'Position 5 images anywhere with precise size control!',
            label_image_layer: '🖼️ Image Layer',
            label_position: 'Position',
            label_size: 'Size (% of page width)',
            label_opacity: 'Opacity',
            label_layer: 'Layer (Z-Index)',
            
            // Position Options
            pos_center: 'Center (full page)',
            pos_top_left: 'Top Left',
            pos_top_center: 'Top Center',
            pos_top_right: 'Top Right',
            pos_center_left: 'Center Left',
            pos_center_right: 'Center Right',
            pos_bottom_left: 'Bottom Left',
            pos_bottom_center: 'Bottom Center',
            pos_bottom_right: 'Bottom Right',
            
            // Layer Options
            layer_back: '1 - Back',
            layer_2: '2',
            layer_3: '3',
            layer_4: '4',
            layer_front: '5 - Front',
            
            // Header Controls
            label_show_header: 'Show Header',
            label_header_text: 'Header Text',
            label_text_alignment: 'Text Alignment',
            label_font_size_a4: 'Font Size (A4 optimized)',
            label_text_color: 'Text Color',
            
            // Alignment Options
            align_left: 'Left',
            align_center: 'Center',
            align_right: 'Right',
            
            // Font Size Options (Header)
            size_14pt: '14pt - Minimal',
            size_16pt: '16pt - Small',
            size_18pt: '18pt - Medium',
            size_20pt: '20pt - Large',
            size_22pt: '22pt - Extra Large',
            size_24pt: '24pt - Maximum',
            
            // Menu Controls
            label_template_style: '🎨 Template Style',
            style_compact: 'Compact',
            style_compact_desc: 'All info on one line',
            style_detailed: 'Detailed',
            style_detailed_desc: 'Ingredients on separate line',
            style_detailed_2col: 'Detailed (2 Columns)',
            style_detailed_2col_desc: 'Side-by-side layout',
            label_menu_content: '✅ Menu Content:',
            menu_content_desc: 'Date range, ingredients, portions, and calories are always included in your menu.',
            
            label_day_block: '📊 Day Block',
            label_show_border: 'Show Border',
            label_border_color: 'Border Color',
            label_border_style: 'Border Style',
            label_border_thickness: 'Border Thickness',
            label_background: 'Background',
            
            // Border Style Options
            border_solid: 'Solid ────',
            border_dashed: 'Dashed ─ ─ ─',
            border_dotted: 'Dotted · · · ·',
            border_double: 'Double ════',
            
            // Border Thickness Options
            thickness_1px: '1px - Thin',
            thickness_2px: '2px - Medium',
            thickness_3px: '3px - Thick',
            thickness_4px: '4px - Extra Thick',
            
            label_day_name: '📝 Day Name',
            label_color: 'Color',
            
            // Font Size Options (Day Name)
            size_10pt: '10pt - Small',
            size_11pt: '11pt - Medium Small',
            size_12pt: '12pt - Medium',
            size_13pt: '13pt - Medium Large',
            size_14pt: '14pt - Large',
            
            label_allergens: '⚠️ Allergens',
            label_underline: 'Underline',
            label_bold: 'Bold',
            
            // Footer Controls
            label_show_footer: 'Show Footer',
            label_footer_text: 'Footer Text',
            
            // Font Size Options (Footer)
            size_7pt: '7pt - Minimal',
            size_8pt: '8pt - Small',
            size_9pt: '9pt - Medium',
            size_10pt_footer: '10pt - Large',
            size_11pt: '11pt - Maximum',
            
            // Templates Tab
            templates_title: '📋 Saved Templates',
            templates_subtitle: 'Manage your saved template designs',
            templates_empty: '📂 No saved templates yet',
            templates_empty_desc: 'Go to Builder tab to create and save your first template',
            template_style_label: 'Style:',
            template_header_label: 'Header:',
            template_footer_label: 'Footer:',
            template_yes: 'Yes',
            template_no: 'No',
            
            // Images Tab
            images_title: '🖼️ Image Library',
            images_subtitle: 'Manage your background images',
            images_bg_title: '🌏 Background Images',
            images_empty: '📂 No images uploaded yet',
            images_folder_missing: '📂 No images folder found',
            images_select_folder: 'Please select data folder in Settings first',
            
            // Image Library Dialog
            dialog_image_library: '🖼️ Image Library',
            dialog_image_desc: 'Click image to select, or delete unused images',
            
            // Alerts
            alert_load_real_data: '⚠️ Load real data from menu planner - feature coming soon!',
            alert_template_name: 'Template name:',
            alert_template_saved: '✅ Template saved!',
            alert_template_not_found: '❌ Template not found',
            alert_template_load_confirm: 'Load template "{name}"? This will replace your current settings.',
            alert_template_loaded: '✅ Template loaded!',
            alert_template_delete_confirm: 'Delete template "{name}"?',
            alert_template_deleted: '✅ Template deleted!',
            alert_image_delete_confirm: 'Delete "{name}"?',
            alert_image_deleted: '✅ Image deleted!',
            alert_image_delete_failed: '❌ Failed to delete image',
            alert_reset_confirm: 'Reset all settings?',
            alert_no_images: '📂 No images found in library. Upload some first!',
            alert_image_library_failed: '❌ Failed to load image library',
            alert_select_folder_first: 'Please select a data folder first in Settings.',
            alert_upload_failed: '❌ Upload failed',
            
            // Loading Screen Messages
            loading_detecting: '🔍 Detecting storage method...',
            loading_data: '📂 Loading your data...',
            loading_recipes: '🥘 Loading recipes...',
            loading_ingredients: '🧂 Loading ingredients...',
            loading_ready: '✅ Almost ready...',
            loading_loaded_folder: '✅ Data loaded from folder!',
            loading_loaded_browser: '✅ Data loaded from browser!',
            loading_fresh: '✅ Starting fresh!',
            loading_select_folder: 'Select a folder to store your data',
            loading_last_folder: '📁 Last used:',
            loading_setup: '⌛ Setting up your workspace...',
            loading_complete: '✅ All set!',
            loading_ready_go: '✅ Ready to go!',
            
            // File Info
            file_label: 'File:',
            
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
            label_font_weight: 'Font Weight',
            label_font_style: 'Font Style',
            label_border_radius: 'Border Radius',
            label_border_width: 'Border Width',
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
            alert_image_uploaded: 'Image uploaded successfully!',
            alert_no_meals_week: 'No meals planned for this week. Please add meals before printing.',
            
            // Headings
            heading_past_menus: 'Past Menus',
            heading_settings: 'Settings',
            heading_data: '💾 Data Management',
            heading_template_library: '📋 Template Library',
            heading_preset_templates: '🎨 Preset Templates',
            heading_my_templates: '📝 My Templates',
            heading_select_week: '📅 Select Week to Print:',
            heading_select_template: '📝 Select Template:',
            
            // Settings Page
            settings_storage_title: '💾 Storage Method',
            settings_archive_title: '📁 PDF Archive',
            settings_archive_desc: 'Printed menus are automatically saved to: archive/menus/',
            
            // Template Builder Sections (old)
            section_day_block: '📅 Day Block Style',
            section_day_name: '📌 Day Name Style',
            section_meal_title: '🍽️ Meal Title Style',
            section_ingredients: '🧂 Ingredients Style',
            section_meal_visibility: '🍲 Meal Visibility',
            
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
            
            // Input Placeholders
            placeholder_recipe_name: 'Recipe Name',
            placeholder_ingredient_name: 'Ingredient Name',
            placeholder_allergen_name: 'Allergen Name',
            placeholder_portion_size: 'e.g., 250g',
            placeholder_calories: 'e.g., 220',
            placeholder_instructions: 'Cooking instructions...',
            
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
            btn_export_backup: '💾 Експорт на Данни (Резервно)',
            btn_import_data: '📂 Импорт на Данни',
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
            btn_open_archive: 'Отвори Архивна Папка',
            
            // Template Builder Tabs
            tab_builder: '🔧 Дизайнер',
            tab_templates: '📋 Шаблони',
            tab_images: '🖼️ Изображения',
            
            // Template Builder Buttons
            btn_load_menu_data: '👁️ Зареди Моите Данни',
            btn_reset_default: '🔄 Нулирай',
            btn_upload: '📄 Качи',
            btn_library: '🖼️ Библиотека',
            btn_remove: '🗑️',
            btn_close: 'Затвори',
            
            // Template Builder Sections
            builder_title: '🎨 Дизайнер на Меню Шаблон',
            builder_subtitle: 'Кликнете всяка стъпка за настройка',
            section_background: '🌏 1. Фон',
            section_header: '📌 2. Заглавие',
            section_menu: '🍽️ 3. Седмично Меню',
            section_footer: '📍 4. Долен Колонтитул',
            
            // Background Controls
            label_background_color: 'Цвят на Фона',
            label_background_info: '🇺🇫 5 Слоя Изображения + Фон',
            label_background_desc: 'Поставете 5 изображения навсякъде с прецизен контрол на размера!',
            label_image_layer: '🖼️ Слой Изображение',
            label_position: 'Позиция',
            label_size: 'Размер (% от широчината на страницата)',
            label_opacity: 'Прозрачност',
            label_layer: 'Слой (Z-Index)',
            
            // Position Options
            pos_center: 'Център (цяла страница)',
            pos_top_left: 'Горе Ляво',
            pos_top_center: 'Горе Център',
            pos_top_right: 'Горе Дясно',
            pos_center_left: 'Център Ляво',
            pos_center_right: 'Център Дясно',
            pos_bottom_left: 'Долу Ляво',
            pos_bottom_center: 'Долу Център',
            pos_bottom_right: 'Долу Дясно',
            
            // Layer Options
            layer_back: '1 - Назад',
            layer_2: '2',
            layer_3: '3',
            layer_4: '4',
            layer_front: '5 - Отпред',
            
            // Header Controls
            label_show_header: 'Покажи Заглавие',
            label_header_text: 'Текст на Заглавие',
            label_text_alignment: 'Подравняване на Текст',
            label_font_size_a4: 'Размер на Шрифт (оптимизиран за A4)',
            label_text_color: 'Цвят на Текст',
            
            // Alignment Options
            align_left: 'Ляво',
            align_center: 'Център',
            align_right: 'Дясно',
            
            // Font Size Options (Header)
            size_14pt: '14pt - Минимален',
            size_16pt: '16pt - Малък',
            size_18pt: '18pt - Среден',
            size_20pt: '20pt - Голям',
            size_22pt: '22pt - Много Голям',
            size_24pt: '24pt - Максимален',
            
            // Menu Controls
            label_template_style: '🎨 Стил на Шаблон',
            style_compact: 'Компактен',
            style_compact_desc: 'Всичка информация на един ред',
            style_detailed: 'Детайлен',
            style_detailed_desc: 'Съставки на отделен ред',
            style_detailed_2col: 'Детайлен (2 Колони)',
            style_detailed_2col_desc: 'Оформление една до друга',
            label_menu_content: '✅ Съдържание на Меню:',
            menu_content_desc: 'Датов диапазон, съставки, порции и калории винаги са включени във вашето меню.',
            
            label_day_block: '📊 Блок за Ден',
            label_show_border: 'Покажи Рамка',
            label_border_color: 'Цвят на Рамка',
            label_border_style: 'Стил на Рамка',
            label_border_thickness: 'Дебелина на Рамка',
            label_background: 'Фон',
            
            // Border Style Options
            border_solid: 'Плътна ────',
            border_dashed: 'Прекъсната ─ ─ ─',
            border_dotted: 'Точкирана · · · ·',
            border_double: 'Двойна ════',
            
            // Border Thickness Options
            thickness_1px: '1px - Тънка',
            thickness_2px: '2px - Средна',
            thickness_3px: '3px - Дебела',
            thickness_4px: '4px - Много Дебела',
            
            label_day_name: '📝 Име на Ден',
            label_color: 'Цвят',
            
            // Font Size Options (Day Name)
            size_10pt: '10pt - Малък',
            size_11pt: '11pt - Средно Малък',
            size_12pt: '12pt - Среден',
            size_13pt: '13pt - Средно Голям',
            size_14pt: '14pt - Голям',
            
            label_allergens: '⚠️ Алергени',
            label_underline: 'Подчертан',
            label_bold: 'Удебелен',
            
            // Footer Controls
            label_show_footer: 'Покажи Долен Колонтитул',
            label_footer_text: 'Текст на Долен Колонтитул',
            
            // Font Size Options (Footer)
            size_7pt: '7pt - Минимален',
            size_8pt: '8pt - Малък',
            size_9pt: '9pt - Среден',
            size_10pt_footer: '10pt - Голям',
            size_11pt: '11pt - Максимален',
            
            // Templates Tab
            templates_title: '📋 Запазени Шаблони',
            templates_subtitle: 'Управлявайте запазените дизайни на шаблони',
            templates_empty: '📂 Все още няма запазени шаблони',
            templates_empty_desc: 'Отидете на раздел Дизайнер, за да създадете и запазите първия си шаблон',
            template_style_label: 'Стил:',
            template_header_label: 'Заглавие:',
            template_footer_label: 'Долен колонтитул:',
            template_yes: 'Да',
            template_no: 'Не',
            
            // Images Tab
            images_title: '🖼️ Библиотека с Изображения',
            images_subtitle: 'Управлявайте вашите фонови изображения',
            images_bg_title: '🌏 Фонови Изображения',
            images_empty: '📂 Все още няма качени изображения',
            images_folder_missing: '📂 Не е намерена папка с изображения',
            images_select_folder: 'Моля, първо изберете папка с данни в Настройки',
            
            // Image Library Dialog
            dialog_image_library: '🖼️ Библиотека с Изображения',
            dialog_image_desc: 'Кликнете върху изображение за избор или изтрийте неизползвани изображения',
            
            // Alerts
            alert_load_real_data: '⚠️ Зареждане на реални данни от планиране на меню - функцията идва скоро!',
            alert_template_name: 'Име на шаблон:',
            alert_template_saved: '✅ Шаблонът е запазен!',
            alert_template_not_found: '❌ Шаблонът не е намерен',
            alert_template_load_confirm: 'Зареди шаблон "{name}"? Това ще замени текущите ви настройки.',
            alert_template_loaded: '✅ Шаблонът е зареден!',
            alert_template_delete_confirm: 'Изтрий шаблон "{name}"?',
            alert_template_deleted: '✅ Шаблонът е изтрит!',
            alert_image_delete_confirm: 'Изтрий "{name}"?',
            alert_image_deleted: '✅ Изображението е изтрито!',
            alert_image_delete_failed: '❌ Неуспешно изтриване на изображение',
            alert_reset_confirm: 'Нулиране на всички настройки?',
            alert_no_images: '📂 Не са намерени изображения в библиотеката. Качете първо!',
            alert_image_library_failed: '❌ Неуспешно зареждане на библиотека с изображения',
            alert_select_folder_first: 'Моля, първо изберете папка с данни в Настройки.',
            alert_upload_failed: '❌ Качването е неуспешно',
            
            // Loading Screen Messages
            loading_detecting: '🔍 Откриване на метод за съхранение...',
            loading_data: '📂 Зареждане на вашите данни...',
            loading_recipes: '🥘 Зареждане на рецепти...',
            loading_ingredients: '🧂 Зареждане на съставки...',
            loading_ready: '✅ Почти готово...',
            loading_loaded_folder: '✅ Данните са заредени от папка!',
            loading_loaded_browser: '✅ Данните са заредени от браузър!',
            loading_fresh: '✅ Започваме отначало!',
            loading_select_folder: 'Изберете папка за съхранение на данни',
            loading_last_folder: '📁 Последно използвана:',
            loading_setup: '⌛ Настройка на вашето работно пространство...',
            loading_complete: '✅ Всичко е готово!',
            loading_ready_go: '✅ Готови сме!',
            
            // File Info
            file_label: 'Файл:',
            
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
            label_font_weight: 'Дебелина на Шрифт',
            label_font_style: 'Стил на Шрифт',
            label_border_radius: 'Закръгляне на Ръбовете',
            label_border_width: 'Дебелина на Рамката',
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
            alert_image_uploaded: 'Изображението е качено успешно!',
            alert_no_meals_week: 'Няма планирани ядения за тази седмица. Моля, добавете ядения преди печат.',
            
            // Headings
            heading_past_menus: 'История на Менюта',
            heading_settings: 'Настройки',
            heading_data: '💾 Управление на Данни',
            heading_template_library: '📋 Библиотека с Шаблони',
            heading_preset_templates: '🎨 Готови Шаблони',
            heading_my_templates: '📝 Моите Шаблони',
            heading_select_week: '📅 Изберете Седмица за Печат:',
            heading_select_template: '📝 Изберете Шаблон:',
            
            // Settings Page
            settings_storage_title: '💾 Метод на Съхранение',
            settings_archive_title: '📁 PDF Архив',
            settings_archive_desc: 'Отпечатаните менюта се запазват автоматично в: archive/menus/',
            
            // Template Builder Sections (old)
            section_day_block: '📅 Стил на Ден',
            section_day_name: '📌 Стил на Име на Ден',
            section_meal_title: '🍽️ Стил на Заглавие на Ядене',
            section_ingredients: '🧂 Стил на Съставки',
            section_meal_visibility: '🍲 Видимост на Ядения',
            
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
            
            // Input Placeholders
            placeholder_recipe_name: 'Име на Рецепта',
            placeholder_ingredient_name: 'Име на Съставка',
            placeholder_allergen_name: 'Име на Алерген',
            placeholder_portion_size: 'напр. 250г',
            placeholder_calories: 'напр. 220',
            placeholder_instructions: 'Инструкции за приготвяне...',
            
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

    // Try to load saved language preference from localStorage FIRST (for splash screen)
    let currentLanguage = localStorage.getItem('dms_language_hint') || 'bg';
    console.log('🌍 i18n initialized with language:', currentLanguage);

    window.t = function(key) {
        return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key] || key;
    };

    // Update changeLanguage to save hint to localStorage
    window.changeLanguage = function(lang, shouldSave = true) {
        console.log('🌍 changeLanguage called:', lang, 'shouldSave:', shouldSave);
        currentLanguage = lang;
        
        // Save language hint to localStorage for next page load
        localStorage.setItem('dms_language_hint', lang);
        console.log('💾 Language hint saved to localStorage:', lang);
        
        // Update the language selector dropdown
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) langSelect.value = lang;
        
        // Apply translations to all elements
        window.applyTranslations();
        
        // Re-render dynamic content that uses window.t() at render time
        if (typeof window.updateSelects === 'function') window.updateSelects();
        if (typeof window.renderRecipes === 'function') window.renderRecipes();
        if (typeof window.renderCalendar === 'function') window.renderCalendar(window.currentCalendarDate);
        
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
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = window.t(el.dataset.i18nPlaceholder);
        });
    };

    window.getCurrentLanguage = function() {
        return currentLanguage;
    };

    window.setCurrentLanguage = function(lang) {
        currentLanguage = lang;
        // Also save to localStorage
        localStorage.setItem('dms_language_hint', lang);
    };

    // Initialize language from appSettings on load
    window.initLanguage = function() {
        if (window.appSettings && window.appSettings.language) {
            currentLanguage = window.appSettings.language;
        }
    };
})(window);

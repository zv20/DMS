/**
 * Advanced Template Manager
 * Per-block settings, template library, detailed meal printing, and preset templates
 * Auto-detects days with meals for printing
 * NOW WITH: Combined week selection + template picker in one modal
 * PLUS: More presets including double-column layout & local image uploads
 */

(function(window) {
    let activeTemplateId = null;
    let selectedWeekStart = null; // Track selected week for printing

    const TemplateManager = {
        // Preset Templates (15 total - including double-column and more styles)
        presets: [
            // ORIGINAL 5 PRESETS
            {
                id: 'preset_classic',
                name: '🎨 Classic Orange',
                header: { text: 'Weekly Menu', color: '#fd7e14', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '8px', borderWidth: '2', borderColor: '#e0e0e0', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#2c3e50', fontWeight: '600' },
                mealTitle: { fontSize: '9pt', color: '#333333', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#555555', fontStyle: 'italic' },
                footer: { text: 'Prepared with care by KitchenPro', fontSize: '8pt', color: '#7f8c8d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            {
                id: 'preset_modern',
                name: '⚡ Modern Bold',
                header: { text: 'THIS WEEK', color: '#2c3e50', fontSize: '24pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ecf0f1', borderRadius: '12px', borderWidth: '0', borderColor: '#bdc3c7', borderStyle: 'solid' },
                dayName: { fontSize: '14pt', color: '#e74c3c', fontWeight: 'bold' },
                mealTitle: { fontSize: '10pt', color: '#2c3e50', fontWeight: 'bold' },
                ingredients: { fontSize: '8pt', color: '#7f8c8d', fontStyle: 'normal' },
                footer: { text: '✨ Enjoy your meals!', fontSize: '9pt', color: '#95a5a6' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: true, showAllergens: false }
                }
            },
            {
                id: 'preset_minimal',
                name: '🌿 Minimal Clean',
                header: { text: 'Menu', color: '#27ae60', fontSize: '18pt', fontWeight: 'normal' },
                dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '1', borderColor: '#bdc3c7', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#27ae60', fontWeight: '500' },
                mealTitle: { fontSize: '9pt', color: '#34495e', fontWeight: 'normal' },
                ingredients: { fontSize: '7pt', color: '#7f8c8d', fontStyle: 'italic' },
                footer: { text: '', fontSize: '7pt', color: '#95a5a6' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_colorful',
                name: '🌈 Colorful Fun',
                header: { text: '🍽️ Menu Time!', color: '#9b59b6', fontSize: '22pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fef5e7', borderRadius: '15px', borderWidth: '3', borderColor: '#f39c12', borderStyle: 'dashed' },
                dayName: { fontSize: '13pt', color: '#e67e22', fontWeight: 'bold' },
                mealTitle: { fontSize: '10pt', color: '#8e44ad', fontWeight: '600' },
                ingredients: { fontSize: '8pt', color: '#16a085', fontStyle: 'normal' },
                footer: { text: '🌟 Bon Appétit!', fontSize: '10pt', color: '#e74c3c' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            {
                id: 'preset_professional',
                name: '💼 Professional',
                header: { text: 'Weekly Meal Plan', color: '#1a1a2e', fontSize: '20pt', fontWeight: '600' },
                dayBlock: { bg: '#f8f9fa', borderRadius: '6px', borderWidth: '2', borderColor: '#34495e', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#1a1a2e', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#2c3e50', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#5a6c7d', fontStyle: 'normal' },
                footer: { text: 'Nutritionally Balanced Meals', fontSize: '8pt', color: '#7f8c8d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: true, showAllergens: true }
                }
            },
            
            // NEW 10 PRESETS (including double-column layouts)
            {
                id: 'preset_double_column',
                name: '📋 Double Column',
                isDoubleColumn: true,
                header: { text: 'Weekly Menu', color: '#fd7e14', fontSize: '18pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '6px', borderWidth: '1', borderColor: '#dee2e6', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#2c3e50', fontWeight: 'bold' },
                mealTitle: { fontSize: '8pt', color: '#333333', fontWeight: '600' },
                ingredients: { fontSize: '7pt', color: '#555555', fontStyle: 'italic' },
                footer: { text: 'KitchenPro © 2026', fontSize: '7pt', color: '#7f8c8d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_compact_grid',
                name: '📦 Compact Grid',
                isDoubleColumn: true,
                header: { text: 'Menu at a Glance', color: '#495057', fontSize: '16pt', fontWeight: 'bold' },
                dayBlock: { bg: '#f8f9fa', borderRadius: '4px', borderWidth: '1', borderColor: '#adb5bd', borderStyle: 'solid' },
                dayName: { fontSize: '9pt', color: '#343a40', fontWeight: 'bold' },
                mealTitle: { fontSize: '7.5pt', color: '#495057', fontWeight: '600' },
                ingredients: { fontSize: '6.5pt', color: '#6c757d', fontStyle: 'normal' },
                footer: { text: '', fontSize: '6pt', color: '#868e96' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_elegant',
                name: '✨ Elegant Serif',
                header: { text: 'Culinary Selection', color: '#6c5ce7', fontSize: '22pt', fontWeight: 'normal' },
                dayBlock: { bg: '#fdfcfb', borderRadius: '10px', borderWidth: '2', borderColor: '#a29bfe', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#6c5ce7', fontWeight: '500' },
                mealTitle: { fontSize: '9pt', color: '#5f3dc4', fontWeight: 'normal' },
                ingredients: { fontSize: '7.5pt', color: '#7950f2', fontStyle: 'italic' },
                footer: { text: '♥️ Crafted with Love', fontSize: '8pt', color: '#a29bfe' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_retro',
                name: '🕰️ Retro Diner',
                header: { text: "JOE'S DINER WEEKLY SPECIALS", color: '#e63946', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fff3e0', borderRadius: '8px', borderWidth: '3', borderColor: '#e63946', borderStyle: 'double' },
                dayName: { fontSize: '12pt', color: '#d62828', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#6a040f', fontWeight: 'bold' },
                ingredients: { fontSize: '8pt', color: '#9d0208', fontStyle: 'normal' },
                footer: { text: '🍔 Open 24/7 - Your Favorite Spot Since Forever', fontSize: '8pt', color: '#f77f00' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_zen',
                name: '🧘 Zen Minimal',
                header: { text: 'menu', color: '#2d3436', fontSize: '16pt', fontWeight: 'normal' },
                dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '0', borderColor: 'transparent', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#636e72', fontWeight: 'normal' },
                mealTitle: { fontSize: '8pt', color: '#2d3436', fontWeight: 'normal' },
                ingredients: { fontSize: '7pt', color: '#95a5a6', fontStyle: 'italic' },
                footer: { text: '―', fontSize: '10pt', color: '#dfe6e9' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: false },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: false },
                    slot3: { showIngredients: false, showCalories: false, showAllergens: false },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            },
            {
                id: 'preset_bright_cafe',
                name: '☕ Bright Cafe',
                header: { text: 'Cafe Menu of the Week', color: '#ff9ff3', fontSize: '21pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fff5f7', borderRadius: '12px', borderWidth: '2', borderColor: '#feca57', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#ff6348', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#1e90ff', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#5f27cd', fontStyle: 'normal' },
                footer: { text: '🍰 Fresh Daily - Smile Included!', fontSize: '8pt', color: '#ff9ff3' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_forest',
                name: '🌲 Forest Green',
                header: { text: 'Nature\'s Kitchen', color: '#2d6a4f', fontSize: '20pt', fontWeight: 'bold' },
                dayBlock: { bg: '#f1faee', borderRadius: '10px', borderWidth: '2', borderColor: '#52b788', borderStyle: 'solid' },
                dayName: { fontSize: '11pt', color: '#1b4332', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#2d6a4f', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#40916c', fontStyle: 'italic' },
                footer: { text: '🌱 Farm to Table - Organic & Fresh', fontSize: '8pt', color: '#74c69d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: true, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_ocean',
                name: '🌊 Ocean Blue',
                header: { text: 'Seaside Dining', color: '#023e8a', fontSize: '21pt', fontWeight: 'bold' },
                dayBlock: { bg: '#caf0f8', borderRadius: '8px', borderWidth: '2', borderColor: '#0077b6', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#03045e', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#023e8a', fontWeight: '600' },
                ingredients: { fontSize: '7.5pt', color: '#0096c7', fontStyle: 'italic' },
                footer: { text: '🌊 Fresh Catch Daily', fontSize: '8pt', color: '#00b4d8' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_luxury',
                name: '🥂 Luxury Gold',
                header: { text: 'PRESTIGE MENU', color: '#c9920d', fontSize: '22pt', fontWeight: 'bold' },
                dayBlock: { bg: '#fffaf0', borderRadius: '6px', borderWidth: '3', borderColor: '#d4af37', borderStyle: 'solid' },
                dayName: { fontSize: '12pt', color: '#8b6914', fontWeight: 'bold' },
                mealTitle: { fontSize: '9pt', color: '#6b5414', fontWeight: 'bold' },
                ingredients: { fontSize: '7.5pt', color: '#9a7b2f', fontStyle: 'normal' },
                footer: { text: '⭐ Five-Star Excellence', fontSize: '8pt', color: '#c9920d' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot3: { showIngredients: true, showCalories: false, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: true }
                }
            },
            {
                id: 'preset_newspaper',
                name: '📰 Newspaper Style',
                isDoubleColumn: true,
                header: { text: 'THE KITCHEN GAZETTE', color: '#000000', fontSize: '18pt', fontWeight: 'bold' },
                dayBlock: { bg: '#ffffff', borderRadius: '0px', borderWidth: '1', borderColor: '#000000', borderStyle: 'solid' },
                dayName: { fontSize: '10pt', color: '#000000', fontWeight: 'bold' },
                mealTitle: { fontSize: '8pt', color: '#333333', fontWeight: 'bold' },
                ingredients: { fontSize: '7pt', color: '#666666', fontStyle: 'normal' },
                footer: { text: 'Volume 1, Issue 1 - All Rights Reserved', fontSize: '7pt', color: '#000000' },
                backgroundImage: '',
                slotSettings: {
                    slot1: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot2: { showIngredients: true, showCalories: true, showAllergens: true },
                    slot3: { showIngredients: false, showCalories: true, showAllergens: true },
                    slot4: { showIngredients: false, showCalories: false, showAllergens: false }
                }
            }
        ],

        init: function() {
            this.loadActiveTemplate();
            this.bindUI();
            this.bindImageUpload();
            this.renderTemplateLibrary(); // FIXED: Always render library on init
            this.refreshPreview();
        },

        // NEW: Local Image Uploads Storage
        bindImageUpload: function() {
            const bgInput = document.getElementById('backgroundImage');
            if (!bgInput) return;
            
            // Add file upload button next to URL input
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'btn btn-secondary';
            uploadBtn.textContent = '📎 Upload Image';
            uploadBtn.type = 'button';
            uploadBtn.style.marginTop = '10px';
            uploadBtn.style.width = '100%';
            
            uploadBtn.onclick = () => this.uploadBackgroundImage();
            bgInput.parentNode.insertBefore(uploadBtn, bgInput.nextSibling);
            
            // Add uploads gallery
            this.renderUploadsGallery();
        },

        uploadBackgroundImage: function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;
                    const imageName = `upload_${Date.now()}_${file.name}`;
                    
                    // Save to uploads array
                    if (!window.imageUploads) window.imageUploads = [];
                    window.imageUploads.push({
                        id: imageName,
                        name: file.name,
                        data: imageData,
                        timestamp: Date.now()
                    });
                    
                    window.saveSettings(); // Save to settings.json
                    
                    // Apply to current template
                    document.getElementById('backgroundImage').value = imageData;
                    this.refreshPreview();
                    this.renderUploadsGallery();
                    
                    alert(`✅ Image "${file.name}" uploaded successfully!`);
                };
                reader.readAsDataURL(file);
            };
            
            input.click();
        },

        renderUploadsGallery: function() {
            const bgInput = document.getElementById('backgroundImage');
            if (!bgInput) return;
            
            // Remove existing gallery
            const existingGallery = document.getElementById('uploadsGallery');
            if (existingGallery) existingGallery.remove();
            
            // Create new gallery
            const gallery = document.createElement('div');
            gallery.id = 'uploadsGallery';
            gallery.style.cssText = 'margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;';
            
            if (!window.imageUploads || window.imageUploads.length === 0) {
                gallery.innerHTML = '<small style="color: #6c757d;">No uploads yet. Upload one above!</small>';
            } else {
                const header = document.createElement('div');
                header.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 9pt; color: #495057;';
                header.textContent = '📎 My Uploads:';
                gallery.appendChild(header);
                
                window.imageUploads.forEach(img => {
                    const imgCard = document.createElement('div');
                    imgCard.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px; background: white; border-radius: 4px; margin-bottom: 6px; border: 1px solid #dee2e6;';
                    
                    const thumbnail = document.createElement('img');
                    thumbnail.src = img.data;
                    thumbnail.style.cssText = 'width: 40px; height: 40px; object-fit: cover; border-radius: 4px;';
                    
                    const info = document.createElement('div');
                    info.style.flex = '1';
                    info.innerHTML = `<div style="font-size: 8pt; font-weight: 500;">${img.name}</div>`;
                    
                    const useBtn = document.createElement('button');
                    useBtn.className = 'btn btn-small btn-primary';
                    useBtn.textContent = 'Use';
                    useBtn.style.fontSize = '7pt';
                    useBtn.onclick = () => {
                        document.getElementById('backgroundImage').value = img.data;
                        this.refreshPreview();
                    };
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'icon-btn delete';
                    deleteBtn.textContent = '🗑️';
                    deleteBtn.onclick = () => {
                        if (confirm(`Delete "${img.name}"?`)) {
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
                });
            }
            
            bgInput.parentNode.appendChild(gallery);
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
            this.setVal('headerText', 'Weekly Menu');
            this.setVal('headerColor', '#fd7e14');
            this.setVal('headerSize', '20pt');
            this.setVal('headerWeight', 'bold');
            this.setVal('dayBg', '#ffffff');
            this.setVal('dayRadius', 8);
            this.setVal('dayBorderWidth', 2);
            this.setVal('dayBorderColor', '#e0e0e0');
            this.setVal('dayBorderStyle', 'solid');
            this.setVal('dayNameSize', '11pt');
            this.setVal('dayNameColor', '#2c3e50');
            this.setVal('dayNameWeight', '600');
            this.setVal('mealTitleSize', '9pt');
            this.setVal('mealTitleColor', '#333333');
            this.setVal('mealTitleWeight', '600');
            this.setVal('ingredientsSize', '7.5pt');
            this.setVal('ingredientsColor', '#555555');
            this.setVal('ingredientsStyle', 'italic');
            this.setVal('footerSize', '8pt');
            this.setVal('footerColor', '#7f8c8d');
            this.setVal('backgroundImage', '');
            this.setVal('footerText', 'Prepared with care by KitchenPro');
            
            for (let i = 1; i <= 4; i++) {
                this.setChecked(`slot${i}_showIngredients`, true);
                this.setChecked(`slot${i}_showCalories`, true);
                this.setChecked(`slot${i}_showAllergens`, true);
            }
        },

        applyTemplateToUI: function(template) {
            this.setVal('headerText', template.header.text);
            this.setVal('headerColor', template.header.color);
            this.setVal('headerSize', template.header.fontSize);
            this.setVal('headerWeight', template.header.fontWeight || 'bold');
            this.setVal('dayBg', template.dayBlock.bg);
            this.setVal('dayRadius', template.dayBlock.borderRadius.replace('px', ''));
            this.setVal('dayBorderWidth', template.dayBlock.borderWidth || 2);
            this.setVal('dayBorderColor', template.dayBlock.borderColor || '#e0e0e0');
            this.setVal('dayBorderStyle', template.dayBlock.borderStyle || 'solid');
            this.setVal('dayNameSize', template.dayName?.fontSize || '11pt');
            this.setVal('dayNameColor', template.dayName?.color || '#2c3e50');
            this.setVal('dayNameWeight', template.dayName?.fontWeight || '600');
            this.setVal('mealTitleSize', template.mealTitle?.fontSize || '9pt');
            this.setVal('mealTitleColor', template.mealTitle?.color || '#333333');
            this.setVal('mealTitleWeight', template.mealTitle?.fontWeight || '600');
            this.setVal('ingredientsSize', template.ingredients?.fontSize || '7.5pt');
            this.setVal('ingredientsColor', template.ingredients?.color || '#555555');
            this.setVal('ingredientsStyle', template.ingredients?.fontStyle || 'italic');
            this.setVal('footerSize', template.footer?.fontSize || '8pt');
            this.setVal('footerColor', template.footer?.color || '#7f8c8d');
            this.setVal('backgroundImage', template.backgroundImage || '');
            this.setVal('footerText', template.footer.text);
            
            if (template.slotSettings) {
                for (let i = 1; i <= 4; i++) {
                    const slot = template.slotSettings[`slot${i}`];
                    if (slot) {
                        this.setChecked(`slot${i}_showIngredients`, slot.showIngredients);
                        this.setChecked(`slot${i}_showCalories`, slot.showCalories);
                        this.setChecked(`slot${i}_showAllergens`, slot.showAllergens);
                    }
                }
            }
        },

        bindUI: function() {
            const inputs = ['headerText', 'headerColor', 'headerSize', 'headerWeight',
                           'dayBg', 'dayRadius', 'dayBorderWidth', 'dayBorderColor', 'dayBorderStyle',
                           'dayNameSize', 'dayNameColor', 'dayNameWeight',
                           'mealTitleSize', 'mealTitleColor', 'mealTitleWeight',
                           'ingredientsSize', 'ingredientsColor', 'ingredientsStyle',
                           'footerSize', 'footerColor', 'backgroundImage', 'footerText'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.refreshPreview());
            });

            for (let i = 1; i <= 4; i++) {
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
            for (let i = 1; i <= 4; i++) {
                slotSettings[`slot${i}`] = {
                    showIngredients: document.getElementById(`slot${i}_showIngredients`)?.checked || false,
                    showCalories: document.getElementById(`slot${i}_showCalories`)?.checked || false,
                    showAllergens: document.getElementById(`slot${i}_showAllergens`)?.checked || false
                };
            }

            return {
                header: { 
                    text: document.getElementById('headerText')?.value || 'Weekly Menu',
                    color: document.getElementById('headerColor')?.value || '#fd7e14',
                    fontSize: document.getElementById('headerSize')?.value || '20pt',
                    fontWeight: document.getElementById('headerWeight')?.value || 'bold'
                },
                dayBlock: {
                    bg: document.getElementById('dayBg')?.value || '#ffffff',
                    borderRadius: (document.getElementById('dayRadius')?.value || '8') + 'px',
                    borderWidth: document.getElementById('dayBorderWidth')?.value || '2',
                    borderColor: document.getElementById('dayBorderColor')?.value || '#e0e0e0',
                    borderStyle: document.getElementById('dayBorderStyle')?.value || 'solid'
                },
                dayName: {
                    fontSize: document.getElementById('dayNameSize')?.value || '11pt',
                    color: document.getElementById('dayNameColor')?.value || '#2c3e50',
                    fontWeight: document.getElementById('dayNameWeight')?.value || '600'
                },
                mealTitle: {
                    fontSize: document.getElementById('mealTitleSize')?.value || '9pt',
                    color: document.getElementById('mealTitleColor')?.value || '#333333',
                    fontWeight: document.getElementById('mealTitleWeight')?.value || '600'
                },
                ingredients: {
                    fontSize: document.getElementById('ingredientsSize')?.value || '7.5pt',
                    color: document.getElementById('ingredientsColor')?.value || '#555555',
                    fontStyle: document.getElementById('ingredientsStyle')?.value || 'italic'
                },
                footer: {
                    text: document.getElementById('footerText')?.value || '',
                    fontSize: document.getElementById('footerSize')?.value || '8pt',
                    color: document.getElementById('footerColor')?.value || '#7f8c8d'
                },
                backgroundImage: document.getElementById('backgroundImage')?.value || '',
                slotSettings: slotSettings
            };
        },

        refreshPreview: function() {
            const settings = this.getSettingsFromUI();
            
            // Apply background image to preview sheet
            const sheet = document.getElementById('livePreviewSheet');
            if (sheet && settings.backgroundImage) {
                sheet.style.backgroundImage = `url(${settings.backgroundImage})`;
                sheet.style.backgroundSize = 'cover';
                sheet.style.backgroundPosition = 'center';
                sheet.style.backgroundRepeat = 'no-repeat';
            } else if (sheet) {
                sheet.style.backgroundImage = 'none';
            }
            
            // Header - show full 5 days in preview
            const h = document.getElementById('previewHeader');
            const dateRange = this.getDateRangeText(0, 4);
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; text-align:center; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                    <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                `;
            }

            // Days List - preview shows all 5 days
            const list = document.getElementById('previewDaysList');
            if (list) {
                list.innerHTML = '';
                const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
                
                for (let i = 0; i < 5; i++) {
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

            // Footer
            const f = document.getElementById('previewFooter');
            if (f) {
                f.innerHTML = `<div style="border-top:1px solid #eee; padding-top:4px; margin-top:6px; color:${settings.footer.color}; font-size:${settings.footer.fontSize}; text-align:center; line-height:1;">${settings.footer.text}</div>`;
            }
        },

        createDetailedDayBlock: function(dayName, dayMenu, settings, dateStr) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 10px 12px;
                margin-bottom: 6px;
                border: ${settings.dayBlock.borderWidth}px ${settings.dayBlock.borderStyle} ${settings.dayBlock.borderColor};
                page-break-inside: avoid;
            `;

            // Day header
            let contentHtml = `
                <div style="border-bottom:1px solid #d0d0d0; margin-bottom:6px; padding-bottom:3px;">
                    <h2 style="margin:0; font-size:${settings.dayName.fontSize}; color:${settings.dayName.color}; font-weight:${settings.dayName.fontWeight}; line-height:1.2;">${dayName}</h2>
                </div>
            `;

            if (dayMenu) {
                const slots = [
                    { id: 'slot1', type: 'soup', label: window.t('slot_soup') },
                    { id: 'slot2', type: 'main', label: window.t('slot_main') },
                    { id: 'slot3', type: 'dessert', label: window.t('slot_dessert') },
                    { id: 'slot4', type: 'other', label: window.t('slot_other') }
                ];

                slots.forEach((slotConfig, index) => {
                    const slot = dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            contentHtml += this.createMealBlock(recipe, slotConfig, slotSettings, settings, index + 1);
                        }
                    }
                });
            }

            if (!this.hasMeals(dayMenu)) {
                contentHtml += `<p style="color:#aaa; font-style:italic; text-align:center; padding:8px 0; font-size:8pt; margin:0; line-height:1;">${window.t('empty_day') || 'No meals planned'}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, settings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';
            
            let html = `<div style="margin-bottom:5px;">`;
            
            // Title line with portion and calories
            let titleLine = `<div style="font-size:${settings.mealTitle.fontSize}; font-weight:${settings.mealTitle.fontWeight}; color:${settings.mealTitle.color}; margin-bottom:2px; line-height:1.2;">${index}. ${recipe.name}`;
            
            // Add portion size and calories with language-specific units
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
            if (metadata.length) titleLine += ` <span style="font-weight:normal; color:#666; font-size:8pt;">(${metadata.join(', ')})</span>`;
            
            titleLine += `</div>`;
            html += titleLine;

            // Ingredients with red underlined allergens
            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                const recipeAllergens = window.getRecipeAllergens(recipe);
                const allergenIds = new Set(recipeAllergens.map(a => a.id));
                
                const ingredientsList = recipe.ingredients.map(ing => {
                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                    if (!fullIng) return '';
                    
                    const hasAllergen = fullIng.allergens && fullIng.allergens.some(aid => allergenIds.has(aid));
                    
                    if (slotSettings.showAllergens && hasAllergen) {
                        return `<span style="color:#dc3545; text-decoration:underline; font-weight:500;">${fullIng.name}</span>`;
                    }
                    return fullIng.name;
                }).filter(n => n).join(', ');
                
                if (ingredientsList) {
                    html += `<div style="font-size:${settings.ingredients.fontSize}; color:${settings.ingredients.color}; font-style:${settings.ingredients.fontStyle}; margin-top:1px; margin-left:10px; line-height:1.2;"><em>Ingredients:</em> ${ingredientsList}</div>`;
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

        // FIXED: Get all weeks that have meals planned - parse dates in local timezone
        getWeeksWithMeals: function() {
            const weeks = [];
            const dates = Object.keys(window.currentMenu).filter(dateStr => {
                return this.hasMeals(window.currentMenu[dateStr]);
            });

            if (dates.length === 0) return [];

            // Group dates by week
            const weekMap = new Map();
            dates.forEach(dateStr => {
                // FIXED: Parse date in local timezone to avoid Monday bug
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

            // Convert to array and sort by date (latest first)
            weekMap.forEach((value, key) => {
                weeks.push({
                    weekStart: value.weekStart,
                    label: this.getDateRangeText(0, 4, value.weekStart),
                    dateCount: value.dates.length
                });
            });

            // Sort: latest first
            weeks.sort((a, b) => b.weekStart - a.weekStart);
            return weeks;
        },

        renderTemplateLibrary: function() {
            const container = document.getElementById('templateLibrary');
            if (!container) return;
            
            container.innerHTML = '';

            // Preset Templates
            const presetHeader = document.createElement('h4');
            presetHeader.textContent = '🎨 Preset Templates';
            presetHeader.style.cssText = 'margin: 0 0 10px 0; color: #fd7e14; font-size: 11pt;';
            container.appendChild(presetHeader);

            this.presets.forEach(preset => {
                const card = this.createPresetCard(preset);
                container.appendChild(card);
            });

            // Separator
            const separator = document.createElement('div');
            separator.style.cssText = 'height: 1px; background: #ddd; margin: 20px 0;';
            container.appendChild(separator);

            // Default Template
            const customHeader = document.createElement('h4');
            customHeader.textContent = '📝 My Templates';
            customHeader.style.cssText = 'margin: 0 0 10px 0; color: #6c757d; font-size: 11pt;';
            container.appendChild(customHeader);

            const defaultCard = this.createTemplateCard({
                id: 'default',
                name: 'Default Template'
            }, activeTemplateId === 'default');
            container.appendChild(defaultCard);

            // FIXED: Check if savedTemplates exists and has items
            if (window.savedTemplates && window.savedTemplates.length > 0) {
                window.savedTemplates.forEach(tmpl => {
                    const card = this.createTemplateCard(tmpl, activeTemplateId === tmpl.id);
                    container.appendChild(card);
                });
            }
        },

        createPresetCard: function(preset) {
            const card = document.createElement('div');
            const isDoubleColumn = preset.isDoubleColumn || false;
            const badge = isDoubleColumn ? ' <span style="background:#fd7e14; color:white; padding:2px 6px; border-radius:4px; font-size:7pt; font-weight:bold;">2-COL</span>' : '';
            
            card.style.cssText = `
                padding: 8px;
                border: 2px solid #ddd;
                border-radius: 6px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            card.onmouseenter = () => card.style.borderColor = '#fd7e14';
            card.onmouseleave = () => card.style.borderColor = '#ddd';

            const nameSpan = document.createElement('span');
            nameSpan.innerHTML = preset.name + badge;
            nameSpan.style.cssText = 'font-weight: 500; font-size: 9pt; color: #333;';
            
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Use';
            loadBtn.className = 'btn btn-small btn-primary';
            loadBtn.style.height = '28px';
            loadBtn.onclick = (e) => {
                e.stopPropagation();
                this.applyTemplateToUI(preset);
                this.refreshPreview();
            };

            card.appendChild(nameSpan);
            card.appendChild(loadBtn);
            return card;
        },

        createTemplateCard: function(template, isActive) {
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 10px;
                border: 2px solid ${isActive ? '#fd7e14' : '#ddd'};
                border-radius: 6px;
                background: ${isActive ? '#fff5e6' : '#f9f9f9'};
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            `;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = template.name;
            nameSpan.style.fontWeight = isActive ? '600' : '400';
            nameSpan.style.color = isActive ? '#fd7e14' : '#333';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '5px';

            if (!isActive) {
                const loadBtn = document.createElement('button');
                loadBtn.textContent = 'Load';
                loadBtn.className = 'btn btn-small btn-secondary';
                loadBtn.onclick = () => this.loadTemplate(template.id);
                btnContainer.appendChild(loadBtn);
            }

            if (template.id !== 'default') {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.onclick = () => this.deleteTemplate(template.id);
                btnContainer.appendChild(deleteBtn);
            }

            card.appendChild(nameSpan);
            card.appendChild(btnContainer);
            return card;
        },

        loadTemplate: function(id) {
            if (id === 'default') {
                this.applyDefaultSettings();
            } else {
                const tmpl = window.savedTemplates.find(t => t.id === id);
                if (tmpl) this.applyTemplateToUI(tmpl);
            }
            activeTemplateId = id;
            localStorage.setItem('activeTemplateId', id);
            this.renderTemplateLibrary();
            this.refreshPreview();
        },

        deleteTemplate: function(id) {
            if (!confirm('Delete this template?')) return;
            window.savedTemplates = window.savedTemplates.filter(t => t.id !== id);
            if (activeTemplateId === id) {
                this.loadTemplate('default');
            }
            window.saveSettings(); // Save to settings.json file
            this.renderTemplateLibrary();
        }
    };

    // Global Functions
    window.saveCurrentTemplate = function() {
        const name = prompt('Template Name:', 'My Template ' + (window.savedTemplates.length + 1));
        if (!name) return;
        
        const settings = TemplateManager.getSettingsFromUI();
        settings.name = name;
        settings.id = 'tmpl_' + Date.now();
        
        window.savedTemplates.push(settings);
        window.saveSettings(); // Save to settings.json file
        
        activeTemplateId = settings.id;
        localStorage.setItem('activeTemplateId', settings.id);
        TemplateManager.renderTemplateLibrary();
        alert('Template saved!');
    };

    // NEW: Combined Week + Template Selection Modal
    window.openTemplatePicker = function() {
        const modal = document.getElementById('templatePickerModal');
        const grid = document.getElementById('templateGrid');
        if (!modal || !grid) return;
        
        modal.style.display = 'block';
        grid.innerHTML = '';

        // Get weeks with meals
        const weeksWithMeals = TemplateManager.getWeeksWithMeals();
        
        if (weeksWithMeals.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">No weeks with meals found. Please plan some meals first!</p>';
            return;
        }

        // Week Selector Section
        const weekSection = document.createElement('div');
        weekSection.style.cssText = 'margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;';
        
        const weekLabel = document.createElement('label');
        weekLabel.textContent = '📅 Select Week to Print:';
        weekLabel.style.cssText = 'display: block; font-weight: 600; margin-bottom: 10px; font-size: 14pt;';
        
        const weekSelect = document.createElement('select');
        weekSelect.id = 'weekSelector';
        weekSelect.style.cssText = 'width: 100%; padding: 12px; font-size: 12pt; border-radius: 6px; border: 2px solid #dee2e6;';
        
        weeksWithMeals.forEach((week, index) => {
            const option = document.createElement('option');
            option.value = week.weekStart.toISOString().split('T')[0];
            option.textContent = `${week.label} (${week.dateCount} days with meals)`;
            if (index === 0) option.selected = true; // Select latest week by default
            weekSelect.appendChild(option);
        });
        
        weekSection.appendChild(weekLabel);
        weekSection.appendChild(weekSelect);
        grid.appendChild(weekSection);

        // FIXED: Parse selected week in local timezone
        const parts = weekSelect.value.split('-');
        selectedWeekStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        
        weekSelect.addEventListener('change', (e) => {
            const parts = e.target.value.split('-');
            selectedWeekStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        });

        // Template Grid Section
        const templateSection = document.createElement('div');
        const templateLabel = document.createElement('h3');
        templateLabel.textContent = '📝 Select Template:';
        templateLabel.style.cssText = 'margin: 0 0 20px 0; font-size: 14pt;';
        templateSection.appendChild(templateLabel);

        const templateGridContainer = document.createElement('div');
        templateGridContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;';

        const allTemplates = [
            { id: 'current', name: 'Current Active Template' },
            ...window.savedTemplates
        ];

        allTemplates.forEach(t => {
            const card = document.createElement('div');
            card.style.cssText = 'padding:15px; border:2px solid #ddd; border-radius:8px; text-align:center; background:#f9f9f9; cursor:pointer; transition: all 0.2s;';
            card.onmouseenter = () => card.style.borderColor = '#fd7e14';
            card.onmouseleave = () => card.style.borderColor = '#ddd';
            card.innerHTML = `
                <div style="font-size:30pt; margin-bottom:10px;">📝</div>
                <h4 style="margin:0 0 10px 0;">${t.name}</h4>
                <button class="btn btn-primary" onclick="event.stopPropagation(); window.printWithTemplate('${t.id}')" style="width:100%;">🖨️ Print</button>
            `;
            templateGridContainer.appendChild(card);
        });

        templateSection.appendChild(templateGridContainer);
        grid.appendChild(templateSection);
    };

    // Updated print function to use selected week
    window.printWithTemplate = function(id) {
        let settings;
        if (id === 'current') {
            settings = TemplateManager.getSettingsFromUI();
        } else {
            settings = window.savedTemplates.find(t => t.id === id);
        }
        
        if (!settings) {
            alert('Template not found');
            return;
        }

        // Use selectedWeekStart if available, otherwise use current week
        const weekStart = selectedWeekStart || window.getWeekStart(window.currentCalendarDate || new Date());

        const printWindow = window.open('', '_blank');
        const lang = window.getCurrentLanguage();
        const isBulgarian = lang === 'bg';
        
        // AUTO-DETECT: Find days with meals
        let daysHtml = '';
        let daysWithMeals = [];
        
        // Scan all 5 weekdays to find which have meals
        for (let i = 0; i < 5; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            
            if (TemplateManager.hasMeals(dayMenu)) {
                const dayName = day.toLocaleDateString(isBulgarian ? 'bg-BG' : 'en-US', { weekday: 'long' });
                const block = TemplateManager.createDetailedDayBlock(dayName, dayMenu, settings, dateStr);
                daysHtml += block.outerHTML;
                daysWithMeals.push(i);
            }
        }

        // If no meals planned, show message
        if (daysWithMeals.length === 0) {
            alert('No meals planned for this week. Please add meals before printing.');
            printWindow.close();
            return;
        }

        // Calculate date range based on actual days with meals
        const firstDay = daysWithMeals[0];
        const lastDay = daysWithMeals[daysWithMeals.length - 1];
        const dateRange = TemplateManager.getDateRangeText(firstDay, lastDay, weekStart);

        const backgroundStyle = settings.backgroundImage ? `background-image: url(${settings.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat;` : '';

        const html = `
            <html>
            <head>
                <title>Print Menu</title>
                <style>
                    @page { 
                        size: A4;
                        margin: 10mm;
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 0;
                        margin: 0;
                        background: #fff;
                        font-size: 9pt;
                        line-height: 1.2;
                        ${backgroundStyle}
                    }
                    .print-day-block { 
                        page-break-inside: avoid; 
                    }
                    @media print { 
                        body { 
                            padding: 0; 
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; text-align:center; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                ${daysHtml}
                <div style="margin-top:6px; border-top:1px solid #eee; padding-top:4px; text-align:center; color:${settings.footer.color}; font-size:${settings.footer.fontSize}; line-height:1;">${settings.footer.text}</div>
                <script>window.onload = () => { window.print(); };</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        document.getElementById('templatePickerModal').style.display = 'none';
        
        // Reset selected week
        selectedWeekStart = null;
    };

    // Helper function for getting week start (needed for template manager)
    window.getWeekStart = window.getWeekStart || function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('headerText')) {
            TemplateManager.init();
        }
    });

})(window);

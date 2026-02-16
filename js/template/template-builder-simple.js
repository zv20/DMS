/**
 * Simplified Template Builder
 * Clean, practical template customization matching real-world school menu format
 */

class SimpleTemplateBuilder {
    constructor() {
        this.settings = {
            // Content visibility
            showDateRange: true,
            showIngredients: true,
            showCalories: true,
            showPortions: true,
            
            // Styling
            textSize: 'medium', // small, medium, large
            allergenColor: '#ff0000', // Red by default
            dayNameStyle: 'bold', // bold, normal
            
            // Background
            backgroundImage: null, // filename or null
            backgroundColor: '#ffffff',
            backgroundOpacity: 0.8,
            
            // Header
            headerText: 'Седмично меню',
            showHeader: true
        };
        
        this.previewData = null;
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        this.buildUI();
        this.bindControls();
        this.loadPreviewData();
        this.updatePreview();
    }
    
    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        if (!sidebar) return;
        
        sidebar.innerHTML = `
            <div class="simple-template-controls">
                <h2 style="margin: 0 0 20px 0; font-size: 20px;">📝 Template Settings</h2>
                
                <!-- CONTENT SECTION -->
                <div class="control-section">
                    <h3>📜 Content</h3>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="showDateRange" checked>
                        <span>Show Date Range</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="showIngredients" checked>
                        <span>Show Ingredients</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="showCalories" checked>
                        <span>Show Calories (ККАЛ)</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="showPortions" checked>
                        <span>Show Portions (гр, мл)</span>
                    </label>
                </div>
                
                <!-- STYLE SECTION -->
                <div class="control-section">
                    <h3>🎨 Style</h3>
                    
                    <label>Text Size</label>
                    <select id="textSize" class="form-control">
                        <option value="small">Small (10pt)</option>
                        <option value="medium" selected>Medium (12pt)</option>
                        <option value="large">Large (14pt)</option>
                    </select>
                    
                    <label style="margin-top: 15px;">Allergen Highlight Color</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" id="allergenColor" value="#ff0000" style="width: 60px; height: 35px;">
                        <span style="color: #666; font-size: 13px;">Red by default</span>
                    </div>
                    
                    <label style="margin-top: 15px;">Day Name Style</label>
                    <select id="dayNameStyle" class="form-control">
                        <option value="bold" selected>Bold</option>
                        <option value="normal">Normal</option>
                    </select>
                </div>
                
                <!-- BACKGROUND SECTION -->
                <div class="control-section">
                    <h3>🖼️ Background</h3>
                    
                    <label>Background Image</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <input type="file" id="backgroundImageUpload" accept="image/*" style="display: none;">
                        <button id="uploadBackgroundBtn" class="btn btn-secondary" style="flex: 1;">
                            📄 Upload Image
                        </button>
                        <button id="removeBackgroundBtn" class="btn btn-secondary" style="width: 40px;" title="Remove">
                            🗑️
                        </button>
                    </div>
                    
                    <div id="backgroundPreview" style="display: none; margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                        <small style="color: #666;">Current: <span id="backgroundFileName"></span></small>
                    </div>
                    
                    <label>Background Color (if no image)</label>
                    <input type="color" id="backgroundColor" value="#ffffff" style="width: 100%; height: 40px; margin-bottom: 15px;">
                    
                    <label>Background Opacity</label>
                    <input type="range" id="backgroundOpacity" min="0" max="100" value="80" style="width: 100%;">
                    <div style="text-align: center; color: #666; font-size: 13px; margin-top: 5px;">
                        <span id="opacityValue">80</span>%
                    </div>
                </div>
                
                <!-- HEADER SECTION -->
                <div class="control-section">
                    <h3>📌 Header</h3>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="showHeader" checked>
                        <span>Show Header</span>
                    </label>
                    
                    <label style="margin-top: 10px;">Header Text</label>
                    <input type="text" id="headerText" value="Седмично меню" class="form-control" placeholder="Header text">
                </div>
                
                <!-- ACTIONS -->
                <div class="control-section" style="border-top: 2px solid #e0e0e0; padding-top: 20px;">
                    <button id="btnPreview" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                        👁️ Preview My Menu
                    </button>
                    <button id="btnSaveTemplate" class="btn btn-secondary" style="width: 100%; margin-bottom: 10px;">
                        💾 Save Template
                    </button>
                    <button id="btnReset" class="btn btn-secondary" style="width: 100%;">
                        🔄 Reset to Default
                    </button>
                </div>
            </div>
            
            <style>
                .simple-template-controls {
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                }
                
                .control-section {
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .control-section:last-child {
                    border-bottom: none;
                }
                
                .control-section h3 {
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    color: #333;
                }
                
                .control-section label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #555;
                    font-size: 14px;
                }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                    cursor: pointer;
                }
                
                .checkbox-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .checkbox-label span {
                    font-weight: normal;
                }
            </style>
        `;
        
        // Bind events
        this.bindEvents();
    }
    
    bindEvents() {
        // Upload background button
        document.getElementById('uploadBackgroundBtn')?.addEventListener('click', () => {
            document.getElementById('backgroundImageUpload').click();
        });
        
        // File input change
        document.getElementById('backgroundImageUpload')?.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });
        
        // Remove background button
        document.getElementById('removeBackgroundBtn')?.addEventListener('click', () => {
            this.removeBackground();
        });
        
        // Opacity slider
        document.getElementById('backgroundOpacity')?.addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
        });
        
        // Action buttons
        document.getElementById('btnPreview')?.addEventListener('click', () => this.loadPreviewData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click', () => this.reset());
    }
    
    bindControls() {
        // Bind all inputs to settings and trigger preview update
        const inputs = {
            showDateRange: 'checkbox',
            showIngredients: 'checkbox',
            showCalories: 'checkbox',
            showPortions: 'checkbox',
            textSize: 'value',
            allergenColor: 'value',
            dayNameStyle: 'value',
            backgroundColor: 'value',
            backgroundOpacity: 'value',
            showHeader: 'checkbox',
            headerText: 'value'
        };
        
        Object.keys(inputs).forEach(key => {
            const element = document.getElementById(key);
            if (!element) return;
            
            const type = inputs[key];
            
            element.addEventListener(type === 'checkbox' ? 'change' : 'input', () => {
                this.settings[key] = type === 'checkbox' ? element.checked : element.value;
                this.updatePreview();
            });
        });
    }
    
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        try {
            // Save image to data/images/backgrounds/
            const success = await this.saveImageToFolder(file);
            
            if (success) {
                this.settings.backgroundImage = file.name;
                
                // Show preview
                document.getElementById('backgroundPreview').style.display = 'block';
                document.getElementById('backgroundFileName').textContent = file.name;
                
                this.updatePreview();
                alert('✅ Background image uploaded successfully!');
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('❌ Error uploading image. Please try again.');
        }
    }
    
    async saveImageToFolder(file) {
        if (!window.directoryHandle) {
            alert('Please select a data folder first in Settings.');
            return false;
        }
        
        try {
            // Get/create data folder
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: true });
            
            // Get/create images folder
            const imagesDir = await dataDir.getDirectoryHandle('images', { create: true });
            
            // Get/create backgrounds folder
            const backgroundsDir = await imagesDir.getDirectoryHandle('backgrounds', { create: true });
            
            // Create file
            const fileHandle = await backgroundsDir.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            
            console.log('✅ Image saved to data/images/backgrounds/', file.name);
            return true;
        } catch (err) {
            console.error('Error saving image:', err);
            return false;
        }
    }
    
    removeBackground() {
        this.settings.backgroundImage = null;
        document.getElementById('backgroundPreview').style.display = 'none';
        document.getElementById('backgroundImageUpload').value = '';
        this.updatePreview();
    }
    
    loadPreviewData() {
        // Get current week from calendar
        const currentDate = window.currentCalendarDate || new Date();
        const weekDates = this.getWeekDates(currentDate);
        
        const days = [];
        const dayNames = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък'];
        
        // Only Monday-Friday (5 days)
        for (let i = 0; i < 5; i++) {
            const date = weekDates[i];
            const dateStr = date.toISOString().split('T')[0];
            const dayMenu = window.getMenuForDate(dateStr);
            
            const meals = [];
            
            // Get 4 meals from slots
            ['slot1', 'slot2', 'slot3', 'slot4'].forEach((slotId, mealNum) => {
                const slot = dayMenu[slotId];
                const recipe = slot && slot.recipe ? window.recipes.find(r => r.id === slot.recipe) : null;
                
                if (recipe) {
                    // Get ingredients
                    const ingredients = (recipe.ingredients || []).map(ingObj => {
                        const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                        const ing = window.ingredients.find(i => i.id === ingId);
                        return ing ? { name: ing.name, hasAllergen: ing.allergens && ing.allergens.length > 0 } : null;
                    }).filter(Boolean);
                    
                    meals.push({
                        number: mealNum + 1,
                        name: recipe.name,
                        portion: recipe.portionSize || '',
                        calories: recipe.calories || null,
                        ingredients: ingredients
                    });
                }
            });
            
            if (meals.length > 0) {
                days.push({
                    name: dayNames[i],
                    meals: meals
                });
            }
        }
        
        this.previewData = {
            startDate: weekDates[0],
            endDate: weekDates[4],
            days: days
        };
        
        this.updatePreview();
    }
    
    getWeekDates(date) {
        const currentDate = new Date(date);
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        
        const monday = new Date(currentDate.setDate(diff));
        const dates = [];
        
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d);
        }
        
        return dates;
    }
    
    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        
        container.innerHTML = this.renderMenu(this.previewData);
    }
    
    renderMenu(data) {
        const { startDate, endDate, days } = data;
        const s = this.settings;
        
        // Format date range
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')} ${startDate.getFullYear()}г.`;
        
        // Text size mapping
        const sizes = {
            small: { base: '10pt', title: '16pt', day: '12pt' },
            medium: { base: '12pt', title: '20pt', day: '14pt' },
            large: { base: '14pt', title: '24pt', day: '16pt' }
        };
        const size = sizes[s.textSize];
        
        let html = `
            <div class="menu-preview" style="
                background: ${s.backgroundColor};
                ${s.backgroundImage ? `background-image: url('data/images/backgrounds/${s.backgroundImage}');` : ''}
                background-size: cover;
                background-position: center;
                opacity: ${s.backgroundOpacity / 100};
                padding: 20mm;
                min-height: 297mm;
                max-width: 210mm;
                margin: 0 auto;
                font-family: Arial, sans-serif;
                font-size: ${size.base};
                line-height: 1.4;
            ">
        `;
        
        // Header
        if (s.showHeader) {
            html += `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h1 style="
                        margin: 0;
                        font-size: ${size.title};
                        color: #d2691e;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
                    ">${s.headerText}</h1>
                </div>
            `;
        }
        
        // Date range
        if (s.showDateRange) {
            html += `
                <div style="text-align: center; margin-bottom: 20px; font-size: ${size.base};">
                    ${dateRange}
                </div>
            `;
        }
        
        // Days
        days.forEach(day => {
            html += `
                <div style="margin-bottom: 15px;">
                    <div style="
                        font-size: ${size.day};
                        font-weight: ${s.dayNameStyle};
                        margin-bottom: 8px;
                    ">${day.name}</div>
            `;
            
            // Meals
            day.meals.forEach(meal => {
                html += `<div style="margin-bottom: 5px; margin-left: 10px;">`;
                html += `${meal.number}. ${meal.name}`;
                
                if (s.showPortions && meal.portion) {
                    html += ` - ${meal.portion}`;
                }
                
                if (s.showIngredients && meal.ingredients.length > 0) {
                    html += `; `;
                    html += meal.ingredients.map(ing => {
                        if (ing.hasAllergen) {
                            return `<span style="color: ${s.allergenColor}; font-weight: bold;">${ing.name}</span>`;
                        }
                        return ing.name;
                    }).join(', ');
                }
                
                if (s.showCalories && meal.calories) {
                    html += ` ККАЛ ${meal.calories}`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        });
        
        html += `</div>`;
        
        return html;
    }
    
    async saveTemplate() {
        const name = prompt('Template name:');
        if (!name) return;
        
        if (!window.menuTemplates) window.menuTemplates = {};
        
        window.menuTemplates[name] = this.settings;
        
        if (window.storageAdapter) {
            await window.storageAdapter.save('templates', window.menuTemplates);
        }
        
        alert(`✅ Template "${name}" saved!`);
    }
    
    reset() {
        if (!confirm('Reset all settings to default?')) return;
        
        // Reset settings
        this.settings = new SimpleTemplateBuilder().settings;
        
        // Reset UI
        document.getElementById('showDateRange').checked = true;
        document.getElementById('showIngredients').checked = true;
        document.getElementById('showCalories').checked = true;
        document.getElementById('showPortions').checked = true;
        document.getElementById('textSize').value = 'medium';
        document.getElementById('allergenColor').value = '#ff0000';
        document.getElementById('dayNameStyle').value = 'bold';
        document.getElementById('backgroundColor').value = '#ffffff';
        document.getElementById('backgroundOpacity').value = '80';
        document.getElementById('opacityValue').textContent = '80';
        document.getElementById('showHeader').checked = true;
        document.getElementById('headerText').value = 'Седмично меню';
        
        this.removeBackground();
        this.updatePreview();
    }
    
    // Public API for print system
    getSettings() {
        return { ...this.settings };
    }
    
    generatePrintHTML(data) {
        return this.renderMenu(data);
    }
}

// Global instance
window.simpleTemplateBuilder = new SimpleTemplateBuilder();

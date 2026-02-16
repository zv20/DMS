/**
 * Simplified Template Builder with Dual Format Support
 * Clean, practical template customization with two style options
 */

class SimpleTemplateBuilder {
    constructor() {
        this.settings = {
            // Template Style
            templateStyle: 'compact', // 'compact' or 'detailed'
            
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
            backgroundOpacity: 1.0,
            
            // Header
            headerText: 'Седмично меню',
            showHeader: true,
            
            // Footer
            footerText: 'Prepared with care by KitchenPro',
            showFooter: true,
            footerAlignment: 'center', // left, center, right
            footerSize: 'small' // small, medium
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
        console.log('🚀 SimpleTemplateBuilder: Setting up...');
        this.buildUI();
        this.bindControls();
        
        // Load sample data first, then try to load real data
        this.loadSampleData();
        this.updatePreview();
        
        // Try loading real data after a delay
        setTimeout(() => {
            if (window.recipes && window.ingredients) {
                console.log('👀 Real data available, can load it manually');
            }
        }, 1000);
    }
    
    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        if (!sidebar) {
            console.error('❌ template-sidebar not found!');
            return;
        }
        
        sidebar.innerHTML = `
            <div class="simple-template-controls">
                <h2 style="margin: 0 0 20px 0; font-size: 20px;">📝 Template Settings</h2>
                
                <!-- TEMPLATE STYLE SELECTOR -->
                <div class="control-section" style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                    <h3>🎨 Template Style</h3>
                    
                    <label class="radio-label">
                        <input type="radio" name="templateStyle" value="compact" checked>
                        <div>
                            <strong>Compact (Bulgarian School)</strong>
                            <div style="font-size: 11px; color: #666; margin-top: 3px;">Everything on one line, allergens in red</div>
                        </div>
                    </label>
                    
                    <label class="radio-label">
                        <input type="radio" name="templateStyle" value="detailed">
                        <div>
                            <strong>Detailed (With Labels)</strong>
                            <div style="font-size: 11px; color: #666; margin-top: 3px;">Ingredients on separate line with "Съставки:"</div>
                        </div>
                    </label>
                </div>
                
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
                    
                    <label>Background Color</label>
                    <input type="color" id="backgroundColor" value="#ffffff" style="width: 100%; height: 40px; margin-bottom: 15px;">
                    
                    <label>Background Opacity</label>
                    <input type="range" id="backgroundOpacity" min="0" max="100" value="100" style="width: 100%;">
                    <div style="text-align: center; color: #666; font-size: 13px; margin-top: 5px;">
                        <span id="opacityValue">100</span>%
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
                
                <!-- FOOTER SECTION -->
                <div class="control-section">
                    <h3>📍 Footer</h3>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="showFooter" checked>
                        <span>Show Footer</span>
                    </label>
                    
                    <label style="margin-top: 10px;">Footer Text</label>
                    <input type="text" id="footerText" value="Prepared with care by KitchenPro" class="form-control" placeholder="Footer text">
                    
                    <label style="margin-top: 15px;">Footer Alignment</label>
                    <select id="footerAlignment" class="form-control">
                        <option value="left">Left</option>
                        <option value="center" selected>Center</option>
                        <option value="right">Right</option>
                    </select>
                    
                    <label style="margin-top: 15px;">Footer Size</label>
                    <select id="footerSize" class="form-control">
                        <option value="small" selected>Small</option>
                        <option value="medium">Medium</option>
                    </select>
                </div>
                
                <!-- ACTIONS -->
                <div class="control-section" style="border-top: 2px solid #e0e0e0; padding-top: 20px;">
                    <button id="btnPreview" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                        👁️ Load My Menu Data
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
                
                .radio-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-bottom: 12px;
                    padding: 10px;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .radio-label:hover {
                    background: #f8f9fa;
                    border-color: #2196f3;
                }
                
                .radio-label input[type="radio"] {
                    margin-top: 3px;
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .radio-label input[type="radio"]:checked {
                    accent-color: #2196f3;
                }
            </style>
        `;
        
        // Bind events
        this.bindEvents();
    }
    
    bindEvents() {
        // Template style radio buttons
        document.querySelectorAll('input[name="templateStyle"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.templateStyle = e.target.value;
                console.log('📝 Template style changed to:', e.target.value);
                this.updatePreview();
            });
        });
        
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
            this.settings.backgroundOpacity = e.target.value / 100;
            this.updatePreview();
        });
        
        // Action buttons
        document.getElementById('btnPreview')?.addEventListener('click', () => this.loadRealData());
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
            showHeader: 'checkbox',
            headerText: 'value',
            showFooter: 'checkbox',
            footerText: 'value',
            footerAlignment: 'value',
            footerSize: 'value'
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
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        try {
            const success = await this.saveImageToFolder(file);
            
            if (success) {
                this.settings.backgroundImage = file.name;
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
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: true });
            const imagesDir = await dataDir.getDirectoryHandle('images', { create: true });
            const backgroundsDir = await imagesDir.getDirectoryHandle('backgrounds', { create: true });
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
    
    loadSampleData() {
        console.log('👀 Loading sample data...');
        const today = new Date();
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + 4);
        
        this.previewData = {
            startDate: today,
            endDate: nextFriday,
            days: [
                {
                    name: 'Понеделник',
                    meals: [
                        {
                            number: 1,
                            name: 'Супа топчета',
                            portion: '150гр',
                            calories: 129,
                            ingredients: [
                                { name: 'кайма БДС', hasAllergen: false },
                                { name: 'лук', hasAllergen: false },
                                { name: 'морков', hasAllergen: false },
                                { name: 'ориз', hasAllergen: false },
                                { name: 'яйца', hasAllergen: true },
                                { name: 'кис.мляко', hasAllergen: true }
                            ]
                        },
                        {
                            number: 2,
                            name: 'Зрял боб яхния',
                            portion: '150гр',
                            calories: 175,
                            ingredients: [
                                { name: 'боб', hasAllergen: false },
                                { name: 'лук', hasAllergen: false },
                                { name: 'морков', hasAllergen: false },
                                { name: 'джоджен', hasAllergen: false },
                                { name: 'сл.олио', hasAllergen: false }
                            ]
                        },
                        {
                            number: 3,
                            name: 'Плод',
                            portion: '150-200гр',
                            calories: null,
                            ingredients: []
                        },
                        {
                            number: 4,
                            name: 'Филийки хляб по Утвърден стандарт',
                            portion: '',
                            calories: null,
                            ingredients: [
                                { name: 'глутен', hasAllergen: true }
                            ]
                        }
                    ]
                },
                {
                    name: 'Вторник',
                    meals: [
                        {
                            number: 1,
                            name: 'Таратор',
                            portion: '150гр',
                            calories: 100,
                            ingredients: [
                                { name: 'краставица', hasAllergen: false },
                                { name: 'кис.мляко', hasAllergen: true }
                            ]
                        },
                        {
                            number: 2,
                            name: 'Мусака',
                            portion: '150гр',
                            calories: 236,
                            ingredients: [
                                { name: 'картофи', hasAllergen: false },
                                { name: 'кайма БДС', hasAllergen: false },
                                { name: 'прясно мляко', hasAllergen: true },
                                { name: 'яйца', hasAllergen: true }
                            ]
                        }
                    ]
                }
            ]
        };
        
        console.log('✅ Sample data loaded:', this.previewData);
    }
    
    loadRealData() {
        console.log('👀 Loading real menu data...');
        
        if (!window.recipes || !window.ingredients || !window.getMenuForDate) {
            alert('⚠️ Menu data not loaded yet. Please go to Menu Planner first and add some recipes.');
            return;
        }
        
        const currentDate = window.currentCalendarDate || new Date();
        const weekDates = this.getWeekDates(currentDate);
        
        const days = [];
        const dayNames = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък'];
        
        for (let i = 0; i < 5; i++) {
            const date = weekDates[i];
            const dateStr = date.toISOString().split('T')[0];
            const dayMenu = window.getMenuForDate(dateStr);
            
            const meals = [];
            
            ['slot1', 'slot2', 'slot3', 'slot4'].forEach((slotId, mealNum) => {
                const slot = dayMenu[slotId];
                const recipe = slot && slot.recipe ? window.recipes.find(r => r.id === slot.recipe) : null;
                
                if (recipe) {
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
            
            days.push({
                name: dayNames[i],
                meals: meals
            });
        }
        
        if (days.every(day => day.meals.length === 0)) {
            alert('⚠️ No meals found in your current week. Add some recipes to the menu planner first!');
            return;
        }
        
        this.previewData = {
            startDate: weekDates[0],
            endDate: weekDates[4],
            days: days
        };
        
        console.log('✅ Real data loaded:', this.previewData);
        this.updatePreview();
        
        const btn = document.getElementById('btnPreview');
        if (btn) {
            btn.textContent = '✅ Using Your Menu';
            btn.style.background = '#28a745';
        }
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
        if (!container) {
            console.error('❌ template-preview container not found!');
            return;
        }
        
        if (!this.previewData) {
            console.error('❌ No preview data!');
            container.innerHTML = '<p style="padding: 20px; color: #999;">No preview data available.</p>';
            return;
        }
        
        console.log('📝 Updating preview with style:', this.settings.templateStyle);
        
        // Choose rendering method based on template style
        if (this.settings.templateStyle === 'compact') {
            container.innerHTML = this.renderCompactMenu(this.previewData);
        } else {
            container.innerHTML = this.renderDetailedMenu(this.previewData);
        }
    }
    
    renderCompactMenu(data) {
        const { startDate, endDate, days } = data;
        const s = this.settings;
        
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')} ${startDate.getFullYear()}г.`;
        
        const sizes = {
            small: { base: '10pt', title: '16pt', day: '12pt', footer: '9pt' },
            medium: { base: '12pt', title: '20pt', day: '14pt', footer: '10pt' },
            large: { base: '14pt', title: '24pt', day: '16pt', footer: '11pt' }
        };
        const size = sizes[s.textSize];
        
        const footerSizes = {
            small: size.footer,
            medium: s.textSize === 'large' ? '13pt' : (s.textSize === 'medium' ? '11pt' : '10pt')
        };
        
        let html = `
            <div class="menu-preview" style="
                background: ${s.backgroundColor};
                ${s.backgroundImage ? `background-image: url('data/images/backgrounds/${s.backgroundImage}');` : ''}
                background-size: cover;
                background-position: center;
                padding: 20px;
                min-height: 400px;
                font-family: Arial, sans-serif;
                font-size: ${size.base};
                line-height: 1.4;
                display: flex;
                flex-direction: column;
            ">
        `;
        
        // Header
        if (s.showHeader) {
            html += `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h1 style="margin: 0; font-size: ${size.title}; color: #d2691e;">${s.headerText}</h1>
                </div>
            `;
        }
        
        if (s.showDateRange) {
            html += `<div style="text-align: center; margin-bottom: 20px;">${dateRange}</div>`;
        }
        
        // Weekly menu block (flex-grow to push footer down)
        html += `<div style="flex: 1;">`;
        
        days.forEach(day => {
            if (day.meals.length === 0) return;
            
            html += `
                <div style="margin-bottom: 15px;">
                    <div style="font-size: ${size.day}; font-weight: ${s.dayNameStyle}; margin-bottom: 8px;">${day.name}</div>
            `;
            
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
        
        html += `</div>`; // Close weekly menu block
        
        // Footer
        if (s.showFooter) {
            html += `
                <div style="
                    text-align: ${s.footerAlignment};
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    font-size: ${footerSizes[s.footerSize]};
                    color: #888;
                ">${s.footerText}</div>
            `;
        }
        
        html += `</div>`;
        return html;
    }
    
    renderDetailedMenu(data) {
        const { startDate, endDate, days } = data;
        const s = this.settings;
        
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')} — ${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}, ${startDate.getFullYear()}`;
        
        const sizes = {
            small: { base: '10pt', title: '18pt', day: '13pt', footer: '9pt' },
            medium: { base: '12pt', title: '22pt', day: '15pt', footer: '10pt' },
            large: { base: '14pt', title: '26pt', day: '17pt', footer: '11pt' }
        };
        const size = sizes[s.textSize];
        
        const footerSizes = {
            small: size.footer,
            medium: s.textSize === 'large' ? '13pt' : (s.textSize === 'medium' ? '11pt' : '10pt')
        };
        
        let html = `
            <div class="menu-preview" style="
                background: ${s.backgroundColor};
                ${s.backgroundImage ? `background-image: url('data/images/backgrounds/${s.backgroundImage}');` : ''}
                background-size: cover;
                background-position: center;
                padding: 25px;
                min-height: 400px;
                font-family: Arial, sans-serif;
                font-size: ${size.base};
                line-height: 1.6;
                display: flex;
                flex-direction: column;
            ">
        `;
        
        // Header
        if (s.showHeader) {
            html += `
                <div style="text-align: center; margin-bottom: 15px;">
                    <h1 style="margin: 0; font-size: ${size.title}; color: #d2691e;">${s.headerText}</h1>
                </div>
            `;
        }
        
        if (s.showDateRange) {
            html += `<div style="text-align: center; margin-bottom: 25px; font-size: ${size.base};">${dateRange}</div>`;
        }
        
        // Weekly menu block
        html += `<div style="flex: 1;">`;
        
        days.forEach(day => {
            if (day.meals.length === 0) return;
            
            html += `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: ${size.day}; font-weight: ${s.dayNameStyle}; margin-bottom: 12px; color: #555;">${day.name}</div>
            `;
            
            day.meals.forEach(meal => {
                html += `<div style="margin-bottom: 12px; margin-left: 15px;">`;
                html += `<div style="margin-bottom: 3px;">${meal.number}. ${meal.name}`;
                
                if (s.showPortions && meal.portion) {
                    html += ` (${meal.portion}`;
                    if (s.showCalories && meal.calories) {
                        html += `, ${meal.calories} ККАЛ`;
                    }
                    html += `)`;
                } else if (s.showCalories && meal.calories) {
                    html += ` (${meal.calories} ККАЛ)`;
                }
                
                html += `</div>`;
                
                if (s.showIngredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 0.95em; color: #666; margin-left: 15px;">`;
                    html += `Съставки: `;
                    html += meal.ingredients.map(ing => {
                        if (ing.hasAllergen) {
                            return `<span style="color: ${s.allergenColor}; font-weight: bold;">${ing.name}</span>`;
                        }
                        return ing.name;
                    }).join(', ');
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        });
        
        html += `</div>`; // Close weekly menu block
        
        // Footer
        if (s.showFooter) {
            html += `
                <div style="
                    text-align: ${s.footerAlignment};
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    font-size: ${footerSizes[s.footerSize]};
                    color: #888;
                ">${s.footerText}</div>
            `;
        }
        
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
        
        this.settings = new SimpleTemplateBuilder().settings;
        
        document.querySelectorAll('input[name="templateStyle"]')[0].checked = true;
        document.getElementById('showDateRange').checked = true;
        document.getElementById('showIngredients').checked = true;
        document.getElementById('showCalories').checked = true;
        document.getElementById('showPortions').checked = true;
        document.getElementById('textSize').value = 'medium';
        document.getElementById('allergenColor').value = '#ff0000';
        document.getElementById('dayNameStyle').value = 'bold';
        document.getElementById('backgroundColor').value = '#ffffff';
        document.getElementById('backgroundOpacity').value = '100';
        document.getElementById('opacityValue').textContent = '100';
        document.getElementById('showHeader').checked = true;
        document.getElementById('headerText').value = 'Седмично меню';
        document.getElementById('showFooter').checked = true;
        document.getElementById('footerText').value = 'Prepared with care by KitchenPro';
        document.getElementById('footerAlignment').value = 'center';
        document.getElementById('footerSize').value = 'small';
        
        this.removeBackground();
        this.loadSampleData();
        this.updatePreview();
    }
    
    getSettings() {
        return { ...this.settings };
    }
    
    generatePrintHTML(data) {
        if (this.settings.templateStyle === 'compact') {
            return this.renderCompactMenu(data);
        } else {
            return this.renderDetailedMenu(data);
        }
    }
}

window.simpleTemplateBuilder = new SimpleTemplateBuilder();

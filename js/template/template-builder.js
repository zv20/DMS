/**
 * Template Builder - Simplified Unified System
 * Single source of truth for all template settings
 */

class TemplateBuilder {
    constructor() {
        // Single state object - all settings in one place
        this.state = {
            // Layout
            layoutStyle: 'elegant-single', // 11 different layouts available!
            
            // Header
            showHeader: true,
            headerText: 'Weekly Meal Plan',
            headerAlignment: 'center',
            headerSize: '28',
            
            // Date Range
            showDateRange: true,
            dateFormat: 'long', // short, long, custom
            
            // Day Blocks
            dayBlockBg: '#ffffff',
            dayBlockBorder: '#e0e0e0',
            dayBlockPadding: '15',
            
            // Day Names
            dayNameSize: '18',
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            
            // Meal Titles
            showMealTitles: true,
            mealTitleSize: '14',
            mealTitleColor: '#666666',
            
            // Ingredients
            showIngredients: true,
            ingredientLayout: 'list', // list, inline, hidden
            
            // Numbering
            numberingStyle: 'none', // none, numeric, bullets
            
            // Footer
            showFooter: true,
            footerText: 'Meal plan created with DMS',
            
            // Advanced
            backgroundColor: '#f5f5f5',
            showBranding: true,
            separatorStyle: 'line', // line, space, none
            pageBorder: false
        };
        
        this.renderer = null;
        this.useRealData = false; // Toggle between sample and real data
        this.init();
    }
    
    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Initialize renderer
        this.renderer = new TemplateRenderer();
        
        // Build UI
        this.buildUI();
        
        // Bind all form inputs to state
        this.bindInputs();
        
        // Initial preview render
        this.updatePreview();
    }
    
    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        if (!sidebar) return;
        
        sidebar.innerHTML = `
            <div class="template-controls">
                <!-- LAYOUT TAB -->
                <div class="tab-section" data-tab="layout">
                    <h3>Layout & Content</h3>
                    
                    <div class="control-group">
                        <label>Layout Style</label>
                        <select id="layoutStyle" data-setting="layoutStyle" style="font-size: 14px;">
                            <optgroup label="Classic Layouts">
                                <option value="elegant-single">✨ Elegant Single Page</option>
                                <option value="single-column">📄 Single Column</option>
                                <option value="two-column">📑 Two Column</option>
                                <option value="table">📊 Table</option>
                                <option value="compact-cards">🗂️ Compact Cards</option>
                            </optgroup>
                            <optgroup label="New Layouts">
                                <option value="grid">🎨 Grid Cards</option>
                                <option value="timeline">⏱️ Timeline</option>
                                <option value="minimalist">⚪ Minimalist</option>
                                <option value="magazine">📰 Magazine</option>
                                <option value="bordered-cards">🎴 Bordered Cards</option>
                                <option value="checklist">✅ Checklist</option>
                            </optgroup>
                        </select>
                        <small style="color: #666; display: block; margin-top: 5px;">11 professional layouts to choose from!</small>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="showHeader" data-setting="showHeader" checked>
                            Show Header
                        </label>
                        <input type="text" id="headerText" data-setting="headerText" 
                               value="Weekly Meal Plan" placeholder="Header text">
                    </div>
                    
                    <div class="control-group">
                        <label>Header Size</label>
                        <input type="range" id="headerSize" data-setting="headerSize" 
                               min="16" max="48" value="28">
                        <span class="range-value">28px</span>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="showDateRange" data-setting="showDateRange" checked>
                            Show Date Range
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="showFooter" data-setting="showFooter" checked>
                            Show Footer
                        </label>
                        <input type="text" id="footerText" data-setting="footerText" 
                               value="Meal plan created with DMS">
                    </div>
                </div>
                
                <!-- STYLING TAB -->
                <div class="tab-section" data-tab="styling">
                    <h3>Styling</h3>
                    
                    <div class="control-group">
                        <label>Day Block Background</label>
                        <input type="color" id="dayBlockBg" data-setting="dayBlockBg" value="#ffffff">
                    </div>
                    
                    <div class="control-group">
                        <label>Day Name Size</label>
                        <input type="range" id="dayNameSize" data-setting="dayNameSize" 
                               min="12" max="32" value="18">
                        <span class="range-value">18px</span>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="showMealTitles" data-setting="showMealTitles" checked>
                            Show Meal Titles
                        </label>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="showIngredients" data-setting="showIngredients" checked>
                            Show Ingredients
                        </label>
                    </div>
                </div>
                
                <!-- ADVANCED TAB -->
                <div class="tab-section" data-tab="advanced">
                    <h3>Advanced</h3>
                    
                    <div class="control-group">
                        <label>Background Color</label>
                        <input type="color" id="backgroundColor" data-setting="backgroundColor" value="#f5f5f5">
                    </div>
                    
                    <div class="control-group">
                        <label>Separator Style</label>
                        <select id="separatorStyle" data-setting="separatorStyle">
                            <option value="line">Line</option>
                            <option value="space">Space Only</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>
                            <input type="checkbox" id="pageBorder" data-setting="pageBorder">
                            Page Border
                        </label>
                    </div>
                </div>
                
                <!-- ACTION BUTTONS -->
                <div class="action-buttons">
                    <button id="btn-preview-real" class="btn btn-primary">📋 Preview My Meals</button>
                    <button id="btn-save-template" class="btn btn-secondary">💾 Save Template</button>
                    <button id="btn-load-template" class="btn btn-secondary">📂 Load Template</button>
                    <button id="btn-reset" class="btn btn-secondary">🔄 Reset to Default</button>
                </div>
            </div>
        `;
        
        // Bind button actions
        document.getElementById('btn-preview-real')?.addEventListener('click', () => this.previewRealData());
        document.getElementById('btn-save-template')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btn-load-template')?.addEventListener('click', () => this.loadTemplate());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.reset());
    }
    
    bindInputs() {
        // Find all inputs with data-setting attribute
        const inputs = document.querySelectorAll('[data-setting]');
        
        inputs.forEach(input => {
            const setting = input.dataset.setting;
            
            // Set initial value from state
            if (input.type === 'checkbox') {
                input.checked = this.state[setting];
            } else {
                input.value = this.state[setting];
            }
            
            // Listen for changes
            input.addEventListener('input', (e) => {
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.state[setting] = value;
                
                // Update range value display
                if (e.target.type === 'range') {
                    const valueDisplay = e.target.parentElement.querySelector('.range-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = value + 'px';
                    }
                }
                
                // Update preview
                this.updatePreview();
            });
        });
    }
    
    updatePreview() {
        if (!this.renderer) return;
        
        const previewContainer = document.getElementById('template-preview');
        if (!previewContainer) return;
        
        // Render preview with current state
        const data = this.useRealData ? this.getRealMealPlanData() : this.getSampleData();
        previewContainer.innerHTML = this.renderer.render(this.state, data);
    }
    
    // NEW: Preview real meal plan data from the menu planner
    previewRealData() {
        this.useRealData = true;
        this.updatePreview();
        
        const btn = document.getElementById('btn-preview-real');
        if (btn) {
            btn.textContent = '✅ Showing Your Meals';
            btn.style.background = '#28a745';
        }
    }
    
    // NEW: Get real meal plan data from window.currentMenu
    getRealMealPlanData() {
        // Get current week dates from calendar
        const currentDate = window.currentCalendarDate || new Date();
        const weekDates = this.getWeekDates(currentDate);
        
        const days = [];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        weekDates.forEach((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayMenu = window.getMenuForDate(dateStr);
            
            const meals = [];
            
            // Build meals from slots 1-4
            ['slot1', 'slot2', 'slot3', 'slot4'].forEach((slotId, mealNum) => {
                const slot = dayMenu[slotId];
                const recipe = slot && slot.recipe ? window.recipes.find(r => r.id === slot.recipe) : null;
                
                if (recipe) {
                    // Get ingredients with allergen info
                    const ingredients = (recipe.ingredients || []).map(ingObj => {
                        const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                        const ing = window.ingredients.find(i => i.id === ingId);
                        return ing ? ing.name : '';
                    }).filter(Boolean);
                    
                    // Get allergens for this recipe
                    const allergens = [];
                    (recipe.ingredients || []).forEach(ingObj => {
                        const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                        const ing = window.ingredients.find(i => i.id === ingId);
                        if (ing && ing.allergens && ing.allergens.length > 0) {
                            allergens.push(ing.name);
                        }
                    });
                    
                    meals.push({
                        title: String(mealNum + 1),
                        name: recipe.name,
                        portion: recipe.portionSize ? `${recipe.portionSize}` : '',
                        calories: recipe.calories || null,
                        ingredients: ingredients,
                        allergens: allergens
                    });
                } else {
                    // Empty slot
                    meals.push({
                        title: String(mealNum + 1),
                        name: '—',
                        portion: '',
                        calories: null,
                        ingredients: [],
                        allergens: []
                    });
                }
            });
            
            days.push({
                date: dateStr,
                dayName: dayNames[index],
                meals: meals
            });
        });
        
        return {
            startDate: weekDates[0].toISOString().split('T')[0],
            endDate: weekDates[6].toISOString().split('T')[0],
            days: days
        };
    }
    
    // Helper to get week dates (Monday to Sunday)
    getWeekDates(date) {
        const currentDate = new Date(date);
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        
        const monday = new Date(currentDate.setDate(diff));
        const dates = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
        
        return dates;
    }
    
    getSampleData() {
        // Sample meal plan data with ALLERGEN data, PORTIONS, and CALORIES
        return {
            startDate: '2026-02-10',
            endDate: '2026-02-16',
            days: [
                {
                    date: '2026-02-10',
                    dayName: 'Monday',
                    meals: [
                        { 
                            title: '1', 
                            name: 'Oatmeal with berries', 
                            portion: '250g',
                            calories: 320,
                            ingredients: ['Oats', 'Blueberries', 'Honey', 'Milk'],
                            allergens: ['Milk']
                        },
                        { 
                            title: '2', 
                            name: 'Grilled chicken salad',
                            portion: '350g',
                            calories: 420,
                            ingredients: ['Chicken', 'Lettuce', 'Tomatoes', 'Olive oil'] 
                        },
                        { 
                            title: '3', 
                            name: 'Pasta primavera',
                            portion: '400g',
                            calories: 580,
                            ingredients: ['Pasta', 'Vegetables', 'Olive oil', 'Parmesan'],
                            allergens: ['Pasta', 'Parmesan']
                        },
                        { 
                            title: '4', 
                            name: 'Greek yogurt parfait',
                            portion: '200g',
                            calories: 280,
                            ingredients: ['Yogurt', 'Granola', 'Berries', 'Almonds'],
                            allergens: ['Yogurt', 'Granola', 'Almonds']
                        }
                    ]
                },
                {
                    date: '2026-02-11',
                    dayName: 'Tuesday',
                    meals: [
                        { 
                            title: '1', 
                            name: 'Scrambled eggs with toast',
                            portion: '220g',
                            calories: 380,
                            ingredients: ['Eggs', 'Butter', 'Bread', 'Salt'],
                            allergens: ['Eggs', 'Butter', 'Bread']
                        },
                        { 
                            title: '2', 
                            name: 'Turkey sandwich',
                            portion: '300g',
                            calories: 450,
                            ingredients: ['Bread', 'Turkey', 'Lettuce', 'Mayo'],
                            allergens: ['Bread', 'Mayo']
                        },
                        { 
                            title: '3', 
                            name: 'Baked salmon with rice',
                            portion: '380g',
                            calories: 520,
                            ingredients: ['Salmon', 'Rice', 'Lemon', 'Herbs'],
                            allergens: ['Salmon']
                        },
                        { 
                            title: '4', 
                            name: 'Fruit smoothie',
                            portion: '350ml',
                            calories: 240,
                            ingredients: ['Banana', 'Berries', 'Milk', 'Protein powder'],
                            allergens: ['Milk']
                        }
                    ]
                }
            ]
        };
    }
    
    // UPDATED: Save templates using storage adapter instead of localStorage
    async saveTemplate() {
        const name = prompt('Template name:');
        if (!name) return;
        
        // Ensure window.menuTemplates exists
        if (!window.menuTemplates) {
            window.menuTemplates = {};
        }
        
        // Save to global object
        window.menuTemplates[name] = this.state;
        
        // Save to storage adapter (File System or IndexedDB)
        if (window.storageAdapter) {
            await window.storageAdapter.save('templates', window.menuTemplates);
            console.log('✅ Template saved to storage adapter:', name);
        }
        
        alert(`Template "${name}" saved!`);
    }
    
    // UPDATED: Load templates from storage adapter instead of localStorage
    loadTemplate() {
        // Get templates from global object (loaded by storage adapter)
        const templates = window.menuTemplates || {};
        const names = Object.keys(templates);
        
        if (names.length === 0) {
            alert('No saved templates found.');
            return;
        }
        
        const name = prompt('Load template:\n\n' + names.join('\n'));
        if (!name || !templates[name]) return;
        
        // Load state
        this.state = { ...this.state, ...templates[name] };
        
        // Update all inputs
        document.querySelectorAll('[data-setting]').forEach(input => {
            const setting = input.dataset.setting;
            if (input.type === 'checkbox') {
                input.checked = this.state[setting];
            } else {
                input.value = this.state[setting];
            }
        });
        
        this.updatePreview();
        alert(`Template "${name}" loaded!`);
    }
    
    reset() {
        if (!confirm('Reset all settings to default?')) return;
        
        // Reinitialize state
        this.state = new TemplateBuilder().state;
        
        // Update inputs
        document.querySelectorAll('[data-setting]').forEach(input => {
            const setting = input.dataset.setting;
            if (input.type === 'checkbox') {
                input.checked = this.state[setting];
            } else {
                input.value = this.state[setting];
            }
        });
        
        this.updatePreview();
    }
    
    // Public API for exporting settings
    getSettings() {
        return { ...this.state };
    }
    
    // Public API for generating print HTML
    generatePrintHTML(mealPlanData) {
        return this.renderer.render(this.state, mealPlanData);
    }
}

// Global instance
window.templateBuilder = new TemplateBuilder();

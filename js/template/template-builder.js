/**
 * Template Builder - Simplified Unified System
 * Single source of truth for all template settings
 */

class TemplateBuilder {
    constructor() {
        // Single state object - all settings in one place
        this.state = {
            // Layout
            layoutStyle: 'single-column', // single-column, two-column, table, compact-cards
            
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
                        <select id="layoutStyle" data-setting="layoutStyle">
                            <option value="single-column">Single Column</option>
                            <option value="two-column">Two Column</option>
                            <option value="table">Table</option>
                            <option value="compact-cards">Compact Cards</option>
                        </select>
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
                    <button id="btn-save-template" class="btn btn-primary">Save Template</button>
                    <button id="btn-load-template" class="btn btn-secondary">Load Template</button>
                    <button id="btn-reset" class="btn btn-secondary">Reset to Default</button>
                </div>
            </div>
        `;
        
        // Bind button actions
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
        previewContainer.innerHTML = this.renderer.render(this.state, this.getSampleData());
    }
    
    getSampleData() {
        // Sample meal plan data for preview - UPDATED TO USE NUMBERED MEALS
        return {
            startDate: '2026-02-10',
            endDate: '2026-02-16',
            days: [
                {
                    date: '2026-02-10',
                    dayName: 'Monday',
                    meals: [
                        { title: '1', name: 'Oatmeal with berries', ingredients: ['Oats', 'Blueberries', 'Honey'] },
                        { title: '2', name: 'Grilled chicken salad', ingredients: ['Chicken', 'Lettuce', 'Tomatoes'] },
                        { title: '3', name: 'Pasta primavera', ingredients: ['Pasta', 'Vegetables', 'Olive oil'] },
                        { title: '4', name: 'Greek yogurt with granola', ingredients: ['Yogurt', 'Granola', 'Berries'] }
                    ]
                },
                {
                    date: '2026-02-11',
                    dayName: 'Tuesday',
                    meals: [
                        { title: '1', name: 'Scrambled eggs', ingredients: ['Eggs', 'Butter', 'Salt'] },
                        { title: '2', name: 'Turkey sandwich', ingredients: ['Bread', 'Turkey', 'Lettuce'] },
                        { title: '3', name: 'Baked salmon', ingredients: ['Salmon', 'Lemon', 'Herbs'] },
                        { title: '4', name: 'Fruit smoothie', ingredients: ['Banana', 'Berries', 'Milk'] }
                    ]
                }
            ]
        };
    }
    
    saveTemplate() {
        const name = prompt('Template name:');
        if (!name) return;
        
        // Save to localStorage
        const templates = JSON.parse(localStorage.getItem('meal-templates') || '{}');
        templates[name] = this.state;
        localStorage.setItem('meal-templates', JSON.stringify(templates));
        
        alert(`Template "${name}" saved!`);
    }
    
    loadTemplate() {
        const templates = JSON.parse(localStorage.getItem('meal-templates') || '{}');
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

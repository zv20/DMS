/**
 * Wizard Steps Definitions - ALL STEPS FULLY IMPLEMENTED
 * Steps 1-4 complete with interactive UI
 */

window.WizardSteps = {
    layouts: [
        { id: 'grid', name: 'Grid Cards', description: 'Modern card grid - meals in responsive cards', icon: '🎴', category: 'Modern' },
        { id: 'timeline', name: 'Timeline', description: 'Vertical timeline with connector lines', icon: '⏱️', category: 'Modern' },
        { id: 'minimalist', name: 'Minimalist', description: 'Ultra-clean minimal design with whitespace', icon: '✨', category: 'Modern' },
        { id: 'magazine', name: 'Magazine', description: 'Magazine-style with alternating emphasis', icon: '📰', category: 'Modern' },
        { id: 'bordered-cards', name: 'Bordered Cards', description: 'Bold borders with shadow effects', icon: '🖼️', category: 'Modern' },
        { id: 'checklist', name: 'Checklist', description: 'Checkbox-style for meal tracking', icon: '☑️', category: 'Modern' },
        { id: 'elegant-single', name: 'Elegant Single', description: 'Sophisticated single column with numbers', icon: '🎯', category: 'Classic' },
        { id: 'single-column', name: 'Single Column', description: 'Simple single column layout', icon: '📄', category: 'Classic' },
        { id: 'two-column', name: 'Two Column', description: 'Split layout with two columns', icon: '📑', category: 'Classic' },
        { id: 'table', name: 'Table', description: 'Traditional table format', icon: '📊', category: 'Classic' },
        { id: 'compact-cards', name: 'Compact Cards', description: 'Space-efficient card design', icon: '🗂️', category: 'Classic' }
    ],
    
    themes: [
        { name: 'Orange (Default)', primaryColor: '#ff6b35', backgroundColor: '#ffffff', textColor: '#333333' },
        { name: 'Teal Fresh', primaryColor: '#20c997', backgroundColor: '#ffffff', textColor: '#2c3e50' },
        { name: 'Purple Dream', primaryColor: '#6f42c1', backgroundColor: '#f8f9fa', textColor: '#212529' },
        { name: 'Blue Ocean', primaryColor: '#0d6efd', backgroundColor: '#ffffff', textColor: '#212529' },
        { name: 'Dark Mode', primaryColor: '#ffc107', backgroundColor: '#212529', textColor: '#ffffff' },
        { name: 'Rose Gold', primaryColor: '#e91e63', backgroundColor: '#fff5f7', textColor: '#37474f' }
    ],
    
    steps: [
        // STEP 1: Layout Selection
        {
            id: 1,
            title: '🎴 Layout Selection',
            description: 'Choose a layout style for your meal plan',
            renderContent: function(data) {
                const selectedLayout = data.layoutStyle || 'grid';
                let html = '<div class="layout-selection">';
                
                // Modern Layouts
                html += '<div class="layout-category"><h3>Modern Layouts</h3><div class="layout-grid">';
                window.WizardSteps.layouts.filter(l => l.category === 'Modern').forEach(layout => {
                    const selected = selectedLayout === layout.id ? 'selected' : '';
                    html += `<div class="layout-card ${selected}" data-layout="${layout.id}">
                        <div class="layout-preview">${layout.icon}</div>
                        <div class="layout-name">${layout.name}</div>
                        <div class="layout-description">${layout.description}</div>
                    </div>`;
                });
                html += '</div></div>';
                
                // Classic Layouts
                html += '<div class="layout-category"><h3>Classic Layouts</h3><div class="layout-grid">';
                window.WizardSteps.layouts.filter(l => l.category === 'Classic').forEach(layout => {
                    const selected = selectedLayout === layout.id ? 'selected' : '';
                    html += `<div class="layout-card ${selected}" data-layout="${layout.id}">
                        <div class="layout-preview">${layout.icon}</div>
                        <div class="layout-name">${layout.name}</div>
                        <div class="layout-description">${layout.description}</div>
                    </div>`;
                });
                html += '</div></div>';
                
                const layoutName = window.WizardSteps.layouts.find(l => l.id === selectedLayout)?.name || 'Grid Cards';
                html += `<div class="current-selection">Selected: <strong>${layoutName}</strong></div>`;
                html += '</div>';
                return html;
            },
            attachListeners: function(wizard) {
                document.querySelectorAll('.layout-card').forEach(card => {
                    card.addEventListener('click', function() {
                        document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
                        this.classList.add('selected');
                        wizard.wizardData.layoutStyle = this.getAttribute('data-layout');
                        const layoutName = window.WizardSteps.layouts.find(l => l.id === wizard.wizardData.layoutStyle)?.name;
                        document.querySelector('.current-selection').innerHTML = `Selected: <strong>${layoutName}</strong>`;
                    });
                });
            },
            validate: (data) => ({ valid: true }),
            collectData: () => ({})
        },
        
        // STEP 2: Week Styling
        {
            id: 2,
            title: '🎨 Week Styling',
            description: 'Customize the appearance of your week layout',
            renderDayPreview: function(data) {
                const dayHeaderSize = data.dayHeaderSize || '1.2em';
                const dayHeaderColor = data.dayHeaderColor || '#333333';
                const dayBlockBg = data.dayBlockBg || '#ffffff';
                const dayBlockBorder = data.dayBlockBorder || '#ddd';
                const dayBlockPadding = data.dayBlockPadding || 15;
                
                return `<div style="background: ${dayBlockBg}; border: 2px solid ${dayBlockBorder}; padding: ${dayBlockPadding}px; border-radius: 8px;">
                    <div style="font-size: ${dayHeaderSize}; color: ${dayHeaderColor}; font-weight: bold; margin-bottom: 10px;">Monday</div>
                    <div>Breakfast: Oatmeal</div><div>Lunch: Salad</div><div>Dinner: Pasta</div></div>`;
            },
            renderContent: function(data) {
                const dayHeaderSize = data.dayHeaderSize || '1.2em';
                const dayHeaderColor = data.dayHeaderColor || '#333333';
                const dayBlockBg = data.dayBlockBg || '#ffffff';
                const dayBlockBorder = data.dayBlockBorder || '#ddd';
                const dayBlockPadding = data.dayBlockPadding || 15;
                const daySpacing = data.daySpacing || 15;
                
                let html = '<div class="week-styling"><div class="style-section"><h3>Day Headers</h3>';
                html += '<div class="wizard-form-group"><label>Font Size</label>';
                html += `<input type="range" id="dayHeaderSize" class="wizard-range" min="0.8" max="2" step="0.1" value="${parseFloat(dayHeaderSize)}">`;
                html += `<span id="dayHeaderSizeValue">${dayHeaderSize}</span></div>`;
                html += '<div class="wizard-form-group"><label>Color</label>';
                html += `<input type="color" id="dayHeaderColor" value="${dayHeaderColor}"></div></div>`;
                
                html += '<div class="style-section"><h3>Day Blocks</h3>';
                html += '<div class="wizard-form-group"><label>Background Color</label>';
                html += `<input type="color" id="dayBlockBg" value="${dayBlockBg}"></div>`;
                html += '<div class="wizard-form-group"><label>Border Color</label>';
                html += `<input type="color" id="dayBlockBorder" value="${dayBlockBorder}"></div>`;
                html += '<div class="wizard-form-group"><label>Padding</label>';
                html += `<input type="range" id="dayBlockPadding" class="wizard-range" min="5" max="30" value="${dayBlockPadding}">`;
                html += `<span id="dayBlockPaddingValue">${dayBlockPadding}px</span></div>`;
                html += '<div class="wizard-form-group"><label>Spacing Between Days</label>';
                html += `<input type="range" id="daySpacing" class="wizard-range" min="5" max="40" value="${daySpacing}">`;
                html += `<span id="daySpacingValue">${daySpacing}px</span></div></div>`;
                
                html += '<div class="style-section"><h3>Preview</h3><div id="dayPreview">';
                html += this.renderDayPreview(data);
                html += '</div></div></div>';
                return html;
            },
            attachListeners: function(wizard) {
                ['dayHeaderSize', 'dayBlockPadding', 'daySpacing'].forEach(id => {
                    const el = document.getElementById(id);
                    const val = document.getElementById(id + 'Value');
                    if (el && val) {
                        el.addEventListener('input', function() {
                            const suffix = id === 'dayHeaderSize' ? 'em' : 'px';
                            val.textContent = this.value + suffix;
                            wizard.wizardData[id] = this.value + suffix;
                            window.WizardSteps.updatePreview(wizard);
                        });
                    }
                });
                ['dayHeaderColor', 'dayBlockBg', 'dayBlockBorder'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.addEventListener('input', function() {
                            wizard.wizardData[id] = this.value;
                            window.WizardSteps.updatePreview(wizard);
                        });
                    }
                });
            },
            validate: (data) => ({ valid: true }),
            collectData: () => ({})
        },
        
        // STEP 3: Meal Display Options
        {
            id: 3,
            title: '🍽️ Meal Display Options',
            description: 'Choose what information to show for each meal',
            renderMealPreview: function(data) {
                const showMealTitles = data.showMealTitles !== false;
                const showIngredients = data.showIngredients !== false;
                const showPortions = data.showPortions !== false;
                const showCalories = data.showCalories || false;
                
                let html = '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">';
                html += showMealTitles ? '<div style="color: #ff6b35; font-weight: bold;">1. Breakfast</div>' : '';
                html += '<div>Oatmeal with Berries';
                if (showPortions || showCalories) {
                    html += ' <span style="color: #888;">(250g';
                    if (showCalories) html += ', 320 cal';
                    html += ')</span>';
                }
                html += '</div>';
                if (showIngredients) html += '<div style="font-size: 0.9em; color: #666;">Ingredients: Oats, blueberries, strawberries</div>';
                html += '</div>';
                return html;
            },
            renderContent: function(data) {
                const showMealTitles = data.showMealTitles !== false;
                const showIngredients = data.showIngredients !== false;
                const ingredientDisplay = data.ingredientDisplay || 'list';
                const showPortions = data.showPortions !== false;
                const showCalories = data.showCalories || false;
                const highlightAllergens = data.highlightAllergens || false;
                const allergenStyle = data.allergenStyle || 'underline';
                
                let html = '<div class="meal-display-options"><div class="style-section"><h3>Display Options</h3>';
                html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showMealTitles" ${showMealTitles ? 'checked' : ''}><span>Show meal titles (Breakfast, Lunch, Dinner)</span></label></div>`;
                
                html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showIngredients" ${showIngredients ? 'checked' : ''}><span>Show ingredients</span></label></div>`;
                if (showIngredients) {
                    html += '<div style="margin-left: 30px;"><div class="wizard-radio-group">';
                    html += `<label class="wizard-radio-label"><input type="radio" name="ingredientDisplay" value="list" ${ingredientDisplay === 'list' ? 'checked' : ''}><span>List format</span></label>`;
                    html += `<label class="wizard-radio-label"><input type="radio" name="ingredientDisplay" value="inline" ${ingredientDisplay === 'inline' ? 'checked' : ''}><span>Inline format</span></label>`;
                    html += '</div></div>';
                }
                
                html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showPortions" ${showPortions ? 'checked' : ''}><span>Show portion sizes</span></label></div>`;
                html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showCalories" ${showCalories ? 'checked' : ''}><span>Show calories</span></label></div>`;
                html += '</div>';
                
                html += '<div class="style-section"><h3>Allergen Highlighting</h3>';
                html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="highlightAllergens" ${highlightAllergens ? 'checked' : ''}><span>Highlight allergens in meal names</span></label></div>`;
                if (highlightAllergens) {
                    html += '<div style="margin-left: 30px;"><div class="wizard-radio-group">';
                    html += `<label class="wizard-radio-label"><input type="radio" name="allergenStyle" value="underline" ${allergenStyle === 'underline' ? 'checked' : ''}><span>Underline</span></label>`;
                    html += `<label class="wizard-radio-label"><input type="radio" name="allergenStyle" value="bold" ${allergenStyle === 'bold' ? 'checked' : ''}><span>Bold</span></label>`;
                    html += `<label class="wizard-radio-label"><input type="radio" name="allergenStyle" value="background" ${allergenStyle === 'background' ? 'checked' : ''}><span>Background color</span></label>`;
                    html += '</div></div>';
                }
                html += '</div>';
                
                html += '<div class="style-section"><h3>Preview</h3><div id="mealDisplayPreview">';
                html += this.renderMealPreview(data);
                html += '</div></div></div>';
                return html;
            },
            attachListeners: function(wizard) {
                ['showMealTitles', 'showIngredients', 'showPortions', 'showCalories', 'highlightAllergens'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.addEventListener('change', function() {
                            wizard.wizardData[id] = this.checked;
                            wizard.showStep(wizard.currentStep);
                        });
                    }
                });
                ['ingredientDisplay', 'allergenStyle'].forEach(name => {
                    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
                        radio.addEventListener('change', function() {
                            wizard.wizardData[name] = this.value;
                            window.WizardSteps.updateMealPreview(wizard);
                        });
                    });
                });
            },
            validate: (data) => ({ valid: true }),
            collectData: () => ({})
        },
        
        // STEP 4: Typography & Colors
        {
            id: 4,
            title: '🎨 Typography & Colors',
            description: 'Customize fonts and color scheme',
            renderTypographyPreview: function(data) {
                const headerFontSize = data.headerFontSize || 2;
                const mealFontSize = data.mealFontSize || 1;
                const primaryColor = data.primaryColor || '#ff6b35';
                const backgroundColor = data.backgroundColor || '#ffffff';
                const textColor = data.textColor || '#333333';
                return `<div style="background: ${backgroundColor}; padding: 20px; border-radius: 8px;"><div style="font-size: ${headerFontSize}em; color: ${primaryColor}; font-weight: bold;">Weekly Meal Plan</div><div style="border: 2px solid ${primaryColor}; padding: 15px; margin-top: 15px; border-radius: 8px;"><div style="color: ${textColor}; font-weight: bold;">Monday</div><div style="color: ${primaryColor}; font-weight: 600; font-size: ${mealFontSize}em;">1. Breakfast</div><div style="color: ${textColor}; font-size: ${mealFontSize}em;">Oatmeal with berries</div></div></div>`;
            },
            renderContent: function(data) {
                const headerFontSize = data.headerFontSize || 2;
                const mealFontSize = data.mealFontSize || 1;
                const primaryColor = data.primaryColor || '#ff6b35';
                const backgroundColor = data.backgroundColor || '#ffffff';
                const textColor = data.textColor || '#333333';
                
                let html = '<div class="typography-colors"><div class="style-section"><h3>🎨 Quick Themes</h3><div class="theme-preset-grid">';
                window.WizardSteps.themes.forEach((theme, index) => {
                    html += `<div class="theme-preset-card" data-theme-index="${index}"><div class="theme-preview-colors">
                        <div style="background: ${theme.primaryColor}; width: 33.33%; height: 100%;"></div>
                        <div style="background: ${theme.backgroundColor}; width: 33.33%; height: 100%;"></div>
                        <div style="background: ${theme.textColor}; width: 33.33%; height: 100%;"></div>
                    </div><div class="theme-preset-name">${theme.name}</div></div>`;
                });
                html += '</div></div><div class="style-section"><h3>🔤 Font Sizes</h3>';
                html += `<div class="wizard-form-group"><label>Header Text Size</label><input type="range" id="headerFontSize" class="wizard-range" min="1" max="3" step="0.1" value="${headerFontSize}"><span id="headerFontSizeValue">${headerFontSize}em</span></div>`;
                html += `<div class="wizard-form-group"><label>Meal Text Size</label><input type="range" id="mealFontSize" class="wizard-range" min="0.8" max="1.5" step="0.05" value="${mealFontSize}"><span id="mealFontSizeValue">${mealFontSize}em</span></div></div>`;
                html += `<div class="style-section"><h3>🎨 Custom Colors</h3>`;
                html += `<div class="wizard-form-group"><label>Primary Color</label><input type="color" id="primaryColor" value="${primaryColor}"></div>`;
                html += `<div class="wizard-form-group"><label>Background Color</label><input type="color" id="backgroundColor" value="${backgroundColor}"></div>`;
                html += `<div class="wizard-form-group"><label>Text Color</label><input type="color" id="textColor" value="${textColor}"></div></div>`;
                html += '<div class="style-section"><h3>👁️ Preview</h3><div id="typographyPreview">' + this.renderTypographyPreview(data) + '</div></div></div>';
                return html;
            },
            attachListeners: function(wizard) {
                document.querySelectorAll('.theme-preset-card').forEach(card => {
                    card.addEventListener('click', function() {
                        const theme = window.WizardSteps.themes[this.getAttribute('data-theme-index')];
                        wizard.wizardData.primaryColor = theme.primaryColor;
                        wizard.wizardData.backgroundColor = theme.backgroundColor;
                        wizard.wizardData.textColor = theme.textColor;
                        document.getElementById('primaryColor').value = theme.primaryColor;
                        document.getElementById('backgroundColor').value = theme.backgroundColor;
                        document.getElementById('textColor').value = theme.textColor;
                        window.WizardSteps.updateTypographyPreview(wizard);
                    });
                });
                ['headerFontSize', 'mealFontSize'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener('input', function() {
                        document.getElementById(id + 'Value').textContent = this.value + 'em';
                        wizard.wizardData[id] = parseFloat(this.value);
                        window.WizardSteps.updateTypographyPreview(wizard);
                    });
                });
                ['primaryColor', 'backgroundColor', 'textColor'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener('input', function() {
                        wizard.wizardData[id] = this.value;
                        window.WizardSteps.updateTypographyPreview(wizard);
                    });
                });
            },
            validate: (data) => ({ valid: true }),
            collectData: () => ({})
        }
    ],
    
    updatePreview: function(wizard) {
        const previewDiv = document.getElementById('dayPreview');
        if (previewDiv && wizard.wizardData) {
            const step = this.getStep(2);
            if (step && step.renderDayPreview) {
                previewDiv.innerHTML = step.renderDayPreview(wizard.wizardData);
            }
        }
    },
    
    updateMealPreview: function(wizard) {
        const previewDiv = document.getElementById('mealDisplayPreview');
        if (previewDiv && wizard.wizardData) {
            const step = this.getStep(3);
            if (step && step.renderMealPreview) {
                previewDiv.innerHTML = step.renderMealPreview(wizard.wizardData);
            }
        }
    },
    
    updateTypographyPreview: function(wizard) {
        const previewDiv = document.getElementById('typographyPreview');
        if (previewDiv && wizard.wizardData) {
            const step = this.getStep(4);
            if (step && step.renderTypographyPreview) {
                previewDiv.innerHTML = step.renderTypographyPreview(wizard.wizardData);
            }
        }
    },
    
    getStep(stepNumber) {
        return this.steps.find(step => step.id === stepNumber) || null;
    },
    
    getAllSteps() {
        return this.steps;
    }
};

console.log('✅ WizardSteps loaded with', window.WizardSteps.steps.length, 'steps');
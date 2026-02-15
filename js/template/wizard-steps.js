/**
 * Wizard Steps Definitions
 * Phase 2: Step 1 - Layout Selection (IMPLEMENTED)
 * Phase 3: Step 2 - Week Styling (IMPLEMENTED)
 * Phase 4: Step 3 - Meal Display Options (IMPLEMENTED)
 * 
 * Each step defines the structure and validation
 */

window.WizardSteps = {
    // Layout definitions with descriptions and icons
    layouts: [
        {
            id: 'grid',
            name: 'Grid Cards',
            description: 'Modern card grid - meals in responsive cards',
            icon: '🎴',
            category: 'Modern'
        },
        {
            id: 'timeline',
            name: 'Timeline',
            description: 'Vertical timeline with connector lines',
            icon: '⏱️',
            category: 'Modern'
        },
        {
            id: 'minimalist',
            name: 'Minimalist',
            description: 'Ultra-clean minimal design with whitespace',
            icon: '✨',
            category: 'Modern'
        },
        {
            id: 'magazine',
            name: 'Magazine',
            description: 'Magazine-style with alternating emphasis',
            icon: '📰',
            category: 'Modern'
        },
        {
            id: 'bordered-cards',
            name: 'Bordered Cards',
            description: 'Bold borders with shadow effects',
            icon: '🖼️',
            category: 'Modern'
        },
        {
            id: 'checklist',
            name: 'Checklist',
            description: 'Checkbox-style for meal tracking',
            icon: '☑️',
            category: 'Modern'
        },
        {
            id: 'elegant-single',
            name: 'Elegant Single',
            description: 'Sophisticated single column with numbers',
            icon: '🎯',
            category: 'Classic'
        },
        {
            id: 'single-column',
            name: 'Single Column',
            description: 'Simple single column layout',
            icon: '📄',
            category: 'Classic'
        },
        {
            id: 'two-column',
            name: 'Two Column',
            description: 'Split layout with two columns',
            icon: '📑',
            category: 'Classic'
        },
        {
            id: 'table',
            name: 'Table',
            description: 'Traditional table format',
            icon: '📊',
            category: 'Classic'
        },
        {
            id: 'compact-cards',
            name: 'Compact Cards',
            description: 'Space-efficient card design',
            icon: '🗂️',
            category: 'Classic'
        }
    ],
    
    steps: [
        {
            id: 1,
            title: '📐 Choose Your Layout',
            description: 'Select how you want your meal plan to be displayed',
            renderContent: (data) => {
                const currentLayout = data.layoutStyle || 'grid';
                
                let html = '<div class="layout-selection">';
                
                // Category: Modern Layouts
                html += '<div class="layout-category">';
                html += '<h3 style="font-size: 1.1rem; color: #666; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">✨ Modern Layouts</h3>';
                html += '<div class="layout-grid">';
                
                window.WizardSteps.layouts.filter(l => l.category === 'Modern').forEach(layout => {
                    const isSelected = layout.id === currentLayout;
                    html += `
                        <div class="layout-card ${isSelected ? 'selected' : ''}" data-layout="${layout.id}">
                            <div class="layout-preview">${layout.icon}</div>
                            <div class="layout-name">${layout.name}</div>
                            <div class="layout-description">${layout.description}</div>
                        </div>
                    `;
                });
                
                html += '</div></div>';
                
                // Category: Classic Layouts
                html += '<div class="layout-category" style="margin-top: 30px;">';
                html += '<h3 style="font-size: 1.1rem; color: #666; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">📚 Classic Layouts</h3>';
                html += '<div class="layout-grid">';
                
                window.WizardSteps.layouts.filter(l => l.category === 'Classic').forEach(layout => {
                    const isSelected = layout.id === currentLayout;
                    html += `
                        <div class="layout-card ${isSelected ? 'selected' : ''}" data-layout="${layout.id}">
                            <div class="layout-preview">${layout.icon}</div>
                            <div class="layout-name">${layout.name}</div>
                            <div class="layout-description">${layout.description}</div>
                        </div>
                    `;
                });
                
                html += '</div></div>';
                
                // Current selection display
                const selectedLayout = window.WizardSteps.layouts.find(l => l.id === currentLayout);
                html += `
                    <div class="current-selection" style="
                        margin-top: 25px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border-left: 4px solid #ff6b35;
                    ">
                        <strong>Current Selection:</strong> ${selectedLayout ? selectedLayout.icon + ' ' + selectedLayout.name : currentLayout}
                    </div>
                `;
                
                html += '</div>';
                return html;
            },
            attachListeners: (wizard) => {
                // Add click listeners to layout cards
                const cards = document.querySelectorAll('.layout-card');
                cards.forEach(card => {
                    card.addEventListener('click', function() {
                        // Remove selected class from all cards
                        cards.forEach(c => c.classList.remove('selected'));
                        
                        // Add selected class to clicked card
                        this.classList.add('selected');
                        
                        // Update wizard data
                        const layoutId = this.getAttribute('data-layout');
                        wizard.wizardData.layoutStyle = layoutId;
                        
                        // Update current selection display
                        const selectedLayout = window.WizardSteps.layouts.find(l => l.id === layoutId);
                        const selectionDiv = document.querySelector('.current-selection');
                        if (selectionDiv && selectedLayout) {
                            selectionDiv.innerHTML = `<strong>Current Selection:</strong> ${selectedLayout.icon} ${selectedLayout.name}`;
                        }
                    });
                });
            },
            validate: (data) => {
                if (!data.layoutStyle) {
                    return { 
                        valid: false, 
                        message: 'Please select a layout style.' 
                    };
                }
                return { valid: true };
            },
            collectData: () => {
                // Data is already collected via click listeners
                return {};
            }
        },
        {
            id: 2,
            title: '🗓️ Week Styling',
            description: 'Customize how days of the week appear',
            renderContent: (data) => {
                // Set defaults if not present
                const dayHeaderSize = data.dayHeaderSize || '1.2em';
                const dayHeaderColor = data.dayHeaderColor || '#333333';
                const dayBlockBg = data.dayBlockBg || '#ffffff';
                const dayBlockBorder = data.dayBlockBorder || '#ddd';
                const dayBlockPadding = data.dayBlockPadding || 15;
                const daySpacing = data.daySpacing || 15;
                
                let html = '<div class="week-styling">';
                
                // Day Header Styling
                html += '<div class="style-section">';
                html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">';
                html += '📝 Day Header</h3>';
                
                // Font Size
                html += '<div class="wizard-form-group">';
                html += '<label for="dayHeaderSize">Font Size</label>';
                html += '<div style="display: flex; align-items: center; gap: 10px;">';
                html += `<input type="range" id="dayHeaderSize" class="wizard-range" min="0.8" max="2" step="0.1" value="${parseFloat(dayHeaderSize)}" style="flex: 1;">`;
                html += `<span id="dayHeaderSizeValue" style="min-width: 50px; font-weight: 600;">${dayHeaderSize}</span>`;
                html += '</div></div>';
                
                // Color
                html += '<div class="wizard-form-group">';
                html += '<label for="dayHeaderColor">Color</label>';
                html += '<div style="display: flex; align-items: center; gap: 10px;">';
                html += `<input type="color" id="dayHeaderColor" value="${dayHeaderColor}" style="width: 60px; height: 40px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">`;
                html += `<input type="text" id="dayHeaderColorHex" value="${dayHeaderColor}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;" readonly>`;
                html += '</div></div>';
                
                html += '</div>';
                
                // Day Block Styling
                html += '<div class="style-section" style="margin-top: 25px;">';
                html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">';
                html += '📦 Day Block</h3>';
                
                // Background Color
                html += '<div class="wizard-form-group">';
                html += '<label for="dayBlockBg">Background Color</label>';
                html += '<div style="display: flex; align-items: center; gap: 10px;">';
                html += `<input type="color" id="dayBlockBg" value="${dayBlockBg}" style="width: 60px; height: 40px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">`;
                html += `<input type="text" id="dayBlockBgHex" value="${dayBlockBg}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;" readonly>`;
                html += '</div></div>';
                
                // Border Color
                html += '<div class="wizard-form-group">';
                html += '<label for="dayBlockBorder">Border Color</label>';
                html += '<div style="display: flex; align-items: center; gap: 10px;">';
                html += `<input type="color" id="dayBlockBorder" value="${dayBlockBorder}" style="width: 60px; height: 40px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">`;
                html += `<input type="text" id="dayBlockBorderHex" value="${dayBlockBorder}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;" readonly>`;
                html += '</div></div>';
                
                // Padding
                html += '<div class="wizard-form-group">';
                html += '<label for="dayBlockPadding">Padding (px)</label>';
                html += '<div style="display: flex; align-items: center; gap: 10px;">';
                html += `<input type="range" id="dayBlockPadding" class="wizard-range" min="5" max="30" step="1" value="${dayBlockPadding}" style="flex: 1;">`;
                html += `<span id="dayBlockPaddingValue" style="min-width: 50px; font-weight: 600;">${dayBlockPadding}px</span>`;
                html += '</div></div>';
                
                // Spacing
                html += '<div class="wizard-form-group">';
                html += '<label for="daySpacing">Spacing Between Days (px)</label>';
                html += '<div style="display: flex; align-items: center; gap: 10px;">';
                html += `<input type="range" id="daySpacing" class="wizard-range" min="5" max="40" step="5" value="${daySpacing}" style="flex: 1;">`;
                html += `<span id="daySpacingValue" style="min-width: 50px; font-weight: 600;">${daySpacing}px</span>`;
                html += '</div></div>';
                
                html += '</div>';
                
                // Live Preview
                html += '<div class="style-section" style="margin-top: 25px;">';
                html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">';
                html += '👁️ Preview</h3>';
                html += '<div id="dayPreview" style="padding: 20px; background: #f8f9fa; border-radius: 8px;">';
                html += this.renderDayPreview(data);
                html += '</div></div>';
                
                html += '</div>';
                return html;
            },
            renderDayPreview: (data) => {
                const dayHeaderSize = data.dayHeaderSize || '1.2em';
                const dayHeaderColor = data.dayHeaderColor || '#333333';
                const dayBlockBg = data.dayBlockBg || '#ffffff';
                const dayBlockBorder = data.dayBlockBorder || '#ddd';
                const dayBlockPadding = data.dayBlockPadding || 15;
                
                return `
                    <div style="
                        background: ${dayBlockBg};
                        border: 2px solid ${dayBlockBorder};
                        padding: ${dayBlockPadding}px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <div style="
                            font-size: ${dayHeaderSize};
                            color: ${dayHeaderColor};
                            font-weight: bold;
                            margin-bottom: 12px;
                        ">Monday</div>
                        <div style="color: #666; font-size: 0.95em;">
                            <div style="margin-bottom: 8px;">1. Breakfast - Oatmeal with berries</div>
                            <div style="margin-bottom: 8px;">2. Lunch - Grilled chicken salad</div>
                            <div>3. Dinner - Pasta with vegetables</div>
                        </div>
                    </div>
                `;
            },
            attachListeners: (wizard) => {
                // Day Header Size
                const dayHeaderSize = document.getElementById('dayHeaderSize');
                const dayHeaderSizeValue = document.getElementById('dayHeaderSizeValue');
                if (dayHeaderSize && dayHeaderSizeValue) {
                    dayHeaderSize.addEventListener('input', function() {
                        const value = this.value + 'em';
                        dayHeaderSizeValue.textContent = value;
                        wizard.wizardData.dayHeaderSize = value;
                        window.WizardSteps.updatePreview(wizard);
                    });
                }
                
                // Day Header Color
                const dayHeaderColor = document.getElementById('dayHeaderColor');
                const dayHeaderColorHex = document.getElementById('dayHeaderColorHex');
                if (dayHeaderColor && dayHeaderColorHex) {
                    dayHeaderColor.addEventListener('input', function() {
                        dayHeaderColorHex.value = this.value;
                        wizard.wizardData.dayHeaderColor = this.value;
                        window.WizardSteps.updatePreview(wizard);
                    });
                }
                
                // Day Block Background
                const dayBlockBg = document.getElementById('dayBlockBg');
                const dayBlockBgHex = document.getElementById('dayBlockBgHex');
                if (dayBlockBg && dayBlockBgHex) {
                    dayBlockBg.addEventListener('input', function() {
                        dayBlockBgHex.value = this.value;
                        wizard.wizardData.dayBlockBg = this.value;
                        window.WizardSteps.updatePreview(wizard);
                    });
                }
                
                // Day Block Border
                const dayBlockBorder = document.getElementById('dayBlockBorder');
                const dayBlockBorderHex = document.getElementById('dayBlockBorderHex');
                if (dayBlockBorder && dayBlockBorderHex) {
                    dayBlockBorder.addEventListener('input', function() {
                        dayBlockBorderHex.value = this.value;
                        wizard.wizardData.dayBlockBorder = this.value;
                        window.WizardSteps.updatePreview(wizard);
                    });
                }
                
                // Day Block Padding
                const dayBlockPadding = document.getElementById('dayBlockPadding');
                const dayBlockPaddingValue = document.getElementById('dayBlockPaddingValue');
                if (dayBlockPadding && dayBlockPaddingValue) {
                    dayBlockPadding.addEventListener('input', function() {
                        const value = this.value;
                        dayBlockPaddingValue.textContent = value + 'px';
                        wizard.wizardData.dayBlockPadding = parseInt(value);
                        window.WizardSteps.updatePreview(wizard);
                    });
                }
                
                // Day Spacing
                const daySpacing = document.getElementById('daySpacing');
                const daySpacingValue = document.getElementById('daySpacingValue');
                if (daySpacing && daySpacingValue) {
                    daySpacing.addEventListener('input', function() {
                        const value = this.value;
                        daySpacingValue.textContent = value + 'px';
                        wizard.wizardData.daySpacing = parseInt(value);
                        // Spacing affects layout, not just preview
                    });
                }
            },
            validate: (data) => {
                return { valid: true };
            },
            collectData: () => {
                // Data is already collected via input listeners
                return {};
            }
        },
        {
            id: 3,
            title: '🍽️ Meal Display Options',
            description: 'Choose what meal information to show',
            renderContent: (data) => {
                // Set defaults
                const showMealTitles = data.showMealTitles !== undefined ? data.showMealTitles : true;
                const showIngredients = data.showIngredients !== undefined ? data.showIngredients : true;
                const ingredientDisplay = data.ingredientDisplay || 'list';
                const showPortions = data.showPortions !== undefined ? data.showPortions : true;
                const showCalories = data.showCalories !== undefined ? data.showCalories : false;
                const highlightAllergens = data.highlightAllergens !== undefined ? data.highlightAllergens : true;
                const allergenStyle = data.allergenStyle || 'underline';
                
                let html = '<div class="meal-display-options">';
                
                // Basic Display Options
                html += '<div class="style-section">';
                html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">✅ What to Display</h3>';
                
                // Show Meal Titles
                html += '<div class="wizard-checkbox-group">';
                html += '<label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showMealTitles" ${showMealTitles ? 'checked' : ''}>`;
                html += '<span>Show meal titles (Breakfast, Lunch, Dinner)</span>';
                html += '</label></div>';
                
                // Show Ingredients
                html += '<div class="wizard-checkbox-group">';
                html += '<label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showIngredients" ${showIngredients ? 'checked' : ''}>`;
                html += '<span>Show ingredients</span>';
                html += '</label></div>';
                
                // Ingredient Display Style (conditional)
                if (showIngredients) {
                    html += '<div class="wizard-radio-group" style="margin-left: 30px; margin-top: 10px;">';
                    html += '<label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666;">Ingredient display style:</label>';
                    
                    html += '<label class="wizard-radio-label">';
                    html += `<input type="radio" name="ingredientDisplay" value="list" ${ingredientDisplay === 'list' ? 'checked' : ''}>`;
                    html += '<span>List (comma-separated)</span>';
                    html += '</label>';
                    
                    html += '<label class="wizard-radio-label">';
                    html += `<input type="radio" name="ingredientDisplay" value="inline" ${ingredientDisplay === 'inline' ? 'checked' : ''}>`;
                    html += '<span>Inline (brief)</span>';
                    html += '</label>';
                    
                    html += '</div>';
                }
                
                // Show Portions
                html += '<div class="wizard-checkbox-group">';
                html += '<label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showPortions" ${showPortions ? 'checked' : ''}>`;
                html += '<span>Show portion sizes (e.g., 250g)</span>';
                html += '</label></div>';
                
                // Show Calories
                html += '<div class="wizard-checkbox-group">';
                html += '<label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="showCalories" ${showCalories ? 'checked' : ''}>`;
                html += '<span>Show calories</span>';
                html += '</label></div>';
                
                html += '</div>';
                
                // Allergen Highlighting
                html += '<div class="style-section" style="margin-top: 25px;">';
                html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">⚠️ Allergen Highlighting</h3>';
                
                html += '<div class="wizard-checkbox-group">';
                html += '<label class="wizard-checkbox-label">';
                html += `<input type="checkbox" id="highlightAllergens" ${highlightAllergens ? 'checked' : ''}>`;
                html += '<span>Highlight allergens in ingredients</span>';
                html += '</label></div>';
                
                // Allergen Style (conditional)
                if (highlightAllergens) {
                    html += '<div class="wizard-radio-group" style="margin-left: 30px; margin-top: 10px;">';
                    html += '<label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666;">Highlight style:</label>';
                    
                    html += '<label class="wizard-radio-label">';
                    html += `<input type="radio" name="allergenStyle" value="underline" ${allergenStyle === 'underline' ? 'checked' : ''}>`;
                    html += '<span>Underline (subtle)</span>';
                    html += '</label>';
                    
                    html += '<label class="wizard-radio-label">';
                    html += `<input type="radio" name="allergenStyle" value="bold" ${allergenStyle === 'bold' ? 'checked' : ''}>`;
                    html += '<span>Bold text</span>';
                    html += '</label>';
                    
                    html += '<label class="wizard-radio-label">';
                    html += `<input type="radio" name="allergenStyle" value="background" ${allergenStyle === 'background' ? 'checked' : ''}>`;
                    html += '<span>Background highlight</span>';
                    html += '</label>';
                    
                    html += '</div>';
                }
                
                html += '</div>';
                
                // Preview
                html += '<div class="style-section" style="margin-top: 25px;">';
                html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">👁️ Preview</h3>';
                html += '<div id="mealDisplayPreview" style="padding: 20px; background: #f8f9fa; border-radius: 8px;">';
                html += this.renderMealPreview(data);
                html += '</div></div>';
                
                html += '</div>';
                return html;
            },
            renderMealPreview: (data) => {
                const showMealTitles = data.showMealTitles !== undefined ? data.showMealTitles : true;
                const showIngredients = data.showIngredients !== undefined ? data.showIngredients : true;
                const showPortions = data.showPortions !== undefined ? data.showPortions : true;
                const showCalories = data.showCalories !== undefined ? data.showCalories : false;
                const highlightAllergens = data.highlightAllergens !== undefined ? data.highlightAllergens : true;
                const allergenStyle = data.allergenStyle || 'underline';
                
                let html = '<div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
                
                // Meal 1
                if (showMealTitles) {
                    html += '<div style="font-weight: bold; color: #ff6b35; margin-bottom: 8px;">1. Breakfast</div>';
                }
                html += '<div style="font-size: 1rem; font-weight: 500; color: #333;">';
                html += 'Oatmeal with Mixed Berries';
                if (showPortions || showCalories) {
                    html += '<span style="font-size: 0.85rem; color: #888; font-weight: normal;"> (';
                    const parts = [];
                    if (showPortions) parts.push('250g');
                    if (showCalories) parts.push('320 cal');
                    html += parts.join(', ');
                    html += ')</span>';
                }
                html += '</div>';
                
                if (showIngredients) {
                    html += '<div style="font-size: 0.9rem; color: #666; margin-top: 5px; margin-bottom: 15px;">';
                    
                    // Sample ingredients with one allergen
                    const ingredients = ['Oats', 'Blueberries', 'Strawberries', 'Milk', 'Honey'];
                    const allergenIngredient = 'Milk';
                    
                    html += ingredients.map(ing => {
                        if (highlightAllergens && ing === allergenIngredient) {
                            if (allergenStyle === 'underline') {
                                return `<span style="text-decoration: underline; text-decoration-color: #dc3545; text-decoration-thickness: 2px;">${ing}</span>`;
                            } else if (allergenStyle === 'bold') {
                                return `<strong style="color: #dc3545;">${ing}</strong>`;
                            } else if (allergenStyle === 'background') {
                                return `<span style="background: #ffe5e5; padding: 2px 4px; border-radius: 3px; color: #dc3545;">${ing}</span>`;
                            }
                        }
                        return ing;
                    }).join(', ');
                    
                    html += '</div>';
                } else {
                    html += '<div style="height: 10px;"></div>';
                }
                
                // Meal 2
                if (showMealTitles) {
                    html += '<div style="font-weight: bold; color: #ff6b35; margin-bottom: 8px;">2. Lunch</div>';
                }
                html += '<div style="font-size: 1rem; font-weight: 500; color: #333;">';
                html += 'Grilled Chicken Salad';
                if (showPortions || showCalories) {
                    html += '<span style="font-size: 0.85rem; color: #888; font-weight: normal;"> (';
                    const parts = [];
                    if (showPortions) parts.push('300g');
                    if (showCalories) parts.push('450 cal');
                    html += parts.join(', ');
                    html += ')</span>';
                }
                html += '</div>';
                
                if (showIngredients) {
                    html += '<div style="font-size: 0.9rem; color: #666; margin-top: 5px;">';
                    html += 'Chicken breast, Mixed greens, Cherry tomatoes, Olive oil';
                    html += '</div>';
                }
                
                html += '</div>';
                return html;
            },
            attachListeners: (wizard) => {
                // Show Meal Titles
                const showMealTitles = document.getElementById('showMealTitles');
                if (showMealTitles) {
                    showMealTitles.addEventListener('change', function() {
                        wizard.wizardData.showMealTitles = this.checked;
                        window.WizardSteps.updateMealPreview(wizard);
                    });
                }
                
                // Show Ingredients
                const showIngredients = document.getElementById('showIngredients');
                if (showIngredients) {
                    showIngredients.addEventListener('change', function() {
                        wizard.wizardData.showIngredients = this.checked;
                        // Re-render to show/hide ingredient display options
                        wizard.showStep(wizard.currentStep);
                    });
                }
                
                // Ingredient Display Style
                const ingredientRadios = document.querySelectorAll('input[name="ingredientDisplay"]');
                ingredientRadios.forEach(radio => {
                    radio.addEventListener('change', function() {
                        wizard.wizardData.ingredientDisplay = this.value;
                        window.WizardSteps.updateMealPreview(wizard);
                    });
                });
                
                // Show Portions
                const showPortions = document.getElementById('showPortions');
                if (showPortions) {
                    showPortions.addEventListener('change', function() {
                        wizard.wizardData.showPortions = this.checked;
                        window.WizardSteps.updateMealPreview(wizard);
                    });
                }
                
                // Show Calories
                const showCalories = document.getElementById('showCalories');
                if (showCalories) {
                    showCalories.addEventListener('change', function() {
                        wizard.wizardData.showCalories = this.checked;
                        window.WizardSteps.updateMealPreview(wizard);
                    });
                }
                
                // Highlight Allergens
                const highlightAllergens = document.getElementById('highlightAllergens');
                if (highlightAllergens) {
                    highlightAllergens.addEventListener('change', function() {
                        wizard.wizardData.highlightAllergens = this.checked;
                        // Re-render to show/hide allergen style options
                        wizard.showStep(wizard.currentStep);
                    });
                }
                
                // Allergen Style
                const allergenRadios = document.querySelectorAll('input[name="allergenStyle"]');
                allergenRadios.forEach(radio => {
                    radio.addEventListener('change', function() {
                        wizard.wizardData.allergenStyle = this.value;
                        window.WizardSteps.updateMealPreview(wizard);
                    });
                });
            },
            validate: (data) => {
                return { valid: true };
            },
            collectData: () => {
                return {};
            }
        },
        {
            id: 4,
            title: '🎨 Typography & Colors',
            description: 'Customize fonts and color scheme',
            renderContent: (data) => {
                return `
                    <div class="step-placeholder">
                        <p>🎨 Typography and color customization will be implemented in Phase 5</p>
                        <p class="text-muted">You'll be able to adjust:</p>
                        <ul>
                            <li>Font sizes (headers, day names, meal text)</li>
                            <li>Color pickers for primary, background, text, borders</li>
                            <li>Theme presets (Orange, Teal, Dark, etc.)</li>
                        </ul>
                    </div>
                `;
            },
            validate: (data) => {
                return { valid: true };
            },
            collectData: () => {
                return {};
            }
        },
        {
            id: 5,
            title: '✅ Content Options',
            description: 'Header, footer, and additional content settings',
            renderContent: (data) => {
                return `
                    <div class="step-placeholder">
                        <p>🎨 Content options will be implemented in Phase 6</p>
                        <p class="text-muted">You'll be able to configure:</p>
                        <ul>
                            <li>Show/hide header with custom text</li>
                            <li>Header alignment (left, center, right)</li>
                            <li>Show/hide date range</li>
                            <li>Date format options</li>
                            <li>Show/hide footer with custom text</li>
                            <li>Page border toggle</li>
                        </ul>
                    </div>
                `;
            },
            validate: (data) => {
                return { valid: true };
            },
            collectData: () => {
                return {};
            }
        },
        {
            id: 6,
            title: '👀 Preview & Save',
            description: 'Review your template and save it',
            renderContent: (data) => {
                return `
                    <div class="step-placeholder">
                        <p>🎨 Preview and save functionality will be implemented in Phase 7</p>
                        <p class="text-muted">You'll be able to:</p>
                        <ul>
                            <li>See a full-size preview with real meal data</li>
                            <li>Test with your actual meals</li>
                            <li>Name and save your template</li>
                            <li>Export options (PDF, Print)</li>
                            <li>Start over or switch to Advanced Mode</li>
                        </ul>
                        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <h4>📋 Your Template Settings:</h4>
                            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
            },
            validate: (data) => {
                // Could add template name validation here
                return { valid: true };
            },
            collectData: () => {
                return {};
            }
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
    
    getStep(stepNumber) {
        return this.steps.find(step => step.id === stepNumber) || null;
    },
    
    getAllSteps() {
        return this.steps;
    }
};
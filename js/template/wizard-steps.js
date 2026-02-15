/**
 * Wizard Steps Definitions
 * Phase 1: Step structure with placeholders
 * 
 * Each step has:
 * - title: Step title
 * - description: Brief description
 * - render(wizardData): Returns HTML for step content
 * - bind(wizardData, updateCallback): Binds event listeners
 * - validate(wizardData): Returns {valid: boolean, message: string}
 */

window.WizardSteps = [
    // STEP 1: Layout Selection
    {
        title: 'Choose Your Layout',
        description: 'Select a layout style for your meal plan template',
        
        render(wizardData) {
            return `
                <div class="wizard-placeholder">
                    <div class="wizard-placeholder-icon">📐</div>
                    <h3>Layout Picker</h3>
                    <p>Visual layout selection will be implemented in Phase 2</p>
                    <div class="wizard-placeholder-preview">
                        <p><strong>Current Selection:</strong> ${wizardData.layoutStyle}</p>
                        <small>Choose from 11 professional layouts</small>
                    </div>
                </div>
            `;
        },
        
        bind(wizardData, updateCallback) {
            // Placeholder - will bind layout selection in Phase 2
        },
        
        validate(wizardData) {
            // Layout is required
            if (!wizardData.layoutStyle) {
                return { valid: false, message: 'Please select a layout style.' };
            }
            return { valid: true };
        }
    },
    
    // STEP 2: Week Styling
    {
        title: 'Week Styling',
        description: 'Customize how days of the week appear in your template',
        
        render(wizardData) {
            return `
                <div class="wizard-placeholder">
                    <div class="wizard-placeholder-icon">🗓️</div>
                    <h3>Day & Week Customization</h3>
                    <p>Day styling options will be implemented in Phase 3</p>
                    <div class="wizard-placeholder-preview">
                        <p><strong>Current Settings:</strong></p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Day name size: ${wizardData.dayNameSize}px</li>
                            <li>Day block background: ${wizardData.dayBlockBg}</li>
                            <li>Day block padding: ${wizardData.dayBlockPadding}px</li>
                        </ul>
                    </div>
                </div>
            `;
        },
        
        bind(wizardData, updateCallback) {
            // Placeholder - will bind styling controls in Phase 3
        },
        
        validate(wizardData) {
            return { valid: true };
        }
    },
    
    // STEP 3: Meal Display Options
    {
        title: 'Meal Display Options',
        description: 'Choose what meal information to show and how to display it',
        
        render(wizardData) {
            return `
                <div class="wizard-placeholder">
                    <div class="wizard-placeholder-icon">🍽️</div>
                    <h3>Meal Information Display</h3>
                    <p>Meal display options will be implemented in Phase 4</p>
                    <div class="wizard-placeholder-preview">
                        <p><strong>Current Settings:</strong></p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Show meal titles: ${wizardData.showMealTitles ? 'Yes' : 'No'}</li>
                            <li>Show ingredients: ${wizardData.showIngredients ? 'Yes' : 'No'}</li>
                            <li>Ingredient layout: ${wizardData.ingredientLayout}</li>
                        </ul>
                    </div>
                </div>
            `;
        },
        
        bind(wizardData, updateCallback) {
            // Placeholder - will bind meal display controls in Phase 4
        },
        
        validate(wizardData) {
            return { valid: true };
        }
    },
    
    // STEP 4: Typography & Colors
    {
        title: 'Typography & Colors',
        description: 'Customize fonts, sizes, and color scheme',
        
        render(wizardData) {
            return `
                <div class="wizard-placeholder">
                    <div class="wizard-placeholder-icon">🎨</div>
                    <h3>Design & Colors</h3>
                    <p>Typography and color options will be implemented in Phase 5</p>
                    <div class="wizard-placeholder-preview">
                        <p><strong>Current Settings:</strong></p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Background color: ${wizardData.backgroundColor}</li>
                            <li>Header size: ${wizardData.headerSize}px</li>
                            <li>Meal title color: ${wizardData.mealTitleColor}</li>
                        </ul>
                    </div>
                </div>
            `;
        },
        
        bind(wizardData, updateCallback) {
            // Placeholder - will bind typography controls in Phase 5
        },
        
        validate(wizardData) {
            return { valid: true };
        }
    },
    
    // STEP 5: Content Options
    {
        title: 'Content Options',
        description: 'Configure header, footer, and additional content',
        
        render(wizardData) {
            return `
                <div class="wizard-placeholder">
                    <div class="wizard-placeholder-icon">✔️</div>
                    <h3>Header & Footer Content</h3>
                    <p>Content options will be implemented in Phase 6</p>
                    <div class="wizard-placeholder-preview">
                        <p><strong>Current Settings:</strong></p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Show header: ${wizardData.showHeader ? 'Yes' : 'No'}</li>
                            <li>Header text: "${wizardData.headerText}"</li>
                            <li>Show footer: ${wizardData.showFooter ? 'Yes' : 'No'}</li>
                            <li>Show date range: ${wizardData.showDateRange ? 'Yes' : 'No'}</li>
                        </ul>
                    </div>
                </div>
            `;
        },
        
        bind(wizardData, updateCallback) {
            // Placeholder - will bind content controls in Phase 6
        },
        
        validate(wizardData) {
            return { valid: true };
        }
    },
    
    // STEP 6: Preview & Save
    {
        title: 'Preview & Save',
        description: 'Review your template and save it for use',
        
        render(wizardData) {
            return `
                <div class="wizard-placeholder">
                    <div class="wizard-placeholder-icon">👀</div>
                    <h3>Final Preview</h3>
                    <p>Preview and save functionality will be implemented in Phase 7</p>
                    <div class="wizard-placeholder-preview">
                        <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin-top: 0;">Your Template Summary:</h4>
                            <p><strong>Layout:</strong> ${wizardData.layoutStyle}</p>
                            <p><strong>Header:</strong> "${wizardData.headerText}"</p>
                            <p><strong>Background:</strong> ${wizardData.backgroundColor}</p>
                            <p><strong>Features:</strong></p>
                            <ul style="text-align: left; display: inline-block; margin: 10px 0;">
                                <li>Meal titles: ${wizardData.showMealTitles ? '✓' : '✗'}</li>
                                <li>Ingredients: ${wizardData.showIngredients ? '✓' : '✗'}</li>
                                <li>Date range: ${wizardData.showDateRange ? '✓' : '✗'}</li>
                                <li>Footer: ${wizardData.showFooter ? '✓' : '✗'}</li>
                            </ul>
                        </div>
                        <p><em>Click "Complete & Preview" to finish!</em></p>
                    </div>
                </div>
            `;
        },
        
        bind(wizardData, updateCallback) {
            // Placeholder - will bind preview controls in Phase 7
        },
        
        validate(wizardData) {
            // All steps complete
            return { valid: true };
        }
    }
];

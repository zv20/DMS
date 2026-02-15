/**
 * Wizard Steps Definitions
 * Phase 1: Placeholder step definitions
 * 
 * Each step will be fully implemented in subsequent phases
 * This file defines the structure and validation for each step
 */

window.WizardSteps = {
    steps: [
        {
            id: 1,
            title: '📐 Choose Your Layout',
            description: 'Select how you want your meal plan to be displayed',
            renderContent: (data) => {
                return `
                    <div class="step-placeholder">
                        <p>🎨 Layout selection will be implemented in Phase 2</p>
                        <p class="text-muted">You'll be able to choose from 11 different layout styles:</p>
                        <ul>
                            <li>Grid Cards</li>
                            <li>Timeline Style</li>
                            <li>Minimal Clean</li>
                            <li>And more...</li>
                        </ul>
                        <p class="text-muted">Current selection: <strong>${data.layoutStyle}</strong></p>
                    </div>
                `;
            },
            validate: (data) => {
                return { valid: true };
            },
            collectData: () => {
                // Placeholder - will collect layout selection
                return {};
            }
        },
        {
            id: 2,
            title: '🗓️ Week Styling',
            description: 'Customize how days of the week appear',
            renderContent: (data) => {
                return `
                    <div class="step-placeholder">
                        <p>🎨 Week styling options will be implemented in Phase 3</p>
                        <p class="text-muted">You'll be able to customize:</p>
                        <ul>
                            <li>Day header font size and color</li>
                            <li>Day block background and borders</li>
                            <li>Spacing between days</li>
                            <li>Apply to all days or customize individually</li>
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
            id: 3,
            title: '🍽️ Meal Display Options',
            description: 'Choose what meal information to show',
            renderContent: (data) => {
                return `
                    <div class="step-placeholder">
                        <p>🎨 Meal display options will be implemented in Phase 4</p>
                        <p class="text-muted">You'll be able to toggle:</p>
                        <ul>
                            <li>Show/hide meal titles</li>
                            <li>Ingredient display (list, inline, hidden)</li>
                            <li>Portion sizes visibility</li>
                            <li>Calorie display</li>
                            <li>Allergen highlighting</li>
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
                            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
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
    
    getStep(stepNumber) {
        return this.steps.find(step => step.id === stepNumber) || null;
    },
    
    getAllSteps() {
        return this.steps;
    }
};
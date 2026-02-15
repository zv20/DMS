/**
 * Wizard Steps Definitions
 * Phase 2: Step 1 - Layout Selection (IMPLEMENTED)
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
    
    getStep(stepNumber) {
        return this.steps.find(step => step.id === stepNumber) || null;
    },
    
    getAllSteps() {
        return this.steps;
    }
};
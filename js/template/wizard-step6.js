/**
 * Wizard Step 6: Preview & Save
 * Phase 7: Final preview, template naming, and save functionality
 */

// Add Step 6 to wizard steps
window.WizardSteps.steps.push(
    {
        id: 6,
        title: '👀 Preview & Save',
        description: 'Review your template and save it',
        renderContent: (data) => {
            const templateName = data.templateName || '';
            
            let html = '<div class="preview-save">';
            
            // Template Name Section
            html += '<div class="style-section">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">💾 Save Your Template</h3>';
            html += '<div class="wizard-form-group">';
            html += '<label for="templateName">Template Name *</label>';
            html += `<input type="text" id="templateName" class="wizard-input" value="${templateName}" placeholder="e.g., My Weekly Meal Plan" required>`;
            html += '<small style="color: #666; font-size: 0.85rem;">Give your template a memorable name</small>';
            html += '</div>';
            html += '</div>';
            
            // Preview Options
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">👁️ Preview Modes</h3>';
            html += '<div class="preview-mode-buttons">';
            html += '<button class="preview-mode-btn active" data-mode="desktop">🖥️ Desktop</button>';
            html += '<button class="preview-mode-btn" data-mode="tablet">📱 Tablet</button>';
            html += '<button class="preview-mode-btn" data-mode="mobile">📱 Mobile</button>';
            html += '</div>';
            html += '</div>';
            
            // Live Preview
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">📋 Template Preview</h3>';
            html += '<div id="fullTemplatePreview" class="template-preview-container desktop-mode">';
            html += this.renderFullPreview(data);
            html += '</div>';
            html += '</div>';
            
            // Settings Summary
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">📊 Template Summary</h3>';
            html += '<div class="settings-summary">';
            html += this.renderSettingsSummary(data);
            html += '</div>';
            html += '</div>';
            
            // Action Buttons
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">🎯 What\'s Next?</h3>';
            html += '<div class="action-buttons-grid">';
            html += '<button class="action-btn save-btn" id="saveTemplateBtn">';
            html += '<span class="action-btn-icon">💾</span>';
            html += '<span class="action-btn-text">Save Template</span>';
            html += '<span class="action-btn-desc">Save and use this template</span>';
            html += '</button>';
            html += '<button class="action-btn export-btn" id="exportPdfBtn">';
            html += '<span class="action-btn-icon">📄</span>';
            html += '<span class="action-btn-text">Export PDF</span>';
            html += '<span class="action-btn-desc">Download as PDF</span>';
            html += '</button>';
            html += '<button class="action-btn print-btn" id="printBtn">';
            html += '<span class="action-btn-icon">🖨️</span>';
            html += '<span class="action-btn-text">Print</span>';
            html += '<span class="action-btn-desc">Print your meal plan</span>';
            html += '</button>';
            html += '<button class="action-btn restart-btn" id="restartBtn">';
            html += '<span class="action-btn-icon">🔄</span>';
            html += '<span class="action-btn-text">Start Over</span>';
            html += '<span class="action-btn-desc">Create a new template</span>';
            html += '</button>';
            html += '</div>';
            html += '</div>';
            
            html += '</div>';
            return html;
        },
        renderFullPreview: (data) => {
            // Get all settings
            const layoutStyle = data.layoutStyle || 'grid';
            const dayHeaderSize = data.dayHeaderSize || '1.2em';
            const dayHeaderColor = data.dayHeaderColor || '#333333';
            const dayBlockBg = data.dayBlockBg || '#ffffff';
            const dayBlockBorder = data.dayBlockBorder || '#ddd';
            const dayBlockPadding = data.dayBlockPadding || 15;
            const daySpacing = data.daySpacing || 15;
            const showMealTitles = data.showMealTitles !== undefined ? data.showMealTitles : true;
            const showIngredients = data.showIngredients !== undefined ? data.showIngredients : true;
            const showPortions = data.showPortions !== undefined ? data.showPortions : true;
            const showCalories = data.showCalories !== undefined ? data.showCalories : false;
            const primaryColor = data.primaryColor || '#ff6b35';
            const backgroundColor = data.backgroundColor || '#ffffff';
            const textColor = data.textColor || '#333333';
            const headerFontSize = data.headerFontSize || 2;
            const mealFontSize = data.mealFontSize || 1;
            const showHeader = data.showHeader !== undefined ? data.showHeader : true;
            const headerText = data.headerText || 'Weekly Meal Plan';
            const headerAlignment = data.headerAlignment || 'center';
            const showDateRange = data.showDateRange !== undefined ? data.showDateRange : true;
            const dateFormat = data.dateFormat || 'long';
            const showFooter = data.showFooter !== undefined ? data.showFooter : false;
            const footerText = data.footerText || 'Prepared with love';
            const showPageBorder = data.showPageBorder !== undefined ? data.showPageBorder : true;
            
            // Format date
            let dateRangeText = '';
            if (dateFormat === 'short') {
                dateRangeText = 'Feb 15 - Feb 21, 2026';
            } else if (dateFormat === 'long') {
                dateRangeText = 'February 15 - February 21, 2026';
            } else if (dateFormat === 'numeric') {
                dateRangeText = '02/15/2026 - 02/21/2026';
            }
            
            // Sample meal data
            const days = [
                {
                    name: 'Monday',
                    meals: [
                        { title: 'Breakfast', name: 'Oatmeal with Berries', portion: '250g', calories: 320 },
                        { title: 'Lunch', name: 'Grilled Chicken Salad', portion: '300g', calories: 450 },
                        { title: 'Dinner', name: 'Pasta Primavera', portion: '350g', calories: 520 }
                    ]
                },
                {
                    name: 'Tuesday',
                    meals: [
                        { title: 'Breakfast', name: 'Greek Yogurt Parfait', portion: '200g', calories: 280 },
                        { title: 'Lunch', name: 'Turkey Sandwich', portion: '250g', calories: 420 },
                        { title: 'Dinner', name: 'Baked Salmon', portion: '300g', calories: 480 }
                    ]
                },
                {
                    name: 'Wednesday',
                    meals: [
                        { title: 'Breakfast', name: 'Scrambled Eggs & Toast', portion: '220g', calories: 340 },
                        { title: 'Lunch', name: 'Quinoa Bowl', portion: '280g', calories: 390 },
                        { title: 'Dinner', name: 'Chicken Stir-Fry', portion: '320g', calories: 460 }
                    ]
                }
            ];
            
            let html = `<div class="template-preview" style="
                background: ${backgroundColor};
                padding: 30px;
                border-radius: 8px;
                ${showPageBorder ? `border: 4px solid ${primaryColor};` : ''}
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 100%;
                overflow: hidden;
            ">`;
            
            // Header
            if (showHeader) {
                html += `<div style="
                    font-size: ${headerFontSize}em;
                    color: ${primaryColor};
                    font-weight: bold;
                    margin-bottom: ${showDateRange ? '8px' : '25px'};
                    text-align: ${headerAlignment};
                ">${headerText}</div>`;
            }
            
            // Date Range
            if (showDateRange) {
                html += `<div style="
                    font-size: 0.95em;
                    color: ${textColor};
                    opacity: 0.7;
                    margin-bottom: 25px;
                    text-align: ${headerAlignment};
                ">${dateRangeText}</div>`;
            }
            
            // Days
            days.forEach((day, index) => {
                html += `<div style="
                    background: ${dayBlockBg};
                    border: 2px solid ${dayBlockBorder};
                    padding: ${dayBlockPadding}px;
                    border-radius: 8px;
                    margin-bottom: ${daySpacing}px;
                ">`;
                
                // Day name
                html += `<div style="
                    font-size: ${dayHeaderSize};
                    color: ${dayHeaderColor};
                    font-weight: bold;
                    margin-bottom: 12px;
                ">${day.name}</div>`;
                
                // Meals
                day.meals.forEach((meal, mealIndex) => {
                    html += '<div style="margin-bottom: 10px;">';
                    
                    if (showMealTitles) {
                        html += `<div style="
                            font-size: ${mealFontSize * 0.9}em;
                            color: ${primaryColor};
                            font-weight: 600;
                            margin-bottom: 3px;
                        ">${mealIndex + 1}. ${meal.title}</div>`;
                    }
                    
                    html += `<div style="
                        font-size: ${mealFontSize}em;
                        color: ${textColor};
                    ">${meal.name}`;
                    
                    if (showPortions || showCalories) {
                        html += '<span style="font-size: 0.85em; color: #888;"> (';
                        const parts = [];
                        if (showPortions) parts.push(meal.portion);
                        if (showCalories) parts.push(meal.calories + ' cal');
                        html += parts.join(', ');
                        html += ')</span>';
                    }
                    
                    html += '</div>';
                    
                    if (showIngredients && mealIndex === 0) {
                        html += `<div style="
                            font-size: 0.85em;
                            color: #666;
                            margin-top: 3px;
                        ">Ingredients: Oats, blueberries, strawberries, honey</div>`;
                    }
                    
                    html += '</div>';
                });
                
                html += '</div>';
            });
            
            // Footer
            if (showFooter) {
                html += `<div style="
                    font-size: 0.9em;
                    color: ${textColor};
                    opacity: 0.6;
                    margin-top: 25px;
                    text-align: center;
                    font-style: italic;
                ">${footerText}</div>`;
            }
            
            html += '</div>';
            return html;
        },
        renderSettingsSummary: (data) => {
            const layout = window.WizardSteps.layouts.find(l => l.id === (data.layoutStyle || 'grid'));
            
            let html = '<div class="summary-grid">';
            
            // Layout
            html += '<div class="summary-item">';
            html += '<div class="summary-label">Layout</div>';
            html += `<div class="summary-value">${layout ? layout.icon + ' ' + layout.name : 'Grid Cards'}</div>`;
            html += '</div>';
            
            // Colors
            html += '<div class="summary-item">';
            html += '<div class="summary-label">Theme Colors</div>';
            html += '<div class="summary-value" style="display: flex; gap: 5px;">';
            html += `<span style="display: inline-block; width: 20px; height: 20px; background: ${data.primaryColor || '#ff6b35'}; border-radius: 3px;"></span>`;
            html += `<span style="display: inline-block; width: 20px; height: 20px; background: ${data.backgroundColor || '#ffffff'}; border: 1px solid #ddd; border-radius: 3px;"></span>`;
            html += `<span style="display: inline-block; width: 20px; height: 20px; background: ${data.textColor || '#333333'}; border-radius: 3px;"></span>`;
            html += '</div></div>';
            
            // Display Options
            html += '<div class="summary-item">';
            html += '<div class="summary-label">Display Options</div>';
            html += '<div class="summary-value">';
            const displayOpts = [];
            if (data.showMealTitles !== false) displayOpts.push('Meal titles');
            if (data.showIngredients !== false) displayOpts.push('Ingredients');
            if (data.showPortions !== false) displayOpts.push('Portions');
            if (data.showCalories) displayOpts.push('Calories');
            html += displayOpts.join(', ') || 'Default';
            html += '</div></div>';
            
            // Header/Footer
            html += '<div class="summary-item">';
            html += '<div class="summary-label">Header & Footer</div>';
            html += '<div class="summary-value">';
            const headerFooter = [];
            if (data.showHeader !== false) headerFooter.push('Header');
            if (data.showDateRange !== false) headerFooter.push('Date range');
            if (data.showFooter) headerFooter.push('Footer');
            if (data.showPageBorder !== false) headerFooter.push('Border');
            html += headerFooter.join(', ') || 'Basic';
            html += '</div></div>';
            
            html += '</div>';
            return html;
        },
        attachListeners: (wizard) => {
            // Template Name Input
            const templateName = document.getElementById('templateName');
            if (templateName) {
                templateName.addEventListener('input', function() {
                    wizard.wizardData.templateName = this.value;
                });
            }
            
            // Preview Mode Buttons
            const previewButtons = document.querySelectorAll('.preview-mode-btn');
            const previewContainer = document.getElementById('fullTemplatePreview');
            
            previewButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    previewButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    
                    const mode = this.getAttribute('data-mode');
                    if (previewContainer) {
                        previewContainer.className = `template-preview-container ${mode}-mode`;
                    }
                });
            });
            
            // Save Template Button
            const saveBtn = document.getElementById('saveTemplateBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() {
                    const name = wizard.wizardData.templateName;
                    if (!name || name.trim() === '') {
                        alert('Please enter a template name before saving.');
                        templateName.focus();
                        return;
                    }
                    
                    // Save to localStorage
                    const templates = JSON.parse(localStorage.getItem('mealPlanTemplates') || '[]');
                    const newTemplate = {
                        id: Date.now(),
                        name: name,
                        data: wizard.wizardData,
                        createdAt: new Date().toISOString()
                    };
                    templates.push(newTemplate);
                    localStorage.setItem('mealPlanTemplates', JSON.stringify(templates));
                    
                    alert(`✅ Template "${name}" saved successfully!\n\nYou can now use this template to create meal plans.`);
                });
            }
            
            // Export PDF Button
            const exportPdfBtn = document.getElementById('exportPdfBtn');
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', function() {
                    alert('📄 PDF Export feature coming soon!\n\nThis will allow you to download your meal plan as a PDF.');
                });
            }
            
            // Print Button
            const printBtn = document.getElementById('printBtn');
            if (printBtn) {
                printBtn.addEventListener('click', function() {
                    window.print();
                });
            }
            
            // Restart Button
            const restartBtn = document.getElementById('restartBtn');
            if (restartBtn) {
                restartBtn.addEventListener('click', function() {
                    if (confirm('🔄 Start over?\n\nThis will clear all your current template settings. Are you sure?')) {
                        wizard.wizardData = {};
                        wizard.currentStep = 1;
                        wizard.showStep(1);
                    }
                });
            }
        },
        validate: (data) => {
            if (!data.templateName || data.templateName.trim() === '') {
                return { 
                    valid: false, 
                    message: 'Please enter a template name before finishing.' 
                };
            }
            return { valid: true };
        },
        collectData: () => {
            return {};
        }
    }
);
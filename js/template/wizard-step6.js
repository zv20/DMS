/**
 * Wizard Step 6: Preview & Save
 * Phase 7: Final preview, template naming, and save functionality
 */

// Add Step 6 to wizard steps
window.WizardSteps.steps.push({
    id: 6,
    title: '👀 Preview & Save',
    description: 'Review your template and save it',
    renderFullPreview: function(data) {
        const primaryColor = data.primaryColor || '#ff6b35';
        const backgroundColor = data.backgroundColor || '#ffffff';
        const textColor = data.textColor || '#333333';
        const dayBlockBg = data.dayBlockBg || '#ffffff';
        const dayBlockBorder = data.dayBlockBorder || '#dddddd';
        const showPageBorder = data.showPageBorder !== undefined ? data.showPageBorder : true;
        const showHeader = data.showHeader !== undefined ? data.showHeader : true;
        const headerText = data.headerText || 'Weekly Meal Plan';
        const showFooter = data.showFooter || false;
        const footerText = data.footerText || 'Prepared with love';
        
        let html = `<div style="background: ${backgroundColor}; padding: 30px; border-radius: 8px; ${showPageBorder ? `border: 4px solid ${primaryColor};` : ''} box-shadow: 0 4px 12px rgba(0,0,0,0.15);">`;
        
        if (showHeader) {
            html += `<div style="font-size: 1.8em; color: ${primaryColor}; font-weight: bold; margin-bottom: 20px; text-align: center;">${headerText}</div>`;
        }
        
        const days = ['Monday', 'Tuesday', 'Wednesday'];
        days.forEach(day => {
            html += `<div style="background: ${dayBlockBg}; border: 2px solid ${dayBlockBorder}; padding: 15px; border-radius: 8px; margin-bottom: 15px;"><div style="font-size: 1.2em; color: ${textColor}; font-weight: bold; margin-bottom: 10px;">${day}</div><div style="color: ${primaryColor}; font-weight: 600;">1. Breakfast</div><div style="color: ${textColor};">Oatmeal with Berries (250g, 320 cal)</div><div style="color: ${primaryColor}; font-weight: 600; margin-top: 8px;">2. Lunch</div><div style="color: ${textColor};">Grilled Chicken Salad (300g, 450 cal)</div><div style="color: ${primaryColor}; font-weight: 600; margin-top: 8px;">3. Dinner</div><div style="color: ${textColor};">Pasta Primavera (350g, 520 cal)</div></div>`;
        });
        
        if (showFooter) {
            html += `<div style="font-size: 0.9em; color: ${textColor}; opacity: 0.6; margin-top: 20px; text-align: center; font-style: italic;">${footerText}</div>`;
        }
        
        html += '</div>';
        return html;
    },
    renderSettingsSummary: function(data) {
        const layout = window.WizardSteps.layouts.find(l => l.id === (data.layoutStyle || 'grid'));
        let html = '<div class="summary-grid">';
        html += '<div class="summary-item"><div class="summary-label">Layout</div><div class="summary-value">' + (layout ? layout.icon + ' ' + layout.name : 'Grid Cards') + '</div></div>';
        html += '<div class="summary-item"><div class="summary-label">Theme Colors</div><div class="summary-value" style="display: flex; gap: 5px;">';
        html += `<span style="display: inline-block; width: 20px; height: 20px; background: ${data.primaryColor || '#ff6b35'}; border-radius: 3px;"></span>`;
        html += `<span style="display: inline-block; width: 20px; height: 20px; background: ${data.backgroundColor || '#ffffff'}; border: 1px solid #ddd; border-radius: 3px;"></span>`;
        html += `<span style="display: inline-block; width: 20px; height: 20px; background: ${data.textColor || '#333333'}; border-radius: 3px;"></span>`;
        html += '</div></div>';
        const displayOpts = [];
        if (data.showMealTitles !== false) displayOpts.push('Meal titles');
        if (data.showIngredients !== false) displayOpts.push('Ingredients');
        if (data.showPortions !== false) displayOpts.push('Portions');
        if (data.showCalories) displayOpts.push('Calories');
        html += '<div class="summary-item"><div class="summary-label">Display Options</div><div class="summary-value">' + (displayOpts.join(', ') || 'Default') + '</div></div>';
        html += '</div>';
        return html;
    },
    renderContent: function(data) {
        const templateName = data.templateName || '';
        let html = '<div class="preview-save"><div class="style-section"><h3>💾 Save Your Template</h3>';
        html += '<div class="wizard-form-group"><label>Template Name *</label>';
        html += `<input type="text" id="templateName" class="wizard-input" value="${templateName}" placeholder="e.g., My Weekly Meal Plan"></div></div>`;
        html += '<div class="style-section"><h3>👁️ Preview Modes</h3><div class="preview-mode-buttons">';
        html += '<button class="preview-mode-btn active" data-mode="desktop">🖥️ Desktop</button>';
        html += '<button class="preview-mode-btn" data-mode="tablet">📱 Tablet</button>';
        html += '<button class="preview-mode-btn" data-mode="mobile">📱 Mobile</button></div></div>';
        html += '<div class="style-section"><h3>📋 Template Preview</h3><div id="fullTemplatePreview" class="template-preview-container desktop-mode">';
        html += this.renderFullPreview(data);
        html += '</div></div>';
        html += '<div class="style-section"><h3>📊 Template Summary</h3><div class="settings-summary">' + this.renderSettingsSummary(data) + '</div></div>';
        html += '<div class="style-section"><h3>🎯 What\'s Next?</h3><div class="action-buttons-grid">';
        html += '<button class="action-btn save-btn" id="saveTemplateBtn"><span class="action-btn-icon">💾</span><span class="action-btn-text">Save Template</span><span class="action-btn-desc">Save and use this template</span></button>';
        html += '<button class="action-btn export-btn" id="exportPdfBtn"><span class="action-btn-icon">📄</span><span class="action-btn-text">Export PDF</span><span class="action-btn-desc">Download as PDF</span></button>';
        html += '<button class="action-btn print-btn" id="printBtn"><span class="action-btn-icon">🖨️</span><span class="action-btn-text">Print</span><span class="action-btn-desc">Print your meal plan</span></button>';
        html += '<button class="action-btn restart-btn" id="restartBtn"><span class="action-btn-icon">🔄</span><span class="action-btn-text">Start Over</span><span class="action-btn-desc">Create a new template</span></button>';
        html += '</div></div></div>';
        return html;
    },
    attachListeners: function(wizard) {
        const templateName = document.getElementById('templateName');
        if (templateName) {
            templateName.addEventListener('input', function() {
                wizard.wizardData.templateName = this.value;
            });
        }
        
        const previewButtons = document.querySelectorAll('.preview-mode-btn');
        const previewContainer = document.getElementById('fullTemplatePreview');
        previewButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                previewButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                if (previewContainer) {
                    previewContainer.className = `template-preview-container ${this.getAttribute('data-mode')}-mode`;
                }
            });
        });
        
        const saveBtn = document.getElementById('saveTemplateBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const name = wizard.wizardData.templateName;
                if (!name || name.trim() === '') {
                    alert('Please enter a template name before saving.');
                    templateName.focus();
                    return;
                }
                const templates = JSON.parse(localStorage.getItem('mealPlanTemplates') || '[]');
                const newTemplate = { id: Date.now(), name: name, data: wizard.wizardData, createdAt: new Date().toISOString() };
                templates.push(newTemplate);
                localStorage.setItem('mealPlanTemplates', JSON.stringify(templates));
                alert(`✅ Template "${name}" saved successfully!\n\nYou can now use this template to create meal plans.`);
            });
        }
        
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', function() {
                alert('📄 PDF Export feature coming soon!');
            });
        }
        
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                window.print();
            });
        }
        
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', function() {
                if (confirm('🔄 Start over? This will clear all your settings.')) {
                    wizard.wizardData = {};
                    wizard.currentStep = 1;
                    wizard.showStep(1);
                }
            });
        }
    },
    validate: (data) => ({ valid: true }),
    collectData: () => ({})
});

console.log('✅ Step 6 (Preview & Save) added to wizard');
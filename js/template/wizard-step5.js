/**
 * Wizard Step 5: Content Options
 * Phase 6: Header, Footer, Date Range, Page Border
 */

// Add Step 5 to wizard steps
window.WizardSteps.steps.push({
    id: 5,
    title: '✅ Content Options',
    description: 'Header, footer, and additional content settings',
    renderContentPreview: function(data) {
        const showHeader = data.showHeader !== undefined ? data.showHeader : true;
        const headerText = data.headerText || 'Weekly Meal Plan';
        const headerAlignment = data.headerAlignment || 'center';
        const showDateRange = data.showDateRange !== undefined ? data.showDateRange : true;
        const dateFormat = data.dateFormat || 'long';
        const showFooter = data.showFooter !== undefined ? data.showFooter : false;
        const footerText = data.footerText || 'Prepared with love';
        const showPageBorder = data.showPageBorder !== undefined ? data.showPageBorder : true;
        const primaryColor = data.primaryColor || '#ff6b35';
        const backgroundColor = data.backgroundColor || '#ffffff';
        const textColor = data.textColor || '#333333';
        
        let dateRangeText = '';
        if (dateFormat === 'short') {
            dateRangeText = 'Feb 15 - Feb 21, 2026';
        } else if (dateFormat === 'long') {
            dateRangeText = 'February 15 - February 21, 2026';
        } else if (dateFormat === 'numeric') {
            dateRangeText = '02/15/2026 - 02/21/2026';
        }
        
        let html = `<div style="background: ${backgroundColor}; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${showPageBorder ? `border: 3px solid ${primaryColor};` : ''}">`;
        
        if (showHeader) {
            html += `<div style="font-size: 1.8em; color: ${primaryColor}; font-weight: bold; margin-bottom: ${showDateRange ? '8px' : '20px'}; text-align: ${headerAlignment};">${headerText}</div>`;
        }
        
        if (showDateRange) {
            html += `<div style="font-size: 0.9em; color: ${textColor}; opacity: 0.7; margin-bottom: 20px; text-align: ${headerAlignment};">${dateRangeText}</div>`;
        }
        
        html += `<div style="border: 2px solid ${primaryColor}; border-radius: 8px; padding: 15px; margin: 15px 0; background: ${backgroundColor};"><div style="font-size: 1.1em; color: ${textColor}; font-weight: bold; margin-bottom: 10px;">Monday</div><div style="color: ${textColor}; font-size: 0.9em;">1. Breakfast - Oatmeal<br>2. Lunch - Salad<br>3. Dinner - Pasta</div></div>`;
        
        if (showFooter) {
            html += `<div style="font-size: 0.85em; color: ${textColor}; opacity: 0.6; margin-top: 20px; text-align: center; font-style: italic;">${footerText}</div>`;
        }
        
        html += '</div>';
        return html;
    },
    renderContent: function(data) {
        const showHeader = data.showHeader !== undefined ? data.showHeader : true;
        const headerText = data.headerText || 'Weekly Meal Plan';
        const headerAlignment = data.headerAlignment || 'center';
        const showDateRange = data.showDateRange !== undefined ? data.showDateRange : true;
        const dateFormat = data.dateFormat || 'long';
        const showFooter = data.showFooter !== undefined ? data.showFooter : false;
        const footerText = data.footerText || 'Prepared with love';
        const showPageBorder = data.showPageBorder !== undefined ? data.showPageBorder : true;
        
        let html = '<div class="content-options"><div class="style-section"><h3>📋 Header</h3>';
        html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
        html += `<input type="checkbox" id="showHeader" ${showHeader ? 'checked' : ''}><span>Show header</span></label></div>`;
        
        if (showHeader) {
            html += '<div class="wizard-form-group" style="margin-left: 30px;"><label>Header Text</label>';
            html += `<input type="text" id="headerText" class="wizard-input" value="${headerText}"></div>`;
            html += '<div class="wizard-radio-group" style="margin-left: 30px;"><label style="display: block; margin-bottom: 5px;">Alignment:</label>';
            html += `<label class="wizard-radio-label"><input type="radio" name="headerAlignment" value="left" ${headerAlignment === 'left' ? 'checked' : ''}><span>Left</span></label>`;
            html += `<label class="wizard-radio-label"><input type="radio" name="headerAlignment" value="center" ${headerAlignment === 'center' ? 'checked' : ''}><span>Center</span></label>`;
            html += `<label class="wizard-radio-label"><input type="radio" name="headerAlignment" value="right" ${headerAlignment === 'right' ? 'checked' : ''}><span>Right</span></label></div>`;
        }
        html += '</div>';
        
        html += '<div class="style-section"><h3>📅 Date Range</h3>';
        html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
        html += `<input type="checkbox" id="showDateRange" ${showDateRange ? 'checked' : ''}><span>Show date range</span></label></div>`;
        
        if (showDateRange) {
            html += '<div class="wizard-radio-group" style="margin-left: 30px;"><label style="display: block; margin-bottom: 5px;">Date format:</label>';
            html += `<label class="wizard-radio-label"><input type="radio" name="dateFormat" value="short" ${dateFormat === 'short' ? 'checked' : ''}><span>Short (Feb 15 - Feb 21, 2026)</span></label>`;
            html += `<label class="wizard-radio-label"><input type="radio" name="dateFormat" value="long" ${dateFormat === 'long' ? 'checked' : ''}><span>Long (February 15 - February 21, 2026)</span></label>`;
            html += `<label class="wizard-radio-label"><input type="radio" name="dateFormat" value="numeric" ${dateFormat === 'numeric' ? 'checked' : ''}><span>Numeric (02/15/2026 - 02/21/2026)</span></label></div>`;
        }
        html += '</div>';
        
        html += '<div class="style-section"><h3>📝 Footer</h3>';
        html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
        html += `<input type="checkbox" id="showFooter" ${showFooter ? 'checked' : ''}><span>Show footer</span></label></div>`;
        
        if (showFooter) {
            html += '<div class="wizard-form-group" style="margin-left: 30px;"><label>Footer Text</label>';
            html += `<input type="text" id="footerText" class="wizard-input" value="${footerText}"></div>`;
        }
        html += '</div>';
        
        html += '<div class="style-section"><h3>📄 Page Options</h3>';
        html += '<div class="wizard-checkbox-group"><label class="wizard-checkbox-label">';
        html += `<input type="checkbox" id="showPageBorder" ${showPageBorder ? 'checked' : ''}><span>Show page border</span></label></div></div>`;
        
        html += '<div class="style-section"><h3>👁️ Preview</h3><div id="contentOptionsPreview">' + this.renderContentPreview(data) + '</div></div></div>';
        return html;
    },
    attachListeners: function(wizard) {
        const toggles = ['showHeader', 'showDateRange', 'showFooter', 'showPageBorder'];
        toggles.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', function() {
                    wizard.wizardData[id] = this.checked;
                    wizard.showStep(wizard.currentStep);
                });
            }
        });
        
        const texts = ['headerText', 'footerText'];
        texts.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function() {
                    wizard.wizardData[id] = this.value;
                    window.WizardSteps.updateContentPreview(wizard);
                });
            }
        });
        
        document.querySelectorAll('input[name="headerAlignment"], input[name="dateFormat"]').forEach(radio => {
            radio.addEventListener('change', function() {
                wizard.wizardData[this.name] = this.value;
                window.WizardSteps.updateContentPreview(wizard);
            });
        });
    },
    validate: (data) => ({ valid: true }),
    collectData: () => ({})
});

window.WizardSteps.updateContentPreview = function(wizard) {
    const previewDiv = document.getElementById('contentOptionsPreview');
    if (previewDiv && wizard.wizardData) {
        const step = this.getStep(5);
        if (step && step.renderContentPreview) {
            previewDiv.innerHTML = step.renderContentPreview(wizard.wizardData);
        }
    }
};

console.log('✅ Step 5 (Content Options) added to wizard');
/**
 * Wizard Step 5: Content Options
 * Phase 6: Header, Footer, Date Range, Page Border
 */

// Add Step 5 to wizard steps
window.WizardSteps.steps.push(
    {
        id: 5,
        title: '✅ Content Options',
        description: 'Header, footer, and additional content settings',
        renderContent: (data) => {
            // Set defaults
            const showHeader = data.showHeader !== undefined ? data.showHeader : true;
            const headerText = data.headerText || 'Weekly Meal Plan';
            const headerAlignment = data.headerAlignment || 'center';
            const showDateRange = data.showDateRange !== undefined ? data.showDateRange : true;
            const dateFormat = data.dateFormat || 'long';
            const showFooter = data.showFooter !== undefined ? data.showFooter : false;
            const footerText = data.footerText || 'Prepared with love';
            const showPageBorder = data.showPageBorder !== undefined ? data.showPageBorder : true;
            
            let html = '<div class="content-options">';
            
            // Header Section
            html += '<div class="style-section">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">📋 Header</h3>';
            
            // Show Header Toggle
            html += '<div class="wizard-checkbox-group">';
            html += '<label class="wizard-checkbox-label">';
            html += `<input type="checkbox" id="showHeader" ${showHeader ? 'checked' : ''}>`;
            html += '<span>Show header</span>';
            html += '</label></div>';
            
            // Header Text (conditional)
            if (showHeader) {
                html += '<div class="wizard-form-group" style="margin-left: 30px;">';
                html += '<label for="headerText">Header Text</label>';
                html += `<input type="text" id="headerText" class="wizard-input" value="${headerText}" placeholder="Enter header text">`;
                html += '</div>';
                
                // Header Alignment
                html += '<div class="wizard-radio-group" style="margin-left: 30px; margin-top: 10px;">';
                html += '<label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666;">Alignment:</label>';
                
                html += '<label class="wizard-radio-label">';
                html += `<input type="radio" name="headerAlignment" value="left" ${headerAlignment === 'left' ? 'checked' : ''}>`;
                html += '<span>Left</span>';
                html += '</label>';
                
                html += '<label class="wizard-radio-label">';
                html += `<input type="radio" name="headerAlignment" value="center" ${headerAlignment === 'center' ? 'checked' : ''}>`;
                html += '<span>Center</span>';
                html += '</label>';
                
                html += '<label class="wizard-radio-label">';
                html += `<input type="radio" name="headerAlignment" value="right" ${headerAlignment === 'right' ? 'checked' : ''}>`;
                html += '<span>Right</span>';
                html += '</label>';
                
                html += '</div>';
            }
            
            html += '</div>';
            
            // Date Range Section
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">📅 Date Range</h3>';
            
            // Show Date Range Toggle
            html += '<div class="wizard-checkbox-group">';
            html += '<label class="wizard-checkbox-label">';
            html += `<input type="checkbox" id="showDateRange" ${showDateRange ? 'checked' : ''}>`;
            html += '<span>Show date range</span>';
            html += '</label></div>';
            
            // Date Format (conditional)
            if (showDateRange) {
                html += '<div class="wizard-radio-group" style="margin-left: 30px; margin-top: 10px;">';
                html += '<label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: #666;">Date format:</label>';
                
                html += '<label class="wizard-radio-label">';
                html += `<input type="radio" name="dateFormat" value="short" ${dateFormat === 'short' ? 'checked' : ''}>`;
                html += '<span>Short (Feb 15 - Feb 21, 2026)</span>';
                html += '</label>';
                
                html += '<label class="wizard-radio-label">';
                html += `<input type="radio" name="dateFormat" value="long" ${dateFormat === 'long' ? 'checked' : ''}>`;
                html += '<span>Long (February 15 - February 21, 2026)</span>';
                html += '</label>';
                
                html += '<label class="wizard-radio-label">';
                html += `<input type="radio" name="dateFormat" value="numeric" ${dateFormat === 'numeric' ? 'checked' : ''}>`;
                html += '<span>Numeric (02/15/2026 - 02/21/2026)</span>';
                html += '</label>';
                
                html += '</div>';
            }
            
            html += '</div>';
            
            // Footer Section
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">📝 Footer</h3>';
            
            // Show Footer Toggle
            html += '<div class="wizard-checkbox-group">';
            html += '<label class="wizard-checkbox-label">';
            html += `<input type="checkbox" id="showFooter" ${showFooter ? 'checked' : ''}>`;
            html += '<span>Show footer</span>';
            html += '</label></div>';
            
            // Footer Text (conditional)
            if (showFooter) {
                html += '<div class="wizard-form-group" style="margin-left: 30px;">';
                html += '<label for="footerText">Footer Text</label>';
                html += `<input type="text" id="footerText" class="wizard-input" value="${footerText}" placeholder="Enter footer text">`;
                html += '</div>';
            }
            
            html += '</div>';
            
            // Page Options
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">📄 Page Options</h3>';
            
            // Show Page Border Toggle
            html += '<div class="wizard-checkbox-group">';
            html += '<label class="wizard-checkbox-label">';
            html += `<input type="checkbox" id="showPageBorder" ${showPageBorder ? 'checked' : ''}>`;
            html += '<span>Show page border</span>';
            html += '</label></div>';
            
            html += '</div>';
            
            // Preview
            html += '<div class="style-section" style="margin-top: 25px;">';
            html += '<h3 style="font-size: 1.1rem; color: #333; margin-bottom: 15px;">👁️ Preview</h3>';
            html += '<div id="contentOptionsPreview" style="padding: 20px; background: #f8f9fa; border-radius: 8px;">';
            html += this.renderContentPreview(data);
            html += '</div></div>';
            
            html += '</div>';
            return html;
        },
        renderContentPreview: (data) => {
            const showHeader = data.showHeader !== undefined ? data.showHeader : true;
            const headerText = data.headerText || 'Weekly Meal Plan';
            const headerAlignment = data.headerAlignment || 'center';
            const showDateRange = data.showDateRange !== undefined ? data.showDateRange : true;
            const dateFormat = data.dateFormat || 'long';
            const showFooter = data.showFooter !== undefined ? data.showFooter : false;
            const footerText = data.footerText || 'Prepared with love';
            const showPageBorder = data.showPageBorder !== undefined ? data.showPageBorder : true;
            
            // Get colors from previous step
            const primaryColor = data.primaryColor || '#ff6b35';
            const backgroundColor = data.backgroundColor || '#ffffff';
            const textColor = data.textColor || '#333333';
            
            // Format date examples
            let dateRangeText = '';
            if (dateFormat === 'short') {
                dateRangeText = 'Feb 15 - Feb 21, 2026';
            } else if (dateFormat === 'long') {
                dateRangeText = 'February 15 - February 21, 2026';
            } else if (dateFormat === 'numeric') {
                dateRangeText = '02/15/2026 - 02/21/2026';
            }
            
            let html = `<div style="
                background: ${backgroundColor};
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ${showPageBorder ? `border: 3px solid ${primaryColor};` : ''}
            ">`;
            
            // Header
            if (showHeader) {
                html += `<div style="
                    font-size: 1.8em;
                    color: ${primaryColor};
                    font-weight: bold;
                    margin-bottom: ${showDateRange ? '8px' : '20px'};
                    text-align: ${headerAlignment};
                ">${headerText}</div>`;
            }
            
            // Date Range
            if (showDateRange) {
                html += `<div style="
                    font-size: 0.9em;
                    color: ${textColor};
                    opacity: 0.7;
                    margin-bottom: 20px;
                    text-align: ${headerAlignment};
                ">${dateRangeText}</div>`;
            }
            
            // Sample content
            html += `<div style="
                border: 2px solid ${primaryColor};
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                background: ${backgroundColor};
            ">
                <div style="
                    font-size: 1.1em;
                    color: ${textColor};
                    font-weight: bold;
                    margin-bottom: 10px;
                ">Monday</div>
                <div style="color: ${textColor}; font-size: 0.9em;">
                    1. Breakfast - Oatmeal<br>
                    2. Lunch - Salad<br>
                    3. Dinner - Pasta
                </div>
            </div>`;
            
            // Footer
            if (showFooter) {
                html += `<div style="
                    font-size: 0.85em;
                    color: ${textColor};
                    opacity: 0.6;
                    margin-top: 20px;
                    text-align: center;
                    font-style: italic;
                ">${footerText}</div>`;
            }
            
            html += '</div>';
            return html;
        },
        attachListeners: (wizard) => {
            // Show Header
            const showHeader = document.getElementById('showHeader');
            if (showHeader) {
                showHeader.addEventListener('change', function() {
                    wizard.wizardData.showHeader = this.checked;
                    wizard.showStep(wizard.currentStep);
                });
            }
            
            // Header Text
            const headerText = document.getElementById('headerText');
            if (headerText) {
                headerText.addEventListener('input', function() {
                    wizard.wizardData.headerText = this.value;
                    window.WizardSteps.updateContentPreview(wizard);
                });
            }
            
            // Header Alignment
            const alignmentRadios = document.querySelectorAll('input[name="headerAlignment"]');
            alignmentRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    wizard.wizardData.headerAlignment = this.value;
                    window.WizardSteps.updateContentPreview(wizard);
                });
            });
            
            // Show Date Range
            const showDateRange = document.getElementById('showDateRange');
            if (showDateRange) {
                showDateRange.addEventListener('change', function() {
                    wizard.wizardData.showDateRange = this.checked;
                    wizard.showStep(wizard.currentStep);
                });
            }
            
            // Date Format
            const dateFormatRadios = document.querySelectorAll('input[name="dateFormat"]');
            dateFormatRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    wizard.wizardData.dateFormat = this.value;
                    window.WizardSteps.updateContentPreview(wizard);
                });
            });
            
            // Show Footer
            const showFooter = document.getElementById('showFooter');
            if (showFooter) {
                showFooter.addEventListener('change', function() {
                    wizard.wizardData.showFooter = this.checked;
                    wizard.showStep(wizard.currentStep);
                });
            }
            
            // Footer Text
            const footerText = document.getElementById('footerText');
            if (footerText) {
                footerText.addEventListener('input', function() {
                    wizard.wizardData.footerText = this.value;
                    window.WizardSteps.updateContentPreview(wizard);
                });
            }
            
            // Show Page Border
            const showPageBorder = document.getElementById('showPageBorder');
            if (showPageBorder) {
                showPageBorder.addEventListener('change', function() {
                    wizard.wizardData.showPageBorder = this.checked;
                    window.WizardSteps.updateContentPreview(wizard);
                });
            }
        },
        validate: (data) => {
            return { valid: true };
        },
        collectData: () => {
            return {};
        }
    }
);

// Add update function for content preview
window.WizardSteps.updateContentPreview = function(wizard) {
    const previewDiv = document.getElementById('contentOptionsPreview');
    if (previewDiv && wizard.wizardData) {
        const step = this.getStep(5);
        if (step && step.renderContentPreview) {
            previewDiv.innerHTML = step.renderContentPreview(wizard.wizardData);
        }
    }
};
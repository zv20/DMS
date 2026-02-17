/**
 * Step-Based Template Builder with Accordion UI
 * Clean, organized workflow with header/footer image personality
 * @version 2.9 - Specific font sizes instead of small/medium/large
 */

class StepTemplateBuilder {
    constructor() {
        this.settings = {
            // Template Style
            templateStyle: 'compact', // 'compact', 'detailed', or 'detailed-2col'
            
            // Background
            backgroundImage: null,
            backgroundColor: '#ffffff',
            backgroundOpacity: 1.0,
            
            // Header
            showHeader: true,
            headerText: 'Седмично меню',
            headerImage: null,
            headerImagePosition: 'left', // left, center, right
            headerImageSize: 'medium', // small, medium, large
            headerAlignment: 'center',
            headerFontSize: '20pt', // Now specific pt size
            headerColor: '#d2691e',
            
            // Weekly Menu (all always true now)
            showDateRange: true,
            showIngredients: true,
            showCalories: true,
            showPortions: true,
            
            // Day Block Styling
            dayBorder: false,
            dayBorderColor: '#e0e0e0',
            dayBorderThickness: '1px',
            dayBackground: 'transparent',
            dayPadding: '0px',
            
            // Day Name Styling
            dayNameSize: '12pt', // Now specific pt size
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            
            // Meal Styling
            mealFontSize: '10pt', // Now specific pt size
            mealLineHeight: '1.4',
            
            // Ingredients Styling
            ingredientColor: '#333333',
            ingredientSize: 'medium',
            
            // Allergen Styling
            allergenColor: '#ff0000',
            allergenUnderline: false,
            allergenBold: true,
            allergenItalic: false,
            
            // Footer
            showFooter: true,
            footerText: 'Prepared with care by KitchenPro',
            footerImage: null,
            footerImagePosition: 'right', // left, center, right
            footerImageSize: 'small', // small, medium, large
            footerAlignment: 'center',
            footerFontSize: '8pt' // Now specific pt size
        };
        
        this.previewData = null;
        this.expandedSection = 'background';
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        console.log('🚀 StepTemplateBuilder: Setting up...');
        this.buildUI();
        this.bindAccordion();
        this.bindControls();
        this.loadSampleData();
        this.updatePreview();
    }
    
    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        if (!sidebar) return;
        
        sidebar.innerHTML = `
            <div class="step-template-controls">
                <h2 style="margin: 0 0 10px 0; font-size: 20px; text-align: center;">🎨 Menu Template Builder</h2>
                <p style="margin: 0 0 20px 0; font-size: 12px; color: #666; text-align: center;">Click each step to customize</p>
                
                ${this.renderAccordionSection('background', '🏽 1. Background', this.renderBackgroundControls())}
                ${this.renderAccordionSection('header', '📌 2. Header', this.renderHeaderControls())}
                ${this.renderAccordionSection('menu', '🍽️ 3. Weekly Menu', this.renderMenuControls())}
                ${this.renderAccordionSection('footer', '📍 4. Footer', this.renderFooterControls())}
                
                <div class="action-buttons" style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <button id="btnLoadData" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                        👁️ Load My Menu Data
                    </button>
                    <button id="btnSaveTemplate" class="btn btn-secondary" style="width: 100%; margin-bottom: 10px;">
                        💾 Save Template
                    </button>
                    <button id="btnReset" class="btn btn-secondary" style="width: 100%;">
                        🔄 Reset to Default
                    </button>
                </div>
            </div>
            
            ${this.renderStyles()}
        `;
        
        this.bindActionButtons();
    }
    
    renderAccordionSection(id, title, content) {
        const isExpanded = this.expandedSection === id;
        return `
            <div class="accordion-section ${isExpanded ? 'expanded' : ''}" data-section="${id}">
                <div class="accordion-header">
                    <span class="accordion-icon">${isExpanded ? '▼' : '▶'}</span>
                    <span class="accordion-title">${title}</span>
                </div>
                <div class="accordion-content" style="display: ${isExpanded ? 'block' : 'none'};">
                    ${content}
                </div>
            </div>
        `;
    }
    
    renderBackgroundControls() {
        return `
            <div class="control-group">
                <label>Background Image</label>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="file" id="bgImageUpload" accept="image/*" style="display: none;">
                    <button id="uploadBgBtn" class="btn btn-secondary" style="flex: 1;">📄 Upload</button>
                    <button id="removeBgBtn" class="btn btn-secondary" style="width: 40px;">🗑️</button>
                </div>
                <div id="bgPreview" style="display: none; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;">
                    <small>Current: <span id="bgFileName"></span></small>
                </div>
                
                <label>Background Color</label>
                <input type="color" id="backgroundColor" value="#ffffff" class="color-input">
                
                <label>Opacity</label>
                <input type="range" id="backgroundOpacity" min="0" max="100" value="100" class="slider">
                <div class="slider-value"><span id="opacityValue">100</span>%</div>
            </div>
        `;
    }
    
    renderHeaderControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label"><input type="checkbox" id="showHeader" checked><span>Show Header</span></label>
                <label>Header Text</label>
                <input type="text" id="headerText" value="Седмично меню" class="text-input">
                
                <div class="subsection">
                    <h4>🖼️ Header Image (Optional)</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="file" id="headerImageUpload" accept="image/*" style="display: none;">
                        <button id="uploadHeaderImgBtn" class="btn btn-secondary" style="flex: 1;">📄 Upload</button>
                        <button id="removeHeaderImgBtn" class="btn btn-secondary" style="width: 40px;">🗑️</button>
                    </div>
                    <div id="headerImgPreview" style="display: none; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                        <small>Image: <span id="headerImgFileName"></span></small>
                    </div>
                    <label>Image Position</label>
                    <select id="headerImagePosition" class="select-input">
                        <option value="left" selected>Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                    </select>
                    <label>Image Size</label>
                    <select id="headerImageSize" class="select-input">
                        <option value="small">Small (40px)</option>
                        <option value="medium" selected>Medium (60px)</option>
                        <option value="large">Large (80px)</option>
                    </select>
                </div>
                
                <label>Text Alignment</label>
                <select id="headerAlignment" class="select-input">
                    <option value="left">Left</option>
                    <option value="center" selected>Center</option>
                    <option value="right">Right</option>
                </select>
                <label>Font Size (A4 optimized)</label>
                <select id="headerFontSize" class="select-input">
                    <option value="14pt">14pt - Minimal</option>
                    <option value="16pt">16pt - Small</option>
                    <option value="18pt">18pt - Medium</option>
                    <option value="20pt" selected>20pt - Large</option>
                    <option value="22pt">22pt - Extra Large</option>
                    <option value="24pt">24pt - Maximum</option>
                </select>
                <label>Text Color</label>
                <input type="color" id="headerColor" value="#d2691e" class="color-input">
            </div>
        `;
    }
    
    renderMenuControls() {
        return `
            <div class="control-group">
                <h4>🎨 Template Style</h4>
                <label class="radio-label">
                    <input type="radio" name="templateStyle" value="compact" checked>
                    <span><strong>Compact</strong> - All info on one line</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="templateStyle" value="detailed">
                    <span><strong>Detailed</strong> - Ingredients on separate line</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="templateStyle" value="detailed-2col">
                    <span><strong>Detailed (2 Columns)</strong> - Side-by-side layout</span>
                </label>
                
                <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                    <p style="margin: 0; font-size: 12px; color: #2e7d32;">
                        <strong>✅ Menu Content:</strong><br>
                        Date range, ingredients, portions, and calories are always included in your menu.
                    </p>
                </div>
                
                <h4 style="margin-top: 15px;">📊 Day Block</h4>
                <label class="checkbox-label"><input type="checkbox" id="dayBorder"><span>Show Border</span></label>
                <label>Border Color</label>
                <input type="color" id="dayBorderColor" value="#e0e0e0" class="color-input">
                <label>Background</label>
                <input type="color" id="dayBackground" value="#ffffff" class="color-input">
                
                <h4 style="margin-top: 15px;">📝 Day Name</h4>
                <label>Font Size (A4 optimized)</label>
                <select id="dayNameSize" class="select-input">
                    <option value="10pt">10pt - Small</option>
                    <option value="11pt">11pt - Medium Small</option>
                    <option value="12pt" selected>12pt - Medium</option>
                    <option value="13pt">13pt - Medium Large</option>
                    <option value="14pt">14pt - Large</option>
                </select>
                <label>Color</label>
                <input type="color" id="dayNameColor" value="#333333" class="color-input">
                
                <h4 style="margin-top: 15px;">⚠️ Allergens</h4>
                <label>Color</label>
                <input type="color" id="allergenColor" value="#ff0000" class="color-input">
                <label class="checkbox-label"><input type="checkbox" id="allergenUnderline"><span>Underline</span></label>
                <label class="checkbox-label"><input type="checkbox" id="allergenBold" checked><span>Bold</span></label>
            </div>
        `;
    }
    
    renderFooterControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label"><input type="checkbox" id="showFooter" checked><span>Show Footer</span></label>
                <label>Footer Text</label>
                <input type="text" id="footerText" value="Prepared with care by KitchenPro" class="text-input">
                
                <div class="subsection">
                    <h4>🖼️ Footer Image (Optional)</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="file" id="footerImageUpload" accept="image/*" style="display: none;">
                        <button id="uploadFooterImgBtn" class="btn btn-secondary" style="flex: 1;">📄 Upload</button>
                        <button id="removeFooterImgBtn" class="btn btn-secondary" style="width: 40px;">🗑️</button>
                    </div>
                    <div id="footerImgPreview" style="display: none; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                        <small>Image: <span id="footerImgFileName"></span></small>
                    </div>
                    <label>Image Position</label>
                    <select id="footerImagePosition" class="select-input">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right" selected>Right</option>
                    </select>
                    <label>Image Size</label>
                    <select id="footerImageSize" class="select-input">
                        <option value="small" selected>Small (30px)</option>
                        <option value="medium">Medium (40px)</option>
                    </select>
                </div>
                
                <label>Text Alignment</label>
                <select id="footerAlignment" class="select-input">
                    <option value="left">Left</option>
                    <option value="center" selected>Center</option>
                    <option value="right">Right</option>
                </select>
                <label>Font Size (A4 optimized)</label>
                <select id="footerFontSize" class="select-input">
                    <option value="7pt">7pt - Minimal</option>
                    <option value="8pt" selected>8pt - Small</option>
                    <option value="9pt">9pt - Medium</option>
                    <option value="10pt">10pt - Large</option>
                    <option value="11pt">11pt - Maximum</option>
                </select>
            </div>
        `;
    }
    
    renderStyles() {
        return `
            <style>
                .step-template-controls { padding: 20px; background: white; border-radius: 8px; }
                .accordion-section { margin-bottom: 10px; border: 2px solid #e0e0e0; border-radius: 8px; overflow: hidden; transition: all 0.3s; }
                .accordion-section.expanded { border-color: #2196f3; }
                .accordion-header { padding: 12px 15px; background: #f8f9fa; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; transition: background 0.2s; }
                .accordion-header:hover { background: #e9ecef; }
                .accordion-section.expanded .accordion-header { background: #e3f2fd; color: #1976d2; }
                .accordion-icon { font-size: 11px; width: 15px; }
                .accordion-content { padding: 15px; animation: slideDown 0.3s; }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .control-group { display: flex; flex-direction: column; gap: 10px; }
                .control-group label { font-weight: 500; font-size: 12px; color: #555; margin-top: 5px; }
                .control-group h4 { margin: 12px 0 8px 0; font-size: 13px; color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
                .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 0 !important; }
                .checkbox-label input { width: 16px; height: 16px; cursor: pointer; }
                .checkbox-label span { font-weight: normal; }
                .radio-label { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
                .radio-label:hover { background: #f8f9fa; }
                .radio-label input[type="radio"]:checked { accent-color: #2196f3; }
                .text-input, .select-input { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; width: 100%; }
                .color-input { width: 100%; height: 36px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
                .slider { width: 100%; height: 5px; border-radius: 3px; outline: none; }
                .slider-value { text-align: center; font-size: 12px; color: #666; margin-top: 3px; }
                .subsection { background: #f8f9fa; padding: 12px; border-radius: 6px; margin: 8px 0; }
                .subsection h4 { margin: 0 0 12px 0 !important; border-bottom: none !important; font-size: 12px !important; color: #555 !important; }
            </style>
        `;
    }
    
    bindAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const section = e.currentTarget.closest('.accordion-section');
                const sectionId = section.dataset.section;
                
                document.querySelectorAll('.accordion-section').forEach(s => {
                    s.classList.remove('expanded');
                    s.querySelector('.accordion-content').style.display = 'none';
                    s.querySelector('.accordion-icon').textContent = '▶';
                });
                
                section.classList.add('expanded');
                section.querySelector('.accordion-content').style.display = 'block';
                section.querySelector('.accordion-icon').textContent = '▼';
                
                this.expandedSection = sectionId;
            });
        });
    }
    
    bindControls() {
        // Background
        this.bindImageUpload('bgImageUpload', 'uploadBgBtn', 'removeBgBtn', 'backgroundImage', 'backgrounds', 'bgPreview', 'bgFileName');
        this.bindColorInput('backgroundColor');
        document.getElementById('backgroundOpacity')?.addEventListener('input', (e) => {
            this.settings.backgroundOpacity = e.target.value / 100;
            document.getElementById('opacityValue').textContent = e.target.value;
            this.updatePreview();
        });
        
        // Header
        this.bindCheckbox('showHeader');
        this.bindTextInput('headerText');
        this.bindImageUpload('headerImageUpload', 'uploadHeaderImgBtn', 'removeHeaderImgBtn', 'headerImage', 'header', 'headerImgPreview', 'headerImgFileName');
        this.bindSelect('headerImagePosition');
        this.bindSelect('headerImageSize');
        this.bindSelect('headerAlignment');
        this.bindSelect('headerFontSize');
        this.bindColorInput('headerColor');
        
        // Template style
        document.querySelectorAll('input[name="templateStyle"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.templateStyle = e.target.value;
                console.log('📐 Template style changed to:', e.target.value);
                this.updatePreview();
            });
        });
        
        // Menu (no content toggles - all styling only)
        this.bindCheckbox('dayBorder');
        this.bindColorInput('dayBorderColor');
        this.bindColorInput('dayBackground');
        this.bindSelect('dayNameSize');
        this.bindColorInput('dayNameColor');
        this.bindColorInput('allergenColor');
        this.bindCheckbox('allergenUnderline');
        this.bindCheckbox('allergenBold');
        
        // Footer
        this.bindCheckbox('showFooter');
        this.bindTextInput('footerText');
        this.bindImageUpload('footerImageUpload', 'uploadFooterImgBtn', 'removeFooterImgBtn', 'footerImage', 'footer', 'footerImgPreview', 'footerImgFileName');
        this.bindSelect('footerImagePosition');
        this.bindSelect('footerImageSize');
        this.bindSelect('footerAlignment');
        this.bindSelect('footerFontSize');
    }
    
    bindCheckbox(id) {
        document.getElementById(id)?.addEventListener('change', (e) => {
            this.settings[id] = e.target.checked;
            this.updatePreview();
        });
    }
    
    bindTextInput(id) {
        document.getElementById(id)?.addEventListener('input', (e) => {
            this.settings[id] = e.target.value;
            this.updatePreview();
        });
    }
    
    bindSelect(id) {
        document.getElementById(id)?.addEventListener('change', (e) => {
            this.settings[id] = e.target.value;
            this.updatePreview();
        });
    }
    
    bindColorInput(id) {
        document.getElementById(id)?.addEventListener('input', (e) => {
            this.settings[id] = e.target.value;
            this.updatePreview();
        });
    }
    
    bindImageUpload(inputId, uploadBtnId, removeBtnId, settingKey, folder, previewId, fileNameId) {
        const inputEl = document.getElementById(inputId);
        const uploadBtn = document.getElementById(uploadBtnId);
        const removeBtn = document.getElementById(removeBtnId);
        
        uploadBtn?.addEventListener('click', () => inputEl.click());
        
        inputEl?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            
            const success = await this.saveImage(file, folder);
            if (success) {
                this.settings[settingKey] = file.name;
                document.getElementById(previewId).style.display = 'block';
                document.getElementById(fileNameId).textContent = file.name;
                this.updatePreview();
            }
        });
        
        removeBtn?.addEventListener('click', () => {
            this.settings[settingKey] = null;
            document.getElementById(previewId).style.display = 'none';
            inputEl.value = '';
            this.updatePreview();
        });
    }
    
    async saveImage(file, folder) {
        if (!window.directoryHandle) {
            alert('Please select a data folder first in Settings.');
            return false;
        }
        
        try {
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: true });
            const imagesDir = await dataDir.getDirectoryHandle('images', { create: true });
            const folderDir = await imagesDir.getDirectoryHandle(folder, { create: true });
            const fileHandle = await folderDir.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            
            console.log(`✅ Saved to data/images/${folder}/`, file.name);
            return true;
        } catch (err) {
            console.error('Error:', err);
            alert('❌ Upload failed');
            return false;
        }
    }
    
    bindActionButtons() {
        document.getElementById('btnLoadData')?.addEventListener('click', () => this.loadRealData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click', () => this.reset());
    }
    
    loadSampleData() {
        const today = new Date();
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + 4);
        
        this.previewData = {
            startDate: today,
            endDate: nextFriday,
            days: [
                { name: 'Понеделник', meals: [
                    { number: 1, name: 'Супа топчета', portion: '150гр', calories: 129, ingredients: [
                        { name: 'кайма', hasAllergen: false },
                        { name: 'яйца', hasAllergen: true }
                    ]},
                    { number: 2, name: 'Пържени картофи', portion: '200гр', calories: 250, ingredients: [
                        { name: 'картофи', hasAllergen: false }
                    ]}
                ]},
                { name: 'Вторник', meals: [
                    { number: 1, name: 'Таратор', portion: '150гр', calories: 100, ingredients: [
                        { name: 'краставица', hasAllergen: false },
                        { name: 'кисело мляко', hasAllergen: true }
                    ]}
                ]},
                { name: 'Сряда', meals: [
                    { number: 1, name: 'Плодова салата', portion: '180гр', calories: 85, ingredients: [
                        { name: 'ябълка', hasAllergen: false },
                        { name: 'банан', hasAllergen: false }
                    ]}
                ]},
                { name: 'Четвъртък', meals: [
                    { number: 1, name: 'Пилешка супа', portion: '150гр', calories: 120, ingredients: [
                        { name: 'пиле', hasAllergen: false }
                    ]}
                ]},
                { name: 'Петък', meals: [
                    { number: 1, name: 'Риба на фурна', portion: '180гр', calories: 200, ingredients: [
                        { name: 'риба', hasAllergen: true }
                    ]}
                ]}
            ]
        };
    }
    
    loadRealData() {
        alert('⚠️ Load real data from menu planner - feature coming soon!');
    }
    
    // Helper function to render a single day block
    renderDayBlock(day, s, spacing, daySize, mealSize, isCompact) {
        if (!day || !day.meals.length) return '';
        
        const dayStyle = `${s.dayBorder ? `border: ${s.dayBorderThickness || '1px'} solid ${s.dayBorderColor};` : ''} ${s.dayBackground !== 'transparent' ? `background: ${s.dayBackground};` : ''} padding: ${spacing.dayPadding}; margin-bottom: ${spacing.dayMargin}; border-radius: 4px;`;
        let html = `<div style="${dayStyle}"><div style="font-size: ${daySize}; color: ${s.dayNameColor}; font-weight: ${s.dayNameWeight || 'bold'}; margin-bottom: ${spacing.dayNameMargin};">${day.name}</div>`;
        
        day.meals.forEach(meal => {
            if (isCompact) {
                // COMPACT: Everything on one line
                html += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin}; font-size: ${mealSize}; line-height: ${spacing.lineHeight};"> ${meal.number}. ${meal.name}`;
                if (meal.portion) html += ` - ${meal.portion}`;
                if (meal.ingredients.length) {
                    html += `; ${meal.ingredients.map(ing => {
                        if (ing.hasAllergen) {
                            let style = `color: ${s.allergenColor};`;
                            if (s.allergenBold) style += ' font-weight: bold;';
                            if (s.allergenUnderline) style += ' text-decoration: underline;';
                            return `<span style="${style}">${ing.name}</span>`;
                        }
                        return ing.name;
                    }).join(', ')}`;
                }
                if (meal.calories) html += ` ККАЛ ${meal.calories}`;
                html += `</div>`;
            } else {
                // DETAILED: Meal name on first line, ingredients + calories on second line
                html += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin};">`;
                
                // Line 1: Meal number, name, portion
                html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; font-weight: 500;"> ${meal.number}. ${meal.name}`;
                if (meal.portion) html += ` - ${meal.portion}`;
                html += `</div>`;
                
                // Line 2: Ingredients + Calories
                if (meal.ingredients.length) {
                    html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 15px; color: #666; font-style: italic;">${meal.ingredients.map(ing => {
                        if (ing.hasAllergen) {
                            let style = `color: ${s.allergenColor};`;
                            if (s.allergenBold) style += ' font-weight: bold;';
                            if (s.allergenUnderline) style += ' text-decoration: underline;';
                            return `<span style="${style}">${ing.name}</span>`;
                        }
                        return ing.name;
                    }).join(', ')}`;
                    
                    if (meal.calories) {
                        html += ` - ККАЛ ${meal.calories}`;
                    }
                    html += `</div>`;
                } else if (meal.calories) {
                    html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 15px; color: #666; font-style: italic;">ККАЛ ${meal.calories}</div>`;
                }
                
                html += `</div>`;
            }
        });
        html += `</div>`;
        return html;
    }
    
    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        
        const s = this.settings;
        const { startDate, endDate, days } = this.previewData;
        
        const is2Col = s.templateStyle === 'detailed-2col';
        const isCompact = s.templateStyle === 'compact';
        const spacing = {
            containerPadding: isCompact ? '12px' : '15px',
            headerMargin: isCompact ? '8px' : '10px',
            dateMargin: isCompact ? '10px' : '12px',
            rowMargin: '6px',
            columnGap: '10px',
            dayMargin: isCompact ? '8px' : '8px',
            dayPadding: isCompact ? '6px' : '6px',
            dayNameMargin: isCompact ? '4px' : '5px',
            mealMargin: isCompact ? '3px' : '4px',
            mealLeftMargin: isCompact ? '8px' : '8px',
            footerMarginTop: isCompact ? '12px' : '15px',
            footerPaddingTop: isCompact ? '10px' : '12px',
            lineHeight: isCompact ? '1.2' : '1.3'
        };
        
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')} ${startDate.getFullYear()}г.`;
        
        // Use direct point sizes from settings
        const headerSize = s.headerFontSize || '20pt';
        const daySize = s.dayNameSize || '12pt';
        const mealSize = s.mealFontSize || '10pt';
        const footerSize = s.footerFontSize || '8pt';
        
        const imgSizes = {
            header: { small: '40px', medium: '60px', large: '80px' },
            footer: { small: '30px', medium: '40px', large: '50px' }
        };
        
        let html = `<div style="background: ${s.backgroundColor}; ${s.backgroundImage ? `background-image: url('data/images/backgrounds/${s.backgroundImage}');` : ''} background-size: cover; background-position: center; padding: ${spacing.containerPadding}; min-height: 400px; font-family: Arial, sans-serif; display: flex; flex-direction: column;">`;
        
        // Header
        if (s.showHeader) {
            const headerImgHtml = s.headerImage ? `<img src="data/images/header/${s.headerImage}" style="height: ${imgSizes.header[s.headerImageSize]}; vertical-align: middle; margin-${s.headerImagePosition === 'left' ? 'right' : 'left'}: 10px;">` : '';
            html += `<div style="text-align: ${s.headerAlignment}; margin-bottom: ${spacing.headerMargin};">`;
            if (s.headerImagePosition === 'left' && headerImgHtml) html += headerImgHtml;
            html += `<span style="font-size: ${headerSize}; color: ${s.headerColor}; font-weight: bold;">${s.headerText}</span>`;
            if (s.headerImagePosition === 'right' && headerImgHtml) html += headerImgHtml;
            if (s.headerImagePosition === 'center' && headerImgHtml) html += `<br>${headerImgHtml}`;
            html += `</div>`;
        }
        
        // Date range
        html += `<div style="text-align: center; margin-bottom: ${spacing.dateMargin}; font-size: ${isCompact ? '10pt' : '11pt'};">${dateRange}</div>`;
        
        // Menu - 2 column layout if selected
        html += `<div style="flex: 1;">`;
        if (is2Col) {
            // 2-COLUMN LAYOUT
            for (let i = 0; i < days.length; i += 2) {
                html += `<div style="display: flex; gap: ${spacing.columnGap}; margin-bottom: ${spacing.rowMargin};">`;
                
                // Left column
                html += `<div style="flex: 1;">`;
                if (days[i]) {
                    html += this.renderDayBlock(days[i], s, spacing, daySize, mealSize, isCompact);
                }
                html += `</div>`;
                
                // Right column
                html += `<div style="flex: 1;">`;
                if (days[i + 1]) {
                    html += this.renderDayBlock(days[i + 1], s, spacing, daySize, mealSize, isCompact);
                }
                html += `</div>`;
                
                html += `</div>`;
            }
        } else {
            // SINGLE COLUMN LAYOUT
            days.forEach(day => {
                html += this.renderDayBlock(day, s, spacing, daySize, mealSize, isCompact);
            });
        }
        html += `</div>`;
        
        // Footer
        if (s.showFooter) {
            const footerImgHtml = s.footerImage ? `<img src="data/images/footer/${s.footerImage}" style="height: ${imgSizes.footer[s.footerImageSize]}; vertical-align: middle; margin-${s.footerImagePosition === 'left' ? 'right' : 'left'}: 10px;">` : '';
            html += `<div style="text-align: ${s.footerAlignment}; margin-top: ${spacing.footerMarginTop}; padding-top: ${spacing.footerPaddingTop}; border-top: 1px solid #ddd; font-size: ${footerSize}; color: #888;">`;
            if (s.footerImagePosition === 'left' && footerImgHtml) html += footerImgHtml;
            html += s.footerText;
            if (s.footerImagePosition === 'right' && footerImgHtml) html += footerImgHtml;
            html += `</div>`;
        }
        
        html += `</div>`;
        container.innerHTML = html;
    }
    
    async saveTemplate() {
        const name = prompt('Template name:');
        if (!name) return;
        if (!window.menuTemplates) window.menuTemplates = {};
        window.menuTemplates[name] = this.settings;
        if (window.storageAdapter) await window.storageAdapter.save('templates', window.menuTemplates);
        alert(`✅ Template "${name}" saved!`);
    }
    
    reset() {
        if (!confirm('Reset all settings?')) return;
        this.settings = new StepTemplateBuilder().settings;
        this.buildUI();
        this.bindAccordion();
        this.bindControls();
        this.bindActionButtons();
        this.loadSampleData();
        this.updatePreview();
    }
}

window.stepTemplateBuilder = new StepTemplateBuilder();

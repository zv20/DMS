/**
 * Step-Based Template Builder with Accordion UI
 * Clean, organized workflow with header/footer image personality
 * @version 2.0
 */

class StepTemplateBuilder {
    constructor() {
        this.settings = {
            // Template Style
            templateStyle: 'compact', // 'compact' or 'detailed'
            
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
            headerFontSize: 'large',
            headerColor: '#d2691e',
            
            // Weekly Menu
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
            dayNameSize: 'medium',
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            
            // Meal Styling
            mealFontSize: 'medium',
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
            footerFontSize: 'small'
        };
        
        this.previewData = null;
        this.expandedSection = 'background'; // Track which section is expanded
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
        if (!sidebar) {
            console.error('❌ template-sidebar not found!');
            return;
        }
        
        sidebar.innerHTML = `
            <div class="step-template-controls">
                <h2 style="margin: 0 0 20px 0; font-size: 20px; text-align: center;">🎨 Menu Template Builder</h2>
                <p style="margin: 0 0 20px 0; font-size: 13px; color: #666; text-align: center;">Click each step to customize</p>
                
                ${this.renderAccordionSection('background', '🇼 1. Background', this.renderBackgroundControls())}
                ${this.renderAccordionSection('header', '📌 2. Header', this.renderHeaderControls())}
                ${this.renderAccordionSection('menu', '🍽️ 3. Weekly Menu', this.renderMenuControls())}
                ${this.renderAccordionSection('footer', '📍 4. Footer', this.renderFooterControls())}
                
                <div class="action-buttons" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
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
                    <button id="uploadBgBtn" class="btn btn-secondary" style="flex: 1;">
                        📄 Upload Image
                    </button>
                    <button id="removeBgBtn" class="btn btn-secondary" style="width: 40px;" title="Remove">
                        🗑️
                    </button>
                </div>
                <div id="bgPreview" style="display: none; padding: 10px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;">
                    <small style="color: #666;">Current: <span id="bgFileName"></span></small>
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
                <label class="checkbox-label">
                    <input type="checkbox" id="showHeader" checked>
                    <span>Show Header</span>
                </label>
                
                <label>Header Text</label>
                <input type="text" id="headerText" value="Седмично меню" class="text-input">
                
                <div class="subsection">
                    <h4>🖼️ Header Image (Optional)</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="file" id="headerImageUpload" accept="image/*" style="display: none;">
                        <button id="uploadHeaderImgBtn" class="btn btn-secondary" style="flex: 1;">
                            📄 Upload Logo/Image
                        </button>
                        <button id="removeHeaderImgBtn" class="btn btn-secondary" style="width: 40px;" title="Remove">
                            🗑️
                        </button>
                    </div>
                    <div id="headerImgPreview" style="display: none; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                        <small style="color: #666;">Image: <span id="headerImgFileName"></span></small>
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
                
                <label>Font Size</label>
                <select id="headerFontSize" class="select-input">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large" selected>Large</option>
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
                    <span>Compact (Bulgarian School)</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="templateStyle" value="detailed">
                    <span>Detailed (With Labels)</span>
                </label>
                
                <h4 style="margin-top: 20px;">📜 Content</h4>
                <label class="checkbox-label">
                    <input type="checkbox" id="showDateRange" checked>
                    <span>Show Date Range</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="showIngredients" checked>
                    <span>Show Ingredients</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="showCalories" checked>
                    <span>Show Calories</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="showPortions" checked>
                    <span>Show Portions</span>
                </label>
                
                <h4 style="margin-top: 20px;">📊 Day Block Styling</h4>
                <label class="checkbox-label">
                    <input type="checkbox" id="dayBorder">
                    <span>Show Day Border</span>
                </label>
                <label>Border Color</label>
                <input type="color" id="dayBorderColor" value="#e0e0e0" class="color-input">
                <label>Border Thickness</label>
                <select id="dayBorderThickness" class="select-input">
                    <option value="1px" selected>Thin (1px)</option>
                    <option value="2px">Medium (2px)</option>
                    <option value="3px">Thick (3px)</option>
                </select>
                <label>Day Background Color</label>
                <input type="color" id="dayBackground" value="#ffffff" class="color-input">
                
                <h4 style="margin-top: 20px;">📝 Day Name Styling</h4>
                <label>Font Size</label>
                <select id="dayNameSize" class="select-input">
                    <option value="small">Small</option>
                    <option value="medium" selected>Medium</option>
                    <option value="large">Large</option>
                </select>
                <label>Font Color</label>
                <input type="color" id="dayNameColor" value="#333333" class="color-input">
                <label>Font Weight</label>
                <select id="dayNameWeight" class="select-input">
                    <option value="normal">Normal</option>
                    <option value="bold" selected>Bold</option>
                </select>
                
                <h4 style="margin-top: 20px;">🍽️ Meal Styling</h4>
                <label>Font Size</label>
                <select id="mealFontSize" class="select-input">
                    <option value="small">Small</option>
                    <option value="medium" selected>Medium</option>
                    <option value="large">Large</option>
                </select>
                <label>Line Height</label>
                <select id="mealLineHeight" class="select-input">
                    <option value="1.2">Tight (1.2)</option>
                    <option value="1.4" selected>Normal (1.4)</option>
                    <option value="1.6">Loose (1.6)</option>
                </select>
                
                <h4 style="margin-top: 20px;">🥬 Ingredients Styling</h4>
                <label>Font Color</label>
                <input type="color" id="ingredientColor" value="#333333" class="color-input">
                <label>Font Size</label>
                <select id="ingredientSize" class="select-input">
                    <option value="small">Small</option>
                    <option value="medium" selected>Same as meal</option>
                    <option value="large">Large</option>
                </select>
                
                <h4 style="margin-top: 20px;">⚠️ Allergen Styling</h4>
                <label>Highlight Color</label>
                <input type="color" id="allergenColor" value="#ff0000" class="color-input">
                <label class="checkbox-label">
                    <input type="checkbox" id="allergenUnderline">
                    <span>Underline</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="allergenBold" checked>
                    <span>Bold</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="allergenItalic">
                    <span>Italic</span>
                </label>
            </div>
        `;
    }
    
    renderFooterControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="showFooter" checked>
                    <span>Show Footer</span>
                </label>
                
                <label>Footer Text</label>
                <input type="text" id="footerText" value="Prepared with care by KitchenPro" class="text-input">
                
                <div class="subsection">
                    <h4>🖼️ Footer Image (Optional)</h4>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="file" id="footerImageUpload" accept="image/*" style="display: none;">
                        <button id="uploadFooterImgBtn" class="btn btn-secondary" style="flex: 1;">
                            📄 Upload Logo/Icon
                        </button>
                        <button id="removeFooterImgBtn" class="btn btn-secondary" style="width: 40px;" title="Remove">
                            🗑️
                        </button>
                    </div>
                    <div id="footerImgPreview" style="display: none; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                        <small style="color: #666;">Image: <span id="footerImgFileName"></span></small>
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
                        <option value="large">Large (50px)</option>
                    </select>
                </div>
                
                <label>Text Alignment</label>
                <select id="footerAlignment" class="select-input">
                    <option value="left">Left</option>
                    <option value="center" selected>Center</option>
                    <option value="right">Right</option>
                </select>
                
                <label>Font Size</label>
                <select id="footerFontSize" class="select-input">
                    <option value="small" selected>Small</option>
                    <option value="medium">Medium</option>
                </select>
            </div>
        `;
    }
    
    renderStyles() {
        return `
            <style>
                .step-template-controls {
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                }
                
                .accordion-section {
                    margin-bottom: 10px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.3s;
                }
                
                .accordion-section.expanded {
                    border-color: #2196f3;
                }
                
                .accordion-header {
                    padding: 15px;
                    background: #f8f9fa;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                    font-size: 15px;
                    transition: background 0.2s;
                }
                
                .accordion-header:hover {
                    background: #e9ecef;
                }
                
                .accordion-section.expanded .accordion-header {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                
                .accordion-icon {
                    font-size: 12px;
                    width: 15px;
                }
                
                .accordion-content {
                    padding: 20px;
                    animation: slideDown 0.3s;
                }
                
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .control-group label {
                    font-weight: 500;
                    font-size: 13px;
                    color: #555;
                    margin-top: 8px;
                }
                
                .control-group h4 {
                    margin: 15px 0 8px 0;
                    font-size: 14px;
                    color: #333;
                    border-bottom: 1px solid #e0e0e0;
                    padding-bottom: 5px;
                }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    margin-top: 0 !important;
                }
                
                .checkbox-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .checkbox-label span {
                    font-weight: normal;
                }
                
                .radio-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .radio-label:hover {
                    background: #f8f9fa;
                }
                
                .radio-label input[type="radio"] {
                    cursor: pointer;
                }
                
                .text-input, .select-input {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    width: 100%;
                }
                
                .color-input {
                    width: 100%;
                    height: 40px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .slider {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    outline: none;
                }
                
                .slider-value {
                    text-align: center;
                    font-size: 13px;
                    color: #666;
                    margin-top: 5px;
                }
                
                .subsection {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 10px 0;
                }
                
                .subsection h4 {
                    margin: 0 0 15px 0 !important;
                    border-bottom: none !important;
                    font-size: 13px !important;
                    color: #555 !important;
                }
            </style>
        `;
    }
    
    bindAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const section = e.currentTarget.closest('.accordion-section');
                const sectionId = section.dataset.section;
                
                // Close all sections
                document.querySelectorAll('.accordion-section').forEach(s => {
                    s.classList.remove('expanded');
                    s.querySelector('.accordion-content').style.display = 'none';
                    s.querySelector('.accordion-icon').textContent = '▶';
                });
                
                // Open clicked section
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
        document.getElementById('backgroundColor')?.addEventListener('input', (e) => {
            this.settings.backgroundColor = e.target.value;
            this.updatePreview();
        });
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
                this.updatePreview();
            });
        });
        
        // Menu content
        this.bindCheckbox('showDateRange');
        this.bindCheckbox('showIngredients');
        this.bindCheckbox('showCalories');
        this.bindCheckbox('showPortions');
        
        // Day block
        this.bindCheckbox('dayBorder');
        this.bindColorInput('dayBorderColor');
        this.bindSelect('dayBorderThickness');
        this.bindColorInput('dayBackground');
        
        // Day name
        this.bindSelect('dayNameSize');
        this.bindColorInput('dayNameColor');
        this.bindSelect('dayNameWeight');
        
        // Meals
        this.bindSelect('mealFontSize');
        this.bindSelect('mealLineHeight');
        
        // Ingredients
        this.bindColorInput('ingredientColor');
        this.bindSelect('ingredientSize');
        
        // Allergens
        this.bindColorInput('allergenColor');
        this.bindCheckbox('allergenUnderline');
        this.bindCheckbox('allergenBold');
        this.bindCheckbox('allergenItalic');
        
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
            
            console.log(`✅ Image saved to data/images/${folder}/`, file.name);
            return true;
        } catch (err) {
            console.error('Error saving image:', err);
            alert('❌ Error uploading image.');
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
                {
                    name: 'Понеделник',
                    meals: [
                        { number: 1, name: 'Супа топчета', portion: '150гр', calories: 129, ingredients: [
                            { name: 'кайма', hasAllergen: false },
                            { name: 'яйца', hasAllergen: true },
                            { name: 'кис.мляко', hasAllergen: true }
                        ]}
                    ]
                },
                {
                    name: 'Вторник',
                    meals: [
                        { number: 1, name: 'Таратор', portion: '150гр', calories: 100, ingredients: [
                            { name: 'краставица', hasAllergen: false },
                            { name: 'кис.мляко', hasAllergen: true }
                        ]}
                    ]
                }
            ]
        };
    }
    
    loadRealData() {
        // Same as before - loads from window.recipes/ingredients
        console.log('👀 Loading real menu data...');
        // Implementation same as template-builder-simple.js
    }
    
    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        
        // Render based on template style - full implementation needed
        container.innerHTML = '<div style="padding: 20px;">Preview rendering...</div>';
    }
    
    async saveTemplate() {
        const name = prompt('Template name:');
        if (!name) return;
        
        if (!window.menuTemplates) window.menuTemplates = {};
        window.menuTemplates[name] = this.settings;
        
        if (window.storageAdapter) {
            await window.storageAdapter.save('templates', window.menuTemplates);
        }
        
        alert(`✅ Template "${name}" saved!`);
    }
    
    reset() {
        if (!confirm('Reset all settings to default?')) return;
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

/**
 * Step-Based Template Builder with Accordion UI
 * Clean, organized workflow with header/footer image personality
 * @version 4.3 - Improved button styling and layout
 */

class StepTemplateBuilder {
    constructor() {
        this.settings = {
            // Template Style
            templateStyle: 'compact', // 'compact', 'detailed', or 'detailed-2col'
            
            // Background - OLD SINGLE IMAGE (kept for backward compatibility)
            backgroundImage: null,
            backgroundColor: '#ffffff',
            backgroundOpacity: 1.0,
            
            // NEW: Multi-Image Background System (5 image slots)
            backgroundImages: [
                { image: null, position: 'center', size: 100, opacity: 1.0, zIndex: 1 },
                { image: null, position: 'top-left', size: 20, opacity: 1.0, zIndex: 2 },
                { image: null, position: 'top-right', size: 20, opacity: 1.0, zIndex: 3 },
                { image: null, position: 'bottom-left', size: 20, opacity: 1.0, zIndex: 4 },
                { image: null, position: 'bottom-right', size: 20, opacity: 1.0, zIndex: 5 }
            ],
            
            // Header
            showHeader: true,
            headerText: 'Седмично меню',
            headerImage: null,
            headerImagePosition: 'left', // left, center, right
            headerImageSize: 'medium', // small, medium, large
            headerAlignment: 'center',
            headerFontSize: '20pt',
            headerColor: '#d2691e',
            
            // Weekly Menu (all always true now)
            showDateRange: true,
            showIngredients: true,
            showCalories: true,
            showPortions: true,
            
            // Day Block Styling
            dayBorder: false,
            dayBorderColor: '#e0e0e0',
            dayBorderStyle: 'solid',
            dayBorderThickness: '1px',
            dayBackground: 'transparent',
            dayPadding: '0px',
            
            // Day Name Styling
            dayNameSize: '12pt',
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            
            // Meal Styling
            mealFontSize: '10pt',
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
            footerImagePosition: 'right',
            footerImageSize: 'small',
            footerAlignment: 'center',
            footerFontSize: '8pt'
        };
        
        this.previewData = null;
        this.expandedSection = 'background';
        this.currentImageSlot = null; // Track which slot is being edited
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
                
                ${this.renderAccordionSection('background', '🌏 1. Background', this.renderBackgroundControls())}
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
                <label>Background Color</label>
                <input type="color" id="backgroundColor" value="#ffffff" class="color-input">
                
                <div style="margin: 20px 0; padding: 12px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                    <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: 600; color: #1565c0;">🇺🇫 5 Image Layers + Background</p>
                    <p style="margin: 0; font-size: 11px; color: #1976d2;">Position 5 images anywhere with precise size control!</p>
                </div>
                
                ${this.renderImageSlot(0, 'Image Layer 1')}
                ${this.renderImageSlot(1, 'Image Layer 2')}
                ${this.renderImageSlot(2, 'Image Layer 3')}
                ${this.renderImageSlot(3, 'Image Layer 4')}
                ${this.renderImageSlot(4, 'Image Layer 5')}
            </div>
        `;
    }
    
    renderImageSlot(index, title) {
        const slot = this.settings.backgroundImages[index];
        return `
            <div class="subsection" style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 12px 0 !important;">🖼️ ${title}</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 40px; gap: 8px; margin-bottom: 10px;">
                    <input type="file" id="bgImage${index}Upload" accept="image/*" style="display: none;">
                    <button id="uploadBgImage${index}Btn" class="image-control-btn">
                        <span style="font-size: 16px;">📄</span>
                        <span>Upload</span>
                    </button>
                    <button id="browseBgImage${index}Btn" class="image-control-btn">
                        <span style="font-size: 16px;">🖼️</span>
                        <span>Library</span>
                    </button>
                    <button id="removeBgImage${index}Btn" class="image-delete-btn">🗑️</button>
                </div>
                <div id="bgImage${index}Preview" style="display: ${slot.image ? 'block' : 'none'}; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                    <small style="color: #555;">File: <strong id="bgImage${index}FileName">${slot.image || ''}</strong></small>
                </div>
                
                <label>Position</label>
                <select id="bgImage${index}Position" class="select-input">
                    <option value="center" ${slot.position === 'center' ? 'selected' : ''}>Center (full page)</option>
                    <option value="top-left" ${slot.position === 'top-left' ? 'selected' : ''}>Top Left</option>
                    <option value="top-center" ${slot.position === 'top-center' ? 'selected' : ''}>Top Center</option>
                    <option value="top-right" ${slot.position === 'top-right' ? 'selected' : ''}>Top Right</option>
                    <option value="center-left" ${slot.position === 'center-left' ? 'selected' : ''}>Center Left</option>
                    <option value="center-right" ${slot.position === 'center-right' ? 'selected' : ''}>Center Right</option>
                    <option value="bottom-left" ${slot.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                    <option value="bottom-center" ${slot.position === 'bottom-center' ? 'selected' : ''}>Bottom Center</option>
                    <option value="bottom-right" ${slot.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                </select>
                
                <label>Size (% of page width)</label>
                <input type="range" id="bgImage${index}Size" min="5" max="100" value="${slot.size}" class="slider">
                <div class="slider-value"><span id="bgImage${index}SizeValue">${slot.size}</span>%</div>
                
                <label>Opacity</label>
                <input type="range" id="bgImage${index}Opacity" min="0" max="100" value="${slot.opacity * 100}" class="slider">
                <div class="slider-value"><span id="bgImage${index}OpacityValue">${Math.round(slot.opacity * 100)}</span>%</div>
                
                <label>Layer (Z-Index)</label>
                <select id="bgImage${index}ZIndex" class="select-input">
                    <option value="1" ${slot.zIndex === 1 ? 'selected' : ''}>1 - Back</option>
                    <option value="2" ${slot.zIndex === 2 ? 'selected' : ''}>2</option>
                    <option value="3" ${slot.zIndex === 3 ? 'selected' : ''}>3</option>
                    <option value="4" ${slot.zIndex === 4 ? 'selected' : ''}>4</option>
                    <option value="5" ${slot.zIndex === 5 ? 'selected' : ''}>5 - Front</option>
                </select>
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
                <label>Border Style</label>
                <select id="dayBorderStyle" class="select-input">
                    <option value="solid" selected>Solid ────</option>
                    <option value="dashed">Dashed ─ ─ ─</option>
                    <option value="dotted">Dotted · · · ·</option>
                    <option value="double">Double ════</option>
                </select>
                <label>Border Thickness</label>
                <select id="dayBorderThickness" class="select-input">
                    <option value="1px" selected>1px - Thin</option>
                    <option value="2px">2px - Medium</option>
                    <option value="3px">3px - Thick</option>
                    <option value="4px">4px - Extra Thick</option>
                </select>
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
                
                /* NEW: Improved button styles */
                .image-control-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 3px;
                    padding: 8px 4px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s;
                    min-height: 52px;
                }
                .image-control-btn:hover {
                    background: #1976d2;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                }
                .image-control-btn:active {
                    transform: translateY(0);
                }
                .image-delete-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 18px;
                    transition: all 0.2s;
                    min-height: 52px;
                }
                .image-delete-btn:hover {
                    background: #d32f2f;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
                }
                .image-delete-btn:active {
                    transform: translateY(0);
                }
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
        // Background - Multi-Image System (5 slots)
        for (let i = 0; i < 5; i++) {
            this.bindMultiImageSlot(i);
        }
        this.bindColorInput('backgroundColor');
        
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
        
        // Menu
        this.bindCheckbox('dayBorder');
        this.bindColorInput('dayBorderColor');
        this.bindSelect('dayBorderStyle');
        this.bindSelect('dayBorderThickness');
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
    
    bindMultiImageSlot(index) {
        const inputEl = document.getElementById(`bgImage${index}Upload`);
        const uploadBtn = document.getElementById(`uploadBgImage${index}Btn`);
        const browseBtn = document.getElementById(`browseBgImage${index}Btn`);
        const removeBtn = document.getElementById(`removeBgImage${index}Btn`);
        const positionEl = document.getElementById(`bgImage${index}Position`);
        const sizeEl = document.getElementById(`bgImage${index}Size`);
        const opacityEl = document.getElementById(`bgImage${index}Opacity`);
        const zIndexEl = document.getElementById(`bgImage${index}ZIndex`);
        
        uploadBtn?.addEventListener('click', () => inputEl.click());
        
        browseBtn?.addEventListener('click', () => {
            this.currentImageSlot = index;
            this.openImageLibrary('backgrounds', index);
        });
        
        inputEl?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            
            const success = await this.saveImage(file, 'backgrounds');
            if (success) {
                this.settings.backgroundImages[index].image = file.name;
                document.getElementById(`bgImage${index}Preview`).style.display = 'block';
                document.getElementById(`bgImage${index}FileName`).textContent = file.name;
                this.updatePreview();
            }
        });
        
        removeBtn?.addEventListener('click', () => {
            this.settings.backgroundImages[index].image = null;
            document.getElementById(`bgImage${index}Preview`).style.display = 'none';
            inputEl.value = '';
            this.updatePreview();
        });
        
        positionEl?.addEventListener('change', (e) => {
            this.settings.backgroundImages[index].position = e.target.value;
            this.updatePreview();
        });
        
        sizeEl?.addEventListener('input', (e) => {
            this.settings.backgroundImages[index].size = parseInt(e.target.value);
            document.getElementById(`bgImage${index}SizeValue`).textContent = e.target.value;
            this.updatePreview();
        });
        
        opacityEl?.addEventListener('input', (e) => {
            this.settings.backgroundImages[index].opacity = e.target.value / 100;
            document.getElementById(`bgImage${index}OpacityValue`).textContent = e.target.value;
            this.updatePreview();
        });
        
        zIndexEl?.addEventListener('change', (e) => {
            this.settings.backgroundImages[index].zIndex = parseInt(e.target.value);
            this.updatePreview();
        });
    }
    
    async openImageLibrary(folder, slotIndex) {
        if (!window.directoryHandle) {
            alert('Please select a data folder first in Settings.');
            return;
        }
        
        try {
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images', { create: false });
            const folderDir = await imagesDir.getDirectoryHandle(folder, { create: false });
            
            const images = [];
            for await (const entry of folderDir.values()) {
                if (entry.kind === 'file' && entry.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    const file = await entry.getFile();
                    const url = URL.createObjectURL(file);
                    images.push({ name: entry.name, url: url, handle: entry });
                }
            }
            
            if (images.length === 0) {
                alert('📂 No images found in library. Upload some first!');
                return;
            }
            
            this.showImageLibraryDialog(images, folder, slotIndex);
        } catch (err) {
            console.error('Error loading images:', err);
            alert('❌ Failed to load image library');
        }
    }
    
    showImageLibraryDialog(images, folder, slotIndex) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 25px;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        `;
        
        let imagesHTML = images.map(img => `
            <div style="
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                background: white;
            " 
            class="library-image" 
            data-name="${img.name}"
            onmouseover="this.style.borderColor='#2196f3'; this.style.background='#e3f2fd';"
            onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='white';">
                <img src="${img.url}" style="width: 100%; height: 120px; object-fit: contain; border-radius: 4px; margin-bottom: 8px;">
                <div style="font-size: 11px; color: #666; margin-bottom: 8px; word-break: break-word;">${img.name}</div>
                <button class="delete-img-btn" data-name="${img.name}" style="
                    padding: 4px 8px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                " onclick="event.stopPropagation();">🗑️ Delete</button>
            </div>
        `).join('');
        
        dialog.innerHTML = `
            <h2 style="margin: 0 0 15px 0;">🖼️ Image Library</h2>
            <p style="margin: 0 0 20px 0; font-size: 13px; color: #666;">Click image to select, or delete unused images</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                ${imagesHTML}
            </div>
            <button id="closeLibrary" style="
                width: 100%;
                padding: 10px;
                background: #9e9e9e;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Close</button>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        dialog.querySelectorAll('.library-image').forEach(imgDiv => {
            imgDiv.addEventListener('click', () => {
                const imageName = imgDiv.dataset.name;
                this.settings.backgroundImages[slotIndex].image = imageName;
                document.getElementById(`bgImage${slotIndex}Preview`).style.display = 'block';
                document.getElementById(`bgImage${slotIndex}FileName`).textContent = imageName;
                this.updatePreview();
                document.body.removeChild(overlay);
            });
        });
        
        dialog.querySelectorAll('.delete-img-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const imageName = btn.dataset.name;
                if (confirm(`Delete "${imageName}"?`)) {
                    try {
                        const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: false });
                        const imagesDir = await dataDir.getDirectoryHandle('images', { create: false });
                        const folderDir = await imagesDir.getDirectoryHandle(folder, { create: false });
                        await folderDir.removeEntry(imageName);
                        
                        btn.closest('.library-image').remove();
                        alert('✅ Image deleted!');
                    } catch (err) {
                        console.error('Delete failed:', err);
                        alert('❌ Failed to delete image');
                    }
                }
            });
        });
        
        document.getElementById('closeLibrary').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
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
    
    renderDayBlock(day, s, spacing, daySize, mealSize, isCompact) {
        if (!day || !day.meals.length) return '';
        
        const dayStyle = `${s.dayBorder ? `border: ${s.dayBorderThickness || '1px'} ${s.dayBorderStyle || 'solid'} ${s.dayBorderColor};` : ''} ${s.dayBackground !== 'transparent' ? `background: ${s.dayBackground};` : ''} padding: ${spacing.dayPadding}; margin-bottom: ${spacing.dayMargin}; border-radius: 4px;`;
        let html = `<div style="${dayStyle}"><div style="font-size: ${daySize}; color: ${s.dayNameColor}; font-weight: ${s.dayNameWeight || 'bold'}; margin-bottom: ${spacing.dayNameMargin};">${day.name}</div>`;
        
        day.meals.forEach(meal => {
            if (isCompact) {
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
                html += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin};">`;
                html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; font-weight: 500;"> ${meal.number}. ${meal.name}`;
                if (meal.portion) html += ` - ${meal.portion}`;
                html += `</div>`;
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
                    if (meal.calories) html += ` - ККАЛ ${meal.calories}`;
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
    
    getPositionCSS(position) {
        const positions = {
            'center': 'center center',
            'top-left': 'top left',
            'top-center': 'top center',
            'top-right': 'top right',
            'center-left': 'center left',
            'center-right': 'center right',
            'bottom-left': 'bottom left',
            'bottom-center': 'bottom center',
            'bottom-right': 'bottom right'
        };
        return positions[position] || 'center center';
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
        
        const headerSize = s.headerFontSize || '20pt';
        const daySize = s.dayNameSize || '12pt';
        const mealSize = s.mealFontSize || '10pt';
        const footerSize = s.footerFontSize || '8pt';
        
        const imgSizes = {
            header: { small: '40px', medium: '60px', large: '80px' },
            footer: { small: '30px', medium: '40px', large: '50px' }
        };
        
        let bgStyles = `background-color: ${s.backgroundColor}; position: relative;`;
        let bgLayers = '';
        
        const sortedImages = s.backgroundImages
            .map((img, idx) => ({ ...img, idx }))
            .filter(img => img.image)
            .sort((a, b) => a.zIndex - b.zIndex);
        
        sortedImages.forEach((img) => {
            const sizeCSS = `${img.size}% auto`;
            bgLayers += `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('data/images/backgrounds/${img.image}'); background-size: ${sizeCSS}; background-position: ${this.getPositionCSS(img.position)}; background-repeat: no-repeat; opacity: ${img.opacity}; z-index: ${img.zIndex}; pointer-events: none;"></div>`;
        });
        
        let html = `<div style="${bgStyles} padding: ${spacing.containerPadding}; min-height: 400px; font-family: Arial, sans-serif; display: flex; flex-direction: column;">`;
        html += bgLayers;
        html += `<div style="position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column;">`;
        
        if (s.showHeader) {
            const headerImgHtml = s.headerImage ? `<img src="data/images/header/${s.headerImage}" style="height: ${imgSizes.header[s.headerImageSize]}; vertical-align: middle; margin-${s.headerImagePosition === 'left' ? 'right' : 'left'}: 10px;">` : '';
            html += `<div style="text-align: ${s.headerAlignment}; margin-bottom: ${spacing.headerMargin};">`;
            if (s.headerImagePosition === 'left' && headerImgHtml) html += headerImgHtml;
            html += `<span style="font-size: ${headerSize}; color: ${s.headerColor}; font-weight: bold;">${s.headerText}</span>`;
            if (s.headerImagePosition === 'right' && headerImgHtml) html += headerImgHtml;
            if (s.headerImagePosition === 'center' && headerImgHtml) html += `<br>${headerImgHtml}`;
            html += `</div>`;
        }
        
        html += `<div style="text-align: center; margin-bottom: ${spacing.dateMargin}; font-size: ${isCompact ? '10pt' : '11pt'};">${dateRange}</div>`;
        
        html += `<div style="flex: 1;">`;
        if (is2Col) {
            for (let i = 0; i < days.length; i += 2) {
                html += `<div style="display: flex; gap: ${spacing.columnGap}; margin-bottom: ${spacing.rowMargin};">`;
                html += `<div style="flex: 1;">`;
                if (days[i]) html += this.renderDayBlock(days[i], s, spacing, daySize, mealSize, isCompact);
                html += `</div>`;
                html += `<div style="flex: 1;">`;
                if (days[i + 1]) html += this.renderDayBlock(days[i + 1], s, spacing, daySize, mealSize, isCompact);
                html += `</div>`;
                html += `</div>`;
            }
        } else {
            days.forEach(day => {
                html += this.renderDayBlock(day, s, spacing, daySize, mealSize, isCompact);
            });
        }
        html += `</div>`;
        
        if (s.showFooter) {
            const footerImgHtml = s.footerImage ? `<img src="data/images/footer/${s.footerImage}" style="height: ${imgSizes.footer[s.footerImageSize]}; vertical-align: middle; margin-${s.footerImagePosition === 'left' ? 'right' : 'left'}: 10px;">` : '';
            html += `<div style="text-align: ${s.footerAlignment}; margin-top: ${spacing.footerMarginTop}; padding-top: ${spacing.footerPaddingTop}; border-top: 1px solid #ddd; font-size: ${footerSize}; color: #888;">`;
            if (s.footerImagePosition === 'left' && footerImgHtml) html += footerImgHtml;
            html += s.footerText;
            if (s.footerImagePosition === 'right' && footerImgHtml) html += footerImgHtml;
            html += `</div>`;
        }
        
        html += `</div></div>`;
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

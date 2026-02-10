/**
 * Advanced Template Manager
 * Per-block settings, template library, and detailed meal printing
 */

(function(window) {
    let activeTemplateId = null;

    const TemplateManager = {
        init: function() {
            this.loadActiveTemplate();
            this.bindUI();
            this.renderTemplateLibrary();
            this.refreshPreview();
        },

        loadActiveTemplate: function() {
            const stored = localStorage.getItem('activeTemplateId');
            if (stored && stored !== 'default') {
                const tmpl = window.savedTemplates.find(t => t.id === stored);
                if (tmpl) {
                    activeTemplateId = stored;
                    this.applyTemplateToUI(tmpl);
                    return;
                }
            }
            this.applyDefaultSettings();
        },

        applyDefaultSettings: function() {
            activeTemplateId = 'default';
            this.setVal('headerText', 'Weekly Menu');
            this.setVal('headerColor', '#fd7e14');
            this.setVal('headerSize', '20pt');
            this.setVal('dayBg', '#ffffff');
            this.setVal('dayRadius', 8);
            this.setVal('dayBorderWidth', 2);
            this.setVal('dayBorderColor', '#e0e0e0');
            this.setVal('dayBorderStyle', 'solid');
            this.setVal('backgroundImage', '');
            this.setVal('footerText', 'Prepared with care by KitchenPro');
            
            for (let i = 1; i <= 4; i++) {
                this.setChecked(`slot${i}_showIngredients`, true);
                this.setChecked(`slot${i}_showCalories`, true);
                this.setChecked(`slot${i}_showAllergens`, true);
            }
        },

        applyTemplateToUI: function(template) {
            this.setVal('headerText', template.header.text);
            this.setVal('headerColor', template.header.color);
            this.setVal('headerSize', template.header.fontSize);
            this.setVal('dayBg', template.dayBlock.bg);
            this.setVal('dayRadius', template.dayBlock.borderRadius.replace('px', ''));
            this.setVal('dayBorderWidth', template.dayBlock.borderWidth || 2);
            this.setVal('dayBorderColor', template.dayBlock.borderColor || '#e0e0e0');
            this.setVal('dayBorderStyle', template.dayBlock.borderStyle || 'solid');
            this.setVal('backgroundImage', template.backgroundImage || '');
            this.setVal('footerText', template.footer.text);
            
            if (template.slotSettings) {
                for (let i = 1; i <= 4; i++) {
                    const slot = template.slotSettings[`slot${i}`];
                    if (slot) {
                        this.setChecked(`slot${i}_showIngredients`, slot.showIngredients);
                        this.setChecked(`slot${i}_showCalories`, slot.showCalories);
                        this.setChecked(`slot${i}_showAllergens`, slot.showAllergens);
                    }
                }
            }
        },

        bindUI: function() {
            const inputs = ['headerText', 'headerColor', 'headerSize', 'dayBg', 'dayRadius', 
                           'dayBorderWidth', 'dayBorderColor', 'dayBorderStyle', 'backgroundImage', 'footerText'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.refreshPreview());
            });

            for (let i = 1; i <= 4; i++) {
                ['showIngredients', 'showCalories', 'showAllergens'].forEach(setting => {
                    const el = document.getElementById(`slot${i}_${setting}`);
                    if (el) el.addEventListener('change', () => this.refreshPreview());
                });
            }
        },

        setVal: function(id, val) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        },

        setChecked: function(id, val) {
            const el = document.getElementById(id);
            if (el) el.checked = val;
        },

        getSettingsFromUI: function() {
            const slotSettings = {};
            for (let i = 1; i <= 4; i++) {
                slotSettings[`slot${i}`] = {
                    showIngredients: document.getElementById(`slot${i}_showIngredients`)?.checked || false,
                    showCalories: document.getElementById(`slot${i}_showCalories`)?.checked || false,
                    showAllergens: document.getElementById(`slot${i}_showAllergens`)?.checked || false
                };
            }

            return {
                header: { 
                    text: document.getElementById('headerText')?.value || 'Weekly Menu',
                    color: document.getElementById('headerColor')?.value || '#fd7e14',
                    fontSize: document.getElementById('headerSize')?.value || '20pt'
                },
                dayBlock: {
                    bg: document.getElementById('dayBg')?.value || '#ffffff',
                    borderRadius: (document.getElementById('dayRadius')?.value || '8') + 'px',
                    borderWidth: document.getElementById('dayBorderWidth')?.value || '2',
                    borderColor: document.getElementById('dayBorderColor')?.value || '#e0e0e0',
                    borderStyle: document.getElementById('dayBorderStyle')?.value || 'solid'
                },
                footer: {
                    text: document.getElementById('footerText')?.value || ''
                },
                backgroundImage: document.getElementById('backgroundImage')?.value || '',
                slotSettings: slotSettings
            };
        },

        refreshPreview: function() {
            const settings = this.getSettingsFromUI();
            
            // Apply background image to preview sheet
            const sheet = document.getElementById('livePreviewSheet');
            if (sheet && settings.backgroundImage) {
                sheet.style.backgroundImage = `url(${settings.backgroundImage})`;
                sheet.style.backgroundSize = 'cover';
                sheet.style.backgroundPosition = 'center';
                sheet.style.backgroundRepeat = 'no-repeat';
            } else if (sheet) {
                sheet.style.backgroundImage = 'none';
            }
            
            // Header
            const h = document.getElementById('previewHeader');
            const dateRange = this.getCurrentDateRangeText();
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; text-align:center; margin:0 0 2px 0; font-weight:600; line-height:1.2;">${settings.header.text}</h1>
                    <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                `;
            }

            // Days List
            const list = document.getElementById('previewDaysList');
            if (list) {
                list.innerHTML = '';
                const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
                
                for (let i = 0; i < 5; i++) {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    const dateStr = day.toISOString().split('T')[0];
                    const dayMenu = window.currentMenu[dateStr];
                    
                    const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
                    const block = this.createDetailedDayBlock(dayName, dayMenu, settings, dateStr);
                    
                    if (!this.hasMeals(dayMenu)) {
                        block.style.opacity = '0.4';
                    }
                    list.appendChild(block);
                }
            }

            // Footer
            const f = document.getElementById('previewFooter');
            if (f) {
                f.innerHTML = `<div style="border-top:1px solid #eee; padding-top:4px; margin-top:6px; color:#7f8c8d; font-size:8pt; text-align:center; line-height:1;">${settings.footer.text}</div>`;
            }
        },

        createDetailedDayBlock: function(dayName, dayMenu, settings, dateStr) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 10px 12px;
                margin-bottom: 6px;
                border: ${settings.dayBlock.borderWidth}px ${settings.dayBlock.borderStyle} ${settings.dayBlock.borderColor};
                page-break-inside: avoid;
            `;

            // Day header without sticker
            let contentHtml = `
                <div style="border-bottom:1px solid #d0d0d0; margin-bottom:6px; padding-bottom:3px;">
                    <h2 style="margin:0; font-size:11pt; color:#2c3e50; font-weight:600; line-height:1.2;">${dayName}</h2>
                </div>
            `;

            if (dayMenu) {
                const slots = [
                    { id: 'slot1', type: 'soup', label: window.t('slot_soup') },
                    { id: 'slot2', type: 'main', label: window.t('slot_main') },
                    { id: 'slot3', type: 'dessert', label: window.t('slot_dessert') },
                    { id: 'slot4', type: 'other', label: window.t('slot_other') }
                ];

                slots.forEach((slotConfig, index) => {
                    const slot = dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            contentHtml += this.createMealBlock(recipe, slotConfig, slotSettings, index + 1);
                        }
                    }
                });
            }

            if (!this.hasMeals(dayMenu)) {
                contentHtml += `<p style="color:#aaa; font-style:italic; text-align:center; padding:8px 0; font-size:8pt; margin:0; line-height:1;">${window.t('empty_day') || 'No meals planned'}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';
            
            // Clean text format - no boxes, compact spacing
            let html = `<div style="margin-bottom:5px;">`;
            
            // Title line with portion and calories
            let titleLine = `<div style="font-size:9pt; font-weight:600; color:#333; margin-bottom:2px; line-height:1.2;">${index}. ${recipe.name}`;
            
            // Add portion size and calories with language-specific units
            let metadata = [];
            if (recipe.portionSize) {
                const portionUnit = isBulgarian ? 'гр' : 'g';
                const portionValue = recipe.portionSize.replace(/g|gr|гр/gi, '').trim();
                metadata.push(`${portionValue}${portionUnit}`);
            }
            if (slotSettings.showCalories && recipe.calories) {
                const calorieUnit = isBulgarian ? 'ККАЛ' : 'kcal';
                metadata.push(`${recipe.calories} ${calorieUnit}`);
            }
            if (metadata.length) titleLine += ` <span style="font-weight:normal; color:#666; font-size:8pt;">(${metadata.join(', ')})</span>`;
            
            titleLine += `</div>`;
            html += titleLine;

            // Ingredients with red underlined allergens
            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                const recipeAllergens = window.getRecipeAllergens(recipe);
                const allergenIds = new Set(recipeAllergens.map(a => a.id));
                
                const ingredientsList = recipe.ingredients.map(ing => {
                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                    if (!fullIng) return '';
                    
                    // Check if this ingredient has any allergens
                    const hasAllergen = fullIng.allergens && fullIng.allergens.some(aid => allergenIds.has(aid));
                    
                    if (slotSettings.showAllergens && hasAllergen) {
                        return `<span style="color:#dc3545; text-decoration:underline; font-weight:500;">${fullIng.name}</span>`;
                    }
                    return fullIng.name;
                }).filter(n => n).join(', ');
                
                if (ingredientsList) {
                    html += `<div style="font-size:7.5pt; color:#555; margin-top:1px; margin-left:10px; line-height:1.2;"><em>Ingredients:</em> ${ingredientsList}</div>`;
                }
            }

            html += `</div>`;
            return html;
        },

        hasMeals: function(dayMenu) {
            if (!dayMenu) return false;
            return Object.values(dayMenu).some(slot => slot.recipe !== null);
        },

        getCurrentDateRangeText: function() {
            const start = window.getWeekStart(window.currentCalendarDate || new Date());
            const end = new Date(start);
            end.setDate(start.getDate() + 4);
            const options = { month: 'short', day: 'numeric' };
            const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
            return `${start.toLocaleDateString(lang, options)} — ${end.toLocaleDateString(lang, options)}, ${end.getFullYear()}`;
        },

        renderTemplateLibrary: function() {
            const container = document.getElementById('templateLibrary');
            if (!container) return;
            
            container.innerHTML = '';

            // Default Template
            const defaultCard = this.createTemplateCard({
                id: 'default',
                name: 'Default Template'
            }, activeTemplateId === 'default');
            container.appendChild(defaultCard);

            // Saved Templates
            window.savedTemplates.forEach(tmpl => {
                const card = this.createTemplateCard(tmpl, activeTemplateId === tmpl.id);
                container.appendChild(card);
            });
        },

        createTemplateCard: function(template, isActive) {
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 10px;
                border: 2px solid ${isActive ? '#fd7e14' : '#ddd'};
                border-radius: 6px;
                background: ${isActive ? '#fff5e6' : '#f9f9f9'};
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = template.name;
            nameSpan.style.fontWeight = isActive ? '600' : '400';
            nameSpan.style.color = isActive ? '#fd7e14' : '#333';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '5px';

            if (!isActive) {
                const loadBtn = document.createElement('button');
                loadBtn.textContent = 'Load';
                loadBtn.className = 'btn btn-small btn-secondary';
                loadBtn.onclick = () => this.loadTemplate(template.id);
                btnContainer.appendChild(loadBtn);
            }

            if (template.id !== 'default') {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.onclick = () => this.deleteTemplate(template.id);
                btnContainer.appendChild(deleteBtn);
            }

            card.appendChild(nameSpan);
            card.appendChild(btnContainer);
            return card;
        },

        loadTemplate: function(id) {
            if (id === 'default') {
                this.applyDefaultSettings();
            } else {
                const tmpl = window.savedTemplates.find(t => t.id === id);
                if (tmpl) this.applyTemplateToUI(tmpl);
            }
            activeTemplateId = id;
            localStorage.setItem('activeTemplateId', id);
            this.renderTemplateLibrary();
            this.refreshPreview();
        },

        deleteTemplate: function(id) {
            if (!confirm('Delete this template?')) return;
            window.savedTemplates = window.savedTemplates.filter(t => t.id !== id);
            if (activeTemplateId === id) {
                this.loadTemplate('default');
            }
            window.saveData();
            this.renderTemplateLibrary();
        }
    };

    // Global Functions
    window.saveCurrentTemplate = function() {
        const name = prompt('Template Name:', 'My Template ' + (window.savedTemplates.length + 1));
        if (!name) return;
        
        const settings = TemplateManager.getSettingsFromUI();
        settings.name = name;
        settings.id = 'tmpl_' + Date.now();
        
        window.savedTemplates.push(settings);
        window.saveData();
        
        activeTemplateId = settings.id;
        localStorage.setItem('activeTemplateId', settings.id);
        TemplateManager.renderTemplateLibrary();
        alert('Template saved!');
    };

    window.openTemplatePicker = function() {
        const modal = document.getElementById('templatePickerModal');
        const grid = document.getElementById('templateGrid');
        if (!modal || !grid) return;
        
        modal.style.display = 'block';
        grid.innerHTML = '';

        const allTemplates = [
            { id: 'current', name: 'Current Active Template' },
            ...window.savedTemplates
        ];

        allTemplates.forEach(t => {
            const card = document.createElement('div');
            card.style.cssText = 'padding:15px; border:2px solid #ddd; border-radius:8px; text-align:center; background:#f9f9f9; cursor:pointer; transition: all 0.2s;';
            card.onmouseenter = () => card.style.borderColor = '#fd7e14';
            card.onmouseleave = () => card.style.borderColor = '#ddd';
            card.innerHTML = `
                <div style="font-size:30pt; margin-bottom:10px;">📝</div>
                <h4 style="margin:0 0 10px 0;">${t.name}</h4>
                <button class="btn btn-primary" onclick="event.stopPropagation(); window.printWithTemplate('${t.id}')" style="width:100%;">Print</button>
            `;
            grid.appendChild(card);
        });
    };

    window.printWithTemplate = function(id) {
        let settings;
        if (id === 'current') {
            settings = TemplateManager.getSettingsFromUI();
        } else {
            settings = window.savedTemplates.find(t => t.id === id);
        }
        
        if (!settings) {
            alert('Template not found');
            return;
        }

        const printWindow = window.open('', '_blank');
        const dateRange = TemplateManager.getCurrentDateRangeText();
        const lang = window.getCurrentLanguage();
        const isBulgarian = lang === 'bg';
        
        let daysHtml = '';
        const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
        
        for (let i = 0; i < 5; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            
            if (TemplateManager.hasMeals(dayMenu)) {
                const dayName = day.toLocaleDateString(isBulgarian ? 'bg-BG' : 'en-US', { weekday: 'long' });
                const block = TemplateManager.createDetailedDayBlock(dayName, dayMenu, settings, dateStr);
                daysHtml += block.outerHTML;
            }
        }

        const backgroundStyle = settings.backgroundImage ? `background-image: url(${settings.backgroundImage}); background-size: cover; background-position: center; background-repeat: no-repeat;` : '';

        const html = `
            <html>
            <head>
                <title>Print Menu</title>
                <style>
                    @page { 
                        size: A4;
                        margin: 10mm;
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 0;
                        margin: 0;
                        background: #fff;
                        font-size: 9pt;
                        line-height: 1.2;
                        ${backgroundStyle}
                    }
                    .print-day-block { 
                        page-break-inside: avoid; 
                    }
                    @media print { 
                        body { 
                            padding: 0; 
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; text-align:center; margin:0 0 2px 0; font-weight:600; line-height:1.2;">${settings.header.text}</h1>
                <p style="text-align:center; color:#7f8c8d; margin:0 0 8px 0; font-size:9pt; line-height:1;">${dateRange}</p>
                ${daysHtml}
                <div style="margin-top:6px; border-top:1px solid #eee; padding-top:4px; text-align:center; color:#7f8c8d; font-size:8pt; line-height:1;">${settings.footer.text}</div>
                <script>window.onload = () => { window.print(); };</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        document.getElementById('templatePickerModal').style.display = 'none';
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('headerText')) {
            TemplateManager.init();
        }
    });

})(window);

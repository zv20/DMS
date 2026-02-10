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
            this.setVal('headerSize', '24pt');
            this.setVal('dayBg', '#ffffff');
            this.setVal('dayRadius', 8);
            this.setVal('daySticker', '🍽️');
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
            this.setVal('daySticker', template.dayBlock.sticker);
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
            const inputs = ['headerText', 'headerColor', 'headerSize', 'dayBg', 'dayRadius', 'daySticker', 'footerText'];
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
                    fontSize: document.getElementById('headerSize')?.value || '24pt'
                },
                dayBlock: {
                    bg: document.getElementById('dayBg')?.value || '#ffffff',
                    borderRadius: (document.getElementById('dayRadius')?.value || '8') + 'px',
                    sticker: document.getElementById('daySticker')?.value || '🍽️'
                },
                footer: {
                    text: document.getElementById('footerText')?.value || ''
                },
                slotSettings: slotSettings
            };
        },

        refreshPreview: function() {
            const settings = this.getSettingsFromUI();
            
            // Header
            const h = document.getElementById('previewHeader');
            const dateRange = this.getCurrentDateRangeText();
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; text-align:center; margin-bottom:5px; font-weight:600;">${settings.header.text}</h1>
                    <p style="text-align:center; color:#7f8c8d; margin-top:0; font-size:12pt;">${dateRange}</p>
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
                        block.style.borderStyle = 'dashed';
                    }
                    list.appendChild(block);
                }
            }

            // Footer
            const f = document.getElementById('previewFooter');
            if (f) {
                f.innerHTML = `<div style="border-top:2px solid #eee; padding-top:15px; margin-top:20px; color:#7f8c8d; font-size:11pt; text-align:center;">${settings.footer.text}</div>`;
            }
        },

        createDetailedDayBlock: function(dayName, dayMenu, settings, dateStr) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 15px;
                margin-bottom: 20px;
                border: 2px solid #f0f0f0;
                page-break-inside: avoid;
            `;

            let contentHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e0e0e0; margin-bottom:15px; padding-bottom:10px;">
                    <h2 style="margin:0; font-size:18pt; color:#2c3e50; font-weight:600;">${dayName}</h2>
                    <span style="font-size:28pt;">${settings.dayBlock.sticker}</span>
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
                contentHtml += `<p style="color:#aaa; font-style:italic; text-align:center; padding:20px;">${window.t('empty_day') || 'No meals planned'}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, index) {
            let html = `<div style="margin-bottom:15px; padding:12px; background:#f9f9f9; border-radius:6px; border-left:4px solid #fd7e14;">`;
            
            // Title line
            let titleLine = `<div style="font-size:13pt; font-weight:600; color:#333; margin-bottom:5px;">${index}. ${recipe.name}`;
            
            // Portion and Calories on same line
            let metadata = [];
            if (recipe.portionSize) metadata.push(recipe.portionSize);
            if (slotSettings.showCalories && recipe.calories) metadata.push(`${recipe.calories} cal`);
            if (metadata.length) titleLine += ` <span style="font-weight:normal; color:#666;">(${metadata.join(', ')})</span>`;
            
            titleLine += `</div>`;
            html += titleLine;

            // Ingredients
            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                const ingredientNames = recipe.ingredients.map(ing => {
                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                    return fullIng ? fullIng.name : '';
                }).filter(n => n).join(', ');
                
                if (ingredientNames) {
                    html += `<div style="font-size:10pt; color:#555; margin-top:5px; line-height:1.4;"><em>Ingredients:</em> ${ingredientNames}</div>`;
                }
            }

            // Allergen Badges
            if (slotSettings.showAllergens) {
                const allergens = window.getRecipeAllergens(recipe);
                if (allergens.length) {
                    html += `<div style="display:flex; gap:6px; margin-top:8px;">`;
                    allergens.forEach(a => {
                        html += `<div style="width:24px; height:24px; border-radius:50%; background:${a.color}; display:flex; align-items:center; justify-content:center; font-size:10pt; font-weight:bold; color:white; box-shadow:0 2px 4px rgba(0,0,0,0.2);" title="${window.getAllergenName(a)}">${window.getAllergenName(a).charAt(0).toUpperCase()}</div>`;
                    });
                    html += `</div>`;
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
        
        let daysHtml = '';
        const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
        
        for (let i = 0; i < 5; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            
            if (TemplateManager.hasMeals(dayMenu)) {
                const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
                const block = TemplateManager.createDetailedDayBlock(dayName, dayMenu, settings, dateStr);
                daysHtml += block.outerHTML;
            }
        }

        const html = `
            <html>
            <head>
                <title>Print Menu</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20mm; background: #fff; }
                    .print-day-block { page-break-inside: avoid; }
                    @media print { 
                        body { padding: 0; } 
                        @page { margin: 15mm; }
                    }
                </style>
            </head>
            <body>
                <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; text-align:center; margin-bottom:5px; font-weight:600;">${settings.header.text}</h1>
                <p style="text-align:center; color:#7f8c8d; margin-bottom:30px; font-size:12pt;">${dateRange}</p>
                ${daysHtml}
                <div style="margin-top:20mm; border-top:2px solid #eee; padding-top:5mm; text-align:center; color:#7f8c8d; font-size:11pt;">${settings.footer.text}</div>
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

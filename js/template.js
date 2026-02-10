/**
 * Structured Template Manager
 * Handles Header, Daily Blocks (Mon-Fri), and Footer logic.
 * Connects the Menu Planner data to the Print Layout.
 */

(function(window) {
    const TemplateManager = {
        init: function() {
            this.bindUI();
            this.refreshPreview();
        },

        bindUI: function() {
            const inputs = ['headerText', 'headerColor', 'headerSize', 'dayBg', 'dayRadius', 'daySticker', 'footerText'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.refreshPreview());
            });

            const s = window.currentStyleSettings;
            if (s) {
                this.setVal('headerText', s.header.text);
                this.setVal('headerColor', s.header.color);
                this.setVal('headerSize', s.header.fontSize);
                this.setVal('dayBg', s.dayBlock.bg);
                this.setVal('dayRadius', s.dayBlock.borderRadius.replace('px',''));
                this.setVal('daySticker', s.dayBlock.sticker);
                this.setVal('footerText', s.footer.text);
            }
        },

        setVal: function(id, val) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        },

        refreshPreview: function() {
            const s = this.getSettingsFromUI();
            
            // Preview Header
            const h = document.getElementById('previewHeader');
            const dateRange = this.getCurrentDateRangeText();
            h.innerHTML = `
                <h1 style="color:${s.header.color}; font-size:${s.header.fontSize}; text-align:center; margin-bottom:5px;">${s.header.text}</h1>
                <p style="text-align:center; color:#7f8c8d; margin-top:0;">${dateRange}</p>
            `;

            // Preview Days (Injecting REAL data from the current view if available)
            const list = document.getElementById('previewDaysList');
            list.innerHTML = '';
            
            const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
            for (let i = 0; i < 5; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                const dayMenu = window.currentMenu[dateStr];
                
                // In preview, show all days but mark empty ones
                const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
                const block = this.createDayBlock(dayName, dayMenu, s);
                if (!this.hasMeals(dayMenu)) {
                    block.style.opacity = '0.5';
                    block.style.borderStyle = 'dashed';
                }
                list.appendChild(block);
            }

            // Footer
            const f = document.getElementById('previewFooter');
            f.innerHTML = `<div style="border-top:1px solid #eee; padding-top:10mm; color:#7f8c8d; font-size:12pt; text-align:center;">${s.footer.text}</div>`;
        },

        getCurrentDateRangeText: function() {
            const start = window.getWeekStart(window.currentCalendarDate || new Date());
            const end = new Date(start);
            end.setDate(start.getDate() + 4);
            const options = { month: 'short', day: 'numeric' };
            const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
            return `${start.toLocaleDateString(lang, options)} — ${end.toLocaleDateString(lang, options)}, ${end.getFullYear()}`;
        },

        getSettingsFromUI: function() {
            return {
                header: { 
                    text: document.getElementById('headerText').value,
                    color: document.getElementById('headerColor').value,
                    fontSize: document.getElementById('headerSize').value
                },
                dayBlock: {
                    bg: document.getElementById('dayBg').value,
                    borderRadius: document.getElementById('dayRadius').value + 'px',
                    sticker: document.getElementById('daySticker').value
                },
                footer: {
                    text: document.getElementById('footerText').value
                }
            };
        },

        hasMeals: function(dayMenu) {
            if (!dayMenu) return false;
            return Object.values(dayMenu).some(slot => slot.recipe !== null);
        },

        createDayBlock: function(dayName, dayMenu, settings) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 15px;
                margin-bottom: 15px;
                border: 1px solid #eee;
                position: relative;
                page-break-inside: avoid;
            `;
            
            let mealsHtml = '';
            if (dayMenu) {
                Object.entries(dayMenu).forEach(([slotId, slot]) => {
                    if (slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            mealsHtml += `<div style="margin-bottom:5px;"><strong>${window.t('slot_' + slot.type)}:</strong> ${recipe.name}</div>`;
                        }
                    }
                });
            }

            if (!mealsHtml) mealsHtml = `<i style="color:#ccc;">${window.t('empty_day') || 'No meals planned'}</i>`;

            block.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f0f0f0; margin-bottom:10px; padding-bottom:5px;">
                    <h2 style="margin:0; font-size:16pt; color:#2c3e50;">${dayName}</h2>
                    <span style="font-size:24pt;">${settings.dayBlock.sticker}</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12pt;">
                    ${mealsHtml}
                </div>
            `;
            return block;
        }
    };

    window.openTemplatePicker = function() {
        const modal = document.getElementById('templatePickerModal');
        const grid = document.getElementById('templateGrid');
        if (!modal || !grid) return;
        
        modal.style.display = 'block';
        grid.innerHTML = '';

        const templates = [
            { id: 'current', name: window.t('current_template') || 'Current Active' },
            ...window.savedTemplates
        ];

        templates.forEach(t => {
            const card = document.createElement('div');
            card.style.cssText = 'padding:15px; border:1px solid #ddd; border-radius:8px; text-align:center; background:#f9f9f9;';
            card.innerHTML = `
                <div style="font-size:30pt; margin-bottom:10px;">📄</div>
                <h4 style="margin:0 0 10px 0;">${t.name}</h4>
                <button class="btn btn-primary" onclick="window.printWithTemplate('${t.id}')" style="width:100%;">Select</button>
            `;
            grid.appendChild(card);
        });
    };

    window.printWithTemplate = function(id) {
        let settings = window.currentStyleSettings;
        if (id !== 'current') {
            settings = window.savedTemplates.find(t => t.id === id);
        }
        
        const printWindow = window.open('', '_blank');
        const dateRange = TemplateManager.getCurrentDateRangeText();
        
        // Build actual print content
        let daysHtml = '';
        const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
        for (let i = 0; i < 5; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const dayMenu = window.currentMenu[dateStr];
            
            if (TemplateManager.hasMeals(dayMenu)) {
                const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
                const block = TemplateManager.createDayBlock(dayName, dayMenu, settings);
                daysHtml += block.outerHTML;
            }
        }

        const html = `
            <html>
            <head>
                <title>Print Menu</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 20mm; background: #fff; }
                    .print-day-block { page-break-inside: avoid; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; text-align:center; margin-bottom:5px;">${settings.header.text}</h1>
                <p style="text-align:center; color:#7f8c8d; margin-bottom:30px;">${dateRange}</p>
                ${daysHtml}
                <div style="margin-top:20mm; border-top:1px solid #eee; padding-top:5mm; text-align:center; color:#7f8c8d;">${settings.footer.text}</div>
                <script>window.onload = () => { window.print(); window.close(); };</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        document.getElementById('templatePickerModal').style.display = 'none';
    };

    window.saveStructuredTemplate = function() {
        const name = prompt("Template Name:", "New Style");
        if(!name) return;
        const s = TemplateManager.getSettingsFromUI();
        s.name = name;
        s.id = 'tmpl_' + Date.now();
        window.addSavedTemplate(s);
        alert('Template Saved!');
    };

    document.addEventListener('DOMContentLoaded', () => TemplateManager.init());

})(window);

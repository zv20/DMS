/**
 * Structured Template Manager
 * Handles Header, Daily Blocks (Mon-Fri), and Footer logic.
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

            // Load initial values from store
            const s = window.currentStyleSettings;
            if (s) {
                this.setVal('headerText', s.header.text);
                this.setVal('headerColor', s.header.color);
                this.setVal('headerSize', s.header.fontSize);
                this.setVal('dayBg', s.dayBlock.bg);
                this.setVal('dayRadius', s.dayBlock.borderRadius);
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
            
            // Header
            const h = document.getElementById('previewHeader');
            h.innerHTML = `<h1 style="color:${s.header.color}; font-size:${s.header.fontSize}; text-align:center;">${s.header.text}</h1>`;
            h.innerHTML += `<p style="text-align:center; color:#7f8c8d;">Feb 02 - Feb 06, 2026</p>`;

            // Days (Mock 3 days for preview)
            const list = document.getElementById('previewDaysList');
            list.innerHTML = '';
            ['Monday', 'Tuesday', 'Wednesday'].forEach(dayName => {
                list.appendChild(this.createDayBlock(dayName, s, true));
            });

            // Footer
            const f = document.getElementById('previewFooter');
            f.innerHTML = `<div style="border-top:1px solid #eee; padding-top:10mm; color:${s.footer.color}; font-size:${s.footer.fontSize}">${s.footer.text}</div>`;
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
                    text: document.getElementById('footerText').value,
                    color: '#7f8c8d',
                    fontSize: '12pt'
                }
            };
        },

        createDayBlock: function(dayName, settings, isPreview) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 15px;
                margin-bottom: 15px;
                border: 1px solid #eee;
                position: relative;
            `;
            
            block.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f0f0f0; margin-bottom:10px; padding-bottom:5px;">
                    <h2 style="margin:0; font-size:16pt;">${dayName}</h2>
                    <span style="font-size:20pt;">${settings.dayBlock.sticker}</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div><strong>🥣 Soup:</strong> Recipe Name</div>
                    <div><strong>🍽️ Main:</strong> Recipe Name</div>
                </div>
            `;
            return block;
        }
    };

    window.openTemplatePicker = function() {
        const modal = document.getElementById('templatePickerModal');
        const grid = document.getElementById('templateGrid');
        modal.style.display = 'block';
        grid.innerHTML = '';

        // Add "Current Settings" as an option
        const current = document.createElement('div');
        current.className = 'template-card';
        current.innerHTML = `<h4>${window.currentStyleSettings.name}</h4><button class="btn btn-primary" onclick="window.printWithTemplate('current')">Select</button>`;
        grid.appendChild(current);

        window.savedTemplates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `<h4>${t.name}</h4><button class="btn btn-primary" onclick="window.printWithTemplate('${t.id}')">Select</button>`;
            grid.appendChild(card);
        });
    };

    window.printWithTemplate = function(id) {
        let settings = window.currentStyleSettings;
        if (id !== 'current') {
            settings = window.savedTemplates.find(t => t.id === id);
        }
        
        // Final logic to hide empty days based on window.currentMenu
        // ... (This will be expanded in next iteration with real menu data injection)
        alert('Preparing print with template: ' + settings.name);
        window.print();
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

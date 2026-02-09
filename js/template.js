/**
 * Template Builder & Print Logic
 * Handles the visual customization and printing of the menu.
 */

const TemplateManager = {
    defaults: {
        font: 'Segoe UI',
        pageBg: '#ffffff',
        headerBg: '#ffffff',
        headerText: '#21808d',
        cardBg: '#ffffff',
        borderColor: '#333333',
        borderWidth: '1',
    },

    settings: {},

    init: function() {
        this.loadSettings();
        this.initEditor();
        this.bindEvents();
        this.updatePreview();
    },

    loadSettings: function() {
        const saved = localStorage.getItem('kitchenPro_template');
        this.settings = saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
        
        // Populate inputs
        this.setInputValue('styleFont', this.settings.font);
        this.setInputValue('stylePageBg', this.settings.pageBg);
    },

    initEditor: function() {
        const editor = $('#templateEditor');
        if (editor.length) {
            editor.summernote({
                height: 300,
                toolbar: [
                    ['style', ['style']],
                    ['font', ['bold', 'underline', 'clear']],
                    ['color', ['color']],
                    ['para', ['ul', 'ol', 'paragraph']],
                    ['table', ['table']],
                    ['view', ['codeview']]
                ],
                callbacks: {
                    onChange: (contents) => {
                        window.printTemplate = contents;
                        this.updatePreview();
                    }
                }
            });
            // Load initial content
            editor.summernote('code', window.printTemplate || \"<h1>{title}</h1><p>{recipes}</p>\");
        }
    },

    setInputValue: function(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    },

    bindEvents: function() {
        const inputs = ['styleFont', 'stylePageBg'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    this.updateSettingsFromUI();
                    this.updatePreview();
                });
            }
        });

        const saveBtn = document.getElementById('btnSaveStyle');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
                window.updatePrintTemplate(window.printTemplate);
                alert('Template settings and HTML saved!');
            });
        }
    },

    updateSettingsFromUI: function() {
        this.settings.font = document.getElementById('styleFont').value;
        this.settings.pageBg = document.getElementById('stylePageBg').value;
    },

    updatePreview: function() {
        const sheet = document.getElementById('livePreviewSheet');
        const contentArea = document.getElementById('templatePreviewContent');
        if (!sheet || !contentArea) return;

        // Apply styles to the preview sheet wrapper
        sheet.style.fontFamily = this.settings.font;
        sheet.style.backgroundColor = this.settings.pageBg;

        // Generate mock data for preview
        const mockData = {
            title: \"Weekly Menu\",
            date: new Date().toLocaleDateString(),
            recipes: this.generateMockRecipeList()
        };

        let html = window.printTemplate || \"\";
        html = html.replace(/{title}/g, mockData.title);
        html = html.replace(/{date}/g, mockData.date);
        html = html.replace(/{recipes}/g, mockData.recipes);

        contentArea.innerHTML = html;
    },

    generateMockRecipeList: function() {
        // Grab a few recipes from the store for the preview
        const sampleRecipes = window.recipes.slice(0, 3).map(r => `<li>${r.name}</li>`).join('');
        return `<ul>${sampleRecipes}</ul>`;
    },

    saveSettings: function() {
        localStorage.setItem('kitchenPro_template', JSON.stringify(this.settings));
    },

    print: function() {
        const printWindow = window.open('', '_blank');
        if(!printWindow) return;

        const s = this.settings;
        const css = `
            body { font-family: \"${s.font}\"; background-color: ${s.pageBg}; padding: 20mm; }
            .print-container { background: white; }
        `;

        // Here we'd actually resolve real data for the current week
        const html = `
            <html>
            <head><style>${css}</style></head>
            <body>
                <div class=\"print-container\">
                    ${document.getElementById('templatePreviewContent').innerHTML}
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
};

window.printMenu = function() { TemplateManager.print(); };

document.addEventListener('DOMContentLoaded', () => {
    TemplateManager.init();
});

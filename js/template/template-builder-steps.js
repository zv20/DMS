/**
 * Step-Based Template Builder with Accordion UI
 * @version 6.7 - Align/font/size/color merged into RTE toolbar
 */

class StepTemplateBuilder {
    constructor() {
        this.settings = {
            templateStyle: 'compact',
            backgroundColor: '#ffffff',
            backgroundImages: [
                { image: null, position: 'center',       size: 100, opacity: 1.0, zIndex: 1 },
                { image: null, position: 'top-left',     size: 20,  opacity: 1.0, zIndex: 2 },
                { image: null, position: 'top-right',    size: 20,  opacity: 1.0, zIndex: 3 },
                { image: null, position: 'bottom-left',  size: 20,  opacity: 1.0, zIndex: 4 },
                { image: null, position: 'bottom-right', size: 20,  opacity: 1.0, zIndex: 5 }
            ],
            showHeader:       true,
            headerText:       'Седмично меню',
            headerAlignment:  'center',
            headerFontSize:   24,
            headerColor:      '#d2691e',
            headerFontFamily: 'Arial, sans-serif',

            showDateRange:    true,
            dateFontSize:     12,
            dateColor:        '#666666',
            dateAlignment:    'center',
            dateFontFamily:   'Arial, sans-serif',

            showIngredients:  true,
            showCalories:     true,
            showPortions:     true,

            dayBorder:          false,
            dayBorderColor:     '#e0e0e0',
            dayBorderStyle:     'solid',
            dayBorderThickness: '1px',
            dayBackground:      'transparent',
            dayNameSize:        14,
            dayNameColor:       '#333333',
            dayNameWeight:      'bold',
            dayNameFontFamily:  'Arial, sans-serif',

            mealFontSize:       11,
            mealFontFamily:     'Arial, sans-serif',

            allergenColor:      '#ff0000',
            allergenUnderline:  false,
            allergenBold:       true,

            showFooter:       true,
            footerText:       'Приготвено с любов',
            footerAlignment:  'center',
            footerFontSize:   9,
            footerFontFamily: 'Arial, sans-serif'
        };

        this.previewData     = null;
        this.expandedSection = 'header';
        this.currentTab      = 'builder';
        this.init();
    }

    // ─── FONT LIST ────────────────────────────────────────────────────────────
    _fonts() {
        return [
            { value: 'Arial, sans-serif',            label: 'Arial' },
            { value: "'Times New Roman', serif",     label: 'Times New Roman' },
            { value: 'Georgia, serif',               label: 'Georgia' },
            { value: "'Comic Sans MS', cursive",     label: 'Comic Sans' },
            { value: 'Verdana, sans-serif',          label: 'Verdana' },
            { value: "'Courier New', monospace",     label: 'Courier New' },
            { value: "'Trebuchet MS', sans-serif",   label: 'Trebuchet' },
            { value: 'Tahoma, sans-serif',           label: 'Tahoma' }
        ];
    }

    // ─── RICH TEXT EDITOR ────────────────────────────────────────────────────
    /**
     * Renders a mini rich-text editor with a full integrated toolbar.
     * Toolbar row 1: align | font | size | B I U S | A (color) | bullet | clear
     * @param {string} id          - settings key (e.g. 'headerText')
     * @param {string} html        - current HTML content
     * @param {string} alignVal    - current alignment setting value
     * @param {string} fontVal     - current font-family setting value
     * @param {number} sizeVal     - current font size setting value
     * @param {number} sizeMin     - min font size
     * @param {number} sizeMax     - max font size
     * @param {string} colorVal    - current text colour (hex)
     * @param {string} alignId     - settings key for alignment
     * @param {string} fontId      - settings key for font
     * @param {string} sizeId      - settings key for size
     * @param {string} colorId     - settings key for colour
     */
    _richEditor(id, html, alignVal, fontVal, sizeVal, sizeMin, sizeMax, colorVal, alignId, fontId, sizeId, colorId) {
        const fonts   = this._fonts();
        const curFont = fonts.find(f => f.value === fontVal) || fonts[0];
        const alignOpts = [
            { val: 'left',   icon: '&#8676;', title: 'Left'   },
            { val: 'center', icon: '&#9868;', title: 'Center' },
            { val: 'right',  icon: '&#8677;', title: 'Right'  }
        ];

        return `
        <div class="rte-wrap" data-id="${id}" data-align-id="${alignId}" data-font-id="${fontId}" data-size-id="${sizeId}" data-color-id="${colorId}">
            <div class="rte-toolbar">

                <!-- Alignment -->
                <div class="rte-align-group" data-id="${alignId}">
                    ${alignOpts.map(o => `
                        <button type="button" class="rte-btn rte-align-btn ${alignVal === o.val ? 'active' : ''}" data-val="${o.val}" title="${o.title}">${o.icon}</button>
                    `).join('')}
                </div>
                <div class="rte-sep"></div>

                <!-- Font family -->
                <div class="rte-font-picker" id="rfp_${id}" data-id="${fontId}" data-val="${fontVal}">
                    <button type="button" class="rte-font-btn" title="Font">
                        <span class="rte-font-preview" style="font-family:${fontVal}">${curFont.label}</span>
                        <span class="rte-caret">&#9660;</span>
                    </button>
                    <div class="rte-font-dropdown">
                        ${fonts.map(f => `
                            <div class="rte-font-option ${f.value === fontVal ? 'active' : ''}" data-val="${f.value}" style="font-family:${f.value}">${f.label}</div>
                        `).join('')}
                    </div>
                </div>
                <div class="rte-sep"></div>

                <!-- Size stepper -->
                <div class="rte-size-stepper" data-id="${sizeId}">
                    <button type="button" class="rte-step-btn" data-dir="-1" title="Decrease">&#8722;</button>
                    <span class="rte-size-val" id="rsv_${sizeId}">${sizeVal}</span>
                    <span class="rte-size-unit">pt</span>
                    <button type="button" class="rte-step-btn" data-dir="1" title="Increase">&#43;</button>
                    <input type="hidden" id="rsh_${sizeId}" value="${sizeVal}" data-min="${sizeMin}" data-max="${sizeMax}">
                </div>
                <div class="rte-sep"></div>

                <!-- Format: B I U S -->
                <button type="button" class="rte-btn" data-cmd="bold"          title="Bold"><b>B</b></button>
                <button type="button" class="rte-btn" data-cmd="italic"        title="Italic"><i>I</i></button>
                <button type="button" class="rte-btn" data-cmd="underline"     title="Underline"><u>U</u></button>
                <button type="button" class="rte-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
                <div class="rte-sep"></div>

                <!-- Inline colour -->
                <label class="rte-color-wrap" title="Text color">
                    <span>A</span>
                    <input type="color" class="rte-color" value="${colorVal || '#000000'}">
                </label>
                <div class="rte-sep"></div>

                <!-- Bullet list -->
                <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Bullet list">&#8226;&#8211;</button>
                <div class="rte-sep"></div>

                <!-- Clear formatting -->
                <button type="button" class="rte-btn rte-clear" title="Remove formatting">&#10005;</button>
            </div>

            <div class="rte-editor"
                 id="rte_${id}"
                 contenteditable="true"
                 spellcheck="false">${html}</div>
        </div>`;
    }

    // ─── LEGACY STANDALONE HELPERS (still used by date-range & menu sections) ─
    _alignToggle(id, currentVal) {
        const opts = [
            { val: 'left',   title: 'Left'   },
            { val: 'center', title: 'Center' },
            { val: 'right',  title: 'Right'  }
        ];
        return `<div class="tb-align-group" data-id="${id}">
            ${opts.map(o => `
                <button type="button"
                    class="tb-align-btn ${currentVal === o.val ? 'active' : ''}"
                    data-val="${o.val}" title="${o.title}">
                    ${ o.val === 'left' ? '&#8676;' : o.val === 'center' ? '&#9868;' : '&#8677;' }
                </button>`).join('')}
        </div>`;
    }

    _fontPicker(id, currentVal) {
        const fonts = this._fonts();
        const current = fonts.find(f => f.value === currentVal) || fonts[0];
        return `<div class="tb-font-picker" id="fp_${id}" data-id="${id}" data-val="${currentVal}">
            <button type="button" class="tb-font-btn" title="Font Family">
                <span class="tb-font-preview" style="font-family:${currentVal}">${current.label}</span>
                <span class="tb-caret">&#9660;</span>
            </button>
            <div class="tb-font-dropdown">
                ${fonts.map(f => `
                    <div class="tb-font-option ${f.value === currentVal ? 'active' : ''}"
                        data-val="${f.value}" style="font-family:${f.value}">${f.label}</div>`).join('')}
            </div>
        </div>`;
    }

    _sizeStepper(id, currentVal, min, max) {
        return `<div class="tb-size-stepper" data-id="${id}">
            <button type="button" class="tb-step-btn" data-dir="-1" title="Decrease">&#8722;</button>
            <span class="tb-size-val" id="sv_${id}">${currentVal}</span>
            <span class="tb-size-unit">pt</span>
            <button type="button" class="tb-step-btn" data-dir="1" title="Increase">&#43;</button>
            <input type="hidden" id="${id}" value="${currentVal}" data-min="${min}" data-max="${max}">
        </div>`;
    }

    _borderStyleToggle(id, currentVal) {
        const opts = [
            { val: 'solid',  px: 2 },
            { val: 'dashed', px: 2 },
            { val: 'dotted', px: 2 },
            { val: 'double', px: 4 }
        ];
        return `<div class="tb-border-group" data-id="${id}">
            ${opts.map(o => `
                <button type="button"
                    class="tb-border-btn ${currentVal === o.val ? 'active' : ''}"
                    data-val="${o.val}" title="${o.val}">
                    <span style="border-bottom:${o.px}px ${o.val} currentColor;display:block;width:28px;"></span>
                </button>`).join('')}
        </div>`;
    }

    _borderThicknessToggle(id, currentVal) {
        const opts = [{ val:'1px',px:1},{val:'2px',px:2},{val:'3px',px:3},{val:'4px',px:4}];
        return `<div class="tb-border-group" data-id="${id}">
            ${opts.map(o => `
                <button type="button"
                    class="tb-border-btn ${currentVal === o.val ? 'active' : ''}"
                    data-val="${o.val}" title="${o.val}">
                    <span style="display:block;width:28px;height:${o.px*2}px;background:currentColor;border-radius:1px;"></span>
                </button>`).join('')}
        </div>`;
    }

    // ─── INIT ─────────────────────────────────────────────────────────────────
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.injectTabsIntoHeader();
        this.buildUI();
        this.bindTabControls();
        this.bindAccordion();
        this.bindControls();
        this.loadSampleData();
        this.updatePreview();
    }

    injectTabsIntoHeader() {
        const stylePage = document.getElementById('style-editor');
        if (!stylePage) return;
        const pageHeader = stylePage.querySelector('.page-header');
        if (!pageHeader || document.querySelector('.builder-tab-btns')) return;

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'builder-tab-btns';
        tabsContainer.style.cssText = 'display:inline-flex;gap:10px;margin-left:15px;';
        tabsContainer.innerHTML = `
            <button class="btn btn-secondary btn-small builder-tab-btn active" data-tab="builder" style="background:#495057;">${window.t('tab_builder')}</button>
            <button class="btn btn-secondary btn-small builder-tab-btn" data-tab="templates">${window.t('tab_templates')}</button>
            <button class="btn btn-secondary btn-small builder-tab-btn" data-tab="images">${window.t('tab_images')}</button>
        `;
        const backButton = pageHeader.querySelector('button');
        if (backButton?.parentNode) backButton.parentNode.insertBefore(tabsContainer, backButton.nextSibling);
        else pageHeader.appendChild(tabsContainer);

        const style = document.createElement('style');
        style.textContent = `.builder-tab-btn:hover{background:#5a6268!important;}.builder-tab-btn.active{background:#495057!important;}`;
        document.head.appendChild(style);
    }

    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        if (!sidebar) return;
        sidebar.innerHTML = `
            <div class="step-template-controls">
                <div id="tab-builder"   class="tab-content active">${this.renderBuilderTab()}</div>
                <div id="tab-templates" class="tab-content">${this.renderTemplatesTab()}</div>
                <div id="tab-images"    class="tab-content">${this.renderImagesTab()}</div>
            </div>
            ${this.renderStyles()}
        `;
        this.bindActionButtons();
    }

    renderBuilderTab() {
        return `
            <h2 style="margin:0 0 6px 0;font-size:18px;">${window.t('builder_title')}</h2>
            <p  style="margin:0 0 12px 0;font-size:12px;color:#666;">${window.t('builder_subtitle')}</p>
            ${this.renderAccordionSection('background', window.t('section_background'), this.renderBackgroundControls())}
            ${this.renderAccordionSection('header',     window.t('section_header'),     this.renderHeaderControls())}
            ${this.renderAccordionSection('menu',       window.t('section_menu'),       this.renderMenuControls())}
            ${this.renderAccordionSection('footer',     window.t('section_footer'),     this.renderFooterControls())}
            <div style="margin-top:25px;padding-top:20px;border-top:2px solid #e0e0e0;">
                <button id="btnLoadData"     class="btn btn-primary"   style="width:100%;margin-bottom:10px;">${window.t('btn_load_menu_data')}</button>
                <button id="btnSaveTemplate" class="btn btn-secondary" style="width:100%;margin-bottom:10px;">${window.t('btn_save_template')}</button>
                <button id="btnReset"        class="btn btn-secondary" style="width:100%;">${window.t('btn_reset_default')}</button>
            </div>`;
    }

    renderTemplatesTab() {
        return `<div style="padding:10px 0;">
            <h2 style="margin:0 0 10px 0;font-size:18px;">${window.t('templates_title')}</h2>
            <p  style="margin:0 0 15px 0;font-size:12px;color:#666;">${window.t('templates_subtitle')}</p>
            <div id="templates-list" style="display:flex;flex-direction:column;gap:10px;"></div>
        </div>`;
    }

    renderImagesTab() {
        return `<div style="padding:10px 0;">
            <h2 style="margin:0 0 10px 0;font-size:18px;">${window.t('images_title')}</h2>
            <p  style="margin:0 0 15px 0;font-size:12px;color:#666;">${window.t('images_subtitle')}</p>
            <div class="subsection">
                <h4 style="margin:0 0 10px 0;font-size:13px;">${window.t('images_bg_title')}</h4>
                <div id="bg-images-list" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;"></div>
            </div>
        </div>`;
    }

    bindTabControls() {
        document.querySelectorAll('.builder-tab-btn').forEach(btn => {
            btn.addEventListener('click', e => this.switchTab(e.currentTarget.dataset.tab));
        });
    }

    async switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.builder-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
            btn.style.background = btn.dataset.tab === tab ? '#495057' : '';
        });
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `tab-${tab}`);
        });
        if (tab === 'templates') await this.loadTemplates();
        else if (tab === 'images') await this.loadImages();
    }

    async loadTemplates() {
        const container = document.getElementById('templates-list');
        if (!container) return;
        if (!window.menuTemplates || !Object.keys(window.menuTemplates).length) {
            container.innerHTML = `<div style="padding:30px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;">
                <p style="margin:0;">${window.t('templates_empty')}</p>
                <p style="margin:5px 0 0 0;font-size:12px;">${window.t('templates_empty_desc')}</p>
            </div>`;
            return;
        }
        container.innerHTML = Object.entries(window.menuTemplates).map(([name, t]) => `
            <div class="template-card">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${name}</div>
                    <div style="font-size:11px;color:#666;">${t.templateStyle||'compact'} | H:${t.showHeader?'✓':'✗'} F:${t.showFooter?'✓':'✗'}</div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;" onclick="stepTemplateBuilder.loadTemplate('${name}')">&#128229;</button>
                    <button class="btn btn-secondary" style="padding:6px 10px;font-size:12px;" onclick="stepTemplateBuilder.deleteTemplate('${name}')">&#128465;</button>
                </div>
            </div>`).join('');
    }

    async loadTemplate(name) {
        if (!window.menuTemplates?.[name]) { alert(window.t('alert_template_not_found')); return; }
        if (confirm(window.t('alert_template_load_confirm').replace('{name}', name))) {
            this.settings = { ...window.menuTemplates[name] };
            const fb = 'Arial, sans-serif';
            ['headerFontFamily','dateFontFamily','dayNameFontFamily','mealFontFamily','footerFontFamily']
                .forEach(k => { if (!this.settings[k]) this.settings[k] = fb; });
            this.switchTab('builder');
            this.buildUI(); this.bindTabControls(); this.bindAccordion(); this.bindControls(); this.bindActionButtons();
            // restore rich-text content
            const hEl = document.getElementById('rte_headerText');
            const fEl = document.getElementById('rte_footerText');
            if (hEl) hEl.innerHTML = this.settings.headerText || '';
            if (fEl) fEl.innerHTML = this.settings.footerText  || '';
            this.updatePreview();
            alert(window.t('alert_template_loaded'));
        }
    }

    async deleteTemplate(name) {
        if (!confirm(window.t('alert_template_delete_confirm').replace('{name}', name))) return;
        delete window.menuTemplates[name];
        if (window.storageAdapter) await window.storageAdapter.save('templates', window.menuTemplates);
        await this.loadTemplates();
        alert(window.t('alert_template_deleted'));
    }

    async loadImages() { await this.loadImageFolder('backgrounds', 'bg-images-list'); }

    async loadImageFolder(folder, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!window.directoryHandle) {
            container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_select_folder')}</div>`;
            return;
        }
        try {
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create:false });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create:false });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create:false });
            const images = [];
            for await (const entry of folderDir.values()) {
                if (entry.kind === 'file' && /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name))
                    images.push({ name: entry.name, url: URL.createObjectURL(await entry.getFile()) });
            }
            if (!images.length) {
                container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_empty')}</div>`;
                return;
            }
            container.innerHTML = images.map(img => `
                <div class="image-card">
                    <img src="${img.url}" style="width:100%;height:80px;object-fit:contain;border-radius:4px;margin-bottom:5px;background:#f5f5f5;">
                    <div style="font-size:10px;color:#666;margin-bottom:5px;word-break:break-word;">${img.name}</div>
                    <button class="btn btn-secondary" style="width:100%;padding:4px;font-size:11px;" onclick="stepTemplateBuilder.deleteImage('${folder}','${img.name}')">&#128465;</button>
                </div>`).join('');
        } catch {
            container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_folder_missing')}</div>`;
        }
    }

    async deleteImage(folder, filename) {
        if (!confirm(window.t('alert_image_delete_confirm').replace('{name}', filename))) return;
        try {
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create:false });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create:false });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create:false });
            await folderDir.removeEntry(filename);
            await this.loadImages();
            alert(window.t('alert_image_deleted'));
        } catch { alert(window.t('alert_image_delete_failed')); }
    }

    loadRealData() {
        const isBg = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
        const weeks = this._buildWeekOptions(isBg);
        if (!weeks.length) { alert(isBg ? 'Няма планирани ястия.' : 'No meals found.'); return; }
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:28px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:10000;min-width:340px;';
        dialog.innerHTML = `
            <h2 style="margin:0 0 16px 0;">&#128197; ${isBg?'Зареди данни':'Load Menu Data'}</h2>
            <select id="lrd-week" style="width:100%;padding:10px;border-radius:8px;margin-bottom:20px;">
                ${weeks.map(e=>`<option value="${e.mondayStr}">${e.label}</option>`).join('')}
            </select>
            <div style="display:flex;gap:10px;">
                <button id="lrd-load"   style="flex:1;padding:11px;background:#fd7e14;color:white;border:none;border-radius:8px;font-weight:600;">${isBg?'&#9989; Зареди':'&#9989; Load'}</button>
                <button id="lrd-cancel" style="padding:11px 18px;background:#e9ecef;border:none;border-radius:8px;">${isBg?'Отказ':'Cancel'}</button>
            </div>`;
        document.body.appendChild(overlay); document.body.appendChild(dialog);
        const close = () => { document.body.removeChild(overlay); document.body.removeChild(dialog); };
        dialog.querySelector('#lrd-load').addEventListener('click', () => {
            const entry = weeks.find(e => e.mondayStr === dialog.querySelector('#lrd-week').value);
            close(); this._applyWeekData(entry.monday, entry.friday, isBg);
        });
        dialog.querySelector('#lrd-cancel').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }

    _buildWeekOptions(isBg) {
        const _mon = d => { const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()+(day===0?1:-(day-1))); x.setHours(0,0,0,0); return x; };
        const _str = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const set = new Set();
        Object.keys(window.currentMenu||{}).forEach(ds => {
            if (Object.values(window.currentMenu[ds]||{}).some(s=>s&&s.recipe)) set.add(_str(_mon(new Date(ds+'T00:00:00'))));
        });
        if (!set.size) return [];
        const locale = isBg ? 'bg-BG' : 'en-US';
        return Array.from(set).sort().map(mondayStr => {
            const monday = new Date(mondayStr+'T00:00:00'), friday = new Date(monday);
            friday.setDate(monday.getDate()+4);
            return { mondayStr, monday, friday, label:`&#127869;&#65039; ${monday.toLocaleDateString(locale,{month:'short',day:'numeric'})} – ${friday.toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric'})}` };
        });
    }

    _applyWeekData(startDate, endDate, isBg) {
        const dayNames = isBg ? ['Понеделник','Вторник','Сряда','Четвъртък','Петък'] : ['Monday','Tuesday','Wednesday','Thursday','Friday'];
        const _str = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const days = [];
        for (let i=0; i<5; i++) {
            const d = new Date(startDate); d.setDate(startDate.getDate()+i);
            const dayMenu = window.getMenuForDate ? window.getMenuForDate(_str(d)) : {};
            const meals = [];
            ['slot1','slot2','slot3','slot4'].forEach((slotId,idx) => {
                const slot = dayMenu[slotId];
                const recipe = slot?.recipe ? (window.recipes||[]).find(r=>r.id===slot.recipe) : null;
                if (!recipe) return;
                const ingredients = (recipe.ingredients||[]).map(ingObj => {
                    const ing = (window.ingredients||[]).find(i=>i.id===(typeof ingObj==='string'?ingObj:ingObj.id));
                    return ing ? { name:ing.name, hasAllergen:!!(ing.allergens&&ing.allergens.length) } : null;
                }).filter(Boolean);
                meals.push({ number:idx+1, name:recipe.name, portion:recipe.portionSize||'', calories:recipe.calories||null, ingredients });
            });
            if (meals.length) days.push({ name:dayNames[i], meals });
        }
        this.previewData = { startDate, endDate, days };
        this.updatePreview();
    }

    renderAccordionSection(id, title, content) {
        const open = this.expandedSection === id;
        return `<div class="accordion-section ${open?'expanded':''}" data-section="${id}">
            <div class="accordion-header">
                <span class="accordion-icon">${open?'&#9660;':'&#9658;'}</span>
                <span>${title}</span>
            </div>
            <div class="accordion-content" style="display:${open?'block':'none'};">${content}</div>
        </div>`;
    }

    // ─── BACKGROUND ──────────────────────────────────────────────────────────
    renderBackgroundControls() {
        return `<div class="control-group">
            <label>${window.t('label_background_color')}</label>
            <input type="color" id="backgroundColor" value="${this.settings.backgroundColor}" class="color-input">
            <div style="margin:15px 0;padding:10px;background:#e3f2fd;border-left:4px solid #2196f3;border-radius:4px;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#1565c0;">${window.t('label_background_info')}</p>
            </div>
            ${[0,1,2,3,4].map(i=>this.renderImageSlot(i,`${window.t('label_image_layer')} ${i+1}`)).join('')}
        </div>`;
    }

    renderImageSlot(index, title) {
        const slot = this.settings.backgroundImages[index];
        return `<div class="subsection" style="margin-bottom:12px;">
            <h4 style="margin:0 0 10px 0!important;">${title}</h4>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <input type="file" id="bgImage${index}Upload" accept="image/*" style="display:none;">
                <button id="uploadBgImage${index}Btn" class="btn btn-secondary" style="flex:1;">${window.t('btn_upload')}</button>
                <button id="browseBgImage${index}Btn" class="btn btn-secondary" style="flex:1;">${window.t('btn_library')}</button>
                <button id="removeBgImage${index}Btn" class="btn btn-secondary" style="width:40px;">${window.t('btn_remove')}</button>
            </div>
            <div id="bgImage${index}Preview" style="display:${slot.image?'block':'none'};padding:6px;background:#f5f5f5;border-radius:4px;margin-bottom:8px;">
                <small style="color:#555;">${window.t('file_label')} <strong id="bgImage${index}FileName">${slot.image||''}</strong></small>
            </div>
            <label>${window.t('label_position')}</label>
            <select id="bgImage${index}Position" class="select-input">
                ${['center','top-left','top-center','top-right','center-left','center-right','bottom-left','bottom-center','bottom-right']
                  .map(p=>`<option value="${p}" ${slot.position===p?'selected':''}>${window.t('pos_'+p.replace('-','_'))}</option>`).join('')}
            </select>
            <label>${window.t('label_size')}</label>
            <input type="range" id="bgImage${index}Size" min="5" max="100" value="${slot.size}" class="slider">
            <div class="slider-value"><span id="bgImage${index}SizeValue">${slot.size}</span>%</div>
            <label>${window.t('label_opacity')}</label>
            <input type="range" id="bgImage${index}Opacity" min="0" max="100" value="${slot.opacity*100}" class="slider">
            <div class="slider-value"><span id="bgImage${index}OpacityValue">${Math.round(slot.opacity*100)}</span>%</div>
            <label>${window.t('label_layer')}</label>
            <select id="bgImage${index}ZIndex" class="select-input">
                ${[1,2,3,4,5].map(z=>`<option value="${z}" ${slot.zIndex===z?'selected':''}>${z===1?window.t('layer_back'):z===5?window.t('layer_front'):z}</option>`).join('')}
            </select>
        </div>`;
    }

    // ─── HEADER ───────────────────────────────────────────────────────────────
    renderHeaderControls() {
        const s = this.settings;
        return `<div class="control-group">
            <label class="checkbox-label">
                <input type="checkbox" id="showHeader" ${s.showHeader?'checked':''}>
                <span>${window.t('label_show_header')}</span>
            </label>

            <label>${window.t('label_header_text')}</label>
            ${this._richEditor(
                'headerText',
                s.headerText,
                s.headerAlignment,
                s.headerFontFamily,
                s.headerFontSize, 8, 120,
                s.headerColor,
                'headerAlignment', 'headerFontFamily', 'headerFontSize', 'headerColor'
            )}

            <h4 style="margin-top:18px;">&#128197; Date Range</h4>
            <label class="checkbox-label">
                <input type="checkbox" id="showDateRange" ${s.showDateRange?'checked':''}>
                <span>Show Date Range</span>
            </label>

            <label>Alignment</label>
            ${this._alignToggle('dateAlignment', s.dateAlignment)}

            <label>Font</label>
            ${this._fontPicker('dateFontFamily', s.dateFontFamily)}

            <label>Size</label>
            ${this._sizeStepper('dateFontSize', s.dateFontSize, 6, 60)}

            <label>Color</label>
            <input type="color" id="dateColor" value="${s.dateColor}" class="color-input">
        </div>`;
    }

    // ─── MENU ─────────────────────────────────────────────────────────────────
    renderMenuControls() {
        const dayBgIsTransparent = !this.settings.dayBackground || this.settings.dayBackground === 'transparent';
        const dayBgColor = dayBgIsTransparent ? '#ffffff' : this.settings.dayBackground;
        return `<div class="control-group">
            <h4>${window.t('label_template_style')}</h4>
            <label class="radio-label"><input type="radio" name="templateStyle" value="compact"       ${this.settings.templateStyle==='compact'?'checked':''}><span><strong>${window.t('style_compact')}</strong> – ${window.t('style_compact_desc')}</span></label>
            <label class="radio-label"><input type="radio" name="templateStyle" value="detailed"      ${this.settings.templateStyle==='detailed'?'checked':''}><span><strong>${window.t('style_detailed')}</strong> – ${window.t('style_detailed_desc')}</span></label>
            <label class="radio-label"><input type="radio" name="templateStyle" value="detailed-2col" ${this.settings.templateStyle==='detailed-2col'?'checked':''}><span><strong>${window.t('style_detailed_2col')}</strong></span></label>

            <h4 style="margin-top:15px;">${window.t('label_day_block')}</h4>
            <label class="checkbox-label"><input type="checkbox" id="dayBorder" ${this.settings.dayBorder?'checked':''}><span>${window.t('label_show_border')}</span></label>

            <label>${window.t('label_border_color')}</label>
            <input type="color" id="dayBorderColor" value="${this.settings.dayBorderColor}" class="color-input">

            <label>${window.t('label_border_style')}</label>
            ${this._borderStyleToggle('dayBorderStyle', this.settings.dayBorderStyle)}

            <label>${window.t('label_border_thickness')}</label>
            ${this._borderThicknessToggle('dayBorderThickness', this.settings.dayBorderThickness)}

            <label style="margin-top:4px;">${window.t('label_background')}</label>
            <label class="checkbox-label" style="margin-bottom:4px;">
                <input type="checkbox" id="dayBgTransparent" ${dayBgIsTransparent?'checked':''}>
                <span>No background (transparent)</span>
            </label>
            <input type="color" id="dayBackground" value="${dayBgColor}" class="color-input"
                style="${dayBgIsTransparent?'opacity:0.35;pointer-events:none;':''}"
                ${dayBgIsTransparent?'disabled':''}>

            <h4 style="margin-top:15px;">${window.t('label_day_name')}</h4>
            <label>Font</label>
            ${this._fontPicker('dayNameFontFamily', this.settings.dayNameFontFamily)}
            <label>Size</label>
            ${this._sizeStepper('dayNameSize', this.settings.dayNameSize, 8, 48)}
            <label>${window.t('label_color')}</label>
            <input type="color" id="dayNameColor" value="${this.settings.dayNameColor}" class="color-input">

            <h4 style="margin-top:15px;">&#127869;&#65039; Meal Text</h4>
            <label>Font</label>
            ${this._fontPicker('mealFontFamily', this.settings.mealFontFamily)}
            <label>Size</label>
            ${this._sizeStepper('mealFontSize', this.settings.mealFontSize, 6, 36)}

            <h4 style="margin-top:15px;">${window.t('label_allergens')}</h4>
            <label>${window.t('label_color')}</label>
            <input type="color" id="allergenColor" value="${this.settings.allergenColor}" class="color-input">
            <label class="checkbox-label"><input type="checkbox" id="allergenUnderline" ${this.settings.allergenUnderline?'checked':''}><span>${window.t('label_underline')}</span></label>
            <label class="checkbox-label"><input type="checkbox" id="allergenBold"      ${this.settings.allergenBold?'checked':''}><span>${window.t('label_bold')}</span></label>
        </div>`;
    }

    // ─── FOOTER ───────────────────────────────────────────────────────────────
    renderFooterControls() {
        const s = this.settings;
        return `<div class="control-group">
            <label class="checkbox-label">
                <input type="checkbox" id="showFooter" ${s.showFooter?'checked':''}>
                <span>${window.t('label_show_footer')}</span>
            </label>

            <label>${window.t('label_footer_text')}</label>
            ${this._richEditor(
                'footerText',
                s.footerText,
                s.footerAlignment,
                s.footerFontFamily,
                s.footerFontSize, 6, 48,
                '#000000',
                'footerAlignment', 'footerFontFamily', 'footerFontSize', null
            )}
        </div>`;
    }

    // ─── STYLES ───────────────────────────────────────────────────────────────
    renderStyles() {
        return `<style>
            /* ── Layout ── */
            .step-template-controls{padding:20px;background:white;border-radius:8px;}
            .tab-content{display:none;}.tab-content.active{display:block;}
            .accordion-section{margin-bottom:10px;border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;}
            .accordion-section.expanded{border-color:#2196f3;}
            .accordion-header{padding:12px 15px;background:#f8f9fa;cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;}
            .accordion-section.expanded .accordion-header{background:#e3f2fd;color:#1976d2;}
            .accordion-content{padding:15px;}
            .control-group{display:flex;flex-direction:column;gap:8px;}
            .control-group label{font-weight:500;font-size:12px;color:#555;margin-top:4px;}
            .control-group h4{margin:10px 0 6px 0;font-size:13px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;}
            .checkbox-label{display:flex;align-items:center;gap:8px;cursor:pointer;}
            .checkbox-label input{width:16px;height:16px;}
            .checkbox-label span{font-weight:normal;}
            .radio-label{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #e0e0e0;border-radius:4px;cursor:pointer;}
            .text-input,.select-input{padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;width:100%;box-sizing:border-box;}
            .color-input{width:100%;height:36px;border:1px solid #ddd;border-radius:4px;cursor:pointer;}
            .slider{width:100%;}.slider-value{text-align:center;font-size:12px;color:#666;}
            .subsection{background:#f8f9fa;padding:12px;border-radius:6px;}
            .template-card{display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;}
            .image-card{padding:10px;border:2px solid #e0e0e0;border-radius:8px;text-align:center;}

            /* ── Rich Text Editor ── */
            .rte-wrap{border:1px solid #ddd;border-radius:6px;overflow:visible;}
            .rte-toolbar{
                display:flex;align-items:center;gap:2px;
                padding:5px 6px;background:#f8f9fa;
                border-bottom:1px solid #e0e0e0;flex-wrap:wrap;
                border-radius:6px 6px 0 0;
            }
            .rte-btn{
                min-width:28px;height:26px;padding:0 5px;
                border:1px solid transparent;border-radius:4px;
                background:transparent;cursor:pointer;font-size:13px;
                display:flex;align-items:center;justify-content:center;
                transition:all .15s;
            }
            .rte-btn:hover{background:#e9ecef;border-color:#adb5bd;}
            .rte-btn.active{background:#fd7e14;border-color:#fd7e14;color:white;}
            .rte-sep{width:1px;height:18px;background:#ddd;margin:0 3px;flex-shrink:0;}
            .rte-color-wrap{
                position:relative;display:flex;align-items:center;justify-content:center;
                min-width:28px;height:26px;padding:0 5px;
                border:1px solid transparent;border-radius:4px;
                cursor:pointer;font-size:13px;font-weight:700;
                transition:all .15s;
            }
            .rte-color-wrap:hover{background:#e9ecef;border-color:#adb5bd;}
            .rte-color-wrap span{
                pointer-events:none;
                text-decoration:underline;
                text-decoration-color: var(--rte-color, #000);
                text-decoration-thickness:2px;
            }
            .rte-color{position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;top:0;left:0;}
            .rte-editor{
                padding:8px 10px;
                min-height:60px;
                max-height:160px;
                overflow-y:auto;
                font-size:13px;
                line-height:1.5;
                outline:none;
                background:white;
                border-radius:0 0 6px 6px;
            }
            .rte-editor:focus{background:#fffdf8;}
            .rte-clear{color:#999;}

            /* ── RTE: Alignment ── */
            .rte-align-group{display:flex;gap:2px;}
            .rte-align-btn{min-width:26px;height:26px;padding:0 4px;border:1px solid transparent;border-radius:4px;background:transparent;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
            .rte-align-btn:hover{background:#e9ecef;border-color:#adb5bd;}
            .rte-align-btn.active{background:#fd7e14;border-color:#fd7e14;color:white;}

            /* ── RTE: Font picker ── */
            .rte-font-picker{position:relative;}
            .rte-font-btn{display:flex;align-items:center;justify-content:space-between;padding:3px 7px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;height:26px;white-space:nowrap;max-width:100px;transition:all .15s;}
            .rte-font-btn:hover{background:#e9ecef;border-color:#adb5bd;}
            .rte-font-preview{font-size:12px;flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72px;}
            .rte-caret{font-size:9px;color:#888;margin-left:4px;flex-shrink:0;}
            .rte-font-dropdown{display:none;position:absolute;top:calc(100% + 4px);left:0;min-width:160px;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:99999;max-height:200px;overflow-y:auto;}
            .rte-font-picker.open .rte-font-dropdown{display:block;}
            .rte-font-option{padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f0f0f0;transition:background .1s;}
            .rte-font-option:last-child{border-bottom:none;}
            .rte-font-option:hover{background:#fff3e0;}
            .rte-font-option.active{background:#fff3e0;color:#fd7e14;font-weight:600;}

            /* ── RTE: Size stepper ── */
            .rte-size-stepper{display:flex;align-items:center;gap:3px;}
            .rte-step-btn{width:22px;height:22px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
            .rte-step-btn:hover{background:#fd7e14;border-color:#fd7e14;color:white;}
            .rte-size-val{min-width:24px;text-align:center;font-size:12px;font-weight:600;color:#333;}
            .rte-size-unit{font-size:10px;color:#888;}

            /* ── Standalone alignment toggle (date-range / menu) ── */
            .tb-align-group{display:flex;gap:4px;}
            .tb-align-btn{flex:1;padding:6px 0;border:1px solid #ddd;border-radius:5px;background:#f8f9fa;cursor:pointer;font-size:15px;line-height:1;transition:all .15s;}
            .tb-align-btn:hover{background:#e9ecef;border-color:#adb5bd;}
            .tb-align-btn.active{background:#fd7e14;border-color:#fd7e14;color:white;}

            /* ── Standalone font picker ── */
            .tb-font-picker{position:relative;width:100%;}
            .tb-font-btn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border:1px solid #ddd;border-radius:5px;background:#f8f9fa;cursor:pointer;font-size:13px;transition:all .15s;}
            .tb-font-btn:hover{background:#e9ecef;border-color:#adb5bd;}
            .tb-font-preview{font-size:14px;flex:1;text-align:left;}
            .tb-caret{font-size:10px;color:#888;margin-left:6px;}
            .tb-font-dropdown{display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:9999;max-height:220px;overflow-y:auto;}
            .tb-font-picker.open .tb-font-dropdown{display:block;}
            .tb-font-option{padding:9px 12px;font-size:14px;cursor:pointer;border-bottom:1px solid #f0f0f0;transition:background .1s;}
            .tb-font-option:last-child{border-bottom:none;}
            .tb-font-option:hover{background:#fff3e0;}
            .tb-font-option.active{background:#fff3e0;color:#fd7e14;font-weight:600;}

            /* ── Standalone size stepper ── */
            .tb-size-stepper{display:flex;align-items:center;gap:6px;background:#f8f9fa;border:1px solid #ddd;border-radius:5px;padding:4px 8px;width:fit-content;}
            .tb-step-btn{width:26px;height:26px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .15s;}
            .tb-step-btn:hover{background:#fd7e14;border-color:#fd7e14;color:white;}
            .tb-size-val{min-width:28px;text-align:center;font-size:14px;font-weight:600;color:#333;}
            .tb-size-unit{font-size:11px;color:#888;}

            /* ── Border toggles ── */
            .tb-border-group{display:flex;gap:4px;}
            .tb-border-btn{flex:1;padding:7px 4px;border:1px solid #ddd;border-radius:5px;background:#f8f9fa;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
            .tb-border-btn:hover{background:#e9ecef;border-color:#adb5bd;}
            .tb-border-btn.active{background:#fd7e14;border-color:#fd7e14;color:white;}
            .tb-border-btn.active span{background:white!important;border-bottom-color:white!important;}
        </style>`;
    }

    // ─── ACCORDION ────────────────────────────────────────────────────────────
    bindAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', e => {
                const section = e.currentTarget.closest('.accordion-section');
                const isOpen  = section.classList.contains('expanded');
                document.querySelectorAll('.accordion-section').forEach(s => {
                    s.classList.remove('expanded');
                    s.querySelector('.accordion-content').style.display = 'none';
                    s.querySelector('.accordion-icon').textContent = '\u25b6';
                });
                if (!isOpen) {
                    section.classList.add('expanded');
                    section.querySelector('.accordion-content').style.display = 'block';
                    section.querySelector('.accordion-icon').textContent = '\u25bc';
                    this.expandedSection = section.dataset.section;
                }
            });
        });
    }

    // ─── BIND CONTROLS ────────────────────────────────────────────────────────
    bindControls() {
        [0,1,2,3,4].forEach(i => this.bindMultiImageSlot(i));
        this.bindColorInput('backgroundColor');

        // Header — rich editor binds align/font/size/color internally
        this.bindCheckbox('showHeader');
        this.bindRichEditor('headerText');

        // Date range — standalone controls
        this.bindCheckbox('showDateRange');
        this.bindAlignToggle('dateAlignment');
        this.bindFontPicker('dateFontFamily');
        this.bindSizeStepper('dateFontSize');
        this.bindColorInput('dateColor');

        // Menu
        document.querySelectorAll('input[name="templateStyle"]').forEach(r => {
            r.addEventListener('change', e => { this.settings.templateStyle = e.target.value; this.updatePreview(); });
        });
        this.bindCheckbox('dayBorder');
        this.bindColorInput('dayBorderColor');
        this.bindButtonGroup('dayBorderStyle');
        this.bindButtonGroup('dayBorderThickness');
        this.bindDayBackground();
        this.bindFontPicker('dayNameFontFamily');
        this.bindSizeStepper('dayNameSize');
        this.bindColorInput('dayNameColor');
        this.bindFontPicker('mealFontFamily');
        this.bindSizeStepper('mealFontSize');
        this.bindColorInput('allergenColor');
        this.bindCheckbox('allergenUnderline');
        this.bindCheckbox('allergenBold');

        // Footer — rich editor binds align/font/size internally
        this.bindCheckbox('showFooter');
        this.bindRichEditor('footerText');
    }

    // ─── RICH EDITOR BINDER ───────────────────────────────────────────────────
    bindRichEditor(id) {
        const wrap   = document.querySelector(`.rte-wrap[data-id="${id}"]`);
        const editor = document.getElementById(`rte_${id}`);
        if (!wrap || !editor) return;

        const alignId = wrap.dataset.alignId;
        const fontId  = wrap.dataset.fontId;
        const sizeId  = wrap.dataset.sizeId;
        const colorId = wrap.dataset.colorId;

        // ── Selection save/restore ────────────────────────────────────────────
        let savedRange = null;
        const saveSelection = () => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
        };
        const restoreSelection = () => {
            if (!savedRange) return;
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        };
        editor.addEventListener('keyup',   saveSelection);
        editor.addEventListener('mouseup', saveSelection);

        // ── Content → settings ────────────────────────────────────────────────
        editor.addEventListener('input', () => {
            this.settings[id] = editor.innerHTML;
            this.updatePreview();
        });

        // ── Alignment buttons ────────────────────────────────────────────────
        const alignGroup = wrap.querySelector('.rte-align-group');
        if (alignGroup) {
            alignGroup.querySelectorAll('.rte-align-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    alignGroup.querySelectorAll('.rte-align-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.settings[alignId] = btn.dataset.val;
                    this.updatePreview();
                });
            });
        }

        // ── Font picker ───────────────────────────────────────────────────────
        const fontWrap = wrap.querySelector('.rte-font-picker');
        if (fontWrap) {
            const fontBtn      = fontWrap.querySelector('.rte-font-btn');
            const fontDropdown = fontWrap.querySelector('.rte-font-dropdown');
            const fontPreview  = fontWrap.querySelector('.rte-font-preview');
            fontBtn.addEventListener('click', e => {
                e.stopPropagation();
                document.querySelectorAll('.rte-font-picker.open, .tb-font-picker.open').forEach(p => { if (p !== fontWrap) p.classList.remove('open'); });
                fontWrap.classList.toggle('open');
            });
            fontDropdown.querySelectorAll('.rte-font-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.val;
                    this.settings[fontId] = val;
                    fontPreview.textContent = opt.textContent.trim();
                    fontPreview.style.fontFamily = val;
                    fontDropdown.querySelectorAll('.rte-font-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    fontWrap.classList.remove('open');
                    this.updatePreview();
                });
            });
            document.addEventListener('click', () => fontWrap.classList.remove('open'));
        }

        // ── Size stepper ──────────────────────────────────────────────────────
        const sizeStepper = wrap.querySelector('.rte-size-stepper');
        if (sizeStepper) {
            const hidden  = sizeStepper.querySelector(`#rsh_${sizeId}`);
            const display = sizeStepper.querySelector(`#rsv_${sizeId}`);
            const min = parseInt(hidden.dataset.min);
            const max = parseInt(hidden.dataset.max);
            sizeStepper.querySelectorAll('.rte-step-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    let val = parseInt(hidden.value) + parseInt(btn.dataset.dir);
                    val = Math.min(max, Math.max(min, val));
                    hidden.value = val;
                    display.textContent = val;
                    this.settings[sizeId] = val;
                    this.updatePreview();
                });
            });
        }

        // ── Format buttons (B I U S / bullet / clear) ─────────────────────────
        wrap.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', e => {
                e.preventDefault();
                editor.focus();
                restoreSelection();
                if (btn.classList.contains('rte-clear')) {
                    document.execCommand('removeFormat', false, null);
                } else {
                    document.execCommand(btn.dataset.cmd, false, null);
                }
                this.settings[id] = editor.innerHTML;
                this.updatePreview();
                this._updateRteActiveStates(wrap);
            });
        });

        // ── Inline colour picker ──────────────────────────────────────────────
        const colorInput = wrap.querySelector('.rte-color');
        const colorLabel = wrap.querySelector('.rte-color-wrap span');
        if (colorInput) {
            colorInput.addEventListener('focus', saveSelection);
            colorInput.addEventListener('input', e => {
                colorLabel.style.setProperty('--rte-color', e.target.value);
            });
            colorInput.addEventListener('change', e => {
                editor.focus();
                restoreSelection();
                document.execCommand('foreColor', false, e.target.value);
                this.settings[id] = editor.innerHTML;
                if (colorId) this.settings[colorId] = e.target.value;
                this.updatePreview();
            });
        }

        // ── Toolbar active states on selection change ─────────────────────────
        editor.addEventListener('keyup',   () => this._updateRteActiveStates(wrap));
        editor.addEventListener('mouseup', () => this._updateRteActiveStates(wrap));
    }

    _updateRteActiveStates(wrap) {
        const cmds = ['bold','italic','underline','strikeThrough'];
        cmds.forEach(cmd => {
            const btn = wrap.querySelector(`.rte-btn[data-cmd="${cmd}"]`);
            if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
        });
    }

    // ─── STANDALONE TOOLBAR BINDERS (date-range, menu) ───────────────────────
    bindAlignToggle(id) {
        const group = document.querySelector(`.tb-align-group[data-id="${id}"]`);
        if (!group) return;
        group.querySelectorAll('.tb-align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.tb-align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings[id] = btn.dataset.val;
                this.updatePreview();
            });
        });
    }

    bindFontPicker(id) {
        const wrap = document.getElementById(`fp_${id}`);
        if (!wrap) return;
        const btn      = wrap.querySelector('.tb-font-btn');
        const dropdown = wrap.querySelector('.tb-font-dropdown');
        const preview  = wrap.querySelector('.tb-font-preview');
        btn.addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('.tb-font-picker.open, .rte-font-picker.open').forEach(p => { if (p!==wrap) p.classList.remove('open'); });
            wrap.classList.toggle('open');
        });
        dropdown.querySelectorAll('.tb-font-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const val = opt.dataset.val;
                this.settings[id] = val;
                preview.textContent = opt.textContent.trim();
                preview.style.fontFamily = val;
                dropdown.querySelectorAll('.tb-font-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                wrap.classList.remove('open');
                this.updatePreview();
            });
        });
        document.addEventListener('click', () => wrap.classList.remove('open'));
    }

    bindSizeStepper(id) {
        const stepper = document.querySelector(`.tb-size-stepper[data-id="${id}"]`);
        if (!stepper) return;
        const hidden  = stepper.querySelector(`#${id}`);
        const display = stepper.querySelector(`#sv_${id}`);
        const min = parseInt(hidden.dataset.min);
        const max = parseInt(hidden.dataset.max);
        stepper.querySelectorAll('.tb-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                let val = parseInt(hidden.value) + parseInt(btn.dataset.dir);
                val = Math.min(max, Math.max(min, val));
                hidden.value = val;
                display.textContent = val;
                this.settings[id] = val;
                this.updatePreview();
            });
        });
    }

    bindButtonGroup(id) {
        const group = document.querySelector(`.tb-border-group[data-id="${id}"]`);
        if (!group) return;
        group.querySelectorAll('.tb-border-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.tb-border-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings[id] = btn.dataset.val;
                this.updatePreview();
            });
        });
    }

    bindDayBackground() {
        const check = document.getElementById('dayBgTransparent');
        const color = document.getElementById('dayBackground');
        if (!check || !color) return;
        check.addEventListener('change', e => {
            if (e.target.checked) {
                this.settings.dayBackground = 'transparent';
                color.disabled = true; color.style.opacity = '0.35'; color.style.pointerEvents = 'none';
            } else {
                this.settings.dayBackground = color.value;
                color.disabled = false; color.style.opacity = '1'; color.style.pointerEvents = '';
            }
            this.updatePreview();
        });
        color.addEventListener('input', e => { if (!check.checked) { this.settings.dayBackground = e.target.value; this.updatePreview(); } });
    }

    bindMultiImageSlot(index) {
        const input = document.getElementById(`bgImage${index}Upload`);
        document.getElementById(`uploadBgImage${index}Btn`)?.addEventListener('click', () => input.click());
        document.getElementById(`browseBgImage${index}Btn`)?.addEventListener('click', () => this.openImageLibrary('backgrounds', index));
        document.getElementById(`removeBgImage${index}Btn`)?.addEventListener('click', () => {
            this.settings.backgroundImages[index].image = null;
            document.getElementById(`bgImage${index}Preview`).style.display = 'none';
            this.updatePreview();
        });
        input?.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            if (await this.saveImage(file, 'backgrounds')) {
                this.settings.backgroundImages[index].image = file.name;
                document.getElementById(`bgImage${index}Preview`).style.display = 'block';
                document.getElementById(`bgImage${index}FileName`).textContent = file.name;
                this.updatePreview();
            }
        });
        document.getElementById(`bgImage${index}Position`)?.addEventListener('change', e => { this.settings.backgroundImages[index].position = e.target.value; this.updatePreview(); });
        document.getElementById(`bgImage${index}Size`)?.addEventListener('input', e => { this.settings.backgroundImages[index].size = parseInt(e.target.value); document.getElementById(`bgImage${index}SizeValue`).textContent = e.target.value; this.updatePreview(); });
        document.getElementById(`bgImage${index}Opacity`)?.addEventListener('input', e => { this.settings.backgroundImages[index].opacity = e.target.value/100; document.getElementById(`bgImage${index}OpacityValue`).textContent = e.target.value; this.updatePreview(); });
        document.getElementById(`bgImage${index}ZIndex`)?.addEventListener('change', e => { this.settings.backgroundImages[index].zIndex = parseInt(e.target.value); this.updatePreview(); });
    }

    async openImageLibrary(folder, slotIndex) {
        if (!window.directoryHandle) { alert(window.t('alert_select_folder_first')); return; }
        try {
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create:false });
            const imgDir  = await dataDir.getDirectoryHandle('images', { create:false });
            const fldDir  = await imgDir.getDirectoryHandle(folder, { create:false });
            const images  = [];
            for await (const entry of fldDir.values()) {
                if (entry.kind==='file' && /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name))
                    images.push({ name:entry.name, url:URL.createObjectURL(await entry.getFile()) });
            }
            if (!images.length) { alert(window.t('alert_no_images')); return; }
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:white;border-radius:12px;padding:25px;max-width:700px;max-height:80vh;overflow-y:auto;';
            dialog.innerHTML = `<h2 style="margin:0 0 15px 0;">${window.t('dialog_image_library')}</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
                    ${images.map(img=>`<div class="library-image" data-name="${img.name}" style="border:2px solid #e0e0e0;border-radius:8px;padding:8px;text-align:center;cursor:pointer;">
                        <img src="${img.url}" style="width:100%;height:100px;object-fit:contain;border-radius:4px;margin-bottom:6px;">
                        <div style="font-size:10px;color:#666;word-break:break-word;">${img.name}</div>
                    </div>`).join('')}
                </div>
                <button id="closeLibrary" style="width:100%;padding:10px;background:#9e9e9e;color:white;border:none;border-radius:6px;cursor:pointer;">${window.t('btn_close')}</button>`;
            overlay.appendChild(dialog); document.body.appendChild(overlay);
            dialog.querySelectorAll('.library-image').forEach(el => {
                el.addEventListener('click', () => {
                    this.settings.backgroundImages[slotIndex].image = el.dataset.name;
                    document.getElementById(`bgImage${slotIndex}Preview`).style.display = 'block';
                    document.getElementById(`bgImage${slotIndex}FileName`).textContent = el.dataset.name;
                    this.updatePreview();
                    document.body.removeChild(overlay);
                });
            });
            dialog.querySelector('#closeLibrary').addEventListener('click', () => document.body.removeChild(overlay));
            overlay.addEventListener('click', e => { if (e.target===overlay) document.body.removeChild(overlay); });
        } catch { alert(window.t('alert_image_library_failed')); }
    }

    bindCheckbox(id)   { document.getElementById(id)?.addEventListener('change', e => { this.settings[id]=e.target.checked; this.updatePreview(); }); }
    bindTextInput(id)  { document.getElementById(id)?.addEventListener('input',  e => { this.settings[id]=e.target.value;   this.updatePreview(); }); }
    bindSelect(id)     { document.getElementById(id)?.addEventListener('change', e => { this.settings[id]=e.target.value;   this.updatePreview(); }); }
    bindColorInput(id) { document.getElementById(id)?.addEventListener('input',  e => { this.settings[id]=e.target.value;   this.updatePreview(); }); }

    async saveImage(file, folder) {
        if (!window.directoryHandle) return false;
        try {
            const dd = await window.directoryHandle.getDirectoryHandle('data',   { create:true });
            const id = await dd.getDirectoryHandle('images',                      { create:true });
            const fd = await id.getDirectoryHandle(folder,                        { create:true });
            const fh = await fd.getFileHandle(file.name, { create:true });
            const wr = await fh.createWritable();
            await wr.write(file); await wr.close();
            return true;
        } catch { return false; }
    }

    // ─── PREVIEW ──────────────────────────────────────────────────────────────
    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        const s = this.settings;
        const { startDate, endDate, days } = this.previewData;

        const hff  = s.headerFontFamily  || 'Arial, sans-serif';
        const dff  = s.dateFontFamily    || 'Arial, sans-serif';
        const dyff = s.dayNameFontFamily || 'Arial, sans-serif';
        const mff  = s.mealFontFamily    || 'Arial, sans-serif';
        const fff  = s.footerFontFamily  || 'Arial, sans-serif';

        const pad2 = n => String(n).padStart(2,'0');
        const dateRangeText = `${pad2(startDate.getDate())}.${pad2(startDate.getMonth()+1)} – ${pad2(endDate.getDate())}.${pad2(endDate.getMonth()+1)} ${startDate.getFullYear()}`;

        let bgLayers = '';
        [...s.backgroundImages].filter(img=>img.image).sort((a,b)=>a.zIndex-b.zIndex).forEach(img => {
            const pos = img.position.replace(/-/g,' ');
            bgLayers += `<div style="position:absolute;inset:0;background-image:url('data/images/backgrounds/${img.image}');background-size:${img.size}% auto;background-position:${pos};background-repeat:no-repeat;opacity:${img.opacity};z-index:${img.zIndex};pointer-events:none;"></div>`;
        });

        const is2Col    = s.templateStyle === 'detailed-2col';
        const isCompact = s.templateStyle === 'compact';

        let content = '';
        if (is2Col) {
            for (let i=0; i<days.length; i+=2) {
                content += `<div style="display:flex;gap:16px;margin-bottom:12px;">
                    <div style="flex:1;">${days[i]   ? this.renderDayBlock(days[i],   s, isCompact, dyff, mff) : ''}</div>
                    <div style="flex:1;">${days[i+1] ? this.renderDayBlock(days[i+1], s, isCompact, dyff, mff) : ''}</div>
                </div>`;
            }
        } else {
            days.forEach(day => { content += this.renderDayBlock(day, s, isCompact, dyff, mff); });
        }

        container.innerHTML = `
        <div style="background-color:${s.backgroundColor};position:relative;padding:40px 40px 30px;min-height:800px;display:flex;flex-direction:column;box-sizing:border-box;border:1px solid #ddd;box-shadow:0 2px 16px rgba(0,0,0,0.1);overflow:hidden;">
            ${bgLayers}
            <div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">
                <div style="margin-bottom:18px;">
                    ${s.showHeader
                        ? `<div style="font-family:${hff};text-align:${s.headerAlignment};font-size:${s.headerFontSize}pt;color:${s.headerColor};font-weight:bold;margin-bottom:6px;">${s.headerText}</div>`
                        : ''}
                    ${s.showDateRange
                        ? `<div style="font-family:${dff};text-align:${s.dateAlignment};font-size:${s.dateFontSize}pt;color:${s.dateColor};">${dateRangeText}</div>`
                        : ''}
                </div>
                <div style="flex:1;">${content}</div>
                ${s.showFooter
                    ? `<div style="font-family:${fff};text-align:${s.footerAlignment};margin-top:20px;padding-top:12px;border-top:1px solid #ddd;font-size:${s.footerFontSize}pt;color:#888;">${s.footerText}</div>`
                    : ''}
            </div>
        </div>`;
    }

    renderDayBlock(day, s, isCompact, dyff, mff) {
        if (!day || !day.meals.length) return '';
        const resolvedDyff = dyff || s.dayNameFontFamily || 'Arial, sans-serif';
        const resolvedMff  = mff  || s.mealFontFamily    || 'Arial, sans-serif';
        const borderStyle  = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor};` : '';
        const bgStyle      = s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
        const wrapStyle    = `${borderStyle}${bgStyle}padding:10px;margin-bottom:14px;border-radius:4px;`;

        let html = `<div style="${wrapStyle}">`;
        html += `<div style="font-family:${resolvedDyff};font-size:${s.dayNameSize}pt;color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:6px;">${day.name}</div>`;

        day.meals.forEach(meal => {
            if (isCompact) {
                let line = ` ${meal.number}. ${meal.name}`;
                if (meal.portion) line += ` – ${meal.portion}`;
                if (meal.ingredients?.length) line += `; ${meal.ingredients.map(ing => this._formatIng(ing, s)).join(', ')}`;
                if (meal.calories) line += ` | ККАЛ ${meal.calories}`;
                html += `<div style="font-family:${resolvedMff};font-size:${s.mealFontSize}pt;line-height:1.4;margin-bottom:4px;margin-left:8px;">${line}</div>`;
            } else {
                let title = ` ${meal.number}. ${meal.name}`;
                if (meal.portion) title += ` – ${meal.portion}`;
                html += `<div style="font-family:${resolvedMff};font-size:${s.mealFontSize}pt;line-height:1.4;margin-bottom:2px;margin-left:8px;font-weight:500;">${title}</div>`;
                if (meal.ingredients?.length) {
                    const calStr = meal.calories ? ` – ККАЛ ${meal.calories}` : '';
                    html += `<div style="font-family:${resolvedMff};font-size:${s.mealFontSize}pt;line-height:1.4;margin-left:22px;color:#555;font-style:italic;margin-bottom:4px;">${meal.ingredients.map(ing => this._formatIng(ing, s)).join(', ')}${calStr}</div>`;
                } else if (meal.calories) {
                    html += `<div style="font-family:${resolvedMff};font-size:${s.mealFontSize}pt;line-height:1.4;margin-left:22px;color:#555;font-style:italic;margin-bottom:4px;">ККАЛ ${meal.calories}</div>`;
                }
            }
        });
        html += '</div>';
        return html;
    }

    _formatIng(ing, s) {
        if (!ing.hasAllergen) return ing.name;
        let st = `color:${s.allergenColor};`;
        if (s.allergenBold)      st += 'font-weight:bold;font-style:normal;';
        if (s.allergenUnderline) st += 'text-decoration:underline;';
        return `<span style="${st}">${ing.name}</span>`;
    }

    loadSampleData() {
        const today = new Date(), end = new Date(today);
        end.setDate(today.getDate() + 4);
        this.previewData = {
            startDate: today, endDate: end,
            days: [
                { name:'Понеделник', meals:[
                    { number:1, name:'Супа топчета',     portion:'150гр', calories:129, ingredients:[{name:'кайма',hasAllergen:false},{name:'яйца',hasAllergen:true}]},
                    { number:2, name:'Пиле с ориз',       portion:'200гр', calories:250, ingredients:[{name:'пиле',hasAllergen:false},{name:'ориз',hasAllergen:false}]}
                ]},
                { name:'Вторник', meals:[
                    { number:1, name:'Таратор',           portion:'150гр', calories:100, ingredients:[{name:'краставица',hasAllergen:false},{name:'кисело мляко',hasAllergen:true}]},
                    { number:2, name:'Мусака',            portion:'200гр', calories:320, ingredients:[{name:'картофи',hasAllergen:false},{name:'яйца',hasAllergen:true}]}
                ]},
                { name:'Сряда', meals:[
                    { number:1, name:'Пилешка супа',      portion:'150гр', calories:120, ingredients:[{name:'пиле',hasAllergen:false},{name:'моркови',hasAllergen:false}]},
                    { number:2, name:'Кюфтета',           portion:'180гр', calories:280, ingredients:[{name:'кайма',hasAllergen:false},{name:'лук',hasAllergen:false}]}
                ]},
                { name:'Четвъртък', meals:[
                    { number:1, name:'Леща яхния',        portion:'200гр', calories:180, ingredients:[{name:'леща',hasAllergen:false},{name:'домати',hasAllergen:false}]},
                    { number:2, name:'Свинско с картофи', portion:'200гр', calories:350, ingredients:[{name:'свинско',hasAllergen:false},{name:'картофи',hasAllergen:false}]}
                ]},
                { name:'Петък', meals:[
                    { number:1, name:'Рибена чорба',      portion:'150гр', calories:110, ingredients:[{name:'риба',hasAllergen:true},{name:'картофи',hasAllergen:false}]},
                    { number:2, name:'Пъстърва на скара', portion:'180гр', calories:200, ingredients:[{name:'пъстърва',hasAllergen:true},{name:'лимон',hasAllergen:false}]}
                ]}
            ]
        };
    }

    bindActionButtons() {
        document.getElementById('btnLoadData')?.addEventListener('click',     () => this.loadRealData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click',        () => this.reset());
    }

    async saveTemplate() {
        const name = prompt(window.t('alert_template_name'));
        if (!name) return;
        if (!window.menuTemplates) window.menuTemplates = {};
        window.menuTemplates[name] = { ...this.settings };
        if (window.storageAdapter) await window.storageAdapter.save('templates', window.menuTemplates);
        alert(window.t('alert_template_saved'));
    }

    reset() {
        if (!confirm(window.t('alert_reset_confirm'))) return;
        const fresh = new StepTemplateBuilder();
        this.settings = fresh.settings;
        this.expandedSection = 'header';
        this.buildUI(); this.bindTabControls(); this.bindAccordion(); this.bindControls(); this.bindActionButtons();
        this.loadSampleData(); this.updatePreview();
    }
}

window.stepTemplateBuilder = new StepTemplateBuilder();

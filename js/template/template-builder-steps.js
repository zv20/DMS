/**
 * Step-Based Template Builder with Accordion UI
 * Clean, organized workflow - Background images only
 * @version 5.5 - loadRealData() fully implemented
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
            showHeader: true,
            headerText: 'Седмично меню',
            headerAlignment: 'center',
            headerFontSize: '20pt',
            headerColor: '#d2691e',
            showDateRange: true,
            showIngredients: true,
            showCalories: true,
            showPortions: true,
            dayBorder: false,
            dayBorderColor: '#e0e0e0',
            dayBorderStyle: 'solid',
            dayBorderThickness: '1px',
            dayBackground: 'transparent',
            dayPadding: '0px',
            dayNameSize: '12pt',
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            mealFontSize: '10pt',
            mealLineHeight: '1.4',
            ingredientColor: '#333333',
            ingredientSize: 'medium',
            allergenColor: '#ff0000',
            allergenUnderline: false,
            allergenBold: true,
            allergenItalic: false,
            showFooter: true,
            footerText: 'Prepared with care by KitchenPro',
            footerAlignment: 'center',
            footerFontSize: '8pt'
        };

        this.previewData   = null;
        this.expandedSection  = 'background';
        this.currentImageSlot = null;
        this.currentTab    = 'builder';
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
        if (!pageHeader) return;
        if (document.querySelector('.builder-tab-btns')) return;

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'builder-tab-btns';
        tabsContainer.style.cssText = 'display: inline-flex; gap: 10px; margin-left: 15px;';
        tabsContainer.innerHTML = `
            <button class="btn btn-secondary btn-small builder-tab-btn active" data-tab="builder" style="background: #495057;" data-i18n="tab_builder">${window.t('tab_builder')}</button>
            <button class="btn btn-secondary btn-small builder-tab-btn" data-tab="templates" data-i18n="tab_templates">${window.t('tab_templates')}</button>
            <button class="btn btn-secondary btn-small builder-tab-btn" data-tab="images" data-i18n="tab_images">${window.t('tab_images')}</button>
        `;

        const backButton = pageHeader.querySelector('button');
        if (backButton && backButton.parentNode) {
            backButton.parentNode.insertBefore(tabsContainer, backButton.nextSibling);
        } else {
            pageHeader.appendChild(tabsContainer);
        }

        const style = document.createElement('style');
        style.textContent = `
            .builder-tab-btn:hover { background: #5a6268 !important; transform: translateY(-1px); }
            .builder-tab-btn.active { background: #495057 !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
        `;
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
            <h2 style="margin:0 0 10px 0;font-size:18px;" data-i18n="builder_title">${window.t('builder_title')}</h2>
            <p  style="margin:0 0 15px 0;font-size:12px;color:#666;" data-i18n="builder_subtitle">${window.t('builder_subtitle')}</p>
            ${this.renderAccordionSection('background', window.t('section_background'), this.renderBackgroundControls())}
            ${this.renderAccordionSection('header',     window.t('section_header'),     this.renderHeaderControls())}
            ${this.renderAccordionSection('menu',       window.t('section_menu'),       this.renderMenuControls())}
            ${this.renderAccordionSection('footer',     window.t('section_footer'),     this.renderFooterControls())}
            <div class="action-buttons" style="margin-top:25px;padding-top:20px;border-top:2px solid #e0e0e0;">
                <button id="btnLoadData"     class="btn btn-primary"   style="width:100%;margin-bottom:10px;" data-i18n="btn_load_menu_data">${window.t('btn_load_menu_data')}</button>
                <button id="btnSaveTemplate" class="btn btn-secondary" style="width:100%;margin-bottom:10px;" data-i18n="btn_save_template">${window.t('btn_save_template')}</button>
                <button id="btnReset"        class="btn btn-secondary" style="width:100%;" data-i18n="btn_reset_default">${window.t('btn_reset_default')}</button>
            </div>
        `;
    }

    renderTemplatesTab() {
        return `
            <div style="padding:10px 0;">
                <h2 style="margin:0 0 10px 0;font-size:18px;" data-i18n="templates_title">${window.t('templates_title')}</h2>
                <p  style="margin:0 0 15px 0;font-size:12px;color:#666;" data-i18n="templates_subtitle">${window.t('templates_subtitle')}</p>
                <div id="templates-list" style="display:flex;flex-direction:column;gap:10px;"></div>
            </div>
        `;
    }

    renderImagesTab() {
        return `
            <div style="padding:10px 0;">
                <h2 style="margin:0 0 10px 0;font-size:18px;" data-i18n="images_title">${window.t('images_title')}</h2>
                <p  style="margin:0 0 15px 0;font-size:12px;color:#666;" data-i18n="images_subtitle">${window.t('images_subtitle')}</p>
                <div class="subsection" style="margin-bottom:15px;">
                    <h4 style="margin:0 0 10px 0;font-size:13px;" data-i18n="images_bg_title">${window.t('images_bg_title')}</h4>
                    <div id="bg-images-list" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;"></div>
                </div>
            </div>
        `;
    }

    bindTabControls() {
        document.querySelectorAll('.builder-tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => this.switchTab(e.currentTarget.dataset.tab));
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
        if (!window.menuTemplates || Object.keys(window.menuTemplates).length === 0) {
            container.innerHTML = `
                <div style="padding:30px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;">
                    <p style="margin:0;font-size:14px;" data-i18n="templates_empty">${window.t('templates_empty')}</p>
                    <p style="margin:5px 0 0 0;font-size:12px;" data-i18n="templates_empty_desc">${window.t('templates_empty_desc')}</p>
                </div>`;
            return;
        }
        let html = '';
        for (const [name, template] of Object.entries(window.menuTemplates)) {
            html += `
                <div class="template-card">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;margin-bottom:5px;">${name}</div>
                        <div style="font-size:11px;color:#666;">
                            <span data-i18n="template_style_label">${window.t('template_style_label')}</span> ${template.templateStyle||'compact'} |
                            <span data-i18n="template_header_label">${window.t('template_header_label')}</span> ${template.showHeader?window.t('template_yes'):window.t('template_no')} |
                            <span data-i18n="template_footer_label">${window.t('template_footer_label')}</span> ${template.showFooter?window.t('template_yes'):window.t('template_no')}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="stepTemplateBuilder.loadTemplate('${name}')" data-i18n="btn_load">📥 ${window.t('btn_load')}</button>
                        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="stepTemplateBuilder.deleteTemplate('${name}')" data-i18n="btn_delete">🗑️ ${window.t('btn_delete')}</button>
                    </div>
                </div>`;
        }
        container.innerHTML = html;
    }

    async loadTemplate(name) {
        if (!window.menuTemplates?.[name]) { alert(window.t('alert_template_not_found')); return; }
        if (confirm(window.t('alert_template_load_confirm').replace('{name}', name))) {
            this.settings = { ...window.menuTemplates[name] };
            this.switchTab('builder');
            this.buildUI();
            this.bindTabControls();
            this.bindAccordion();
            this.bindControls();
            this.bindActionButtons();
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
            container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;" data-i18n="images_select_folder">${window.t('images_select_folder')}</div>`;
            return;
        }
        try {
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create: false });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create: false });
            const images = [];
            for await (const entry of folderDir.values()) {
                if (entry.kind === 'file' && entry.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    const file = await entry.getFile();
                    images.push({ name: entry.name, url: URL.createObjectURL(file) });
                }
            }
            if (!images.length) {
                container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;" data-i18n="images_empty">${window.t('images_empty')}</div>`;
                return;
            }
            container.innerHTML = images.map(img => `
                <div class="image-card">
                    <img src="${img.url}" style="width:100%;height:80px;object-fit:contain;border-radius:4px;margin-bottom:5px;background:#f5f5f5;">
                    <div style="font-size:10px;color:#666;margin-bottom:5px;word-break:break-word;">${img.name}</div>
                    <button class="btn btn-secondary" style="width:100%;padding:4px;font-size:11px;" onclick="stepTemplateBuilder.deleteImage('${folder}','${img.name}')" data-i18n="btn_delete">🗑️ ${window.t('btn_delete')}</button>
                </div>`).join('');
        } catch (err) {
            container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;" data-i18n="images_folder_missing">${window.t('images_folder_missing')}</div>`;
        }
    }

    async deleteImage(folder, filename) {
        if (!confirm(window.t('alert_image_delete_confirm').replace('{name}', filename))) return;
        try {
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create: false });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create: false });
            await folderDir.removeEntry(filename);
            await this.loadImages();
            alert(window.t('alert_image_deleted'));
        } catch (err) {
            console.error('Delete failed:', err);
            alert(window.t('alert_image_delete_failed'));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOAD REAL DATA — week picker → pulls live currentMenu into preview
    // ─────────────────────────────────────────────────────────────────────────
    loadRealData() {
        const lang  = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const isBg  = lang === 'bg';

        // Build week options (same approach as print.js)
        const weekEntries = this._buildWeekOptions(isBg);

        if (!weekEntries.length) {
            alert(isBg ? 'Няма планирани ястия в менюто.' : 'No meals found in the menu.');
            return;
        }

        // ── small week-picker dialog ──
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';

        const dialog = document.createElement('div');
        dialog.style.cssText = [
            'position:fixed','top:50%','left:50%',
            'transform:translate(-50%,-50%)',
            'background:white','padding:28px',
            'border-radius:14px',
            'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
            'z-index:10000','min-width:340px','max-width:440px','width:90vw'
        ].join(';');

        const selectStyle = 'width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;';
        const labelStyle  = 'display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;';

        const weekOptionsHTML = weekEntries
            .map(e => `<option value="${e.mondayStr}"${e.isCurrent?' selected':''}>${e.label}</option>`)
            .join('');

        dialog.innerHTML = `
            <h2 style="margin:0 0 20px 0;color:#333;font-size:1.2rem;">📅 ${isBg ? 'Зареди данни от меню' : 'Load Menu Data'}</h2>
            <div style="margin-bottom:20px;">
                <label style="${labelStyle}">${isBg ? 'Избери седмица' : 'Select week'}</label>
                <select id="lrd-week" style="${selectStyle}"
                    onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
                    ${weekOptionsHTML}
                </select>
            </div>
            <div style="font-size:12px;color:#888;margin-bottom:20px;">
                ${isBg
                    ? '🍽️ Обозначава седмици с планирани ястия. Избраните данни ще заменят примерното меню в прегледа.'
                    : '🍽️ Marks weeks with planned meals. Loaded data replaces the sample menu in the preview.'}
            </div>
            <div style="display:flex;gap:10px;">
                <button id="lrd-load"   style="flex:1;padding:11px;background:#fd7e14;color:white;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;">
                    ${isBg ? '✅ Зареди' : '✅ Load'}
                </button>
                <button id="lrd-cancel" style="padding:11px 18px;background:#e9ecef;color:#555;border:none;border-radius:8px;font-size:0.95rem;cursor:pointer;">
                    ${isBg ? 'Отказ' : 'Cancel'}
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        const close = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };

        dialog.querySelector('#lrd-load').addEventListener('click', () => {
            const mondayStr = dialog.querySelector('#lrd-week').value;
            const entry     = weekEntries.find(e => e.mondayStr === mondayStr);
            close();
            this._applyWeekData(entry.monday, entry.friday, isBg);
        });

        dialog.querySelector('#lrd-cancel').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }

    // Build week-option list from live currentMenu (mirrors print.js logic)
    _buildWeekOptions(isBg) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const _getMonday = (d) => {
            const x   = new Date(d);
            const day = x.getDay();
            x.setDate(x.getDate() + (day === 0 ? 1 : -(day - 1)));
            x.setHours(0, 0, 0, 0);
            return x;
        };
        const _str = (d) => {
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        const currentMonday = _getMonday(today);
        const nextMonday    = _getMonday(new Date(today.getTime() + 7*86400000));

        const mondaySet = new Set();
        const menu = window.currentMenu || {};
        Object.keys(menu).forEach(dateStr => {
            const hasMeals = Object.values(menu[dateStr] || {}).some(s => s && s.recipe);
            if (hasMeals) mondaySet.add(_str(_getMonday(new Date(dateStr + 'T00:00:00'))));
        });
        mondaySet.add(_str(currentMonday));
        mondaySet.add(_str(nextMonday));

        const currentStr = _str(currentMonday);
        const nextStr    = _str(nextMonday);
        const locale     = isBg ? 'bg-BG' : 'en-US';

        return Array.from(mondaySet).sort().map(mondayStr => {
            const monday = new Date(mondayStr + 'T00:00:00');
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);

            // check if any day in this week has meals
            const hasMeals = Array.from({length:5},(_,i)=>{
                const d = new Date(monday); d.setDate(monday.getDate()+i);
                return _str(d);
            }).some(ds => Object.values(menu[ds]||{}).some(s => s && s.recipe));

            const dateRange = monday.toLocaleDateString(locale,{month:'short',day:'numeric'})
                + ' – '
                + friday.toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric'});

            const icon  = hasMeals ? '🍽️' : '⬜';
            let   label;
            if      (mondayStr === currentStr) label = `${icon} ${isBg?'Тази седмица':'This Week'} — ${dateRange}`;
            else if (mondayStr === nextStr)    label = `${icon} ${isBg?'Следваща седмица':'Next Week'} — ${dateRange}`;
            else                               label = `${icon} ${dateRange}`;

            return { mondayStr, monday, friday, label, isCurrent: mondayStr === currentStr };
        });
    }

    // Pull recipes/ingredients for chosen week and set this.previewData
    _applyWeekData(startDate, endDate, isBg) {
        const lang     = isBg ? 'bg' : 'en';
        const dayNames = isBg
            ? ['Понеделник','Вторник','Сряда','Четвъртък','Петък']
            : ['Monday','Tuesday','Wednesday','Thursday','Friday'];

        const _str = (d) => {
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        const days = [];
        for (let i = 0; i < 5; i++) {
            const d       = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = _str(d);
            const dayMenu = window.getMenuForDate ? window.getMenuForDate(dateStr) : {};

            const meals = [];
            ['slot1','slot2','slot3','slot4'].forEach((slotId, idx) => {
                const slot   = dayMenu[slotId];
                const recipe = slot?.recipe ? (window.recipes||[]).find(r => r.id === slot.recipe) : null;
                if (!recipe) return;

                const ingredients = (recipe.ingredients || []).map(ingObj => {
                    const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                    const ing   = (window.ingredients || []).find(i => i.id === ingId);
                    if (!ing) return null;
                    return { name: ing.name, hasAllergen: !!(ing.allergens && ing.allergens.length) };
                }).filter(Boolean);

                meals.push({
                    number:      idx + 1,
                    name:        recipe.name,
                    portion:     recipe.portionSize || '',
                    calories:    recipe.calories    || null,
                    ingredients
                });
            });

            if (meals.length) days.push({ name: dayNames[i], meals });
        }

        if (!days.length) {
            alert(isBg
                ? 'Няма планирани ястия за тази седмица.'
                : 'No meals planned for this week.');
            return;
        }

        this.previewData = { startDate, endDate, days };
        this.updatePreview();

        // Brief flash on the preview panel to confirm load
        const previewEl = document.getElementById('template-preview');
        if (previewEl) {
            previewEl.style.transition = 'opacity 0.2s';
            previewEl.style.opacity    = '0.4';
            setTimeout(() => { previewEl.style.opacity = '1'; }, 200);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI RENDERING HELPERS (unchanged from v5.4)
    // ─────────────────────────────────────────────────────────────────────────
    renderAccordionSection(id, title, content) {
        const isExpanded = this.expandedSection === id;
        return `
            <div class="accordion-section ${isExpanded?'expanded':''}" data-section="${id}">
                <div class="accordion-header">
                    <span class="accordion-icon">${isExpanded?'▼':'▶'}</span>
                    <span class="accordion-title">${title}</span>
                </div>
                <div class="accordion-content" style="display:${isExpanded?'block':'none'};">
                    ${content}
                </div>
            </div>`;
    }

    renderBackgroundControls() {
        return `
            <div class="control-group">
                <label data-i18n="label_background_color">${window.t('label_background_color')}</label>
                <input type="color" id="backgroundColor" value="#ffffff" class="color-input">
                <div style="margin:20px 0;padding:12px;background:#e3f2fd;border-left:4px solid #2196f3;border-radius:4px;">
                    <p style="margin:0 0 5px 0;font-size:13px;font-weight:600;color:#1565c0;" data-i18n="label_background_info">${window.t('label_background_info')}</p>
                    <p style="margin:0;font-size:11px;color:#1976d2;" data-i18n="label_background_desc">${window.t('label_background_desc')}</p>
                </div>
                ${this.renderImageSlot(0, window.t('label_image_layer')+' 1')}
                ${this.renderImageSlot(1, window.t('label_image_layer')+' 2')}
                ${this.renderImageSlot(2, window.t('label_image_layer')+' 3')}
                ${this.renderImageSlot(3, window.t('label_image_layer')+' 4')}
                ${this.renderImageSlot(4, window.t('label_image_layer')+' 5')}
            </div>`;
    }

    renderImageSlot(index, title) {
        const slot = this.settings.backgroundImages[index];
        return `
            <div class="subsection" style="margin-bottom:15px;">
                <h4 style="margin:0 0 12px 0 !important;">${title}</h4>
                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <input type="file" id="bgImage${index}Upload" accept="image/*" style="display:none;">
                    <button id="uploadBgImage${index}Btn"  class="btn btn-secondary" style="flex:1;" data-i18n="btn_upload">${window.t('btn_upload')}</button>
                    <button id="browseBgImage${index}Btn"  class="btn btn-secondary" style="flex:1;" data-i18n="btn_library">${window.t('btn_library')}</button>
                    <button id="removeBgImage${index}Btn"  class="btn btn-secondary" style="width:40px;" data-i18n="btn_remove">${window.t('btn_remove')}</button>
                </div>
                <div id="bgImage${index}Preview" style="display:${slot.image?'block':'none'};padding:8px;background:#f5f5f5;border-radius:4px;margin-bottom:10px;">
                    <small style="color:#555;"><span data-i18n="file_label">${window.t('file_label')}</span> <strong id="bgImage${index}FileName">${slot.image||''}</strong></small>
                </div>
                <label data-i18n="label_position">${window.t('label_position')}</label>
                <select id="bgImage${index}Position" class="select-input">
                    <option value="center"       ${slot.position==='center'?'selected':''} data-i18n="pos_center">${window.t('pos_center')}</option>
                    <option value="top-left"     ${slot.position==='top-left'?'selected':''} data-i18n="pos_top_left">${window.t('pos_top_left')}</option>
                    <option value="top-center"   ${slot.position==='top-center'?'selected':''} data-i18n="pos_top_center">${window.t('pos_top_center')}</option>
                    <option value="top-right"    ${slot.position==='top-right'?'selected':''} data-i18n="pos_top_right">${window.t('pos_top_right')}</option>
                    <option value="center-left"  ${slot.position==='center-left'?'selected':''} data-i18n="pos_center_left">${window.t('pos_center_left')}</option>
                    <option value="center-right" ${slot.position==='center-right'?'selected':''} data-i18n="pos_center_right">${window.t('pos_center_right')}</option>
                    <option value="bottom-left"  ${slot.position==='bottom-left'?'selected':''} data-i18n="pos_bottom_left">${window.t('pos_bottom_left')}</option>
                    <option value="bottom-center"${slot.position==='bottom-center'?'selected':''} data-i18n="pos_bottom_center">${window.t('pos_bottom_center')}</option>
                    <option value="bottom-right" ${slot.position==='bottom-right'?'selected':''} data-i18n="pos_bottom_right">${window.t('pos_bottom_right')}</option>
                </select>
                <label data-i18n="label_size">${window.t('label_size')}</label>
                <input type="range" id="bgImage${index}Size" min="5" max="100" value="${slot.size}" class="slider">
                <div class="slider-value"><span id="bgImage${index}SizeValue">${slot.size}</span>%</div>
                <label data-i18n="label_opacity">${window.t('label_opacity')}</label>
                <input type="range" id="bgImage${index}Opacity" min="0" max="100" value="${slot.opacity*100}" class="slider">
                <div class="slider-value"><span id="bgImage${index}OpacityValue">${Math.round(slot.opacity*100)}</span>%</div>
                <label data-i18n="label_layer">${window.t('label_layer')}</label>
                <select id="bgImage${index}ZIndex" class="select-input">
                    <option value="1" ${slot.zIndex===1?'selected':''} data-i18n="layer_back">${window.t('layer_back')}</option>
                    <option value="2" ${slot.zIndex===2?'selected':''} data-i18n="layer_2">${window.t('layer_2')}</option>
                    <option value="3" ${slot.zIndex===3?'selected':''} data-i18n="layer_3">${window.t('layer_3')}</option>
                    <option value="4" ${slot.zIndex===4?'selected':''} data-i18n="layer_4">${window.t('layer_4')}</option>
                    <option value="5" ${slot.zIndex===5?'selected':''} data-i18n="layer_front">${window.t('layer_front')}</option>
                </select>
            </div>`;
    }

    renderHeaderControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label"><input type="checkbox" id="showHeader" checked><span data-i18n="label_show_header">${window.t('label_show_header')}</span></label>
                <label data-i18n="label_header_text">${window.t('label_header_text')}</label>
                <input type="text" id="headerText" value="Седмично меню" class="text-input">
                <label data-i18n="label_text_alignment">${window.t('label_text_alignment')}</label>
                <select id="headerAlignment" class="select-input">
                    <option value="left" data-i18n="align_left">${window.t('align_left')}</option>
                    <option value="center" selected data-i18n="align_center">${window.t('align_center')}</option>
                    <option value="right" data-i18n="align_right">${window.t('align_right')}</option>
                </select>
                <label data-i18n="label_font_size_a4">${window.t('label_font_size_a4')}</label>
                <select id="headerFontSize" class="select-input">
                    <option value="14pt" data-i18n="size_14pt">${window.t('size_14pt')}</option>
                    <option value="16pt" data-i18n="size_16pt">${window.t('size_16pt')}</option>
                    <option value="18pt" data-i18n="size_18pt">${window.t('size_18pt')}</option>
                    <option value="20pt" selected data-i18n="size_20pt">${window.t('size_20pt')}</option>
                    <option value="22pt" data-i18n="size_22pt">${window.t('size_22pt')}</option>
                    <option value="24pt" data-i18n="size_24pt">${window.t('size_24pt')}</option>
                </select>
                <label data-i18n="label_text_color">${window.t('label_text_color')}</label>
                <input type="color" id="headerColor" value="#d2691e" class="color-input">
            </div>`;
    }

    renderMenuControls() {
        return `
            <div class="control-group">
                <h4 data-i18n="label_template_style">${window.t('label_template_style')}</h4>
                <label class="radio-label"><input type="radio" name="templateStyle" value="compact" checked><span><strong data-i18n="style_compact">${window.t('style_compact')}</strong> - <span data-i18n="style_compact_desc">${window.t('style_compact_desc')}</span></span></label>
                <label class="radio-label"><input type="radio" name="templateStyle" value="detailed"><span><strong data-i18n="style_detailed">${window.t('style_detailed')}</strong> - <span data-i18n="style_detailed_desc">${window.t('style_detailed_desc')}</span></span></label>
                <label class="radio-label"><input type="radio" name="templateStyle" value="detailed-2col"><span><strong data-i18n="style_detailed_2col">${window.t('style_detailed_2col')}</strong> - <span data-i18n="style_detailed_2col_desc">${window.t('style_detailed_2col_desc')}</span></span></label>
                <div style="margin-top:15px;padding:12px;background:#e8f5e9;border-left:4px solid #4caf50;border-radius:4px;">
                    <p style="margin:0;font-size:12px;color:#2e7d32;"><strong data-i18n="label_menu_content">${window.t('label_menu_content')}</strong><br><span data-i18n="menu_content_desc">${window.t('menu_content_desc')}</span></p>
                </div>
                <h4 style="margin-top:15px;" data-i18n="label_day_block">${window.t('label_day_block')}</h4>
                <label class="checkbox-label"><input type="checkbox" id="dayBorder"><span data-i18n="label_show_border">${window.t('label_show_border')}</span></label>
                <label data-i18n="label_border_color">${window.t('label_border_color')}</label>
                <input type="color" id="dayBorderColor" value="#e0e0e0" class="color-input">
                <label data-i18n="label_border_style">${window.t('label_border_style')}</label>
                <select id="dayBorderStyle" class="select-input">
                    <option value="solid"  selected data-i18n="border_solid">${window.t('border_solid')}</option>
                    <option value="dashed" data-i18n="border_dashed">${window.t('border_dashed')}</option>
                    <option value="dotted" data-i18n="border_dotted">${window.t('border_dotted')}</option>
                    <option value="double" data-i18n="border_double">${window.t('border_double')}</option>
                </select>
                <label data-i18n="label_border_thickness">${window.t('label_border_thickness')}</label>
                <select id="dayBorderThickness" class="select-input">
                    <option value="1px" selected data-i18n="thickness_1px">${window.t('thickness_1px')}</option>
                    <option value="2px" data-i18n="thickness_2px">${window.t('thickness_2px')}</option>
                    <option value="3px" data-i18n="thickness_3px">${window.t('thickness_3px')}</option>
                    <option value="4px" data-i18n="thickness_4px">${window.t('thickness_4px')}</option>
                </select>
                <label data-i18n="label_background">${window.t('label_background')}</label>
                <input type="color" id="dayBackground" value="#ffffff" class="color-input">
                <h4 style="margin-top:15px;" data-i18n="label_day_name">${window.t('label_day_name')}</h4>
                <label data-i18n="label_font_size_a4">${window.t('label_font_size_a4')}</label>
                <select id="dayNameSize" class="select-input">
                    <option value="10pt" data-i18n="size_10pt">${window.t('size_10pt')}</option>
                    <option value="11pt" data-i18n="size_11pt">${window.t('size_11pt')}</option>
                    <option value="12pt" selected data-i18n="size_12pt">${window.t('size_12pt')}</option>
                    <option value="13pt" data-i18n="size_13pt">${window.t('size_13pt')}</option>
                    <option value="14pt" data-i18n="size_14pt">${window.t('size_14pt')}</option>
                </select>
                <label data-i18n="label_color">${window.t('label_color')}</label>
                <input type="color" id="dayNameColor" value="#333333" class="color-input">
                <h4 style="margin-top:15px;" data-i18n="label_allergens">${window.t('label_allergens')}</h4>
                <label data-i18n="label_color">${window.t('label_color')}</label>
                <input type="color" id="allergenColor" value="#ff0000" class="color-input">
                <label class="checkbox-label"><input type="checkbox" id="allergenUnderline"><span data-i18n="label_underline">${window.t('label_underline')}</span></label>
                <label class="checkbox-label"><input type="checkbox" id="allergenBold" checked><span data-i18n="label_bold">${window.t('label_bold')}</span></label>
            </div>`;
    }

    renderFooterControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label"><input type="checkbox" id="showFooter" checked><span data-i18n="label_show_footer">${window.t('label_show_footer')}</span></label>
                <label data-i18n="label_footer_text">${window.t('label_footer_text')}</label>
                <input type="text" id="footerText" value="Prepared with care by KitchenPro" class="text-input">
                <label data-i18n="label_text_alignment">${window.t('label_text_alignment')}</label>
                <select id="footerAlignment" class="select-input">
                    <option value="left" data-i18n="align_left">${window.t('align_left')}</option>
                    <option value="center" selected data-i18n="align_center">${window.t('align_center')}</option>
                    <option value="right" data-i18n="align_right">${window.t('align_right')}</option>
                </select>
                <label data-i18n="label_font_size_a4">${window.t('label_font_size_a4')}</label>
                <select id="footerFontSize" class="select-input">
                    <option value="7pt" data-i18n="size_7pt">${window.t('size_7pt')}</option>
                    <option value="8pt" selected data-i18n="size_8pt">${window.t('size_8pt')}</option>
                    <option value="9pt" data-i18n="size_9pt">${window.t('size_9pt')}</option>
                    <option value="10pt" data-i18n="size_10pt_footer">${window.t('size_10pt_footer')}</option>
                    <option value="11pt" data-i18n="size_11pt">${window.t('size_11pt')}</option>
                </select>
            </div>`;
    }

    renderStyles() {
        return `<style>
            .step-template-controls{padding:20px;background:white;border-radius:8px;}
            .tab-content{display:none;} .tab-content.active{display:block;animation:fadeIn 0.3s;}
            @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
            .template-card{display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;transition:all 0.2s;}
            .template-card:hover{border-color:#2196f3;background:#f8f9fa;}
            .image-card{padding:10px;border:2px solid #e0e0e0;border-radius:8px;text-align:center;transition:all 0.2s;}
            .image-card:hover{border-color:#2196f3;background:#f8f9fa;}
            .accordion-section{margin-bottom:10px;border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;transition:all 0.3s;}
            .accordion-section.expanded{border-color:#2196f3;}
            .accordion-header{padding:12px 15px;background:#f8f9fa;cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;transition:background 0.2s;}
            .accordion-header:hover{background:#e9ecef;}
            .accordion-section.expanded .accordion-header{background:#e3f2fd;color:#1976d2;}
            .accordion-icon{font-size:11px;width:15px;}
            .accordion-content{padding:15px;animation:slideDown 0.3s;}
            @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
            .control-group{display:flex;flex-direction:column;gap:10px;}
            .control-group label{font-weight:500;font-size:12px;color:#555;margin-top:5px;}
            .control-group h4{margin:12px 0 8px 0;font-size:13px;color:#333;border-bottom:1px solid #e0e0e0;padding-bottom:5px;}
            .checkbox-label{display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:0!important;}
            .checkbox-label input{width:16px;height:16px;cursor:pointer;}
            .checkbox-label span{font-weight:normal;}
            .radio-label{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:4px;cursor:pointer;transition:all 0.2s;}
            .radio-label:hover{background:#f8f9fa;}
            .radio-label input[type="radio"]:checked{accent-color:#2196f3;}
            .text-input,.select-input{padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;width:100%;}
            .color-input{width:100%;height:36px;border:1px solid #ddd;border-radius:4px;cursor:pointer;}
            .slider{width:100%;height:5px;border-radius:3px;outline:none;}
            .slider-value{text-align:center;font-size:12px;color:#666;margin-top:3px;}
            .subsection{background:#f8f9fa;padding:12px;border-radius:6px;margin:8px 0;}
            .subsection h4{margin:0 0 12px 0!important;border-bottom:none!important;font-size:12px!important;color:#555!important;}
        </style>`;
    }

    bindAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const section   = e.currentTarget.closest('.accordion-section');
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
        for (let i = 0; i < 5; i++) this.bindMultiImageSlot(i);
        this.bindColorInput('backgroundColor');
        this.bindCheckbox('showHeader');
        this.bindTextInput('headerText');
        this.bindSelect('headerAlignment');
        this.bindSelect('headerFontSize');
        this.bindColorInput('headerColor');
        document.querySelectorAll('input[name="templateStyle"]').forEach(radio => {
            radio.addEventListener('change', (e) => { this.settings.templateStyle = e.target.value; this.updatePreview(); });
        });
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
        this.bindCheckbox('showFooter');
        this.bindTextInput('footerText');
        this.bindSelect('footerAlignment');
        this.bindSelect('footerFontSize');
    }

    bindMultiImageSlot(index) {
        const inputEl    = document.getElementById(`bgImage${index}Upload`);
        const uploadBtn  = document.getElementById(`uploadBgImage${index}Btn`);
        const browseBtn  = document.getElementById(`browseBgImage${index}Btn`);
        const removeBtn  = document.getElementById(`removeBgImage${index}Btn`);
        const positionEl = document.getElementById(`bgImage${index}Position`);
        const sizeEl     = document.getElementById(`bgImage${index}Size`);
        const opacityEl  = document.getElementById(`bgImage${index}Opacity`);
        const zIndexEl   = document.getElementById(`bgImage${index}ZIndex`);

        uploadBtn?.addEventListener('click',  () => inputEl.click());
        browseBtn?.addEventListener('click',  () => { this.currentImageSlot = index; this.openImageLibrary('backgrounds', index); });
        removeBtn?.addEventListener('click',  () => {
            this.settings.backgroundImages[index].image = null;
            document.getElementById(`bgImage${index}Preview`).style.display = 'none';
            inputEl.value = '';
            this.updatePreview();
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
        positionEl?.addEventListener('change', (e) => { this.settings.backgroundImages[index].position = e.target.value; this.updatePreview(); });
        sizeEl?.addEventListener('input',    (e) => { this.settings.backgroundImages[index].size    = parseInt(e.target.value); document.getElementById(`bgImage${index}SizeValue`).textContent    = e.target.value; this.updatePreview(); });
        opacityEl?.addEventListener('input', (e) => { this.settings.backgroundImages[index].opacity = e.target.value/100;       document.getElementById(`bgImage${index}OpacityValue`).textContent = e.target.value; this.updatePreview(); });
        zIndexEl?.addEventListener('change', (e) => { this.settings.backgroundImages[index].zIndex  = parseInt(e.target.value); this.updatePreview(); });
    }

    async openImageLibrary(folder, slotIndex) {
        if (!window.directoryHandle) { alert(window.t('alert_select_folder_first')); return; }
        try {
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create: false });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create: false });
            const images = [];
            for await (const entry of folderDir.values()) {
                if (entry.kind === 'file' && entry.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    const file = await entry.getFile();
                    images.push({ name: entry.name, url: URL.createObjectURL(file) });
                }
            }
            if (!images.length) { alert(window.t('alert_no_images')); return; }
            this.showImageLibraryDialog(images, folder, slotIndex);
        } catch (err) { console.error(err); alert(window.t('alert_image_library_failed')); }
    }

    showImageLibraryDialog(images, folder, slotIndex) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;border-radius:12px;padding:25px;max-width:700px;max-height:80vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
        dialog.innerHTML = `
            <h2 style="margin:0 0 15px 0;" data-i18n="dialog_image_library">${window.t('dialog_image_library')}</h2>
            <p style="margin:0 0 20px 0;font-size:13px;color:#666;" data-i18n="dialog_image_desc">${window.t('dialog_image_desc')}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px;margin-bottom:20px;">
                ${images.map(img=>`
                    <div class="library-image" data-name="${img.name}" style="border:2px solid #e0e0e0;border-radius:8px;padding:10px;text-align:center;cursor:pointer;transition:all 0.2s;background:white;"
                        onmouseover="this.style.borderColor='#2196f3';this.style.background='#e3f2fd';"
                        onmouseout="this.style.borderColor='#e0e0e0';this.style.background='white';">
                        <img src="${img.url}" style="width:100%;height:120px;object-fit:contain;border-radius:4px;margin-bottom:8px;">
                        <div style="font-size:11px;color:#666;margin-bottom:8px;word-break:break-word;">${img.name}</div>
                        <button class="delete-img-btn" data-name="${img.name}" style="padding:4px 8px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;" onclick="event.stopPropagation();">${window.t('btn_delete')}</button>
                    </div>`).join('')}
            </div>
            <button id="closeLibrary" style="width:100%;padding:10px;background:#9e9e9e;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;" data-i18n="btn_close">${window.t('btn_close')}</button>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        dialog.querySelectorAll('.library-image').forEach(imgDiv => {
            imgDiv.addEventListener('click', () => {
                const name = imgDiv.dataset.name;
                this.settings.backgroundImages[slotIndex].image = name;
                document.getElementById(`bgImage${slotIndex}Preview`).style.display = 'block';
                document.getElementById(`bgImage${slotIndex}FileName`).textContent = name;
                this.updatePreview();
                document.body.removeChild(overlay);
            });
        });

        dialog.querySelectorAll('.delete-img-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = btn.dataset.name;
                if (!confirm(window.t('alert_image_delete_confirm').replace('{name}', name))) return;
                try {
                    const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create: false });
                    const imagesDir = await dataDir.getDirectoryHandle('images',                { create: false });
                    const folderDir = await imagesDir.getDirectoryHandle(folder,               { create: false });
                    await folderDir.removeEntry(name);
                    btn.closest('.library-image').remove();
                    alert(window.t('alert_image_deleted'));
                } catch (err) { console.error(err); alert(window.t('alert_image_delete_failed')); }
            });
        });

        document.getElementById('closeLibrary').addEventListener('click', () => document.body.removeChild(overlay));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
    }

    bindCheckbox(id)    { document.getElementById(id)?.addEventListener('change', (e) => { this.settings[id] = e.target.checked; this.updatePreview(); }); }
    bindTextInput(id)   { document.getElementById(id)?.addEventListener('input',  (e) => { this.settings[id] = e.target.value;   this.updatePreview(); }); }
    bindSelect(id)      { document.getElementById(id)?.addEventListener('change', (e) => { this.settings[id] = e.target.value;   this.updatePreview(); }); }
    bindColorInput(id)  { document.getElementById(id)?.addEventListener('input',  (e) => { this.settings[id] = e.target.value;   this.updatePreview(); }); }

    async saveImage(file, folder) {
        if (!window.directoryHandle) { alert(window.t('alert_select_folder_first')); return false; }
        try {
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create: true });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create: true });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create: true });
            const fh        = await folderDir.getFileHandle(file.name, { create: true });
            const writable  = await fh.createWritable();
            await writable.write(file);
            await writable.close();
            return true;
        } catch (err) { console.error(err); alert(window.t('alert_upload_failed')); return false; }
    }

    bindActionButtons() {
        document.getElementById('btnLoadData')?.addEventListener('click',     () => this.loadRealData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click',        () => this.reset());
    }

    loadSampleData() {
        const today = new Date();
        const end   = new Date(today); end.setDate(today.getDate() + 4);
        this.previewData = {
            startDate: today, endDate: end,
            days: [
                { name:'Понеделник', meals:[{ number:1, name:'Супа топчета', portion:'150гр', calories:129, ingredients:[{name:'кайма',hasAllergen:false},{name:'яйца',hasAllergen:true}]},{number:2,name:'Пържени картофи',portion:'200гр',calories:250,ingredients:[{name:'картофи',hasAllergen:false}]}]},
                { name:'Вторник',    meals:[{ number:1, name:'Таратор', portion:'150гр', calories:100, ingredients:[{name:'краставица',hasAllergen:false},{name:'кисело мляко',hasAllergen:true}]}]},
                { name:'Сряда',      meals:[{ number:1, name:'Плодова салата', portion:'180гр', calories:85, ingredients:[{name:'ябълка',hasAllergen:false},{name:'банан',hasAllergen:false}]}]},
                { name:'Четвъртък',  meals:[{ number:1, name:'Пилешка супа', portion:'150гр', calories:120, ingredients:[{name:'пиле',hasAllergen:false}]}]},
                { name:'Петък',      meals:[{ number:1, name:'Риба на фурна', portion:'180гр', calories:200, ingredients:[{name:'риба',hasAllergen:true}]}]}
            ]
        };
    }

    renderDayBlock(day, s, spacing, daySize, mealSize, isCompact) {
        if (!day || !day.meals.length) return '';
        const dayStyle = `${s.dayBorder?`border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor};`:''} ${s.dayBackground!=='transparent'?`background:${s.dayBackground};`:''} padding:${spacing.dayPadding}; margin-bottom:${spacing.dayMargin}; border-radius:4px;`;
        let html = `<div style="${dayStyle}"><div style="font-size:${daySize};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:${spacing.dayNameMargin};">${day.name}</div>`;
        day.meals.forEach(meal => {
            if (isCompact) {
                html += `<div style="margin-bottom:${spacing.mealMargin};margin-left:${spacing.mealLeftMargin};font-size:${mealSize};line-height:${spacing.lineHeight};"> ${meal.number}. ${meal.name}`;
                if (meal.portion) html += ` - ${meal.portion}`;
                if (meal.ingredients.length) html += `; ${meal.ingredients.map(ing=>{ if(ing.hasAllergen){let st=`color:${s.allergenColor};`;if(s.allergenBold)st+='font-weight:bold;';if(s.allergenUnderline)st+='text-decoration:underline;';return `<span style="${st}">${ing.name}</span>`;}return ing.name;}).join(', ')}`;
                if (meal.calories) html += ` ККАЛ ${meal.calories}`;
                html += `</div>`;
            } else {
                html += `<div style="margin-bottom:${spacing.mealMargin};margin-left:${spacing.mealLeftMargin};"><div style="font-size:${mealSize};line-height:${spacing.lineHeight};font-weight:500;"> ${meal.number}. ${meal.name}`;
                if (meal.portion) html += ` - ${meal.portion}`;
                html += `</div>`;
                if (meal.ingredients.length) {
                    html += `<div style="font-size:${mealSize};line-height:${spacing.lineHeight};margin-left:15px;color:#666;font-style:italic;">${meal.ingredients.map(ing=>{ if(ing.hasAllergen){let st=`color:${s.allergenColor};`;if(s.allergenBold)st+='font-weight:bold;';if(s.allergenUnderline)st+='text-decoration:underline;';return `<span style="${st}">${ing.name}</span>`;}return ing.name;}).join(', ')}`;
                    if (meal.calories) html += ` - ККАЛ ${meal.calories}`;
                    html += `</div>`;
                } else if (meal.calories) {
                    html += `<div style="font-size:${mealSize};line-height:${spacing.lineHeight};margin-left:15px;color:#666;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                }
                html += `</div>`;
            }
        });
        html += `</div>`;
        return html;
    }

    getPositionCSS(position) {
        return ({center:'center center','top-left':'top left','top-center':'top center','top-right':'top right','center-left':'center left','center-right':'center right','bottom-left':'bottom left','bottom-center':'bottom center','bottom-right':'bottom right'})[position] || 'center center';
    }

    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        const s = this.settings;
        const { startDate, endDate, days } = this.previewData;
        const is2Col    = s.templateStyle === 'detailed-2col';
        const isCompact = s.templateStyle === 'compact';
        const spacing   = {
            containerPadding:'12px', headerMargin:'8px', dateMargin:'10px',
            rowMargin:'6px', columnGap:'10px',
            dayMargin:isCompact?'8px':'8px', dayPadding:isCompact?'6px':'6px',
            dayNameMargin:isCompact?'4px':'5px',
            mealMargin:isCompact?'3px':'4px', mealLeftMargin:'8px',
            footerMarginTop:'12px', footerPaddingTop:'10px',
            lineHeight:isCompact?'1.2':'1.3'
        };
        const dateRange = `${startDate.getDate().toString().padStart(2,'0')}.${(startDate.getMonth()+1).toString().padStart(2,'0')}-${endDate.getDate().toString().padStart(2,'0')}.${(endDate.getMonth()+1).toString().padStart(2,'0')} ${startDate.getFullYear()}г.`;
        const headerSize = s.headerFontSize||'20pt';
        const daySize    = s.dayNameSize   ||'12pt';
        const mealSize   = s.mealFontSize  ||'10pt';
        const footerSize = s.footerFontSize||'8pt';

        let bgLayers = '';
        s.backgroundImages.map((img,idx)=>({...img,idx})).filter(img=>img.image).sort((a,b)=>a.zIndex-b.zIndex).forEach(img => {
            bgLayers += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:url('data/images/backgrounds/${img.image}');background-size:${img.size}% auto;background-position:${this.getPositionCSS(img.position)};background-repeat:no-repeat;opacity:${img.opacity};z-index:${img.zIndex};pointer-events:none;"></div>`;
        });

        let html = `<div style="background-color:${s.backgroundColor};position:relative;padding:${spacing.containerPadding};min-height:400px;font-family:Arial,sans-serif;display:flex;flex-direction:column;">`;
        html += bgLayers;
        html += `<div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">`;
        if (s.showHeader) html += `<div style="text-align:${s.headerAlignment};margin-bottom:${spacing.headerMargin};"><span style="font-size:${headerSize};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        html += `<div style="text-align:center;margin-bottom:${spacing.dateMargin};font-size:${isCompact?'10pt':'11pt'};">${dateRange}</div>`;
        html += `<div style="flex:1;">`;
        if (is2Col) {
            for (let i = 0; i < days.length; i += 2) {
                html += `<div style="display:flex;gap:${spacing.columnGap};margin-bottom:${spacing.rowMargin};"><div style="flex:1;">${days[i]?this.renderDayBlock(days[i],s,spacing,daySize,mealSize,isCompact):''}</div><div style="flex:1;">${days[i+1]?this.renderDayBlock(days[i+1],s,spacing,daySize,mealSize,isCompact):''}</div></div>`;
            }
        } else {
            days.forEach(day => { html += this.renderDayBlock(day,s,spacing,daySize,mealSize,isCompact); });
        }
        html += `</div>`;
        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment};margin-top:${spacing.footerMarginTop};padding-top:${spacing.footerPaddingTop};border-top:1px solid #ddd;font-size:${footerSize};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        container.innerHTML = html;
    }

    async saveTemplate() {
        const name = prompt(window.t('alert_template_name'));
        if (!name) return;
        if (!window.menuTemplates) window.menuTemplates = {};
        window.menuTemplates[name] = this.settings;
        if (window.storageAdapter) await window.storageAdapter.save('templates', window.menuTemplates);
        alert(window.t('alert_template_saved'));
    }

    reset() {
        if (!confirm(window.t('alert_reset_confirm'))) return;
        this.settings = new StepTemplateBuilder().settings;
        this.buildUI();
        this.bindTabControls();
        this.bindAccordion();
        this.bindControls();
        this.bindActionButtons();
        this.loadSampleData();
        this.updatePreview();
    }
}

window.stepTemplateBuilder = new StepTemplateBuilder();

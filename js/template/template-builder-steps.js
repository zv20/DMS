/**
 * Step-Based Template Builder with Accordion UI
 * @version 6.2 - Fix: transparent dayBackground handled via checkbox, not color input
 */

class StepTemplateBuilder {
    constructor() {
        this.settings = {
            templateStyle: 'compact',
            fontFamily: 'Arial, sans-serif',
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

            showDateRange:    true,
            dateFontSize:     12,
            dateColor:        '#666666',
            dateAlignment:    'center',

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

            mealFontSize:       11,

            allergenColor:      '#ff0000',
            allergenUnderline:  false,
            allergenBold:       true,

            showFooter:       true,
            footerText:       'Приготвено с любов',
            footerAlignment:  'center',
            footerFontSize:   9
        };

        this.previewData      = null;
        this.expandedSection  = 'header';
        this.currentTab       = 'builder';
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
        style.textContent = `.builder-tab-btn:hover{background:#5a6268!important;} .builder-tab-btn.active{background:#495057!important;}`;
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

            <!-- ── Font Family always visible at top ── -->
            <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;margin-bottom:15px;">
                <label style="font-weight:600;font-size:12px;color:#856404;display:block;margin-bottom:6px;">🗻️ Page Font Family</label>
                <select id="fontFamily" class="select-input">
                    <option value="Arial, sans-serif"            ${this.settings.fontFamily.includes('Arial')  ?'selected':''}>Arial</option>
                    <option value="'Times New Roman', serif"     ${this.settings.fontFamily.includes('Times')  ?'selected':''}>Times New Roman</option>
                    <option value="Georgia, serif"               ${this.settings.fontFamily.includes('Georgia')?'selected':''}>Georgia</option>
                    <option value="'Comic Sans MS', cursive"     ${this.settings.fontFamily.includes('Comic')  ?'selected':''}>Comic Sans MS</option>
                    <option value="Verdana, sans-serif"          ${this.settings.fontFamily.includes('Verdana')?'selected':''}>Verdana</option>
                </select>
            </div>

            ${this.renderAccordionSection('background', window.t('section_background'), this.renderBackgroundControls())}
            ${this.renderAccordionSection('header',     window.t('section_header'),     this.renderHeaderControls())}
            ${this.renderAccordionSection('menu',       window.t('section_menu'),       this.renderMenuControls())}
            ${this.renderAccordionSection('footer',     window.t('section_footer'),     this.renderFooterControls())}

            <div style="margin-top:25px;padding-top:20px;border-top:2px solid #e0e0e0;">
                <button id="btnLoadData"     class="btn btn-primary"   style="width:100%;margin-bottom:10px;">${window.t('btn_load_menu_data')}</button>
                <button id="btnSaveTemplate" class="btn btn-secondary" style="width:100%;margin-bottom:10px;">${window.t('btn_save_template')}</button>
                <button id="btnReset"        class="btn btn-secondary" style="width:100%;">${window.t('btn_reset_default')}</button>
            </div>
        `;
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
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
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
            this.switchTab('builder');
            this.buildUI(); this.bindTabControls(); this.bindAccordion(); this.bindControls(); this.bindActionButtons();
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
            const dataDir   = await window.directoryHandle.getDirectoryHandle('data',   { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images',                { create: false });
            const folderDir = await imagesDir.getDirectoryHandle(folder,               { create: false });
            const images = [];
            for await (const entry of folderDir.values()) {
                if (entry.kind === 'file' && /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)) {
                    images.push({ name: entry.name, url: URL.createObjectURL(await entry.getFile()) });
                }
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
        } catch { container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_folder_missing')}</div>`; }
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
        } catch (err) { alert(window.t('alert_image_delete_failed')); }
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

    renderHeaderControls() {
        return `<div class="control-group">
            <label class="checkbox-label"><input type="checkbox" id="showHeader" ${this.settings.showHeader?'checked':''}><span>${window.t('label_show_header')}</span></label>
            <label>${window.t('label_header_text')}</label>
            <input type="text" id="headerText" value="${this.settings.headerText}" class="text-input">
            <label>${window.t('label_text_alignment')}</label>
            <select id="headerAlignment" class="select-input">
                <option value="left"   ${this.settings.headerAlignment==='left'?'selected':''}>${window.t('align_left')}</option>
                <option value="center" ${this.settings.headerAlignment==='center'?'selected':''}>${window.t('align_center')}</option>
                <option value="right"  ${this.settings.headerAlignment==='right'?'selected':''}>${window.t('align_right')}</option>
            </select>
            <label>Header Font Size (pt)</label>
            <input type="number" id="headerFontSize" value="${this.settings.headerFontSize}" min="8" max="120" class="text-input">
            <label>${window.t('label_text_color')}</label>
            <input type="color" id="headerColor" value="${this.settings.headerColor}" class="color-input">

            <h4 style="margin-top:18px;">&#128197; Date Range</h4>
            <label class="checkbox-label"><input type="checkbox" id="showDateRange" ${this.settings.showDateRange?'checked':''}><span>Show Date Range</span></label>
            <label>Date Alignment</label>
            <select id="dateAlignment" class="select-input">
                <option value="left"   ${this.settings.dateAlignment==='left'?'selected':''}>${window.t('align_left')}</option>
                <option value="center" ${this.settings.dateAlignment==='center'?'selected':''}>${window.t('align_center')}</option>
                <option value="right"  ${this.settings.dateAlignment==='right'?'selected':''}>${window.t('align_right')}</option>
            </select>
            <label>Date Font Size (pt)</label>
            <input type="number" id="dateFontSize" value="${this.settings.dateFontSize}" min="6" max="60" class="text-input">
            <label>Date Color</label>
            <input type="color" id="dateColor" value="${this.settings.dateColor}" class="color-input">
        </div>`;
    }

    renderMenuControls() {
        // dayBackground can be 'transparent' — color input requires a valid #rrggbb value.
        // We use a separate checkbox for "No background" and only show the color picker
        // when a real color is selected. This eliminates the browser console warning.
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
            <select id="dayBorderStyle" class="select-input">
                <option value="solid"  ${this.settings.dayBorderStyle==='solid'?'selected':''}>${window.t('border_solid')}</option>
                <option value="dashed" ${this.settings.dayBorderStyle==='dashed'?'selected':''}>${window.t('border_dashed')}</option>
                <option value="dotted" ${this.settings.dayBorderStyle==='dotted'?'selected':''}>${window.t('border_dotted')}</option>
                <option value="double" ${this.settings.dayBorderStyle==='double'?'selected':''}>${window.t('border_double')}</option>
            </select>
            <label>${window.t('label_border_thickness')}</label>
            <select id="dayBorderThickness" class="select-input">
                <option value="1px" ${this.settings.dayBorderThickness==='1px'?'selected':''}>1px</option>
                <option value="2px" ${this.settings.dayBorderThickness==='2px'?'selected':''}>2px</option>
                <option value="3px" ${this.settings.dayBorderThickness==='3px'?'selected':''}>3px</option>
                <option value="4px" ${this.settings.dayBorderThickness==='4px'?'selected':''}>4px</option>
            </select>

            <label style="margin-top:4px;">${window.t('label_background')}</label>
            <label class="checkbox-label" style="margin-bottom:4px;">
                <input type="checkbox" id="dayBgTransparent" ${dayBgIsTransparent?'checked':''}>
                <span>No background (transparent)</span>
            </label>
            <input type="color" id="dayBackground" value="${dayBgColor}" class="color-input"
                   style="${dayBgIsTransparent?'opacity:0.35;pointer-events:none;':''}"
                   ${dayBgIsTransparent?'disabled':''}>

            <h4 style="margin-top:15px;">${window.t('label_day_name')}</h4>
            <label>Size (pt)</label>
            <input type="number" id="dayNameSize" value="${this.settings.dayNameSize}" min="8" max="48" class="text-input">
            <label>${window.t('label_color')}</label>
            <input type="color" id="dayNameColor" value="${this.settings.dayNameColor}" class="color-input">

            <h4 style="margin-top:15px;">&#127869;&#65039; Meal Text</h4>
            <label>Meal Size (pt)</label>
            <input type="number" id="mealFontSize" value="${this.settings.mealFontSize}" min="6" max="36" class="text-input">

            <h4 style="margin-top:15px;">${window.t('label_allergens')}</h4>
            <label>${window.t('label_color')}</label>
            <input type="color" id="allergenColor" value="${this.settings.allergenColor}" class="color-input">
            <label class="checkbox-label"><input type="checkbox" id="allergenUnderline" ${this.settings.allergenUnderline?'checked':''}><span>${window.t('label_underline')}</span></label>
            <label class="checkbox-label"><input type="checkbox" id="allergenBold"      ${this.settings.allergenBold?'checked':''}><span>${window.t('label_bold')}</span></label>
        </div>`;
    }

    renderFooterControls() {
        return `<div class="control-group">
            <label class="checkbox-label"><input type="checkbox" id="showFooter" ${this.settings.showFooter?'checked':''}><span>${window.t('label_show_footer')}</span></label>
            <label>${window.t('label_footer_text')}</label>
            <input type="text" id="footerText" value="${this.settings.footerText}" class="text-input">
            <label>${window.t('label_text_alignment')}</label>
            <select id="footerAlignment" class="select-input">
                <option value="left"   ${this.settings.footerAlignment==='left'?'selected':''}>${window.t('align_left')}</option>
                <option value="center" ${this.settings.footerAlignment==='center'?'selected':''}>${window.t('align_center')}</option>
                <option value="right"  ${this.settings.footerAlignment==='right'?'selected':''}>${window.t('align_right')}</option>
            </select>
            <label>Footer Font Size (pt)</label>
            <input type="number" id="footerFontSize" value="${this.settings.footerFontSize}" min="6" max="48" class="text-input">
        </div>`;
    }

    renderStyles() {
        return `<style>
            .step-template-controls{padding:20px;background:white;border-radius:8px;}
            .tab-content{display:none;} .tab-content.active{display:block;}
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
            .slider{width:100%;} .slider-value{text-align:center;font-size:12px;color:#666;}
            .subsection{background:#f8f9fa;padding:12px;border-radius:6px;}
            .template-card{display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;}
            .image-card{padding:10px;border:2px solid #e0e0e0;border-radius:8px;text-align:center;}
        </style>`;
    }

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

    bindControls() {
        [0,1,2,3,4].forEach(i => this.bindMultiImageSlot(i));
        this.bindColorInput('backgroundColor');
        this.bindSelect('fontFamily');
        this.bindCheckbox('showHeader');
        this.bindTextInput('headerText');
        this.bindSelect('headerAlignment');
        this.bindNumberInput('headerFontSize');
        this.bindColorInput('headerColor');
        this.bindCheckbox('showDateRange');
        this.bindSelect('dateAlignment');
        this.bindNumberInput('dateFontSize');
        this.bindColorInput('dateColor');
        document.querySelectorAll('input[name="templateStyle"]').forEach(r => {
            r.addEventListener('change', e => { this.settings.templateStyle = e.target.value; this.updatePreview(); });
        });
        this.bindCheckbox('dayBorder');
        this.bindColorInput('dayBorderColor');
        this.bindSelect('dayBorderStyle');
        this.bindSelect('dayBorderThickness');
        // dayBackground handled separately — supports 'transparent' via checkbox
        this.bindDayBackground();
        this.bindNumberInput('dayNameSize');
        this.bindColorInput('dayNameColor');
        this.bindNumberInput('mealFontSize');
        this.bindColorInput('allergenColor');
        this.bindCheckbox('allergenUnderline');
        this.bindCheckbox('allergenBold');
        this.bindCheckbox('showFooter');
        this.bindTextInput('footerText');
        this.bindSelect('footerAlignment');
        this.bindNumberInput('footerFontSize');
    }

    // Special binding for dayBackground:
    // - Checkbox "No background" sets dayBackground to 'transparent' and disables the picker
    // - Color picker only active when checkbox is unchecked, stores a valid hex value
    bindDayBackground() {
        const check = document.getElementById('dayBgTransparent');
        const color = document.getElementById('dayBackground');
        if (!check || !color) return;

        check.addEventListener('change', e => {
            if (e.target.checked) {
                this.settings.dayBackground = 'transparent';
                color.disabled = true;
                color.style.opacity = '0.35';
                color.style.pointerEvents = 'none';
            } else {
                this.settings.dayBackground = color.value;
                color.disabled = false;
                color.style.opacity = '1';
                color.style.pointerEvents = '';
            }
            this.updatePreview();
        });

        color.addEventListener('input', e => {
            if (!check.checked) {
                this.settings.dayBackground = e.target.value;
                this.updatePreview();
            }
        });
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

    bindCheckbox(id)    { document.getElementById(id)?.addEventListener('change', e => { this.settings[id]=e.target.checked; this.updatePreview(); }); }
    bindTextInput(id)   { document.getElementById(id)?.addEventListener('input',  e => { this.settings[id]=e.target.value;   this.updatePreview(); }); }
    bindNumberInput(id) { document.getElementById(id)?.addEventListener('input',  e => { this.settings[id]=parseInt(e.target.value)||8; this.updatePreview(); }); }
    bindSelect(id)      { document.getElementById(id)?.addEventListener('change', e => { this.settings[id]=e.target.value;   this.updatePreview(); }); }
    bindColorInput(id)  { document.getElementById(id)?.addEventListener('input',  e => { this.settings[id]=e.target.value;   this.updatePreview(); }); }

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

    // ─── PREVIEW ───────────────────────────────────────────────────────────────
    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        const s = this.settings;
        const { startDate, endDate, days } = this.previewData;

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
                    <div style="flex:1;">${days[i]  ? this.renderDayBlock(days[i],  s, isCompact) : ''}</div>
                    <div style="flex:1;">${days[i+1] ? this.renderDayBlock(days[i+1],s, isCompact) : ''}</div>
                </div>`;
            }
        } else {
            days.forEach(day => { content += this.renderDayBlock(day, s, isCompact); });
        }

        container.innerHTML = `
        <div style="background-color:${s.backgroundColor};position:relative;padding:40px 40px 30px;min-height:800px;font-family:${s.fontFamily};display:flex;flex-direction:column;box-sizing:border-box;border:1px solid #ddd;box-shadow:0 2px 16px rgba(0,0,0,0.1);overflow:hidden;">
            ${bgLayers}
            <div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">
                <!-- Header -->
                <div style="margin-bottom:18px;">
                    ${s.showHeader ? `<div style="text-align:${s.headerAlignment};margin-bottom:6px;"><span style="font-size:${s.headerFontSize}pt;color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>` : ''}
                    ${s.showDateRange ? `<div style="text-align:${s.dateAlignment};font-size:${s.dateFontSize}pt;color:${s.dateColor};">${dateRangeText}</div>` : ''}
                </div>
                <!-- Content stretches to fill page -->
                <div style="flex:1;">
                    ${content}
                </div>
                <!-- Footer pinned to bottom -->
                ${s.showFooter ? `<div style="text-align:${s.footerAlignment};margin-top:20px;padding-top:12px;border-top:1px solid #ddd;font-size:${s.footerFontSize}pt;color:#888;">${s.footerText}</div>` : ''}
            </div>
        </div>`;
    }

    renderDayBlock(day, s, isCompact) {
        if (!day || !day.meals.length) return '';
        const borderStyle = s.dayBorder
            ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor};`
            : '';
        const bgStyle = s.dayBackground && s.dayBackground !== 'transparent'
            ? `background:${s.dayBackground};`
            : '';
        const wrapStyle = `${borderStyle}${bgStyle}padding:10px;margin-bottom:14px;border-radius:4px;`;

        let html = `<div style="${wrapStyle}">`;
        html += `<div style="font-size:${s.dayNameSize}pt;color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:6px;">${day.name}</div>`;

        day.meals.forEach(meal => {
            if (isCompact) {
                let line = ` ${meal.number}. ${meal.name}`;
                if (meal.portion) line += ` – ${meal.portion}`;
                if (meal.ingredients && meal.ingredients.length) {
                    const ingList = meal.ingredients.map(ing => this._formatIng(ing, s)).join(', ');
                    line += `; ${ingList}`;
                }
                if (meal.calories) line += ` | ККАЛ ${meal.calories}`;
                html += `<div style="font-size:${s.mealFontSize}pt;line-height:1.4;margin-bottom:4px;margin-left:8px;">${line}</div>`;
            } else {
                let title = ` ${meal.number}. ${meal.name}`;
                if (meal.portion) title += ` – ${meal.portion}`;
                html += `<div style="font-size:${s.mealFontSize}pt;line-height:1.4;margin-bottom:2px;margin-left:8px;font-weight:500;">${title}</div>`;
                if (meal.ingredients && meal.ingredients.length) {
                    const ingList = meal.ingredients.map(ing => this._formatIng(ing, s)).join(', ');
                    const calStr  = meal.calories ? ` – ККАЛ ${meal.calories}` : '';
                    html += `<div style="font-size:${s.mealFontSize}pt;line-height:1.4;margin-left:22px;color:#555;font-style:italic;margin-bottom:4px;">${ingList}${calStr}</div>`;
                } else if (meal.calories) {
                    html += `<div style="font-size:${s.mealFontSize}pt;line-height:1.4;margin-left:22px;color:#555;font-style:italic;margin-bottom:4px;">ККАЛ ${meal.calories}</div>`;
                }
            }
        });

        html += `</div>`;
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
                    { number:1, name:'Супа топчета',      portion:'150гр', calories:129, ingredients:[{name:'кайма',hasAllergen:false},{name:'яйца',hasAllergen:true}]},
                    { number:2, name:'Пиле с ориз',        portion:'200гр', calories:250, ingredients:[{name:'пиле',hasAllergen:false},{name:'ориз',hasAllergen:false}]}
                ]},
                { name:'Вторник', meals:[
                    { number:1, name:'Таратор',            portion:'150гр', calories:100, ingredients:[{name:'краставица',hasAllergen:false},{name:'кисело мляко',hasAllergen:true}]},
                    { number:2, name:'Мусака',             portion:'200гр', calories:320, ingredients:[{name:'картофи',hasAllergen:false},{name:'яйца',hasAllergen:true}]}
                ]},
                { name:'Сряда', meals:[
                    { number:1, name:'Пилешка супа',       portion:'150гр', calories:120, ingredients:[{name:'пиле',hasAllergen:false},{name:'моркови',hasAllergen:false}]},
                    { number:2, name:'Кюфтета',            portion:'180гр', calories:280, ingredients:[{name:'кайма',hasAllergen:false},{name:'лук',hasAllergen:false}]}
                ]},
                { name:'Четвъртък', meals:[
                    { number:1, name:'Леща яхния',         portion:'200гр', calories:180, ingredients:[{name:'леща',hasAllergen:false},{name:'домати',hasAllergen:false}]},
                    { number:2, name:'Свинско с картофи',  portion:'200гр', calories:350, ingredients:[{name:'свинско',hasAllergen:false},{name:'картофи',hasAllergen:false}]}
                ]},
                { name:'Петък', meals:[
                    { number:1, name:'Рибена чорба',       portion:'150гр', calories:110, ingredients:[{name:'риба',hasAllergen:true},{name:'картофи',hasAllergen:false}]},
                    { number:2, name:'Пъстърва на скара',  portion:'180гр', calories:200, ingredients:[{name:'пъстърва',hasAllergen:true},{name:'лимон',hasAllergen:false}]}
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

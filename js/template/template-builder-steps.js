/**
 * Step-Based Template Builder with Accordion UI
 * Clean, organized workflow - Background images only
 * @version 6.0 - Flexible font sizes, Font Family selection, and Date Range styling
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
            showHeader: true,
            headerText: 'Седмично меню',
            headerAlignment: 'center',
            headerFontSize: 24,
            headerColor: '#d2691e',
            
            showDateRange: true,
            dateFontSize: 12,
            dateColor: '#666666',
            dateAlignment: 'center',

            showIngredients: true,
            showCalories: true,
            showPortions: true,
            
            dayBorder: false,
            dayBorderColor: '#e0e0e0',
            dayBorderStyle: 'solid',
            dayBorderThickness: '1px',
            dayBackground: 'transparent',
            dayPadding: '0px',
            dayNameSize: 14,
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            
            mealFontSize: 11,
            mealLineHeight: '1.4',
            ingredientColor: '#333333',
            ingredientSize: 'medium',
            
            allergenColor: '#ff0000',
            allergenUnderline: false,
            allergenBold: true,
            allergenItalic: false,
            
            showFooter: true,
            footerText: 'Приготвено с любов',
            footerAlignment: 'center',
            footerFontSize: 9
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
            <button class="btn btn-secondary btn-small builder-tab-btn active" data-tab="builder" style="background: #495057;">${window.t('tab_builder')}</button>
            <button class="btn btn-secondary btn-small builder-tab-btn" data-tab="templates">${window.t('tab_templates')}</button>
            <button class="btn btn-secondary btn-small builder-tab-btn" data-tab="images">${window.t('tab_images')}</button>
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
            <h2 style="margin:0 0 10px 0;font-size:18px;">${window.t('builder_title')}</h2>
            <p  style="margin:0 0 15px 0;font-size:12px;color:#666;">${window.t('builder_subtitle')}</p>
            ${this.renderAccordionSection('background', window.t('section_background'), this.renderBackgroundControls())}
            ${this.renderAccordionSection('header',     window.t('section_header'),     this.renderHeaderControls())}
            ${this.renderAccordionSection('menu',       window.t('section_menu'),       this.renderMenuControls())}
            ${this.renderAccordionSection('footer',     window.t('section_footer'),     this.renderFooterControls())}
            <div class="action-buttons" style="margin-top:25px;padding-top:20px;border-top:2px solid #e0e0e0;">
                <button id="btnLoadData"     class="btn btn-primary"   style="width:100%;margin-bottom:10px;">${window.t('btn_load_menu_data')}</button>
                <button id="btnSaveTemplate" class="btn btn-secondary" style="width:100%;margin-bottom:10px;">${window.t('btn_save_template')}</button>
                <button id="btnReset"        class="btn btn-secondary" style="width:100%;">${window.t('btn_reset_default')}</button>
            </div>
        `;
    }

    renderTemplatesTab() {
        return `
            <div style="padding:10px 0;">
                <h2 style="margin:0 0 10px 0;font-size:18px;">${window.t('templates_title')}</h2>
                <p  style="margin:0 0 15px 0;font-size:12px;color:#666;">${window.t('templates_subtitle')}</p>
                <div id="templates-list" style="display:flex;flex-direction:column;gap:10px;"></div>
            </div>
        `;
    }

    renderImagesTab() {
        return `
            <div style="padding:10px 0;">
                <h2 style="margin:0 0 10px 0;font-size:18px;">${window.t('images_title')}</h2>
                <p  style="margin:0 0 15px 0;font-size:12px;color:#666;">${window.t('images_subtitle')}</p>
                <div class="subsection" style="margin-bottom:15px;">
                    <h4 style="margin:0 0 10px 0;font-size:13px;">${window.t('images_bg_title')}</h4>
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
                    <p style="margin:0;font-size:14px;">${window.t('templates_empty')}</p>
                    <p style="margin:5px 0 0 0;font-size:12px;">${window.t('templates_empty_desc')}</p>
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
                            <span>${window.t('template_style_label')}</span> ${template.templateStyle||'compact'} |
                            <span>${window.t('template_header_label')}</span> ${template.showHeader?window.t('template_yes'):window.t('template_no')} |
                            <span>${window.t('template_footer_label')}</span> ${template.showFooter?window.t('template_yes'):window.t('template_no')}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="stepTemplateBuilder.loadTemplate('${name}')">📥 ${window.t('btn_load')}</button>
                        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="stepTemplateBuilder.deleteTemplate('${name}')">🗑️ ${window.t('btn_delete')}</button>
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
            container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_select_folder')}</div>`;
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
                container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_empty')}</div>`;
                return;
            }
            container.innerHTML = images.map(img => `
                <div class="image-card">
                    <img src="${img.url}" style="width:100%;height:80px;object-fit:contain;border-radius:4px;margin-bottom:5px;background:#f5f5f5;">
                    <div style="font-size:10px;color:#666;margin-bottom:5px;word-break:break-word;">${img.name}</div>
                    <button class="btn btn-secondary" style="width:100%;padding:4px;font-size:11px;" onclick="stepTemplateBuilder.deleteImage('${folder}','${img.name}')">🗑️ ${window.t('btn_delete')}</button>
                </div>`).join('');
        } catch (err) {
            container.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:#999;border:2px dashed #ddd;border-radius:8px;font-size:12px;">${window.t('images_folder_missing')}</div>`;
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

    loadRealData() {
        const lang  = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const isBg  = lang === 'bg';
        const weekEntries = this._buildWeekOptions(isBg);
        if (!weekEntries.length) {
            alert(isBg ? 'Няма планирани ястия в менюто.' : 'No meals found in the menu.');
            return;
        }
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:28px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:10000;min-width:340px;';
        const currentEntry = weekEntries.find(e => e.isCurrent) || weekEntries[0];
        dialog.innerHTML = `
            <h2 style="margin:0 0 20px 0;font-size:1.2rem;">📅 ${isBg ? 'Зареди данни' : 'Load Menu Data'}</h2>
            <select id="lrd-week" style="width:100%;padding:10px;border-radius:8px;margin-bottom:20px;">
                ${weekEntries.map(e => `<option value="${e.mondayStr}"${e.mondayStr === currentEntry.mondayStr ? ' selected' : ''}>${e.label}</option>`).join('')}
            </select>
            <div style="display:flex;gap:10px;">
                <button id="lrd-load" style="flex:1;padding:11px;background:#fd7e14;color:white;border:none;border-radius:8px;font-weight:600;">${isBg ? '✅ Зареди' : '✅ Load'}</button>
                <button id="lrd-cancel" style="padding:11px 18px;background:#e9ecef;border:none;border-radius:8px;">${isBg ? 'Отказ' : 'Cancel'}</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
        const close = () => { document.body.removeChild(overlay); document.body.removeChild(dialog); };
        dialog.querySelector('#lrd-load').addEventListener('click', () => {
            const mondayStr = dialog.querySelector('#lrd-week').value;
            const entry     = weekEntries.find(e => e.mondayStr === mondayStr);
            close();
            this._applyWeekData(entry.monday, entry.friday, isBg);
        });
        dialog.querySelector('#lrd-cancel').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }

    _buildWeekOptions(isBg) {
        const _getMonday = (d) => {
            const x = new Date(d);
            const day = x.getDay();
            x.setDate(x.getDate() + (day === 0 ? 1 : -(day - 1)));
            x.setHours(0, 0, 0, 0);
            return x;
        };
        const _str = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const mondaySet = new Set();
        const menu = window.currentMenu || {};
        Object.keys(menu).forEach(dateStr => {
            const hasMeals = Object.values(menu[dateStr] || {}).some(s => s && s.recipe);
            if (hasMeals) mondaySet.add(_str(_getMonday(new Date(dateStr + 'T00:00:00'))));
        });
        if (!mondaySet.size) return [];
        const locale = isBg ? 'bg-BG' : 'en-US';
        return Array.from(mondaySet).sort().map(mondayStr => {
            const monday = new Date(mondayStr + 'T00:00:00');
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            const dateRange = monday.toLocaleDateString(locale,{month:'short',day:'numeric'}) + ' – ' + friday.toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric'});
            return { mondayStr, monday, friday, label: `🍽️ ${dateRange}`, isCurrent: false };
        });
    }

    _applyWeekData(startDate, endDate, isBg) {
        const dayNames = isBg ? ['Понеделник','Вторник','Сряда','Четвъртък','Петък'] : ['Monday','Tuesday','Wednesday','Thursday','Friday'];
        const _str = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const days = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = _str(d);
            const dayMenu = window.getMenuForDate ? window.getMenuForDate(dateStr) : {};
            const meals = [];
            ['slot1','slot2','slot3','slot4'].forEach((slotId, idx) => {
                const slot = dayMenu[slotId];
                const recipe = slot?.recipe ? (window.recipes||[]).find(r => r.id === slot.recipe) : null;
                if (!recipe) return;
                const ingredients = (recipe.ingredients || []).map(ingObj => {
                    const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                    const ing   = (window.ingredients || []).find(i => i.id === ingId);
                    if (!ing) return null;
                    return { name: ing.name, hasAllergen: !!(ing.allergens && ing.allergens.length) };
                }).filter(Boolean);
                meals.push({ number: idx + 1, name: recipe.name, portion: recipe.portionSize || '', calories: recipe.calories || null, ingredients });
            });
            if (meals.length) days.push({ name: dayNames[i], meals });
        }
        this.previewData = { startDate, endDate, days };
        this.updatePreview();
    }

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
                <label>${window.t('label_background_color')}</label>
                <input type="color" id="backgroundColor" value="${this.settings.backgroundColor}" class="color-input">
                <label>Page Font Family</label>
                <select id="fontFamily" class="select-input">
                    <option value="Arial, sans-serif" ${this.settings.fontFamily.includes('Arial')?'selected':''}>Arial</option>
                    <option value="'Times New Roman', serif" ${this.settings.fontFamily.includes('Times')?'selected':''}>Times New Roman</option>
                    <option value="Georgia, serif" ${this.settings.fontFamily.includes('Georgia')?'selected':''}>Georgia</option>
                    <option value="'Comic Sans MS', cursive" ${this.settings.fontFamily.includes('Comic')?'selected':''}>Comic Sans MS</option>
                    <option value="Verdana, sans-serif" ${this.settings.fontFamily.includes('Verdana')?'selected':''}>Verdana</option>
                </select>
                <div style="margin:20px 0;padding:12px;background:#e3f2fd;border-left:4px solid #2196f3;border-radius:4px;">
                    <p style="margin:0 0 5px 0;font-size:13px;font-weight:600;color:#1565c0;">${window.t('label_background_info')}</p>
                    <p style="margin:0;font-size:11px;color:#1976d2;">${window.t('label_background_desc')}</p>
                </div>
                ${[0,1,2,3,4].map(i => this.renderImageSlot(i, `${window.t('label_image_layer')} ${i+1}`)).join('')}
            </div>`;
    }

    renderImageSlot(index, title) {
        const slot = this.settings.backgroundImages[index];
        return `
            <div class="subsection" style="margin-bottom:15px;">
                <h4 style="margin:0 0 12px 0 !important;">${title}</h4>
                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <input type="file" id="bgImage${index}Upload" accept="image/*" style="display:none;">
                    <button id="uploadBgImage${index}Btn"  class="btn btn-secondary" style="flex:1;">${window.t('btn_upload')}</button>
                    <button id="browseBgImage${index}Btn"  class="btn btn-secondary" style="flex:1;">${window.t('btn_library')}</button>
                    <button id="removeBgImage${index}Btn"  class="btn btn-secondary" style="width:40px;">${window.t('btn_remove')}</button>
                </div>
                <div id="bgImage${index}Preview" style="display:${slot.image?'block':'none'};padding:8px;background:#f5f5f5;border-radius:4px;margin-bottom:10px;">
                    <small style="color:#555;">${window.t('file_label')} <strong id="bgImage${index}FileName">${slot.image||''}</strong></small>
                </div>
                <label>${window.t('label_position')}</label>
                <select id="bgImage${index}Position" class="select-input">
                    <option value="center" ${slot.position==='center'?'selected':''}>${window.t('pos_center')}</option>
                    <option value="top-left" ${slot.position==='top-left'?'selected':''}>${window.t('pos_top_left')}</option>
                    <option value="top-center" ${slot.position==='top-center'?'selected':''}>${window.t('pos_top_center')}</option>
                    <option value="top-right" ${slot.position==='top-right'?'selected':''}>${window.t('pos_top_right')}</option>
                    <option value="center-left" ${slot.position==='center-left'?'selected':''}>${window.t('pos_center_left')}</option>
                    <option value="center-right" ${slot.position==='center-right'?'selected':''}>${window.t('pos_center_right')}</option>
                    <option value="bottom-left" ${slot.position==='bottom-left'?'selected':''}>${window.t('pos_bottom_left')}</option>
                    <option value="bottom-center" ${slot.position==='bottom-center'?'selected':''}>${window.t('pos_bottom_center')}</option>
                    <option value="bottom-right" ${slot.position==='bottom-right'?'selected':''}>${window.t('pos_bottom_right')}</option>
                </select>
                <label>${window.t('label_size')}</label>
                <input type="range" id="bgImage${index}Size" min="5" max="100" value="${slot.size}" class="slider">
                <div class="slider-value"><span id="bgImage${index}SizeValue">${slot.size}</span>%</div>
                <label>${window.t('label_opacity')}</label>
                <input type="range" id="bgImage${index}Opacity" min="0" max="100" value="${slot.opacity*100}" class="slider">
                <div class="slider-value"><span id="bgImage${index}OpacityValue">${Math.round(slot.opacity*100)}</span>%</div>
                <label>${window.t('label_layer')}</label>
                <select id="bgImage${index}ZIndex" class="select-input">
                    <option value="1" ${slot.zIndex===1?'selected':''}>${window.t('layer_back')}</option>
                    <option value="2" ${slot.zIndex===2?'selected':''}>2</option>
                    <option value="3" ${slot.zIndex===3?'selected':''}>3</option>
                    <option value="4" ${slot.zIndex===4?'selected':''}>4</option>
                    <option value="5" ${slot.zIndex===5?'selected':''}>${window.t('layer_front')}</option>
                </select>
            </div>`;
    }

    renderHeaderControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label"><input type="checkbox" id="showHeader" ${this.settings.showHeader?'checked':''}><span>${window.t('label_show_header')}</span></label>
                <label>${window.t('label_header_text')}</label>
                <input type="text" id="headerText" value="${this.settings.headerText}" class="text-input">
                <label>${window.t('label_text_alignment')}</label>
                <select id="headerAlignment" class="select-input">
                    <option value="left" ${this.settings.headerAlignment==='left'?'selected':''}>${window.t('align_left')}</option>
                    <option value="center" ${this.settings.headerAlignment==='center'?'selected':''}>${window.t('align_center')}</option>
                    <option value="right" ${this.settings.headerAlignment==='right'?'selected':''}>${window.t('align_right')}</option>
                </select>
                <label>Header Font Size (pt)</label>
                <input type="number" id="headerFontSize" value="${this.settings.headerFontSize}" min="8" max="120" class="text-input">
                <label>${window.t('label_text_color')}</label>
                <input type="color" id="headerColor" value="${this.settings.headerColor}" class="color-input">

                <h4 style="margin-top:20px;">📅 Date Range Styling</h4>
                <label class="checkbox-label"><input type="checkbox" id="showDateRange" ${this.settings.showDateRange?'checked':''}><span>Show Date Range</span></label>
                <label>Date Alignment</label>
                <select id="dateAlignment" class="select-input">
                    <option value="left" ${this.settings.dateAlignment==='left'?'selected':''}>${window.t('align_left')}</option>
                    <option value="center" ${this.settings.dateAlignment==='center'?'selected':''}>${window.t('align_center')}</option>
                    <option value="right" ${this.settings.dateAlignment==='right'?'selected':''}>${window.t('align_right')}</option>
                </select>
                <label>Date Font Size (pt)</label>
                <input type="number" id="dateFontSize" value="${this.settings.dateFontSize}" min="6" max="60" class="text-input">
                <label>Date Color</label>
                <input type="color" id="dateColor" value="${this.settings.dateColor}" class="color-input">
            </div>`;
    }

    renderMenuControls() {
        return `
            <div class="control-group">
                <h4>${window.t('label_template_style')}</h4>
                <label class="radio-label"><input type="radio" name="templateStyle" value="compact" ${this.settings.templateStyle==='compact'?'checked':''}><span><strong>${window.t('style_compact')}</strong></span></label>
                <label class="radio-label"><input type="radio" name="templateStyle" value="detailed" ${this.settings.templateStyle==='detailed'?'checked':''}><span><strong>${window.t('style_detailed')}</strong></span></label>
                <label class="radio-label"><input type="radio" name="templateStyle" value="detailed-2col" ${this.settings.templateStyle==='detailed-2col'?'checked':''}><span><strong>${window.t('style_detailed_2col')}</strong></span></label>
                
                <h4 style="margin-top:15px;">${window.t('label_day_block')}</h4>
                <label class="checkbox-label"><input type="checkbox" id="dayBorder" ${this.settings.dayBorder?'checked':''}><span>${window.t('label_show_border')}</span></label>
                <label>${window.t('label_border_color')}</label>
                <input type="color" id="dayBorderColor" value="${this.settings.dayBorderColor}" class="color-input">
                <label>${window.t('label_background')}</label>
                <input type="color" id="dayBackground" value="${this.settings.dayBackground}" class="color-input">
                
                <h4 style="margin-top:15px;">${window.t('label_day_name')}</h4>
                <label>Size (pt)</label>
                <input type="number" id="dayNameSize" value="${this.settings.dayNameSize}" min="8" max="48" class="text-input">
                <label>${window.t('label_color')}</label>
                <input type="color" id="dayNameColor" value="${this.settings.dayNameColor}" class="color-input">
                
                <h4 style="margin-top:15px;">Meal Text</h4>
                <label>Meal Size (pt)</label>
                <input type="number" id="mealFontSize" value="${this.settings.mealFontSize}" min="6" max="36" class="text-input">
            </div>`;
    }

    renderFooterControls() {
        return `
            <div class="control-group">
                <label class="checkbox-label"><input type="checkbox" id="showFooter" ${this.settings.showFooter?'checked':''}><span>${window.t('label_show_footer')}</span></label>
                <label>${window.t('label_footer_text')}</label>
                <input type="text" id="footerText" value="${this.settings.footerText}" class="text-input">
                <label>${window.t('label_text_alignment')}</label>
                <select id="footerAlignment" class="select-input">
                    <option value="left" ${this.settings.footerAlignment==='left'?'selected':''}>${window.t('align_left')}</option>
                    <option value="center" ${this.settings.footerAlignment==='center'?'selected':''}>${window.t('align_center')}</option>
                    <option value="right" ${this.settings.footerAlignment==='right'?'selected':''}>${window.t('align_right')}</option>
                </select>
                <label>Footer Font Size (pt)</label>
                <input type="number" id="footerFontSize" value="${this.settings.footerFontSize}" min="6" max="48" class="text-input">
            </div>`;
    }

    renderStyles() {
        return `<style>
            .step-template-controls{padding:20px;background:white;border-radius:8px;}
            .accordion-section{margin-bottom:10px;border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;}
            .accordion-header{padding:12px 15px;background:#f8f9fa;cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;}
            .accordion-content{padding:15px;}
            .control-group label{font-weight:500;font-size:12px;color:#555;margin-top:8px;}
            .text-input,.select-input{padding:8px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;width:100%;}
            .color-input{width:100%;height:36px;border:1px solid #ddd;border-radius:4px;cursor:pointer;margin-bottom:5px;}
            .slider{width:100%;height:5px;border-radius:3px;outline:none;}
            .subsection{background:#f8f9fa;padding:12px;border-radius:6px;margin:8px 0;}
            .template-card{display:flex;align-items:center;gap:10px;padding:12px;border:2px solid #e0e0e0;border-radius:8px;margin-bottom:10px;}
        </style>`;
    }

    bindAccordion() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const section = e.currentTarget.closest('.accordion-section');
                const isExpanded = section.classList.contains('expanded');
                document.querySelectorAll('.accordion-section').forEach(s => {
                    s.classList.remove('expanded');
                    s.querySelector('.accordion-content').style.display = 'none';
                    s.querySelector('.accordion-icon').textContent = '▶';
                });
                if (!isExpanded) {
                    section.classList.add('expanded');
                    section.querySelector('.accordion-content').style.display = 'block';
                    section.querySelector('.accordion-icon').textContent = '▼';
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

        document.querySelectorAll('input[name="templateStyle"]').forEach(radio => {
            radio.addEventListener('change', (e) => { this.settings.templateStyle = e.target.value; this.updatePreview(); });
        });
        
        this.bindCheckbox('dayBorder');
        this.bindColorInput('dayBorderColor');
        this.bindColorInput('dayBackground');
        this.bindNumberInput('dayNameSize');
        this.bindColorInput('dayNameColor');
        this.bindNumberInput('mealFontSize');

        this.bindCheckbox('showFooter');
        this.bindTextInput('footerText');
        this.bindSelect('footerAlignment');
        this.bindNumberInput('footerFontSize');
    }

    bindMultiImageSlot(index) {
        const upBtn = document.getElementById(`uploadBgImage${index}Btn`);
        const brBtn = document.getElementById(`browseBgImage${index}Btn`);
        const rmBtn = document.getElementById(`removeBgImage${index}Btn`);
        const input = document.getElementById(`bgImage${index}Upload`);
        
        upBtn?.addEventListener('click', () => input.click());
        brBtn?.addEventListener('click', () => this.openImageLibrary('backgrounds', index));
        rmBtn?.addEventListener('click', () => { this.settings.backgroundImages[index].image = null; this.updatePreview(); });
        input?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) { await this.saveImage(file, 'backgrounds'); this.settings.backgroundImages[index].image = file.name; this.updatePreview(); }
        });
        document.getElementById(`bgImage${index}Position`)?.addEventListener('change', (e) => { this.settings.backgroundImages[index].position = e.target.value; this.updatePreview(); });
        document.getElementById(`bgImage${index}Size`)?.addEventListener('input', (e) => { this.settings.backgroundImages[index].size = parseInt(e.target.value); this.updatePreview(); });
        document.getElementById(`bgImage${index}Opacity`)?.addEventListener('input', (e) => { this.settings.backgroundImages[index].opacity = e.target.value/100; this.updatePreview(); });
        document.getElementById(`bgImage${index}ZIndex`)?.addEventListener('change', (e) => { this.settings.backgroundImages[index].zIndex = parseInt(e.target.value); this.updatePreview(); });
    }

    bindCheckbox(id)    { document.getElementById(id)?.addEventListener('change', (e) => { this.settings[id] = e.target.checked; this.updatePreview(); }); }
    bindTextInput(id)   { document.getElementById(id)?.addEventListener('input',  (e) => { this.settings[id] = e.target.value;   this.updatePreview(); }); }
    bindNumberInput(id) { document.getElementById(id)?.addEventListener('input',  (e) => { this.settings[id] = parseInt(e.target.value)||10; this.updatePreview(); }); }
    bindSelect(id)      { document.getElementById(id)?.addEventListener('change', (e) => { this.settings[id] = e.target.value;   this.updatePreview(); }); }
    bindColorInput(id)  { document.getElementById(id)?.addEventListener('input',  (e) => { this.settings[id] = e.target.value;   this.updatePreview(); }); }

    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        const s = this.settings;
        const { startDate, endDate, days } = this.previewData;
        const dateRangeText = `${startDate.getDate().toString().padStart(2,'0')}.${(startDate.getMonth()+1).toString().padStart(2,'0')} - ${endDate.getDate().toString().padStart(2,'0')}.${(endDate.getMonth()+1).toString().padStart(2,'0')} ${startDate.getFullYear()}`;

        let bgLayers = '';
        s.backgroundImages.filter(img=>img.image).sort((a,b)=>a.zIndex-b.zIndex).forEach(img => {
            bgLayers += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:url('data/images/backgrounds/${img.image}');background-size:${img.size}% auto;background-position:${img.position.replace('-',' ')};background-repeat:no-repeat;opacity:${img.opacity};z-index:${img.zIndex};"></div>`;
        });

        let html = `<div style="background-color:${s.backgroundColor};position:relative;padding:40px;min-height:800px;font-family:${s.fontFamily};display:flex;flex-direction:column;box-sizing:border-box;border:1px solid #ddd;box-shadow:0 0 20px rgba(0,0,0,0.1);overflow:hidden;">`;
        html += bgLayers;
        html += `<div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;justify-content:space-between;">`;
        
        // Header & Date
        html += `<div>`;
        if (s.showHeader) html += `<div style="text-align:${s.headerAlignment};margin-bottom:10px;"><span style="font-size:${s.headerFontSize}pt;color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:${s.dateAlignment};margin-bottom:30px;font-size:${s.dateFontSize}pt;color:${s.dateColor};">${dateRangeText}</div>`;
        
        // Content Area
        html += `<div style="flex:1;">`;
        const is2Col = s.templateStyle === 'detailed-2col';
        if (is2Col) {
            for (let i = 0; i < days.length; i += 2) {
                html += `<div style="display:flex;gap:20px;margin-bottom:15px;">
                    <div style="flex:1;">${this.renderDayBlock(days[i],s)}</div>
                    <div style="flex:1;">${days[i+1]?this.renderDayBlock(days[i+1],s):''}</div>
                </div>`;
            }
        } else {
            days.forEach(day => { html += this.renderDayBlock(day,s); });
        }
        html += `</div></div>`;
        
        // Footer (Pushed to bottom by flex:1 above)
        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment};margin-top:20px;padding-top:15px;border-top:1px solid #eee;font-size:${s.footerFontSize}pt;color:#888;">${s.footerText}</div>`;
        
        html += `</div></div>`;
        container.innerHTML = html;
    }

    renderDayBlock(day, s) {
        if (!day || !day.meals.length) return '';
        const dayStyle = `margin-bottom:20px; padding:15px; border-radius:8px; ${s.dayBorder?`border:${s.dayBorderThickness} ${s.dayBorderStyle} ${s.dayBorderColor};`:''} ${s.dayBackground!=='transparent'?`background:${s.dayBackground};`:''}`;
        let html = `<div style="${dayStyle}"><div style="font-size:${s.dayNameSize}pt;color:${s.dayNameColor};font-weight:${s.dayNameWeight};margin-bottom:10px;">${day.name}</div>`;
        day.meals.forEach(meal => {
            html += `<div style="font-size:${s.mealFontSize}pt;line-height:1.4;margin-bottom:5px;margin-left:10px;">${meal.number}. ${meal.name}</div>`;
        });
        html += `</div>`;
        return html;
    }

    loadSampleData() {
        const today = new Date();
        const end = new Date(today); end.setDate(today.getDate() + 4);
        this.previewData = {
            startDate: today, endDate: end,
            days: [
                { name:'Понеделник', meals:[{number:1,name:'Супа топчета'},{number:2,name:'Пиле с ориз'}]},
                { name:'Вторник',    meals:[{number:1,name:'Леща яхния'},{number:2,name:'Мусака'}]},
                { name:'Сряда',      meals:[{number:1,name:'Таратор'},{number:2,name:'Кюфтета по чирпански'}]},
                { name:'Четвъртък',  meals:[{number:1,name:'Пилешка супа'},{number:2,name:'Свинско с картофи'}]},
                { name:'Петък',      meals:[{number:1,name:'Рибена чорба'},{number:2,name:'Пъстърва на скара'}]}
            ]
        };
    }

    bindActionButtons() {
        document.getElementById('btnLoadData')?.addEventListener('click', () => this.loadRealData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click', () => this.reset());
    }

    async saveTemplate() {
        const name = prompt(window.t('alert_template_name'));
        if (name) {
            if (!window.menuTemplates) window.menuTemplates = {};
            window.menuTemplates[name] = this.settings;
            if (window.storageAdapter) await window.storageAdapter.save('templates', window.menuTemplates);
            alert(window.t('alert_template_saved'));
        }
    }

    async saveImage(file, folder) {
        if (!window.directoryHandle) return false;
        try {
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: true });
            const imgDir = await dataDir.getDirectoryHandle('images', { create: true });
            const foldDir = await imgDir.getDirectoryHandle(folder, { create: true });
            const fh = await foldDir.getFileHandle(file.name, { create: true });
            const wr = await fh.createWritable();
            await wr.write(file); await wr.close();
            return true;
        } catch (e) { return false; }
    }

    reset() { if (confirm(window.t('alert_reset_confirm'))) { this.settings = new StepTemplateBuilder().settings; this.buildUI(); this.setup(); } }
}

window.stepTemplateBuilder = new StepTemplateBuilder();

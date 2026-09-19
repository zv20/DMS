/**
 * Word-style drag/drop template designer.
 * Keeps the legacy template settings in sync so existing save/print paths keep working.
 */

class StepTemplateBuilder {
    constructor() {
        this.settings = this.getDefaultSettings();
        this.previewData = null;
        this.currentTab = 'builder';
        this.selectedBlockId = 'header';
        this.dragState = null;
        this.resizeState = null;
        this.history = [];
        this.historyIndex = -1;
        this.init();
    }

    getDefaultSettings() {
        return {
            templateStyle: 'compact',
            backgroundColor: '#ffffff',
            showGuides: true,
            snapToGrid: true,
            backgroundImages: [
                { image: null, position: 'center', size: 100, opacity: 1, zIndex: 1 },
                { image: null, position: 'top-left', size: 20, opacity: 1, zIndex: 2 },
                { image: null, position: 'top-right', size: 20, opacity: 1, zIndex: 3 },
                { image: null, position: 'bottom-left', size: 20, opacity: 1, zIndex: 4 },
                { image: null, position: 'bottom-right', size: 20, opacity: 1, zIndex: 5 }
            ],
            showHeader: true,
            headerText: 'Седмично меню',
            headerAlignment: 'center',
            headerFontSize: 24,
            headerColor: '#d2691e',
            headerFontFamily: 'Arial, sans-serif',
            showDateRange: true,
            dateFontSize: 12,
            dateColor: '#666666',
            dateAlignment: 'center',
            dateFontFamily: 'Arial, sans-serif',
            showIngredients: true,
            showCalories: true,
            showPortions: true,
            dayBorder: false,
            dayBorderColor: '#e0e0e0',
            dayBorderStyle: 'solid',
            dayBorderThickness: '1px',
            dayBackground: 'transparent',
            dayNameSize: 18,
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            dayNameFontFamily: 'Arial, sans-serif',
            mealFontSize: 12,
            mealFontFamily: 'Arial, sans-serif',
            allergenColor: '#ff0000',
            allergenUnderline: false,
            allergenBold: true,
            showFooter: true,
            footerText: 'Prepared with care by DMS',
            footerAlignment: 'center',
            footerFontSize: 9,
            footerFontFamily: 'Arial, sans-serif',
            editorBlocks: [
                this.createBlock('header', 'text', 'Header', 8, 6, 84, 9, { html: 'Седмично меню', fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#d2691e', align: 'center', bold: true, italic: false, underline: false }),
                this.createBlock('date', 'date', 'Date Range', 24, 16, 52, 5, { fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#666666', align: 'center', bold: false, italic: false, underline: false }),
                ...this.createDefaultDayBlocks(),
                this.createBlock('footer', 'text', 'Footer', 18, 86, 64, 6, { html: 'Prepared with care by DMS', fontFamily: 'Arial, sans-serif', fontSize: 9, color: '#777777', align: 'center', bold: false, italic: false, underline: false })
            ]
        };
    }

    createBlock(id, type, label, x, y, width, height, style = {}) {
        return { id, type, label, visible: true, locked: false, x, y, width, height, zIndex: 30, style };
    }

    createDefaultDayBlocks() {
        const labels = this.weekdayBlockLabels();
        return labels.map((label, index) => this.createBlock(`day-${index}`, 'day', label, 7, 24 + (index * 12), 86, 10.5, {
            dayIndex: index,
            dayTitle: label,
            dayNameFontFamily: 'Arial, sans-serif',
            dayNameSize: 18,
            dayNameColor: '#d2691e',
            dayNameWeight: 'bold',
            dayBackground: 'transparent',
            dayBorderEnabled: true,
            dayBorderColor: '#e0e0e0',
            dayBorderWidth: '1px',
            dayBorderStyle: 'solid',
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            color: '#222222',
            align: 'left',
            lineHeight: 1.2,
            backgroundColor: 'transparent'
        }));
    }

    weekdayBlockLabels() {
        const isBg = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
        return isBg
            ? ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    init() {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.setup());
        else this.setup();
    }

    setup() {
        this.ensureEditorBlocks();
        this.buildUI();
        if (!this.loadCurrentMenuData()) this.loadSampleData();
        this.pushHistory();
        this.updatePreview();
    }

    _fonts() {
        return [
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: "'Times New Roman', serif", label: 'Times New Roman' },
            { value: 'Georgia, serif', label: 'Georgia' },
            { value: 'Verdana, sans-serif', label: 'Verdana' },
            { value: "'Courier New', monospace", label: 'Courier New' },
            { value: 'Tahoma, sans-serif', label: 'Tahoma' }
        ];
    }

    tr(key, fallback) {
        return window.t ? window.t(key) : fallback;
    }

    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        const tabs = document.getElementById('template-builder-tabs');
        const toolbar = document.querySelector('.template-canvas-toolbar');
        if (!sidebar || !toolbar) return;
        if (tabs) {
            tabs.innerHTML = `
                <button class="builder-tab-btn active" data-tab="builder" type="button">${this.escapeHtml(this.tr('tab_builder', 'Editor'))}</button>
                <button class="builder-tab-btn" data-tab="templates" type="button">${this.escapeHtml(this.tr('tab_templates', 'Saved Templates'))}</button>
                <button class="builder-tab-btn" data-tab="images" type="button">${this.escapeHtml(this.tr('tab_images', 'Images'))}</button>
            `;
        }
        sidebar.innerHTML = `
            <div id="tab-builder" class="tab-content active"></div>
            <div id="tab-templates" class="tab-content">${this.renderTemplatesTab()}</div>
            <div id="tab-images" class="tab-content">${this.renderImagesTab()}</div>
        `;
        toolbar.innerHTML = this.renderRibbon();
        this.bindTabControls();
        this.bindEditorControls();
        this.bindActionButtons();
        this.applyTabVisibility();
        if (this.currentTab === 'templates') setTimeout(() => this.loadTemplates(), 0);
        if (this.currentTab === 'images') setTimeout(() => this.loadImages(), 0);
    }

    renderRibbon() {
        const block = this.getSelectedBlock();
        const style = block?.style || {};
        const fonts = this._fonts();
        const canTextStyle = block && !['image', 'shape'].includes(block.type);
        const textBackground = style.backgroundColor && style.backgroundColor !== 'transparent' ? style.backgroundColor : '#ffffff';
        const templateOptions = Object.keys(window.menuTemplates || {}).sort().map(name => `<option value="${this.escapeAttr(name)}">${this.escapeHtml(name)}</option>`).join('');
        const pageBackground = this.settings.backgroundImages?.[0] || {};
        const hasPageBackground = !!pageBackground.image;
        const pageBackgroundLabel = hasPageBackground ? pageBackground.image : this.tr('text_no_uploads', 'No image');
        const isDayBlock = block?.type === 'day';
        const dayTitleColor = style.dayNameColor || this.settings.dayNameColor || '#d2691e';
        const dayHolderBg = style.dayBackground && style.dayBackground !== 'transparent' ? style.dayBackground : '#ffffff';
        const borderSettings = this.getBlockBorderSettings(block);
        const iconButton = (id, icon, title, label, extra = '') => `<button type="button" class="ribbon-btn icon-btn labeled-icon-btn" id="${id}" title="${this.escapeAttr(title)}" aria-label="${this.escapeAttr(title)}" ${extra}><span class="ribbon-btn-icon">${icon}</span><span class="ribbon-btn-label">${this.escapeHtml(label || title)}</span></button>`;
        const alignButton = (align, icon, title, label) => `<button type="button" class="ribbon-btn icon-btn labeled-icon-btn" data-page-align="${align}" title="${this.escapeAttr(title)}" aria-label="${this.escapeAttr(title)}"><span class="ribbon-btn-icon">${icon}</span><span class="ribbon-btn-label">${this.escapeHtml(label)}</span></button>`;
        return `
            <div class="dms-ribbon">
                <div class="ribbon-row ribbon-row-primary">
                    <div class="ribbon-group ribbon-file">
                        <button type="button" class="ribbon-command primary builder-menu-button" id="btnBuilderFileMenu" title="${this.escapeAttr(this.tr('ribbon_file_menu', 'Template actions'))}" aria-label="${this.escapeAttr(this.tr('ribbon_file_menu', 'Template actions'))}" aria-expanded="false">
                            <span class="ribbon-symbol">☰</span><span>${this.escapeHtml(this.tr('ribbon_file', 'File'))}</span>
                        </button>
                        <div id="builderFileMenu" class="builder-file-menu" hidden>
                            <button type="button" id="btnSaveTemplate"><strong>${this.escapeHtml(this.tr('ribbon_save', 'Save'))}</strong><span>${this.escapeHtml(this.tr('btn_save_template', 'Save template'))}</span></button>
                            <button type="button" id="btnLoadData"><strong>${this.escapeHtml(this.tr('ribbon_load_data', 'Load Data'))}</strong><span>${this.escapeHtml(this.tr('ribbon_load_menu_help', 'Use planned meals'))}</span></button>
                            <label>
                                <strong>${this.escapeHtml(this.tr('ribbon_saved_templates', 'Saved Templates'))}</strong>
                                <select id="savedTemplateSelect" title="${this.escapeAttr(this.tr('ribbon_saved_templates', 'Saved templates'))}">
                                    <option value="">${this.escapeHtml(this.tr('ribbon_choose_template', 'Choose template'))}</option>
                                    ${templateOptions}
                                </select>
                            </label>
                            <div class="builder-file-menu-actions">
                                <button type="button" id="btnLoadSavedTemplate">${this.escapeHtml(this.tr('ribbon_open_template', 'Open'))}</button>
                                <button type="button" id="btnDeleteSavedTemplate">${this.escapeHtml(this.tr('ribbon_delete_template', 'Delete'))}</button>
                            </div>
                            <button type="button" class="danger" id="btnReset"><strong>${this.escapeHtml(this.tr('ribbon_clear', 'Clear'))}</strong><span>${this.escapeHtml(this.tr('ribbon_clear_template_help', 'Reset the canvas'))}</span></button>
                        </div>
                    </div>
                    <div class="ribbon-group">
                        ${iconButton('btnUndo', '↶', this.tr('ribbon_undo', 'Undo'), this.tr('ribbon_undo_short', 'Undo'))}
                        ${iconButton('btnRedo', '↷', this.tr('ribbon_redo', 'Redo'), this.tr('ribbon_redo_short', 'Redo'))}
                    </div>
                    <div class="ribbon-group">
                        ${iconButton('btnAddText', 'T', this.tr('ribbon_add_text', 'Add text box'), this.tr('ribbon_text_short', 'Text'))}
                        ${iconButton('btnAddImage', '▧', this.tr('ribbon_insert_image', 'Insert image'), this.tr('ribbon_image_short', 'Image'))}
                        <input type="file" id="canvasImageUpload" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp" style="display:none;">
                        ${iconButton('btnAddRect', '▭', this.tr('ribbon_add_rectangle', 'Add rectangle'), this.tr('ribbon_rect_short', 'Box'))}
                        ${iconButton('btnAddLine', '╱', this.tr('ribbon_add_line', 'Add line'), this.tr('ribbon_line_short', 'Line'))}
                    </div>
                    <div class="ribbon-group">
                        ${iconButton('btnDuplicateBlock', '⧉', this.tr('ribbon_duplicate', 'Duplicate selected'), this.tr('ribbon_copy_short', 'Copy'))}
                        ${iconButton('btnDeleteBlock', '⌫', this.tr('ribbon_delete', 'Delete selected'), this.tr('ribbon_delete_short', 'Delete'))}
                        <button type="button" class="ribbon-btn icon-btn labeled-icon-btn ${block?.locked ? 'active' : ''}" id="btnLockBlock" title="${this.escapeAttr(this.tr('ribbon_lock', 'Lock or unlock selected'))}" aria-label="${this.escapeAttr(this.tr('ribbon_lock', 'Lock or unlock selected'))}"><span class="ribbon-btn-icon">${block?.locked ? '🔒' : '🔓'}</span><span class="ribbon-btn-label">${this.escapeHtml(this.tr('ribbon_lock_short', 'Lock'))}</span></button>
                    </div>
                    <div class="ribbon-group">
                        ${iconButton('btnBringForward', '⬆', this.tr('ribbon_bring_forward', 'Bring forward'), this.tr('ribbon_front_short', 'Front'))}
                        ${iconButton('btnSendBackward', '⬇', this.tr('ribbon_send_backward', 'Send backward'), this.tr('ribbon_back_short', 'Back'))}
                        ${alignButton('left', '⇤', this.tr('ribbon_align_left', 'Align page left'), this.tr('ribbon_left_short', 'Left'))}
                        ${alignButton('center', '↔', this.tr('ribbon_align_center', 'Align page center'), this.tr('ribbon_center_short', 'Center'))}
                        ${alignButton('right', '⇥', this.tr('ribbon_align_right', 'Align page right'), this.tr('ribbon_right_short', 'Right'))}
                        ${alignButton('top', '⇡', this.tr('ribbon_align_top', 'Align page top'), this.tr('ribbon_top_short', 'Top'))}
                        ${alignButton('middle', '↕', this.tr('ribbon_align_middle', 'Align page middle'), this.tr('ribbon_middle_short', 'Middle'))}
                        ${alignButton('bottom', '⇣', this.tr('ribbon_align_bottom', 'Align page bottom'), this.tr('ribbon_bottom_short', 'Bottom'))}
                    </div>
                    <div class="ribbon-group">
                        <button type="button" class="ribbon-btn icon-btn labeled-icon-btn" onclick="window.setTemplatePreviewZoom(-0.1)" title="${this.escapeAttr(this.tr('ribbon_zoom_out', 'Zoom out'))}" aria-label="${this.escapeAttr(this.tr('ribbon_zoom_out', 'Zoom out'))}"><span class="ribbon-btn-icon">⌕−</span><span class="ribbon-btn-label">${this.escapeHtml(this.tr('ribbon_out_short', 'Out'))}</span></button>
                        <span id="templateZoomLabel" class="ribbon-zoom-label">${Math.round((window.templatePreviewZoom || 1) * 100)}%</span>
                        <button type="button" class="ribbon-btn icon-btn labeled-icon-btn" onclick="window.setTemplatePreviewZoom(0.1)" title="${this.escapeAttr(this.tr('ribbon_zoom_in', 'Zoom in'))}" aria-label="${this.escapeAttr(this.tr('ribbon_zoom_in', 'Zoom in'))}"><span class="ribbon-btn-icon">⌕+</span><span class="ribbon-btn-label">${this.escapeHtml(this.tr('ribbon_in_short', 'In'))}</span></button>
                        <button type="button" class="ribbon-btn icon-btn labeled-icon-btn" onclick="window.fitTemplatePreviewToWidth()" title="${this.escapeAttr(this.tr('ribbon_fit_screen', 'Fit page to screen'))}" aria-label="${this.escapeAttr(this.tr('ribbon_fit_screen', 'Fit page to screen'))}"><span class="ribbon-btn-icon">⌕</span><span class="ribbon-btn-label">${this.escapeHtml(this.tr('ribbon_fit_short', 'Fit'))}</span></button>
                    </div>
                </div>
                <div class="ribbon-row ribbon-row-page">
                    <div class="ribbon-group ribbon-format-group ribbon-page">
                        <span class="ribbon-group-label">${this.escapeHtml(this.tr('ribbon_page', 'Page'))}</span>
                        <label>${this.escapeHtml(this.tr('ribbon_page_color', 'Page Color'))}<input type="color" id="backgroundColor" value="${this.settings.backgroundColor}"></label>
                        <div class="page-background-control">
                            <button type="button" class="ribbon-command page-background-btn ${hasPageBackground ? 'active' : ''}" id="btnPageBackground" title="${this.escapeAttr(this.tr('ribbon_page_background', 'Page Background'))}" aria-label="${this.escapeAttr(this.tr('ribbon_page_background', 'Page Background'))}">
                                ▧ <span>${this.escapeHtml(this.tr('ribbon_page_background', 'Page Background'))}</span>
                            </button>
                            <span class="page-background-label" title="${this.escapeAttr(pageBackgroundLabel)}">${this.escapeHtml(pageBackgroundLabel)}</span>
                            <div id="pageBackgroundMenu" class="page-background-menu" hidden>
                                <button type="button" data-bg-action="upload">${this.escapeHtml(this.tr('ribbon_upload_new_image', 'Upload new image'))}</button>
                                <button type="button" data-bg-action="clear" ${!hasPageBackground ? 'disabled' : ''}>${this.escapeHtml(this.tr('ribbon_clear_background', 'Clear background'))}</button>
                                <div id="pageBackgroundChoices" class="page-background-choices">
                                    <div class="empty-state">Open to load background images.</div>
                                </div>
                                <label>Fit
                                    <select id="pageBackgroundFit" ${!hasPageBackground ? 'disabled' : ''}>
                                        <option value="100" ${Math.round(pageBackground.size || 100) === 100 ? 'selected' : ''}>${this.escapeHtml(this.tr('ribbon_fit_page', 'Fit page'))}</option>
                                        <option value="140" ${Math.round(pageBackground.size || 100) === 140 ? 'selected' : ''}>${this.escapeHtml(this.tr('ribbon_fill_page', 'Fill page'))}</option>
                                        <option value="50" ${Math.round(pageBackground.size || 100) === 50 ? 'selected' : ''}>${this.escapeHtml(this.tr('ribbon_small', 'Small'))}</option>
                                    </select>
                                </label>
                                <label>Position
                                    <select id="pageBackgroundPosition" ${!hasPageBackground ? 'disabled' : ''}>
                                        ${['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].map(position => `<option value="${position}" ${pageBackground.position === position ? 'selected' : ''}>${this.escapeHtml(this.formatBackgroundPosition(position))}</option>`).join('')}
                                    </select>
                                </label>
                                <label>Opacity
                                    <input type="range" id="pageBackgroundOpacity" min="5" max="100" value="${Math.round((pageBackground.opacity ?? 0.25) * 100)}" ${!hasPageBackground ? 'disabled' : ''}>
                                </label>
                            </div>
                        </div>
                        <input type="file" id="backgroundImageUpload" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp" style="display:none;">
                    </div>
                    <div class="ribbon-group ribbon-page">
                        <label class="ribbon-check"><input type="checkbox" id="toggleGuides" ${this.settings.showGuides ? 'checked' : ''}> ${this.escapeHtml(this.tr('ribbon_guides', 'Guides'))}</label>
                        <label class="ribbon-check"><input type="checkbox" id="toggleSnap" ${this.settings.snapToGrid ? 'checked' : ''}> ${this.escapeHtml(this.tr('ribbon_snap', 'Snap'))}</label>
                    </div>
                </div>
            </div>
        `;
    }

    renderObjectPanel() {
        return `
            <section class="editor-panel">
                <div class="panel-title-row"><h2>Objects</h2></div>
                <div class="object-list">
                    ${this.settings.editorBlocks.map(block => `
                        <button type="button" class="object-row ${block.id === this.selectedBlockId ? 'active' : ''}" data-select-block="${this.escapeAttr(block.id)}">
                            <span class="object-type">${block.type === 'text' ? 'T' : block.type === 'date' ? 'D' : 'M'}</span>
                            <span>${this.escapeHtml(block.label)}</span>
                            <input type="checkbox" data-visible-block="${this.escapeAttr(block.id)}" ${block.visible ? 'checked' : ''}>
                        </button>
                    `).join('')}
                </div>
            </section>
        `;
    }

    renderInspector() {
        const block = this.getSelectedBlock();
        if (!block) return `<section class="editor-panel"><h2>Inspector</h2><p class="muted">Select an object.</p></section>`;
        const st = block.style || {};
        return `
            <section class="editor-panel inspector-panel">
                <div class="panel-title-row"><h2>Inspector</h2><span class="muted">${this.escapeHtml(block.label)}</span></div>
                <label>Label<input type="text" id="blockLabel" value="${this.escapeAttr(block.label)}"></label>
                ${block.type === 'text' ? `<p class="muted inspector-note">Edit this text directly on the page.</p>` : ''}
                <div class="field-grid">
                    <label>X<input type="number" id="blockX" min="0" max="100" value="${Math.round(block.x)}"></label>
                    <label>Y<input type="number" id="blockY" min="0" max="100" value="${Math.round(block.y)}"></label>
                    <label>W<input type="number" id="blockW" min="5" max="100" value="${Math.round(block.width)}"></label>
                    <label>H<input type="number" id="blockH" min="4" max="100" value="${Math.round(block.height)}"></label>
                </div>
                <label>Page color<input type="color" id="backgroundColor" value="${this.settings.backgroundColor}"></label>
                <label>Template layout
                    <select id="templateStyle">
                        <option value="compact" ${this.settings.templateStyle === 'compact' ? 'selected' : ''}>Compact</option>
                        <option value="detailed" ${this.settings.templateStyle === 'detailed' ? 'selected' : ''}>Detailed</option>
                        <option value="detailed-2col" ${this.settings.templateStyle === 'detailed-2col' ? 'selected' : ''}>Detailed, 2 columns</option>
                    </select>
                </label>
                <label class="check-row"><input type="checkbox" id="dayBorder" ${this.settings.dayBorder ? 'checked' : ''}> Day borders</label>
                <label>Day border color<input type="color" id="dayBorderColor" value="${this.settings.dayBorderColor}"></label>
                <label>Day background<input type="color" id="dayBackgroundColor" value="${this.settings.dayBackground && this.settings.dayBackground !== 'transparent' ? this.settings.dayBackground : '#ffffff'}"></label>
                <label class="check-row"><input type="checkbox" id="dayBgTransparent" ${!this.settings.dayBackground || this.settings.dayBackground === 'transparent' ? 'checked' : ''}> Transparent day background</label>
            </section>
        `;
    }

    renderTemplatesTab() {
        return `<section class="editor-panel"><h2>Saved Templates</h2><div id="templates-list" class="template-list"></div></section>`;
    }

    renderImagesTab() {
        return `
            <section class="editor-panel">
                <input type="file" id="imagesTabUpload" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp" style="display:none;">
                <div class="panel-title-row">
                    <h2>Images</h2>
                    <button id="btnUploadImageFromTab" class="btn btn-primary">Upload Background</button>
                </div>
                <div class="image-library-section">
                    <h3>Inserted Images</h3>
                    <div id="object-images-list" class="image-grid"></div>
                </div>
                <div class="image-library-section">
                    <h3>Background Images</h3>
                    <div id="bg-images-list" class="image-grid"></div>
                </div>
            </section>
        `;
    }

    bindTabControls() {
        document.querySelectorAll('.builder-tab-btn').forEach(btn => btn.addEventListener('click', e => this.switchTab(e.currentTarget.dataset.tab)));
    }

    async switchTab(tab) {
        this.currentTab = tab;
        this.applyTabVisibility();
        if (tab === 'templates') await this.loadTemplates();
        if (tab === 'images') await this.loadImages();
    }

    applyTabVisibility() {
        const tab = this.currentTab || 'builder';
        const sidebar = document.getElementById('template-sidebar');
        const layout = document.querySelector('.builder-layout');
        document.querySelectorAll('.builder-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
        if (sidebar) sidebar.classList.toggle('is-open', tab !== 'builder');
        if (layout) {
            layout.classList.toggle('is-editor-page', tab === 'builder');
            layout.classList.toggle('is-library-page', tab !== 'builder');
        }
    }

    bindEditorControls() {
        document.querySelectorAll('[data-select-block]').forEach(btn => {
            btn.addEventListener('click', e => {
                if (!e.target.matches('[data-visible-block]')) this.selectBlock(btn.dataset.selectBlock);
            });
        });
        document.querySelectorAll('[data-visible-block]').forEach(input => {
            input.addEventListener('change', e => {
                const block = this.getBlock(e.target.dataset.visibleBlock);
                if (!block) return;
                block.visible = e.target.checked;
                this.syncLegacySettings();
                this.recordChange();
            });
        });
        document.getElementById('btnUndo')?.addEventListener('click', () => this.undo());
        document.getElementById('btnRedo')?.addEventListener('click', () => this.redo());
        document.querySelectorAll('[data-style-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const block = this.getSelectedBlock();
                if (!block) return;
                block.style[btn.dataset.styleToggle] = !block.style[btn.dataset.styleToggle];
                this.syncLegacySettings();
                this.recordChange();
            });
        });
        document.querySelectorAll('[data-align]').forEach(btn => btn.addEventListener('click', () => this.updateSelectedStyle('align', btn.dataset.align)));
        document.querySelectorAll('[data-page-align]').forEach(btn => btn.addEventListener('click', () => this.alignSelectedBlock(btn.dataset.pageAlign)));
        document.getElementById('ribbonBlockSelect')?.addEventListener('change', e => this.selectBlock(e.target.value));
        document.getElementById('selectedBlockVisible')?.addEventListener('change', e => {
            const block = this.getSelectedBlock();
            if (!block) return;
            block.visible = e.target.checked;
            this.syncLegacySettings();
            this.recordChange();
        });
        document.getElementById('toggleHeader')?.addEventListener('change', e => this.toggleKnownBlock('header', e.target.checked));
        document.getElementById('toggleDate')?.addEventListener('change', e => this.toggleKnownBlock('date', e.target.checked));
        document.getElementById('toggleFooter')?.addEventListener('change', e => this.toggleKnownBlock('footer', e.target.checked));
        document.getElementById('blockLabel')?.addEventListener('input', e => { const block = this.getSelectedBlock(); if (block) { block.label = e.target.value; this.recordChange(false); } });
        [['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']].forEach(([suffix, key]) => {
            document.getElementById(`block${suffix}`)?.addEventListener('input', e => {
                const block = this.getSelectedBlock();
                if (!block) return;
                block[key] = this.clamp(parseFloat(e.target.value) || 0, suffix === 'W' ? 5 : suffix === 'H' ? 4 : 0, 100);
                this.syncLegacySettings();
                this.recordChange(false);
            });
        });
        document.getElementById('backgroundColor')?.addEventListener('input', e => { this.settings.backgroundColor = e.target.value; this.recordChange(false); });
        document.getElementById('templateStyle')?.addEventListener('change', e => { this.settings.templateStyle = e.target.value; this.recordChange(); });
        document.getElementById('dayBorder')?.addEventListener('change', e => { this.settings.dayBorder = e.target.checked; this.recordChange(); });
        document.getElementById('dayBorderColor')?.addEventListener('input', e => { this.settings.dayBorderColor = e.target.value; this.recordChange(false); });
        document.getElementById('dayBackgroundColor')?.addEventListener('input', e => { if (!document.getElementById('dayBgTransparent')?.checked) this.settings.dayBackground = e.target.value; this.recordChange(false); });
        document.getElementById('dayBgTransparent')?.addEventListener('change', e => { this.settings.dayBackground = e.target.checked ? 'transparent' : (document.getElementById('dayBackgroundColor')?.value || '#ffffff'); this.recordChange(); });
        document.getElementById('toggleGuides')?.addEventListener('change', e => { this.settings.showGuides = e.target.checked; this.recordChange(); });
        document.getElementById('toggleSnap')?.addEventListener('change', e => { this.settings.snapToGrid = e.target.checked; this.recordChange(false); });
        document.getElementById('dayTitleInput')?.addEventListener('input', e => {
            const block = this.getSelectedBlock();
            if (!block || block.type !== 'day') return;
            block.label = e.target.value;
            block.style.dayTitle = e.target.value;
            this.recordChange(false);
        });
        document.getElementById('dayTitleBold')?.addEventListener('click', () => {
            const block = this.getSelectedBlock();
            if (!block || block.type !== 'day') return;
            const next = (block.style.dayNameWeight || this.settings.dayNameWeight || 'bold') === 'bold' ? 'normal' : 'bold';
            this.updateDayHolderStyle('dayNameWeight', next);
        });
    }

    bindActionButtons() {
        this.bindBuilderFileMenu();
        document.getElementById('btnLoadData')?.addEventListener('click', () => this.loadRealData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click', () => this.reset());
        document.getElementById('btnAddText')?.addEventListener('click', () => this.addTextBlock());
        document.getElementById('btnAddImage')?.addEventListener('click', () => this.openInsertImageDialog());
        this.bindPageBackgroundControls();
        document.getElementById('btnAddRect')?.addEventListener('click', () => this.addShapeBlock('rectangle'));
        document.getElementById('btnAddLine')?.addEventListener('click', () => this.addShapeBlock('line'));
        document.getElementById('btnDuplicateBlock')?.addEventListener('click', () => this.duplicateSelectedBlock());
        document.getElementById('btnDeleteBlock')?.addEventListener('click', () => this.deleteSelectedBlock());
        document.getElementById('btnLockBlock')?.addEventListener('click', () => this.toggleSelectedLock());
        document.getElementById('btnBringForward')?.addEventListener('click', () => this.nudgeLayer(1));
        document.getElementById('btnSendBackward')?.addEventListener('click', () => this.nudgeLayer(-1));
        document.getElementById('btnLoadSavedTemplate')?.addEventListener('click', () => this.loadSelectedTemplate());
        document.getElementById('btnDeleteSavedTemplate')?.addEventListener('click', () => this.deleteSelectedTemplate());
        document.getElementById('canvasImageUpload')?.addEventListener('change', e => this.addImageBlockFromFile(e.target));
        document.getElementById('backgroundImageUpload')?.addEventListener('change', e => this.addBackgroundImageFromFile(e.target));
        this.bindImagesTabUpload();
    }

    bindBuilderFileMenu() {
        const menu = document.getElementById('builderFileMenu');
        const button = document.getElementById('btnBuilderFileMenu');
        if (this.builderFileMenuCloseHandler) document.removeEventListener('pointerdown', this.builderFileMenuCloseHandler);
        if (!menu || !button) return;

        const close = () => {
            menu.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        };

        button.addEventListener('click', event => {
            event.stopPropagation();
            const nextOpen = menu.hidden;
            menu.hidden = !nextOpen;
            button.setAttribute('aria-expanded', String(nextOpen));
        });

        menu.addEventListener('click', event => {
            if (event.target.closest('select')) return;
            if (event.target.closest('button')) close();
        });

        this.builderFileMenuCloseHandler = event => {
            if (!menu.hidden && !menu.contains(event.target) && event.target !== button && !button.contains(event.target)) close();
        };
        document.addEventListener('pointerdown', this.builderFileMenuCloseHandler);
    }

    bindPageBackgroundControls() {
        const menu = document.getElementById('pageBackgroundMenu');
        const button = document.getElementById('btnPageBackground');
        if (this.pageBackgroundCloseHandler) document.removeEventListener('pointerdown', this.pageBackgroundCloseHandler);
        this.pageBackgroundCloseHandler = () => {
            const currentMenu = document.getElementById('pageBackgroundMenu');
            if (currentMenu) currentMenu.hidden = true;
        };
        button?.addEventListener('pointerdown', event => {
            event.stopPropagation();
            if (menu) {
                menu.hidden = !menu.hidden;
                if (!menu.hidden) this.loadPageBackgroundMenuImages();
            }
        });
        menu?.addEventListener('pointerdown', event => event.stopPropagation());
        document.addEventListener('pointerdown', this.pageBackgroundCloseHandler);
        menu?.querySelector('[data-bg-action="upload"]')?.addEventListener('click', () => {
            menu.hidden = true;
            document.getElementById('backgroundImageUpload')?.click();
        });
        menu?.querySelector('[data-bg-action="clear"]')?.addEventListener('click', () => {
            menu.hidden = true;
            this.applyBackgroundImage(null, null);
        });
        document.getElementById('pageBackgroundFit')?.addEventListener('change', event => this.updatePageBackgroundLayer('size', parseInt(event.target.value, 10) || 100));
        document.getElementById('pageBackgroundPosition')?.addEventListener('change', event => this.updatePageBackgroundLayer('position', event.target.value));
        document.getElementById('pageBackgroundOpacity')?.addEventListener('input', event => this.updatePageBackgroundLayer('opacity', this.clamp((parseInt(event.target.value, 10) || 25) / 100, 0.05, 1), false));
    }

    async loadPageBackgroundMenuImages() {
        const container = document.getElementById('pageBackgroundChoices');
        if (!container) return;
        if (!window.dmsDesktop?.images?.list) {
            container.innerHTML = `<div class="empty-state">Background library is available in the desktop app.</div>`;
            return;
        }
        try {
            const images = await window.dmsDesktop.images.list('backgrounds');
            if (!images.length) {
                container.innerHTML = `<div class="empty-state">No saved background images.</div>`;
                return;
            }
            container.innerHTML = images.map(img => {
                const imageUrl = img.dataUrl || img.url || '';
                return `
                    <button type="button" class="page-background-choice" data-image-name="${this.escapeAttr(img.name)}" data-image-url="${this.escapeAttr(imageUrl)}">
                        ${imageUrl ? `<img src="${this.escapeAttr(imageUrl)}" alt="">` : '<span class="missing-image-preview">Missing file</span>'}
                        <span>${this.escapeHtml(img.name)}</span>
                    </button>
                `;
            }).join('');
            container.querySelectorAll('.page-background-choice').forEach(choice => {
                choice.addEventListener('click', () => {
                    this.applyBackgroundImage(choice.dataset.imageName, choice.dataset.imageUrl || null);
                });
            });
        } catch {
            container.innerHTML = `<div class="empty-state">Could not load background images.</div>`;
        }
    }

    updatePageBackgroundLayer(key, value, rebuild = true) {
        const layer = this.settings.backgroundImages[0];
        if (!layer || !layer.image) return;
        layer[key] = value;
        this.recordChange(rebuild);
    }

    formatBackgroundPosition(position) {
        return String(position || 'center').split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }

    selectBlock(id) {
        if (!this.getBlock(id)) return;
        this.selectedBlockId = id;
        this.buildUI();
        this.updatePreview();
    }

    getBlock(id) { return this.settings.editorBlocks.find(block => block.id === id); }
    getSelectedBlock() { return this.getBlock(this.selectedBlockId) || this.settings.editorBlocks[0]; }

    updateSelectedStyle(key, value, rebuild = true) {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.style[key] = value;
        this.syncLegacySettings();
        this.recordChange(rebuild);
    }

    updateDayHolderStyle(key, value, rebuild = true) {
        const block = this.getSelectedBlock();
        if (!block || block.type !== 'day') return;
        block.style[key] = value;
        this.syncLegacySettings();
        this.recordChange(rebuild);
    }

    applySelectedDayStyleToAllDays() {
        const source = this.getSelectedBlock();
        if (!source || source.type !== 'day') return;
        const style = source.style || {};
        const copiedKeys = [
            'fontFamily', 'fontSize', 'color', 'align', 'bold', 'italic', 'underline', 'lineHeight', 'backgroundColor',
            'dayNameFontFamily', 'dayNameSize', 'dayNameColor', 'dayNameWeight', 'dayBackground',
            'borderEnabled', 'borderColor', 'borderWidth', 'borderStyle',
            'dayBorderEnabled', 'dayBorderColor', 'dayBorderWidth', 'dayBorderStyle'
        ];

        this.settings.editorBlocks
            .filter(block => block.type === 'day' && block.id !== source.id)
            .forEach(block => {
                block.style = block.style || {};
                copiedKeys.forEach(key => {
                    if (style[key] !== undefined) block.style[key] = style[key];
                });
            });

        this.syncLegacySettings();
        this.recordChange();
    }

    getBlockBorderSettings(block) {
        const style = block?.style || {};
        if (!block) return { enabled: false, color: '#d8dee5', width: 1 };
        if (block.type === 'day') {
            const width = parseInt(style.borderWidth || style.dayBorderWidth || this.settings.dayBorderThickness || '1px', 10) || 1;
            return {
                enabled: style.borderEnabled ?? style.dayBorderEnabled ?? this.settings.dayBorder ?? false,
                color: style.borderColor || style.dayBorderColor || this.settings.dayBorderColor || '#d8dee5',
                width
            };
        }
        if (block.type === 'shape') {
            const width = parseInt(style.borderWidth ?? style.strokeWidth ?? 1, 10) || 0;
            return {
                enabled: style.borderEnabled ?? width > 0,
                color: style.borderColor || style.stroke || '#1f2933',
                width
            };
        }
        const width = parseInt(style.borderWidth ?? 0, 10) || 0;
        return {
            enabled: style.borderEnabled ?? width > 0,
            color: style.borderColor || '#d8dee5',
            width
        };
    }

    updateSelectedBorder(key, value, rebuild = true) {
        const block = this.getSelectedBlock();
        if (!block) return;
        const style = block.style || (block.style = {});
        const current = this.getBlockBorderSettings(block);
        const next = {
            enabled: key === 'enabled' ? value : current.enabled,
            color: key === 'color' ? value : current.color,
            width: key === 'width' ? value : current.width
        };

        style.borderEnabled = !!next.enabled;
        style.borderColor = next.color;
        style.borderWidth = next.width;
        style.borderStyle = 'solid';

        if (block.type === 'day') {
            style.dayBorderEnabled = !!next.enabled;
            style.dayBorderColor = next.color;
            style.dayBorderWidth = `${next.width}px`;
            style.dayBorderStyle = 'solid';
        } else if (block.type === 'shape') {
            style.stroke = next.color;
            style.strokeWidth = next.enabled ? next.width : 0;
        }

        this.syncLegacySettings();
        this.recordChange(rebuild);
    }

    bindFloatingPanelControls() {
        const panel = document.querySelector('[data-floating-panel]');
        if (!panel) return;
        panel.addEventListener('pointerdown', event => event.stopPropagation());
        panel.addEventListener('click', event => event.stopPropagation());

        document.getElementById('floatFont')?.addEventListener('change', e => this.updateSelectedStyle('fontFamily', e.target.value));
        document.getElementById('floatSize')?.addEventListener('input', e => this.updateSelectedStyle('fontSize', parseInt(e.target.value, 10) || 12, false));
        document.getElementById('floatColor')?.addEventListener('input', e => this.updateSelectedStyle('color', e.target.value, false));
        document.querySelectorAll('[data-float-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const block = this.getSelectedBlock();
                if (!block) return;
                block.style[btn.dataset.floatToggle] = !block.style[btn.dataset.floatToggle];
                this.syncLegacySettings();
                this.recordChange();
            });
        });
        document.querySelectorAll('[data-float-align]').forEach(btn => btn.addEventListener('click', () => this.updateSelectedStyle('align', btn.dataset.floatAlign)));

        document.getElementById('floatDayTitleSize')?.addEventListener('input', e => this.updateDayHolderStyle('dayNameSize', parseInt(e.target.value, 10) || 14, false));
        document.getElementById('floatDayTitleColor')?.addEventListener('input', e => this.updateDayHolderStyle('dayNameColor', e.target.value, false));
        document.getElementById('floatDayFill')?.addEventListener('input', e => this.updateDayHolderStyle('dayBackground', e.target.value, false));
        document.getElementById('floatApplyDayStyle')?.addEventListener('click', () => this.applySelectedDayStyleToAllDays());

        document.getElementById('floatImageFit')?.addEventListener('change', e => this.updateSelectedStyle('fit', e.target.value));
        document.getElementById('floatImageOpacity')?.addEventListener('input', e => this.updateSelectedStyle('opacity', this.clamp((parseInt(e.target.value, 10) || 100) / 100, 0.1, 1), false));
        document.getElementById('floatShapeFill')?.addEventListener('input', e => this.updateSelectedStyle('fill', e.target.value, false));

        document.getElementById('floatBorderEnabled')?.addEventListener('change', e => this.updateSelectedBorder('enabled', e.target.checked));
        document.getElementById('floatBorderColor')?.addEventListener('input', e => this.updateSelectedBorder('color', e.target.value, false));
        document.getElementById('floatBorderWidth')?.addEventListener('input', e => this.updateSelectedBorder('width', parseInt(e.target.value, 10) || 0, false));
    }

    toggleKnownBlock(id, visible) {
        const block = this.getBlock(id);
        if (!block) return;
        block.visible = visible;
        this.syncLegacySettings();
        this.recordChange();
    }

    addTextBlock() {
        const id = `text-${Date.now()}`;
        this.settings.editorBlocks.push(this.createBlock(id, 'text', 'Text Box', 18, 20, 40, 8, { html: 'New text', fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#222222', align: 'left', bold: false, italic: false, underline: false }));
        this.selectedBlockId = id;
        this.recordChange();
    }

    async addImageBlockFromFile(input) {
        const file = input?.files?.[0];
        if (!file) return;
        if (!this.isAllowedImageFile(file)) {
            await window.dmsAlert(window.t('alert_invalid_image_format') || 'Unsupported image format.', { title: window.t('dialog_error_title') });
            input.value = '';
            return;
        }
        const dataUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
        input.value = '';
        if (!dataUrl) return;
        const id = `image-${Date.now()}`;
        let saved = null;
        if (window.dmsDesktop?.images?.save) {
            saved = await window.dmsDesktop.images.save('template-objects', { name: file.name, mimeType: file.type, dataUrl });
        }
        const block = this.createBlock(id, 'image', 'Image', 22, 22, 28, 18, {
            src: saved?.relativePath || dataUrl,
            imageData: dataUrl,
            imageFolder: 'template-objects',
            imageName: saved?.name || file.name,
            relativePath: saved?.relativePath || null,
            fit: 'contain',
            opacity: 1,
            backgroundColor: 'transparent'
        });
        block.zIndex = this.nextZIndex();
        this.settings.editorBlocks.push(block);
        this.selectedBlockId = id;
        this.recordChange();
    }

    async openInsertImageDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'editor-dialog-overlay';
        overlay.innerHTML = `
            <div class="editor-dialog image-picker-dialog">
                <h2>Insert Image</h2>
                <div class="dialog-actions image-choice-actions">
                    <button id="image-choice-upload" class="btn btn-primary" type="button">Upload New Image</button>
                    <button id="image-choice-cancel" class="btn btn-secondary" type="button">Cancel</button>
                </div>
                <h3>Use Existing Image</h3>
                <div id="insert-image-library" class="image-grid image-picker-grid">
                    <div class="empty-state">Loading images...</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#image-choice-cancel')?.addEventListener('click', close);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        overlay.querySelector('#image-choice-upload')?.addEventListener('click', () => {
            close();
            document.getElementById('canvasImageUpload')?.click();
        });

        await this.loadInsertImageLibrary(overlay);
    }

    async loadInsertImageLibrary(overlay) {
        const container = overlay.querySelector('#insert-image-library');
        if (!container) return;
        if (!window.dmsDesktop?.images?.list) {
            container.innerHTML = `<div class="empty-state">Image library is available in the desktop app.</div>`;
            return;
        }
        try {
            const images = await window.dmsDesktop.images.list('template-objects');
            if (!images.length) {
                container.innerHTML = `<div class="empty-state">No inserted images yet.</div>`;
                return;
            }
            container.innerHTML = images.map(img => `<button type="button" class="image-card" data-image-name="${this.escapeAttr(img.name)}" data-image-url="${this.escapeAttr(img.dataUrl || img.url || '')}"><img src="${img.dataUrl || img.url}" alt=""><span>${this.escapeHtml(img.name)}</span></button>`).join('');
            container.querySelectorAll('.image-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.addImageBlockFromLibrary(card.dataset.imageName, 'template-objects', card.dataset.imageUrl);
                    overlay.remove();
                });
            });
        } catch {
            container.innerHTML = `<div class="empty-state">Could not load image library.</div>`;
        }
    }

    async openBackgroundImageDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'editor-dialog-overlay';
        overlay.innerHTML = `
            <div class="editor-dialog image-picker-dialog">
                <h2>Background Image</h2>
                <div class="dialog-actions image-choice-actions">
                    <button id="background-choice-upload" class="btn btn-primary" type="button">Upload New Background</button>
                    <button id="background-choice-clear" class="btn btn-secondary" type="button">Clear Background</button>
                    <button id="background-choice-cancel" class="btn btn-secondary" type="button">Cancel</button>
                </div>
                <h3>Use Existing Background</h3>
                <div id="background-image-library" class="image-grid image-picker-grid">
                    <div class="empty-state">Loading images...</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#background-choice-cancel')?.addEventListener('click', close);
        overlay.querySelector('#background-choice-clear')?.addEventListener('click', () => {
            this.applyBackgroundImage(null, null);
            close();
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        overlay.querySelector('#background-choice-upload')?.addEventListener('click', () => {
            close();
            document.getElementById('backgroundImageUpload')?.click();
        });

        await this.loadBackgroundImageLibrary(overlay);
    }

    async loadBackgroundImageLibrary(overlay) {
        const container = overlay.querySelector('#background-image-library');
        if (!container) return;
        if (!window.dmsDesktop?.images?.list) {
            container.innerHTML = `<div class="empty-state">Background library is available in the desktop app.</div>`;
            return;
        }
        try {
            const images = await window.dmsDesktop.images.list('backgrounds');
            if (!images.length) {
                container.innerHTML = `<div class="empty-state">No background images yet.</div>`;
                return;
            }
            container.innerHTML = images.map(img => {
                const imageUrl = img.dataUrl || img.url || '';
                return `
                    <button type="button" class="image-card" data-image-name="${this.escapeAttr(img.name)}" data-image-url="${this.escapeAttr(imageUrl)}">
                        ${imageUrl ? `<img src="${this.escapeAttr(imageUrl)}" alt="">` : '<div class="missing-image-preview">Missing file</div>'}
                        <span>${this.escapeHtml(img.name)}</span>
                    </button>
                `;
            }).join('');
            container.querySelectorAll('.image-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.applyBackgroundImage(card.dataset.imageName, card.dataset.imageUrl || null);
                    overlay.remove();
                });
            });
        } catch {
            container.innerHTML = `<div class="empty-state">Could not load background images.</div>`;
        }
    }

    async addBackgroundImageFromFile(input) {
        const file = input?.files?.[0];
        if (!file) return;
        if (!this.isAllowedImageFile(file)) {
            await window.dmsAlert(window.t('alert_invalid_image_format') || 'Unsupported image format.', { title: window.t('dialog_error_title') });
            input.value = '';
            return;
        }
        const dataUrl = await this.readImageFile(file);
        input.value = '';
        if (!dataUrl) return;
        let imageName = file.name;
        if (window.dmsDesktop?.images?.save) {
            const saved = await window.dmsDesktop.images.save('backgrounds', { name: file.name, mimeType: file.type, dataUrl });
            imageName = saved?.name || imageName;
        }
        this.applyBackgroundImage(imageName, dataUrl);
        if (this.currentTab === 'images') await this.loadImages();
    }

    applyBackgroundImage(name, dataUrl) {
        const layer = this.settings.backgroundImages[0];
        layer.image = name;
        layer.imageData = dataUrl || null;
        layer.size = name ? 100 : layer.size;
        layer.opacity = name ? 0.25 : layer.opacity;
        this.switchTab('builder');
        this.recordChange();
    }

    addShapeBlock(kind) {
        const id = `${kind}-${Date.now()}`;
        const isLine = kind === 'line';
        const block = this.createBlock(id, 'shape', isLine ? 'Line' : 'Rectangle', 20, 30, isLine ? 42 : 26, isLine ? 2 : 16, {
            kind,
            fill: isLine ? '#1f2933' : '#f8f9fb',
            stroke: '#1f2933',
            strokeWidth: isLine ? 0 : 1,
            opacity: 1
        });
        block.zIndex = this.nextZIndex();
        this.settings.editorBlocks.push(block);
        this.selectedBlockId = id;
        this.recordChange();
    }

    duplicateSelectedBlock() {
        const block = this.getSelectedBlock();
        if (!block) return;
        const clone = JSON.parse(JSON.stringify(block));
        clone.id = `${block.id}-${Date.now()}`;
        clone.label = `${block.label} Copy`;
        clone.x = this.clamp(clone.x + 4, 0, 95);
        clone.y = this.clamp(clone.y + 4, 0, 95);
        this.settings.editorBlocks.push(clone);
        this.selectedBlockId = clone.id;
        this.recordChange();
    }

    deleteSelectedBlock() {
        const block = this.getSelectedBlock();
        if (!block) return;
        if (['header', 'date', 'footer'].includes(block.id) || block.type === 'day') block.visible = false;
        else this.settings.editorBlocks = this.settings.editorBlocks.filter(item => item.id !== block.id);
        this.selectedBlockId = this.settings.editorBlocks[0]?.id || 'header';
        this.syncLegacySettings();
        this.recordChange();
    }

    async loadSelectedTemplate() {
        const name = document.getElementById('savedTemplateSelect')?.value;
        if (name) await this.loadTemplate(name);
    }

    async deleteSelectedTemplate() {
        const name = document.getElementById('savedTemplateSelect')?.value;
        if (name) await this.deleteTemplate(name);
        this.buildUI();
    }

    toggleSelectedLock() {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.locked = !block.locked;
        this.recordChange();
    }

    nudgeLayer(direction) {
        const block = this.getSelectedBlock();
        if (!block) return;
        block.zIndex = this.clamp((block.zIndex || 30) + direction, 21, 99);
        this.recordChange();
    }

    nextZIndex() {
        return Math.max(30, ...this.settings.editorBlocks.map(block => block.zIndex || 30)) + 1;
    }

    alignSelectedBlock(alignment) {
        const block = this.getSelectedBlock();
        if (!block || block.locked) return;
        if (alignment === 'left') block.x = 0;
        if (alignment === 'center') block.x = (100 - block.width) / 2;
        if (alignment === 'right') block.x = 100 - block.width;
        if (alignment === 'top') block.y = 0;
        if (alignment === 'middle') block.y = (100 - block.height) / 2;
        if (alignment === 'bottom') block.y = 100 - block.height;
        this.syncLegacySettings();
        this.recordChange();
    }

    clearSelectedFormatting() {
        const block = this.getSelectedBlock();
        if (!block || block.type !== 'text') return;
        block.style = {
            ...block.style,
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            color: '#222222',
            align: 'left',
            bold: false,
            italic: false,
            underline: false,
            lineHeight: 1.2,
            backgroundColor: 'transparent'
        };
        this.syncLegacySettings();
        this.recordChange();
    }

    recordChange(rebuild = true) {
        this.updatePreview();
        this.pushHistory();
        if (rebuild) this.buildUI();
    }

    recordCanvasChange() {
        this.syncLegacySettings();
        this.updatePreview();
        this.pushHistory();
    }

    pushHistory() {
        const snapshot = JSON.stringify(this.settings);
        if (this.history[this.historyIndex] === snapshot) return;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(snapshot);
        this.historyIndex = this.history.length - 1;
        if (this.history.length > 60) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex <= 0) return;
        this.historyIndex--;
        this.settings = JSON.parse(this.history[this.historyIndex]);
        this.ensureEditorBlocks();
        this.buildUI();
        this.updatePreview();
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        this.historyIndex++;
        this.settings = JSON.parse(this.history[this.historyIndex]);
        this.ensureEditorBlocks();
        this.buildUI();
        this.updatePreview();
    }

    ensureEditorBlocks() {
        if (!Array.isArray(this.settings.editorBlocks) || !this.settings.editorBlocks.length) {
            this.settings.editorBlocks = this.getDefaultSettings().editorBlocks;
            this.syncBlocksFromLegacy();
        }
        this.ensureDayBlocks();
        this.syncLegacySettings();
    }

    ensureDayBlocks() {
        const oldMenu = this.getBlock('menu');
        const dayBlocks = this.settings.editorBlocks.filter(block => block.type === 'day');
        if (dayBlocks.length >= 5) return;

        const source = oldMenu || { x: 7, y: 24, width: 86, height: 54, zIndex: 30, style: {} };
        const gap = 1.4;
        const dayHeight = Math.max(8, ((source.height || 54) - (gap * 4)) / 5);
        const existingIds = new Set(this.settings.editorBlocks.map(block => block.id));
        const labels = this.weekdayBlockLabels();
        labels.forEach((label, index) => {
            if (existingIds.has(`day-${index}`)) return;
            const block = this.createBlock(`day-${index}`, 'day', label, source.x || 7, (source.y || 24) + (index * (dayHeight + gap)), source.width || 86, dayHeight, {
                ...(source.style || {}),
                dayIndex: index,
                fontFamily: source.style?.fontFamily || this.settings.mealFontFamily || 'Arial, sans-serif',
                fontSize: source.style?.fontSize || this.settings.mealFontSize || 11,
                color: source.style?.color || '#222222',
                align: source.style?.align || 'left',
                lineHeight: source.style?.lineHeight || 1.2,
                backgroundColor: source.style?.backgroundColor || 'transparent'
            });
            block.zIndex = (source.zIndex || 30) + index;
            block.visible = source.visible !== false;
            this.settings.editorBlocks.push(block);
        });
        if (oldMenu) oldMenu.visible = false;
    }

    syncBlocksFromLegacy() {
        const header = this.getBlock('header');
        const date = this.getBlock('date');
        const footer = this.getBlock('footer');
        this.settings.editorBlocks.forEach((block, index) => {
            if (!block.zIndex) block.zIndex = 30 + index;
            if (!block.style) block.style = {};
        });
        if (header) Object.assign(header, { visible: this.settings.showHeader, style: { ...header.style, html: this.settings.headerText, fontFamily: this.settings.headerFontFamily, fontSize: this.settings.headerFontSize, color: this.settings.headerColor, align: this.settings.headerAlignment } });
        if (date) Object.assign(date, { visible: this.settings.showDateRange, style: { ...date.style, fontFamily: this.settings.dateFontFamily, fontSize: this.settings.dateFontSize, color: this.settings.dateColor, align: this.settings.dateAlignment } });
        if (footer) Object.assign(footer, { visible: this.settings.showFooter, style: { ...footer.style, html: this.settings.footerText, fontFamily: this.settings.footerFontFamily, fontSize: this.settings.footerFontSize, align: this.settings.footerAlignment } });
        this.settings.editorBlocks.filter(block => block.type === 'day').forEach(block => {
            Object.assign(block.style, {
                dayTitle: block.style.dayTitle || block.label,
                dayNameFontFamily: block.style.dayNameFontFamily || this.settings.dayNameFontFamily,
                dayNameSize: block.style.dayNameSize || this.settings.dayNameSize,
                dayNameColor: block.style.dayNameColor || this.settings.dayNameColor,
                dayNameWeight: block.style.dayNameWeight || this.settings.dayNameWeight,
                dayBackground: block.style.dayBackground ?? this.settings.dayBackground,
                dayBorderEnabled: block.style.dayBorderEnabled ?? this.settings.dayBorder,
                dayBorderColor: block.style.dayBorderColor || this.settings.dayBorderColor,
                dayBorderWidth: block.style.dayBorderWidth || this.settings.dayBorderThickness,
                dayBorderStyle: block.style.dayBorderStyle || this.settings.dayBorderStyle,
                fontFamily: block.style.fontFamily || this.settings.mealFontFamily,
                fontSize: block.style.fontSize || this.settings.mealFontSize
            });
        });
    }

    syncLegacySettings() {
        const header = this.getBlock('header');
        const date = this.getBlock('date');
        const footer = this.getBlock('footer');
        if (header) {
            this.settings.showHeader = header.visible;
            this.settings.headerText = header.style.html || '';
            this.settings.headerFontFamily = header.style.fontFamily || 'Arial, sans-serif';
            this.settings.headerFontSize = header.style.fontSize || 24;
            this.settings.headerColor = header.style.color || '#d2691e';
            this.settings.headerAlignment = header.style.align || 'center';
        }
        if (date) {
            this.settings.showDateRange = date.visible;
            this.settings.dateFontFamily = date.style.fontFamily || 'Arial, sans-serif';
            this.settings.dateFontSize = date.style.fontSize || 12;
            this.settings.dateColor = date.style.color || '#666666';
            this.settings.dateAlignment = date.style.align || 'center';
        }
        if (footer) {
            this.settings.showFooter = footer.visible;
            this.settings.footerText = footer.style.html || '';
            this.settings.footerFontFamily = footer.style.fontFamily || 'Arial, sans-serif';
            this.settings.footerFontSize = footer.style.fontSize || 9;
            this.settings.footerAlignment = footer.style.align || 'center';
        }
        const day = this.settings.editorBlocks.find(block => block.type === 'day');
        if (day) {
            this.settings.mealFontFamily = day.style.fontFamily || 'Arial, sans-serif';
            this.settings.mealFontSize = day.style.fontSize || 11;
        }
    }

    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        container.innerHTML = `
            <div class="designer-stage">
                <div class="designer-page" style="background:${this.settings.backgroundColor};">
                    ${this.renderBackgroundLayers()}
                    ${this.settings.showGuides ? '<div class="page-guides"></div>' : ''}
                    ${this.settings.editorBlocks.filter(block => block.visible).sort((a, b) => (a.zIndex || 30) - (b.zIndex || 30)).map(block => this.renderEditableBlock(block)).join('')}
                </div>
                ${this.renderFloatingPanel()}
            </div>
        `;
        this.fitPreviewDayBlocks(container);
        this.bindCanvasInteractions();
        this.bindFloatingPanelControls();
        if (window.templatePreviewZoomMode === 'fit' && typeof window.fitTemplatePreviewToWidth === 'function') window.fitTemplatePreviewToWidth();
        else if (typeof window.applyTemplatePreviewZoom === 'function') window.applyTemplatePreviewZoom();
    }

    fitPreviewDayBlocks(container) {
        container.querySelectorAll('.editable-block .editor-day-card.single-day').forEach(card => {
            const availableHeight = card.clientHeight;
            const contentHeight = card.scrollHeight;
            if (!availableHeight || contentHeight <= availableHeight) return;
            const scale = Math.max(0.35, Math.min(1, availableHeight / contentHeight));
            card.style.transform = `scale(${scale.toFixed(4)})`;
            card.style.transformOrigin = 'top left';
            card.style.width = `${(100 / scale).toFixed(4)}%`;
            card.style.height = `${(100 / scale).toFixed(4)}%`;
        });
    }

    renderEditableBlock(block) {
        const st = block.style || {};
        const bg = st.backgroundColor && st.backgroundColor !== 'transparent' ? `background:${st.backgroundColor};` : '';
        const border = this.getBlockOuterBorderCss(block);
        const common = `left:${block.x}%;top:${block.y}%;width:${block.width}%;height:${block.height}%;z-index:${block.zIndex || 30};font-family:${st.fontFamily || 'Arial, sans-serif'};font-size:${st.fontSize || 12}pt;color:${st.color || '#222'};text-align:${st.align || 'left'};font-weight:${st.bold ? '700' : '400'};font-style:${st.italic ? 'italic' : 'normal'};text-decoration:${st.underline ? 'underline' : 'none'};line-height:${st.lineHeight || 1.2};${bg}${border}`;
        const editable = block.type === 'text' ? 'contenteditable="true" spellcheck="true" data-edit-block="' + this.escapeAttr(block.id) + '"' : '';
        return `
            <div class="editable-block ${block.id === this.selectedBlockId ? 'selected' : ''} ${block.locked ? 'locked' : ''}" data-block-id="${this.escapeAttr(block.id)}" style="${common}">
                <div class="block-label">${this.escapeHtml(block.label)}${block.locked ? ' / locked' : ''}</div>
                <div class="block-content" ${editable}>${this.renderBlockContent(block)}</div>
                <span class="resize-handle" data-resize-block="${this.escapeAttr(block.id)}"></span>
            </div>
        `;
    }

    getBlockOuterBorderCss(block) {
        if (!block || block.type === 'day' || block.type === 'shape') return '';
        const border = this.getBlockBorderSettings(block);
        if (!border.enabled || border.width <= 0) return '';
        return `border:${border.width}px solid ${border.color};`;
    }

    renderBlockContent(block) {
        if (block.type === 'date') return this.getDateRangeText();
        if (block.type === 'menu') return this.renderMenuContent(block);
        if (block.type === 'day') return this.renderDayContent(block);
        if (block.type === 'image') return `<img class="canvas-image" src="${this.escapeAttr(block.style?.imageData || block.style?.src || '')}" alt="" style="object-fit:${block.style?.fit || 'contain'};opacity:${block.style?.opacity ?? 1};">`;
        if (block.type === 'shape') {
            const border = this.getBlockBorderSettings(block);
            const borderCss = border.enabled && border.width > 0 ? `${border.width}px solid ${border.color}` : '0';
            return `<div class="canvas-shape ${block.style?.kind === 'line' ? 'line' : 'rectangle'}" style="background:${block.style?.fill || '#f8f9fb'};border:${borderCss};opacity:${block.style?.opacity ?? 1};"></div>`;
        }
        return block.style?.html || '';
    }

    renderFloatingPanel() {
        const block = this.getSelectedBlock();
        if (!block || block.visible === false) return '';
        const st = block.style || {};
        const fonts = this._fonts();
        const canTextStyle = !['image', 'shape'].includes(block.type);
        const isDayBlock = block.type === 'day';
        const border = this.getBlockBorderSettings(block);
        const textControls = canTextStyle ? `
            <div class="floating-control-row">
                <select id="floatFont" title="Font">${fonts.map(f => `<option value="${this.escapeAttr(f.value)}" ${st.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}</select>
                <input id="floatSize" type="number" min="6" max="120" value="${st.fontSize || 12}" title="Size">
                <input id="floatColor" type="color" value="${st.color || '#222222'}" title="Text color">
            </div>
            <div class="floating-control-row">
                <button type="button" class="ribbon-btn icon-btn ${st.bold ? 'active' : ''}" data-float-toggle="bold" title="Bold"><b>B</b></button>
                <button type="button" class="ribbon-btn icon-btn ${st.italic ? 'active' : ''}" data-float-toggle="italic" title="Italic"><i>I</i></button>
                <button type="button" class="ribbon-btn icon-btn ${st.underline ? 'active' : ''}" data-float-toggle="underline" title="Underline"><u>U</u></button>
                ${['left', 'center', 'right'].map(a => `<button type="button" class="ribbon-btn icon-btn ${st.align === a ? 'active' : ''}" data-float-align="${a}" title="Align ${a}">${a === 'left' ? '≡' : a === 'center' ? '☰' : '≣'}</button>`).join('')}
            </div>
        ` : '';
        const dayControls = isDayBlock ? `
            <div class="floating-section">
                <strong>${this.escapeHtml(this.tr('ribbon_day_style', 'Day'))}</strong>
                <div class="floating-control-row">
                    <label>${this.escapeHtml(this.tr('ribbon_title_size', 'Title Size'))}<input type="number" id="floatDayTitleSize" min="6" max="72" value="${st.dayNameSize || this.settings.dayNameSize || 14}"></label>
                    <label>${this.escapeHtml(this.tr('ribbon_title_color', 'Title Color'))}<input id="floatDayTitleColor" type="color" value="${st.dayNameColor || this.settings.dayNameColor || '#d2691e'}"></label>
                    <label>${this.escapeHtml(this.tr('ribbon_fill', 'Fill'))}<input id="floatDayFill" type="color" value="${st.dayBackground && st.dayBackground !== 'transparent' ? st.dayBackground : '#ffffff'}"></label>
                </div>
                <button type="button" class="floating-apply-btn" id="floatApplyDayStyle">${this.escapeHtml(this.tr('ribbon_apply_all_days', 'Apply to all days'))}</button>
            </div>
        ` : '';
        const imageControls = block.type === 'image' ? `
            <div class="floating-section">
                <strong>${this.escapeHtml(this.tr('ribbon_image', 'Image'))}</strong>
                <div class="floating-control-row">
                    <label>${this.escapeHtml(this.tr('ribbon_fit', 'Fit'))}<select id="floatImageFit">
                        <option value="contain" ${st.fit === 'contain' ? 'selected' : ''}>Fit</option>
                        <option value="cover" ${st.fit === 'cover' ? 'selected' : ''}>Fill</option>
                        <option value="fill" ${st.fit === 'fill' ? 'selected' : ''}>Stretch</option>
                    </select></label>
                    <label>${this.escapeHtml(this.tr('ribbon_opacity', 'Opacity'))}<input type="number" id="floatImageOpacity" min="10" max="100" value="${Math.round((st.opacity ?? 1) * 100)}"></label>
                </div>
            </div>
        ` : '';
        const shapeControls = block.type === 'shape' ? `
            <div class="floating-section">
                <strong>${this.escapeHtml(this.tr('ribbon_shape', 'Shape'))}</strong>
                <div class="floating-control-row">
                    <label>${this.escapeHtml(this.tr('ribbon_shape_fill', 'Shape Fill'))}<input id="floatShapeFill" type="color" value="${st.fill || '#f8f9fb'}"></label>
                </div>
            </div>
        ` : '';
        return `
            <div class="floating-object-panel" data-floating-panel>
                <div class="floating-panel-title">${this.escapeHtml(block.label || this.tr('ribbon_object', 'Object'))}</div>
                ${textControls}
                ${dayControls}
                ${imageControls}
                ${shapeControls}
                <div class="floating-section">
                    <strong>${this.escapeHtml(this.tr('ribbon_border', 'Border'))}</strong>
                    <div class="floating-control-row">
                        <label class="ribbon-check"><input type="checkbox" id="floatBorderEnabled" ${border.enabled ? 'checked' : ''}> ${this.escapeHtml(this.tr('ribbon_border', 'Border'))}</label>
                        <label>${this.escapeHtml(this.tr('ribbon_color', 'Color'))}<input id="floatBorderColor" type="color" value="${border.color}"></label>
                        <label>${this.escapeHtml(this.tr('ribbon_width', 'Width'))}<input id="floatBorderWidth" type="number" min="0" max="20" value="${border.width}"></label>
                    </div>
                </div>
            </div>
        `;
    }

    renderMenuContent(block) {
        const s = this.settings;
        const columns = s.templateStyle === 'detailed-2col' || block.style?.columns === 2 ? 'two' : 'one';
        return `<div class="editor-menu-days ${columns}">
            ${(this.previewData?.days || []).map(day => `
                <section class="editor-day-card" style="${s.dayBorder ? `border:${s.dayBorderThickness} ${s.dayBorderStyle} ${s.dayBorderColor};` : ''}${s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : ''}">
                    <h3 style="font-family:${s.dayNameFontFamily};font-size:${s.dayNameSize}pt;color:${s.dayNameColor};font-weight:${s.dayNameWeight};">${this.escapeHtml(day.name)}</h3>
                    ${day.meals.map(meal => this.renderMealLine(meal)).join('')}
                </section>
            `).join('')}
        </div>`;
    }

    renderDayContent(block) {
        const s = this.settings;
        const day = this.previewData?.days?.[block.style?.dayIndex || 0];
        if (!day) return '';
        const st = block.style || {};
        const title = st.dayTitle || block.label || day.name;
        const borderSettings = this.getBlockBorderSettings(block);
        const border = borderSettings.enabled && borderSettings.width > 0 ? `border:${borderSettings.width}px solid ${borderSettings.color};` : '';
        const dayBackground = st.dayBackground ?? s.dayBackground;
        const bg = dayBackground && dayBackground !== 'transparent' ? `background:${dayBackground};` : '';
        const titleFont = st.dayNameFontFamily || s.dayNameFontFamily || 'Arial, sans-serif';
        const titleSize = st.dayNameSize || s.dayNameSize || 14;
        const titleColor = st.dayNameColor || s.dayNameColor || '#d2691e';
        const titleWeight = st.dayNameWeight || s.dayNameWeight || 'bold';
        return `
            <section class="editor-day-card single-day" style="${border}${bg}">
                <h3 style="font-family:${titleFont};font-size:${titleSize}pt;color:${titleColor};font-weight:${titleWeight};">${this.escapeHtml(title)}</h3>
                ${day.meals.map(meal => this.renderMealLine(meal)).join('')}
            </section>
        `;
    }

    renderMealLine(meal) {
        let text = `${meal.number}. ${this.escapeHtml(meal.name)}`;
        if (this.settings.showPortions && meal.portion) text += ` - ${this.escapeHtml(meal.portion)}`;
        const ingredients = this.settings.showIngredients && meal.ingredients?.length ? `<span class="meal-ingredients">${meal.ingredients.map(ing => this.formatIngredient(ing)).join(', ')}</span>` : '';
        const calories = this.settings.showCalories && meal.calories ? `<span class="meal-calories">KKAL ${meal.calories}</span>` : '';
        return `<p class="meal-line"><strong>${text}</strong>${ingredients ? `<br>${ingredients}` : ''}${calories ? ` ${calories}` : ''}</p>`;
    }

    formatIngredient(ing) {
        if (!ing.hasAllergen) return this.escapeHtml(ing.name);
        const decoration = this.settings.allergenUnderline ? 'text-decoration:underline;' : '';
        const weight = this.settings.allergenBold ? 'font-weight:700;' : '';
        return `<span style="color:${this.settings.allergenColor};${decoration}${weight}">${this.escapeHtml(ing.name)}</span>`;
    }

    renderBackgroundLayers() {
        return [...this.settings.backgroundImages].filter(img => img.image).sort((a, b) => a.zIndex - b.zIndex).map(img => {
            const pos = (img.position || 'center').replace(/-/g, ' ');
            return `<div class="background-layer" style="background-image:url('${this.getBackgroundImageUrl(img)}');background-size:${img.size}% auto;background-position:${pos};opacity:${img.opacity};z-index:${img.zIndex};"></div>`;
        }).join('');
    }

    getBackgroundImageUrl(img) {
        if (img.imageData) return img.imageData;
        if (!img.image) return '';
        if (/^(data:|https?:|blob:)/.test(img.image) || img.image.startsWith('img/') || img.image.startsWith('./img/') || img.image.startsWith('/img/')) return img.image.replace(/^\.\//, '');
        return `data/images/backgrounds/${img.image}`;
    }

    async hydrateEditorImages() {
        if (!window.dmsDesktop?.images?.getDataUrl) return;
        await Promise.all((this.settings.editorBlocks || []).filter(block => block.type === 'image' && block.style?.imageName).map(async block => {
            try {
                const dataUrl = await window.dmsDesktop.images.getDataUrl(block.style.imageFolder || 'template-objects', block.style.imageName);
                if (dataUrl) block.style.imageData = dataUrl;
            } catch {}
        }));
    }

    bindCanvasInteractions() {
        document.querySelectorAll('.editable-block').forEach(el => {
            el.addEventListener('mousedown', e => this.startDrag(e, el));
            el.addEventListener('click', e => {
                e.stopPropagation();
                if (this.selectedBlockId !== el.dataset.blockId) this.selectBlock(el.dataset.blockId);
            });
        });
        document.querySelectorAll('[data-edit-block]').forEach(editable => {
            editable.addEventListener('mousedown', e => e.stopPropagation());
            editable.addEventListener('click', e => {
                e.stopPropagation();
                const blockId = editable.dataset.editBlock;
                if (this.selectedBlockId !== blockId) {
                    this.selectedBlockId = blockId;
                    this.buildUI();
                    this.updatePreview();
                    setTimeout(() => {
                        const fresh = document.querySelector(`[data-edit-block="${CSS.escape(blockId)}"]`);
                        fresh?.focus();
                    }, 0);
                }
            });
            editable.addEventListener('focus', () => {
                const blockId = editable.dataset.editBlock;
                if (this.selectedBlockId !== blockId) {
                    this.selectedBlockId = blockId;
                    this.buildUI();
                }
            });
            editable.addEventListener('input', () => {
                const block = this.getBlock(editable.dataset.editBlock);
                if (!block) return;
                block.style.html = editable.innerHTML;
                this.syncLegacySettings();
                this.pushHistory();
            });
        });
        document.querySelectorAll('.resize-handle').forEach(handle => handle.addEventListener('mousedown', e => this.startResize(e, handle)));
        document.onmousemove = e => this.onPointerMove(e);
        document.onmouseup = () => this.endPointerAction();
    }

    startDrag(event, el) {
        if (event.target.matches('.resize-handle')) return;
        if (event.target.closest('[contenteditable="true"]')) return;
        const block = this.getBlock(el.dataset.blockId);
        if (!block || block.locked) return;
        event.preventDefault();
        this.selectedBlockId = block.id;
        const page = el.closest('.designer-page').getBoundingClientRect();
        this.dragState = { block, page, startX: event.clientX, startY: event.clientY, x: block.x, y: block.y };
    }

    startResize(event, handle) {
        const block = this.getBlock(handle.dataset.resizeBlock);
        if (!block || block.locked) return;
        event.preventDefault();
        event.stopPropagation();
        const page = handle.closest('.designer-page').getBoundingClientRect();
        this.resizeState = { block, page, startX: event.clientX, startY: event.clientY, width: block.width, height: block.height };
    }

    onPointerMove(event) {
        if (this.dragState) {
            const d = this.dragState;
            d.block.x = this.snapValue(this.clamp(d.x + ((event.clientX - d.startX) / d.page.width) * 100, 0, 100 - d.block.width));
            d.block.y = this.snapValue(this.clamp(d.y + ((event.clientY - d.startY) / d.page.height) * 100, 0, 100 - d.block.height));
            this.updatePreview();
        } else if (this.resizeState) {
            const r = this.resizeState;
            r.block.width = this.snapValue(this.clamp(r.width + ((event.clientX - r.startX) / r.page.width) * 100, 5, 100 - r.block.x));
            r.block.height = this.snapValue(this.clamp(r.height + ((event.clientY - r.startY) / r.page.height) * 100, 4, 100 - r.block.y));
            this.updatePreview();
        }
    }

    endPointerAction() {
        if (this.dragState || this.resizeState) {
            this.syncLegacySettings();
            this.pushHistory();
            this.buildUI();
            this.updatePreview();
        }
        this.dragState = null;
        this.resizeState = null;
    }

    getDateRangeText() {
        if (!this.previewData) return '';
        const { startDate, endDate } = this.previewData;
        const pad2 = n => String(n).padStart(2, '0');
        return `${pad2(startDate.getDate())}.${pad2(startDate.getMonth() + 1)} - ${pad2(endDate.getDate())}.${pad2(endDate.getMonth() + 1)} ${startDate.getFullYear()}`;
    }

    async loadTemplates() {
        const container = document.getElementById('templates-list');
        if (!container) return;
        if (!window.menuTemplates || !Object.keys(window.menuTemplates).length) {
            container.innerHTML = `<div class="empty-state">No saved templates yet.</div>`;
            return;
        }
        container.innerHTML = Object.entries(window.menuTemplates).map(([name, t]) => `
            <div class="template-card"><div><strong>${this.escapeHtml(name)}</strong><span>${this.escapeHtml(t.templateStyle || 'compact')}</span></div><div class="card-actions"><button type="button" class="mini-btn" data-load-template="${this.escapeAttr(name)}">Load</button><button type="button" class="mini-btn" data-delete-template="${this.escapeAttr(name)}">Delete</button></div></div>
        `).join('');
        container.querySelectorAll('[data-load-template]').forEach(btn => btn.addEventListener('click', () => this.loadTemplate(btn.dataset.loadTemplate)));
        container.querySelectorAll('[data-delete-template]').forEach(btn => btn.addEventListener('click', () => this.deleteTemplate(btn.dataset.deleteTemplate)));
    }

    async loadTemplate(name) {
        if (!window.menuTemplates?.[name]) { await window.dmsAlert(window.t('alert_template_not_found') || 'Template not found', { title: window.t('dialog_error_title') }); return; }
        if (!await window.dmsConfirm((window.t('alert_template_load_confirm') || 'Load template "{name}"?').replace('{name}', name), { title: window.t('dialog_load_template_title') })) return;
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(JSON.stringify(window.menuTemplates[name])) };
        this.ensureEditorBlocks();
        this.syncBlocksFromLegacy();
        await this.hydrateEditorImages();
        this.selectedBlockId = 'header';
        this.switchTab('builder');
        this.buildUI();
        this.updatePreview();
    }

    async deleteTemplate(name) {
        if (!await window.dmsConfirm((window.t('alert_template_delete_confirm') || 'Delete template "{name}"?').replace('{name}', name), { title: window.t('dialog_confirm_delete'), danger: true })) return;
        const removedTemplate = window.menuTemplates?.[name] ? JSON.parse(JSON.stringify(window.menuTemplates[name])) : null;
        if (window.storageAdapter?.isDesktop && window.storageAdapter.deleteTemplate) await window.storageAdapter.deleteTemplate(name);
        else if (window.storageAdapter) {
            delete window.menuTemplates[name];
            await window.storageAdapter.save('templates', window.menuTemplates);
        }
        delete window.menuTemplates[name];
        await this.loadTemplates();
        if (removedTemplate) {
            window.pushUndoAction?.({
                message: window.t ? window.t('toast_template_deleted') : 'Template deleted.',
                undo: async () => {
                    window.menuTemplates[name] = removedTemplate;
                    if (window.storageAdapter?.isDesktop && window.storageAdapter.upsertTemplate) await window.storageAdapter.upsertTemplate(name, removedTemplate);
                    else if (window.storageAdapter) await window.storageAdapter.save('templates', window.menuTemplates);
                    await this.loadTemplates();
                }
            });
        }
    }

    async loadImages() {
        await Promise.all([
            this.loadImageFolder('template-objects', 'object-images-list', 'object'),
            this.loadImageFolder('backgrounds', 'bg-images-list', 'background')
        ]);
    }

    bindImagesTabUpload() {
        const uploadInput = document.getElementById('imagesTabUpload');
        document.getElementById('btnUploadImageFromTab')?.addEventListener('click', () => uploadInput?.click());
        uploadInput?.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            const savedImageData = await this.saveImage(file, 'backgrounds');
            if (savedImageData) await this.loadImages();
            else await window.dmsAlert(window.t('alert_upload_failed') || 'Upload failed.', { title: window.t('dialog_error_title') });
            uploadInput.value = '';
        });
    }

    async loadImageFolder(folder, containerId, mode = 'background') {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!window.dmsDesktop?.images?.list) {
            container.innerHTML = `<div class="empty-state">Image library is available in the desktop app.</div>`;
            return;
        }
        try {
            const images = await window.dmsDesktop.images.list(folder);
            this.renderImageCards(container, images, folder, mode);
        } catch {
            container.innerHTML = `<div class="empty-state">Could not load image library.</div>`;
        }
    }

    renderImageCards(container, images, folder, mode) {
        if (!images.length) {
            container.innerHTML = `<div class="empty-state">No images yet.</div>`;
            return;
        }
        container.innerHTML = images.map(img => {
            const imageUrl = img.dataUrl || img.url || '';
            return `
            <div class="image-card" data-image-folder="${this.escapeAttr(folder)}" data-image-mode="${this.escapeAttr(mode)}" data-image-name="${this.escapeAttr(img.name)}" data-image-url="${this.escapeAttr(imageUrl)}">
                <button type="button" class="image-card-preview" data-image-use>
                    ${imageUrl ? `<img src="${this.escapeAttr(imageUrl)}" alt="">` : '<div class="missing-image-preview">Missing file</div>'}
                    <span>${this.escapeHtml(img.name)}</span>
                </button>
                <div class="image-card-actions">
                    <button type="button" class="mini-btn" data-image-rename>Rename</button>
                    <button type="button" class="mini-btn" data-image-delete>Delete</button>
                </div>
            </div>
        `;
        }).join('');
        container.querySelectorAll('.image-card').forEach(card => {
            card.querySelector('[data-image-use]')?.addEventListener('click', () => {
                if (card.dataset.imageMode === 'object') {
                    this.addImageBlockFromLibrary(card.dataset.imageName, card.dataset.imageFolder, card.dataset.imageUrl);
                    return;
                }
                const layer = this.settings.backgroundImages[0];
                layer.image = card.dataset.imageName;
                layer.imageData = card.dataset.imageUrl || null;
                layer.size = 100;
                layer.opacity = 0.25;
                this.switchTab('builder');
                this.recordChange();
            });
            card.querySelector('[data-image-rename]')?.addEventListener('click', () => this.renameLibraryImage(card));
            card.querySelector('[data-image-delete]')?.addEventListener('click', () => this.deleteLibraryImage(card));
        });
    }

    async renameLibraryImage(card) {
        if (!window.dmsDesktop?.images?.rename) return;
        const oldName = card.dataset.imageName || '';
        const nextName = await window.dmsPrompt(window.t('dialog_new_image_name') || 'New image name:', oldName, { title: window.t('dialog_rename_title') });
        if (!nextName || nextName.trim() === oldName) return;
        try {
            const renamed = await window.dmsDesktop.images.rename(card.dataset.imageFolder, oldName, nextName.trim());
            this.settings.editorBlocks
                .filter(block => block.type === 'image' && block.style?.imageFolder === card.dataset.imageFolder && block.style?.imageName === oldName)
                .forEach(block => {
                    block.style.imageName = renamed.name;
                    block.style.relativePath = renamed.relativePath;
                });
            if (card.dataset.imageFolder === 'backgrounds') {
                this.settings.backgroundImages
                    .filter(layer => layer.image === oldName)
                    .forEach(layer => {
                        layer.image = renamed.name;
                        layer.imageData = card.dataset.imageUrl || layer.imageData || null;
                    });
            }
            await this.loadImages();
            this.recordCanvasChange();
        } catch (error) {
            await window.dmsAlert(error?.message || 'Could not rename image.', { title: window.t('dialog_error_title') });
        }
    }

    async deleteLibraryImage(card) {
        if (!window.dmsDesktop?.images?.delete) return;
        const name = card.dataset.imageName || '';
        if (!await window.dmsConfirm(`Delete image "${name}"?`, { title: window.t('dialog_confirm_delete'), danger: true })) return;
        const removedImage = {
            name,
            folder: card.dataset.imageFolder,
            dataUrl: card.dataset.imageUrl || '',
            mimeType: this.mimeTypeFromImageName(name)
        };
        try {
            await window.dmsDesktop.images.delete(card.dataset.imageFolder, name);
            this.settings.editorBlocks
                .filter(block => block.type === 'image' && block.style?.imageFolder === card.dataset.imageFolder && block.style?.imageName === name)
                .forEach(block => {
                    block.style.imageData = '';
                    block.style.src = '';
                });
            if (card.dataset.imageFolder === 'backgrounds') {
                this.settings.backgroundImages
                    .filter(layer => layer.image === name)
                    .forEach(layer => {
                        layer.image = null;
                        layer.imageData = null;
                    });
            }
            await this.loadImages();
            this.recordCanvasChange();
            if (removedImage.dataUrl) {
                window.pushUndoAction?.({
                    message: window.t ? window.t('toast_image_deleted') : 'Image deleted.',
                    undo: async () => {
                        await window.dmsDesktop.images.save(removedImage.folder, removedImage);
                        await this.loadImages();
                    }
                });
            }
        } catch (error) {
            await window.dmsAlert(error?.message || 'Could not delete image.', { title: window.t('dialog_error_title') });
        }
    }

    mimeTypeFromImageName(name) {
        if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
        if (/\.gif$/i.test(name)) return 'image/gif';
        if (/\.webp$/i.test(name)) return 'image/webp';
        return 'image/png';
    }

    addImageBlockFromLibrary(name, folder, dataUrl) {
        const id = `image-${Date.now()}`;
        const block = this.createBlock(id, 'image', name || 'Image', 22, 22, 28, 18, {
            src: dataUrl || '',
            imageData: dataUrl || '',
            imageFolder: folder || 'template-objects',
            imageName: name || '',
            fit: 'contain',
            opacity: 1,
            backgroundColor: 'transparent'
        });
        block.zIndex = this.nextZIndex();
        this.settings.editorBlocks.push(block);
        this.selectedBlockId = id;
        this.switchTab('builder');
        this.recordChange();
    }

    async saveImage(file, folder) {
        if (!this.isAllowedImageFile(file)) {
            await window.dmsAlert(window.t('alert_invalid_image_format') || 'Unsupported image format.', { title: window.t('dialog_error_title') });
            return false;
        }
        if (window.dmsDesktop?.images?.save) {
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
            if (!dataUrl) return false;
            await window.dmsDesktop.images.save(folder, { name: file.name, mimeType: file.type, dataUrl });
            return dataUrl;
        }
        return false;
    }

    readImageFile(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    isAllowedImageFile(file) {
        const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
        return !!file && allowedTypes.has(file.type) && /\.(png|jpe?g|gif|webp)$/i.test(file.name || '');
    }

    async loadRealData() {
        const isBg = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
        const weeks = this._buildWeekOptions(isBg);
        if (!weeks.length) { await window.dmsAlert(isBg ? 'Няма планирани ястия.' : 'No meals found.', { title: window.t('dialog_error_title') }); return; }
        const overlay = document.createElement('div');
        overlay.className = 'editor-dialog-overlay';
        overlay.innerHTML = `<div class="editor-dialog"><h2>${isBg ? 'Зареди данни' : 'Load Menu Data'}</h2><select id="lrd-week">${weeks.map(e => `<option value="${e.mondayStr}">${e.label}</option>`).join('')}</select><div class="dialog-actions"><button id="lrd-load" class="btn btn-primary">${isBg ? 'Зареди' : 'Load'}</button><button id="lrd-cancel" class="btn btn-secondary">${isBg ? 'Отказ' : 'Cancel'}</button></div></div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('#lrd-load').addEventListener('click', () => {
            const entry = weeks.find(e => e.mondayStr === overlay.querySelector('#lrd-week').value);
            close();
            this._applyWeekData(entry.monday, entry.friday, isBg);
        });
        overlay.querySelector('#lrd-cancel').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    }

    loadCurrentMenuData() {
        const isBg = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
        const weeks = this._buildWeekOptions(isBg);
        if (!weeks.length) return false;
        const activeDate = window.currentCalendarDate instanceof Date ? window.currentCalendarDate : new Date();
        const mondayOf = d => { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? 1 : -(day - 1))); x.setHours(0, 0, 0, 0); return x; };
        const str = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const activeMonday = str(mondayOf(activeDate));
        const entry = weeks.find(item => item.mondayStr === activeMonday) || weeks[weeks.length - 1];
        this._applyWeekData(entry.monday, entry.friday, isBg, false);
        return true;
    }

    _buildWeekOptions(isBg) {
        const mondayOf = d => { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? 1 : -(day - 1))); x.setHours(0, 0, 0, 0); return x; };
        const str = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const set = new Set();
        Object.keys(window.currentMenu || {}).forEach(ds => {
            if (Object.values(window.currentMenu[ds] || {}).some(slot => slot && slot.recipe)) set.add(str(mondayOf(new Date(`${ds}T00:00:00`))));
        });
        const locale = isBg ? 'bg-BG' : 'en-US';
        return Array.from(set).sort().map(mondayStr => {
            const monday = new Date(`${mondayStr}T00:00:00`);
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            return { mondayStr, monday, friday, label: `${monday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}` };
        });
    }

    _applyWeekData(startDate, endDate, isBg, refreshPreview = true) {
        const dayNames = isBg ? ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const str = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const days = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dayMenu = window.getMenuForDate ? window.getMenuForDate(str(d)) : {};
            const meals = [];
            ['slot1', 'slot2', 'slot3', 'slot4'].forEach((slotId, idx) => {
                const slot = dayMenu[slotId];
                const recipe = slot?.recipe ? (window.recipes || []).find(r => r.id === slot.recipe) : null;
                if (!recipe) return;
                const ingredients = (recipe.ingredients || []).map(ingObj => {
                    const ing = (window.ingredients || []).find(i => i.id === (typeof ingObj === 'string' ? ingObj : ingObj.id));
                    return ing ? { name: ing.name, hasAllergen: !!(ing.allergens && ing.allergens.length) } : null;
                }).filter(Boolean);
                meals.push({ number: idx + 1, name: recipe.name, portion: recipe.portionSize || '', calories: recipe.calories || null, ingredients });
            });
            if (meals.length) days.push({ name: dayNames[i], meals });
        }
        this.previewData = { startDate, endDate, days };
        if (refreshPreview) this.updatePreview();
    }

    loadSampleData() {
        const today = new Date();
        const end = new Date(today);
        end.setDate(today.getDate() + 4);
        this.previewData = {
            startDate: today,
            endDate: end,
            days: [
                { name: 'Понеделник', meals: [{ number: 1, name: 'Супа топчета', portion: '150гр', calories: 129, ingredients: [{ name: 'кайма', hasAllergen: false }, { name: 'яйца', hasAllergen: true }] }, { number: 2, name: 'Пиле с ориз', portion: '200гр', calories: 250, ingredients: [{ name: 'пиле', hasAllergen: false }, { name: 'ориз', hasAllergen: false }] }, { number: 3, name: 'Крем карамел', portion: '120гр', calories: 190, ingredients: [{ name: 'мляко', hasAllergen: true }, { name: 'яйца', hasAllergen: true }] }, { number: 4, name: 'Плод', portion: '100гр', calories: 60, ingredients: [{ name: 'ябълка', hasAllergen: false }] }] },
                { name: 'Вторник', meals: [{ number: 1, name: 'Таратор', portion: '150гр', calories: 100, ingredients: [{ name: 'краставица', hasAllergen: false }, { name: 'кисело мляко', hasAllergen: true }] }, { number: 2, name: 'Мусака', portion: '200гр', calories: 320, ingredients: [{ name: 'картофи', hasAllergen: false }, { name: 'яйца', hasAllergen: true }] }, { number: 3, name: 'Бисквитена торта', portion: '100гр', calories: 210, ingredients: [{ name: 'бисквити', hasAllergen: true }, { name: 'мляко', hasAllergen: true }] }, { number: 4, name: 'Салата', portion: '80гр', calories: 45, ingredients: [{ name: 'домати', hasAllergen: false }] }] },
                { name: 'Сряда', meals: [{ number: 1, name: 'Пилешка супа', portion: '150гр', calories: 120, ingredients: [{ name: 'пиле', hasAllergen: false }, { name: 'моркови', hasAllergen: false }] }, { number: 2, name: 'Кюфтета', portion: '180гр', calories: 280, ingredients: [{ name: 'кайма', hasAllergen: false }, { name: 'лук', hasAllergen: false }] }] },
                { name: 'Четвъртък', meals: [{ number: 1, name: 'Леща яхния', portion: '200гр', calories: 180, ingredients: [{ name: 'леща', hasAllergen: false }, { name: 'домати', hasAllergen: false }] }] },
                { name: 'Петък', meals: [{ number: 1, name: 'Рибена чорба', portion: '150гр', calories: 110, ingredients: [{ name: 'риба', hasAllergen: true }, { name: 'картофи', hasAllergen: false }] }, { number: 2, name: 'Пъстърва на скара', portion: '180гр', calories: 200, ingredients: [{ name: 'пъстърва', hasAllergen: true }, { name: 'лимон', hasAllergen: false }] }] }
            ]
        };
    }

    async askTemplateName() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'editor-dialog-overlay';
            overlay.innerHTML = `
                <div class="editor-dialog">
                    <h2>${window.t('alert_template_name') || 'Template name:'}</h2>
                    <input id="template-name-input" type="text" maxlength="80" autocomplete="off">
                    <div class="dialog-actions">
                        <button id="template-name-cancel" class="btn btn-secondary" type="button">Cancel</button>
                        <button id="template-name-save" class="btn btn-primary" type="button">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('#template-name-input');
            const close = value => {
                overlay.remove();
                resolve(value);
            };
            overlay.querySelector('#template-name-cancel').addEventListener('click', () => close(''));
            overlay.querySelector('#template-name-save').addEventListener('click', () => close(input.value.trim()));
            overlay.addEventListener('click', e => { if (e.target === overlay) close(''); });
            input.addEventListener('keydown', e => {
                if (e.key === 'Escape') close('');
                if (e.key === 'Enter') close(input.value.trim());
            });
            input.focus();
        });
    }

    async saveTemplate() {
        const name = await this.askTemplateName();
        if (!name) return;
        if (!window.menuTemplates) window.menuTemplates = {};
        this.syncLegacySettings();
        const template = JSON.parse(JSON.stringify(this.settings));
        if (Array.isArray(template.editorBlocks)) {
            template.editorBlocks.forEach(block => {
                if (block.type === 'image' && block.style) {
                    delete block.style.imageData;
                    if (block.style.relativePath) block.style.src = block.style.relativePath;
                }
            });
        }
        if (Array.isArray(template.backgroundImages)) {
            template.backgroundImages.forEach(img => {
                delete img.imageData;
                delete img._loadingImageData;
            });
        }
        if (window.storageAdapter?.isDesktop && window.storageAdapter.upsertTemplate) await window.storageAdapter.upsertTemplate(name, template);
        else if (window.storageAdapter) {
            window.menuTemplates[name] = template;
            await window.storageAdapter.save('templates', window.menuTemplates);
        }
        window.menuTemplates[name] = template;
        window.showToast?.(window.t('alert_template_saved') || 'Template saved.', { type: 'success' });
    }

    async reset() {
        if (!await window.dmsConfirm(window.t('alert_reset_confirm') || 'Reset template?', { title: window.t('dialog_reset_title'), danger: true })) return;
        this.settings = this.getDefaultSettings();
        this.selectedBlockId = 'header';
        this.history = [];
        this.historyIndex = -1;
        this.loadSampleData();
        this.pushHistory();
        this.buildUI();
        this.updatePreview();
    }

    snapValue(value) {
        return this.settings.snapToGrid ? Math.round(value / 2) * 2 : value;
    }

    clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
    escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
    escapeAttr(value) { return this.escapeHtml(value).replace(/`/g, '&#096;'); }
}

window.stepTemplateBuilder = new StepTemplateBuilder();

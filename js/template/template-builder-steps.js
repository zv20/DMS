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
            dayNameSize: 14,
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            dayNameFontFamily: 'Arial, sans-serif',
            mealFontSize: 11,
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
                this.createBlock('menu', 'menu', 'Menu Content', 7, 24, 86, 54, { fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#222222', align: 'left', columns: 1 }),
                this.createBlock('footer', 'text', 'Footer', 18, 86, 64, 6, { html: 'Prepared with care by DMS', fontFamily: 'Arial, sans-serif', fontSize: 9, color: '#777777', align: 'center', bold: false, italic: false, underline: false })
            ]
        };
    }

    createBlock(id, type, label, x, y, width, height, style = {}) {
        return { id, type, label, visible: true, locked: false, x, y, width, height, zIndex: 30, style };
    }

    init() {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.setup());
        else this.setup();
    }

    setup() {
        this.ensureEditorBlocks();
        this.injectTabsIntoHeader();
        this.buildUI();
        this.loadSampleData();
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

    injectTabsIntoHeader() {
        const pageHeader = document.querySelector('#style-editor .page-header');
        if (!pageHeader || document.querySelector('.builder-tab-btns')) return;
        const tabs = document.createElement('div');
        tabs.className = 'builder-tab-btns';
        tabs.innerHTML = `
            <button class="btn btn-secondary btn-small builder-tab-btn active" data-tab="builder">Editor</button>
        `;
        const backButton = pageHeader.querySelector('button');
        if (backButton?.parentNode) backButton.parentNode.insertBefore(tabs, backButton.nextSibling);
        else pageHeader.appendChild(tabs);
    }

    buildUI() {
        const sidebar = document.getElementById('template-sidebar');
        const toolbar = document.querySelector('.template-canvas-toolbar');
        if (!sidebar || !toolbar) return;
        sidebar.innerHTML = '';
        toolbar.innerHTML = this.renderRibbon();
        this.bindTabControls();
        this.bindEditorControls();
        this.bindActionButtons();
    }

    renderRibbon() {
        const block = this.getSelectedBlock();
        const style = block?.style || {};
        const fonts = this._fonts();
        const canTextStyle = block && block.type !== 'menu';
        const blockOptions = this.settings.editorBlocks.map(item => `<option value="${this.escapeAttr(item.id)}" ${item.id === this.selectedBlockId ? 'selected' : ''}>${this.escapeHtml(item.label)}</option>`).join('');
        const templateOptions = Object.keys(window.menuTemplates || {}).sort().map(name => `<option value="${this.escapeAttr(name)}">${this.escapeHtml(name)}</option>`).join('');
        return `
            <div class="dms-ribbon">
                <div class="ribbon-group ribbon-actions">
                    <button type="button" class="btn btn-primary btn-small" id="btnSaveTemplate">Save</button>
                    <button type="button" class="btn btn-secondary btn-small" id="btnLoadData">Load Data</button>
                    <button type="button" class="btn btn-secondary btn-small" id="btnReset">Clear</button>
                </div>
                <div class="ribbon-group ribbon-template">
                    <select id="savedTemplateSelect" title="Saved templates">
                        <option value="">Templates</option>
                        ${templateOptions}
                    </select>
                    <button type="button" class="ribbon-btn" id="btnLoadSavedTemplate" title="Load template">Open</button>
                    <button type="button" class="ribbon-btn" id="btnDeleteSavedTemplate" title="Delete template">Del</button>
                </div>
                <div class="ribbon-group">
                    <button type="button" class="ribbon-btn" id="btnUndo" title="Undo">↶</button>
                    <button type="button" class="ribbon-btn" id="btnRedo" title="Redo">↷</button>
                </div>
                <div class="ribbon-group ribbon-object">
                    <select id="ribbonBlockSelect" title="Selected object">${blockOptions}</select>
                    <input id="blockLabel" type="text" value="${this.escapeAttr(block?.label || '')}" title="Object label" ${!block ? 'disabled' : ''}>
                    <label class="ribbon-check"><input type="checkbox" id="selectedBlockVisible" ${block?.visible ? 'checked' : ''} ${!block ? 'disabled' : ''}> Visible</label>
                </div>
                <div class="ribbon-group">
                    <button type="button" class="ribbon-btn" id="btnAddText" title="Add text">T</button>
                    <button type="button" class="ribbon-btn" id="btnAddImage" title="Insert image">▧</button>
                    <input type="file" id="canvasImageUpload" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp" style="display:none;">
                    <button type="button" class="ribbon-btn" id="btnAddRect" title="Add rectangle">□</button>
                    <button type="button" class="ribbon-btn" id="btnAddLine" title="Add line">─</button>
                    <button type="button" class="ribbon-btn" id="btnDuplicateBlock" title="Duplicate">⧉</button>
                    <button type="button" class="ribbon-btn" id="btnDeleteBlock" title="Hide/Delete">⌫</button>
                    <button type="button" class="ribbon-btn ${block?.locked ? 'active' : ''}" id="btnLockBlock" title="Lock/unlock">${block?.locked ? 'L' : 'U'}</button>
                </div>
                <div class="ribbon-group">
                    <button type="button" class="ribbon-btn" id="btnBringForward" title="Bring forward">↑</button>
                    <button type="button" class="ribbon-btn" id="btnSendBackward" title="Send backward">↓</button>
                    <button type="button" class="ribbon-btn" data-page-align="left" title="Align page left">⇤</button>
                    <button type="button" class="ribbon-btn" data-page-align="center" title="Align page center">↔</button>
                    <button type="button" class="ribbon-btn" data-page-align="right" title="Align page right">⇥</button>
                    <button type="button" class="ribbon-btn" data-page-align="top" title="Align page top">⇡</button>
                    <button type="button" class="ribbon-btn" data-page-align="middle" title="Align page middle">↕</button>
                    <button type="button" class="ribbon-btn" data-page-align="bottom" title="Align page bottom">⇣</button>
                </div>
                <div class="ribbon-group ribbon-wide">
                    <select id="ribbonFont" ${!block ? 'disabled' : ''}>${fonts.map(f => `<option value="${this.escapeAttr(f.value)}" ${style.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}</select>
                    <input id="ribbonSize" type="number" min="6" max="120" value="${style.fontSize || 12}" ${!block ? 'disabled' : ''}>
                    <input id="ribbonColor" type="color" value="${style.color || '#222222'}" ${!block ? 'disabled' : ''}>
                </div>
                <div class="ribbon-group">
                    <button type="button" class="ribbon-btn ${style.bold ? 'active' : ''}" data-style-toggle="bold" ${!canTextStyle ? 'disabled' : ''} title="Bold"><b>B</b></button>
                    <button type="button" class="ribbon-btn ${style.italic ? 'active' : ''}" data-style-toggle="italic" ${!canTextStyle ? 'disabled' : ''} title="Italic"><i>I</i></button>
                    <button type="button" class="ribbon-btn ${style.underline ? 'active' : ''}" data-style-toggle="underline" ${!canTextStyle ? 'disabled' : ''} title="Underline"><u>U</u></button>
                </div>
                <div class="ribbon-group">${['left', 'center', 'right'].map(a => `<button type="button" class="ribbon-btn ${style.align === a ? 'active' : ''}" data-align="${a}" ${!block ? 'disabled' : ''} title="${a}">${a === 'left' ? '≡' : a === 'center' ? '☰' : '≣'}</button>`).join('')}</div>
                <div class="ribbon-group ribbon-text-more">
                    <label>LH<input type="number" id="ribbonLineHeight" min="0.8" max="3" step="0.1" value="${style.lineHeight || 1.2}" ${!block || block.type !== 'text' ? 'disabled' : ''}></label>
                    <input id="ribbonHighlight" type="color" value="${style.backgroundColor || '#ffffff'}" title="Text background" ${!block || block.type !== 'text' ? 'disabled' : ''}>
                    <button type="button" class="ribbon-btn" id="btnClearFormatting" title="Clear formatting">Tx</button>
                </div>
                <div class="ribbon-group ribbon-image-tools">
                    <select id="imageFit" title="Image fit" ${!block || block.type !== 'image' ? 'disabled' : ''}>
                        <option value="contain" ${style.fit === 'contain' ? 'selected' : ''}>Fit</option>
                        <option value="cover" ${style.fit === 'cover' ? 'selected' : ''}>Fill</option>
                        <option value="fill" ${style.fit === 'fill' ? 'selected' : ''}>Stretch</option>
                    </select>
                    <label>Opacity<input type="number" id="imageOpacity" min="10" max="100" value="${Math.round((style.opacity ?? 1) * 100)}" ${!block || block.type !== 'image' ? 'disabled' : ''}></label>
                </div>
                <div class="ribbon-group ribbon-shape-tools">
                    <input id="shapeFill" type="color" value="${style.fill || '#f8f9fb'}" title="Shape fill" ${!block || block.type !== 'shape' ? 'disabled' : ''}>
                    <input id="shapeStroke" type="color" value="${style.stroke || '#1f2933'}" title="Shape border" ${!block || block.type !== 'shape' ? 'disabled' : ''}>
                    <label>Border<input type="number" id="shapeStrokeWidth" min="0" max="20" value="${style.strokeWidth ?? 1}" ${!block || block.type !== 'shape' ? 'disabled' : ''}></label>
                </div>
                <div class="ribbon-group ribbon-position">
                    <label>X<input type="number" id="blockX" min="0" max="100" value="${Math.round(block?.x || 0)}" ${!block ? 'disabled' : ''}></label>
                    <label>Y<input type="number" id="blockY" min="0" max="100" value="${Math.round(block?.y || 0)}" ${!block ? 'disabled' : ''}></label>
                    <label>W<input type="number" id="blockW" min="5" max="100" value="${Math.round(block?.width || 0)}" ${!block ? 'disabled' : ''}></label>
                    <label>H<input type="number" id="blockH" min="4" max="100" value="${Math.round(block?.height || 0)}" ${!block ? 'disabled' : ''}></label>
                </div>
                <div class="ribbon-group">
                    <label class="ribbon-check"><input type="checkbox" id="toggleHeader" ${this.settings.showHeader ? 'checked' : ''}> Header</label>
                    <label class="ribbon-check"><input type="checkbox" id="toggleDate" ${this.settings.showDateRange ? 'checked' : ''}> Date</label>
                    <label class="ribbon-check"><input type="checkbox" id="toggleFooter" ${this.settings.showFooter ? 'checked' : ''}> Footer</label>
                </div>
                <div class="ribbon-group ribbon-page">
                    <select id="templateStyle" title="Template layout">
                        <option value="compact" ${this.settings.templateStyle === 'compact' ? 'selected' : ''}>Compact</option>
                        <option value="detailed" ${this.settings.templateStyle === 'detailed' ? 'selected' : ''}>Detailed</option>
                        <option value="detailed-2col" ${this.settings.templateStyle === 'detailed-2col' ? 'selected' : ''}>2 Columns</option>
                    </select>
                    <input type="color" id="backgroundColor" value="${this.settings.backgroundColor}" title="Page color">
                    <label class="ribbon-check"><input type="checkbox" id="dayBorder" ${this.settings.dayBorder ? 'checked' : ''}> Borders</label>
                    <input type="color" id="dayBorderColor" value="${this.settings.dayBorderColor}" title="Day border color">
                    <label class="ribbon-check"><input type="checkbox" id="dayBgTransparent" ${!this.settings.dayBackground || this.settings.dayBackground === 'transparent' ? 'checked' : ''}> Clear day</label>
                    <input type="color" id="dayBackgroundColor" value="${this.settings.dayBackground && this.settings.dayBackground !== 'transparent' ? this.settings.dayBackground : '#ffffff'}" title="Day background">
                    <label class="ribbon-check"><input type="checkbox" id="toggleGuides" ${this.settings.showGuides ? 'checked' : ''}> Guides</label>
                    <label class="ribbon-check"><input type="checkbox" id="toggleSnap" ${this.settings.snapToGrid ? 'checked' : ''}> Snap</label>
                </div>
                <div class="ribbon-group">
                    <button type="button" class="ribbon-btn" onclick="window.setTemplatePreviewZoom(-0.1)" title="Zoom out">−</button>
                    <span id="templateZoomLabel">${Math.round((window.templatePreviewZoom || 1) * 100)}%</span>
                    <button type="button" class="ribbon-btn" onclick="window.setTemplatePreviewZoom(0.1)" title="Zoom in">+</button>
                    <button type="button" class="ribbon-btn" onclick="window.fitTemplatePreviewToWidth()" title="Fit to width">Fit</button>
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
                <h2>Background Images</h2>
                <input type="file" id="imagesTabUpload" accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp" style="display:none;">
                <button id="btnUploadImageFromTab" class="btn btn-primary">Upload Image</button>
                <div id="bg-images-list" class="image-grid"></div>
            </section>
        `;
    }

    bindTabControls() {
        document.querySelectorAll('.builder-tab-btn').forEach(btn => btn.addEventListener('click', e => this.switchTab(e.currentTarget.dataset.tab)));
    }

    async switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.builder-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
        if (tab === 'templates') await this.loadTemplates();
        if (tab === 'images') await this.loadImages();
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
        document.getElementById('ribbonFont')?.addEventListener('change', e => this.updateSelectedStyle('fontFamily', e.target.value));
        document.getElementById('ribbonSize')?.addEventListener('input', e => this.updateSelectedStyle('fontSize', parseInt(e.target.value, 10) || 12));
        document.getElementById('ribbonColor')?.addEventListener('input', e => this.updateSelectedStyle('color', e.target.value));
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
        document.getElementById('ribbonLineHeight')?.addEventListener('input', e => this.updateSelectedStyle('lineHeight', parseFloat(e.target.value) || 1.2, false));
        document.getElementById('ribbonHighlight')?.addEventListener('input', e => this.updateSelectedStyle('backgroundColor', e.target.value, false));
        document.getElementById('imageFit')?.addEventListener('change', e => this.updateSelectedStyle('fit', e.target.value));
        document.getElementById('imageOpacity')?.addEventListener('input', e => this.updateSelectedStyle('opacity', this.clamp((parseInt(e.target.value, 10) || 100) / 100, 0.1, 1), false));
        document.getElementById('shapeFill')?.addEventListener('input', e => this.updateSelectedStyle('fill', e.target.value, false));
        document.getElementById('shapeStroke')?.addEventListener('input', e => this.updateSelectedStyle('stroke', e.target.value, false));
        document.getElementById('shapeStrokeWidth')?.addEventListener('input', e => this.updateSelectedStyle('strokeWidth', parseInt(e.target.value, 10) || 0, false));
    }

    bindActionButtons() {
        document.getElementById('btnLoadData')?.addEventListener('click', () => this.loadRealData());
        document.getElementById('btnSaveTemplate')?.addEventListener('click', () => this.saveTemplate());
        document.getElementById('btnReset')?.addEventListener('click', () => this.reset());
        document.getElementById('btnAddText')?.addEventListener('click', () => this.addTextBlock());
        document.getElementById('btnAddImage')?.addEventListener('click', () => document.getElementById('canvasImageUpload')?.click());
        document.getElementById('btnAddRect')?.addEventListener('click', () => this.addShapeBlock('rectangle'));
        document.getElementById('btnAddLine')?.addEventListener('click', () => this.addShapeBlock('line'));
        document.getElementById('btnDuplicateBlock')?.addEventListener('click', () => this.duplicateSelectedBlock());
        document.getElementById('btnDeleteBlock')?.addEventListener('click', () => this.deleteSelectedBlock());
        document.getElementById('btnLockBlock')?.addEventListener('click', () => this.toggleSelectedLock());
        document.getElementById('btnBringForward')?.addEventListener('click', () => this.nudgeLayer(1));
        document.getElementById('btnSendBackward')?.addEventListener('click', () => this.nudgeLayer(-1));
        document.getElementById('btnClearFormatting')?.addEventListener('click', () => this.clearSelectedFormatting());
        document.getElementById('btnLoadSavedTemplate')?.addEventListener('click', () => this.loadSelectedTemplate());
        document.getElementById('btnDeleteSavedTemplate')?.addEventListener('click', () => this.deleteSelectedTemplate());
        document.getElementById('canvasImageUpload')?.addEventListener('change', e => this.addImageBlockFromFile(e.target));
        this.bindImagesTabUpload();
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
            alert(window.t('alert_invalid_image_format') || 'Unsupported image format.');
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
        if (['header', 'date', 'menu', 'footer'].includes(block.id)) block.visible = false;
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
        this.syncLegacySettings();
    }

    syncBlocksFromLegacy() {
        const header = this.getBlock('header');
        const date = this.getBlock('date');
        const footer = this.getBlock('footer');
        const menu = this.getBlock('menu');
        this.settings.editorBlocks.forEach((block, index) => {
            if (!block.zIndex) block.zIndex = 30 + index;
            if (!block.style) block.style = {};
        });
        if (header) Object.assign(header, { visible: this.settings.showHeader, style: { ...header.style, html: this.settings.headerText, fontFamily: this.settings.headerFontFamily, fontSize: this.settings.headerFontSize, color: this.settings.headerColor, align: this.settings.headerAlignment } });
        if (date) Object.assign(date, { visible: this.settings.showDateRange, style: { ...date.style, fontFamily: this.settings.dateFontFamily, fontSize: this.settings.dateFontSize, color: this.settings.dateColor, align: this.settings.dateAlignment } });
        if (footer) Object.assign(footer, { visible: this.settings.showFooter, style: { ...footer.style, html: this.settings.footerText, fontFamily: this.settings.footerFontFamily, fontSize: this.settings.footerFontSize, align: this.settings.footerAlignment } });
        if (menu) Object.assign(menu.style, { fontFamily: this.settings.mealFontFamily, fontSize: this.settings.mealFontSize });
    }

    syncLegacySettings() {
        const header = this.getBlock('header');
        const date = this.getBlock('date');
        const footer = this.getBlock('footer');
        const menu = this.getBlock('menu');
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
        if (menu) {
            this.settings.mealFontFamily = menu.style.fontFamily || 'Arial, sans-serif';
            this.settings.mealFontSize = menu.style.fontSize || 11;
        }
    }

    updatePreview() {
        const container = document.getElementById('template-preview');
        if (!container || !this.previewData) return;
        container.innerHTML = `
            <div class="designer-page" style="background:${this.settings.backgroundColor};">
                ${this.renderBackgroundLayers()}
                ${this.settings.showGuides ? '<div class="page-guides"></div>' : ''}
                ${this.settings.editorBlocks.filter(block => block.visible).sort((a, b) => (a.zIndex || 30) - (b.zIndex || 30)).map(block => this.renderEditableBlock(block)).join('')}
            </div>
        `;
        this.bindCanvasInteractions();
        if (typeof window.applyTemplatePreviewZoom === 'function') window.applyTemplatePreviewZoom();
    }

    renderEditableBlock(block) {
        const st = block.style || {};
        const bg = st.backgroundColor && st.backgroundColor !== 'transparent' ? `background:${st.backgroundColor};` : '';
        const common = `left:${block.x}%;top:${block.y}%;width:${block.width}%;height:${block.height}%;z-index:${block.zIndex || 30};font-family:${st.fontFamily || 'Arial, sans-serif'};font-size:${st.fontSize || 12}pt;color:${st.color || '#222'};text-align:${st.align || 'left'};font-weight:${st.bold ? '700' : '400'};font-style:${st.italic ? 'italic' : 'normal'};text-decoration:${st.underline ? 'underline' : 'none'};line-height:${st.lineHeight || 1.2};${bg}`;
        const editable = block.type === 'text' ? 'contenteditable="true" spellcheck="true" data-edit-block="' + this.escapeAttr(block.id) + '"' : '';
        return `
            <div class="editable-block ${block.id === this.selectedBlockId ? 'selected' : ''} ${block.locked ? 'locked' : ''}" data-block-id="${this.escapeAttr(block.id)}" style="${common}">
                <div class="block-label">${this.escapeHtml(block.label)}${block.locked ? ' / locked' : ''}</div>
                <div class="block-content" ${editable}>${this.renderBlockContent(block)}</div>
                <span class="resize-handle" data-resize-block="${this.escapeAttr(block.id)}"></span>
            </div>
        `;
    }

    renderBlockContent(block) {
        if (block.type === 'date') return this.getDateRangeText();
        if (block.type === 'menu') return this.renderMenuContent(block);
        if (block.type === 'image') return `<img class="canvas-image" src="${this.escapeAttr(block.style?.imageData || block.style?.src || '')}" alt="" style="object-fit:${block.style?.fit || 'contain'};opacity:${block.style?.opacity ?? 1};">`;
        if (block.type === 'shape') return `<div class="canvas-shape ${block.style?.kind === 'line' ? 'line' : 'rectangle'}" style="background:${block.style?.fill || '#f8f9fb'};border:${block.style?.strokeWidth ?? 1}px solid ${block.style?.stroke || '#1f2933'};opacity:${block.style?.opacity ?? 1};"></div>`;
        return block.style?.html || '';
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
        if (!window.menuTemplates?.[name]) { alert(window.t('alert_template_not_found') || 'Template not found'); return; }
        if (!confirm((window.t('alert_template_load_confirm') || 'Load template "{name}"?').replace('{name}', name))) return;
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
        if (!confirm((window.t('alert_template_delete_confirm') || 'Delete template "{name}"?').replace('{name}', name))) return;
        if (window.storageAdapter?.isDesktop && window.storageAdapter.deleteTemplate) await window.storageAdapter.deleteTemplate(name);
        else if (window.storageAdapter) {
            delete window.menuTemplates[name];
            await window.storageAdapter.save('templates', window.menuTemplates);
        }
        delete window.menuTemplates[name];
        await this.loadTemplates();
    }

    async loadImages() { await this.loadImageFolder('backgrounds', 'bg-images-list'); }

    bindImagesTabUpload() {
        const uploadInput = document.getElementById('imagesTabUpload');
        document.getElementById('btnUploadImageFromTab')?.addEventListener('click', () => uploadInput?.click());
        uploadInput?.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            const savedImageData = await this.saveImage(file, 'backgrounds');
            if (savedImageData) await this.loadImages();
            else alert(window.t('alert_upload_failed') || 'Upload failed.');
            uploadInput.value = '';
        });
    }

    async loadImageFolder(folder, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!window.dmsDesktop?.images?.list) {
            container.innerHTML = `<div class="empty-state">Image library is available in the desktop app.</div>`;
            return;
        }
        try {
            const images = await window.dmsDesktop.images.list(folder);
            this.renderImageCards(container, images);
        } catch {
            container.innerHTML = `<div class="empty-state">Could not load image library.</div>`;
        }
    }

    renderImageCards(container, images) {
        if (!images.length) {
            container.innerHTML = `<div class="empty-state">No images yet.</div>`;
            return;
        }
        container.innerHTML = images.map(img => `<button type="button" class="image-card" data-image-name="${this.escapeAttr(img.name)}" data-image-url="${this.escapeAttr(img.dataUrl || img.url || '')}"><img src="${img.dataUrl || img.url}" alt=""><span>${this.escapeHtml(img.name)}</span></button>`).join('');
        container.querySelectorAll('.image-card').forEach(card => {
            card.addEventListener('click', () => {
                const layer = this.settings.backgroundImages[0];
                layer.image = card.dataset.imageName;
                layer.imageData = card.dataset.imageUrl || null;
                layer.size = 100;
                layer.opacity = 0.25;
                this.switchTab('builder');
                this.recordChange();
            });
        });
    }

    async saveImage(file, folder) {
        if (!this.isAllowedImageFile(file)) {
            alert(window.t('alert_invalid_image_format') || 'Unsupported image format.');
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

    isAllowedImageFile(file) {
        const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
        return !!file && allowedTypes.has(file.type) && /\.(png|jpe?g|gif|webp)$/i.test(file.name || '');
    }

    loadRealData() {
        const isBg = (window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg') === 'bg';
        const weeks = this._buildWeekOptions(isBg);
        if (!weeks.length) { alert(isBg ? 'Няма планирани ястия.' : 'No meals found.'); return; }
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

    _applyWeekData(startDate, endDate, isBg) {
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
        this.updatePreview();
    }

    loadSampleData() {
        const today = new Date();
        const end = new Date(today);
        end.setDate(today.getDate() + 4);
        this.previewData = {
            startDate: today,
            endDate: end,
            days: [
                { name: 'Понеделник', meals: [{ number: 1, name: 'Супа топчета', portion: '150гр', calories: 129, ingredients: [{ name: 'кайма', hasAllergen: false }, { name: 'яйца', hasAllergen: true }] }, { number: 2, name: 'Пиле с ориз', portion: '200гр', calories: 250, ingredients: [{ name: 'пиле', hasAllergen: false }, { name: 'ориз', hasAllergen: false }] }] },
                { name: 'Вторник', meals: [{ number: 1, name: 'Таратор', portion: '150гр', calories: 100, ingredients: [{ name: 'краставица', hasAllergen: false }, { name: 'кисело мляко', hasAllergen: true }] }, { number: 2, name: 'Мусака', portion: '200гр', calories: 320, ingredients: [{ name: 'картофи', hasAllergen: false }, { name: 'яйца', hasAllergen: true }] }] },
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
        alert(window.t('alert_template_saved') || 'Template saved.');
    }

    reset() {
        if (!confirm(window.t('alert_reset_confirm') || 'Reset template?')) return;
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

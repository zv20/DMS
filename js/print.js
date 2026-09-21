/**
 * Print Menu Function
 * @version 8.5 - Recover when the native print dialog does not report cancel
 */

(function(window) {

    function getLocalDateString(date) {
        const year  = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day   = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function isPackagedAssetPath(filename) {
        return typeof filename === 'string'
            && (filename.startsWith('img/') || filename.startsWith('./img/') || filename.startsWith('/img/'));
    }

    async function blobToDataUrl(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    }

    async function loadBackgroundImageAsBase64(filename) {
        if (!filename) return null;
        if (typeof filename !== 'string') return null;
        if (filename.startsWith('data:')) return filename;

        if (isPackagedAssetPath(filename)) {
            try {
                const normalized = filename.replace(/^\.\//, '').replace(/^\//, '');
                const response = await fetch(normalized);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await blobToDataUrl(await response.blob());
            } catch (err) {
                console.warn('Failed to load packaged background image:', filename, err);
                return null;
            }
        }

        if (window.dmsDesktop?.images?.getDataUrl) {
            try {
                return await window.dmsDesktop.images.getDataUrl('backgrounds', filename);
            } catch (err) {
                console.warn('Failed to load desktop background image:', filename, err);
            }
        }

        return null;
    }

    async function hydrateEditorBlockImages(settings) {
        if (!Array.isArray(settings.editorBlocks) || !window.dmsDesktop?.images?.getDataUrl) return;
        for (const block of settings.editorBlocks) {
            if (block.type !== 'image' || !block.style?.imageName) continue;
            try {
                const dataUrl = await window.dmsDesktop.images.getDataUrl(block.style.imageFolder || 'template-objects', block.style.imageName);
                if (dataUrl) block.style.imageData = dataUrl;
            } catch (err) {
                console.warn('Failed to load template image:', block.style.imageName, err);
            }
        }
    }

    // ─── KEYFRAME INJECTION ───────────────────────────────────────────────
    function injectSpinnerStyle() {
        if (document.getElementById('menu-spin-style')) return;
        const s = document.createElement('style');
        s.id = 'menu-spin-style';
        s.textContent = '@keyframes menu-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }

    // ─── LOADING INDICATOR ───────────────────────────────────────────────
    function showLoadingIndicator(isBg, action) {
        injectSpinnerStyle();
        const overlay = document.createElement('div');
        overlay.id = 'menu-loading-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;';

        const box = document.createElement('div');
        box.style.cssText = 'background:white;border-radius:16px;padding:36px 48px;box-shadow:0 8px 32px rgba(0,0,0,0.25);text-align:center;min-width:260px;';

        const spinner = document.createElement('div');
        spinner.style.cssText = 'width:48px;height:48px;border:5px solid #f0f0f0;border-top-color:#fd7e14;border-radius:50%;animation:menu-spin 0.75s linear infinite;margin:0 auto 18px;';

        const labelMap = {
            image: isBg ? '🖼️ Създаване на изображение...' : '🖼️ Generating preview...',
            pdf:   isBg ? '📄 Генериране на PDF...'        : '📄 Generating preview...'
        };

        const label = document.createElement('div');
        label.style.cssText = 'font-size:1.05rem;font-weight:600;color:#333;margin-bottom:6px;';
        label.textContent = labelMap[action] || (isBg ? 'Моля изчакайте...' : 'Please wait...');

        const sub = document.createElement('div');
        sub.style.cssText = 'font-size:0.85rem;color:#888;';
        sub.textContent = isBg ? 'Моля изчакайте...' : 'Please wait...';

        box.appendChild(spinner);
        box.appendChild(label);
        box.appendChild(sub);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    function hideLoadingIndicator() {
        const el = document.getElementById('menu-loading-overlay');
        if (el) el.parentNode.removeChild(el);
    }

    // ─── PREVIEW MODAL ────────────────────────────────────────────────
    function showPreviewModal(canvas, filename, isBg, action) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background:white;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.35);display:flex;flex-direction:column;max-width:520px;width:100%;max-height:92vh;overflow:hidden;';

            const header = document.createElement('div');
            header.style.cssText = 'padding:16px 20px 12px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
            const title = document.createElement('div');
            title.style.cssText = 'font-weight:700;font-size:1rem;color:#333;';
            const actionIcon  = action === 'image' ? '🖼️' : '📄';
            const actionLabel = action === 'image'
                ? (isBg ? 'Преглед — Изображение' : 'Preview — Image')
                : (isBg ? 'Преглед — PDF' : 'Preview — PDF');
            title.textContent = `${actionIcon} ${actionLabel}`;

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = 'background:none;border:none;font-size:1.2rem;cursor:pointer;color:#888;padding:0 4px;line-height:1;';
            closeBtn.onclick = () => { document.body.removeChild(overlay); resolve(false); };

            header.appendChild(title);
            header.appendChild(closeBtn);

            const fileLabel = document.createElement('div');
            fileLabel.style.cssText = 'padding:6px 20px;font-size:0.8rem;color:#aaa;flex-shrink:0;';
            fileLabel.textContent = filename;

            const previewWrap = document.createElement('div');
            previewWrap.style.cssText = 'flex:1;overflow-y:auto;padding:12px 20px;background:#f5f5f5;display:flex;align-items:flex-start;justify-content:center;';

            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.style.cssText = 'width:100%;border:1px solid #ddd;border-radius:4px;box-shadow:0 2px 12px rgba(0,0,0,0.12);display:block;';
            previewWrap.appendChild(img);

            const footer = document.createElement('div');
            footer.style.cssText = 'padding:14px 20px;border-top:1px solid #eee;display:flex;gap:10px;flex-shrink:0;';

            const dlBtn = document.createElement('button');
            dlBtn.style.cssText = 'flex:1;padding:12px;background:#fd7e14;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;';
            dlBtn.textContent = isBg ? '⬇️ Изтегляне' : '⬇️ Download';
            dlBtn.onclick = () => { document.body.removeChild(overlay); resolve(true); };

            const cancelBtn = document.createElement('button');
            cancelBtn.style.cssText = 'padding:12px 20px;background:#e9ecef;color:#555;border:none;border-radius:8px;font-size:1rem;cursor:pointer;';
            cancelBtn.textContent = isBg ? 'Отказ' : 'Cancel';
            cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(false); };

            footer.appendChild(dlBtn);
            footer.appendChild(cancelBtn);
            modal.appendChild(header);
            modal.appendChild(fileLabel);
            modal.appendChild(previewWrap);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        });
    }

    // ─── CANVAS RENDERER (shared by image + pdf) ─────────────────────────────────
    function fitPrintedDayBlocks(root) {
        root.querySelectorAll('[data-print-day-card]').forEach(card => {
            card.style.transform = '';
            card.style.transformOrigin = '';
            card.style.width = '';
            card.style.height = '';
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

    async function renderToCanvas(html, usableH, usableW) {
        if (!window.html2canvas) throw new Error('html2canvas not loaded');
        const container = document.createElement('div');
        container.style.cssText = `width:${usableW}px;height:${usableH}px;position:absolute;top:0;left:-9999px;overflow:hidden;background:white;`;
        container.innerHTML = html;
        document.body.appendChild(container);
        try {
            fitPrintedDayBlocks(container);
            return await window.html2canvas(container.querySelector('#menu-content') || container, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width:  usableW,
                height: usableH
            });
        } finally {
            document.body.removeChild(container);
        }
    }

    // ─── SAFE BOTTOM BUFFER (mm) ───────────────────────────────────────────────
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const A4_WIDTH_PX = 794;
    const A4_HEIGHT_PX = 1123;

    const DESKTOP_PRINT_TIMEOUT_MS = 15000;

    // ─── MAIN ENTRY POINT ────────────────────────────────────────────────────
    window.printMenu = async function() {
        if (window.__dmsPrintInProgress) return;
        window.__dmsPrintInProgress = true;
        try {
        const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const isBg = lang === 'bg';

        const weekEntries = buildWeekOptions(isBg);
        if (!weekEntries.length) {
            await window.dmsAlert(isBg
                ? 'Няма планирани ястия. Добавете ястия в менюто, за да използвате печат.'
                : 'No meals planned. Add meals to the menu before printing.', { title: window.t('dialog_error_title') });
            return;
        }

        const choice = await showPrintDialog(weekEntries, isBg);
        if (!choice) return;

        const mealPlanData = generateMealPlanData(choice.startDate, choice.endDate);
        if (!mealPlanData.days.some(day => day.meals.length > 0)) {
            await window.dmsAlert(isBg ? 'Няма планирани ястия за избраната седмица!' : 'No meals planned for the selected week!', { title: window.t('dialog_error_title') });
            return;
        }

        let settings = choice.templateType === 'default' ? getDefaultSettings() : choice.templateSettings;

        if (settings.backgroundImages && Array.isArray(settings.backgroundImages)) {
            for (const imgSlot of settings.backgroundImages) {
                if (imgSlot.image) {
                    const b64 = await loadBackgroundImageAsBase64(imgSlot.image);
                    if (b64) imgSlot.imageData = b64;
                }
            }
        } else if (settings.backgroundImage) {
            const b64 = await loadBackgroundImageAsBase64(settings.backgroundImage);
            if (b64) settings.backgroundImageData = b64;
        }
        await hydrateEditorBlockImages(settings);

        const usableH = A4_HEIGHT_PX;
        const usableW = A4_WIDTH_PX;
        const html    = renderMenuHTML(mealPlanData, settings, usableH);
        const ds      = getLocalDateString(mealPlanData.startDate);

        // ─── PRINT ──────────────────────────────────────────────────────────
        if (choice.action === 'print') {
            await openPrintWindow(html, mealPlanData, usableH, usableW);
            return;
        }

        // ─── SAVE IMAGE or SAVE PDF ───────────────────────────────────────
        showLoadingIndicator(isBg, choice.action);
        let canvas;
        try {
            canvas = await renderToCanvas(html, usableH, usableW);
        } catch (err) {
            hideLoadingIndicator();
            console.error('Render failed:', err);
            await window.dmsAlert(isBg ? 'Грешка при генериране. Моля опитайте отново.' : 'Render failed. Please try again.', { title: window.t('dialog_error_title') });
            return;
        }
        hideLoadingIndicator();

        const filename = choice.action === 'image'
            ? `Weekly-Menu-${ds}.png`
            : `Weekly-Menu-${ds}.pdf`;

        const confirmed = await showPreviewModal(canvas, filename, isBg, choice.action);
        if (!confirmed) return;

        if (choice.action === 'image') {
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a   = document.createElement('a');
                a.href = url; a.download = filename; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }, 'image/png');
        } else {
            if (!window.jspdf && !window.jsPDF) {
                await window.dmsAlert(isBg ? 'jsPDF не е зареден.' : 'jsPDF library not loaded.', { title: window.t('dialog_error_title') });
                return;
            }
            const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, '', 'FAST');
            pdf.save(filename);
        }
        } finally {
            window.__dmsPrintInProgress = false;
        }
    };

    // ─── PRINT WINDOW ────────────────────────────────────────────────────────
    function openPrintWindow(html, mealPlanData, usableH, usableW) {
        const ds = `${mealPlanData.startDate.getDate()}.${mealPlanData.startDate.getMonth()+1}-${mealPlanData.endDate.getDate()}.${mealPlanData.endDate.getMonth()+1}.${mealPlanData.startDate.getFullYear()}`;
        const title = 'Weekly-Menu-' + ds;

        if (window.dmsDesktop && window.dmsDesktop.print && window.dmsDesktop.print.menu) {
            const printTask = window.dmsDesktop.print.menu({ title, html, usableH, usableW });
            const unlockTask = new Promise(resolve => {
                setTimeout(() => resolve(false), DESKTOP_PRINT_TIMEOUT_MS);
            });

            return Promise.race([printTask, unlockTask])
                .then(result => {
                    if (result === false) console.info('Desktop print cancelled or timed out.');
                })
                .catch(error => {
                    console.error('Desktop print failed:', error);
                    const message = error && error.message ? error.message : String(error || '');
                    window.dmsAlert?.(message
                        ? `Print failed: ${message}\n\nYou can still save as PDF if needed.`
                        : 'Print failed. You can still save as PDF if needed.', { title: window.t('dialog_error_title') });
                });
            return;
        }

        const pw = window.open('', '_blank');
        if (!pw) {
            window.dmsAlert?.('Pop-up blocked. Please allow pop-ups for this site and try again.', { title: window.t('dialog_error_title') });
            return;
        }
        pw.document.write(
            '<!DOCTYPE html><html><head><title>' + title + '</title><meta charset="UTF-8">' +
            '<style>' +
            '* { margin:0; padding:0; box-sizing:border-box; }' +
            'body { font-family:Arial,sans-serif; font-size:10px; line-height:1.2; color:#333; background:#bbb; }' +
            '@media screen { #page-wrapper { background:white; width:' + usableW + 'px; height:' + usableH + 'px; margin:20px auto; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.35); } }' +
            '@page { size:A4 portrait; margin:0; }' +
            '@media print {' +
            '  html, body { height:100%; background:white; overflow:hidden; }' +
            '  #page-wrapper { height:100%; padding:0; margin:0; box-shadow:none; overflow:hidden; }' +
            '  #menu-content { height:100% !important; overflow:hidden !important; }' +
            '  * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }' +
            '}' +
            '</style></head><body>' +
            '<div id="page-wrapper">' + html + '</div>' +
            '<scr' + 'ipt>' +
            'window.addEventListener("afterprint", function() { window.close(); });' +
            'window.onload = function() {' +
            '  setTimeout(function() {' +
            '    var c = document.getElementById("menu-content");' +
            '    document.querySelectorAll("[data-print-day-card]").forEach(function(card){ card.style.transform=""; card.style.transformOrigin=""; card.style.width=""; card.style.height=""; var ah=card.clientHeight, ch=card.scrollHeight; if(ah && ch>ah){ var s=Math.max(0.35, Math.min(1, ah/ch)); card.style.transform="scale("+s.toFixed(4)+")"; card.style.transformOrigin="top left"; card.style.width=(100/s).toFixed(4)+"%"; card.style.height=(100/s).toFixed(4)+"%"; } });' +
            '    if (c) { var ph = ' + usableH + ', ch = c.scrollHeight; if (ch > ph * 1.01) { var zf = ph / ch; if (zf < 1) c.style.zoom = Math.max(0.5, zf).toFixed(4); } }' +
            '    setTimeout(function() { window.print(); }, 600);' +
            '  }, 800);' +
            '};' +
            '<\/scr' + 'ipt>' +
            '</body></html>'
        );
        pw.document.close();
    }

    // ─── WEEK OPTIONS ────────────────────────────────────────────────────────
    function buildWeekOptions(isBg) {
        const menu = window.currentMenu || {};
        const mondaySet = new Set();
        Object.keys(menu).forEach(dateStr => {
            const dayData  = menu[dateStr];
            const hasMeals = dayData && Object.values(dayData).some(slot => slot && slot.recipe);
            if (hasMeals) {
                const d      = new Date(dateStr + 'T00:00:00');
                const monday = getWeekDates(d)[0];
                mondaySet.add(getLocalDateString(monday));
            }
        });
        if (!mondaySet.size) return [];

        const today            = new Date(); today.setHours(0,0,0,0);
        const currentMondayStr = getLocalDateString(getWeekDates(today)[0]);
        const nextMondayStr    = getLocalDateString(getWeekDates(addDays(today, 7))[0]);

        return Array.from(mondaySet).sort().map(mondayStr => {
            const monday = new Date(mondayStr + 'T00:00:00');
            const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
            const icon   = '\uD83C\uDF7D\uFE0F';
            let label;
            if      (mondayStr === currentMondayStr) label = `${icon} ${isBg ? 'Тази седмица' : 'This Week'} — ${formatDateRange(monday, friday)}`;
            else if (mondayStr === nextMondayStr)    label = `${icon} ${isBg ? 'Следваща седмица' : 'Next Week'} — ${formatDateRange(monday, friday)}`;
            else                                     label = `${icon} ${formatDateRange(monday, friday)}`;
            return { mondayStr, monday, friday, label, isCurrent: mondayStr === currentMondayStr };
        });
    }

    // ─── PRINT DIALOG ────────────────────────────────────────────────────────
    function showPrintDialog(weekEntries, isBg) {
        return new Promise((resolve) => {
            const savedTemplates = window.menuTemplates || {};
            const templateNames  = Object.keys(savedTemplates);

            let templateOptions = `<option value="default">${isBg ? '🎨 Стандартен шаблон' : '🎨 Default Template'}</option>`;
            templateNames.forEach(name => {
                const t = savedTemplates[name];
                let sl  = isBg ? 'Компактен' : 'Compact';
                if (t.templateStyle === 'detailed')      sl = isBg ? 'Детайлен' : 'Detailed';
                if (t.templateStyle === 'detailed-2col') sl = isBg ? 'Детайлен (2 колони)' : 'Detailed (2 columns)';
                templateOptions += `<option value="${name}">📋 ${name} — ${sl}</option>`;
            });

            const currentEntry    = weekEntries.find(e => e.isCurrent) || weekEntries[0];
            const weekOptionsHTML = weekEntries.map(e =>
                `<option value="${e.mondayStr}"${e.mondayStr === currentEntry.mondayStr ? ' selected' : ''}>${e.label}</option>`
            ).join('');

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:white;padding:30px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.2);min-width:380px;max-width:480px;width:90vw;';

            const ss = 'width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;';
            const ls = 'display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;';

            dialog.innerHTML = `
                <h2 style="margin:0 0 22px 0;color:#333;font-size:1.3rem;">🖨️ ${isBg ? 'Меню — изход' : 'Menu — Export'}</h2>
                <div style="margin-bottom:18px;">
                    <label style="${ls}">📅 ${isBg ? 'Седмица' : 'Week'}</label>
                    <select id="pd-week" style="${ss}">${weekOptionsHTML}</select>
                </div>
                <div style="margin-bottom:26px;">
                    <label style="${ls}">🎨 ${isBg ? 'Шаблон' : 'Template'}</label>
                    <select id="pd-template" style="${ss}">${templateOptions}</select>
                </div>
                <div style="margin-bottom:10px;display:flex;gap:8px;">
                    <button id="pd-print" style="flex:1;padding:11px 6px;background:#fd7e14;color:white;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖨️ ${isBg ? 'Печат' : 'Print'}</button>
                    <button id="pd-image" style="flex:1;padding:11px 6px;background:#fd7e14;color:white;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🖼️ ${isBg ? 'Като изобр.' : 'Save Image'}</button>
                    <button id="pd-pdf"   style="flex:1;padding:11px 6px;background:#fd7e14;color:white;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">📄 ${isBg ? 'Като PDF' : 'Save PDF'}</button>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                    <button id="pd-cancel" style="padding:9px 18px;background:#e9ecef;color:#555;border:none;border-radius:8px;font-size:0.9rem;cursor:pointer;">${isBg ? 'Отказ' : 'Cancel'}</button>
                </div>`;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            function close() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }

            function pick(action) {
                const mondayStr = dialog.querySelector('#pd-week').value;
                const tplVal    = dialog.querySelector('#pd-template').value;
                const entry     = weekEntries.find(e => e.mondayStr === mondayStr);
                close();
                resolve({
                    action,
                    startDate:        entry.monday,
                    endDate:          entry.friday,
                    templateType:     tplVal === 'default' ? 'default' : 'saved',
                    templateSettings: tplVal !== 'default' ? savedTemplates[tplVal] : null,
                    margins:          null
                });
            }

            dialog.querySelector('#pd-print') .addEventListener('click', () => pick('print'));
            dialog.querySelector('#pd-image') .addEventListener('click', () => pick('image'));
            dialog.querySelector('#pd-pdf')   .addEventListener('click', () => pick('pdf'));
            dialog.querySelector('#pd-cancel').addEventListener('click', () => { close(); resolve(null); });
            overlay.addEventListener('click', event => {
                if (event.target === overlay) {
                    close();
                    resolve(null);
                }
            });
        });
    }

    // ─── DEFAULT SETTINGS ────────────────────────────────────────────────
    function getDefaultSettings() {
        return {
            templateStyle:    'compact',
            backgroundColor:  '#ffffff',
            backgroundImages: [
                { image: null, position: 'center',       size: 100, opacity: 1.0, zIndex: 1 },
                { image: null, position: 'top-left',     size: 20,  opacity: 1.0, zIndex: 2 },
                { image: null, position: 'top-right',    size: 20,  opacity: 1.0, zIndex: 3 },
                { image: null, position: 'bottom-left',  size: 20,  opacity: 1.0, zIndex: 4 },
                { image: null, position: 'bottom-right', size: 20,  opacity: 1.0, zIndex: 5 }
            ],
            showHeader:        true,
            headerText:        'Седмично м<font color="#54963c">е</font><font color="#e50606">н</font><font color="#030202">ю</font>',
            headerAlignment:   'center',
            headerFontSize:    24,
            headerColor:       '#d2691e',
            headerFontFamily:  'Arial, sans-serif',
            showDateRange:     true,
            dateFontSize:      22,
            dateColor:         '#666666',
            dateAlignment:     'center',
            dateFontFamily:    'Arial, sans-serif',
            dateFormat:        'dd.mm_range_year',
            showIngredients:   true,
            showCalories:      true,
            showPortions:      true,
            dayBorder:          true,
            dayBorderStyle:     'solid',
            dayBorderColor:     '#e0e0e0',
            dayBorderThickness: '1px',
            dayBackground:     'transparent',
            dayNameSize:       40,
            dayNameColor:      '#d2691e',
            dayNameWeight:     'bold',
            dayNameFontFamily: 'Arial, sans-serif',
            mealFontSize:      28,
            mealFontFamily:    'Arial, sans-serif',
            allergenColor:     '#ff0000',
            allergenBold:      true,
            allergenUnderline: false,
            showFooter:        true,
            footerText:        '<div>Алергените са подчертани.</div><div>Менюто е съобразено с изискванията на Наредба Nº 37, Наредба Nº9 на МЗХ и Рецептурника за&nbsp;<span style="font-size: 8pt;">ученическо столово хранене</span></div><div>Менютата са изготвени съгласно Сборник рецепти за ученически столове и бюфети от 2012г.</div><div>Менюто е съгласувано с мед.лице - Елиза Дамянова.</div><div><font color="#ff0000">Менюто може да претърпи промени, поради независещи от нас&nbsp;</font><span style="color: rgb(255, 0, 0); font-size: 8pt;">причини,за което се извиняваме предварително</span></div>',
            footerAlignment:   'center',
            footerFontSize:    8,
            footerFontFamily:  'Arial, sans-serif',
            editorBlocks: [
                { id: 'header', type: 'text', label: 'Header', visible: true, locked: false, x: 8, y: 4, width: 84, height: 9, zIndex: 30, style: { html: 'Седмично м<font color="#54963c">е</font><font color="#e50606">н</font><font color="#030202">ю</font>', fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#d2691e', align: 'center', bold: true, italic: false, underline: false } },
                { id: 'date', type: 'date', label: 'Date Range', visible: true, locked: false, x: 24, y: 8, width: 52, height: 5, zIndex: 30, style: { fontFamily: 'Arial, sans-serif', fontSize: 22, color: '#666666', align: 'center', bold: false, italic: false, underline: false, dateFormat: 'dd.mm_range_year' } },
                { id: 'day-0', type: 'day', label: 'Понеделник', visible: true, locked: false, x: 6, y: 14, width: 88, height: 14, zIndex: 30, style: { dayIndex: 0, dayTitle: 'Понеделник', dayNameFontFamily: 'Arial, sans-serif', dayNameSize: 40, dayNameColor: '#d2691e', dayNameWeight: 'bold', dayBackground: 'transparent', dayBorderEnabled: true, dayBorderColor: '#e0e0e0', dayBorderWidth: '1px', dayBorderStyle: 'solid', fontFamily: 'Arial, sans-serif', fontSize: 28, color: '#222222', align: 'left', lineHeight: 1.2, backgroundColor: 'transparent' } },
                { id: 'day-1', type: 'day', label: 'Вторник', visible: true, locked: false, x: 6, y: 28, width: 88, height: 16, zIndex: 30, style: { dayIndex: 1, dayTitle: 'Вторник', dayNameFontFamily: 'Arial, sans-serif', dayNameSize: 40, dayNameColor: '#d2691e', dayNameWeight: 'bold', dayBackground: 'transparent', dayBorderEnabled: true, dayBorderColor: '#e0e0e0', dayBorderWidth: '1px', dayBorderStyle: 'solid', fontFamily: 'Arial, sans-serif', fontSize: 28, color: '#222222', align: 'left', lineHeight: 1.2, backgroundColor: 'transparent' } },
                { id: 'day-2', type: 'day', label: 'Сряда', visible: true, locked: false, x: 6, y: 42, width: 90, height: 18, zIndex: 30, style: { dayIndex: 2, dayTitle: 'Сряда', dayNameFontFamily: 'Arial, sans-serif', dayNameSize: 40, dayNameColor: '#d2691e', dayNameWeight: 'bold', dayBackground: 'transparent', dayBorderEnabled: true, dayBorderColor: '#e0e0e0', dayBorderWidth: '1px', dayBorderStyle: 'solid', fontFamily: 'Arial, sans-serif', fontSize: 28, color: '#222222', align: 'left', lineHeight: 1.2, backgroundColor: 'transparent' } },
                { id: 'day-3', type: 'day', label: 'Четвъртък', visible: true, locked: false, x: 6, y: 58, width: 90, height: 16, zIndex: 30, style: { dayIndex: 3, dayTitle: 'Четвъртък', dayNameFontFamily: 'Arial, sans-serif', dayNameSize: 40, dayNameColor: '#d2691e', dayNameWeight: 'bold', dayBackground: 'transparent', dayBorderEnabled: true, dayBorderColor: '#e0e0e0', dayBorderWidth: '1px', dayBorderStyle: 'solid', fontFamily: 'Arial, sans-serif', fontSize: 28, color: '#222222', align: 'left', lineHeight: 1.2, backgroundColor: 'transparent' } },
                { id: 'day-4', type: 'day', label: 'Петък', visible: true, locked: false, x: 6, y: 74, width: 88, height: 16, zIndex: 30, style: { dayIndex: 4, dayTitle: 'Петък', dayNameFontFamily: 'Arial, sans-serif', dayNameSize: 40, dayNameColor: '#d2691e', dayNameWeight: 'bold', dayBackground: 'transparent', dayBorderEnabled: true, dayBorderColor: '#e0e0e0', dayBorderWidth: '1px', dayBorderStyle: 'solid', fontFamily: 'Arial, sans-serif', fontSize: 28, color: '#222222', align: 'left', lineHeight: 1.2, backgroundColor: 'transparent' } },
                { id: 'footer', type: 'text', label: 'Footer', visible: true, locked: false, x: 0, y: 88, width: 100, height: 12, zIndex: 30, style: { html: '<div>Алергените са подчертани.</div><div>Менюто е съобразено с изискванията на Наредба Nº 37, Наредба Nº9 на МЗХ и Рецептурника за&nbsp;<span style="font-size: 8pt;">ученическо столово хранене</span></div><div>Менютата са изготвени съгласно Сборник рецепти за ученически столове и бюфети от 2012г.</div><div>Менюто е съгласувано с мед.лице - Елиза Дамянова.</div><div><font color="#ff0000">Менюто може да претърпи промени, поради независещи от нас&nbsp;</font><span style="color: rgb(255, 0, 0); font-size: 8pt;">причини,за което се извиняваме предварително</span></div>', fontFamily: 'Arial, sans-serif', fontSize: 8, color: '#777777', align: 'center', bold: false, italic: false, underline: false } }
            ]
        };
    }

    // ─── MEAL PLAN DATA ───────────────────────────────────────────────────
    function generateMealPlanData(startDate, endDate) {
        const days     = [];
        const lang     = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const dayNames = lang === 'bg'
            ? ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        for (let i = 0; i < 5; i++) {
            const d       = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = getLocalDateString(d);
            const dayMenu = window.getMenuForDate(dateStr);
            const meals = [];
            ['slot1','slot2','slot3','slot4'].forEach((slotId, idx) => {
                const slot   = dayMenu[slotId];
                const recipe = slot && slot.recipe ? window.recipes.find(r => r.id === slot.recipe) : null;
                if (recipe) {
                    const ingredientsData = (recipe.ingredients || []).map(ingObj => {
                        const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                        const ing   = window.ingredients.find(i => i.id === ingId);
                        if (!ing) return null;
                        return { name: ing.name, hasAllergen: ing.allergens && ing.allergens.length > 0 };
                    }).filter(Boolean);
                    meals.push({ number: idx + 1, name: recipe.name, portion: recipe.portionSize || '', calories: recipe.calories || null, ingredients: ingredientsData });
                }
            });
            days.push({ name: dayNames[i], meals, date: dateStr });
        }
        return { startDate, endDate, days };
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────────
    function normSize(v, fallback) {
        if (!v && v !== 0) return fallback;
        return /^\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}pt` : String(v);
    }
    function ff(s, key) { return s[key] || s.fontFamily || 'Arial, sans-serif'; }
    function getPositionCSS(pos) {
        const map = { 'center':'center center','top-left':'top left','top-center':'top center','top-right':'top right','center-left':'center left','center-right':'center right','bottom-left':'bottom left','bottom-center':'bottom center','bottom-right':'bottom right' };
        return map[pos] || 'center center';
    }
    function getSizeCSS(size) { return typeof size === 'number' ? `${size}% auto` : (size || 'cover'); }
    function addBgLayers(html, s) {
        if (s.backgroundImages && Array.isArray(s.backgroundImages)) {
            s.backgroundImages.filter(img => img.image && img.imageData).sort((a,b) => a.zIndex - b.zIndex).forEach(img => {
                html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:url('${img.imageData}');background-size:${getSizeCSS(img.size)};background-position:${getPositionCSS(img.position)};background-repeat:no-repeat;opacity:${img.opacity};z-index:${img.zIndex};pointer-events:none;"></div>`;
            });
        } else if (s.backgroundImageData) {
            html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:url('${s.backgroundImageData}');background-size:cover;background-position:center;background-repeat:no-repeat;opacity:1;z-index:1;pointer-events:none;"></div>`;
        }
        return html;
    }
    function renderIngHtml(meal, s) {
        if (!s.showIngredients || !meal.ingredients || !meal.ingredients.length) return '';
        return meal.ingredients.map(ing => {
            if (!ing.hasAllergen) return ing.name;
            let st = `color:${s.allergenColor};`;
            if (s.allergenBold)      st += 'font-weight:bold;';
            if (s.allergenUnderline) st += 'text-decoration:underline;';
            return `<span style="${st}">${ing.name}</span>`;
        }).join(', ');
    }

    function blockStyle(block, style) {
        const st = style || {};
        const borderWidth = parseInt(st.borderWidth ?? 0, 10) || 0;
        const border = st.borderEnabled && borderWidth > 0
            ? `border:${borderWidth}px solid ${st.borderColor || '#d8dee5'}`
            : 'border:1px solid transparent';
        return [
            'position:absolute',
            `left:${block.x || 0}%`,
            `top:${block.y || 0}%`,
            `width:${block.width || 20}%`,
            `height:${block.height || 8}%`,
            `z-index:${block.zIndex || 30}`,
            'box-sizing:border-box',
            'overflow:hidden',
            'padding:8px',
            border,
            `font-family:${st.fontFamily || 'Arial, sans-serif'}`,
            `font-size:${normSize(st.fontSize || 12, '12pt')}`,
            `color:${st.color || '#222222'}`,
            `text-align:${st.align || 'left'}`,
            `font-weight:${st.bold ? '700' : '400'}`,
            `font-style:${st.italic ? 'italic' : 'normal'}`,
            `text-decoration:${st.underline ? 'underline' : 'none'}`,
            `line-height:${st.lineHeight || 1.2}`,
            st.backgroundColor && st.backgroundColor !== 'transparent' ? `background:${st.backgroundColor}` : ''
        ].join(';');
    }

    function renderEditorMealLine(meal, s) {
        const ingHtml = renderIngHtml(meal, s);
        let html = `<p style="margin:0 0 4px;line-height:1.24;"><strong>${meal.number}. ${meal.name}`;
        if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
        html += `</strong>`;
        if (ingHtml) html += `<br><span style="color:#555;font-style:italic;">${ingHtml}</span>`;
        if (s.showCalories && meal.calories) html += ` <span style="color:#555;font-size:.92em;">ККАЛ ${meal.calories}</span>`;
        html += `</p>`;
        return html;
    }

    function renderEditorMenuBlock(data, s) {
        const dys = normSize(s.dayNameSize, '12pt');
        const ms = normSize(s.mealFontSize, '10pt');
        const dyff = ff(s, 'dayNameFontFamily');
        const mff = ff(s, 'mealFontFamily');
        const columns = (s.templateStyle || 'compact') === 'detailed-2col';
        const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
        const bg = s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
        return `<div style="display:${columns ? 'grid' : 'flex'};${columns ? 'grid-template-columns:1fr 1fr;' : 'flex-direction:column;'}gap:7px;font-family:${mff};font-size:${ms};">
            ${data.days.map(day => `
                <section style="${brd}${bg}padding:7px;border-radius:3px;break-inside:avoid;">
                    <h3 style="margin:0 0 4px;line-height:1.1;font-family:${dyff};font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};">${day.name}</h3>
                    ${day.meals.map(meal => renderEditorMealLine(meal, s)).join('')}
                </section>
            `).join('')}
        </div>`;
    }

    function renderEditorDayBlock(block, data, s) {
        const day = data.days[block.style?.dayIndex || 0];
        if (!day) return '';
        const st = block.style || {};
        const title = st.dayTitle || block.label || day.name;
        const dys = normSize(st.dayNameSize || s.dayNameSize, '12pt');
        const dyff = st.dayNameFontFamily || ff(s, 'dayNameFontFamily');
        const borderEnabled = st.dayBorderEnabled ?? s.dayBorder;
        const brd = borderEnabled ? `border:${st.dayBorderWidth||s.dayBorderThickness||'1px'} ${st.dayBorderStyle||s.dayBorderStyle||'solid'} ${st.dayBorderColor||s.dayBorderColor||'#e0e0e0'};` : '';
        const dayBackground = st.dayBackground ?? s.dayBackground;
        const bg = dayBackground && dayBackground !== 'transparent' ? `background:${dayBackground};` : '';
        const titleColor = st.dayNameColor || s.dayNameColor || '#d2691e';
        const titleWeight = st.dayNameWeight || s.dayNameWeight || 'bold';
        return `<section data-print-day-card style="${brd}${bg}padding:7px;border-radius:3px;height:100%;box-sizing:border-box;overflow:hidden;">
            <h3 style="margin:0 0 4px;line-height:1.1;font-family:${dyff};font-size:${dys};color:${titleColor};font-weight:${titleWeight};">${title}</h3>
            ${day.meals.map(meal => renderEditorMealLine(meal, s)).join('')}
        </section>`;
    }

    function renderEditorBlockContent(block, data, s) {
        if (block.type === 'date') return fmtDateRange(data.startDate, data.endDate, block.style?.dateFormat || s.dateFormat);
        if (block.type === 'menu') return renderEditorMenuBlock(data, s);
        if (block.type === 'day') return renderEditorDayBlock(block, data, s);
        if (block.type === 'image') return `<img src="${block.style?.imageData || block.style?.src || ''}" style="display:block;width:100%;height:100%;object-fit:${block.style?.fit || 'contain'};opacity:${block.style?.opacity ?? 1};">`;
        if (block.type === 'shape') return `<div style="width:100%;height:100%;box-sizing:border-box;background:${block.style?.fill || '#f8f9fb'};border:${block.style?.strokeWidth ?? 1}px solid ${block.style?.stroke || '#1f2933'};opacity:${block.style?.opacity ?? 1};"></div>`;
        return block.style?.html || '';
    }

    function renderEditorBlocksHTML(data, s, usableH) {
        const hStyle = usableH ? `height:${usableH}px;` : 'min-height:100%;';
        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:0;${hStyle}overflow:hidden;">`;
        html = addBgLayers(html, s);
        html += `<div style="position:absolute;inset:0;z-index:10;">`;
        s.editorBlocks.filter(block => block.visible !== false).sort((a, b) => (a.zIndex || 30) - (b.zIndex || 30)).forEach(block => {
            html += `<div style="${blockStyle(block, block.style)}">${renderEditorBlockContent(block, data, s)}</div>`;
        });
        html += `</div></div>`;
        return html;
    }

    // ─── RENDER ─────────────────────────────────────────────────────────────────
    function renderMenuHTML(data, s, usableH) {
        if (Array.isArray(s.editorBlocks) && s.editorBlocks.length) return renderEditorBlocksHTML(data, s, usableH);
        if ((s.templateStyle || 'compact') === 'detailed-2col') return renderMenuHTML2Column(data, s, usableH);
        const { startDate, endDate, days } = data;
        const isCompact = (s.templateStyle || 'compact') === 'compact';
        const lh   = isCompact ? '1.15' : '1.2';
        const dr   = fmtDateRange(startDate, endDate, s.dateFormat);
        const hs   = normSize(s.headerFontSize,  '20pt');
        const dys  = normSize(s.dayNameSize,      '12pt');
        const ms   = normSize(s.mealFontSize,     '10pt');
        const fs   = normSize(s.footerFontSize,   '8pt');
        const dss  = normSize(s.dateFontSize,     '9pt');
        const hff  = ff(s, 'headerFontFamily');
        const dff  = ff(s, 'dateFontFamily');
        const dyff = ff(s, 'dayNameFontFamily');
        const mff  = ff(s, 'mealFontFamily');
        const fff  = ff(s, 'footerFontFamily');
        const hStyle = usableH ? `height:${usableH}px;` : '';

        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:0;${hStyle}display:flex;flex-direction:column;">`;
        html = addBgLayers(html, s);
        html += `<div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">`;
        html += `<div>`;
        if (s.showHeader)    html += `<div style="text-align:${s.headerAlignment||'center'};padding-top:4px;margin-bottom:2px;"><span style="font-family:${hff};font-size:${hs};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="font-family:${dff};text-align:${s.dateAlignment||'center'};margin-bottom:4px;font-size:${dss};color:${s.dateColor||'#555555'};">${dr}</div>`;
        html += `</div>`;
        html += `<div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">`;
        days.forEach(day => {
            const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const bg  = s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            html += `<div style="${brd}${bg}padding:4px 6px;border-radius:3px;">`;
            html += `<div style="font-family:${dyff};font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:1px;">${day.name}</div>`;
            day.meals.forEach(meal => {
                const ingHtml = renderIngHtml(meal, s);
                if (isCompact) {
                    html += `<div style="font-family:${mff};margin-left:8px;font-size:${ms};line-height:${lh};"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    if (ingHtml) html += `; ${ingHtml}`;
                    if (s.showCalories && meal.calories) html += ` ККАЛ ${meal.calories}`;
                    html += `</div>`;
                } else {
                    html += `<div style="margin-left:8px;">`;
                    html += `<div style="font-family:${mff};font-size:${ms};line-height:${lh};font-weight:500;"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    html += `</div>`;
                    if (ingHtml) {
                        html += `<div style="font-family:${mff};font-size:${ms};line-height:${lh};margin-left:12px;color:#555;font-style:italic;">${ingHtml}`;
                        if (s.showCalories && meal.calories) html += ` - ККАЛ ${meal.calories}`;
                        html += `</div>`;
                    } else if (s.showCalories && meal.calories) {
                        html += `<div style="font-family:${mff};font-size:${ms};line-height:${lh};margin-left:12px;color:#555;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                    }
                    html += `</div>`;
                }
            });
            html += `</div>`;
        });
        html += `</div>`;
        if (s.showFooter) html += `<div style="font-family:${fff};text-align:${s.footerAlignment||'center'};padding:4px 0 2px;border-top:1px solid #ddd;font-size:${fs};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        return html;
    }

    function renderMenuHTML2Column(data, s, usableH) {
        const { startDate, endDate, days } = data;
        const dr   = fmtDateRange(startDate, endDate, s.dateFormat);
        const hs   = normSize(s.headerFontSize, '20pt');
        const dys  = normSize(s.dayNameSize,    '12pt');
        const ms   = normSize(s.mealFontSize,   '10pt');
        const fs   = normSize(s.footerFontSize, '8pt');
        const dss  = normSize(s.dateFontSize,   '9pt');
        const hff  = ff(s, 'headerFontFamily');
        const dff  = ff(s, 'dateFontFamily');
        const dyff = ff(s, 'dayNameFontFamily');
        const mff  = ff(s, 'mealFontFamily');
        const fff  = ff(s, 'footerFontFamily');
        const hStyle = usableH ? `height:${usableH}px;` : '';

        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:0;${hStyle}display:flex;flex-direction:column;">`;
        html = addBgLayers(html, s);
        html += `<div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">`;
        html += `<div>`;
        if (s.showHeader)    html += `<div style="text-align:${s.headerAlignment||'center'};padding-top:4px;margin-bottom:2px;"><span style="font-family:${hff};font-size:${hs};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="font-family:${dff};text-align:${s.dateAlignment||'center'};margin-bottom:4px;font-size:${dss};color:${s.dateColor||'#555555'};">${dr}</div>`;
        html += `</div>`;
        const rows = [];
        for (let i = 0; i < days.length; i += 2) rows.push([days[i], days[i+1] || null]);
        html += `<div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">`;
        const renderDay = (day) => {
            if (!day) return `<div style="flex:1;"></div>`;
            const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const bg  = s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            let d = `<div style="flex:1;${brd}${bg}padding:4px 6px;border-radius:3px;">`;
            d += `<div style="font-family:${dyff};font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:1px;">${day.name}</div>`;
            day.meals.forEach(meal => {
                const ingHtml = renderIngHtml(meal, s);
                d += `<div style="margin-left:8px;">`;
                d += `<div style="font-family:${mff};font-size:${ms};line-height:1.2;font-weight:500;"> ${meal.number}. ${meal.name}`;
                if (s.showPortions && meal.portion) d += ` - ${meal.portion}`;
                d += `</div>`;
                if (ingHtml) {
                    d += `<div style="font-family:${mff};font-size:${ms};line-height:1.2;margin-left:12px;color:#555;font-style:italic;">${ingHtml}`;
                    if (s.showCalories && meal.calories) d += ` - ККАЛ ${meal.calories}`;
                    d += `</div>`;
                } else if (s.showCalories && meal.calories) {
                    d += `<div style="font-family:${mff};font-size:${ms};line-height:1.2;margin-left:12px;color:#555;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                }
                d += `</div>`;
            });
            d += `</div>`;
            return d;
        };
        rows.forEach(([a, b]) => { html += `<div style="display:flex;gap:8px;">${renderDay(a)}${renderDay(b)}</div>`; });
        html += `</div>`;
        if (s.showFooter) html += `<div style="font-family:${fff};text-align:${s.footerAlignment||'center'};padding:4px 0 2px;border-top:1px solid #ddd;font-size:${fs};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        return html;
    }

    // ─── DATE / WEEK HELPERS ────────────────────────────────────────────────────────
    function getWeekDates(date) {
        const d = new Date(date), day = d.getDay(), mon = new Date(d);
        mon.setDate(d.getDate() + (day === 0 ? 1 : -(day - 1))); mon.setHours(0,0,0,0);
        return Array.from({ length: 5 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x; });
    }
    function addDays(date, days) { const r = new Date(date); r.setDate(r.getDate() + days); return r; }
    function formatDateRange(start, end) {
        const locale = window.getCurrentLanguage ? (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US') : 'bg-BG';
        return start.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) + ' – ' + end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    function fmtDateRange(s, e, format = 'dd.mm_range_year') {
        const p = n => String(n).padStart(2,'0');
        const locale = window.getCurrentLanguage ? (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US') : 'bg-BG';
        const dayMonth = d => `${p(d.getDate())}.${p(d.getMonth()+1)}`;
        const dayMonthYear = d => `${dayMonth(d)}.${d.getFullYear()}`;
        const ddMon = d => d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace(/\.$/, '');
        const monDd = d => d.toLocaleDateString(locale, { month: 'short', day: '2-digit' }).replace(/\.$/, '');
        const monthDd = d => d.toLocaleDateString(locale, { month: 'long', day: '2-digit' });
        const sep = ' - ';
        if (format === 'dd.mm.yyyy_range') return `${dayMonthYear(s)}${sep}${dayMonthYear(e)}`;
        if (format === 'dd_mon_range') return `${ddMon(s)}${sep}${ddMon(e)} ${e.getFullYear()}`;
        if (format === 'mon_dd_range') return `${monDd(s)}${sep}${monDd(e)}, ${e.getFullYear()}`;
        if (format === 'month_dd_range') return `${monthDd(s)}${sep}${monthDd(e)}, ${e.getFullYear()}`;
        if (format === 'single_start_dd.mm') return dayMonth(s);
        if (format === 'single_start_dd_mon') return ddMon(s);
        if (format === 'single_start_month_dd') return monthDd(s);
        return `${dayMonth(s)}${sep}${dayMonth(e)} ${s.getFullYear()}${locale === 'bg-BG' ? 'г.' : ''}`;
    }

})(window);

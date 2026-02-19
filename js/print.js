/**
 * Print Menu Function
 * Single-dialog: week + template + margin all in one modal
 * @version 6.4 - Fill full page: flexbox space-evenly on day blocks
 */

(function(window) {

    function getLocalDateString(date) {
        const year  = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day   = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async function loadBackgroundImageAsBase64(filename) {
        if (!filename || !window.directoryHandle) return null;
        try {
            const dataDir        = await window.directoryHandle.getDirectoryHandle('data',        { create: false });
            const imagesDir      = await dataDir.getDirectoryHandle('images',       { create: false });
            const backgroundsDir = await imagesDir.getDirectoryHandle('backgrounds', { create: false });
            const fileHandle     = await backgroundsDir.getFileHandle(filename);
            const file           = await fileHandle.getFile();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror  = () => resolve(null);
                reader.readAsDataURL(file);
            });
        } catch (err) {
            console.warn('Failed to load background image:', filename, err);
            return null;
        }
    }

    // ─── MAIN ENTRY POINT ────────────────────────────────────────────────────
    window.printMenu = async function() {
        const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const isBg = lang === 'bg';

        const weekEntries = buildWeekOptions(isBg);

        if (!weekEntries.length) {
            alert(isBg
                ? 'Няма планирани ястия. Добавете ястия в менюто, за да използвате печат.'
                : 'No meals planned. Add meals to the menu before printing.');
            return;
        }

        const choice = await showPrintDialog(weekEntries, isBg);
        if (!choice) return;

        const mealPlanData = generateMealPlanData(choice.startDate, choice.endDate);

        if (mealPlanData.days.length === 0) {
            alert(isBg ? 'Няма планирани ястия за избраната седмица!' : 'No meals planned for the selected week!');
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

        // Usable page dimensions in px at 96dpi (1mm = 3.7795px)
        const { top, right, bottom, left } = choice.margins;
        const usableH = Math.round((297 - top - bottom) * 3.7795);
        const usableW = Math.round((210 - left - right) * 3.7795);

        const html = renderMenuHTML(mealPlanData, settings, usableH);
        openPrintWindow(html, mealPlanData, choice.margins, usableH, usableW);
    };

    // ─── BUILD WEEK DROPDOWN OPTIONS ───────────────────────────────────────────
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

        const today          = new Date(); today.setHours(0,0,0,0);
        const currentMondayStr = getLocalDateString(getWeekDates(today)[0]);
        const nextMondayStr    = getLocalDateString(getWeekDates(addDays(today, 7))[0]);

        return Array.from(mondaySet).sort().map(mondayStr => {
            const monday = new Date(mondayStr + 'T00:00:00');
            const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
            const icon   = '\uD83C\uDF7D\uFE0F';

            let label;
            if (mondayStr === currentMondayStr) {
                label = `${icon} ${isBg ? 'Тази седмица' : 'This Week'} — ${formatDateRange(monday, friday)}`;
            } else if (mondayStr === nextMondayStr) {
                label = `${icon} ${isBg ? 'Следваща седмица' : 'Next Week'} — ${formatDateRange(monday, friday)}`;
            } else {
                label = `${icon} ${formatDateRange(monday, friday)}`;
            }

            return { mondayStr, monday, friday, label, isCurrent: mondayStr === currentMondayStr };
        });
    }

    // ─── UNIFIED PRINT DIALOG ──────────────────────────────────────────────
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
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';

            const dialog = document.createElement('div');
            dialog.style.cssText = [
                'position:fixed','top:50%','left:50%',
                'transform:translate(-50%,-50%)',
                'background:white','padding:30px',
                'border-radius:14px',
                'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
                'z-index:10000','min-width:380px','max-width:460px','width:90vw'
            ].join(';');

            const ss = 'width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;';
            const ls = 'display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;';

            dialog.innerHTML = `
                <h2 style="margin:0 0 22px 0;color:#333;font-size:1.3rem;">
                    🖨️ ${isBg ? 'Печат на меню' : 'Print Menu'}
                </h2>
                <div style="margin-bottom:18px;">
                    <label style="${ls}">📅 ${isBg ? 'Седмица' : 'Week'}</label>
                    <select id="pd-week" style="${ss}">${weekOptionsHTML}</select>
                </div>
                <div style="margin-bottom:18px;">
                    <label style="${ls}">🎨 ${isBg ? 'Шаблон' : 'Template'}</label>
                    <select id="pd-template" style="${ss}">${templateOptions}</select>
                </div>
                <div style="margin-bottom:26px;">
                    <label style="${ls}">📐 ${isBg ? 'Полета (отстъп)' : 'Page Margins'}</label>
                    <select id="pd-margin" style="${ss}">
                        <option value="minimal" selected>${isBg ? '🟢 Минимални (5мм) — максимално съдържание' : '🟢 Minimal (5mm) — maximum content'}</option>
                        <option value="normal">${isBg ? '🟡 Нормални (10мм) — балансирано разстояние' : '🟡 Normal (10mm) — balanced spacing'}</option>
                        <option value="comfortable">${isBg ? '🔵 Широки (15мм) — за по-стари принтери' : '🔵 Comfortable (15mm) — for older printers'}</option>
                    </select>
                </div>
                <div style="display:flex;gap:10px;">
                    <button id="pd-print" style="flex:1;padding:12px;background:#fd7e14;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;">
                        🖨️ ${isBg ? 'Печат' : 'Print'}
                    </button>
                    <button id="pd-cancel" style="padding:12px 20px;background:#e9ecef;color:#555;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">
                        ${isBg ? 'Отказ' : 'Cancel'}
                    </button>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(dialog);

            const marginPresets = {
                minimal:     { top: 5,  right: 5,  bottom: 5,  left: 5  },
                normal:      { top: 10, right: 10, bottom: 10, left: 10 },
                comfortable: { top: 15, right: 15, bottom: 15, left: 15 }
            };

            function close() {
                document.body.removeChild(overlay);
                document.body.removeChild(dialog);
            }

            dialog.querySelector('#pd-print').addEventListener('click', () => {
                const mondayStr = dialog.querySelector('#pd-week').value;
                const tplVal    = dialog.querySelector('#pd-template').value;
                const marginVal = dialog.querySelector('#pd-margin').value;
                const entry     = weekEntries.find(e => e.mondayStr === mondayStr);
                close();
                resolve({
                    startDate:        entry.monday,
                    endDate:          entry.friday,
                    templateType:     tplVal === 'default' ? 'default' : 'saved',
                    templateSettings: tplVal !== 'default' ? savedTemplates[tplVal] : null,
                    margins:          marginPresets[marginVal]
                });
            });

            dialog.querySelector('#pd-cancel').addEventListener('click', () => { close(); resolve(null); });
            overlay.addEventListener('click', () => { close(); resolve(null); });
        });
    }

    // ─── DEFAULT TEMPLATE SETTINGS ───────────────────────────────────────────
    function getDefaultSettings() {
        return {
            templateStyle:    'compact',
            backgroundImage:  null,
            backgroundColor:  '#ffffff',
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
            headerFontSize:   '20pt',
            headerColor:      '#d2691e',
            showDateRange:    true,
            showIngredients:  true,
            showCalories:     true,
            showPortions:     true,
            dayBorder:          false,
            dayBorderStyle:     'solid',
            dayBorderColor:     '#e0e0e0',
            dayBorderThickness: '1px',
            dayBackground:    'transparent',
            dayNameSize:      '12pt',
            dayNameColor:     '#333333',
            dayNameWeight:    'bold',
            mealFontSize:     '10pt',
            allergenColor:    '#ff0000',
            allergenBold:     true,
            allergenUnderline: false,
            showFooter:       true,
            footerText:       'Алергените са подчертани.',
            footerAlignment:  'center',
            footerFontSize:   '8pt'
        };
    }

    // ─── GENERATE MEAL PLAN DATA ─────────────────────────────────────────────
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

            const hasMeals = ['slot1','slot2','slot3','slot4'].some(id => {
                const s = dayMenu[id]; return s && s.recipe;
            });

            if (hasMeals) {
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
                        meals.push({
                            number:      idx + 1,
                            name:        recipe.name,
                            portion:     recipe.portionSize || '',
                            calories:    recipe.calories || null,
                            ingredients: ingredientsData
                        });
                    }
                });
                if (meals.length > 0) days.push({ name: dayNames[i], meals });
            }
        }
        return { startDate, endDate, days };
    }

    // ─── RENDER HELPERS ─────────────────────────────────────────────────────────
    function getPositionCSS(position) {
        const map = {
            'center':'center center','top-left':'top left','top-center':'top center',
            'top-right':'top right','center-left':'center left','center-right':'center right',
            'bottom-left':'bottom left','bottom-center':'bottom center','bottom-right':'bottom right'
        };
        return map[position] || 'center center';
    }
    function getSizeCSS(size) {
        return typeof size === 'number' ? `${size}% auto` : (size || 'cover');
    }
    function addBgLayers(html, s) {
        if (s.backgroundImages && Array.isArray(s.backgroundImages)) {
            s.backgroundImages
                .filter(img => img.image && img.imageData)
                .sort((a, b) => a.zIndex - b.zIndex)
                .forEach(img => {
                    html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;` +
                        `background-image:url('${img.imageData}');` +
                        `background-size:${getSizeCSS(img.size)};` +
                        `background-position:${getPositionCSS(img.position)};` +
                        `background-repeat:no-repeat;opacity:${img.opacity};z-index:${img.zIndex};pointer-events:none;"></div>`;
                });
        } else if (s.backgroundImageData) {
            html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;` +
                `background-image:url('${s.backgroundImageData}');` +
                `background-size:cover;background-position:center;background-repeat:no-repeat;` +
                `opacity:1;z-index:1;pointer-events:none;"></div>`;
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
    // Accept plain numbers (from builder number inputs) or strings with pt/px/em etc.
    function normSize(v, fallback) {
        if (!v && v !== 0) return fallback;
        return /^\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}pt` : String(v);
    }

    // ─── RENDER HTML ──────────────────────────────────────────────────────────
    //
    // Layout strategy:
    //   #menu-content
    //     ├─ background layers (position:absolute, no layout impact)
    //     └─ inner (position:relative, z-index:10, flex:1, flex-direction:column)
    //           ├─ header block  (shrinks to content)
    //           ├─ days block    (flex:1 → fills all remaining height)
    //           │     justify-content:space-evenly → equal gaps between/around days
    //           └─ footer block  (shrinks to content)
    //
    // This ensures the 5 day-blocks always spread across the FULL page height
    // regardless of how compact the content is.
    //
    function renderMenuHTML(data, s, usableH) {
        if ((s.templateStyle || 'compact') === 'detailed-2col') return renderMenuHTML2Column(data, s, usableH);

        const { startDate, endDate, days } = data;
        const isCompact = (s.templateStyle || 'compact') === 'compact';
        const lh  = isCompact ? '1.15' : '1.2';
        const dr  = fmtDateRange(startDate, endDate);
        const hs  = normSize(s.headerFontSize,  '20pt');
        const dys = normSize(s.dayNameSize,      '12pt');
        const ms  = normSize(s.mealFontSize,     '10pt');
        const fs  = normSize(s.footerFontSize,   '8pt');
        const ff  = s.fontFamily || 'Arial, sans-serif';
        // height: usableH for screen preview; print uses height:100% via CSS
        const hStyle = usableH ? `height:${usableH}px;` : '';

        // Outer wrapper: flex column, fills usableH on screen / 100% on print
        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;` +
                   `padding:0;font-family:${ff};${hStyle}display:flex;flex-direction:column;">`;
        html = addBgLayers(html, s);

        // Inner: sits above bg layers, also flex column to pass height down
        html += `<div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">`;

        // ── Header block ─────────────────────────────────────────────────────
        html += `<div>`;
        if (s.showHeader)    html += `<div style="text-align:${s.headerAlignment||'center'};padding-top:4px;margin-bottom:2px;"><span style="font-size:${hs};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:center;margin-bottom:4px;font-size:9pt;color:#555;">${dr}</div>`;
        html += `</div>`;

        // ── Days block ─ flex:1 + space-evenly = fills page, days spread out ──
        html += `<div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">`;
        days.forEach(day => {
            const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const bg  = s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            html += `<div style="${brd}${bg}padding:4px 6px;border-radius:3px;">`;
            html += `<div style="font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:1px;">${day.name}</div>`;

            day.meals.forEach(meal => {
                const ingHtml = renderIngHtml(meal, s);
                if (isCompact) {
                    html += `<div style="margin-left:8px;font-size:${ms};line-height:${lh};"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    if (ingHtml) html += `; ${ingHtml}`;
                    if (s.showCalories && meal.calories) html += ` ККАЛ ${meal.calories}`;
                    html += `</div>`;
                } else {
                    html += `<div style="margin-left:8px;">`;
                    html += `<div style="font-size:${ms};line-height:${lh};font-weight:500;"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    html += `</div>`;
                    if (ingHtml) {
                        html += `<div style="font-size:${ms};line-height:${lh};margin-left:12px;color:#555;font-style:italic;">${ingHtml}`;
                        if (s.showCalories && meal.calories) html += ` - ККАЛ ${meal.calories}`;
                        html += `</div>`;
                    } else if (s.showCalories && meal.calories) {
                        html += `<div style="font-size:${ms};line-height:${lh};margin-left:12px;color:#555;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                    }
                    html += `</div>`;
                }
            });
            html += `</div>`; // day block
        });
        html += `</div>`; // days container

        // ── Footer block ────────────────────────────────────────────────────
        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment||'center'};padding:4px 0 2px;border-top:1px solid #ddd;font-size:${fs};color:#888;">${s.footerText}</div>`;

        html += `</div>`; // inner
        html += `</div>`; // #menu-content
        return html;
    }

    function renderMenuHTML2Column(data, s, usableH) {
        const { startDate, endDate, days } = data;
        const dr  = fmtDateRange(startDate, endDate);
        const hs  = normSize(s.headerFontSize, '20pt');
        const dys = normSize(s.dayNameSize,    '12pt');
        const ms  = normSize(s.mealFontSize,   '10pt');
        const fs  = normSize(s.footerFontSize, '8pt');
        const ff  = s.fontFamily || 'Arial, sans-serif';
        const hStyle = usableH ? `height:${usableH}px;` : '';

        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;` +
                   `padding:0;font-family:${ff};${hStyle}display:flex;flex-direction:column;">`;
        html = addBgLayers(html, s);
        html += `<div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;">`;

        html += `<div>`;
        if (s.showHeader)    html += `<div style="text-align:${s.headerAlignment||'center'};padding-top:4px;margin-bottom:2px;"><span style="font-size:${hs};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:center;margin-bottom:4px;font-size:9pt;color:#555;">${dr}</div>`;
        html += `</div>`;

        // 2-col: rows flex:1 so they spread vertically too
        const rows = [];
        for (let i = 0; i < days.length; i += 2) rows.push([days[i], days[i+1] || null]);

        html += `<div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">`;

        const renderDay = (day) => {
            if (!day) return `<div style="flex:1;"></div>`;
            const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const bg  = s.dayBackground && s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            let d = `<div style="flex:1;${brd}${bg}padding:4px 6px;border-radius:3px;">`;
            d += `<div style="font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:1px;">${day.name}</div>`;
            day.meals.forEach(meal => {
                const ingHtml = renderIngHtml(meal, s);
                d += `<div style="margin-left:8px;">`;
                d += `<div style="font-size:${ms};line-height:1.2;font-weight:500;"> ${meal.number}. ${meal.name}`;
                if (s.showPortions && meal.portion) d += ` - ${meal.portion}`;
                d += `</div>`;
                if (ingHtml) {
                    d += `<div style="font-size:${ms};line-height:1.2;margin-left:12px;color:#555;font-style:italic;">${ingHtml}`;
                    if (s.showCalories && meal.calories) d += ` - ККАЛ ${meal.calories}`;
                    d += `</div>`;
                } else if (s.showCalories && meal.calories) {
                    d += `<div style="font-size:${ms};line-height:1.2;margin-left:12px;color:#555;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                }
                d += `</div>`;
            });
            d += `</div>`;
            return d;
        };

        rows.forEach(([a, b]) => {
            html += `<div style="display:flex;gap:8px;">${renderDay(a)}${renderDay(b)}</div>`;
        });
        html += `</div>`; // rows container

        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment||'center'};padding:4px 0 2px;border-top:1px solid #ddd;font-size:${fs};color:#888;">${s.footerText}</div>`;
        html += `</div>`; // inner
        html += `</div>`; // #menu-content
        return html;
    }

    // ─── PRINT WINDOW ────────────────────────────────────────────────────────────────
    //
    // For PRINT:
    //   html, body, #page-wrapper, #menu-content all get height:100%
    //   This makes the flex layout fill the entire A4 content area.
    //   The days-container (flex:1 + space-evenly) then distributes day blocks
    //   evenly from top to bottom with no white gap at the bottom.
    //
    // For SCREEN preview:
    //   #menu-content already has height:[usableH]px set inline,
    //   so the preview accurately shows how the page will look.
    //
    // OVERFLOW: if content is taller than the page (very dense menus),
    //   CSS zoom scales it down proportionally.
    //
    function openPrintWindow(html, mealPlanData, margins, usableH, usableW) {
        const pw = window.open('', '_blank');
        if (!pw) {
            alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
            return;
        }
        const ds =
            `${mealPlanData.startDate.getDate()}.${mealPlanData.startDate.getMonth()+1}` +
            `-${mealPlanData.endDate.getDate()}.${mealPlanData.endDate.getMonth()+1}` +
            `.${mealPlanData.startDate.getFullYear()}`;
        const { top, right, bottom, left } = margins;

        pw.document.write(
            '<!DOCTYPE html><html><head>' +
            '<title>Weekly-Menu-' + ds + '</title>' +
            '<meta charset="UTF-8">' +
            '<style>' +
            '* { margin:0; padding:0; box-sizing:border-box; }' +
            // ── Screen: white page card on grey background ───────────────────
            'body { font-family:Arial,sans-serif; font-size:10px; line-height:1.2; color:#333; background:#bbb; }' +
            '@media screen {' +
            '  #page-wrapper {' +
            '    background:white; width:' + usableW + 'px;' +
            '    height:' + usableH + 'px;' +  // exact A4 preview on screen
            '    margin:20px auto; overflow:hidden;' +
            '    padding:' + top + 'mm ' + right + 'mm ' + bottom + 'mm ' + left + 'mm;' +
            '    box-shadow:0 2px 16px rgba(0,0,0,0.35);' +
            '  }' +
            '}' +
            // ── Print: fill the full A4 page ─────────────────────────────────
            '@page { size:A4 portrait; margin:' + top + 'mm ' + right + 'mm ' + bottom + 'mm ' + left + 'mm; }' +
            '@media print {' +
            '  html, body { height:100%; background:white; }' +
            '  #page-wrapper { height:100%; padding:0; margin:0; box-shadow:none; }' +
            '  #menu-content { height:100% !important; }' +  // override inline height
            '  * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }' +
            '}' +
            '</style>' +
            '</head><body>' +
            '<div id="page-wrapper">' + html + '</div>' +
            // Only zoom DOWN if content overflows the page (very dense menus)
            '<scr' + 'ipt>' +
            'window.onload = function() {' +
            '  setTimeout(function() {' +
            '    var c = document.getElementById("menu-content");' +
            '    if (c) {' +
            '      var pageH = ' + usableH + ';' +
            '      var ch = c.scrollHeight;' +
            '      if (ch > pageH * 1.05) {' +  // 5% tolerance
            '        var zf = pageH / ch;' +
            '        if (zf < 1) { c.style.zoom = Math.max(0.5, zf).toFixed(4); }' +
            '      }' +
            '    }' +
            '    setTimeout(function() { window.print(); }, 600);' +
            '  }, 800);' +
            '};' +
            '<\/scr' + 'ipt>' +
            '</body></html>'
        );
        pw.document.close();
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    function getWeekDates(date) {
        const d   = new Date(date);
        const day = d.getDay();
        const mon = new Date(d);
        mon.setDate(d.getDate() + (day === 0 ? 1 : -(day - 1)));
        mon.setHours(0,0,0,0);
        return Array.from({ length: 5 }, (_, i) => {
            const x = new Date(mon); x.setDate(mon.getDate() + i); return x;
        });
    }

    function addDays(date, days) {
        const r = new Date(date); r.setDate(r.getDate() + days); return r;
    }

    function formatDateRange(start, end) {
        const locale = window.getCurrentLanguage
            ? (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US')
            : 'bg-BG';
        return start.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
               ' – ' +
               end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function fmtDateRange(s, e) {
        const p = n => String(n).padStart(2,'0');
        return `${p(s.getDate())}.${p(s.getMonth()+1)}-${p(e.getDate())}.${p(e.getMonth()+1)} ${s.getFullYear()}г.`;
    }

})(window);

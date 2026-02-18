/**
 * Print Menu Function
 * Single-dialog: week + template + margin all in one modal
 * @version 6.2 - Only weeks with meal data shown in dropdown
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
            const dataDir       = await window.directoryHandle.getDirectoryHandle('data',        { create: false });
            const imagesDir     = await dataDir.getDirectoryHandle('images',       { create: false });
            const backgroundsDir = await imagesDir.getDirectoryHandle('backgrounds', { create: false });
            const fileHandle    = await backgroundsDir.getFileHandle(filename);
            const file          = await fileHandle.getFile();
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

        const html = renderMenuHTML(mealPlanData, settings);
        openPrintWindow(html, mealPlanData, choice.margins);
    };

    // ─── BUILD WEEK DROPDOWN OPTIONS ─────────────────────────────────────────
    // Only includes weeks that have at least one meal planned.
    // If no meals exist anywhere, returns an empty array.
    function buildWeekOptions(isBg) {
        const lang = isBg ? 'bg-BG' : 'en-US';
        const menu = window.currentMenu || {};

        // Collect mondays that have meal data
        const mondaySet = new Set();
        Object.keys(menu).forEach(dateStr => {
            const dayData = menu[dateStr];
            const hasMeals = dayData && Object.values(dayData).some(slot => slot && slot.recipe);
            if (hasMeals) {
                const d = new Date(dateStr + 'T00:00:00');
                const monday = getWeekDates(d)[0];
                mondaySet.add(getLocalDateString(monday));
            }
        });

        if (!mondaySet.size) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentMondayStr = getLocalDateString(getWeekDates(today)[0]);
        const nextMondayStr    = getLocalDateString(getWeekDates(addDays(today, 7))[0]);

        // Sort all mondays chronologically
        const sortedMondays = Array.from(mondaySet).sort();

        return sortedMondays.map(mondayStr => {
            const monday  = new Date(mondayStr + 'T00:00:00');
            const friday  = new Date(monday);
            friday.setDate(monday.getDate() + 4);

            const weekDates  = getWeekDates(monday);
            const hasMeals   = weekDates.some(d => window.dateHasMeals(getLocalDateString(d)));
            const dateRange  = formatDateRange(monday, friday);

            let label;
            const icon = hasMeals ? '🍽️' : '⬜';

            if (mondayStr === currentMondayStr) {
                label = `${icon} ${isBg ? 'Тази седмица' : 'This Week'} — ${dateRange}`;
            } else if (mondayStr === nextMondayStr) {
                label = `${icon} ${isBg ? 'Следваща седмица' : 'Next Week'} — ${dateRange}`;
            } else {
                label = `${icon} ${dateRange}`;
            }

            return {
                mondayStr,
                monday,
                friday,
                label,
                isCurrent: mondayStr === currentMondayStr
            };
        });
    }

    // ─── UNIFIED PRINT DIALOG ────────────────────────────────────────────────
    function showPrintDialog(weekEntries, isBg) {
        return new Promise((resolve) => {
            // Template options
            const savedTemplates = window.menuTemplates || {};
            const templateNames  = Object.keys(savedTemplates);

            let templateOptions = `<option value="default">${isBg ? '🎨 Стандартен шаблон' : '🎨 Default Template'}</option>`;
            templateNames.forEach(name => {
                const t = savedTemplates[name];
                let styleLabel = isBg ? 'Компактен' : 'Compact';
                if (t.templateStyle === 'detailed')      styleLabel = isBg ? 'Детайлен' : 'Detailed';
                if (t.templateStyle === 'detailed-2col') styleLabel = isBg ? 'Детайлен (2 колони)' : 'Detailed (2 columns)';
                templateOptions += `<option value="${name}">📋 ${name} — ${styleLabel}</option>`;
            });

            // Build week <option> elements
            // Pre-select current week if it appears, otherwise the first entry
            const currentEntry = weekEntries.find(e => e.isCurrent) || weekEntries[0];
            let weekOptionsHTML = weekEntries.map(e =>
                `<option value="${e.mondayStr}"${e.mondayStr === currentEntry.mondayStr ? ' selected' : ''}>${e.label}</option>`
            ).join('');

            // Overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';

            // Dialog
            const dialog = document.createElement('div');
            dialog.style.cssText = [
                'position:fixed', 'top:50%', 'left:50%',
                'transform:translate(-50%,-50%)',
                'background:white', 'padding:30px',
                'border-radius:14px',
                'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
                'z-index:10000', 'min-width:380px', 'max-width:460px', 'width:90vw'
            ].join(';');

            const selectStyle = 'width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;';
            const labelStyle  = 'display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;';

            dialog.innerHTML = `
                <h2 style="margin:0 0 22px 0;color:#333;font-size:1.3rem;">
                    🖨️ ${isBg ? 'Печат на меню' : 'Print Menu'}
                </h2>

                <div style="margin-bottom:18px;">
                    <label style="${labelStyle}">📅 ${isBg ? 'Седмица' : 'Week'}</label>
                    <select id="pd-week" style="${selectStyle}"
                        onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
                        ${weekOptionsHTML}
                    </select>
                </div>

                <div style="margin-bottom:18px;">
                    <label style="${labelStyle}">🎨 ${isBg ? 'Шаблон' : 'Template'}</label>
                    <select id="pd-template" style="${selectStyle}"
                        onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
                        ${templateOptions}
                    </select>
                </div>

                <div style="margin-bottom:26px;">
                    <label style="${labelStyle}">📎 ${isBg ? 'Полета (отстъп)' : 'Page Margins'}</label>
                    <select id="pd-margin" style="${selectStyle}"
                        onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
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

                const entry = weekEntries.find(e => e.mondayStr === mondayStr);
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
            templateStyle: 'compact',
            backgroundImage: null,
            backgroundColor: '#ffffff',
            backgroundOpacity: 1.0,
            backgroundImages: [
                { image: null, position: 'center',       size: 100, opacity: 1.0, zIndex: 1 },
                { image: null, position: 'top-left',     size: 20,  opacity: 1.0, zIndex: 2 },
                { image: null, position: 'top-right',    size: 20,  opacity: 1.0, zIndex: 3 },
                { image: null, position: 'bottom-left',  size: 20,  opacity: 1.0, zIndex: 4 },
                { image: null, position: 'bottom-right', size: 20,  opacity: 1.0, zIndex: 5 }
            ],
            showHeader: true,
            headerText: 'Седмично меню',
            headerImage: null,
            headerAlignment: 'center',
            headerFontSize: '20pt',
            headerColor: '#d2691e',
            showDateRange: true,
            showIngredients: true,
            showCalories: true,
            showPortions: true,
            dayBorder: false,
            dayBorderStyle: 'solid',
            dayBorderColor: '#e0e0e0',
            dayBackground: 'transparent',
            dayNameSize: '12pt',
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            mealFontSize: '10pt',
            allergenColor: '#ff0000',
            allergenBold: true,
            showFooter: true,
            footerText: 'Prepared with care by KitchenPro',
            footerImage: null,
            footerAlignment: 'center',
            footerFontSize: '8pt'
        };
    }

    // ─── GENERATE MEAL PLAN DATA ──────────────────────────────────────────────
    function generateMealPlanData(startDate, endDate) {
        const days = [];
        const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const dayNames = lang === 'bg'
            ? ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        for (let i = 0; i < 5; i++) {
            const d       = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = getLocalDateString(d);
            const dayMenu = window.getMenuForDate(dateStr);

            const hasMeals = ['slot1','slot2','slot3','slot4'].some(id => {
                const s = dayMenu[id];
                return s && s.recipe;
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

    // ─── RENDER HTML ─────────────────────────────────────────────────────────
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
                    html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:url('${img.imageData}');background-size:${getSizeCSS(img.size)};background-position:${getPositionCSS(img.position)};background-repeat:no-repeat;opacity:${img.opacity};z-index:${img.zIndex};pointer-events:none;"></div>`;
                });
        } else if (s.backgroundImageData) {
            html += `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:url('${s.backgroundImageData}');background-size:cover;background-position:center;background-repeat:no-repeat;opacity:1;z-index:1;pointer-events:none;"></div>`;
        }
        return html;
    }

    function renderMenuHTML(data, s) {
        if ((s.templateStyle || 'compact') === 'detailed-2col') return renderMenuHTML2Column(data, s);

        const { startDate, endDate, days } = data;
        const isCompact = (s.templateStyle || 'compact') === 'compact';
        const sp = {
            cp: '8px', hm: '6px', dm: '8px', dym: '6px', dyp: '5px',
            dnm: '3px', mm: isCompact ? '2px' : '3px', mlm: '6px',
            fmt: '8px', fpt: '6px', lh: isCompact ? '1.15' : '1.2'
        };
        const dr  = fmtDateRange(startDate, endDate);
        const hs  = s.headerFontSize || '20pt';
        const dys = s.dayNameSize    || '12pt';
        const ms  = s.mealFontSize   || '10pt';
        const fs  = s.footerFontSize || '8pt';

        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:${sp.cp};font-family:Arial,sans-serif;">`;
        html = addBgLayers(html, s);
        html += `<div style="position:relative;z-index:10;">`;

        if (s.showHeader)    html += `<div style="text-align:${s.headerAlignment};margin-bottom:${sp.hm};"><span style="font-size:${hs};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:center;margin-bottom:${sp.dm};font-size:9pt;">${dr}</div>`;

        days.forEach(day => {
            const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const bg  = s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            html += `<div style="${brd}${bg}padding:${sp.dyp};margin-bottom:${sp.dym};border-radius:3px;">`;
            html += `<div style="font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:${sp.dnm};">${day.name}</div>`;

            day.meals.forEach(meal => {
                const ingHtml = (s.showIngredients && meal.ingredients.length)
                    ? meal.ingredients.map(ing => {
                        if (ing.hasAllergen) { let st=`color:${s.allergenColor};`; if(s.allergenBold) st+='font-weight:bold;'; if(s.allergenUnderline) st+='text-decoration:underline;'; return `<span style="${st}">${ing.name}</span>`; }
                        return ing.name;
                    }).join(', ')
                    : '';

                if (isCompact) {
                    html += `<div style="margin-bottom:${sp.mm};margin-left:${sp.mlm};font-size:${ms};line-height:${sp.lh};"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    if (ingHtml) html += `; ${ingHtml}`;
                    if (s.showCalories && meal.calories) html += ` ККАЛ ${meal.calories}`;
                    html += `</div>`;
                } else {
                    html += `<div style="margin-bottom:${sp.mm};margin-left:${sp.mlm};"><div style="font-size:${ms};line-height:${sp.lh};font-weight:500;"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    html += `</div>`;
                    if (ingHtml) {
                        html += `<div style="font-size:${ms};line-height:${sp.lh};margin-left:12px;color:#666;font-style:italic;">${ingHtml}`;
                        if (s.showCalories && meal.calories) html += ` - ККАЛ ${meal.calories}`;
                        html += `</div>`;
                    } else if (s.showCalories && meal.calories) {
                        html += `<div style="font-size:${ms};line-height:${sp.lh};margin-left:12px;color:#666;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                    }
                    html += `</div>`;
                }
            });
            html += `</div>`;
        });

        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment};margin-top:${sp.fmt};padding-top:${sp.fpt};border-top:1px solid #ddd;font-size:${fs};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        return html;
    }

    function renderMenuHTML2Column(data, s) {
        const { startDate, endDate, days } = data;
        const sp = {
            cp:'8px', hm:'6px', dm:'8px', rm:'6px', cg:'10px',
            dyp:'5px', dnm:'3px', mm:'3px', mlm:'6px', fmt:'8px', fpt:'6px', lh:'1.2'
        };
        const dr  = fmtDateRange(startDate, endDate);
        const hs  = s.headerFontSize || '20pt';
        const dys = s.dayNameSize    || '12pt';
        const ms  = s.mealFontSize   || '10pt';
        const fs  = s.footerFontSize || '8pt';

        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:${sp.cp};font-family:Arial,sans-serif;">`;
        html = addBgLayers(html, s);
        html += `<div style="position:relative;z-index:10;">`;

        if (s.showHeader)    html += `<div style="text-align:${s.headerAlignment};margin-bottom:${sp.hm};"><span style="font-size:${hs};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:center;margin-bottom:${sp.dm};font-size:9pt;">${dr}</div>`;

        const renderDay = (day) => {
            const brd = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const bg  = s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            let d = `<div style="${brd}${bg}padding:${sp.dyp};border-radius:3px;height:100%;"><div style="font-size:${dys};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:${sp.dnm};">${day.name}</div>`;
            day.meals.forEach(meal => {
                const ingHtml = (s.showIngredients && meal.ingredients.length)
                    ? meal.ingredients.map(ing => {
                        if (ing.hasAllergen) { let st=`color:${s.allergenColor};`; if(s.allergenBold) st+='font-weight:bold;'; if(s.allergenUnderline) st+='text-decoration:underline;'; return `<span style="${st}">${ing.name}</span>`; }
                        return ing.name;
                    }).join(', ')
                    : '';
                d += `<div style="margin-bottom:${sp.mm};margin-left:${sp.mlm};"><div style="font-size:${ms};line-height:${sp.lh};font-weight:500;"> ${meal.number}. ${meal.name}`;
                if (s.showPortions && meal.portion) d += ` - ${meal.portion}`;
                d += `</div>`;
                if (ingHtml) {
                    d += `<div style="font-size:${ms};line-height:${sp.lh};margin-left:12px;color:#666;font-style:italic;">${ingHtml}`;
                    if (s.showCalories && meal.calories) d += ` - ККАЛ ${meal.calories}`;
                    d += `</div>`;
                } else if (s.showCalories && meal.calories) {
                    d += `<div style="font-size:${ms};line-height:${sp.lh};margin-left:12px;color:#666;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                }
                d += `</div>`;
            });
            d += `</div>`;
            return d;
        };

        for (let i = 0; i < days.length; i += 2) {
            html += `<div style="display:flex;gap:${sp.cg};margin-bottom:${sp.rm};"><div style="flex:1;">${days[i] ? renderDay(days[i]) : ''}</div><div style="flex:1;">${days[i+1] ? renderDay(days[i+1]) : ''}</div></div>`;
        }

        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment};margin-top:${sp.fmt};padding-top:${sp.fpt};border-top:1px solid #ddd;font-size:${fs};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        return html;
    }

    // ─── PRINT WINDOW ────────────────────────────────────────────────────────
    function openPrintWindow(html, mealPlanData, margins) {
        const pw = window.open('', '_blank');
        const ds = `${mealPlanData.startDate.getDate()}.${mealPlanData.startDate.getMonth()+1}-${mealPlanData.endDate.getDate()}.${mealPlanData.endDate.getMonth()+1}.${mealPlanData.startDate.getFullYear()}`;
        const { top, right, bottom, left } = margins;

        pw.document.write(
            '<!DOCTYPE html><html><head>' +
            '<title>Weekly Menu ' + ds + '</title>' +
            '<meta charset="UTF-8">' +
            '<style>' +
            '* { margin:0; padding:0; box-sizing:border-box; }' +
            'body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; font-size:10px; line-height:1.2; color:#333; background:white; }' +
            '@page { size:A4 portrait; margin:' + top + 'mm ' + right + 'mm ' + bottom + 'mm ' + left + 'mm; }' +
            '@media print { body { width:210mm; height:297mm; overflow:hidden; } * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } }' +
            '@media screen { body { padding:' + top + 'mm ' + right + 'mm ' + bottom + 'mm ' + left + 'mm; max-width:210mm; margin:0 auto; } }' +
            '</style></head><body>' +
            html +
            '<script>window.onload=function(){setTimeout(function(){' +
            'var c=document.getElementById("menu-content");' +
            'if(c){var ph=(297-' + top + '-' + bottom + ')*3.7795,ch=c.offsetHeight;' +
            'if(ch>ph){var sf=ph/ch;c.style.transform="scale("+sf+")";c.style.transformOrigin="top left";c.style.width=(100/sf)+"%;"}}' +
            'setTimeout(function(){window.print();},500);},2000);};' +
            '</scr' + 'ipt></body></html>'
        );
        pw.document.close();
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    function getWeekDates(date) {
        const d    = new Date(date);
        const day  = d.getDay();
        const diff = day === 0 ? 1 : -(day - 1);
        const mon  = new Date(d);
        mon.setDate(d.getDate() + diff);
        mon.setHours(0, 0, 0, 0);
        return Array.from({ length: 5 }, (_, i) => {
            const x = new Date(mon);
            x.setDate(mon.getDate() + i);
            return x;
        });
    }

    function addDays(date, days) {
        const r = new Date(date);
        r.setDate(r.getDate() + days);
        return r;
    }

    function formatDateRange(start, end) {
        const locale = window.getCurrentLanguage ?
            (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US') : 'bg-BG';
        return start.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
            ' – ' +
            end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Short date range used inside rendered HTML (DD.MM-DD.MM YYYYг.)
    function fmtDateRange(s, e) {
        return `${s.getDate().toString().padStart(2,'0')}.${(s.getMonth()+1).toString().padStart(2,'0')}-${e.getDate().toString().padStart(2,'0')}.${(e.getMonth()+1).toString().padStart(2,'0')} ${s.getFullYear()}г.`;
    }

})(window);

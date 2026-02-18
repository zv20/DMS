/**
 * Print Menu Function
 * Single-dialog: week + template + margin all in one modal
 * @version 6.0 - Unified print dialog
 */

(function(window) {
    
    // Helper to get local date string (YYYY-MM-DD) without timezone issues
    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Load background image from local storage and convert to base64
    async function loadBackgroundImageAsBase64(filename) {
        if (!filename || !window.directoryHandle) return null;
        try {
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images', { create: false });
            const backgroundsDir = await imagesDir.getDirectoryHandle('backgrounds', { create: false });
            const fileHandle = await backgroundsDir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        } catch (err) {
            console.warn('Failed to load background image:', filename, err);
            return null;
        }
    }
    
    // ─── UNIFIED PRINT DIALOG ────────────────────────────────────────────────
    window.printMenu = async function() {
        const choice = await showPrintDialog();
        if (!choice) return;

        const mealPlanData = generateMealPlanData(choice.startDate, choice.endDate);

        if (mealPlanData.days.length === 0) {
            const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
            alert(lang === 'bg' ? 'Няма планирани ястия за избраната седмица!' : 'No meals planned for the selected week!');
            return;
        }

        let settings = choice.templateType === 'default' ? getDefaultSettings() : choice.templateSettings;

        // Load background images
        if (settings.backgroundImages && Array.isArray(settings.backgroundImages)) {
            for (let i = 0; i < settings.backgroundImages.length; i++) {
                const imgSlot = settings.backgroundImages[i];
                if (imgSlot.image) {
                    const base64 = await loadBackgroundImageAsBase64(imgSlot.image);
                    if (base64) imgSlot.imageData = base64;
                }
            }
        } else if (settings.backgroundImage) {
            const base64Image = await loadBackgroundImageAsBase64(settings.backgroundImage);
            if (base64Image) settings.backgroundImageData = base64Image;
        }

        const html = renderMenuHTML(mealPlanData, settings);
        openPrintWindow(html, mealPlanData, choice.margins);
    };

    // Build and show the unified print dialog
    function showPrintDialog() {
        return new Promise((resolve) => {
            const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
            const isBg = lang === 'bg';

            // Week options
            const currentWeek  = getWeekDates(new Date());
            const nextWeek     = getWeekDates(addDays(new Date(),  7));
            const lastWeek     = getWeekDates(addDays(new Date(), -7));

            // Template options
            const savedTemplates = window.menuTemplates || {};
            const templateNames  = Object.keys(savedTemplates);

            let templateOptions = `<option value="default">${isBg ? '🎨 Стандартен шаблон' : '🎨 Default Template'}</option>`;
            templateNames.forEach(name => {
                const t = savedTemplates[name];
                let styleLabel = isBg ? 'Компактен' : 'Compact';
                if (t.templateStyle === 'detailed')       styleLabel = isBg ? 'Детайлен' : 'Detailed';
                if (t.templateStyle === 'detailed-2col')  styleLabel = isBg ? 'Детайлен (2 колони)' : 'Detailed (2 columns)';
                templateOptions += `<option value="${name}">📋 ${name} — ${styleLabel}</option>`;
            });

            // Overlay + dialog
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';

            const dialog = document.createElement('div');
            dialog.style.cssText = [
                'position:fixed',
                'top:50%',
                'left:50%',
                'transform:translate(-50%,-50%)',
                'background:white',
                'padding:30px',
                'border-radius:14px',
                'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
                'z-index:10000',
                'min-width:380px',
                'max-width:460px',
                'width:90vw'
            ].join(';');

            dialog.innerHTML = `
                <h2 style="margin:0 0 22px 0;color:#333;font-size:1.3rem;">
                    🖨️ ${isBg ? 'Печат на меню' : 'Print Menu'}
                </h2>

                <!-- Week -->
                <div style="margin-bottom:18px;">
                    <label style="display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;">
                        📅 ${isBg ? 'Седмица' : 'Week'}
                    </label>
                    <select id="pd-week" style="width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;" 
                        onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
                        <option value="last">${isBg ? 'Предишна седмица' : 'Last Week'} — ${formatDateRange(lastWeek[0], lastWeek[4])}</option>
                        <option value="current" selected>${isBg ? 'Тази седмица' : 'This Week'} — ${formatDateRange(currentWeek[0], currentWeek[4])}</option>
                        <option value="next">${isBg ? 'Следваща седмица' : 'Next Week'} — ${formatDateRange(nextWeek[0], nextWeek[4])}</option>
                    </select>
                </div>

                <!-- Template -->
                <div style="margin-bottom:18px;">
                    <label style="display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;">
                        🎨 ${isBg ? 'Шаблон' : 'Template'}
                    </label>
                    <select id="pd-template" style="width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;"
                        onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
                        ${templateOptions}
                    </select>
                </div>

                <!-- Margins -->
                <div style="margin-bottom:26px;">
                    <label style="display:block;font-weight:600;margin-bottom:6px;color:#555;font-size:0.9rem;">
                        📎 ${isBg ? 'Полета (отстъп)' : 'Page Margins'}
                    </label>
                    <select id="pd-margin" style="width:100%;padding:10px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:0.95rem;background:#fafafa;cursor:pointer;outline:none;"
                        onfocus="this.style.borderColor='#fd7e14'" onblur="this.style.borderColor='#e0e0e0'">
                        <option value="minimal" selected>${isBg ? '🟢 Минимални (5мм) — максимално съдържание' : '🟢 Minimal (5mm) — maximum content'}</option>
                        <option value="normal">${isBg ? '🟡 Нормални (10мм) — балансирано разстояние' : '🟡 Normal (10mm) — balanced spacing'}</option>
                        <option value="comfortable">${isBg ? '🔵 Широки (15мм) — за по-стари принтери' : '🔵 Comfortable (15mm) — for older printers'}</option>
                    </select>
                </div>

                <!-- Buttons -->
                <div style="display:flex;gap:10px;">
                    <button id="pd-print" style="
                        flex:1;padding:12px;background:#fd7e14;color:white;
                        border:none;border-radius:8px;font-size:1rem;
                        font-weight:600;cursor:pointer;
                    ">🖨️ ${isBg ? 'Печат' : 'Print'}</button>
                    <button id="pd-cancel" style="
                        padding:12px 20px;background:#e9ecef;color:#555;
                        border:none;border-radius:8px;font-size:1rem;
                        cursor:pointer;
                    ">${isBg ? 'Отказ' : 'Cancel'}</button>
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
                const weekVal    = dialog.querySelector('#pd-week').value;
                const tplVal     = dialog.querySelector('#pd-template').value;
                const marginVal  = dialog.querySelector('#pd-margin').value;

                let weekDates;
                if (weekVal === 'last')    weekDates = lastWeek;
                else if (weekVal === 'next') weekDates = nextWeek;
                else                        weekDates = currentWeek;

                close();
                resolve({
                    startDate:        weekDates[0],
                    endDate:          weekDates[4],
                    templateType:     tplVal === 'default' ? 'default' : 'saved',
                    templateSettings: tplVal !== 'default' ? savedTemplates[tplVal] : null,
                    margins:          marginPresets[marginVal]
                });
            });

            dialog.querySelector('#pd-cancel').addEventListener('click', () => {
                close();
                resolve(null);
            });

            // Close on overlay click
            overlay.addEventListener('click', () => {
                close();
                resolve(null);
            });
        });
    }
    
    // Default template settings
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
    
    // Generate meal plan data from menu for date range (Monday-Friday only)
    function generateMealPlanData(startDate, endDate) {
        const days = [];
        const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'bg';
        const dayNames = lang === 'bg'
            ? ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък']
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        for (let i = 0; i < 5; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateStr  = getLocalDateString(currentDate);
            const dayMenu  = window.getMenuForDate(dateStr);
            const hasMeals = ['slot1', 'slot2', 'slot3', 'slot4'].some(slotId => {
                const slot = dayMenu[slotId];
                return slot && slot.recipe;
            });
            
            if (hasMeals) {
                const meals = [];
                ['slot1', 'slot2', 'slot3', 'slot4'].forEach((slotId, mealNum) => {
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
                            number:      mealNum + 1,
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
    
    // Convert position name to CSS values
    function getPositionCSS(position) {
        const positions = {
            'center':        'center center',
            'top-left':      'top left',
            'top-center':    'top center',
            'top-right':     'top right',
            'center-left':   'center left',
            'center-right':  'center right',
            'bottom-left':   'bottom left',
            'bottom-center': 'bottom center',
            'bottom-right':  'bottom right'
        };
        return positions[position] || 'center center';
    }
    
    function getSizeCSS(size) {
        if (typeof size === 'number') return `${size}% auto`;
        return size || 'cover';
    }
    
    // ─── RENDER HTML ─────────────────────────────────────────────────────────
    function renderMenuHTML(data, s) {
        const is2Column = (s.templateStyle || 'compact') === 'detailed-2col';
        if (is2Column) return renderMenuHTML2Column(data, s);
        
        const { startDate, endDate, days } = data;
        const isCompact = (s.templateStyle || 'compact') === 'compact';
        const spacing = {
            containerPadding: '8px', headerMargin: '6px', dateMargin: '8px',
            dayMargin: '6px', dayPadding: '5px', dayNameMargin: '3px',
            mealMargin: isCompact ? '2px' : '3px', mealLeftMargin: '6px',
            footerMarginTop: '8px', footerPaddingTop: '6px',
            lineHeight: isCompact ? '1.15' : '1.2'
        };
        
        const dateRange = `${startDate.getDate().toString().padStart(2,'0')}.${(startDate.getMonth()+1).toString().padStart(2,'0')}-${endDate.getDate().toString().padStart(2,'0')}.${(endDate.getMonth()+1).toString().padStart(2,'0')} ${startDate.getFullYear()}г.`;
        const headerSize = s.headerFontSize || '20pt';
        const daySize    = s.dayNameSize    || '12pt';
        const mealSize   = s.mealFontSize   || '10pt';
        const footerSize = s.footerFontSize || '8pt';
        
        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:${spacing.containerPadding};font-family:Arial,sans-serif;">`;
        
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
        
        html += `<div style="position:relative;z-index:10;">`;
        
        if (s.showHeader) html += `<div style="text-align:${s.headerAlignment};margin-bottom:${spacing.headerMargin};"><span style="font-size:${headerSize};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:center;margin-bottom:${spacing.dateMargin};font-size:9pt;">${dateRange}</div>`;
        
        days.forEach(day => {
            const borderStyle = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const dayBg       = s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            html += `<div style="${borderStyle}${dayBg}padding:${spacing.dayPadding};margin-bottom:${spacing.dayMargin};border-radius:3px;"><div style="font-size:${daySize};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:${spacing.dayNameMargin};">${day.name}</div>`;
            
            day.meals.forEach(meal => {
                if (isCompact) {
                    html += `<div style="margin-bottom:${spacing.mealMargin};margin-left:${spacing.mealLeftMargin};font-size:${mealSize};line-height:${spacing.lineHeight};"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    if (s.showIngredients && meal.ingredients.length) {
                        html += `; ${meal.ingredients.map(ing => {
                            if (ing.hasAllergen) { let st=`color:${s.allergenColor};`; if(s.allergenBold) st+='font-weight:bold;'; if(s.allergenUnderline) st+='text-decoration:underline;'; return `<span style="${st}">${ing.name}</span>`; }
                            return ing.name;
                        }).join(', ')}`;
                    }
                    if (s.showCalories && meal.calories) html += ` ККАЛ ${meal.calories}`;
                    html += `</div>`;
                } else {
                    html += `<div style="margin-bottom:${spacing.mealMargin};margin-left:${spacing.mealLeftMargin};"><div style="font-size:${mealSize};line-height:${spacing.lineHeight};font-weight:500;"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    html += `</div>`;
                    if (s.showIngredients && meal.ingredients.length) {
                        html += `<div style="font-size:${mealSize};line-height:${spacing.lineHeight};margin-left:12px;color:#666;font-style:italic;">${meal.ingredients.map(ing => {
                            if (ing.hasAllergen) { let st=`color:${s.allergenColor};`; if(s.allergenBold) st+='font-weight:bold;'; if(s.allergenUnderline) st+='text-decoration:underline;'; return `<span style="${st}">${ing.name}</span>`; }
                            return ing.name;
                        }).join(', ')}`;
                        if (s.showCalories && meal.calories) html += ` - ККАЛ ${meal.calories}`;
                        html += `</div>`;
                    } else if (s.showCalories && meal.calories) {
                        html += `<div style="font-size:${mealSize};line-height:${spacing.lineHeight};margin-left:12px;color:#666;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                    }
                    html += `</div>`;
                }
            });
            html += `</div>`;
        });
        
        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment};margin-top:${spacing.footerMarginTop};padding-top:${spacing.footerPaddingTop};border-top:1px solid #ddd;font-size:${footerSize};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        return html;
    }
    
    // 2-column layout rendering
    function renderMenuHTML2Column(data, s) {
        const { startDate, endDate, days } = data;
        const spacing = {
            containerPadding: '8px', headerMargin: '6px', dateMargin: '8px',
            rowMargin: '6px', columnGap: '10px', dayPadding: '5px',
            dayNameMargin: '3px', mealMargin: '3px', mealLeftMargin: '6px',
            footerMarginTop: '8px', footerPaddingTop: '6px', lineHeight: '1.2'
        };
        const dateRange = `${startDate.getDate().toString().padStart(2,'0')}.${(startDate.getMonth()+1).toString().padStart(2,'0')}-${endDate.getDate().toString().padStart(2,'0')}.${(endDate.getMonth()+1).toString().padStart(2,'0')} ${startDate.getFullYear()}г.`;
        const headerSize = s.headerFontSize || '20pt';
        const daySize    = s.dayNameSize    || '12pt';
        const mealSize   = s.mealFontSize   || '10pt';
        const footerSize = s.footerFontSize || '8pt';
        
        let html = `<div id="menu-content" style="background-color:${s.backgroundColor};position:relative;padding:${spacing.containerPadding};font-family:Arial,sans-serif;">`;
        
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
        
        html += `<div style="position:relative;z-index:10;">`;
        if (s.showHeader) html += `<div style="text-align:${s.headerAlignment};margin-bottom:${spacing.headerMargin};"><span style="font-size:${headerSize};color:${s.headerColor};font-weight:bold;">${s.headerText}</span></div>`;
        if (s.showDateRange) html += `<div style="text-align:center;margin-bottom:${spacing.dateMargin};font-size:9pt;">${dateRange}</div>`;
        
        const renderDay = (day) => {
            const borderStyle = s.dayBorder ? `border:${s.dayBorderThickness||'1px'} ${s.dayBorderStyle||'solid'} ${s.dayBorderColor||'#e0e0e0'};` : '';
            const dayBg = s.dayBackground !== 'transparent' ? `background:${s.dayBackground};` : '';
            let d = `<div style="${borderStyle}${dayBg}padding:${spacing.dayPadding};border-radius:3px;height:100%;"><div style="font-size:${daySize};color:${s.dayNameColor};font-weight:${s.dayNameWeight||'bold'};margin-bottom:${spacing.dayNameMargin};">${day.name}</div>`;
            day.meals.forEach(meal => {
                d += `<div style="margin-bottom:${spacing.mealMargin};margin-left:${spacing.mealLeftMargin};"><div style="font-size:${mealSize};line-height:${spacing.lineHeight};font-weight:500;"> ${meal.number}. ${meal.name}`;
                if (s.showPortions && meal.portion) d += ` - ${meal.portion}`;
                d += `</div>`;
                if (s.showIngredients && meal.ingredients.length) {
                    d += `<div style="font-size:${mealSize};line-height:${spacing.lineHeight};margin-left:12px;color:#666;font-style:italic;">${meal.ingredients.map(ing => {
                        if (ing.hasAllergen) { let st=`color:${s.allergenColor};`; if(s.allergenBold) st+='font-weight:bold;'; if(s.allergenUnderline) st+='text-decoration:underline;'; return `<span style="${st}">${ing.name}</span>`; }
                        return ing.name;
                    }).join(', ')}`;
                    if (s.showCalories && meal.calories) d += ` - ККАЛ ${meal.calories}`;
                    d += `</div>`;
                } else if (s.showCalories && meal.calories) {
                    d += `<div style="font-size:${mealSize};line-height:${spacing.lineHeight};margin-left:12px;color:#666;font-style:italic;">ККАЛ ${meal.calories}</div>`;
                }
                d += `</div>`;
            });
            d += `</div>`;
            return d;
        };
        
        for (let i = 0; i < days.length; i += 2) {
            html += `<div style="display:flex;gap:${spacing.columnGap};margin-bottom:${spacing.rowMargin};"><div style="flex:1;">${days[i] ? renderDay(days[i]) : ''}</div><div style="flex:1;">${days[i+1] ? renderDay(days[i+1]) : ''}</div></div>`;
        }
        
        if (s.showFooter) html += `<div style="text-align:${s.footerAlignment};margin-top:${spacing.footerMarginTop};padding-top:${spacing.footerPaddingTop};border-top:1px solid #ddd;font-size:${footerSize};color:#888;">${s.footerText}</div>`;
        html += `</div></div>`;
        return html;
    }
    
    // Open print window (A4, auto-scaling, custom margins)
    function openPrintWindow(html, mealPlanData, margins) {
        const printWindow = window.open('', '_blank');
        const dateStr = `${mealPlanData.startDate.getDate()}.${mealPlanData.startDate.getMonth()+1}-${mealPlanData.endDate.getDate()}.${mealPlanData.endDate.getMonth()+1}.${mealPlanData.startDate.getFullYear()}`;
        const { top, right, bottom, left } = margins;
        
        const printHTML = '<!DOCTYPE html>' +
            '<html><head>' +
            '<title>Weekly Menu ' + dateStr + '</title>' +
            '<meta charset="UTF-8">' +
            '<style>' +
            '* { margin:0; padding:0; box-sizing:border-box; }' +
            'body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; font-size:10px; line-height:1.2; color:#333; background:white; }' +
            '@page { size:A4 portrait; margin:' + top + 'mm ' + right + 'mm ' + bottom + 'mm ' + left + 'mm; }' +
            '@media print { body { width:210mm; height:297mm; overflow:hidden; } * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } }' +
            '@media screen { body { padding:' + top + 'mm ' + right + 'mm ' + bottom + 'mm ' + left + 'mm; max-width:210mm; margin:0 auto; } }' +
            '</style></head><body>' +
            html +
            '<script>' +
            'window.onload=function(){' +
            '  setTimeout(function(){' +
            '    var c=document.getElementById("menu-content");' +
            '    if(c){var ph=(297-' + top + '-' + bottom + ')*3.7795,ch=c.offsetHeight;' +
            '      if(ch>ph){var sf=ph/ch;c.style.transform="scale("+sf+")";c.style.transformOrigin="top left";c.style.width=(100/sf)+"%";}' +
            '    }' +
            '    setTimeout(function(){window.print();},500);' +
            '  },2000);' +
            '};' +
            '</script></body></html>';
        
        printWindow.document.write(printHTML);
        printWindow.document.close();
    }
    
    // ─── HELPERS ─────────────────────────────────────────────────────────────
    function getWeekDates(date) {
        const d   = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? 1 : -(day - 1);
        const monday = new Date(d);
        monday.setDate(d.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return Array.from({ length: 5 }, (_, i) => {
            const x = new Date(monday);
            x.setDate(monday.getDate() + i);
            return x;
        });
    }
    
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    
    function formatDateRange(startDate, endDate) {
        const lang = window.getCurrentLanguage ?
            (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US') : 'bg-BG';
        const start = startDate.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
        const end   = endDate.toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${start} – ${end}`;
    }
    
})(window);

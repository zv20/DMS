/**
 * Print Menu Function
 * Allows user to select week and template, then prints/exports meal plan
 * OPTIMIZED: Auto-scaling + custom margins for any printer
 * @version 4.1 - Added margin selection for maximum page utilization
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
            console.log('🖼️ Loading background image:', filename);
            const dataDir = await window.directoryHandle.getDirectoryHandle('data', { create: false });
            const imagesDir = await dataDir.getDirectoryHandle('images', { create: false });
            const backgroundsDir = await imagesDir.getDirectoryHandle('backgrounds', { create: false });
            const fileHandle = await backgroundsDir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            
            // Convert file to base64 data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log('✅ Background image loaded successfully, size:', Math.round(reader.result.length / 1024), 'KB');
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    console.error('❌ Failed to read image file');
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        } catch (err) {
            console.warn('⚠️ Failed to load background image:', filename, err);
            return null;
        }
    }
    
    // Main print menu function
    window.printMenu = async function() {
        // Step 1: Ask user which week to print
        const weekSelection = await selectWeekDialog();
        if (!weekSelection) return; // User cancelled
        
        console.log('🗃️ Selected week:', {
            start: getLocalDateString(weekSelection.startDate),
            end: getLocalDateString(weekSelection.endDate)
        });
        
        // Step 2: Ask user which template to use
        const templateChoice = await selectTemplateDialog();
        if (!templateChoice) return; // User cancelled
        
        // Step 3: Ask user for margin preference
        const marginChoice = await selectMarginDialog();
        if (!marginChoice) return; // User cancelled
        
        // Step 4: Generate meal plan data for selected week (Mon-Fri only, only days with meals)
        const mealPlanData = generateMealPlanData(weekSelection.startDate, weekSelection.endDate);
        
        console.log('📝 Generated meal plan:', mealPlanData);
        
        // Check if any meals exist
        if (mealPlanData.days.length === 0) {
            alert('No meals planned for the selected week!');
            return;
        }
        
        // Step 5: Load background image if present
        let settings;
        if (templateChoice.type === 'default') {
            settings = getDefaultSettings();
        } else {
            settings = templateChoice.settings;
        }
        
        // Load background image as base64
        if (settings.backgroundImage) {
            const base64Image = await loadBackgroundImageAsBase64(settings.backgroundImage);
            if (base64Image) {
                settings.backgroundImageData = base64Image;
            } else {
                console.warn('❌ Background image failed to load, printing without background');
            }
        }
        
        // Step 6: Render using selected template
        const html = renderMenuHTML(mealPlanData, settings);
        
        // Step 7: Open print window with auto-scaling and custom margins
        openPrintWindow(html, mealPlanData, marginChoice);
    };
    
    // Default template settings
    function getDefaultSettings() {
        return {
            templateStyle: 'compact',
            backgroundImage: null,
            backgroundColor: '#ffffff',
            backgroundOpacity: 1.0,
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
    
    // Dialog to select week
    function selectWeekDialog() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 400px;
            `;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            `;
            
            const currentWeek = getWeekDates(new Date());
            const nextWeek = getWeekDates(addDays(new Date(), 7));
            const lastWeek = getWeekDates(addDays(new Date(), -7));
            
            dialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #333;">📅 Select Week to Print</h2>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="week-option" data-week="last" style="
                        padding: 15px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                    ">
                        <strong>Last Week</strong><br>
                        <small style="color: #666;">${formatDateRange(lastWeek[0], lastWeek[4])}</small>
                    </button>
                    <button class="week-option" data-week="current" style="
                        padding: 15px;
                        border: 2px solid #fd7e14;
                        border-radius: 8px;
                        background: #fff5f0;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                    ">
                        <strong>This Week</strong><br>
                        <small style="color: #666;">${formatDateRange(currentWeek[0], currentWeek[4])}</small>
                    </button>
                    <button class="week-option" data-week="next" style="
                        padding: 15px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                    ">
                        <strong>Next Week</strong><br>
                        <small style="color: #666;">${formatDateRange(nextWeek[0], nextWeek[4])}</small>
                    </button>
                </div>
                <button id="cancel-week" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #e0e0e0;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                ">Cancel</button>
            `;
            
            document.body.appendChild(overlay);
            document.body.appendChild(dialog);
            
            // Add hover effects
            dialog.querySelectorAll('.week-option').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.borderColor = '#fd7e14';
                    btn.style.background = '#fff5f0';
                });
                btn.addEventListener('mouseleave', () => {
                    if (btn.dataset.week !== 'current') {
                        btn.style.borderColor = '#e0e0e0';
                        btn.style.background = 'white';
                    }
                });
                
                btn.addEventListener('click', () => {
                    const week = btn.dataset.week;
                    let dates;
                    if (week === 'current') dates = currentWeek;
                    else if (week === 'next') dates = nextWeek;
                    else dates = lastWeek;
                    
                    document.body.removeChild(overlay);
                    document.body.removeChild(dialog);
                    resolve({
                        startDate: dates[0],
                        endDate: dates[4] // Friday only
                    });
                });
            });
            
            document.getElementById('cancel-week').addEventListener('click', () => {
                document.body.removeChild(overlay);
                document.body.removeChild(dialog);
                resolve(null);
            });
        });
    }
    
    // Dialog to select template
    function selectTemplateDialog() {
        return new Promise((resolve) => {
            // Get templates from global storage
            const savedTemplates = window.menuTemplates || {};
            const templateNames = Object.keys(savedTemplates);
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 400px;
            `;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            `;
            
            let optionsHTML = '';
            
            // Default template option
            optionsHTML += `
                <button class="template-option" data-template="default" style="
                    padding: 15px;
                    border: 2px solid #fd7e14;
                    border-radius: 8px;
                    background: #fff5f0;
                    cursor: pointer;
                    text-align: left;
                    font-size: 15px;
                    margin-bottom: 12px;
                    width: 100%;
                ">
                    <strong>🎨 Default Template</strong><br>
                    <small style="color: #666;">Auto-scales to fit perfectly</small>
                </button>
            `;
            
            // Saved templates
            templateNames.forEach(name => {
                const template = savedTemplates[name];
                let styleLabel = 'Compact';
                if (template.templateStyle === 'detailed') styleLabel = 'Detailed';
                else if (template.templateStyle === 'detailed-2col') styleLabel = 'Detailed (2 columns)';
                
                optionsHTML += `
                    <button class="template-option" data-template="${name}" style="
                        padding: 15px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                        margin-bottom: 12px;
                        width: 100%;
                    ">
                        <strong>📋 ${name}</strong><br>
                        <small style="color: #666;">${styleLabel} - Auto-scales to fit</small>
                    </button>
                `;
            });
            
            dialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #333;">🎨 Select Template</h2>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${optionsHTML}
                </div>
                <button id="cancel-template" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #e0e0e0;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                ">Cancel</button>
            `;
            
            document.body.appendChild(overlay);
            document.body.appendChild(dialog);
            
            // Add hover effects and click handlers
            dialog.querySelectorAll('.template-option').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.borderColor = '#fd7e14';
                    btn.style.background = '#fff5f0';
                });
                btn.addEventListener('mouseleave', () => {
                    if (btn.dataset.template !== 'default') {
                        btn.style.borderColor = '#e0e0e0';
                        btn.style.background = 'white';
                    }
                });
                
                btn.addEventListener('click', () => {
                    const templateName = btn.dataset.template;
                    document.body.removeChild(overlay);
                    document.body.removeChild(dialog);
                    
                    if (templateName === 'default') {
                        resolve({ type: 'default' });
                    } else {
                        resolve({ type: 'saved', name: templateName, settings: savedTemplates[templateName] });
                    }
                });
            });
            
            document.getElementById('cancel-template').addEventListener('click', () => {
                document.body.removeChild(overlay);
                document.body.removeChild(dialog);
                resolve(null);
            });
        });
    }
    
    // NEW: Dialog to select page margins
    function selectMarginDialog() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 450px;
            `;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            `;
            
            dialog.innerHTML = `
                <h2 style="margin: 0 0 10px 0; color: #333;">📎 Page Margins</h2>
                <p style="margin: 0 0 20px 0; font-size: 13px; color: #666;">Choose margins to maximize your printable area</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="margin-option" data-margin="minimal" style="
                        padding: 15px;
                        border: 2px solid #fd7e14;
                        border-radius: 8px;
                        background: #fff5f0;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                    ">
                        <strong>🟢 Minimal Margins (5mm)</strong><br>
                        <small style="color: #666;">Maximum content space - Best for most printers</small>
                    </button>
                    <button class="margin-option" data-margin="normal" style="
                        padding: 15px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                    ">
                        <strong>🟡 Normal Margins (10mm)</strong><br>
                        <small style="color: #666;">Balanced spacing - Standard option</small>
                    </button>
                    <button class="margin-option" data-margin="comfortable" style="
                        padding: 15px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        text-align: left;
                        font-size: 15px;
                    ">
                        <strong>🔵 Comfortable Margins (15mm)</strong><br>
                        <small style="color: #666;">More whitespace - For older printers</small>
                    </button>
                </div>
                <div style="margin-top: 15px; padding: 12px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                    <p style="margin: 0; font-size: 12px; color: #1565c0;">
                        <strong>💡 Tip:</strong> If your printer cuts off edges, try larger margins.
                    </p>
                </div>
                <button id="cancel-margin" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #e0e0e0;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                ">Cancel</button>
            `;
            
            document.body.appendChild(overlay);
            document.body.appendChild(dialog);
            
            // Margin presets
            const marginPresets = {
                minimal: { top: 5, right: 5, bottom: 5, left: 5 },
                normal: { top: 10, right: 10, bottom: 10, left: 10 },
                comfortable: { top: 15, right: 15, bottom: 15, left: 15 }
            };
            
            // Add hover effects and click handlers
            dialog.querySelectorAll('.margin-option').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.borderColor = '#fd7e14';
                    btn.style.background = '#fff5f0';
                });
                btn.addEventListener('mouseleave', () => {
                    if (btn.dataset.margin !== 'minimal') {
                        btn.style.borderColor = '#e0e0e0';
                        btn.style.background = 'white';
                    }
                });
                
                btn.addEventListener('click', () => {
                    const marginType = btn.dataset.margin;
                    document.body.removeChild(overlay);
                    document.body.removeChild(dialog);
                    resolve(marginPresets[marginType]);
                });
            });
            
            document.getElementById('cancel-margin').addEventListener('click', () => {
                document.body.removeChild(overlay);
                document.body.removeChild(dialog);
                resolve(null);
            });
        });
    }
    
    // Generate meal plan data from menu for date range (Monday-Friday only, only days with meals)
    function generateMealPlanData(startDate, endDate) {
        const days = [];
        const dayNames = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък'];
        
        console.log('🔍 generateMealPlanData starting from:', startDate.toLocaleDateString());
        
        // Loop through 5 days starting from startDate
        for (let i = 0; i < 5; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dateStr = getLocalDateString(currentDate);
            console.log(`  Day ${i + 1}: ${dateStr} (${dayNames[i]})`);
            
            const dayMenu = window.getMenuForDate(dateStr);
            
            // Check if this day has any meals
            const hasMeals = ['slot1', 'slot2', 'slot3', 'slot4'].some(slotId => {
                const slot = dayMenu[slotId];
                return slot && slot.recipe;
            });
            
            // Only include days with meals
            if (hasMeals) {
                const meals = [];
                
                // Build meals from slots 1-4
                ['slot1', 'slot2', 'slot3', 'slot4'].forEach((slotId, mealNum) => {
                    const slot = dayMenu[slotId];
                    const recipe = slot && slot.recipe ? window.recipes.find(r => r.id === slot.recipe) : null;
                    
                    if (recipe) {
                        // Get ingredients with allergen info
                        const ingredientsData = (recipe.ingredients || []).map(ingObj => {
                            const ingId = typeof ingObj === 'string' ? ingObj : ingObj.id;
                            const ing = window.ingredients.find(i => i.id === ingId);
                            if (!ing) return null;
                            
                            return {
                                name: ing.name,
                                hasAllergen: ing.allergens && ing.allergens.length > 0
                            };
                        }).filter(Boolean);
                        
                        meals.push({
                            number: mealNum + 1,
                            name: recipe.name,
                            portion: recipe.portionSize || '',
                            calories: recipe.calories || null,
                            ingredients: ingredientsData
                        });
                    }
                });
                
                if (meals.length > 0) {
                    days.push({
                        name: dayNames[i],
                        meals: meals
                    });
                }
            }
        }
        
        return {
            startDate: startDate,
            endDate: endDate,
            days: days
        };
    }
    
    // Direct HTML rendering based on template settings
    function renderMenuHTML(data, s) {
        const { startDate, endDate, days } = data;
        
        // Check if using 2-column layout
        const is2Column = (s.templateStyle || 'compact') === 'detailed-2col';
        
        if (is2Column) {
            return renderMenuHTML2Column(data, s);
        }
        
        // Original single-column rendering
        const isCompact = (s.templateStyle || 'compact') === 'compact';
        const spacing = {
            containerPadding: '8px',
            headerMargin: '6px',
            dateMargin: '8px',
            dayMargin: '6px',
            dayPadding: '5px',
            dayNameMargin: '3px',
            mealMargin: isCompact ? '2px' : '3px',
            mealLeftMargin: '6px',
            footerMarginTop: '8px',
            footerPaddingTop: '6px',
            lineHeight: isCompact ? '1.15' : '1.2'
        };
        
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')} ${startDate.getFullYear()}г.`;
        
        // Parse font sizes (support both 'pt' and old format)
        const headerSize = s.headerFontSize || '20pt';
        const daySize = s.dayNameSize || '12pt';
        const mealSize = s.mealFontSize || '10pt';
        const footerSize = s.footerFontSize || '8pt';
        
        // Use base64 data if available, otherwise use color only
        let containerStyle = `padding: ${spacing.containerPadding}; font-family: Arial, sans-serif;`;
        if (s.backgroundImageData) {
            containerStyle += ` background: url('${s.backgroundImageData}') ${s.backgroundColor} no-repeat center center / cover;`;
        } else {
            containerStyle += ` background: ${s.backgroundColor};`;
        }
        
        let html = `<div id="menu-content" style="${containerStyle}">`;
        
        // Header
        if (s.showHeader) {
            html += `<div style="text-align: ${s.headerAlignment}; margin-bottom: ${spacing.headerMargin};"><span style="font-size: ${headerSize}; color: ${s.headerColor}; font-weight: bold;">${s.headerText}</span></div>`;
        }
        
        if (s.showDateRange) {
            html += `<div style="text-align: center; margin-bottom: ${spacing.dateMargin}; font-size: 9pt;">${dateRange}</div>`;
        }
        
        // Menu days
        days.forEach(day => {
            const borderStyle = s.dayBorder ? `border: ${s.dayBorderThickness || '1px'} ${s.dayBorderStyle || 'solid'} ${s.dayBorderColor || '#e0e0e0'};` : '';
            const dayStyle = `${borderStyle} ${s.dayBackground !== 'transparent' ? `background: ${s.dayBackground};` : ''} padding: ${spacing.dayPadding}; margin-bottom: ${spacing.dayMargin}; border-radius: 3px;`;
            html += `<div style="${dayStyle}"><div style="font-size: ${daySize}; color: ${s.dayNameColor}; font-weight: ${s.dayNameWeight || 'bold'}; margin-bottom: ${spacing.dayNameMargin};">${day.name}</div>`;
            
            day.meals.forEach(meal => {
                if (isCompact) {
                    // COMPACT: Everything on one line
                    html += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin}; font-size: ${mealSize}; line-height: ${spacing.lineHeight};"> ${meal.number}. ${meal.name}`;
                    
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    
                    if (s.showIngredients && meal.ingredients.length) {
                        html += `; ${meal.ingredients.map(ing => {
                            if (ing.hasAllergen) {
                                let style = `color: ${s.allergenColor};`;
                                if (s.allergenBold) style += ' font-weight: bold;';
                                if (s.allergenUnderline) style += ' text-decoration: underline;';
                                return `<span style="${style}">${ing.name}</span>`;
                            }
                            return ing.name;
                        }).join(', ')}`;
                    }
                    
                    if (s.showCalories && meal.calories) html += ` ККАЛ ${meal.calories}`;
                    
                    html += `</div>`;
                } else {
                    // DETAILED: Meal name on first line, ingredients + calories on second line
                    html += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin};">`;
                    
                    // Line 1: Meal number, name, portion (NO CALORIES)
                    html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; font-weight: 500;"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    html += `</div>`;
                    
                    // Line 2: Ingredients + Calories (if enabled)
                    if (s.showIngredients && meal.ingredients.length) {
                        html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 12px; color: #666; font-style: italic;">${meal.ingredients.map(ing => {
                            if (ing.hasAllergen) {
                                let style = `color: ${s.allergenColor};`;
                                if (s.allergenBold) style += ' font-weight: bold;';
                                if (s.allergenUnderline) style += ' text-decoration: underline;';
                                return `<span style="${style}">${ing.name}</span>`;
                            }
                            return ing.name;
                        }).join(', ')}`;
                        
                        // Add calories AFTER ingredients on same line
                        if (s.showCalories && meal.calories) {
                            html += ` - ККАЛ ${meal.calories}`;
                        }
                        html += `</div>`;
                    } else if (s.showCalories && meal.calories) {
                        // If no ingredients but calories exist
                        html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 12px; color: #666; font-style: italic;">ККАЛ ${meal.calories}</div>`;
                    }
                    
                    html += `</div>`;
                }
            });
            
            html += `</div>`;
        });
        
        // Footer
        if (s.showFooter) {
            html += `<div style="text-align: ${s.footerAlignment}; margin-top: ${spacing.footerMarginTop}; padding-top: ${spacing.footerPaddingTop}; border-top: 1px solid #ddd; font-size: ${footerSize}; color: #888;">${s.footerText}</div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    // 2-column layout rendering (Monday-Tuesday | Wednesday-Thursday | Friday)
    function renderMenuHTML2Column(data, s) {
        const { startDate, endDate, days } = data;
        
        const spacing = {
            containerPadding: '8px',
            headerMargin: '6px',
            dateMargin: '8px',
            rowMargin: '6px',
            columnGap: '10px',
            dayPadding: '5px',
            dayNameMargin: '3px',
            mealMargin: '3px',
            mealLeftMargin: '6px',
            footerMarginTop: '8px',
            footerPaddingTop: '6px',
            lineHeight: '1.2'
        };
        
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')} ${startDate.getFullYear()}г.`;
        
        // Parse font sizes (support both 'pt' and old format)
        const headerSize = s.headerFontSize || '20pt';
        const daySize = s.dayNameSize || '12pt';
        const mealSize = s.mealFontSize || '10pt';
        const footerSize = s.footerFontSize || '8pt';
        
        // Use base64 data if available, otherwise use color only
        let containerStyle = `padding: ${spacing.containerPadding}; font-family: Arial, sans-serif;`;
        if (s.backgroundImageData) {
            containerStyle += ` background: url('${s.backgroundImageData}') ${s.backgroundColor} no-repeat center center / cover;`;
        } else {
            containerStyle += ` background: ${s.backgroundColor};`;
        }
        
        let html = `<div id="menu-content" style="${containerStyle}">`;
        
        // Header
        if (s.showHeader) {
            html += `<div style="text-align: ${s.headerAlignment}; margin-bottom: ${spacing.headerMargin};"><span style="font-size: ${headerSize}; color: ${s.headerColor}; font-weight: bold;">${s.headerText}</span></div>`;
        }
        
        if (s.showDateRange) {
            html += `<div style="text-align: center; margin-bottom: ${spacing.dateMargin}; font-size: 9pt;">${dateRange}</div>`;
        }
        
        // Helper function to render a single day
        const renderDay = (day) => {
            const borderStyle = s.dayBorder ? `border: ${s.dayBorderThickness || '1px'} ${s.dayBorderStyle || 'solid'} ${s.dayBorderColor || '#e0e0e0'};` : '';
            const dayStyle = `${borderStyle} ${s.dayBackground !== 'transparent' ? `background: ${s.dayBackground};` : ''} padding: ${spacing.dayPadding}; border-radius: 3px; height: 100%;`;
            let dayHTML = `<div style="${dayStyle}"><div style="font-size: ${daySize}; color: ${s.dayNameColor}; font-weight: ${s.dayNameWeight || 'bold'}; margin-bottom: ${spacing.dayNameMargin};">${day.name}</div>`;
            
            day.meals.forEach(meal => {
                dayHTML += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin};">`;
                
                // Line 1: Meal number, name, portion
                dayHTML += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; font-weight: 500;"> ${meal.number}. ${meal.name}`;
                if (s.showPortions && meal.portion) dayHTML += ` - ${meal.portion}`;
                dayHTML += `</div>`;
                
                // Line 2: Ingredients + Calories
                if (s.showIngredients && meal.ingredients.length) {
                    dayHTML += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 12px; color: #666; font-style: italic;">${meal.ingredients.map(ing => {
                        if (ing.hasAllergen) {
                            let style = `color: ${s.allergenColor};`;
                            if (s.allergenBold) style += ' font-weight: bold;';
                            if (s.allergenUnderline) style += ' text-decoration: underline;';
                            return `<span style="${style}">${ing.name}</span>`;
                        }
                        return ing.name;
                    }).join(', ')}`;
                    
                    if (s.showCalories && meal.calories) {
                        dayHTML += ` - ККАЛ ${meal.calories}`;
                    }
                    dayHTML += `</div>`;
                } else if (s.showCalories && meal.calories) {
                    dayHTML += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 12px; color: #666; font-style: italic;">ККАЛ ${meal.calories}</div>`;
                }
                
                dayHTML += `</div>`;
            });
            
            dayHTML += `</div>`;
            return dayHTML;
        };
        
        // Layout: Row 1 (Mon-Tue), Row 2 (Wed-Thu), Row 3 (Fri)
        for (let i = 0; i < days.length; i += 2) {
            html += `<div style="display: flex; gap: ${spacing.columnGap}; margin-bottom: ${spacing.rowMargin};">`;
            
            // Left column
            html += `<div style="flex: 1;">`;
            if (days[i]) {
                html += renderDay(days[i]);
            }
            html += `</div>`;
            
            // Right column
            html += `<div style="flex: 1;">`;
            if (days[i + 1]) {
                html += renderDay(days[i + 1]);
            }
            html += `</div>`;
            
            html += `</div>`;
        }
        
        // Footer
        if (s.showFooter) {
            html += `<div style="text-align: ${s.footerAlignment}; margin-top: ${spacing.footerMarginTop}; padding-top: ${spacing.footerPaddingTop}; border-top: 1px solid #ddd; font-size: ${footerSize}; color: #888;">${s.footerText}</div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    // Open print window with HTML (A4 optimized with AUTO-SCALING and CUSTOM MARGINS)
    function openPrintWindow(html, mealPlanData, margins) {
        const printWindow = window.open('', '_blank');
        const dateStr = `${mealPlanData.startDate.getDate()}.${mealPlanData.startDate.getMonth() + 1}-${mealPlanData.endDate.getDate()}.${mealPlanData.endDate.getMonth() + 1}.${mealPlanData.startDate.getFullYear()}`;
        
        // Build the HTML page as a string without nested template literals
        const marginTop = margins.top;
        const marginRight = margins.right;
        const marginBottom = margins.bottom;
        const marginLeft = margins.left;
        
        const printHTML = '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
            '<title>Weekly Menu ' + dateStr + '</title>' +
            '<meta charset="UTF-8">' +
            '<style>' +
            '* { margin: 0; padding: 0; box-sizing: border-box; }' +
            'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 10px; line-height: 1.2; color: #333; background: white; }' +
            '@page { size: A4 portrait; margin: ' + marginTop + 'mm ' + marginRight + 'mm ' + marginBottom + 'mm ' + marginLeft + 'mm; }' +
            '@media print { body { width: 210mm; height: 297mm; overflow: hidden; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } }' +
            '@media screen { body { padding: ' + marginTop + 'mm ' + marginRight + 'mm ' + marginBottom + 'mm ' + marginLeft + 'mm; max-width: 210mm; margin: 0 auto; } }' +
            '</style>' +
            '</head>' +
            '<body>' +
            html +
            '<script>' +
            'function autoScaleContent() {' +
            '  const content = document.getElementById("menu-content");' +
            '  if (!content) return;' +
            '  const pageHeight = 297 - ' + marginTop + ' - ' + marginBottom + ';' +
            '  const pageHeightPx = pageHeight * 3.7795;' +
            '  const contentHeight = content.offsetHeight;' +
            '  console.log("📏 Content height:", contentHeight, "px");' +
            '  console.log("📏 Available page height:", pageHeightPx.toFixed(0), "px (with ' + marginTop + 'mm/' + marginBottom + 'mm margins)");' +
            '  if (contentHeight > pageHeightPx) {' +
            '    const scaleFactor = pageHeightPx / contentHeight;' +
            '    console.log("⚠️ Content too tall! Scaling down to", (scaleFactor * 100).toFixed(1) + "%");' +
            '    content.style.transform = "scale(" + scaleFactor + ")";' +
            '    content.style.transformOrigin = "top left";' +
            '    content.style.width = (100 / scaleFactor) + "%";' +
            '  } else {' +
            '    console.log("✅ Content fits perfectly!");' +
            '  }' +
            '}' +
            'window.onload = function() {' +
            '  console.log("📝 Print window loaded");' +
            '  console.log("📏 Margins:", "' + marginTop + 'mm / ' + marginRight + 'mm / ' + marginBottom + 'mm / ' + marginLeft + 'mm");' +
            '  setTimeout(function() {' +
            '    autoScaleContent();' +
            '    setTimeout(function() {' +
            '      console.log("✅ Opening print dialog");' +
            '      window.print();' +
            '    }, 500);' +
            '  }, 2000);' +
            '};' +
            '</script>' +
            '</body>' +
            '</html>';
        
        printWindow.document.write(printHTML);
        printWindow.document.close();
    }
    
    // Helper function to get Monday-Friday of a week
    function getWeekDates(date) {
        const currentDate = new Date(date);
        const day = currentDate.getDay();
        
        let diff;
        if (day === 0) {
            diff = 1;
        } else {
            diff = -(day - 1);
        }
        
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        
        const dates = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d);
        }
        
        return dates;
    }
    
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    
    function formatDateRange(startDate, endDate) {
        const lang = window.getCurrentLanguage ? 
            (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US') : 
            'bg-BG';
        
        const options = { month: 'short', day: 'numeric' };
        const start = startDate.toLocaleDateString(lang, options);
        const end = endDate.toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${start} - ${end}`;
    }
    
})(window);

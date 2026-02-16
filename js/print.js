/**
 * Print Menu Function
 * Allows user to select week and template, then prints/exports meal plan
 * Ultra-compact layout optimized for A4 paper (5 weekdays fit on one page)
 * UPDATED: Works with new StepTemplateBuilder + Compact vs Detailed styles
 */

(function(window) {
    
    // Helper to get local date string (YYYY-MM-DD) without timezone issues
    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
        
        // Step 3: Generate meal plan data for selected week (Mon-Fri only, only days with meals)
        const mealPlanData = generateMealPlanData(weekSelection.startDate, weekSelection.endDate);
        
        console.log('📝 Generated meal plan:', mealPlanData);
        
        // Check if any meals exist
        if (mealPlanData.days.length === 0) {
            alert('No meals planned for the selected week!');
            return;
        }
        
        // Step 4: Render using selected template
        const html = renderWithTemplate(mealPlanData, templateChoice);
        
        // Step 5: Open print window
        openPrintWindow(html, mealPlanData);
    };
    
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
                    <strong>🎨 Default Elegant Template</strong><br>
                    <small style="color: #666;">Clean numbered layout with allergen highlighting</small>
                </button>
            `;
            
            // Saved templates
            templateNames.forEach(name => {
                const template = savedTemplates[name];
                const styleLabel = template.templateStyle === 'detailed' ? 'Detailed' : 'Compact';
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
                        <small style="color: #666;">${styleLabel} style - Your saved template</small>
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
    
    // NEW: Render meal plan with selected template (works with new StepTemplateBuilder)
    function renderWithTemplate(mealPlanData, templateChoice) {
        let settings;
        
        if (templateChoice.type === 'default') {
            // Default template settings
            settings = {
                templateStyle: 'compact',
                backgroundImage: null,
                backgroundColor: '#ffffff',
                backgroundOpacity: 1.0,
                showHeader: true,
                headerText: 'Седмично меню',
                headerImage: null,
                headerAlignment: 'center',
                headerFontSize: 'large',
                headerColor: '#d2691e',
                showDateRange: true,
                showIngredients: true,
                showCalories: true,
                showPortions: true,
                dayBorder: false,
                dayBackground: 'transparent',
                dayNameSize: 'medium',
                dayNameColor: '#333333',
                dayNameWeight: 'bold',
                allergenColor: '#ff0000',
                allergenBold: true,
                showFooter: true,
                footerText: 'Prepared with care by KitchenPro',
                footerImage: null,
                footerAlignment: 'center',
                footerFontSize: 'small'
            };
        } else {
            settings = templateChoice.settings;
        }
        
        // Render HTML using template settings
        return renderMenuHTML(mealPlanData, settings);
    }
    
    // NEW: Direct HTML rendering based on template settings (NOW WITH COMPACT/DETAILED SUPPORT)
    function renderMenuHTML(data, s) {
        const { startDate, endDate, days } = data;
        
        // COMPACT vs DETAILED style logic (matches template-builder-steps.js)
        const isCompact = (s.templateStyle || 'compact') === 'compact';
        const spacing = {
            containerPadding: isCompact ? '12px' : '15px',
            headerMargin: isCompact ? '8px' : '10px',
            dateMargin: isCompact ? '10px' : '12px',
            dayMargin: isCompact ? '8px' : '8px',
            dayPadding: isCompact ? '6px' : '6px',
            dayNameMargin: isCompact ? '4px' : '5px',
            mealMargin: isCompact ? '3px' : '4px',
            mealLeftMargin: isCompact ? '8px' : '8px',
            footerMarginTop: isCompact ? '12px' : '15px',
            footerPaddingTop: isCompact ? '10px' : '12px',
            lineHeight: isCompact ? '1.2' : '1.3'
        };
        
        const dateRange = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')} ${startDate.getFullYear()}г.`;
        
        const sizeMaps = {
            small: { header: '18pt', day: '12pt', meal: '10pt', footer: '9pt' },
            medium: { header: '22pt', day: '14pt', meal: '12pt', footer: '10pt' },
            large: { header: '26pt', day: '16pt', meal: '14pt', footer: '11pt' }
        };
        
        const headerSize = sizeMaps[s.headerFontSize || 'large']?.header || '22pt';
        const daySize = sizeMaps[s.dayNameSize || 'medium']?.day || '14pt';
        const mealSize = sizeMaps[s.mealFontSize || 'medium']?.meal || '12pt';
        const footerSize = sizeMaps[s.footerFontSize || 'small']?.footer || '10pt';
        
        let html = `<div style="background: ${s.backgroundColor}; padding: ${spacing.containerPadding}; min-height: 400px; font-family: Arial, sans-serif;">`;
        
        // Header
        if (s.showHeader) {
            html += `<div style="text-align: ${s.headerAlignment}; margin-bottom: ${spacing.headerMargin};"><span style="font-size: ${headerSize}; color: ${s.headerColor}; font-weight: bold;">${s.headerText}</span></div>`;
        }
        
        if (s.showDateRange) {
            html += `<div style="text-align: center; margin-bottom: ${spacing.dateMargin}; font-size: ${isCompact ? '10pt' : '11pt'};">${dateRange}</div>`;
        }
        
        // Menu days
        days.forEach(day => {
            const dayStyle = `${s.dayBorder ? `border: 1px solid ${s.dayBorderColor || '#e0e0e0'};` : ''} ${s.dayBackground !== 'transparent' ? `background: ${s.dayBackground};` : ''} padding: ${spacing.dayPadding}; margin-bottom: ${spacing.dayMargin}; border-radius: 4px;`;
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
                    // DETAILED: Meal name on first line, ingredients on second line
                    html += `<div style="margin-bottom: ${spacing.mealMargin}; margin-left: ${spacing.mealLeftMargin};">`;
                    
                    // Line 1: Meal number, name, portion, calories
                    html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; font-weight: 500;"> ${meal.number}. ${meal.name}`;
                    if (s.showPortions && meal.portion) html += ` - ${meal.portion}`;
                    if (s.showCalories && meal.calories) html += ` (ККАЛ ${meal.calories})`;
                    html += `</div>`;
                    
                    // Line 2: Ingredients (if enabled and exist)
                    if (s.showIngredients && meal.ingredients.length) {
                        html += `<div style="font-size: ${mealSize}; line-height: ${spacing.lineHeight}; margin-left: 15px; color: #666; font-style: italic;">${meal.ingredients.map(ing => {
                            if (ing.hasAllergen) {
                                let style = `color: ${s.allergenColor};`;
                                if (s.allergenBold) style += ' font-weight: bold;';
                                if (s.allergenUnderline) style += ' text-decoration: underline;';
                                return `<span style="${style}">${ing.name}</span>`;
                            }
                            return ing.name;
                        }).join(', ')}</div>`;
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
    
    // Open print window with HTML (A4 optimized)
    function openPrintWindow(html, mealPlanData) {
        const printWindow = window.open('', '_blank');
        const dateStr = `${mealPlanData.startDate.getDate()}.${mealPlanData.startDate.getMonth() + 1}-${mealPlanData.endDate.getDate()}.${mealPlanData.endDate.getMonth() + 1}.${mealPlanData.startDate.getFullYear()}`;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Weekly Menu ${dateStr}</title>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                        font-size: 12px;
                        line-height: 1.3;
                        color: #333;
                        background: white;
                    }
                    
                    @page {
                        size: A4 portrait;
                        margin: 12mm 12mm 10mm 12mm;
                    }
                    
                    @media print {
                        body {
                            width: 210mm;
                            min-height: 297mm;
                        }
                    }
                    
                    @media screen {
                        body {
                            padding: 15mm;
                            max-width: 210mm;
                            margin: 0 auto;
                        }
                    }
                </style>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        setTimeout(() => window.print(), 500);
                    };
                </script>
            </body>
            </html>
        `);
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

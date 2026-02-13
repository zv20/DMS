/**
 * Print Menu Function
 * Allows user to select week and template, then prints/exports meal plan
 */

(function(window) {
    
    // Main print menu function
    window.printMenu = async function() {
        // Step 1: Ask user which week to print
        const weekSelection = await selectWeekDialog();
        if (!weekSelection) return; // User cancelled
        
        // Step 2: Ask user which template to use
        const templateChoice = await selectTemplateDialog();
        if (!templateChoice) return; // User cancelled
        
        // Step 3: Generate meal plan data for selected week (Mon-Fri only, only days with meals)
        const mealPlanData = generateMealPlanData(weekSelection.startDate, weekSelection.endDate);
        
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
            const savedTemplates = JSON.parse(localStorage.getItem('meal-templates') || '{}');
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
                        <small style="color: #666;">Your saved template</small>
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
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        let currentDate = new Date(startDate);
        let dayIndex = 0;
        
        // Only loop Mon-Fri (5 days)
        while (currentDate <= endDate && dayIndex < 5) {
            const dateStr = currentDate.toISOString().split('T')[0];
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
                        // Get ingredients
                        const ingredients = (recipe.ingredients || []).map(ingId => {
                            const ing = window.ingredients.find(i => i.id === ingId);
                            return ing ? ing.name : '';
                        }).filter(Boolean);
                        
                        // Get allergens - ingredients that have allergens
                        const allergens = [];
                        (recipe.ingredients || []).forEach(ingId => {
                            const ing = window.ingredients.find(i => i.id === ingId);
                            if (ing && ing.allergens && ing.allergens.length > 0) {
                                // This ingredient has allergens, add it to the list
                                allergens.push(ing.name);
                            }
                        });
                        
                        meals.push({
                            title: String(mealNum + 1),
                            name: recipe.name,
                            portion: recipe.portionSize || '',
                            calories: recipe.calories || null,
                            ingredients: ingredients,
                            allergens: allergens
                        });
                    }
                });
                
                // Only add day if it has at least one meal
                if (meals.length > 0) {
                    days.push({
                        date: dateStr,
                        dayName: dayNames[dayIndex],
                        meals: meals
                    });
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
            dayIndex++;
        }
        
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days: days
        };
    }
    
    // Render meal plan with selected template
    function renderWithTemplate(mealPlanData, templateChoice) {
        const renderer = new TemplateRenderer();
        
        let settings;
        if (templateChoice.type === 'default') {
            // Use default elegant template with ingredients shown and allergens underlined
            settings = {
                layoutStyle: 'elegant-single',
                showHeader: true,
                headerText: 'Weekly Meal Plan',
                headerAlignment: 'center',
                headerSize: '28',
                showDateRange: true,
                dateFormat: 'long',
                dayBlockBg: '#ffffff',
                dayBlockBorder: '#e0e0e0',
                dayBlockPadding: '15',
                dayNameSize: '18',
                dayNameColor: '#333333',
                dayNameWeight: 'bold',
                showMealTitles: true,
                mealTitleSize: '14',
                mealTitleColor: '#666666',
                showIngredients: true,
                ingredientLayout: 'list',
                numberingStyle: 'none',
                showFooter: true,
                footerText: 'Meal plan created with DMS',
                backgroundColor: '#f5f5f5',
                showBranding: true,
                separatorStyle: 'line',
                pageBorder: false
            };
        } else {
            // Use saved template settings, but force ingredients to show
            settings = { ...templateChoice.settings, showIngredients: true };
        }
        
        return renderer.render(settings, mealPlanData);
    }
    
    // Open print window with HTML
    function openPrintWindow(html, mealPlanData) {
        const printWindow = window.open('', '_blank');
        const dateRange = `${mealPlanData.startDate}_to_${mealPlanData.endDate}`;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Meal Plan ${dateRange}</title>
                <meta charset="UTF-8">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 1cm; }
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
    
    // Helper functions
    function getWeekDates(date) {
        const currentDate = new Date(date);
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        
        const monday = new Date(currentDate.setDate(diff));
        const dates = [];
        
        // Only get Monday through Friday (5 days)
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
        const options = { month: 'short', day: 'numeric' };
        const start = startDate.toLocaleDateString('en-US', options);
        const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${start} - ${end}`;
    }
    
})(window);

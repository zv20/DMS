/**
 * Template Renderer - Converts settings + data into HTML
 */

class TemplateRenderer {
    constructor() {
        this.layoutRenderers = {
            'single-column': this.renderSingleColumn.bind(this),
            'two-column': this.renderTwoColumn.bind(this),
            'table': this.renderTable.bind(this),
            'compact-cards': this.renderCompactCards.bind(this),
            'elegant-single': this.renderElegantSingle.bind(this)
        };
    }
    
    render(settings, data) {
        const layoutClass = `layout-${settings.layoutStyle}`;
        const containerStyle = `background-color: ${settings.backgroundColor};`;
        const borderClass = settings.pageBorder ? 'with-border' : '';
        
        let html = `<div class="meal-plan-container ${layoutClass} ${borderClass}" style="${containerStyle}">`;
        
        // Header
        if (settings.showHeader) {
            html += this.renderHeader(settings, data);
        }
        
        // Date Range
        if (settings.showDateRange && data.startDate && data.endDate) {
            html += this.renderDateRange(settings, data);
        }
        
        // Days (using selected layout)
        const layoutRenderer = this.layoutRenderers[settings.layoutStyle] || this.layoutRenderers['single-column'];
        html += layoutRenderer(settings, data);
        
        // Footer
        if (settings.showFooter) {
            html += this.renderFooter(settings);
        }
        
        html += `</div>`;
        return html;
    }
    
    renderHeader(settings, data) {
        const style = `
            text-align: ${settings.headerAlignment};
            font-size: ${settings.headerSize}px;
            margin-bottom: ${settings.isPrint ? '15px' : '20px'};
            font-weight: bold;
            color: #fd7e14;
        `;
        return `<div class="meal-plan-header" style="${style}">${settings.headerText}</div>`;
    }
    
    renderDateRange(settings, data) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const format = settings.dateFormat === 'short' ? 'short' : 'long';
        
        const dateStr = `${start.toLocaleDateString('en-US', { month: format, day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: format, day: 'numeric', year: 'numeric' })}`;
        
        const marginBottom = settings.isPrint ? '20px' : '30px';
        return `<div class="date-range" style="text-align: center; margin-bottom: ${marginBottom}; color: #666; font-size: 15px;">${dateStr}</div>`;
    }
    
    renderFooter(settings) {
        const marginTop = settings.isPrint ? '25px' : '40px';
        return `<div class="meal-plan-footer" style="text-align: center; margin-top: ${marginTop}; font-size: 11px; color: #999;">${settings.footerText}</div>`;
    }
    
    // Helper to format meal meta info (calories + portion)
    formatMealMeta(meal) {
        const parts = [];
        if (meal.portion) parts.push(meal.portion);
        if (meal.calories) parts.push(`${meal.calories} cal`);
        return parts.length > 0 ? ` (${parts.join(', ')})` : '';
    }
    
    // ELEGANT SINGLE PAGE LAYOUT - Optimized for A4 print
    renderElegantSingle(settings, data) {
        const isPrint = settings.isPrint || false;
        
        // Compact spacing for print
        const dayMarginBottom = isPrint ? '18px' : '30px';
        const dayPaddingBottom = isPrint ? '15px' : '25px';
        const mealMarginBottom = isPrint ? '10px' : '15px';
        const mealNumberSize = isPrint ? '36px' : '42px';
        const dayNameSize = isPrint ? '18px' : '20px';
        const mealNameSize = isPrint ? '14px' : '15px';
        const ingredientSize = isPrint ? '12px' : '13px';
        
        let html = '<div class="elegant-single-layout" style="max-width: 800px; margin: 0 auto;">';
        
        data.days.forEach((day, dayIndex) => {
            // Day container with divider line
            html += `<div class="elegant-day" style="
                margin-bottom: ${dayMarginBottom};
                padding-bottom: ${dayPaddingBottom};
                border-bottom: ${dayIndex < data.days.length - 1 ? '1px solid #e0e0e0' : 'none'};
            ">`;
            
            // Meals for this day
            day.meals.forEach((meal, mealIndex) => {
                html += `<div class="elegant-meal" style="
                    display: grid;
                    grid-template-columns: 50px 110px 1fr;
                    gap: 12px;
                    margin-bottom: ${mealMarginBottom};
                    align-items: start;
                ">`;
                
                // Meal number (large orange)
                html += `<div class="meal-number" style="
                    font-size: ${mealNumberSize};
                    font-weight: 600;
                    color: #fd7e14;
                    line-height: 1;
                    padding-top: 3px;
                ">${meal.title}</div>`;
                
                // Day name (only show on first meal)
                if (mealIndex === 0) {
                    html += `<div class="day-name" style="
                        font-size: ${dayNameSize};
                        font-weight: bold;
                        color: #333;
                        padding-top: 8px;
                    ">${day.dayName}</div>`;
                } else {
                    html += `<div></div>`; // Empty cell for grid alignment
                }
                
                // Meal details (name + portion/cal + ingredients)
                html += `<div class="meal-details" style="padding-top: 6px;">`;
                
                // Meal name with portion and calories
                const mealMeta = this.formatMealMeta(meal);
                html += `<div class="meal-name" style="
                    font-size: ${mealNameSize};
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 4px;
                    line-height: 1.3;
                ">${meal.name}<span style="font-size: 12px; color: #888; font-weight: normal;">${mealMeta}</span></div>`;
                
                // Ingredients with allergen underlining
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div class="ingredients" style="
                        font-size: ${ingredientSize};
                        color: #888;
                        font-style: italic;
                        line-height: 1.4;
                    ">`;
                    
                    // Render each ingredient, underline allergens in red
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        if (hasAllergen) {
                            return `<span style="text-decoration: underline; text-decoration-color: #dc3545; text-decoration-thickness: 2px;">${ing}</span>`;
                        }
                        return ing;
                    });
                    
                    html += ingredientTexts.join(', ');
                    html += `</div>`;
                }
                
                html += `</div>`; // Close meal-details
                html += `</div>`; // Close elegant-meal
            });
            
            html += `</div>`; // Close elegant-day
        });
        
        html += '</div>';
        return html;
    }
    
    renderSingleColumn(settings, data) {
        let html = '<div class="days-container single-column">';
        
        data.days.forEach(day => {
            html += this.renderDay(settings, day);
        });
        
        html += '</div>';
        return html;
    }
    
    renderTwoColumn(settings, data) {
        let html = '<div class="days-container two-column">';
        
        data.days.forEach(day => {
            html += this.renderDay(settings, day);
        });
        
        html += '</div>';
        return html;
    }
    
    renderTable(settings, data) {
        let html = '<table class="meal-plan-table" style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr>';
        html += '<th style="border: 1px solid #ddd; padding: 10px; background: #f8f9fa;">Day</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px; background: #f8f9fa;">Meal 1</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px; background: #f8f9fa;">Meal 2</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px; background: #f8f9fa;">Meal 3</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px; background: #f8f9fa;">Meal 4</th>';
        html += '</tr></thead><tbody>';
        
        data.days.forEach(day => {
            html += '<tr>';
            html += `<td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">${day.dayName}</td>`;
            
            day.meals.forEach(meal => {
                html += `<td style="border: 1px solid #ddd; padding: 10px; vertical-align: top;">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="font-weight: 500; margin-bottom: 5px;">${meal.name}<span style="font-size: 11px; color: #666; font-weight: normal;">${mealMeta}</span></div>`;
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 12px; color: #666;">`;
                    
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        if (hasAllergen) {
                            return `<span style="text-decoration: underline; text-decoration-color: #dc3545; text-decoration-thickness: 2px;">${ing}</span>`;
                        }
                        return ing;
                    });
                    
                    html += ingredientTexts.join(', ');
                    html += `</div>`;
                }
                html += `</td>`;
            });
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    }
    
    renderCompactCards(settings, data) {
        let html = '<div class="days-container compact-cards">';
        
        data.days.forEach(day => {
            html += `<div class="day-card" style="
                background: ${settings.dayBlockBg};
                border: 1px solid ${settings.dayBlockBorder};
                padding: ${settings.dayBlockPadding}px;
                margin-bottom: 10px;
                border-radius: 8px;
            ">`;
            
            html += `<div class="day-name" style="
                font-size: ${settings.dayNameSize}px;
                color: ${settings.dayNameColor};
                font-weight: ${settings.dayNameWeight};
                margin-bottom: 8px;
            ">${day.dayName}</div>`;
            
            html += '<div class="meals-compact">';
            day.meals.forEach((meal, idx) => {
                if (idx > 0) html += ' • ';
                const mealMeta = this.formatMealMeta(meal);
                html += `<span style="font-size: 14px;">${meal.title}. ${meal.name}${mealMeta}</span>`;
            });
            html += '</div>';
            
            html += `</div>`;
        });
        
        html += '</div>';
        return html;
    }
    
    renderDay(settings, day) {
        const separator = this.getSeparator(settings);
        
        let html = `<div class="day-block" style="
            background: ${settings.dayBlockBg};
            border: 1px solid ${settings.dayBlockBorder};
            padding: ${settings.dayBlockPadding}px;
            margin-bottom: 15px;
        ">`;
        
        // Day name
        html += `<div class="day-name" style="
            font-size: ${settings.dayNameSize}px;
            color: ${settings.dayNameColor};
            font-weight: ${settings.dayNameWeight};
            margin-bottom: 10px;
        ">${day.dayName}</div>`;
        
        // Meals
        day.meals.forEach((meal, index) => {
            if (index > 0) html += separator;
            
            html += '<div class="meal">';
            
            if (settings.showMealTitles) {
                html += `<div class="meal-title" style="
                    font-size: ${settings.mealTitleSize}px;
                    color: ${settings.mealTitleColor};
                    font-weight: 600;
                    margin-bottom: 5px;
                ">${meal.title}</div>`;
            }
            
            const mealMeta = this.formatMealMeta(meal);
            html += `<div class="meal-name" style="font-weight: 500; margin-bottom: 5px;">${meal.name}<span style="font-size: 12px; color: #888; font-weight: normal;">${mealMeta}</span></div>`;
            
            if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                html += '<div class="ingredients" style="font-size: 13px; color: #666;">';
                
                const ingredientTexts = meal.ingredients.map(ing => {
                    const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                    if (hasAllergen) {
                        return `<span style="text-decoration: underline; text-decoration-color: #dc3545; text-decoration-thickness: 2px;">${ing}</span>`;
                    }
                    return ing;
                });
                
                html += ingredientTexts.join(', ');
                html += '</div>';
            }
            
            html += '</div>';
        });
        
        html += `</div>`;
        return html;
    }
    
    getSeparator(settings) {
        switch(settings.separatorStyle) {
            case 'line':
                return '<hr style="border: none; border-top: 1px solid #eee; margin: 10px 0;">';
            case 'space':
                return '<div style="height: 15px;"></div>';
            default:
                return '';
        }
    }
}

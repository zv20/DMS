/**
 * Template Renderer - Converts settings + data into HTML
 */

class TemplateRenderer {
    constructor() {
        this.layoutRenderers = {
            'single-column': this.renderSingleColumn.bind(this),
            'two-column': this.renderTwoColumn.bind(this),
            'table': this.renderTable.bind(this),
            'compact-cards': this.renderCompactCards.bind(this)
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
        const layoutRenderer = this.layoutRenderers[settings.layoutStyle];
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
            margin-bottom: 20px;
            font-weight: bold;
        `;
        return `<div class="meal-plan-header" style="${style}">${settings.headerText}</div>`;
    }
    
    renderDateRange(settings, data) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const format = settings.dateFormat === 'short' ? 'short' : 'long';
        
        const dateStr = `${start.toLocaleDateString('en-US', { month: format, day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: format, day: 'numeric', year: 'numeric' })}`;
        
        return `<div class="date-range" style="text-align: center; margin-bottom: 20px; color: #666;">${dateStr}</div>`;
    }
    
    renderFooter(settings) {
        return `<div class="meal-plan-footer" style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">${settings.footerText}</div>`;
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
        html += '<th style="border: 1px solid #ddd; padding: 10px;">Day</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px;">Breakfast</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px;">Lunch</th>';
        html += '<th style="border: 1px solid #ddd; padding: 10px;">Dinner</th>';
        html += '</tr></thead><tbody>';
        
        data.days.forEach(day => {
            html += '<tr>';
            html += `<td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">${day.dayName}</td>`;
            
            day.meals.forEach(meal => {
                html += `<td style="border: 1px solid #ddd; padding: 10px;">`;
                html += `<div style="font-weight: 500;">${meal.name}</div>`;
                if (settings.showIngredients) {
                    html += `<div style="font-size: 12px; color: #666; margin-top: 5px;">${meal.ingredients.join(', ')}</div>`;
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
                html += `<span style="font-size: 14px;">${meal.name}</span>`;
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
            
            html += `<div class="meal-name" style="font-weight: 500; margin-bottom: 5px;">${meal.name}</div>`;
            
            if (settings.showIngredients && meal.ingredients) {
                html += '<div class="ingredients" style="font-size: 13px; color: #666;">';
                html += meal.ingredients.join(', ');
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

/**
 * Template Renderer - Converts settings + data into HTML
 * Now with 11 different layout styles!
 */

class TemplateRenderer {
    constructor() {
        this.layoutRenderers = {
            'single-column': this.renderSingleColumn.bind(this),
            'two-column': this.renderTwoColumn.bind(this),
            'table': this.renderTable.bind(this),
            'compact-cards': this.renderCompactCards.bind(this),
            'elegant-single': this.renderElegantSingle.bind(this),
            // NEW LAYOUTS
            'grid': this.renderGrid.bind(this),
            'timeline': this.renderTimeline.bind(this),
            'minimalist': this.renderMinimalist.bind(this),
            'magazine': this.renderMagazine.bind(this),
            'bordered-cards': this.renderBorderedCards.bind(this),
            'checklist': this.renderChecklist.bind(this)
        };
    }
    
    // FIXED: Parse date string in local timezone (YYYY-MM-DD)
    parseLocalDate(dateStr) {
        const parts = dateStr.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
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
        const marginBottom = settings.isPrint ? '10px' : '20px';
        const style = `
            text-align: ${settings.headerAlignment};
            font-size: ${settings.headerSize}px;
            margin-bottom: ${marginBottom};
            font-weight: bold;
            color: #fd7e14;
        `;
        return `<div class="meal-plan-header" style="${style}">${settings.headerText}</div>`;
    }
    
    // FIXED: Use local timezone parsing and respect language locale
    renderDateRange(settings, data) {
        const start = this.parseLocalDate(data.startDate);
        const end = this.parseLocalDate(data.endDate);
        
        const lang = window.getCurrentLanguage ? 
            (window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US') : 
            'en-US';
        
        const format = settings.dateFormat === 'short' ? 'short' : 'long';
        const dateStr = `${start.toLocaleDateString(lang, { month: format, day: 'numeric' })} - ${end.toLocaleDateString(lang, { month: format, day: 'numeric', year: 'numeric' })}`;
        
        const marginBottom = settings.isPrint ? '12px' : '30px';
        const fontSize = settings.isPrint ? '12px' : '15px';
        return `<div class="date-range" style="text-align: center; margin-bottom: ${marginBottom}; color: #666; font-size: ${fontSize};">${dateStr}</div>`;
    }
    
    renderFooter(settings) {
        const marginTop = settings.isPrint ? '15px' : '40px';
        return `<div class="meal-plan-footer" style="text-align: center; margin-top: ${marginTop}; font-size: 10px; color: #999;">${settings.footerText}</div>`;
    }
    
    formatMealMeta(meal) {
        const parts = [];
        if (meal.portion) parts.push(meal.portion);
        if (meal.calories) parts.push(`${meal.calories} cal`);
        return parts.length > 0 ? ` (${parts.join(', ')})` : '';
    }
    
    // ========== NEW LAYOUT: GRID ==========
    // Modern card grid layout - meals in a responsive grid
    renderGrid(settings, data) {
        const isPrint = settings.isPrint || false;
        const cardPadding = isPrint ? '8px' : '15px';
        const cardMargin = isPrint ? '8px' : '12px';
        const mealNameSize = isPrint ? '13px' : '16px';
        const ingredientSize = isPrint ? '10px' : '12px';
        
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
        
        data.days.forEach(day => {
            day.meals.forEach(meal => {
                html += `<div style="
                    background: #fff;
                    border: 2px solid #fd7e14;
                    border-radius: 10px;
                    padding: ${cardPadding};
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                ">`;
                
                // Day badge
                html += `<div style="
                    display: inline-block;
                    background: #fd7e14;
                    color: white;
                    padding: 3px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: bold;
                    margin-bottom: 8px;
                ">${day.dayName}</div>`;
                
                // Meal number badge
                html += `<div style="
                    display: inline-block;
                    background: #333;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    text-align: center;
                    line-height: 24px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-left: 5px;
                    margin-bottom: 8px;
                ">${meal.title}</div>`;
                
                // Meal name
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="font-size: ${mealNameSize}; font-weight: 600; color: #333; margin-bottom: 5px;">${meal.name}</div>`;
                
                if (meal.portion || meal.calories) {
                    html += `<div style="font-size: 11px; color: #888; margin-bottom: 5px;">${mealMeta.replace(/[()]/g, '')}</div>`;
                }
                
                // Ingredients
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: ${ingredientSize}; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">`;
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        return hasAllergen ? `<span style="color: #dc3545; font-weight: bold;">${ing}</span>` : ing;
                    });
                    html += ingredientTexts.join(', ');
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
        });
        
        html += '</div>';
        return html;
    }
    
    // ========== NEW LAYOUT: TIMELINE ==========
    // Vertical timeline with connector lines
    renderTimeline(settings, data) {
        const isPrint = settings.isPrint || false;
        const dotSize = isPrint ? '12px' : '16px';
        const fontSize = isPrint ? '13px' : '15px';
        
        let html = '<div style="position: relative; padding-left: 40px;">';
        
        // Vertical line
        html += '<div style="position: absolute; left: 8px; top: 0; bottom: 0; width: 3px; background: #fd7e14;"></div>';
        
        data.days.forEach((day, dayIdx) => {
            // Day header with timeline dot
            html += `<div style="position: relative; margin-bottom: 20px;">`;
            html += `<div style="
                position: absolute;
                left: -34px;
                top: 5px;
                width: ${dotSize};
                height: ${dotSize};
                background: #fd7e14;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 2px #fd7e14;
            "></div>`;
            
            html += `<div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px;">${day.dayName}</div>`;
            
            // Meals
            day.meals.forEach(meal => {
                html += `<div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #fd7e14;">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="font-weight: 600; font-size: ${fontSize}; color: #333;">${meal.title}. ${meal.name}<span style="font-size: 11px; color: #888; font-weight: normal;">${mealMeta}</span></div>`;
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 12px; color: #666; margin-top: 5px;">`;
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        return hasAllergen ? `<span style="color: #dc3545; font-weight: bold;">${ing}</span>` : ing;
                    });
                    html += ingredientTexts.join(', ');
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        });
        
        html += '</div>';
        return html;
    }
    
    // ========== NEW LAYOUT: MINIMALIST ==========
    // Ultra-clean, minimal design with maximum whitespace
    renderMinimalist(settings, data) {
        const isPrint = settings.isPrint || false;
        const spacing = isPrint ? '15px' : '25px';
        
        let html = '<div style="max-width: 700px; margin: 0 auto;">';
        
        data.days.forEach((day, dayIdx) => {
            if (dayIdx > 0) html += `<div style="height: ${spacing}; border-bottom: 1px solid #e0e0e0; margin: ${spacing} 0;"></div>`;
            
            html += `<div style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 15px;">${day.dayName}</div>`;
            
            day.meals.forEach(meal => {
                html += `<div style="margin-bottom: 20px;">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 5px;">`;
                html += `<span style="font-size: 24px; font-weight: 300; color: #fd7e14;">${meal.title}</span>`;
                html += `<span style="font-size: 16px; font-weight: 400; color: #333;">${meal.name}</span>`;
                if (meal.portion || meal.calories) {
                    html += `<span style="font-size: 12px; color: #999;">${mealMeta.replace(/[()]/g, '')}</span>`;
                }
                html += `</div>`;
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 13px; color: #666; padding-left: 35px;">`;
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        return hasAllergen ? `<span style="text-decoration: underline; text-decoration-color: #dc3545;">${ing}</span>` : ing;
                    });
                    html += ingredientTexts.join(' · ');
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
        });
        
        html += '</div>';
        return html;
    }
    
    // ========== NEW LAYOUT: MAGAZINE ==========
    // Magazine-style with alternating emphasis
    renderMagazine(settings, data) {
        const isPrint = settings.isPrint || false;
        
        let html = '<div style="column-count: 2; column-gap: 30px; max-width: 900px; margin: 0 auto;">';
        
        data.days.forEach(day => {
            html += `<div style="break-inside: avoid; margin-bottom: 20px;">`;
            
            // Day header with decorative element
            html += `<div style="
                background: linear-gradient(135deg, #fd7e14 0%, #ff9a56 100%);
                color: white;
                padding: 12px 15px;
                border-radius: 8px 8px 0 0;
                font-size: 16px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
            ">${day.dayName}</div>`;
            
            html += `<div style="border: 2px solid #fd7e14; border-top: none; padding: 15px; border-radius: 0 0 8px 8px; background: white;">`;
            
            day.meals.forEach((meal, idx) => {
                if (idx > 0) html += '<hr style="border: none; border-top: 1px dashed #ddd; margin: 10px 0;">';
                
                html += `<div style="margin-bottom: 10px;">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">`;
                html += `<span style="
                    background: #333;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: bold;
                ">${meal.title}</span>`;
                html += `<span style="font-size: 14px; font-weight: 600; color: #333;">${meal.name}</span>`;
                html += `</div>`;
                
                if (meal.portion || meal.calories) {
                    html += `<div style="font-size: 11px; color: #888; margin-left: 28px;">${mealMeta.replace(/[()]/g, '')}</div>`;
                }
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 11px; color: #666; margin-left: 28px; margin-top: 3px;">`;
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        return hasAllergen ? `<strong style="color: #dc3545;">${ing}</strong>` : ing;
                    });
                    html += ingredientTexts.join(', ');
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div></div>`;
        });
        
        html += '</div>';
        return html;
    }
    
    // ========== NEW LAYOUT: BORDERED CARDS ==========
    // Each day in a distinct card with strong borders
    renderBorderedCards(settings, data) {
        const isPrint = settings.isPrint || false;
        const cardPadding = isPrint ? '12px' : '20px';
        
        let html = '<div style="max-width: 800px; margin: 0 auto;">';
        
        data.days.forEach(day => {
            html += `<div style="
                border: 3px solid #333;
                border-radius: 12px;
                padding: ${cardPadding};
                margin-bottom: 20px;
                background: white;
                box-shadow: 4px 4px 0 rgba(253, 126, 20, 0.3);
            ">`;
            
            // Day header
            html += `<div style="
                font-size: 20px;
                font-weight: bold;
                color: #fd7e14;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #333;
            ">${day.dayName}</div>`;
            
            day.meals.forEach(meal => {
                html += `<div style="margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 6px;">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="font-weight: 600; font-size: 15px; color: #333; margin-bottom: 3px;">`;
                html += `<span style="color: #fd7e14; margin-right: 5px;">${meal.title}.</span>${meal.name}`;
                if (meal.portion || meal.calories) {
                    html += `<span style="font-size: 11px; color: #888; font-weight: normal;">${mealMeta}</span>`;
                }
                html += `</div>`;
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 12px; color: #666;">`;
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        return hasAllergen ? `<span style="background: #ffe5e5; padding: 2px 4px; border-radius: 3px; color: #dc3545; font-weight: bold;">${ing}</span>` : ing;
                    });
                    html += ingredientTexts.join(', ');
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        });
        
        html += '</div>';
        return html;
    }
    
    // ========== NEW LAYOUT: CHECKLIST ==========
    // Checkbox-style for meal tracking
    renderChecklist(settings, data) {
        const isPrint = settings.isPrint || false;
        
        let html = '<div style="max-width: 700px; margin: 0 auto; font-family: monospace;">';
        
        data.days.forEach(day => {
            html += `<div style="margin-bottom: 25px;">`;
            
            // Day header
            html += `<div style="
                background: #333;
                color: white;
                padding: 8px 12px;
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            ">${day.dayName}</div>`;
            
            day.meals.forEach(meal => {
                html += `<div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-left: 3px solid #fd7e14;">`;
                
                // Checkbox
                html += `<div style="
                    width: 18px;
                    height: 18px;
                    border: 2px solid #333;
                    border-radius: 3px;
                    flex-shrink: 0;
                    margin-top: 2px;
                "></div>`;
                
                html += `<div style="flex: 1;">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 3px;">`;
                html += `<span style="color: #fd7e14;">[${meal.title}]</span> ${meal.name}`;
                if (meal.portion || meal.calories) {
                    html += `<span style="font-size: 11px; color: #888; font-weight: normal;">${mealMeta}</span>`;
                }
                html += `</div>`;
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div style="font-size: 11px; color: #666;">`;
                    const ingredientTexts = meal.ingredients.map(ing => {
                        const hasAllergen = meal.allergens && meal.allergens.includes(ing);
                        return hasAllergen ? `<span style="color: #dc3545; font-weight: bold;">⚠ ${ing}</span>` : ing;
                    });
                    html += '→ ' + ingredientTexts.join(', ');
                    html += `</div>`;
                }
                
                html += `</div></div>`;
            });
            
            html += `</div>`;
        });
        
        html += '</div>';
        return html;
    }
    
    // ========== ORIGINAL LAYOUTS ==========
    
    renderElegantSingle(settings, data) {
        const isPrint = settings.isPrint || false;
        
        const dayMarginBottom = isPrint ? '10px' : '30px';
        const dayPaddingBottom = isPrint ? '10px' : '25px';
        const mealMarginBottom = isPrint ? '6px' : '15px';
        const mealNumberSize = isPrint ? '30px' : '42px';
        const dayNameSize = isPrint ? '15px' : '20px';
        const mealNameSize = isPrint ? '12px' : '15px';
        const ingredientSize = isPrint ? '10px' : '13px';
        const gridGap = isPrint ? '10px' : '15px';
        const gridCols = isPrint ? '45px 100px 1fr' : '60px 120px 1fr';
        const numberPadding = isPrint ? '2px' : '5px';
        const dayPadding = isPrint ? '5px' : '10px';
        const detailsPadding = isPrint ? '4px' : '8px';
        
        let html = '<div class="elegant-single-layout" style="max-width: 800px; margin: 0 auto;">';
        
        data.days.forEach((day, dayIndex) => {
            html += `<div class="elegant-day" style="
                margin-bottom: ${dayMarginBottom};
                padding-bottom: ${dayPaddingBottom};
                border-bottom: ${dayIndex < data.days.length - 1 ? '1px solid #e0e0e0' : 'none'};
            ">`;
            
            day.meals.forEach((meal, mealIndex) => {
                html += `<div class="elegant-meal" style="
                    display: grid;
                    grid-template-columns: ${gridCols};
                    gap: ${gridGap};
                    margin-bottom: ${mealMarginBottom};
                    align-items: start;
                ">`;
                
                html += `<div class="meal-number" style="
                    font-size: ${mealNumberSize};
                    font-weight: 600;
                    color: #fd7e14;
                    line-height: 1;
                    padding-top: ${numberPadding};
                ">${meal.title}</div>`;
                
                if (mealIndex === 0) {
                    html += `<div class="day-name" style="
                        font-size: ${dayNameSize};
                        font-weight: bold;
                        color: #333;
                        padding-top: ${dayPadding};
                    ">${day.dayName}</div>`;
                } else {
                    html += `<div></div>`;
                }
                
                html += `<div class="meal-details" style="padding-top: ${detailsPadding};">`;
                
                const mealMeta = this.formatMealMeta(meal);
                html += `<div class="meal-name" style="
                    font-size: ${mealNameSize};
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 3px;
                    line-height: 1.2;
                ">${meal.name}<span style="font-size: 11px; color: #888; font-weight: normal;">${mealMeta}</span></div>`;
                
                if (settings.showIngredients && meal.ingredients && meal.ingredients.length > 0) {
                    html += `<div class="ingredients" style="
                        font-size: ${ingredientSize};
                        color: #888;
                        font-style: italic;
                        line-height: 1.3;
                    ">`;
                    
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
                
                html += `</div></div>`;
            });
            
            html += `</div>`;
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
        
        html += `<div class="day-name" style="
            font-size: ${settings.dayNameSize}px;
            color: ${settings.dayNameColor};
            font-weight: ${settings.dayNameWeight};
            margin-bottom: 10px;
        ">${day.dayName}</div>`;
        
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

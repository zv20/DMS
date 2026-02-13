/**
 * Template Print Module
 * Handles PDF generation and printing with templates
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;
    
    const TemplatePrint = {
        print: async function(templateId, selectedWeekStart, manager) {
            if (!selectedWeekStart) {
                alert(window.t('alert_no_week_selected'));
                return;
            }

            let settings;
            if (templateId === 'default') {
                settings = manager.getSettingsFromUI();
            } else {
                const template = window.savedTemplates.find(t => t.id === templateId);
                settings = template || manager.getSettingsFromUI();
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert(window.t('alert_popup_blocked'));
                return;
            }

            // Convert background image to base64 for printing
            console.log('🖼️ Converting background image for printing...');
            let backgroundImageTag = '';
            if (settings.backgroundImage) {
                try {
                    console.log('📁 Loading file:', settings.backgroundImage);
                    const base64 = await window.convertImageFileToBase64(settings.backgroundImage);
                    if (base64) {
                        console.log('✅ Base64 conversion successful, length:', base64.length);
                        backgroundImageTag = `<img src="${base64}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: ${settings.background.opacity}; z-index: -1; pointer-events: none;">`;
                    } else {
                        console.warn('⚠️ Base64 conversion returned null');
                    }
                } catch (error) {
                    console.error('❌ Failed to convert background image:', error);
                }
            }

            let logoUrl = '';
            if (settings.branding?.logo) {
                logoUrl = await window.loadImageFile(settings.branding.logo);
            }

            // Build array of only days with meals
            const daysWithMeals = [];
            for (let i = 0; i < CONST.WEEK.DAYS_COUNT; i++) {
                const day = new Date(selectedWeekStart);
                day.setDate(selectedWeekStart.getDate() + i);
                const dateStr = day.toISOString().split('T')[0];
                const dayMenu = window.currentMenu[dateStr];
                
                // Only include if day has meals
                if (manager.hasMeals(dayMenu)) {
                    daysWithMeals.push({
                        date: day,
                        dateStr: dateStr,
                        dayName: day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' }),
                        dayMenu: dayMenu
                    });
                }
            }

            let html = this.generatePrintHTML(settings, selectedWeekStart, backgroundImageTag, daysWithMeals, manager);

            printWindow.document.write(html);
            printWindow.document.close();

            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, CONST.TIMING.PRINT_DELAY);
            };
        },

        generatePrintHTML: function(settings, selectedWeekStart, backgroundImageTag, daysWithMeals, manager) {
            const dateRange = manager.getDateRangeText(0, 4, selectedWeekStart);
            
            let html = `
            <!DOCTYPE html>
            <html lang="${window.getCurrentLanguage()}">
            <head>
                <meta charset="UTF-8">
                <title>${settings.header.text} - ${dateRange}</title>
                <style>
                    @page {
                        size: A4;
                        margin: ${settings.layout.marginTop}mm ${settings.layout.marginRight}mm ${settings.layout.marginBottom}mm ${settings.layout.marginLeft}mm;
                    }
                    
                    * {
                        box-sizing: border-box;
                    }
                    
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                    
                    body {
                        font-family: '${CONST.TYPOGRAPHY.HEADER_FONT_FAMILY}', Arial, sans-serif;
                        position: relative;
                        ${settings.pageBorder.enabled ? `
                            border: ${settings.pageBorder.width}px ${settings.pageBorder.style} ${settings.pageBorder.color};
                            border-radius: ${settings.pageBorder.radius}px;
                            padding: 10mm;
                        ` : ''}
                    }
                    
                    #page-container {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .print-header {
                        text-align: ${settings.header.textAlign};
                        margin-bottom: 8px;
                        flex-shrink: 0;
                        ${settings.separators.headerEnabled ? `border-bottom: ${settings.separators.headerWidth}px ${settings.separators.headerStyle} ${settings.separators.headerColor}; padding-bottom: 4px;` : ''}
                    }
                    .print-header h1 {
                        color: ${settings.header.color};
                        font-size: ${settings.header.fontSize};
                        font-weight: ${settings.header.fontWeight};
                        font-family: ${settings.header.fontFamily};
                        text-transform: ${settings.header.textTransform};
                        margin: 0 0 3px 0;
                        line-height: 1.1;
                    }
                    .date-range {
                        font-size: ${settings.dateRange.fontSize};
                        color: ${settings.dateRange.color};
                        font-weight: ${settings.dateRange.fontWeight};
                        text-align: ${settings.dateRange.textAlign};
                        margin: 0;
                        line-height: 1;
                    }
                    
                    #days-container {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: stretch;
                        gap: ${settings.layout.dayBlockSpacing}px;
                        overflow: hidden;
                    }
                    
                    .print-day-block {
                        background: ${settings.dayBlock.bg};
                        border-radius: ${settings.dayBlock.borderRadius};
                        padding: 6px 8px;
                        ${this.getBorderStylesCSS(settings)}
                        box-shadow: ${window.getShadowCSS(settings.dayBlock.shadow)};
                        page-break-inside: avoid;
                    }
                    .day-name {
                        font-size: ${settings.dayName.fontSize};
                        color: ${settings.dayName.color};
                        font-weight: ${settings.dayName.fontWeight};
                        border-bottom: 1px solid ${CONST.COLORS.DAY_SEPARATOR_COLOR};
                        margin-bottom: 4px;
                        padding-bottom: 2px;
                        line-height: 1.1;
                    }
                    .meal-item {
                        margin-bottom: 3px;
                    }
                    .meal-title {
                        font-size: ${settings.mealTitle.fontSize};
                        color: ${settings.mealTitle.color};
                        font-weight: ${settings.mealTitle.fontWeight};
                        margin-bottom: 1px;
                        line-height: 1.1;
                    }
                    .ingredients {
                        font-size: ${settings.ingredients.fontSize};
                        color: ${settings.ingredients.color};
                        font-style: ${settings.ingredients.fontStyle};
                        margin-left: 8px;
                        line-height: 1.1;
                    }
                    .allergen-highlight {
                        color: ${CONST.COLORS.ALLERGEN_COLOR};
                        text-decoration: underline;
                        font-weight: 500;
                    }
                    .print-footer {
                        text-align: center;
                        font-size: ${settings.footer.fontSize};
                        color: ${settings.footer.color};
                        margin-top: 6px;
                        flex-shrink: 0;
                        line-height: 1;
                        ${settings.separators.footerEnabled ? `border-top: ${settings.separators.footerWidth}px ${settings.separators.footerStyle} ${settings.separators.footerColor}; padding-top: 4px;` : ''}
                    }
                    
                    @media print {
                        html, body {
                            width: 210mm;
                            height: 297mm;
                        }
                        
                        #page-container {
                            page-break-after: avoid;
                            page-break-inside: avoid;
                        }
                        
                        .print-day-block {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${backgroundImageTag}
                <div id="page-container">
                    <div class="print-header">
                        <h1>${settings.header.text}</h1>
                        ${settings.dateRange.show ? `<p class="date-range">${dateRange}</p>` : ''}
                    </div>
                    
                    <div id="days-container">
            `;

            // Loop through only days with meals
            daysWithMeals.forEach(dayData => {
                html += `<div class="print-day-block">`;
                html += `<div class="day-name">${dayData.dayName}</div>`;

                const slots = [
                    { id: CONST.SLOTS.SLOT_1, type: 'soup' },
                    { id: CONST.SLOTS.SLOT_2, type: 'main' },
                    { id: CONST.SLOTS.SLOT_3, type: 'dessert' },
                    { id: CONST.SLOTS.SLOT_4, type: 'other' }
                ];

                let mealIndex = 1;
                slots.forEach(slotConfig => {
                    const slot = dayData.dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            html += this.generateMealHTML(recipe, slotSettings, settings, mealIndex);
                            mealIndex++;
                        }
                    }
                });

                html += `</div>`;
            });

            html += `
                    </div>
                    
                    <div class="print-footer">${settings.footer.text}</div>
                </div>
            </body>
            </html>
            `;

            return html;
        },

        getBorderStylesCSS: function(settings) {
            const w = settings.dayBlock.borderWidth;
            const s = settings.dayBlock.borderStyle;
            const c = settings.dayBlock.borderColor;
            const sides = settings.dayBlock.borderSides;
            
            if (sides === CONST.BORDER_SIDES.NONE) return '';
            if (sides === CONST.BORDER_SIDES.ALL) return `border: ${w}px ${s} ${c};`;
            
            let css = '';
            if (sides === CONST.BORDER_SIDES.TOP) css = `border-top: ${w}px ${s} ${c};`;
            else if (sides === CONST.BORDER_SIDES.BOTTOM) css = `border-bottom: ${w}px ${s} ${c};`;
            else if (sides === CONST.BORDER_SIDES.LEFT_RIGHT) css = `border-left: ${w}px ${s} ${c}; border-right: ${w}px ${s} ${c};`;
            else if (sides === CONST.BORDER_SIDES.TOP_BOTTOM) css = `border-top: ${w}px ${s} ${c}; border-bottom: ${w}px ${s} ${c};`;
            
            return css;
        },

        generateMealHTML: function(recipe, slotSettings, settings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';

            const numberStr = window.getMealNumber(index, settings.mealNumbering.style, settings.mealNumbering.prefix, settings.mealNumbering.suffix);

            let html = `<div class="meal-item">`;
            html += `<div class="meal-title">${numberStr} ${recipe.name}`;

            let metadata = [];
            if (recipe.portionSize) {
                const portionUnit = isBulgarian ? 'гр' : 'g';
                const portionValue = recipe.portionSize.replace(/g|gr|гр/gi, '').trim();
                metadata.push(`${portionValue}${portionUnit}`);
            }
            if (slotSettings.showCalories && recipe.calories) {
                const calorieUnit = isBulgarian ? 'ККАЛ' : 'kcal';
                metadata.push(`${recipe.calories} ${calorieUnit}`);
            }
            if (metadata.length) {
                html += ` <span style="font-weight:normal; color:${CONST.COLORS.METADATA_COLOR}; font-size:7pt;">(${metadata.join(', ')})</span>`;
            }
            html += `</div>`;

            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                const recipeAllergens = window.getRecipeAllergens(recipe);
                const allergenIds = new Set(recipeAllergens.map(a => a.id));

                const ingredientsList = recipe.ingredients.map(ing => {
                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                    if (!fullIng) return '';

                    const hasAllergen = fullIng.allergens && fullIng.allergens.some(aid => allergenIds.has(aid));

                    if (slotSettings.showAllergens && hasAllergen) {
                        return `<span class="allergen-highlight">${fullIng.name}</span>`;
                    }
                    return fullIng.name;
                }).filter(n => n).join(', ');

                if (ingredientsList) {
                    html += `<div class="ingredients"><em>${window.t('text_ingredients_prefix')}</em> ${ingredientsList}</div>`;
                }
            }

            html += `</div>`;
            return html;
        }
    };

    window.TemplatePrint = TemplatePrint;

})(window);

/**
 * Template Preview Module
 * Handles live preview rendering
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    window.TemplatePreview = {
        refresh: async function(manager) {
            const settings = manager.getSettingsFromUI();
            
            const sheet = document.getElementById('livePreviewSheet');
            if (sheet && settings.backgroundImage) {
                let previewUrl = await window.loadImageFile(settings.backgroundImage);
                if (previewUrl) {
                    sheet.style.backgroundImage = `url(${previewUrl})`;
                    sheet.style.backgroundSize = 'cover';
                    sheet.style.backgroundPosition = settings.background.position;
                    sheet.style.backgroundRepeat = 'no-repeat';
                    sheet.style.opacity = settings.background.opacity;
                } else {
                    sheet.style.backgroundImage = 'none';
                }
            } else if (sheet) {
                sheet.style.backgroundImage = 'none';
            }
            
            const h = document.getElementById('previewHeader');
            const dateRange = settings.dateRange.show ? manager.getDateRangeText(0, 4) : '';
            if (h) {
                h.innerHTML = `
                    <h1 style="color:${settings.header.color}; font-size:${settings.header.fontSize}; font-weight:${settings.header.fontWeight}; font-family:${settings.header.fontFamily}; text-align:${settings.header.textAlign}; text-transform:${settings.header.textTransform}; margin:0 0 2px 0; line-height:1.2;">${settings.header.text}</h1>
                    ${settings.dateRange.show ? `<p style="text-align:${settings.dateRange.textAlign}; color:${settings.dateRange.color}; margin:0 0 8px 0; font-size:${settings.dateRange.fontSize}; font-weight:${settings.dateRange.fontWeight}; line-height:1;">${dateRange}</p>` : ''}
                `;
            }

            const list = document.getElementById('previewDaysList');
            if (list) {
                list.innerHTML = '';
                const weekStart = window.getWeekStart(window.currentCalendarDate || new Date());
                
                for (let i = 0; i < CONST.WEEK.DAYS_COUNT; i++) {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    const dateStr = day.toISOString().split('T')[0];
                    const dayMenu = window.currentMenu[dateStr];
                    
                    const dayName = day.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { weekday: 'long' });
                    const block = this.createDetailedDayBlock(dayName, dayMenu, settings, dateStr, manager);
                    
                    if (!manager.hasMeals(dayMenu)) {
                        block.style.opacity = '0.4';
                    }
                    list.appendChild(block);
                }
            }

            const f = document.getElementById('previewFooter');
            if (f) {
                const footerSep = settings.separators.footerEnabled ? `border-top:${settings.separators.footerWidth}px ${settings.separators.footerStyle} ${settings.separators.footerColor};` : '';
                f.innerHTML = `<div style="${footerSep} padding-top:4px; margin-top:6px; color:${settings.footer.color}; font-size:${settings.footer.fontSize}; text-align:center; line-height:1;">${settings.footer.text}</div>`;
            }
        },

        createDetailedDayBlock: function(dayName, dayMenu, settings, dateStr, manager) {
            const block = document.createElement('div');
            block.className = 'print-day-block';
            
            const getBorderStyles = () => {
                const width = settings.dayBlock.borderWidth;
                const style = settings.dayBlock.borderStyle;
                const color = settings.dayBlock.borderColor;
                const sides = settings.dayBlock.borderSides;
                
                if (sides === CONST.BORDER_SIDES.NONE) return 'border: none;';
                if (sides === CONST.BORDER_SIDES.ALL) return `border: ${width}px ${style} ${color};`;
                
                let css = '';
                if (sides === CONST.BORDER_SIDES.TOP) css += `border-top: ${width}px ${style} ${color};`;
                else if (sides === CONST.BORDER_SIDES.BOTTOM) css += `border-bottom: ${width}px ${style} ${color};`;
                else if (sides === CONST.BORDER_SIDES.LEFT_RIGHT) css += `border-left: ${width}px ${style} ${color}; border-right: ${width}px ${style} ${color};`;
                else if (sides === CONST.BORDER_SIDES.TOP_BOTTOM) css += `border-top: ${width}px ${style} ${color}; border-bottom: ${width}px ${style} ${color};`;
                
                return css;
            };
            
            block.style.cssText = `
                background: ${settings.dayBlock.bg};
                border-radius: ${settings.dayBlock.borderRadius};
                padding: 10px 12px;
                margin-bottom: ${settings.layout.dayBlockSpacing}px;
                ${getBorderStyles()}
                box-shadow: ${window.getShadowCSS(settings.dayBlock.shadow)};
                page-break-inside: avoid;
            `;

            let contentHtml = `
                <div style="border-bottom:1px solid ${CONST.COLORS.DAY_SEPARATOR_COLOR}; margin-bottom:6px; padding-bottom:3px;">
                    <h2 style="margin:0; font-size:${settings.dayName.fontSize}; color:${settings.dayName.color}; font-weight:${settings.dayName.fontWeight}; line-height:1.2;">${dayName}</h2>
                </div>
            `;

            if (dayMenu) {
                const slots = [
                    { id: CONST.SLOTS.SLOT_1, type: 'soup', label: window.t('slot_soup') },
                    { id: CONST.SLOTS.SLOT_2, type: 'main', label: window.t('slot_main') },
                    { id: CONST.SLOTS.SLOT_3, type: 'dessert', label: window.t('slot_dessert') },
                    { id: CONST.SLOTS.SLOT_4, type: 'other', label: window.t('slot_other') }
                ];

                let mealIndex = 1;
                slots.forEach((slotConfig) => {
                    const slot = dayMenu[slotConfig.id];
                    if (slot && slot.recipe) {
                        const recipe = window.recipes.find(r => r.id === slot.recipe);
                        if (recipe) {
                            const slotSettings = settings.slotSettings[slotConfig.id];
                            contentHtml += this.createMealBlock(recipe, slotConfig, slotSettings, settings, mealIndex);
                            mealIndex++;
                        }
                    }
                });
            }

            if (!manager.hasMeals(dayMenu)) {
                contentHtml += `<p style="color:${CONST.COLORS.EMPTY_DAY_COLOR}; font-style:italic; text-align:center; padding:8px 0; font-size:8pt; margin:0; line-height:1;">${window.t('empty_day')}</p>`;
            }

            block.innerHTML = contentHtml;
            return block;
        },

        createMealBlock: function(recipe, slotConfig, slotSettings, settings, index) {
            const lang = window.getCurrentLanguage();
            const isBulgarian = lang === 'bg';
            
            const numberStr = window.getMealNumber(index, settings.mealNumbering.style, settings.mealNumbering.prefix, settings.mealNumbering.suffix);
            
            let html = `<div style="margin-bottom:5px;">`;
            
            let titleLine = `<div style="font-size:${settings.mealTitle.fontSize}; font-weight:${settings.mealTitle.fontWeight}; color:${settings.mealTitle.color}; margin-bottom:2px; line-height:1.2;">${numberStr} ${recipe.name}`;
            
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
            if (metadata.length) titleLine += ` <span style="font-weight:normal; color:${CONST.COLORS.METADATA_COLOR}; font-size:8pt;">(${metadata.join(', ')})</span>`;
            
            titleLine += `</div>`;
            html += titleLine;

            if (slotSettings.showIngredients && recipe.ingredients && recipe.ingredients.length) {
                const recipeAllergens = window.getRecipeAllergens(recipe);
                const allergenIds = new Set(recipeAllergens.map(a => a.id));
                
                const ingredientsList = recipe.ingredients.map(ing => {
                    const fullIng = window.ingredients.find(i => i.id === ing.id);
                    if (!fullIng) return '';
                    
                    const hasAllergen = fullIng.allergens && fullIng.allergens.some(aid => allergenIds.has(aid));
                    
                    if (slotSettings.showAllergens && hasAllergen) {
                        return `<span style="color:${CONST.COLORS.ALLERGEN_COLOR}; text-decoration:underline; font-weight:500;">${fullIng.name}</span>`;
                    }
                    return fullIng.name;
                }).filter(n => n).join(', ');
                
                if (ingredientsList) {
                    html += `<div style="font-size:${settings.ingredients.fontSize}; color:${settings.ingredients.color}; font-style:${settings.ingredients.fontStyle}; margin-top:1px; margin-left:10px; line-height:1.2;"><em>${window.t('text_ingredients_prefix')}</em> ${ingredientsList}</div>`;
                }
            }

            html += `</div>`;
            return html;
        }
    };

})(window);
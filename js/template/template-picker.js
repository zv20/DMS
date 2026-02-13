/**
 * Template Picker Module
 * Handles the modal UI for selecting templates and weeks to print
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;
    
    const TemplatePicker = {
        open: function(manager) {
            const weeks = this.getWeeksWithMeals(manager);
            if (weeks.length === 0) {
                alert(window.t('alert_no_weeks'));
                return;
            }

            // Step 1: Template Selection Modal (ONLY User Templates)
            const modal = document.createElement('div');
            modal.id = 'templatePickerModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

            const content = document.createElement('div');
            content.style.cssText = 'background: white; border-radius: 10px; padding: 20px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

            content.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">🎨 Select Template</h3>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 15px;">Choose a template for your menu</p>
                
                <h4 style="margin: 15px 0 10px 0; font-size: 0.9rem; color: #495057;">💾 My Templates</h4>
                <div id="savedTemplatesList" style="margin-bottom: 20px;"></div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <button id="cancelTemplateBtn" class="btn btn-secondary">${window.t('btn_cancel') || 'Cancel'}</button>
                    <button id="nextToWeekBtn" class="btn btn-primary" disabled>${window.t('btn_next') || 'Next'} →</button>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            let selectedTemplateId = null;

            // Render ONLY Saved Templates (No Presets)
            const savedList = document.getElementById('savedTemplatesList');
            if (window.savedTemplates && window.savedTemplates.length > 0) {
                window.savedTemplates.forEach(tmpl => {
                    const card = document.createElement('div');
                    card.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; background: white;`;
                    card.innerHTML = `
                        <div style="font-weight: 600; font-size: 0.9rem; color: #333;">💾 ${tmpl.name || 'Unnamed Template'}</div>
                        <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">Custom saved template</div>
                    `;

                    card.onclick = () => {
                        document.querySelectorAll('#savedTemplatesList > div').forEach(c => {
                            c.style.borderColor = CONST.COLORS.CARD_BORDER_COLOR;
                            c.style.background = 'white';
                        });
                        card.style.borderColor = 'var(--color-primary)';
                        card.style.background = '#fff8f0';
                        selectedTemplateId = tmpl.id;
                        document.getElementById('nextToWeekBtn').disabled = false;
                    };

                    savedList.appendChild(card);
                });
            } else {
                savedList.innerHTML = '<p style="color: #999; font-size: 0.85rem; text-align: center; padding: 10px;">No saved templates yet. Create one in the Template Builder!</p>';
            }

            document.getElementById('cancelTemplateBtn').onclick = () => {
                modal.remove();
            };

            document.getElementById('nextToWeekBtn').onclick = () => {
                modal.remove();
                this.showWeekPicker(selectedTemplateId, weeks, manager);
            };

            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
        },

        showWeekPicker: function(templateId, weeks, manager) {
            // Group weeks by month
            const weeksByMonth = {};
            weeks.forEach(week => {
                const monthKey = week.weekStart.toLocaleDateString(window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US', { year: 'numeric', month: 'long' });
                if (!weeksByMonth[monthKey]) {
                    weeksByMonth[monthKey] = {
                        label: monthKey,
                        weeks: [],
                        timestamp: week.weekStart.getTime()
                    };
                }
                weeksByMonth[monthKey].weeks.push(week);
            });

            // Sort months (newest first) and weeks within each month
            const sortedMonths = Object.values(weeksByMonth).sort((a, b) => b.timestamp - a.timestamp);
            
            const modal2 = document.createElement('div');
            modal2.id = 'weekPickerModal';
            modal2.className = 'modal-overlay';
            modal2.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

            const content2 = document.createElement('div');
            content2.style.cssText = 'background: white; border-radius: 10px; padding: 20px; max-width: 500px; width: 90%; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

            const header = document.createElement('div');
            header.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">📅 ${window.t('title_select_week') || 'Select Week'}</h3>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 15px;">${window.t('text_select_week_prompt') || 'Choose which week to print'}</p>
            `;

            const weekListContainer = document.createElement('div');
            weekListContainer.id = 'weekSelectList';
            weekListContainer.style.cssText = 'flex: 1; overflow-y: auto; margin-bottom: 15px;';

            const monthStates = {};
            let selectedWeekStart = null;

            // Render collapsible month sections
            sortedMonths.forEach((monthData, monthIndex) => {
                const isFirstMonth = monthIndex === 0;
                monthStates[monthData.label] = isFirstMonth; // First month expanded by default

                const monthSection = document.createElement('div');
                monthSection.style.cssText = 'margin-bottom: 10px;';

                const monthHeader = document.createElement('div');
                monthHeader.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-bottom: 6px;
                    transition: background 0.2s;
                `;
                monthHeader.onmouseenter = () => monthHeader.style.background = '#e9ecef';
                monthHeader.onmouseleave = () => monthHeader.style.background = '#f8f9fa';

                const monthTitle = document.createElement('div');
                monthTitle.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #333;';
                monthTitle.textContent = `${monthData.label} (${monthData.weeks.length})`;

                const toggleIcon = document.createElement('span');
                toggleIcon.textContent = isFirstMonth ? '▼' : '▶';
                toggleIcon.style.cssText = 'font-size: 0.7rem; color: #666;';

                monthHeader.appendChild(monthTitle);
                monthHeader.appendChild(toggleIcon);

                const weeksContainer = document.createElement('div');
                weeksContainer.style.cssText = `
                    max-height: ${isFirstMonth ? '1000px' : '0'};
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                    padding-left: 10px;
                `;

                // Render weeks for this month
                monthData.weeks.forEach((week, weekIndex) => {
                    const weekCard = document.createElement('div');
                    weekCard.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: 10px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s;`;
                    weekCard.innerHTML = `
                        <div style="font-weight: 600; font-size: 0.85rem; color: #333;">${week.label}</div>
                        <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">${week.dateCount} ${window.t('text_days_with_meals') || 'days with meals'}</div>
                    `;

                    weekCard.onclick = () => {
                        document.querySelectorAll('#weekSelectList .week-card-selected').forEach(card => {
                            card.classList.remove('week-card-selected');
                            card.style.borderColor = CONST.COLORS.CARD_BORDER_COLOR;
                            card.style.background = 'white';
                        });
                        weekCard.classList.add('week-card-selected');
                        weekCard.style.borderColor = 'var(--color-primary)';
                        weekCard.style.background = '#fff8f0';
                        selectedWeekStart = week.weekStart;
                        window.setSelectedWeekStart(selectedWeekStart);
                        document.getElementById('confirmPrintBtn').disabled = false;
                    };

                    weeksContainer.appendChild(weekCard);

                    // Auto-select first week of first month
                    if (monthIndex === 0 && weekIndex === 0) {
                        setTimeout(() => weekCard.click(), 100);
                    }
                });

                monthHeader.onclick = () => {
                    monthStates[monthData.label] = !monthStates[monthData.label];
                    toggleIcon.textContent = monthStates[monthData.label] ? '▼' : '▶';
                    weeksContainer.style.maxHeight = monthStates[monthData.label] ? '1000px' : '0';
                };

                monthSection.appendChild(monthHeader);
                monthSection.appendChild(weeksContainer);
                weekListContainer.appendChild(monthSection);
            });

            const footer = document.createElement('div');
            footer.style.cssText = 'display: flex; gap: 10px; justify-content: space-between; padding-top: 15px; border-top: 1px solid #dee2e6;';
            footer.innerHTML = `
                <button id="backToTemplateBtn" class="btn btn-secondary">← ${window.t('btn_back') || 'Back'}</button>
                <div style="display: flex; gap: 10px;">
                    <button id="cancelPrintBtn" class="btn btn-secondary">${window.t('btn_cancel') || 'Cancel'}</button>
                    <button id="confirmPrintBtn" class="btn btn-primary" disabled>${window.t('btn_print') || 'Print'}</button>
                </div>
            `;

            content2.appendChild(header);
            content2.appendChild(weekListContainer);
            content2.appendChild(footer);
            modal2.appendChild(content2);
            document.body.appendChild(modal2);

            document.getElementById('backToTemplateBtn').onclick = () => {
                modal2.remove();
                window.openTemplatePicker();
            };

            document.getElementById('cancelPrintBtn').onclick = () => {
                modal2.remove();
            };

            document.getElementById('confirmPrintBtn').onclick = async () => {
                modal2.remove();
                if (selectedWeekStart) {
                    window.printWithTemplate(templateId);
                }
            };

            modal2.onclick = (e) => {
                if (e.target === modal2) modal2.remove();
            };
        },

        getWeeksWithMeals: function(manager) {
            const weeks = [];
            const dates = Object.keys(window.currentMenu).filter(dateStr => {
                return manager.hasMeals(window.currentMenu[dateStr]);
            });

            if (dates.length === 0) return [];

            const weekMap = new Map();
            dates.forEach(dateStr => {
                const parts = dateStr.split('-');
                const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                
                const weekStart = window.getWeekStart(date);
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!weekMap.has(weekKey)) {
                    weekMap.set(weekKey, {
                        weekStart: weekStart,
                        dates: []
                    });
                }
                weekMap.get(weekKey).dates.push(dateStr);
            });

            weekMap.forEach((value, key) => {
                weeks.push({
                    weekStart: value.weekStart,
                    label: manager.getDateRangeText(0, 4, value.weekStart),
                    dateCount: value.dates.length
                });
            });

            weeks.sort((a, b) => b.weekStart - a.weekStart);
            return weeks;
        }
    };

    window.TemplatePicker = TemplatePicker;

})(window);

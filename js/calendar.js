/**
 * Calendar Manager
 * Handles both Monthly and Weekly views
 * Supports flexible meal slot categories
 * FIXED: Uses local timezone for all date operations
 */

(function(window) {

    function getLocalDateString(date) {
        const year  = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day   = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    window.MEAL_CATEGORIES = [
        { id: 'soup',    label: 'slot_soup',    icon: '\uD83E\uDD63', color: '#fd7e14' },
        { id: 'main',    label: 'slot_main',    icon: '\uD83C\uDF7D\uFE0F', color: '#28a745' },
        { id: 'dessert', label: 'slot_dessert', icon: '\uD83C\uDF70', color: '#e83e8c' },
        { id: 'other',   label: 'slot_other',   icon: '\u2795',  color: '#6c757d' }
    ];

    window.CalendarManager = {
        currentDate: new Date(),
        viewMode: 'monthly',

        init: function() {
            this.bindControls();
            this.render();
        },

        bindControls: function() {
            const weeklyBtn  = document.getElementById('weeklyViewBtn');
            const monthlyBtn = document.getElementById('monthlyViewBtn');
            if (weeklyBtn)  weeklyBtn.addEventListener('click',  () => this.switchView('weekly'));
            if (monthlyBtn) monthlyBtn.addEventListener('click', () => this.switchView('monthly'));
        },

        switchView: function(mode) {
            this.viewMode = mode;
            const weeklyBtn  = document.getElementById('weeklyViewBtn');
            const monthlyBtn = document.getElementById('monthlyViewBtn');
            if (weeklyBtn && monthlyBtn) {
                if (mode === 'weekly') {
                    weeklyBtn.classList.add('active');
                    monthlyBtn.classList.remove('active');
                } else {
                    monthlyBtn.classList.add('active');
                    weeklyBtn.classList.remove('active');
                }
            }
            this.render();
        },

        navigate: function(offset) {
            if (this.viewMode === 'monthly') {
                this.currentDate.setMonth(this.currentDate.getMonth() + offset);
            } else {
                this.currentDate.setDate(this.currentDate.getDate() + (offset * 7));
            }
            this.render();
        },

        changeMonth: function(offset) { this.navigate(offset); },

        render: function() {
            if (this.viewMode === 'monthly') {
                this.renderMonthly();
            } else {
                this.renderWeekly();
            }
        },

        renderMonthly: function() {
            const container = document.getElementById('calendar');
            if (!container) return;

            container.innerHTML = '';
            container.className = '';

            const year  = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();

            const header = document.getElementById('currentMonth');
            if (header) {
                const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
                header.textContent = new Date(year, month).toLocaleDateString(lang, { month: 'long', year: 'numeric' });
            }

            const monthlyCalendar = document.createElement('div');
            monthlyCalendar.className = 'monthly-calendar';

            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            const dayKeys = ['day_mon_short','day_tue_short','day_wed_short','day_thu_short','day_fri_short','day_sat_short','day_sun_short'];
            dayKeys.forEach(key => {
                const dh = document.createElement('div');
                dh.className = 'day-header';
                dh.textContent = window.t(key);
                monthHeader.appendChild(dh);
            });
            monthlyCalendar.appendChild(monthHeader);

            const monthGrid = document.createElement('div');
            monthGrid.className = 'month-grid';

            const firstDay    = new Date(year, month, 1);
            let   startDow    = firstDay.getDay();
            startDow          = startDow === 0 ? 6 : startDow - 1;

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrev  = new Date(year, month, 0).getDate();

            for (let i = startDow - 1; i >= 0; i--) {
                const d = new Date(year, month - 1, daysInPrev - i);
                monthGrid.appendChild(this.createDayCell(d, true));
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const d = new Date(year, month, day);
                monthGrid.appendChild(this.createDayCell(d, false));
            }

            const totalCells   = startDow + daysInMonth;
            const remainder    = totalCells % 7;
            const trailingDays = remainder === 0 ? 0 : 7 - remainder;
            for (let i = 1; i <= trailingDays; i++) {
                const d = new Date(year, month + 1, i);
                monthGrid.appendChild(this.createDayCell(d, true));
            }

            monthlyCalendar.appendChild(monthGrid);
            container.appendChild(monthlyCalendar);
        },

        createDayCell: function(date, otherMonth) {
            const dateStr   = getLocalDateString(date);
            const dow       = date.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isToday   = this.isToday(date);

            const menu      = window.getMenuForDate(dateStr);
            const mealNames = this.getMealNames(menu);

            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            if (isWeekend)  dayCell.classList.add('weekend');
            if (isToday)    dayCell.classList.add('today');
            if (otherMonth) dayCell.classList.add('other-month');

            dayCell.addEventListener('click', () => this.gotoWeek(dateStr));

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = date.getDate();
            dayCell.appendChild(dayNumber);

            if (mealNames.length > 0 && !isWeekend) {
                const mealIndicators = document.createElement('div');
                mealIndicators.className = 'meal-indicators';
                mealNames.forEach(mealText => {
                    const mealLine = document.createElement('div');
                    mealLine.className   = 'meal-name-line';
                    mealLine.textContent = mealText;
                    mealLine.title       = mealText;
                    mealIndicators.appendChild(mealLine);
                });
                dayCell.appendChild(mealIndicators);
            }

            return dayCell;
        },

        renderWeekly: function() {
            const container = document.getElementById('calendar');
            if (!container) return;

            container.innerHTML = '';
            container.className = 'week-view';

            const weekStart = this.getWeekStart(this.currentDate);

            const header = document.getElementById('currentMonth');
            if (header) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 4);
                const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
                header.textContent = `${window.t('text_week_of')} ${weekStart.toLocaleDateString(lang, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }

            for (let i = 0; i < 5; i++) {
                const date    = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const dateStr = getLocalDateString(date);
                const lang    = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
                const dayName = date.toLocaleDateString(lang, { weekday: 'long' });
                const dayDate = date.toLocaleDateString(lang, { month: 'short', day: 'numeric' });

                const menu = window.getMenuForDate(dateStr);

                const dayColumn = document.createElement('div');
                dayColumn.className    = 'day-column';
                dayColumn.dataset.date = dateStr;

                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header-weekly';
                const strong = document.createElement('strong');
                strong.textContent = dayName;
                const small = document.createElement('small');
                small.textContent = dayDate;
                dayHeader.appendChild(strong);
                dayHeader.appendChild(document.createElement('br'));
                dayHeader.appendChild(small);
                dayColumn.appendChild(dayHeader);

                for (let slot = 1; slot <= 4; slot++) {
                    const slotData = menu[`slot${slot}`] || { category: this.getDefaultCategory(slot), recipe: null };
                    dayColumn.appendChild(this.createMealSlotElement(dateStr, `slot${slot}`, slotData));
                }

                container.appendChild(dayColumn);
            }
        },

        createMealSlotElement: function(dateStr, slotId, slotData) {
            const self     = this;
            const category = window.MEAL_CATEGORIES.find(c => c.id === slotData.category) || window.MEAL_CATEGORIES[0];
            const currentRecipe = slotData.recipe ? window.recipes.find(r => r.id === slotData.recipe) : null;

            const slotEl = document.createElement('div');
            slotEl.className = 'meal-slot';
            slotEl.style.borderLeft = `4px solid ${category.color}`;

            // --- Category dropdown (stays as <select>) ---
            const categorySelect = document.createElement('select');
            categorySelect.className = 'category-select';
            window.MEAL_CATEGORIES.forEach(cat => {
                const option = document.createElement('option');
                option.value       = cat.id;
                option.textContent = window.t(cat.label);
                if (cat.id === slotData.category) option.selected = true;
                categorySelect.appendChild(option);
            });
            categorySelect.addEventListener('change', (e) => self.changeCategory(dateStr, slotId, e.target.value));
            slotEl.appendChild(categorySelect);

            // --- Recipe combobox (type-to-search) ---
            const comboWrapper = document.createElement('div');
            comboWrapper.style.cssText = 'position:relative; flex:1; min-width:0;';

            const recipeInput = document.createElement('input');
            recipeInput.type        = 'text';
            recipeInput.className   = 'slot-recipe-input';
            recipeInput.autocomplete = 'off';
            recipeInput.spellcheck  = false;
            const placeholderText   = window.t ? window.t('text_select_default') : 'Select recipe...';
            recipeInput.placeholder = placeholderText;

            const recipeDropdown = document.createElement('ul');
            recipeDropdown.className = 'slot-combobox-dropdown';

            comboWrapper.appendChild(recipeInput);
            comboWrapper.appendChild(recipeDropdown);
            slotEl.appendChild(comboWrapper);

            // Wire up combobox behaviour
            window.initComboboxOnElement({
                inputEl      : recipeInput,
                dropdownEl   : recipeDropdown,
                getItems     : () => {
                    // Show only recipes matching the current slot category, sorted A-Z
                    const cat = categorySelect.value;
                    return [...window.recipes]
                        .filter(r => r.category === cat)
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                        .map(r => ({ id: r.id, label: r.name }));
                },
                onSelect     : (item) => {
                    self.selectRecipe(dateStr, slotId, item.id);
                },
                placeholder  : placeholderText,
                selectedId   : currentRecipe ? currentRecipe.id   : null,
                selectedLabel: currentRecipe ? currentRecipe.name : null
            });

            // Allow clearing the selection by deleting the text
            recipeInput.addEventListener('input', () => {
                if (recipeInput.value.trim() === '') {
                    recipeInput.dataset.selectedId = '';
                    self.selectRecipe(dateStr, slotId, null);
                }
            });

            return slotEl;
        },

        getDefaultCategory: function(slotNumber) {
            return ['soup','main','dessert','other'][slotNumber - 1] || 'other';
        },

        getMealNames: function(menu) {
            const names = [];
            for (let i = 1; i <= 4; i++) {
                const slot = menu[`slot${i}`];
                if (slot && slot.recipe) {
                    const recipe = window.recipes.find(r => r.id === slot.recipe);
                    if (recipe) names.push(`${i}. ${recipe.name}`);
                }
            }
            return names;
        },

        getMealNumbers: function(menu) {
            const numbers = [];
            for (let i = 1; i <= 4; i++) {
                const slot = menu[`slot${i}`];
                if (slot && slot.recipe) numbers.push(i);
            }
            return numbers;
        },

        isToday: function(date) {
            const today = new Date();
            return date.getDate()  === today.getDate()  &&
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
        },

        getWeekStart: function(date) {
            const d    = new Date(date);
            const day  = d.getDay();
            const diff = day === 0 ? 1 : -(day - 1);
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d;
        },

        gotoWeek: function(dateStr) {
            const parts = dateStr.split('-');
            this.currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            this.switchView('weekly');
        },

        changeCategory: function(dateStr, slotId, newCategory) {
            window.updateMenuForDate(dateStr, slotId, newCategory, null);
            this.render();
        },

        selectRecipe: function(dateStr, slotId, recipeId) {
            const menu = window.getMenuForDate(dateStr);
            const currentCategory = menu[slotId]?.category || this.getDefaultCategory(parseInt(slotId.replace('slot', '')));
            window.updateMenuForDate(dateStr, slotId, currentCategory, recipeId || null);
            // Do NOT call this.render() here — input already shows the selected name
            // Only re-render the monthly dots if we happen to be in monthly view
        }
    };

    window.changeMonth = function(offset) { window.CalendarManager.navigate(offset); };
    window.getWeekStart = function(date)  { return window.CalendarManager.getWeekStart(date); };
    window.getLocalDateString = getLocalDateString;

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('calendar')) window.CalendarManager.init();
    });

})(window);

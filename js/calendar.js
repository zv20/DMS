/**
 * Calendar Manager
 * Handles both Monthly and Weekly views
 * Supports flexible meal slot categories
 */

(function(window) {

    // Category definitions
    window.MEAL_CATEGORIES = [
        { id: 'soup', label: 'Soup', icon: '🥣', color: '#fd7e14' },
        { id: 'main', label: 'Main', icon: '🍽️', color: '#28a745' },
        { id: 'dessert', label: 'Dessert', icon: '🍰', color: '#e83e8c' },
        { id: 'other', label: 'Other', icon: '➕', color: '#6c757d' }
    ];

    window.CalendarManager = {
        currentDate: new Date(),
        viewMode: 'weekly', // 'weekly' or 'monthly'

        init: function() {
            this.bindControls();
            this.render();
        },

        bindControls: function() {
            // View switcher
            const weeklyBtn = document.getElementById('weeklyViewBtn');
            const monthlyBtn = document.getElementById('monthlyViewBtn');
            
            if (weeklyBtn) {
                weeklyBtn.addEventListener('click', () => this.switchView('weekly'));
            }
            if (monthlyBtn) {
                monthlyBtn.addEventListener('click', () => this.switchView('monthly'));
            }
        },

        switchView: function(mode) {
            this.viewMode = mode;
            
            // Update button states
            const weeklyBtn = document.getElementById('weeklyViewBtn');
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

        // Navigate by month or week depending on view mode
        navigate: function(offset) {
            if (this.viewMode === 'monthly') {
                this.currentDate.setMonth(this.currentDate.getMonth() + offset);
            } else {
                // Weekly view - navigate by weeks
                this.currentDate.setDate(this.currentDate.getDate() + (offset * 7));
            }
            this.render();
        },

        // Legacy function for compatibility
        changeMonth: function(offset) {
            this.navigate(offset);
        },

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

            // Clear container
            container.innerHTML = '';
            container.className = '';

            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            // Update month header
            const header = document.getElementById('currentMonth');
            if (header) {
                header.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }

            // Create monthly calendar container using DOM
            const monthlyCalendar = document.createElement('div');
            monthlyCalendar.className = 'monthly-calendar';
            
            // Create day headers (Mon, Tue, Wed, etc.)
            const monthHeader = document.createElement('div');
            monthHeader.className = 'month-header';
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            dayNames.forEach(dayName => {
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.textContent = dayName;
                monthHeader.appendChild(dayHeader);
            });
            monthlyCalendar.appendChild(monthHeader);

            // Create month grid
            const monthGrid = document.createElement('div');
            monthGrid.className = 'month-grid';
            
            const firstDay = new Date(year, month, 1);
            let dayOfWeek = firstDay.getDay();
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Empty cells before first day
            for (let i = 0; i < dayOfWeek; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'day-cell empty';
                monthGrid.appendChild(emptyCell);
            }
            
            // Days of month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = date.toISOString().split('T')[0];
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isToday = this.isToday(date);
                
                const menu = window.getMenuForDate(dateStr);
                const mealNumbers = this.getMealNumbers(menu);
                
                // Create day cell
                const dayCell = document.createElement('div');
                dayCell.className = 'day-cell';
                if (isWeekend) dayCell.classList.add('weekend');
                if (isToday) dayCell.classList.add('today');
                
                // Make clickable to jump to weekly view
                dayCell.addEventListener('click', () => this.gotoWeek(dateStr));
                
                // Day number
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = day;
                dayCell.appendChild(dayNumber);
                
                // Meal indicators (if has meals and not weekend)
                if (mealNumbers.length > 0 && !isWeekend) {
                    const mealIndicators = document.createElement('div');
                    mealIndicators.className = 'meal-indicators';
                    mealIndicators.textContent = mealNumbers.join(' ');
                    dayCell.appendChild(mealIndicators);
                }
                
                monthGrid.appendChild(dayCell);
            }
            
            monthlyCalendar.appendChild(monthGrid);
            container.appendChild(monthlyCalendar);
        },

        renderWeekly: function() {
            const container = document.getElementById('calendar');
            if (!container) return;

            // Clear container
            container.innerHTML = '';
            container.className = 'week-view';

            const weekStart = this.getWeekStart(this.currentDate);
            
            // Update month header
            const header = document.getElementById('currentMonth');
            if (header) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 4);
                header.textContent = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }

            // USE DOM MANIPULATION (like render.js) instead of string HTML
            for (let i = 0; i < 5; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                const menu = window.getMenuForDate(dateStr);
                
                // Create day column with DOM
                const dayColumn = document.createElement('div');
                dayColumn.className = 'day-column';
                dayColumn.dataset.date = dateStr;
                
                // Create day header
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
                
                // Add 4 meal slots
                for (let slot = 1; slot <= 4; slot++) {
                    const slotData = menu[`slot${slot}`] || { category: this.getDefaultCategory(slot), recipe: null };
                    dayColumn.appendChild(this.createMealSlotElement(dateStr, `slot${slot}`, slotData));
                }
                
                // Append directly to container (no wrapper!)
                container.appendChild(dayColumn);
            }
        },

        // Create meal slot using DOM manipulation
        createMealSlotElement: function(dateStr, slotId, slotData) {
            const category = window.MEAL_CATEGORIES.find(c => c.id === slotData.category) || window.MEAL_CATEGORIES[0];
            const recipe = slotData.recipe ? window.recipes.find(r => r.id === slotData.recipe) : null;
            
            const slotEl = document.createElement('div');
            slotEl.className = 'meal-slot';
            slotEl.style.borderLeft = `4px solid ${category.color}`;
            
            // Category selector
            const categorySelect = document.createElement('select');
            categorySelect.className = 'category-select';
            window.MEAL_CATEGORIES.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icon} ${cat.label}`;
                if (cat.id === slotData.category) option.selected = true;
                categorySelect.appendChild(option);
            });
            categorySelect.addEventListener('change', (e) => {
                this.changeCategory(dateStr, slotId, e.target.value);
            });
            slotEl.appendChild(categorySelect);
            
            // Recipe selector
            const recipeSelect = document.createElement('select');
            recipeSelect.className = 'recipe-select';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select --';
            recipeSelect.appendChild(defaultOption);
            
            const categoryRecipes = window.recipes.filter(r => r.category === slotData.category);
            categoryRecipes.forEach(rec => {
                const option = document.createElement('option');
                option.value = rec.id;
                option.textContent = rec.name;
                if (recipe && recipe.id === rec.id) option.selected = true;
                recipeSelect.appendChild(option);
            });
            recipeSelect.addEventListener('change', (e) => {
                this.selectRecipe(dateStr, slotId, e.target.value);
            });
            slotEl.appendChild(recipeSelect);
            
            return slotEl;
        },

        getDefaultCategory: function(slotNumber) {
            const defaults = ['soup', 'main', 'dessert', 'other'];
            return defaults[slotNumber - 1] || 'other';
        },

        getMealNumbers: function(menu) {
            const numbers = [];
            for (let i = 1; i <= 4; i++) {
                const slot = menu[`slot${i}`];
                if (slot && slot.recipe) {
                    numbers.push(i);
                }
            }
            return numbers;
        },

        isToday: function(date) {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
        },

        getWeekStart: function(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            d.setHours(0, 0, 0, 0);
            return d;
        },

        gotoWeek: function(dateStr) {
            this.currentDate = new Date(dateStr);
            this.switchView('weekly');
        },

        changeCategory: function(dateStr, slotId, newCategory) {
            // Clear recipe when category changes
            window.updateMenuForDate(dateStr, slotId, newCategory, null);
            this.render();
        },

        selectRecipe: function(dateStr, slotId, recipeId) {
            const menu = window.getMenuForDate(dateStr);
            const currentCategory = menu[slotId]?.category || this.getDefaultCategory(parseInt(slotId.replace('slot', '')));
            
            window.updateMenuForDate(dateStr, slotId, currentCategory, recipeId || null);
            this.render();
        }
    };

    // Global navigation functions
    window.changeMonth = function(offset) {
        window.CalendarManager.navigate(offset);
    };

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('calendar')) {
            window.CalendarManager.init();
        }
    });

})(window);

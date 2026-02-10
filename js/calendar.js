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

        changeMonth: function(offset) {
            this.currentDate.setMonth(this.currentDate.getMonth() + offset);
            this.render();
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

            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            // Update month header
            const header = document.getElementById('currentMonth');
            if (header) {
                header.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }

            // Create monthly calendar grid
            let html = '<div class="monthly-calendar">';
            
            // Day headers
            html += '<div class="month-header">';
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            dayNames.forEach(day => {
                html += `<div class="day-header">${day}</div>`;
            });
            html += '</div>';

            // Calendar grid
            html += '<div class="month-grid">';
            
            const firstDay = new Date(year, month, 1);
            let dayOfWeek = firstDay.getDay();
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Empty cells before first day
            for (let i = 0; i < dayOfWeek; i++) {
                html += '<div class="day-cell empty"></div>';
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
                
                let classes = 'day-cell';
                if (isWeekend) classes += ' weekend';
                if (isToday) classes += ' today';
                
                html += `<div class="${classes}" onclick="window.CalendarManager.gotoWeek('${dateStr}')">`;
                html += `<div class="day-number">${day}</div>`;
                
                if (mealNumbers.length > 0 && !isWeekend) {
                    html += `<div class="meal-indicators">${mealNumbers.join(' ')}</div>`;
                }
                
                html += '</div>';
            }
            
            html += '</div></div>';
            container.innerHTML = html;
        },

        renderWeekly: function() {
            const container = document.getElementById('calendar');
            if (!container) return;

            const weekStart = this.getWeekStart(this.currentDate);
            const year = weekStart.getFullYear();
            const month = weekStart.getMonth();
            
            // Update month header
            const header = document.getElementById('currentMonth');
            if (header) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 4);
                header.textContent = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }

            let html = '<div class="week-view">';
            
            for (let i = 0; i < 5; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                const menu = window.getMenuForDate(dateStr);
                
                html += `<div class="day-column" data-date="${dateStr}">`;
                html += `<div class="day-header-weekly">`;
                html += `<strong>${dayName}</strong><br>`;
                html += `<small>${dayDate}</small>`;
                html += `</div>`;
                
                // 4 meal slots
                for (let slot = 1; slot <= 4; slot++) {
                    const slotData = menu[`slot${slot}`] || { category: this.getDefaultCategory(slot), recipe: null };
                    html += this.renderMealSlot(dateStr, `slot${slot}`, slotData);
                }
                
                html += '</div>';
            }
            
            html += '</div>';
            container.innerHTML = html;
        },

        renderMealSlot: function(dateStr, slotId, slotData) {
            const category = window.MEAL_CATEGORIES.find(c => c.id === slotData.category) || window.MEAL_CATEGORIES[0];
            const recipe = slotData.recipe ? window.recipes.find(r => r.id === slotData.recipe) : null;
            
            let html = `<div class="meal-slot" style="border-left: 4px solid ${category.color};">`;
            
            // Category selector
            html += `<select class="category-select" onchange="window.CalendarManager.changeCategory('${dateStr}', '${slotId}', this.value)">`;
            window.MEAL_CATEGORIES.forEach(cat => {
                const selected = cat.id === slotData.category ? 'selected' : '';
                html += `<option value="${cat.id}" ${selected}>${cat.icon} ${cat.label}</option>`;
            });
            html += '</select>';
            
            // Recipe selector
            html += `<select class="recipe-select" onchange="window.CalendarManager.selectRecipe('${dateStr}', '${slotId}', this.value)">`;
            html += '<option value="">-- Select --</option>';
            
            const categoryRecipes = window.recipes.filter(r => r.category === slotData.category);
            categoryRecipes.forEach(rec => {
                const selected = recipe && recipe.id === rec.id ? 'selected' : '';
                html += `<option value="${rec.id}" ${selected}>${rec.name}</option>`;
            });
            html += '</select>';
            
            html += '</div>';
            return html;
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
        window.CalendarManager.changeMonth(offset);
    };

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('calendar')) {
            window.CalendarManager.init();
        }
    });

})(window);

// Utility Functions (Global Scope)

(function(window) {
    window.getWeekStart = function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    window.generateId = function(prefix = 'id') {
        return prefix + '_' + Date.now();
    };

    window.formatDateISO = function(date) {
        return date.toISOString().split('T')[0];
    };

    window.debounce = function(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
})(window);

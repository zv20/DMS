/**
 * Live Clock Component
 * Displays current time and date with locale-aware formatting
 * Updates every second
 */

(function(window) {
    
    let clockInterval = null;
    
    // Initialize clock on DOM load
    window.initClock = function() {
        const clockElement = document.getElementById('liveClock');
        if (!clockElement) return;
        
        // Update immediately
        updateClock();
        
        // Update every second
        if (clockInterval) clearInterval(clockInterval);
        clockInterval = setInterval(updateClock, 1000);
    };
    
    // Update clock display
    function updateClock() {
        const clockElement = document.getElementById('liveClock');
        if (!clockElement) return;
        
        const now = new Date();
        const lang = window.getCurrentLanguage() === 'bg' ? 'bg-BG' : 'en-US';
        
        // Format time
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: lang === 'en-US' // 12-hour for US, 24-hour for Bulgaria
        };
        const timeStr = now.toLocaleTimeString(lang, timeOptions);
        
        // Format date based on locale
        const dateOptions = { 
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        const dateStr = now.toLocaleDateString(lang, dateOptions);
        
        // Update display
        clockElement.innerHTML = `
            <div class="clock-time">${timeStr}</div>
            <div class="clock-date">${dateStr}</div>
        `;
    }
    
    // Re-initialize when language changes
    const originalChangeLanguage = window.changeLanguage;
    window.changeLanguage = function(lang, shouldSave) {
        originalChangeLanguage(lang, shouldSave);
        updateClock(); // Immediately update clock with new locale
    };
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        window.initClock();
    });
    
})(window);

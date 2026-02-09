// Utility Functions

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is day 1 (if desired), or standard Sunday start.
  // Standard JS: Sunday is 0. 
  // Code from app.js suggests: d.getDate() - day + (day === 0 ? -6 : 1) -> Monday start
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function generateId(prefix = 'id') {
    return prefix + '_' + Date.now();
}

export function formatDateISO(date) {
    return date.toISOString().split('T')[0];
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

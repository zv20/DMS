/**
 * Reusable Autocomplete Combobox
 * Replaces <select>+<button> pickers with a type-to-search field.
 *
 * Two entry points:
 *
 * 1. window.initCombobox({ inputId, dropdownId, getItems, onSelect, placeholder })
 *    Works with existing elements identified by ID (used in modals).
 *    Clears the input after selection so multiple tags can be added quickly.
 *
 * 2. window.initComboboxOnElement({ inputEl, dropdownEl, getItems, onSelect, placeholder, selectedId, selectedLabel })
 *    Works directly with DOM node references (used in dynamically-built calendar slots).
 *    Keeps the selected name in the field after selection.
 */
(function(window) {
    'use strict';

    // Core logic — shared by both entry points
    // clearOnSelect: true  = modal behaviour (clear field after pick, ready for next tag)
    //               false = slot behaviour  (keep name in field to show what's selected)
    function attachCombobox(inp, dropdown, getItems, onSelect, placeholder, clearOnSelect) {
        if (!inp || !dropdown) return;
        if (placeholder) inp.placeholder = placeholder;

        let activeIndex = -1;

        function showDropdown(items) {
            dropdown.innerHTML = '';
            activeIndex = -1;
            if (!items.length) { dropdown.style.display = 'none'; return; }
            items.forEach((item) => {
                const li = document.createElement('li');
                li.textContent = item.label;
                li.dataset.id  = item.id;
                li.addEventListener('mousedown', e => {
                    e.preventDefault();
                    selectItem(item);
                });
                dropdown.appendChild(li);
            });
            dropdown.style.display = 'block';
        }

        function hideDropdown() {
            dropdown.style.display = 'none';
            activeIndex = -1;
        }

        function selectItem(item) {
            onSelect(item);
            if (clearOnSelect) {
                inp.value = '';              // modal: clear so user can add another tag
            } else {
                inp.value = item.label;      // slot: keep name so selection is visible
                inp.dataset.selectedId = item.id;
            }
            hideDropdown();
            inp.focus();
        }

        function filtered() {
            const term = inp.value.trim().toLowerCase();
            const all  = getItems();
            return term ? all.filter(it => it.label.toLowerCase().includes(term)) : all;
        }

        function setActive(index) {
            const lis = dropdown.querySelectorAll('li');
            lis.forEach(li => li.classList.remove('combobox-active'));
            if (index >= 0 && index < lis.length) {
                lis[index].classList.add('combobox-active');
                lis[index].scrollIntoView({ block: 'nearest' });
                activeIndex = index;
            }
        }

        inp.addEventListener('input',  () => showDropdown(filtered()));
        inp.addEventListener('focus',  () => showDropdown(filtered()));
        inp.addEventListener('blur',   () => setTimeout(hideDropdown, 150));
        inp.addEventListener('keydown', e => {
            const lis = dropdown.querySelectorAll('li');
            if (!lis.length && e.key !== 'Escape') return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(Math.min(activeIndex + 1, lis.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(Math.max(activeIndex - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0) {
                    const li = lis[activeIndex];
                    selectItem({ id: li.dataset.id, label: li.textContent });
                } else if (lis.length === 1) {
                    // Only one match — Enter selects it automatically
                    const li = lis[0];
                    selectItem({ id: li.dataset.id, label: li.textContent });
                }
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });
    }

    // --- Entry point 1: ID-based (modals) — clears field after selection ---
    window.initCombobox = function({ inputId, dropdownId, getItems, onSelect, placeholder }) {
        const input    = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;
        // Clone to remove stale listeners
        const fresh = input.cloneNode(true);
        input.parentNode.replaceChild(fresh, input);
        attachCombobox(document.getElementById(inputId), dropdown, getItems, onSelect, placeholder, true);
    };

    // --- Entry point 2: Element-based (calendar slots) — keeps name in field ---
    window.initComboboxOnElement = function({ inputEl, dropdownEl, getItems, onSelect, placeholder, selectedId, selectedLabel }) {
        if (!inputEl || !dropdownEl) return;
        // Pre-fill if a recipe is already selected
        if (selectedLabel) {
            inputEl.value = selectedLabel;
            inputEl.dataset.selectedId = selectedId || '';
        }
        attachCombobox(inputEl, dropdownEl, getItems, onSelect, placeholder, false);
    };

    // --- Shared CSS (injected once) ---
    (function injectStyles() {
        if (document.getElementById('combobox-styles')) return;
        const style = document.createElement('style');
        style.id = 'combobox-styles';
        style.textContent = `
            .combobox-wrapper {
                position: relative;
                flex: 1;
            }
            .combobox-wrapper input {
                width: 100%;
                box-sizing: border-box;
            }
            /* Modal dropdowns */
            .combobox-dropdown {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #fff;
                border: 1px solid #ced4da;
                border-top: none;
                border-radius: 0 0 6px 6px;
                max-height: 220px;
                overflow-y: auto;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                margin: 0;
                padding: 0;
                list-style: none;
            }
            /* Calendar slot dropdowns */
            .slot-combobox-dropdown {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #fff;
                border: 1px solid #ced4da;
                border-top: none;
                border-radius: 0 0 6px 6px;
                max-height: 180px;
                overflow-y: auto;
                z-index: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin: 0;
                padding: 0;
                list-style: none;
            }
            .combobox-dropdown li,
            .slot-combobox-dropdown li {
                padding: 7px 10px;
                cursor: pointer;
                font-size: 12px;
                border-bottom: 1px solid #f0f0f0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .combobox-dropdown li:last-child,
            .slot-combobox-dropdown li:last-child { border-bottom: none; }
            .combobox-dropdown li:hover,
            .combobox-dropdown li.combobox-active,
            .slot-combobox-dropdown li:hover,
            .slot-combobox-dropdown li.combobox-active {
                background: #fd7e14;
                color: #fff;
            }
            /* Slot input styling */
            .slot-recipe-input {
                width: 100%;
                box-sizing: border-box;
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 5px 8px;
                font-size: 12px;
                background: #fff;
                cursor: text;
                outline: none;
                transition: border-color 0.15s;
            }
            .slot-recipe-input:focus {
                border-color: #fd7e14;
                box-shadow: 0 0 0 2px rgba(253,126,20,0.15);
            }
            .slot-recipe-input::placeholder {
                color: #aaa;
                font-size: 11px;
            }
        `;
        document.head.appendChild(style);
    })();

})(window);

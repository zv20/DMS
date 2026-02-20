/**
 * Reusable Autocomplete Combobox
 * Replaces <select>+<button> pickers in modals with a type-to-search field.
 *
 * Usage:
 *   window.initCombobox({
 *     inputId      : 'myInput',       // id of the <input> element
 *     dropdownId   : 'myDropdown',    // id of the <ul> dropdown element
 *     getItems     : () => [],        // fn returning current array of { id, label }
 *     onSelect     : (item) => {},    // fn called when user picks an item
 *     placeholder  : 'Search...'     // optional placeholder override
 *   });
 */
(function(window) {
    'use strict';

    /**
     * Attach combobox behaviour to an already-existing input + dropdown pair.
     * Safe to call multiple times (re-initialise on modal open).
     */
    window.initCombobox = function({ inputId, dropdownId, getItems, onSelect, placeholder }) {
        const input    = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        if (placeholder) input.placeholder = placeholder;

        // Remove any previous listeners by cloning the node
        const freshInput = input.cloneNode(true);
        input.parentNode.replaceChild(freshInput, input);
        const inp = document.getElementById(inputId); // re-fetch after replace

        let activeIndex = -1;

        function showDropdown(items) {
            dropdown.innerHTML = '';
            activeIndex = -1;
            if (!items.length) {
                dropdown.style.display = 'none';
                return;
            }
            items.forEach((item, i) => {
                const li = document.createElement('li');
                li.textContent   = item.label;
                li.dataset.id    = item.id;
                li.dataset.index = i;
                li.addEventListener('mousedown', e => {
                    e.preventDefault(); // prevent blur before click fires
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
            inp.value = '';
            hideDropdown();
            inp.focus();
        }

        function setActive(index) {
            const items = dropdown.querySelectorAll('li');
            items.forEach(li => li.classList.remove('combobox-active'));
            if (index >= 0 && index < items.length) {
                items[index].classList.add('combobox-active');
                items[index].scrollIntoView({ block: 'nearest' });
                activeIndex = index;
            }
        }

        inp.addEventListener('input', () => {
            const term  = inp.value.trim().toLowerCase();
            const all   = getItems();
            const match = term
                ? all.filter(it => it.label.toLowerCase().includes(term))
                : all;
            showDropdown(match);
        });

        inp.addEventListener('focus', () => {
            const all = getItems();
            showDropdown(inp.value.trim() ? all.filter(it => it.label.toLowerCase().includes(inp.value.trim().toLowerCase())) : all);
        });

        inp.addEventListener('blur', () => {
            // small delay so mousedown on list item fires first
            setTimeout(hideDropdown, 150);
        });

        inp.addEventListener('keydown', e => {
            const items = dropdown.querySelectorAll('li');
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(Math.min(activeIndex + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(Math.max(activeIndex - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0) {
                    const li = items[activeIndex];
                    selectItem({ id: li.dataset.id, label: li.textContent });
                }
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });
    };

    /**
     * Inject the shared CSS once.
     */
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
            .combobox-dropdown li {
                padding: 8px 12px;
                cursor: pointer;
                font-size: 13px;
                border-bottom: 1px solid #f0f0f0;
            }
            .combobox-dropdown li:last-child { border-bottom: none; }
            .combobox-dropdown li:hover,
            .combobox-dropdown li.combobox-active {
                background: #fd7e14;
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    })();

})(window);

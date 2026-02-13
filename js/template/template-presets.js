/**
 * Template Presets Module
 * Handles preset template display and selection
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    const TemplatePresets = {
        render: function(presets, applyCallback) {
            const container = document.getElementById('presetTemplatesContainer');
            if (!container) return;

            container.innerHTML = '';

            presets.forEach(preset => {
                const card = document.createElement('div');
                card.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: ${CONST.UI.CARD_PADDING}px; margin-bottom: ${CONST.UI.CARD_MARGIN}px; background: white; cursor: pointer; transition: all 0.2s;`;
                
                card.onmouseenter = () => card.style.borderColor = 'var(--color-primary)';
                card.onmouseleave = () => card.style.borderColor = CONST.COLORS.CARD_BORDER_COLOR;

                const title = document.createElement('div');
                title.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #333;';
                title.textContent = preset.nameKey || 'Classic Template';

                card.appendChild(title);
                card.onclick = () => applyCallback(preset);
                container.appendChild(card);
            });
        }
    };

    window.TemplatePresets = TemplatePresets;
})(window);
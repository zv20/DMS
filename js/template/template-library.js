/**
 * Template Library Module
 * Manages saved custom templates
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    const TemplateLibrary = {
        render: function(activeTemplateId, manager) {
            const container = document.getElementById('savedTemplatesLibrary');
            if (!container) return;

            container.innerHTML = '';

            if (!window.savedTemplates || window.savedTemplates.length === 0) {
                container.innerHTML = `<p style="color: ${CONST.COLORS.TEXT_MUTED}; font-size: 0.85rem; text-align: center; padding: 10px;">${window.t('text_no_templates')}</p>`;
                return;
            }

            window.savedTemplates.forEach(tmpl => {
                const card = document.createElement('div');
                card.style.cssText = `border: ${CONST.UI.CARD_BORDER_WIDTH}px solid ${CONST.COLORS.CARD_BORDER_COLOR}; border-radius: ${CONST.UI.CARD_BORDER_RADIUS}px; padding: ${CONST.UI.CARD_PADDING}px; margin-bottom: ${CONST.UI.CARD_MARGIN}px; background: white; transition: all 0.2s;`;
                
                if (activeTemplateId === tmpl.id) {
                    card.style.borderColor = 'var(--color-primary)';
                    card.style.background = '#fff8f0';
                }

                const header = document.createElement('div');
                header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

                const title = document.createElement('div');
                title.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #333;';
                title.textContent = tmpl.name || window.t('template_unnamed');

                const actions = document.createElement('div');
                actions.style.cssText = 'display: flex; gap: 4px;';

                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn btn-small btn-primary';
                loadBtn.textContent = window.t('btn_load');
                loadBtn.style.fontSize = '0.75rem';
                loadBtn.style.height = CONST.UI.BUTTON_HEIGHT_XS + 'px';
                loadBtn.style.padding = '0 8px';
                loadBtn.onclick = () => manager.loadTemplate(tmpl.id);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'icon-btn delete';
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.width = CONST.UI.BUTTON_HEIGHT_XS + 'px';
                deleteBtn.style.height = CONST.UI.BUTTON_HEIGHT_XS + 'px';
                deleteBtn.onclick = () => manager.deleteTemplate(tmpl.id);

                actions.appendChild(loadBtn);
                actions.appendChild(deleteBtn);
                header.appendChild(title);
                header.appendChild(actions);
                card.appendChild(header);
                container.appendChild(card);
            });
        }
    };

    window.TemplateLibrary = TemplateLibrary;
})(window);
/**
 * Template Images Module
 * Handles background and logo image uploads and management
 */

(function(window) {
    const CONST = window.DMS_CONSTANTS;

    const TemplateImages = {
        bindImageUpload: function(manager) {
            const bgInput = document.getElementById('backgroundImage');
            if (!bgInput) return;
            
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'btn btn-secondary';
            uploadBtn.textContent = window.t('btn_upload_image');
            uploadBtn.type = 'button';
            uploadBtn.style.marginTop = '6px';
            uploadBtn.style.width = '100%';
            uploadBtn.style.fontSize = '0.8rem';
            uploadBtn.style.height = CONST.UI.BUTTON_HEIGHT_SM + 'px';
            
            uploadBtn.onclick = () => this.uploadBackgroundImage(manager);
            bgInput.parentNode.insertBefore(uploadBtn, bgInput.nextSibling);
            
            this.renderUploadsGallery(manager);
        },

        bindLogoUpload: function(manager) {
            const logoInput = document.getElementById('logoImage');
            if (!logoInput) return;
            
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'btn btn-secondary';
            uploadBtn.textContent = 'Upload Logo';
            uploadBtn.type = 'button';
            uploadBtn.style.marginTop = '6px';
            uploadBtn.style.width = '100%';
            uploadBtn.style.fontSize = '0.8rem';
            uploadBtn.style.height = CONST.UI.BUTTON_HEIGHT_SM + 'px';
            
            uploadBtn.onclick = () => this.uploadLogo(manager);
            logoInput.parentNode.insertBefore(uploadBtn, logoInput.nextSibling);
        },

        uploadLogo: async function(manager) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const timestamp = Date.now();
                const filename = `${CONST.FILE.LOGO_PREFIX}${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
                const filepath = await window.saveImageFile(file, filename);
                if (!filepath) {
                    alert('Failed to save logo. Please try again.');
                    return;
                }
                
                if (!window.imageUploads) window.imageUploads = [];
                window.imageUploads.push({
                    id: filename,
                    name: file.name,
                    filename: filename,
                    timestamp: timestamp,
                    type: 'logo'
                });
                
                window.saveSettings();
                
                const imageUrl = await window.loadImageFile(filename);
                const logoInput = document.getElementById('logoImage');
                logoInput.value = imageUrl;
                logoInput.dataset.filename = filename;
                
                manager.refreshPreview();
                alert('Logo uploaded successfully!');
            };
            
            input.click();
        },

        uploadBackgroundImage: async function(manager) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const timestamp = Date.now();
                const filename = `${CONST.FILE.BACKGROUND_PREFIX}${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                
                const filepath = await window.saveImageFile(file, filename);
                if (!filepath) {
                    alert('Failed to save image file. Please try again.');
                    return;
                }
                
                if (!window.imageUploads) window.imageUploads = [];
                window.imageUploads.push({
                    id: filename,
                    name: file.name,
                    filename: filename,
                    timestamp: timestamp
                });
                
                window.saveSettings();
                
                const imageUrl = await window.loadImageFile(filename);
                const bgInput = document.getElementById('backgroundImage');
                bgInput.value = imageUrl;
                bgInput.dataset.filename = filename;
                
                manager.refreshPreview();
                this.renderUploadsGallery(manager);
                alert(window.t('alert_image_uploaded'));
            };
            
            input.click();
        },

        renderUploadsGallery: async function(manager) {
            const bgInput = document.getElementById('backgroundImage');
            if (!bgInput) return;
            
            const existingGallery = document.getElementById('uploadsGallery');
            if (existingGallery) existingGallery.remove();
            
            const gallery = document.createElement('div');
            gallery.id = 'uploadsGallery';
            gallery.style.cssText = `margin-top: 8px; padding: 6px; background: ${CONST.COLORS.BACKGROUND_COLOR}; border-radius: 4px;`;
            
            if (!window.imageUploads || window.imageUploads.length === 0) {
                gallery.innerHTML = `<small style="color: ${CONST.COLORS.TEXT_MUTED}; font-size: 0.75rem;">${window.t('text_no_uploads')}</small>`;
            } else {
                const header = document.createElement('div');
                header.style.cssText = 'font-weight: 600; margin-bottom: 4px; font-size: 0.75rem; color: #495057;';
                header.textContent = window.t('text_my_uploads');
                gallery.appendChild(header);
                
                for (const img of window.imageUploads) {
                    if (img.type === 'logo') continue;
                    
                    const imageUrl = await window.loadImageFile(img.filename);
                    
                    const imgCard = document.createElement('div');
                    imgCard.style.cssText = `display: flex; align-items: center; gap: 5px; padding: 3px; background: white; border-radius: 3px; margin-bottom: 3px; border: 1px solid ${CONST.COLORS.CARD_BORDER_COLOR};`;
                    
                    const thumbnail = document.createElement('img');
                    thumbnail.src = imageUrl || '';
                    thumbnail.style.cssText = `width: ${CONST.UI.THUMBNAIL_SIZE}px; height: ${CONST.UI.THUMBNAIL_SIZE}px; object-fit: cover; border-radius: 2px;`;
                    
                    const info = document.createElement('div');
                    info.style.flex = '1';
                    info.style.overflow = 'hidden';
                    info.innerHTML = `<div style="font-size: 0.7rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.name}</div>`;
                    
                    const useBtn = document.createElement('button');
                    useBtn.className = 'btn btn-small btn-primary';
                    useBtn.textContent = window.t('btn_use');
                    useBtn.style.fontSize = '0.65rem';
                    useBtn.style.height = CONST.UI.BUTTON_HEIGHT_XXS + 'px';
                    useBtn.style.padding = '0 6px';
                    useBtn.onclick = async () => {
                        const url = await window.loadImageFile(img.filename);
                        const bgInput = document.getElementById('backgroundImage');
                        bgInput.value = url;
                        bgInput.dataset.filename = img.filename;
                        manager.refreshPreview();
                    };
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'icon-btn delete';
                    deleteBtn.textContent = '🗑️';
                    deleteBtn.style.width = CONST.UI.ICON_BTN_SIZE + 'px';
                    deleteBtn.style.height = CONST.UI.ICON_BTN_SIZE + 'px';
                    deleteBtn.style.fontSize = '0.8rem';
                    deleteBtn.onclick = async () => {
                        if (confirm(`${window.t('alert_delete_image')} "${img.name}"?`)) {
                            await window.deleteImageFile(img.filename);
                            window.imageUploads = window.imageUploads.filter(i => i.id !== img.id);
                            window.saveSettings();
                            this.renderUploadsGallery(manager);
                        }
                    };
                    
                    imgCard.appendChild(thumbnail);
                    imgCard.appendChild(info);
                    imgCard.appendChild(useBtn);
                    imgCard.appendChild(deleteBtn);
                    gallery.appendChild(imgCard);
                }
            }
            
            const uploadBtnSibling = bgInput.nextSibling.nextSibling;
            if (uploadBtnSibling) {
                bgInput.parentNode.insertBefore(gallery, uploadBtnSibling);
            } else {
                bgInput.parentNode.appendChild(gallery);
            }
        }
    };

    window.TemplateImages = TemplateImages;
})(window);
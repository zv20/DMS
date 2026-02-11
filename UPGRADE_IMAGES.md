# Image Storage Upgrade Instructions

## Overview
This upgrade changes image storage from base64 in JSON to actual files in a `pictures/` folder.

## Files Modified
1. ✅ **store.js** - Already updated with pictures folder support
2. ⏳ **template.js** - Needs 2 small function updates

---

## Changes Needed in template.js

### Change 1: Update `uploadBackgroundImage` function (around line 987)

**Find this function:**
```javascript
uploadBackgroundImage: function() {
```

**Replace the ENTIRE function with:**
```javascript
uploadBackgroundImage: async function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const timestamp = Date.now();
        const filename = `bg_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        // Save file to pictures folder
        const filepath = await window.saveImageFile(file, filename);
        
        if (!filepath) {
            alert('Failed to save image file. Please try again.');
            return;
        }
        
        // Store metadata only (not base64)
        if (!window.imageUploads) window.imageUploads = [];
        window.imageUploads.push({
            id: filename,
            name: file.name,
            filename: filename,
            timestamp: timestamp
        });
        
        window.saveSettings();
        
        // Load the image and set it in the UI
        const imageUrl = await window.loadImageFile(filename);
        document.getElementById('backgroundImage').value = imageUrl;
        this.refreshPreview();
        this.renderUploadsGallery();
        
        alert(window.t('alert_image_uploaded'));
    };
    
    input.click();
},
```

---

### Change 2: Update `renderUploadsGallery` function (around line 1027)

**Find this function:**
```javascript
renderUploadsGallery: function() {
```

**Replace the ENTIRE function with:**
```javascript
renderUploadsGallery: async function() {
    const bgInput = document.getElementById('backgroundImage');
    if (!bgInput) return;
    
    const existingGallery = document.getElementById('uploadsGallery');
    if (existingGallery) existingGallery.remove();
    
    const gallery = document.createElement('div');
    gallery.id = 'uploadsGallery';
    gallery.style.cssText = 'margin-top: 8px; padding: 6px; background: #f8f9fa; border-radius: 4px;';
    
    if (!window.imageUploads || window.imageUploads.length === 0) {
        gallery.innerHTML = `<small style="color: #6c757d; font-size: 0.75rem;">${window.t('text_no_uploads')}</small>`;
    } else {
        const header = document.createElement('div');
        header.style.cssText = 'font-weight: 600; margin-bottom: 4px; font-size: 0.75rem; color: #495057;';
        header.textContent = window.t('text_my_uploads');
        gallery.appendChild(header);
        
        for (const img of window.imageUploads) {
            const imageUrl = await window.loadImageFile(img.filename);
            
            const imgCard = document.createElement('div');
            imgCard.style.cssText = 'display: flex; align-items: center; gap: 5px; padding: 3px; background: white; border-radius: 3px; margin-bottom: 3px; border: 1px solid #dee2e6;';
            
            const thumbnail = document.createElement('img');
            thumbnail.src = imageUrl || '';
            thumbnail.style.cssText = 'width: 28px; height: 28px; object-fit: cover; border-radius: 2px;';
            
            const info = document.createElement('div');
            info.style.flex = '1';
            info.style.overflow = 'hidden';
            info.innerHTML = `<div style="font-size: 0.7rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${img.name}</div>`;
            
            const useBtn = document.createElement('button');
            useBtn.className = 'btn btn-small btn-primary';
            useBtn.textContent = window.t('btn_use');
            useBtn.style.fontSize = '0.65rem';
            useBtn.style.height = '22px';
            useBtn.style.padding = '0 6px';
            useBtn.onclick = async () => {
                const url = await window.loadImageFile(img.filename);
                document.getElementById('backgroundImage').value = url;
                this.refreshPreview();
            };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn delete';
            deleteBtn.textContent = '🗑️';
            deleteBtn.style.width = '22px';
            deleteBtn.style.height = '22px';
            deleteBtn.style.fontSize = '0.8rem';
            deleteBtn.onclick = async () => {
                if (confirm(`${window.t('alert_delete_image')} "${img.name}"?`)) {
                    await window.deleteImageFile(img.filename);
                    window.imageUploads = window.imageUploads.filter(i => i.id !== img.id);
                    window.saveSettings();
                    this.renderUploadsGallery();
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
},
```

---

## What Changed?

### Before:
- Images stored as base64 strings in `settings.json`
- Made JSON files huge (MB in size)
- `imageUploads` array contained `data` field with full base64

### After:
- Images stored as actual files in `data/pictures/` folder
- JSON only stores metadata: `{ id, name, filename, timestamp }`
- JSON files stay small
- Images loaded on-demand using `window.loadImageFile()`

## Folder Structure
```
Your chosen folder/
├── data/
│   ├── data.json          (recipes, ingredients, allergens)
│   ├── menus.json         (menu planning)
│   ├── settings.json      (templates, language, image metadata)
│   └── pictures/          ⬅️ NEW!
│       ├── bg_1234_image1.jpg
│       ├── bg_5678_image2.png
│       └── ...
```

## Testing
1. Make the changes above
2. Reload your app
3. Select your data folder (or it auto-loads)
4. Upload a test image
5. Check `data/pictures/` folder - image should be there!
6. Check `data/settings.json` - should only have filename, not base64

---

## Benefits
- ✅ Smaller JSON files
- ✅ Faster save/load times
- ✅ Easier to manage images
- ✅ Can edit images directly in folder
- ✅ Better performance

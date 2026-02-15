/**
 * Visual Drag & Drop Template Editor
 * Hybrid approach using interact.js for drag, drop, resize
 */

class VisualTemplateEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = null;
        this.selectedElement = null;
        this.elements = [];
        this.elementCounter = 0;
        this.history = [];
        this.historyIndex = -1;
        
        this.init();
    }
    
    init() {
        this.render();
        this.setupInteractions();
        this.attachEventListeners();
        console.log('✅ Visual Template Editor initialized');
    }
    
    render() {
        this.container.innerHTML = `
            <div class="visual-editor">
                <!-- Toolbar -->
                <div class="visual-toolbar">
                    <div class="toolbar-section">
                        <button class="toolbar-btn" id="addDayBlock" title="Add Day Block">
                            📅 <span>Add Day</span>
                        </button>
                        <button class="toolbar-btn" id="addTextBox" title="Add Text Box">
                            📝 <span>Add Text</span>
                        </button>
                        <button class="toolbar-btn" id="addImageBox" title="Add Image">
                            🖼️ <span>Add Image</span>
                        </button>
                    </div>
                    <div class="toolbar-section">
                        <button class="toolbar-btn" id="undoBtn" title="Undo">
                            ↺ <span>Undo</span>
                        </button>
                        <button class="toolbar-btn" id="redoBtn" title="Redo">
                            ↻ <span>Redo</span>
                        </button>
                    </div>
                    <div class="toolbar-section">
                        <button class="toolbar-btn" id="clearCanvas" title="Clear All">
                            🗑️ <span>Clear</span>
                        </button>
                        <button class="toolbar-btn toolbar-btn-primary" id="printTemplate" title="Print Template">
                            🖨️ <span>Print</span>
                        </button>
                    </div>
                </div>
                
                <!-- Main Editor Area -->
                <div class="visual-editor-main">
                    <!-- Sidebar with Pre-made Elements -->
                    <div class="visual-sidebar">
                        <h3 style="margin: 0 0 15px 0; font-size: 1rem; color: #333;">🏛️ Elements</h3>
                        
                        <div class="sidebar-section">
                            <h4>Day Templates</h4>
                            <div class="draggable-item day-template" data-type="day" data-day="Monday">
                                <div class="day-template-preview">🔵</div>
                                <span>Monday</span>
                            </div>
                            <div class="draggable-item day-template" data-type="day" data-day="Tuesday">
                                <div class="day-template-preview">🔴</div>
                                <span>Tuesday</span>
                            </div>
                            <div class="draggable-item day-template" data-type="day" data-day="Wednesday">
                                <div class="day-template-preview">🟢</div>
                                <span>Wednesday</span>
                            </div>
                            <div class="draggable-item day-template" data-type="day" data-day="Thursday">
                                <div class="day-template-preview">🟡</div>
                                <span>Thursday</span>
                            </div>
                            <div class="draggable-item day-template" data-type="day" data-day="Friday">
                                <div class="day-template-preview">🟠</div>
                                <span>Friday</span>
                            </div>
                            <div class="draggable-item day-template" data-type="day" data-day="Saturday">
                                <div class="day-template-preview">🟣</div>
                                <span>Saturday</span>
                            </div>
                            <div class="draggable-item day-template" data-type="day" data-day="Sunday">
                                <div class="day-template-preview">🟪</div>
                                <span>Sunday</span>
                            </div>
                        </div>
                        
                        <div class="sidebar-section">
                            <h4>Quick Actions</h4>
                            <button class="sidebar-btn" id="addAllDays">
                                ➕ Add All 7 Days
                            </button>
                        </div>
                    </div>
                    
                    <!-- Canvas Area -->
                    <div class="visual-canvas-wrapper">
                        <div class="visual-canvas" id="visualCanvas">
                            <div class="canvas-placeholder">
                                <div class="placeholder-icon">🎨</div>
                                <h3>Drag & Drop to Build Your Template</h3>
                                <p>Drag day blocks from the sidebar to get started</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Properties Panel -->
                    <div class="visual-properties" id="propertiesPanel">
                        <div class="properties-empty">
                            <div style="text-align: center; padding: 40px 20px; color: #999;">
                                <div style="font-size: 3rem; margin-bottom: 10px;">👆</div>
                                <p>Click an element<br>to edit properties</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.canvas = document.getElementById('visualCanvas');
    }
    
    setupInteractions() {
        // Make canvas droppable
        interact(this.canvas).dropzone({
            accept: '.draggable-item',
            ondrop: (event) => {
                const type = event.relatedTarget.getAttribute('data-type');
                const day = event.relatedTarget.getAttribute('data-day');
                
                // Get drop position relative to canvas
                const canvasRect = this.canvas.getBoundingClientRect();
                const x = event.dragEvent.clientX - canvasRect.left;
                const y = event.dragEvent.clientY - canvasRect.top;
                
                if (type === 'day') {
                    this.addDayBlock(day, x, y);
                }
            }
        });
        
        // Make sidebar items draggable
        interact('.draggable-item').draggable({
            inertia: false,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'body',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                move: (event) => {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end: (event) => {
                    const target = event.target;
                    target.style.transform = '';
                    target.removeAttribute('data-x');
                    target.removeAttribute('data-y');
                }
            }
        });
    }
    
    attachEventListeners() {
        // Toolbar buttons
        document.getElementById('addDayBlock')?.addEventListener('click', () => {
            this.addDayBlock('New Day', 50, 50);
        });
        
        document.getElementById('addTextBox')?.addEventListener('click', () => {
            this.addTextBox(50, 50);
        });
        
        document.getElementById('addImageBox')?.addEventListener('click', () => {
            this.addImageBox(50, 50);
        });
        
        document.getElementById('clearCanvas')?.addEventListener('click', () => {
            if (confirm('Clear all elements from canvas?')) {
                this.clearCanvas();
            }
        });
        
        document.getElementById('printTemplate')?.addEventListener('click', () => {
            this.printTemplate();
        });
        
        document.getElementById('undoBtn')?.addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redoBtn')?.addEventListener('click', () => {
            this.redo();
        });
        
        document.getElementById('addAllDays')?.addEventListener('click', () => {
            this.addAllDays();
        });
    }
    
    addDayBlock(dayName, x, y) {
        const id = `element-${this.elementCounter++}`;
        const element = document.createElement('div');
        element.className = 'canvas-element day-block';
        element.id = id;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        
        element.innerHTML = `
            <div class="element-header">
                <span class="element-day-name">${dayName}</span>
                <button class="element-delete" title="Delete">×</button>
            </div>
            <div class="element-content">
                <div class="meal-item"><span class="meal-label">Breakfast:</span> <span class="meal-value">-</span></div>
                <div class="meal-item"><span class="meal-label">Lunch:</span> <span class="meal-value">-</span></div>
                <div class="meal-item"><span class="meal-label">Dinner:</span> <span class="meal-value">-</span></div>
            </div>
        `;
        
        // Remove placeholder if exists
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.remove();
        
        this.canvas.appendChild(element);
        this.makeElementInteractive(element);
        
        // Store element data
        this.elements.push({
            id,
            type: 'day',
            dayName,
            x,
            y,
            width: 250,
            height: 150,
            backgroundColor: '#ffffff',
            borderColor: '#ff6b35',
            borderWidth: 2,
            textColor: '#333333'
        });
        
        this.saveHistory();
    }
    
    addTextBox(x, y) {
        const id = `element-${this.elementCounter++}`;
        const element = document.createElement('div');
        element.className = 'canvas-element text-box';
        element.id = id;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.innerHTML = `
            <div contenteditable="true" class="text-content">Double click to edit text</div>
            <button class="element-delete" title="Delete">×</button>
        `;
        
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.remove();
        
        this.canvas.appendChild(element);
        this.makeElementInteractive(element);
        
        this.elements.push({
            id,
            type: 'text',
            x,
            y,
            width: 200,
            height: 50,
            text: 'Double click to edit text',
            fontSize: 16,
            textColor: '#333333',
            backgroundColor: 'transparent'
        });
        
        this.saveHistory();
    }
    
    addImageBox(x, y) {
        const id = `element-${this.elementCounter++}`;
        const element = document.createElement('div');
        element.className = 'canvas-element image-box';
        element.id = id;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.innerHTML = `
            <div class="image-placeholder">
                <div class="image-icon">🖼️</div>
                <p>Click to upload image</p>
                <input type="file" accept="image/*" class="image-input" style="display: none;">
            </div>
            <button class="element-delete" title="Delete">×</button>
        `;
        
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.remove();
        
        this.canvas.appendChild(element);
        this.makeElementInteractive(element);
        
        // Image upload handler
        const fileInput = element.querySelector('.image-input');
        const imagePlaceholder = element.querySelector('.image-placeholder');
        imagePlaceholder.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePlaceholder.style.backgroundImage = `url(${event.target.result})`;
                    imagePlaceholder.style.backgroundSize = 'cover';
                    imagePlaceholder.style.backgroundPosition = 'center';
                    imagePlaceholder.innerHTML = '';
                };
                reader.readAsDataURL(file);
            }
        });
        
        this.elements.push({
            id,
            type: 'image',
            x,
            y,
            width: 200,
            height: 200,
            imageUrl: null
        });
        
        this.saveHistory();
    }
    
    makeElementInteractive(element) {
        // Make draggable
        interact(element).draggable({
            listeners: {
                move: (event) => {
                    const target = event.target;
                    const x = (parseFloat(target.style.left) || 0) + event.dx;
                    const y = (parseFloat(target.style.top) || 0) + event.dy;
                    
                    target.style.left = `${x}px`;
                    target.style.top = `${y}px`;
                },
                end: () => {
                    this.saveHistory();
                }
            }
        });
        
        // Make resizable
        interact(element).resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move: (event) => {
                    const target = event.target;
                    let x = parseFloat(target.style.left) || 0;
                    let y = parseFloat(target.style.top) || 0;
                    
                    target.style.width = `${event.rect.width}px`;
                    target.style.height = `${event.rect.height}px`;
                    
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;
                    
                    target.style.left = `${x}px`;
                    target.style.top = `${y}px`;
                },
                end: () => {
                    this.saveHistory();
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 100, height: 50 }
                })
            ]
        });
        
        // Click to select
        element.addEventListener('click', (e) => {
            if (!e.target.classList.contains('element-delete')) {
                this.selectElement(element);
            }
        });
        
        // Delete button
        const deleteBtn = element.querySelector('.element-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteElement(element);
            });
        }
    }
    
    selectElement(element) {
        // Deselect previous
        document.querySelectorAll('.canvas-element.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        element.classList.add('selected');
        this.selectedElement = element;
        this.showProperties(element);
    }
    
    showProperties(element) {
        const panel = document.getElementById('propertiesPanel');
        const elementData = this.elements.find(e => e.id === element.id);
        
        if (!elementData) return;
        
        let propertiesHTML = `
            <div class="properties-content">
                <h3 style="margin: 0 0 20px 0; font-size: 1.1rem;">⚙️ Properties</h3>
        `;
        
        if (elementData.type === 'day') {
            propertiesHTML += `
                <div class="property-group">
                    <label>Day Name</label>
                    <input type="text" class="property-input" id="propDayName" value="${elementData.dayName}">
                </div>
                <div class="property-group">
                    <label>Background Color</label>
                    <input type="color" class="property-input" id="propBgColor" value="${elementData.backgroundColor}">
                </div>
                <div class="property-group">
                    <label>Border Color</label>
                    <input type="color" class="property-input" id="propBorderColor" value="${elementData.borderColor}">
                </div>
                <div class="property-group">
                    <label>Border Width</label>
                    <input type="range" min="0" max="10" class="property-range" id="propBorderWidth" value="${elementData.borderWidth}">
                    <span class="range-value">${elementData.borderWidth}px</span>
                </div>
                <div class="property-group">
                    <label>Text Color</label>
                    <input type="color" class="property-input" id="propTextColor" value="${elementData.textColor}">
                </div>
            `;
        } else if (elementData.type === 'text') {
            propertiesHTML += `
                <div class="property-group">
                    <label>Font Size</label>
                    <input type="range" min="10" max="48" class="property-range" id="propFontSize" value="${elementData.fontSize}">
                    <span class="range-value">${elementData.fontSize}px</span>
                </div>
                <div class="property-group">
                    <label>Text Color</label>
                    <input type="color" class="property-input" id="propTextColor" value="${elementData.textColor}">
                </div>
            `;
        }
        
        propertiesHTML += `
                <div class="property-actions">
                    <button class="property-btn property-btn-danger" id="deleteElement">🗑️ Delete</button>
                    <button class="property-btn" id="duplicateElement">📋 Duplicate</button>
                </div>
            </div>
        `;
        
        panel.innerHTML = propertiesHTML;
        
        // Attach property change listeners
        this.attachPropertyListeners(element, elementData);
    }
    
    attachPropertyListeners(element, elementData) {
        const updateElement = () => {
            if (elementData.type === 'day') {
                const dayName = document.getElementById('propDayName')?.value;
                const bgColor = document.getElementById('propBgColor')?.value;
                const borderColor = document.getElementById('propBorderColor')?.value;
                const borderWidth = document.getElementById('propBorderWidth')?.value;
                const textColor = document.getElementById('propTextColor')?.value;
                
                if (dayName) {
                    element.querySelector('.element-day-name').textContent = dayName;
                    elementData.dayName = dayName;
                }
                if (bgColor) {
                    element.style.backgroundColor = bgColor;
                    elementData.backgroundColor = bgColor;
                }
                if (borderColor) {
                    element.style.borderColor = borderColor;
                    elementData.borderColor = borderColor;
                }
                if (borderWidth) {
                    element.style.borderWidth = `${borderWidth}px`;
                    elementData.borderWidth = borderWidth;
                    document.querySelector('.range-value').textContent = `${borderWidth}px`;
                }
                if (textColor) {
                    element.style.color = textColor;
                    elementData.textColor = textColor;
                }
            } else if (elementData.type === 'text') {
                const fontSize = document.getElementById('propFontSize')?.value;
                const textColor = document.getElementById('propTextColor')?.value;
                
                if (fontSize) {
                    element.querySelector('.text-content').style.fontSize = `${fontSize}px`;
                    elementData.fontSize = fontSize;
                    document.querySelector('.range-value').textContent = `${fontSize}px`;
                }
                if (textColor) {
                    element.querySelector('.text-content').style.color = textColor;
                    elementData.textColor = textColor;
                }
            }
        };
        
        // Add listeners to all property inputs
        document.querySelectorAll('.property-input, .property-range').forEach(input => {
            input.addEventListener('input', updateElement);
            input.addEventListener('change', () => this.saveHistory());
        });
        
        // Delete button
        document.getElementById('deleteElement')?.addEventListener('click', () => {
            this.deleteElement(element);
        });
        
        // Duplicate button
        document.getElementById('duplicateElement')?.addEventListener('click', () => {
            this.duplicateElement(element);
        });
    }
    
    deleteElement(element) {
        element.remove();
        this.elements = this.elements.filter(e => e.id !== element.id);
        document.getElementById('propertiesPanel').innerHTML = '<div class="properties-empty"><div style="text-align: center; padding: 40px 20px; color: #999;"><div style="font-size: 3rem; margin-bottom: 10px;">👆</div><p>Click an element<br>to edit properties</p></div></div>';
        this.saveHistory();
    }
    
    duplicateElement(element) {
        const elementData = this.elements.find(e => e.id === element.id);
        if (!elementData) return;
        
        const newX = elementData.x + 20;
        const newY = elementData.y + 20;
        
        if (elementData.type === 'day') {
            this.addDayBlock(elementData.dayName + ' (Copy)', newX, newY);
        } else if (elementData.type === 'text') {
            this.addTextBox(newX, newY);
        } else if (elementData.type === 'image') {
            this.addImageBox(newX, newY);
        }
    }
    
    addAllDays() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let startX = 50;
        let startY = 50;
        const spacing = 20;
        const blockHeight = 150;
        
        days.forEach((day, index) => {
            const y = startY + (index * (blockHeight + spacing));
            this.addDayBlock(day, startX, y);
        });
    }
    
    clearCanvas() {
        this.canvas.innerHTML = '<div class="canvas-placeholder"><div class="placeholder-icon">🎨</div><h3>Drag & Drop to Build Your Template</h3><p>Drag day blocks from the sidebar to get started</p></div>';
        this.elements = [];
        this.selectedElement = null;
        document.getElementById('propertiesPanel').innerHTML = '<div class="properties-empty"><div style="text-align: center; padding: 40px 20px; color: #999;"><div style="font-size: 3rem; margin-bottom: 10px;">👆</div><p>Click an element<br>to edit properties</p></div></div>';
        this.saveHistory();
    }
    
    saveHistory() {
        const state = this.canvas.innerHTML;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.canvas.innerHTML = this.history[this.historyIndex];
            this.reattachInteractions();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.canvas.innerHTML = this.history[this.historyIndex];
            this.reattachInteractions();
        }
    }
    
    reattachInteractions() {
        document.querySelectorAll('.canvas-element').forEach(element => {
            this.makeElementInteractive(element);
        });
    }
    
    printTemplate() {
        // Integrate with existing print mechanism
        const canvasContent = this.canvas.cloneNode(true);
        
        // Remove interactive elements for print
        canvasContent.querySelectorAll('.element-delete, .canvas-placeholder').forEach(el => el.remove());
        canvasContent.querySelectorAll('.canvas-element').forEach(el => {
            el.classList.remove('selected');
            el.style.cursor = 'default';
        });
        
        // Create printable HTML
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Meal Plan Template</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                    .visual-canvas { position: relative; width: 800px; min-height: 1000px; background: white; margin: 0 auto; }
                    .canvas-element { position: absolute; box-sizing: border-box; }
                    .day-block { background: white; border: 2px solid #ff6b35; border-radius: 8px; padding: 15px; }
                    .element-header { font-weight: bold; font-size: 1.2em; margin-bottom: 10px; color: #ff6b35; }
                    .meal-item { margin: 5px 0; }
                    .text-box .text-content { padding: 10px; }
                    .image-box { overflow: hidden; border-radius: 8px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${canvasContent.outerHTML}</body>
            </html>
        `;
        
        // Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHTML);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
}

// Initialize when page loads
window.VisualTemplateEditor = VisualTemplateEditor;
console.log('✅ Visual Template Editor class loaded');
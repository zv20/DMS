/**
 * Advanced Custom Designer
 * Visual drag-and-drop builder for fully customizable menu layouts
 */

(function(window) {
    let canvas = null;
    let selectedElement = null;
    let elements = [];
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let elementIdCounter = 0;
    let currentDesign = null;

    const CustomBuilder = {
        init: function() {
            canvas = document.getElementById('designCanvas');
            if (!canvas) return;

            this.setupEventListeners();
            this.loadDesigns();
            this.renderElementsPalette();
        },

        setupEventListeners: function() {
            // Canvas interactions
            canvas.addEventListener('click', (e) => {
                if (e.target === canvas) {
                    this.deselectElement();
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (!selectedElement) return;
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    this.deleteSelectedElement();
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.moveElement(0, -1);
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.moveElement(0, 1);
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.moveElement(-1, 0);
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.moveElement(1, 0);
                }
            });
        },

        renderElementsPalette: function() {
            const palette = document.getElementById('elementsPalette');
            if (!palette) return;

            const elementTypes = [
                { type: 'header', icon: '📝', label: 'Header Text' },
                { type: 'dayblock', icon: '📅', label: 'Day Block' },
                { type: 'meal', icon: '🍽️', label: 'Meal Item' },
                { type: 'textbox', icon: '💬', label: 'Text Box' },
                { type: 'image', icon: '🖼️', label: 'Image' },
                { type: 'line', icon: '➖', label: 'Divider Line' },
                { type: 'box', icon: '⬜', label: 'Box/Border' }
            ];

            palette.innerHTML = elementTypes.map(el => `
                <div class="palette-item" draggable="true" data-type="${el.type}">
                    <div style="font-size: 24pt; margin-bottom: 5px;">${el.icon}</div>
                    <div style="font-size: 9pt;">${el.label}</div>
                </div>
            `).join('');

            // Add drag events to palette items
            palette.querySelectorAll('.palette-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('elementType', item.dataset.type);
                });
            });

            // Canvas drop zone
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('elementType');
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.addElement(type, x, y);
            });
        },

        addElement: function(type, x, y) {
            const element = {
                id: 'elem_' + (elementIdCounter++),
                type: type,
                x: x,
                y: y,
                width: 200,
                height: 50,
                content: this.getDefaultContent(type),
                style: {
                    fontSize: '12pt',
                    color: '#000000',
                    backgroundColor: type === 'box' ? '#ffffff' : 'transparent',
                    borderColor: '#cccccc',
                    borderWidth: type === 'box' || type === 'dayblock' ? 1 : 0,
                    borderStyle: 'solid',
                    textAlign: 'left',
                    fontWeight: 'normal',
                    padding: 10
                }
            };

            if (type === 'line') {
                element.height = 2;
                element.style.backgroundColor = '#cccccc';
            }

            if (type === 'header') {
                element.width = 400;
                element.height = 60;
                element.style.fontSize = '20pt';
                element.style.fontWeight = 'bold';
                element.style.textAlign = 'center';
            }

            if (type === 'dayblock') {
                element.width = 600;
                element.height = 150;
                element.style.backgroundColor = '#f9f9f9';
            }

            elements.push(element);
            this.renderCanvas();
            this.selectElement(element.id);
        },

        getDefaultContent: function(type) {
            const defaults = {
                header: 'Weekly Menu',
                dayblock: 'Monday',
                meal: '1. Recipe Name (240g, 220 kcal)\nIngredients: Item1, Item2, Item3',
                textbox: 'Double-click to edit',
                image: 'https://via.placeholder.com/150',
                line: '',
                box: ''
            };
            return defaults[type] || 'New Element';
        },

        renderCanvas: function() {
            // Clear canvas
            Array.from(canvas.children).forEach(child => {
                if (!child.classList.contains('canvas-helper')) {
                    child.remove();
                }
            });

            // Render all elements
            elements.forEach(elem => {
                const div = document.createElement('div');
                div.className = 'canvas-element';
                div.dataset.id = elem.id;
                div.style.cssText = `
                    position: absolute;
                    left: ${elem.x}px;
                    top: ${elem.y}px;
                    width: ${elem.width}px;
                    height: ${elem.height}px;
                    font-size: ${elem.style.fontSize};
                    color: ${elem.style.color};
                    background-color: ${elem.style.backgroundColor};
                    border: ${elem.style.borderWidth}px ${elem.style.borderStyle} ${elem.style.borderColor};
                    text-align: ${elem.style.textAlign};
                    font-weight: ${elem.style.fontWeight};
                    padding: ${elem.style.padding}px;
                    cursor: move;
                    box-sizing: border-box;
                    overflow: hidden;
                    white-space: pre-wrap;
                `;

                if (elem.type === 'image') {
                    const img = document.createElement('img');
                    img.src = elem.content;
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                    div.appendChild(img);
                } else if (elem.type !== 'line' && elem.type !== 'box') {
                    div.textContent = elem.content;
                }

                // Add selection border
                if (selectedElement && selectedElement.id === elem.id) {
                    div.style.outline = '3px solid #fd7e14';
                    div.style.outlineOffset = '-3px';
                }

                // Drag events
                div.addEventListener('mousedown', (e) => this.startDrag(e, elem));
                div.addEventListener('dblclick', () => this.editElement(elem));
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectElement(elem.id);
                });

                canvas.appendChild(div);
            });
        },

        startDrag: function(e, elem) {
            isDragging = true;
            selectedElement = elem;
            dragOffset.x = e.clientX - elem.x;
            dragOffset.y = e.clientY - elem.y;

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const rect = canvas.getBoundingClientRect();
                elem.x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - elem.width));
                elem.y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - elem.height));
                this.renderCanvas();
                this.updatePropertiesPanel();
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },

        selectElement: function(id) {
            selectedElement = elements.find(el => el.id === id);
            this.renderCanvas();
            this.updatePropertiesPanel();
        },

        deselectElement: function() {
            selectedElement = null;
            this.renderCanvas();
            this.updatePropertiesPanel();
        },

        editElement: function(elem) {
            if (elem.type === 'line' || elem.type === 'box') return;
            const newContent = prompt('Edit content:', elem.content);
            if (newContent !== null) {
                elem.content = newContent;
                this.renderCanvas();
            }
        },

        deleteSelectedElement: function() {
            if (!selectedElement) return;
            elements = elements.filter(el => el.id !== selectedElement.id);
            selectedElement = null;
            this.renderCanvas();
            this.updatePropertiesPanel();
        },

        moveElement: function(dx, dy) {
            if (!selectedElement) return;
            selectedElement.x += dx;
            selectedElement.y += dy;
            this.renderCanvas();
            this.updatePropertiesPanel();
        },

        updatePropertiesPanel: function() {
            const panel = document.getElementById('propertiesPanel');
            if (!panel) return;

            if (!selectedElement) {
                panel.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Select an element to edit properties</p>';
                return;
            }

            panel.innerHTML = `
                <h3 style="margin-top: 0;">Element Properties</h3>
                <div class="property-group">
                    <label>Position X</label>
                    <input type="number" id="prop_x" value="${Math.round(selectedElement.x)}" style="width: 100%;">
                </div>
                <div class="property-group">
                    <label>Position Y</label>
                    <input type="number" id="prop_y" value="${Math.round(selectedElement.y)}" style="width: 100%;">
                </div>
                <div class="property-group">
                    <label>Width</label>
                    <input type="number" id="prop_width" value="${selectedElement.width}" style="width: 100%;">
                </div>
                <div class="property-group">
                    <label>Height</label>
                    <input type="number" id="prop_height" value="${selectedElement.height}" style="width: 100%;">
                </div>
                ${selectedElement.type !== 'line' && selectedElement.type !== 'box' ? `
                    <div class="property-group">
                        <label>Font Size</label>
                        <input type="text" id="prop_fontSize" value="${selectedElement.style.fontSize}" style="width: 100%;">
                    </div>
                    <div class="property-group">
                        <label>Text Color</label>
                        <input type="color" id="prop_color" value="${selectedElement.style.color}" style="width: 100%;">
                    </div>
                    <div class="property-group">
                        <label>Text Align</label>
                        <select id="prop_textAlign" style="width: 100%;">
                            <option value="left" ${selectedElement.style.textAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${selectedElement.style.textAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${selectedElement.style.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Font Weight</label>
                        <select id="prop_fontWeight" style="width: 100%;">
                            <option value="normal" ${selectedElement.style.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="bold" ${selectedElement.style.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                        </select>
                    </div>
                ` : ''}
                <div class="property-group">
                    <label>Background Color</label>
                    <input type="color" id="prop_backgroundColor" value="${selectedElement.style.backgroundColor}" style="width: 100%;">
                </div>
                <div class="property-group">
                    <label>Border Width</label>
                    <input type="number" id="prop_borderWidth" value="${selectedElement.style.borderWidth}" min="0" max="20" style="width: 100%;">
                </div>
                <div class="property-group">
                    <label>Border Color</label>
                    <input type="color" id="prop_borderColor" value="${selectedElement.style.borderColor}" style="width: 100%;">
                </div>
                <div class="property-group">
                    <label>Padding</label>
                    <input type="number" id="prop_padding" value="${selectedElement.style.padding}" min="0" max="50" style="width: 100%;">
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-danger btn-small" onclick="window.CustomBuilder.deleteSelectedElement()" style="width: 100%;">Delete Element</button>
                </div>
            `;

            // Bind property change events
            ['x', 'y', 'width', 'height'].forEach(prop => {
                const input = document.getElementById(`prop_${prop}`);
                if (input) {
                    input.addEventListener('input', (e) => {
                        selectedElement[prop] = parseFloat(e.target.value) || 0;
                        this.renderCanvas();
                    });
                }
            });

            ['fontSize', 'color', 'backgroundColor', 'borderColor', 'borderWidth', 'textAlign', 'fontWeight', 'padding'].forEach(prop => {
                const input = document.getElementById(`prop_${prop}`);
                if (input) {
                    input.addEventListener('input', (e) => {
                        selectedElement.style[prop] = e.target.value;
                        this.renderCanvas();
                    });
                }
            });
        },

        saveDesign: function() {
            const name = prompt('Design name:', 'My Custom Design');
            if (!name) return;

            const design = {
                id: 'design_' + Date.now(),
                name: name,
                elements: JSON.parse(JSON.stringify(elements))
            };

            if (!window.customDesigns) window.customDesigns = [];
            window.customDesigns.push(design);
            window.saveData();
            this.loadDesigns();
            alert('Design saved!');
        },

        loadDesigns: function() {
            const list = document.getElementById('designsList');
            if (!list) return;

            if (!window.customDesigns || window.customDesigns.length === 0) {
                list.innerHTML = '<p style="color: #999; padding: 10px;">No saved designs</p>';
                return;
            }

            list.innerHTML = window.customDesigns.map(design => `
                <div class="design-item" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span>${design.name}</span>
                    <div>
                        <button class="btn btn-small btn-secondary" onclick="window.CustomBuilder.loadDesign('${design.id}')">Load</button>
                        <button class="icon-btn delete" onclick="window.CustomBuilder.deleteDesign('${design.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        },

        loadDesign: function(id) {
            const design = window.customDesigns.find(d => d.id === id);
            if (!design) return;

            elements = JSON.parse(JSON.stringify(design.elements));
            elementIdCounter = Math.max(...elements.map(e => parseInt(e.id.split('_')[1]) || 0)) + 1;
            this.renderCanvas();
            this.deselectElement();
        },

        deleteDesign: function(id) {
            if (!confirm('Delete this design?')) return;
            window.customDesigns = window.customDesigns.filter(d => d.id !== id);
            window.saveData();
            this.loadDesigns();
        },

        clearCanvas: function() {
            if (!confirm('Clear all elements?')) return;
            elements = [];
            selectedElement = null;
            this.renderCanvas();
            this.updatePropertiesPanel();
        },

        printDesign: function() {
            const printWindow = window.open('', '_blank');
            const canvasClone = canvas.cloneNode(true);
            canvasClone.querySelectorAll('.canvas-element').forEach(el => {
                el.style.outline = 'none';
                el.style.cursor = 'default';
            });

            const html = `
                <html>
                <head>
                    <title>Print Custom Design</title>
                    <style>
                        @page { size: A4; margin: 0; }
                        body { margin: 0; padding: 0; }
                        #canvas { position: relative; width: 210mm; height: 297mm; }
                    </style>
                </head>
                <body>
                    ${canvasClone.outerHTML}
                    <script>window.onload = () => { window.print(); };</script>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
        }
    };

    // Expose globally
    window.CustomBuilder = CustomBuilder;

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('designCanvas')) {
            CustomBuilder.init();
        }
    });

})(window);

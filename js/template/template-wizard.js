/**
 * Template Wizard - Main Controller
 * Phase 1: Core Wizard Structure
 * 
 * Manages the step-by-step wizard for creating meal plan templates
 * Provides navigation, validation, and progress tracking
 */

class TemplateWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.wizardData = this.loadProgress() || {
            layoutStyle: 'grid',
            showHeader: true,
            headerText: 'Weekly Meal Plan',
            showWeekNumber: false,
            dayHeaderSize: '1.2em',
            dayBlockBg: '#ffffff',
            dayBlockBorder: '1px solid #ddd',
            showMealTitles: true,
            showIngredients: 'list',
            showPortions: true,
            showCalories: false,
            highlightAllergens: true,
            primaryColor: '#ff6b35',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            headerFontSize: '2em',
            mealFontSize: '1em',
            showDateRange: true,
            dateFormat: 'MM/DD/YYYY',
            showFooter: false,
            footerText: '',
            showBorder: true
        };
        
        this.init();
    }
    
    init() {
        this.renderWizard();
        this.attachEventListeners();
        this.showStep(this.currentStep);
        this.updateProgress();
    }
    
    renderWizard() {
        const container = document.getElementById('wizard-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="wizard-wrapper">
                <!-- Progress Bar -->
                <div class="wizard-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">Step 1 of 6</div>
                </div>
                
                <!-- Step Container -->
                <div class="wizard-steps" id="wizardSteps">
                    <!-- Steps will be dynamically loaded here -->
                </div>
                
                <!-- Navigation -->
                <div class="wizard-navigation">
                    <button class="btn btn-secondary" id="prevBtn" style="visibility: hidden;">
                        ← Previous
                    </button>
                    <button class="btn btn-primary" id="nextBtn">
                        Next Step →
                    </button>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
    }
    
    showStep(stepNumber) {
        const stepsContainer = document.getElementById('wizardSteps');
        if (!stepsContainer) return;
        
        // Get step definition from wizard-steps.js
        const stepDef = window.WizardSteps ? window.WizardSteps.getStep(stepNumber) : null;
        
        if (!stepDef) {
            stepsContainer.innerHTML = `
                <div class="wizard-step active">
                    <h2>Step ${stepNumber}</h2>
                    <p>Step content will be implemented in Phase ${stepNumber + 1}</p>
                </div>
            `;
        } else {
            stepsContainer.innerHTML = `
                <div class="wizard-step active">
                    <div class="step-header">
                        <h2>${stepDef.title}</h2>
                        <p class="step-description">${stepDef.description}</p>
                    </div>
                    <div class="step-content">
                        ${stepDef.renderContent(this.wizardData)}
                    </div>
                </div>
            `;
            
            // Attach step-specific event listeners
            if (stepDef.attachListeners) {
                stepDef.attachListeners(this);
            }
        }
        
        this.updateNavigationButtons();
        this.animateStepTransition();
    }
    
    nextStep() {
        // Validate current step
        if (!this.validateStep()) {
            return;
        }
        
        // Save current step data
        this.saveStepData();
        
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.showStep(this.currentStep);
            this.updateProgress();
            this.saveProgress();
        } else {
            // Final step - save template
            this.saveTemplate();
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.saveStepData();
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgress();
            this.saveProgress();
        }
    }
    
    goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.saveStepData();
            this.currentStep = stepNumber;
            this.showStep(this.currentStep);
            this.updateProgress();
            this.saveProgress();
        }
    }
    
    validateStep() {
        // Get step-specific validation from wizard-steps.js
        const stepDef = window.WizardSteps ? window.WizardSteps.getStep(this.currentStep) : null;
        
        if (stepDef && stepDef.validate) {
            const validation = stepDef.validate(this.wizardData);
            if (!validation.valid) {
                alert(validation.message || 'Please complete all required fields.');
                return false;
            }
        }
        
        return true;
    }
    
    saveStepData() {
        // Collect data from current step and merge into wizardData
        const stepDef = window.WizardSteps ? window.WizardSteps.getStep(this.currentStep) : null;
        
        if (stepDef && stepDef.collectData) {
            const stepData = stepDef.collectData();
            this.wizardData = { ...this.wizardData, ...stepData };
        }
    }
    
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const percentage = (this.currentStep / this.totalSteps) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) {
            prevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
        }
        
        if (nextBtn) {
            if (this.currentStep === this.totalSteps) {
                nextBtn.innerHTML = '💾 Save Template';
                nextBtn.className = 'btn btn-success';
            } else {
                nextBtn.innerHTML = 'Next Step →';
                nextBtn.className = 'btn btn-primary';
            }
        }
    }
    
    animateStepTransition() {
        const stepElement = document.querySelector('.wizard-step');
        if (stepElement) {
            stepElement.style.opacity = '0';
            stepElement.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                stepElement.style.transition = 'all 0.3s ease';
                stepElement.style.opacity = '1';
                stepElement.style.transform = 'translateX(0)';
            }, 10);
        }
    }
    
    saveProgress() {
        // Auto-save to localStorage
        try {
            localStorage.setItem('wizardProgress', JSON.stringify({
                currentStep: this.currentStep,
                wizardData: this.wizardData,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('Could not save wizard progress:', e);
        }
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('wizardProgress');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentStep = data.currentStep || 1;
                return data.wizardData;
            }
        } catch (e) {
            console.warn('Could not load wizard progress:', e);
        }
        return null;
    }
    
    clearProgress() {
        try {
            localStorage.removeItem('wizardProgress');
        } catch (e) {
            console.warn('Could not clear wizard progress:', e);
        }
    }
    
    saveTemplate() {
        // Generate template name with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const templateName = prompt('Enter a name for your template:', `My Template ${timestamp}`);
        
        if (!templateName) return;
        
        // Save template using existing template system
        const template = {
            name: templateName,
            settings: this.wizardData,
            createdAt: new Date().toISOString(),
            createdWith: 'wizard'
        };
        
        // Use store.js to save
        if (window.store && window.store.saveCustomTemplate) {
            window.store.saveCustomTemplate(template);
            alert(`Template "${templateName}" saved successfully!`);
            
            // Clear wizard progress
            this.clearProgress();
            
            // Navigate back to template builder or menu
            if (confirm('Would you like to preview your template?')) {
                // Load template in renderer
                if (window.TemplateRenderer) {
                    window.TemplateRenderer.loadTemplate(template.settings);
                }
                window.navigateTo('menu');
            } else {
                window.navigateTo('menu');
            }
        } else {
            console.error('Template storage not available');
            alert('Error: Could not save template. Please try again.');
        }
    }
    
    resetWizard() {
        if (confirm('Are you sure you want to start over? All progress will be lost.')) {
            this.currentStep = 1;
            this.wizardData = {};
            this.clearProgress();
            this.showStep(1);
            this.updateProgress();
        }
    }
}

// Initialize wizard when DOM is ready
if (typeof window !== 'undefined') {
    window.TemplateWizard = TemplateWizard;
}
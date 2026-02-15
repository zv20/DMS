/**
 * Template Wizard - Step-by-Step Template Builder
 * Phase 1: Core Wizard Structure
 */

class TemplateWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        
        // Wizard data - collected settings that match template-builder.js format
        this.wizardData = {
            // Layout (Step 1)
            layoutStyle: 'elegant-single',
            
            // Week Styling (Step 2)
            dayBlockBg: '#ffffff',
            dayBlockBorder: '#e0e0e0',
            dayBlockPadding: '15',
            dayNameSize: '18',
            dayNameColor: '#333333',
            dayNameWeight: 'bold',
            
            // Meal Display (Step 3)
            showMealTitles: true,
            mealTitleSize: '14',
            mealTitleColor: '#666666',
            showIngredients: true,
            ingredientLayout: 'list',
            numberingStyle: 'none',
            
            // Typography & Colors (Step 4)
            backgroundColor: '#f5f5f5',
            separatorStyle: 'line',
            
            // Content Options (Step 5)
            showHeader: true,
            headerText: 'Weekly Meal Plan',
            headerAlignment: 'center',
            headerSize: '28',
            showDateRange: true,
            dateFormat: 'long',
            showFooter: true,
            footerText: 'Meal plan created with DMS',
            pageBorder: false,
            
            // Advanced
            showBranding: true
        };
        
        this.steps = null; // Will be loaded from wizard-steps.js
        this.renderer = null;
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Initialize renderer for preview
        this.renderer = new TemplateRenderer();
        
        // Load steps from wizard-steps.js
        if (window.WizardSteps) {
            this.steps = window.WizardSteps;
        }
        
        // Try to restore saved progress
        this.loadProgress();
        
        // Build wizard UI
        this.buildWizardUI();
        
        // Show first step
        this.goToStep(this.currentStep);
    }
    
    buildWizardUI() {
        const container = document.getElementById('wizard-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="wizard-wrapper">
                <!-- Progress Bar -->
                <div class="wizard-progress">
                    <div class="wizard-progress-bar">
                        <div class="wizard-progress-fill" id="wizard-progress-fill"></div>
                    </div>
                    <div class="wizard-progress-text" id="wizard-progress-text">
                        Step <span id="wizard-current-step">1</span> of ${this.totalSteps}
                    </div>
                </div>
                
                <!-- Step Container -->
                <div class="wizard-step-container" id="wizard-step-container">
                    <!-- Step content will be injected here -->
                </div>
                
                <!-- Navigation Buttons -->
                <div class="wizard-navigation">
                    <button class="wizard-btn wizard-btn-secondary" id="wizard-prev-btn">
                        ← Previous
                    </button>
                    <button class="wizard-btn wizard-btn-primary" id="wizard-next-btn">
                        Next Step →
                    </button>
                </div>
            </div>
        `;
        
        // Bind navigation buttons
        document.getElementById('wizard-prev-btn')?.addEventListener('click', () => this.previousStep());
        document.getElementById('wizard-next-btn')?.addEventListener('click', () => this.nextStep());
    }
    
    goToStep(stepNumber) {
        // Validate step number
        if (stepNumber < 1 || stepNumber > this.totalSteps) return;
        
        this.currentStep = stepNumber;
        
        // Update progress bar
        this.updateProgressBar();
        
        // Load step content
        this.loadStepContent();
        
        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Save progress
        this.saveProgress();
        
        // Smooth scroll to top of wizard
        document.getElementById('wizard-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    loadStepContent() {
        const container = document.getElementById('wizard-step-container');
        if (!container) return;
        
        // Add fade-out animation
        container.classList.add('wizard-step-fade-out');
        
        setTimeout(() => {
            // Get step definition
            const step = this.steps ? this.steps[this.currentStep - 1] : null;
            
            if (step) {
                // Render step content
                container.innerHTML = `
                    <div class="wizard-step-header">
                        <h2 class="wizard-step-title">${step.title}</h2>
                        <p class="wizard-step-description">${step.description}</p>
                    </div>
                    <div class="wizard-step-body" id="wizard-step-body">
                        ${step.render(this.wizardData)}
                    </div>
                `;
                
                // Bind step-specific event listeners
                if (step.bind) {
                    step.bind(this.wizardData, (data) => this.updateWizardData(data));
                }
            } else {
                // Placeholder if steps not loaded
                container.innerHTML = `
                    <div class="wizard-step-header">
                        <h2 class="wizard-step-title">Step ${this.currentStep}</h2>
                        <p class="wizard-step-description">Placeholder for step ${this.currentStep}</p>
                    </div>
                    <div class="wizard-step-body">
                        <p style="text-align: center; color: #666; padding: 40px;">
                            Step content will be implemented in Phase ${this.currentStep + 1}
                        </p>
                    </div>
                `;
            }
            
            // Add fade-in animation
            container.classList.remove('wizard-step-fade-out');
            container.classList.add('wizard-step-fade-in');
            
            setTimeout(() => {
                container.classList.remove('wizard-step-fade-in');
            }, 300);
        }, 150);
    }
    
    updateProgressBar() {
        const progressFill = document.getElementById('wizard-progress-fill');
        const currentStepSpan = document.getElementById('wizard-current-step');
        
        if (progressFill) {
            const percentage = (this.currentStep / this.totalSteps) * 100;
            progressFill.style.width = `${percentage}%`;
        }
        
        if (currentStepSpan) {
            currentStepSpan.textContent = this.currentStep;
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('wizard-prev-btn');
        const nextBtn = document.getElementById('wizard-next-btn');
        
        if (prevBtn) {
            // Disable previous button on first step
            prevBtn.disabled = this.currentStep === 1;
            prevBtn.style.opacity = this.currentStep === 1 ? '0.5' : '1';
            prevBtn.style.cursor = this.currentStep === 1 ? 'not-allowed' : 'pointer';
        }
        
        if (nextBtn) {
            // Change text on last step
            if (this.currentStep === this.totalSteps) {
                nextBtn.innerHTML = '✓ Complete & Preview';
                nextBtn.classList.add('wizard-btn-success');
            } else {
                nextBtn.innerHTML = 'Next Step →';
                nextBtn.classList.remove('wizard-btn-success');
            }
        }
    }
    
    nextStep() {
        // Validate current step before proceeding
        if (!this.validateStep()) {
            return;
        }
        
        if (this.currentStep < this.totalSteps) {
            this.goToStep(this.currentStep + 1);
        } else {
            // Last step - complete wizard
            this.completeWizard();
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }
    
    validateStep() {
        // Get current step validation rules
        const step = this.steps ? this.steps[this.currentStep - 1] : null;
        
        if (step && step.validate) {
            const validation = step.validate(this.wizardData);
            
            if (!validation.valid) {
                alert(validation.message || 'Please complete all required fields.');
                return false;
            }
        }
        
        return true;
    }
    
    updateWizardData(data) {
        // Update wizard data with new values
        this.wizardData = { ...this.wizardData, ...data };
        
        // Auto-save progress
        this.saveProgress();
    }
    
    saveProgress() {
        // Save to localStorage
        try {
            const progress = {
                currentStep: this.currentStep,
                wizardData: this.wizardData,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('wizard-progress', JSON.stringify(progress));
        } catch (error) {
            console.warn('Failed to save wizard progress:', error);
        }
    }
    
    loadProgress() {
        // Load from localStorage
        try {
            const saved = localStorage.getItem('wizard-progress');
            if (saved) {
                const progress = JSON.parse(saved);
                
                // Only restore if saved recently (within 7 days)
                const savedTime = new Date(progress.timestamp);
                const now = new Date();
                const daysDiff = (now - savedTime) / (1000 * 60 * 60 * 24);
                
                if (daysDiff < 7) {
                    this.currentStep = progress.currentStep || 1;
                    this.wizardData = { ...this.wizardData, ...progress.wizardData };
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to load wizard progress:', error);
        }
        return false;
    }
    
    clearProgress() {
        localStorage.removeItem('wizard-progress');
    }
    
    completeWizard() {
        // Wizard complete - switch to preview mode
        this.clearProgress();
        
        // Show completion message
        const confirmed = confirm(
            'Wizard complete! Your template is ready.\n\n' +
            'Click OK to preview your template, or Cancel to review your settings.'
        );
        
        if (confirmed) {
            // Switch to preview/advanced mode
            this.switchToAdvancedMode();
        }
    }
    
    switchToAdvancedMode() {
        // Transfer wizard data to template builder
        if (window.templateBuilder) {
            window.templateBuilder.state = { ...window.templateBuilder.state, ...this.wizardData };
            window.templateBuilder.updatePreview();
        }
        
        // Switch mode
        const wizardBtn = document.getElementById('mode-wizard-btn');
        const advancedBtn = document.getElementById('mode-advanced-btn');
        
        if (wizardBtn && advancedBtn) {
            wizardBtn.classList.remove('active');
            advancedBtn.classList.add('active');
            
            document.getElementById('wizard-mode-container')?.classList.add('hidden');
            document.getElementById('advanced-mode-container')?.classList.remove('hidden');
        }
    }
    
    reset() {
        if (!confirm('Start over? This will reset all your wizard progress.')) return;
        
        // Reset to defaults
        this.currentStep = 1;
        this.wizardData = new TemplateWizard().wizardData;
        this.clearProgress();
        
        // Reload first step
        this.goToStep(1);
    }
    
    // Public API
    getSettings() {
        return { ...this.wizardData };
    }
}

// Global instance
window.templateWizard = null;

// Initialize when wizard mode is active
function initializeWizard() {
    if (!window.templateWizard) {
        window.templateWizard = new TemplateWizard();
    }
}

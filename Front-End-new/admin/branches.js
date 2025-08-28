// Branches Management JavaScript with Database Integration
import { db } from '../../js/database.js';

class BranchesService {
    constructor() {
        this.initializeBranches();
    }

    async initializeBranches() {
        try {
            // Load real data from database
            await this.loadBranchesData();
            
            // Initialize UI components
            this.initializeBranchInteractions();
            this.initializeMap();
            this.initializeModal();
        } catch (error) {
            console.error('Error initializing branches:', error);
        }
    }

    async loadBranchesData() {
        try {
            // Get branches from database
            const branches = await db.getBranches();
            
            this.branchesData = branches;
            
            // Update UI with real data
            this.updateBranchesDisplay();
        } catch (error) {
            console.error('Error loading branches data:', error);
        }
    }

    updateBranchesDisplay() {
        const branchesContainer = document.querySelector('.branches-grid');
        if (!branchesContainer) return;

        // Clear existing content
        branchesContainer.innerHTML = '';

        // Add real branches from database
        this.branchesData.forEach((branch, index) => {
            const branchCard = this.createBranchCard(branch, index);
            branchesContainer.appendChild(branchCard);
        });

        // Reinitialize interactions
        this.initializeBranchInteractions();
    }

    createBranchCard(branch, index) {
        const card = document.createElement('div');
        card.className = 'branch-card';
        card.dataset.branchId = branch.id;
        
        card.innerHTML = `
            <div class="branch-header">
                <h3>${branch.name || 'غير محدد'}</h3>
                <button class="edit-btn" onclick="branchesService.editBranch('${branch.id}')">
                    <span>✏️</span>
                </button>
            </div>
            <div class="branch-content">
                <div class="branch-location">
                    <span>📍</span>
                    <span>${branch.address || 'غير محدد'}</span>
                </div>
                <div class="branch-hours">
                    <div class="hours-row">
                        <span class="day">الأحد - الخميس:</span>
                        <span class="time">08:00-23:00</span>
                    </div>
                    <div class="hours-row">
                        <span class="day">الجمعة:</span>
                        <span class="time">16:00-23:00</span>
                    </div>
                </div>
                <div class="branch-stats">
                    <div class="stat">
                        <span class="stat-label">الموظفين</span>
                        <span class="stat-value">12</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">الطلبات اليوم</span>
                        <span class="stat-value">45</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add staggered animation
        card.style.animationDelay = `${index * 0.1}s`;
        
        return card;
    }

    initializeBranchInteractions() {
        // Add click event listeners to branch cards
        const branchCards = document.querySelectorAll('.branch-card');
        branchCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on edit button
                if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
                    return;
                }
                
                // Remove active class from all cards
                branchCards.forEach(c => c.classList.remove('active'));
                // Add active class to clicked card
                card.classList.add('active');
                
                // Get branch name
                const branchName = card.querySelector('h3').textContent;
                console.log('Selected branch:', branchName);
            });
        });

        // Add hover effects for branch cards
        branchCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                if (!this.classList.contains('active')) {
                    this.style.transform = 'translateY(-4px)';
                }
            });
            
            card.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.transform = '';
                }
            });
        });
    }

    initializeMap() {
        // Add click event listeners to map pins
        const mapPins = document.querySelectorAll('.map-pin');
        mapPins.forEach(pin => {
            pin.addEventListener('click', (e) => {
                const branchId = pin.getAttribute('data-branch');
                this.highlightBranchOnMap(branchId);
                this.showBranchInfo(branchId);
            });
            
            pin.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.1)';
            });
            
            pin.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }

    highlightBranchOnMap(branchId) {
        // Remove active class from all pins
        const allPins = document.querySelectorAll('.map-pin');
        allPins.forEach(pin => {
            pin.classList.remove('active');
        });
        
        // Add active class to clicked pin
        const activePin = document.querySelector(`[data-branch="${branchId}"]`);
        if (activePin) {
            activePin.classList.add('active');
        }
        
        // Also highlight corresponding branch card
        const branchCards = document.querySelectorAll('.branch-card');
        branchCards.forEach(card => {
            card.classList.remove('active');
            if (card.dataset.branchId === branchId) {
                card.classList.add('active');
            }
        });
    }

    showBranchInfo(branchId) {
        const branch = this.branchesData.find(b => b.id === branchId);
        if (branch) {
            this.showNotification(`تم تحديد فرع ${branch.name} على الخريطة`);
        }
    }

    initializeModal() {
        // Close modal when clicking outside
        const modal = document.getElementById('editBranchModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // Handle form submission
        const form = document.getElementById('editBranchForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveBranchChanges();
            });
        }
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
                this.closeModal();
            }
        });
    }

    editBranch(branchId) {
        // Get branch data from database
        const branch = this.branchesData.find(b => b.id === branchId);
        if (!branch) return;
        
        // Populate form fields
        const nameInput = document.getElementById('branchName');
        const locationInput = document.getElementById('branchLocation');
        
        if (nameInput) nameInput.value = branch.name || '';
        if (locationInput) locationInput.value = branch.address || '';
        
        // Store current branch ID for saving
        const form = document.getElementById('editBranchForm');
        if (form) {
            form.setAttribute('data-branch-id', branchId);
        }
        
        // Show modal
        const modal = document.getElementById('editBranchModal');
        if (modal) {
            modal.classList.add('show');
        }
        
        // Focus on first input
        setTimeout(() => {
            if (nameInput) nameInput.focus();
        }, 100);
    }

    async saveBranchChanges() {
        const form = document.getElementById('editBranchForm');
        if (!form) return;
        
        const branchId = form.getAttribute('data-branch-id');
        
        // Get form data
        const formData = {
            name: document.getElementById('branchName')?.value || '',
            address: document.getElementById('branchLocation')?.value || ''
        };
        
        try {
            // Update branch in database
            const { data, error } = await db.supabase
                .from('branches')
                .update(formData)
                .eq('id', branchId)
                .select()
                .single();

            if (data) {
                // Update local data
                const branchIndex = this.branchesData.findIndex(b => b.id === branchId);
                if (branchIndex !== -1) {
                    this.branchesData[branchIndex] = { ...this.branchesData[branchIndex], ...formData };
                }
                
                // Update the branch card
                this.updateBranchCard(branchId, formData);
                
                // Close modal
                this.closeModal();
                
                // Show success notification
                this.showNotification('تم حفظ تغييرات الفرع بنجاح');
            }
        } catch (error) {
            console.error('Error saving branch changes:', error);
            this.showNotification('خطأ في حفظ تغييرات الفرع');
        }
    }

    updateBranchCard(branchId, data) {
        // Find the corresponding branch card
        const branchCard = document.querySelector(`[data-branch-id="${branchId}"]`);
        
        if (branchCard) {
            // Update branch name
            const nameElement = branchCard.querySelector('h3');
            if (nameElement) nameElement.textContent = data.name;
            
            // Update location
            const locationElement = branchCard.querySelector('.branch-location span:last-child');
            if (locationElement) locationElement.textContent = data.address;
            
            // Add update animation
            branchCard.style.animation = 'none';
            setTimeout(() => {
                branchCard.style.animation = 'slideInUp 0.5s ease-out';
            }, 10);
        }
    }

    closeModal() {
        const modal = document.getElementById('editBranchModal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        // Reset form
        const form = document.getElementById('editBranchForm');
        if (form) {
            form.reset();
        }
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #48bb78 0%, #38b2ac 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-family: 'Cairo', sans-serif;
            font-size: 0.9rem;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Add new branch functionality
    async addNewBranch(branchData) {
        try {
            const newBranch = await db.supabase
                .from('branches')
                .insert([branchData])
                .select()
                .single();

            if (newBranch) {
                // Add to local array
                this.branchesData.push(newBranch);
                
                // Update display
                this.updateBranchesDisplay();
                
                // Show notification
                this.showNotification(`تم إضافة فرع جديد: ${branchData.name}`);
            }
        } catch (error) {
            console.error('Error adding new branch:', error);
            this.showNotification('خطأ في إضافة الفرع الجديد');
        }
    }
}

// Initialize branches when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.branchesService = new BranchesService();
});

// Add CSS animations for notifications and modal
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(20px);
        }
    }
    
    .branch-card.active {
        transform: translateY(-4px);
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        border: 2px solid #667eea;
    }
    
    .map-pin.active .pin-icon {
        color: #667eea;
        animation: bounce 0.6s ease;
    }
    
    .map-pin.active .pin-label {
        background: rgba(102, 126, 234, 0.9);
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + E to open edit modal for active branch
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        const activeCard = document.querySelector('.branch-card.active');
        if (activeCard) {
            const editBtn = activeCard.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.click();
            }
        }
    }
    
    // Ctrl/Cmd + M to focus on map
    if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
        event.preventDefault();
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// Export for potential use
window.branchesModule = {
    editBranch: (branchId) => {
        const branchesService = window.branchesService;
        if (branchesService) {
            branchesService.editBranch(branchId);
        }
    },
    closeModal: () => {
        const branchesService = window.branchesService;
        if (branchesService) {
            branchesService.closeModal();
        }
    },
    showNotification: (message) => {
        const branchesService = window.branchesService;
        if (branchesService) {
            branchesService.showNotification(message);
        }
    },
    highlightBranchOnMap: (branchId) => {
        const branchesService = window.branchesService;
        if (branchesService) {
            branchesService.highlightBranchOnMap(branchId);
        }
    }
};

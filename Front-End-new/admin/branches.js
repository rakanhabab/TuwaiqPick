// Branches Management JavaScript with Database Integration
import { db } from '../js/database.js';

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
            // Remove modal/edit initialization since edit is disabled
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
                    ${branch.employees_count ? `
                    <div class="stat">
                        <span class="stat-label">الموظفين</span>
                        <span class="stat-value">${branch.employees_count}</span>
                    </div>` : ''}
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
            card.addEventListener('click', () => {
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
}

// Initialize branches when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.branchesService = new BranchesService();
});

// Styles keep as before for active/hover states
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

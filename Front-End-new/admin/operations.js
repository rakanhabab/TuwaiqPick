// Operations Management JavaScript with Database Integration
import { db } from '../js/database.js';

class OperationsService {
    constructor() {
        this.initializeOperations();
    }

    async initializeOperations() {
        try {
            // Load real data from database
            await this.loadVirtualCarts();
            
            // Initialize UI components
            this.initializeCartInteractions();
            this.initializeRealTimeUpdates();
            this.initializeSearchAndFilter();
        } catch (error) {
            console.error('Error initializing operations:', error);
        }
    }

    async loadVirtualCarts() {
        try {
            // Admin view: get all invoices
            const invoices = await db.getAllInvoices();
            
            // Filter for active/pending invoices (virtual carts)
            const activeCarts = (invoices || []).filter(invoice => 
                (invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'active'
            );

            this.virtualCarts = activeCarts;
            
            // Update UI with real data
            this.updateVirtualCartsDisplay();
        } catch (error) {
            console.error('Error loading virtual carts:', error);
        }
    }

    updateVirtualCartsDisplay() {
        const virtualCartsSection = document.querySelector('.virtual-carts-section');
        if (!virtualCartsSection) return;

        // Clear existing carts
        const existingCarts = virtualCartsSection.querySelectorAll('.cart-card');
        existingCarts.forEach(cart => cart.remove());

        // Add real carts from database
        this.virtualCarts.forEach(cart => {
            const cartHTML = this.createCartHTML(cart);
            virtualCartsSection.insertAdjacentHTML('beforeend', cartHTML);
        });

        // Initialize interactions for new carts
        this.initializeCartInteractions();
    }

    createCartHTML(cart) {
        const startTime = new Date(cart.timestamp);
        const duration = this.calculateDuration(startTime);
        
        return `
            <div class="cart-card" data-cart-id="${cart.id}">
                <div class="cart-header">
                    <h3>العميل: ${cart.user_id || 'غير محدد'}</h3>
                    <span class="cart-timestamp">Started at ${startTime.toLocaleString('ar-SA')} (${duration})</span>
                </div>
                <div class="cart-content">
                    <table class="cart-table">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>SKU</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateCartItemsHTML(cart)}
                        </tbody>
                    </table>
                    <div class="cart-summary">
                        <strong>المجموع: ${db.formatCurrency(cart.total_amount || 0)}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    generateCartItemsHTML(cart) {
        // لا يوجد جدول cart_items حالياً؛ سنعرض ملخصاً حقيقياً بدون بيانات وهمية
        const quantity = cart.items_count || 0;
        return `
            <tr>
                <td>—</td>
                <td>—</td>
                <td>${quantity}</td>
                <td>${db.formatCurrency(cart.total_amount || 0)}</td>
            </tr>
        `;
    }

    calculateDuration(startTime) {
        const now = new Date();
        const diff = now - startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s ago`;
        } else {
            return `${seconds}s ago`;
        }
    }

    initializeCartInteractions() {
        // Add click event listeners to cart cards
        const cartCards = document.querySelectorAll('.cart-card');
        cartCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Remove active class from all cards
                cartCards.forEach(c => c.classList.remove('active'));
                // Add active class to clicked card
                card.classList.add('active');
                
                // Show cart details
                const cartId = card.dataset.cartId;
                this.showCartDetails(cartId);
            });
        });

        // Add hover effects for table rows
        const tableRows = document.querySelectorAll('.cart-table tbody tr');
        tableRows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8fafc';
            });
            
            row.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
            });
        });
    }

    async showCartDetails(cartId) {
        try {
            const cart = this.virtualCarts.find(c => c.id === cartId);
            if (cart) {
                this.showNotification(`تم اختيار عربة العميل ${cart.user_id || 'غير محدد'}`);
            }
        } catch (error) {
            console.error('Error showing cart details:', error);
        }
    }

    initializeRealTimeUpdates() {
        // Update cart timestamps every 30 seconds
        setInterval(() => {
            this.updateCartTimestamps();
        }, 30000);

        // Refresh cart data every 2 minutes
        setInterval(async () => {
            await this.loadVirtualCarts();
        }, 120000);
    }

    updateCartTimestamps() {
        const timestamps = document.querySelectorAll('.cart-timestamp');
        timestamps.forEach(timestamp => {
            const startTimeMatch = timestamp.textContent.match(/Started at (.+?) \(/);
            if (startTimeMatch) {
                const startTime = new Date(startTimeMatch[1]);
                const duration = this.calculateDuration(startTime);
                timestamp.textContent = `Started at ${startTime.toLocaleString('ar-SA')} (${duration})`;
            }
        });
    }

    initializeSearchAndFilter() {
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'البحث في العربات...';
        searchInput.className = 'cart-search';
        searchInput.style.cssText = `
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 20px;
            font-family: 'Cairo', sans-serif;
            font-size: 0.9rem;
        `;
        
        const virtualCartsSection = document.querySelector('.virtual-carts-section');
        if (virtualCartsSection) {
            virtualCartsSection.insertBefore(searchInput, virtualCartsSection.firstChild);
        }
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cartCards = document.querySelectorAll('.cart-card');
            
            cartCards.forEach(card => {
                const customerId = card.querySelector('h3').textContent.toLowerCase();
                const products = Array.from(card.querySelectorAll('.cart-table td'))
                    .map(td => td.textContent.toLowerCase())
                    .join(' ');
                
                const matches = customerId.includes(searchTerm) || products.includes(searchTerm);
                card.style.display = matches ? 'block' : 'none';
            });
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: linear-gradient(135deg, #48bb78 0%, #38b2ac 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-family: 'Cairo', sans-serif;
            font-size: 0.9rem;
            animation: slideInLeft 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutLeft 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize operations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new OperationsService();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutLeft {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-20px);
        }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Escape to clear search
    if (event.key === 'Escape') {
        const searchInput = document.querySelector('.cart-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }
});

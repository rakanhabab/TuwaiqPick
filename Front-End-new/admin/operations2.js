// Operations2 Management JavaScript with Database Integration & Burger Menu
import { db } from '../js/database.js';

class Operations2Service {
    constructor() {
        this.productsData = [];
        this.initializeOperations();
        this.initializeBurgerMenu();
    }

    initializeBurgerMenu() {
        const burgerBtn = document.getElementById('burgerMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const closeBtn = document.getElementById('closeSidebarBtn');

        if (burgerBtn) {
            burgerBtn.addEventListener('click', () => {
                sidebar.classList.add('show');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('show');
            });
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !burgerBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });

        // Close sidebar on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                sidebar.classList.remove('show');
            }
        });
    }

    async initializeOperations() {
        try {
            // Load products data first
            await this.loadProductsData();
            
            // Load sessions data
            await this.loadSessionsData();
            
            // Initialize UI components
            this.initializeFilters();
            this.setupRealTimeUpdates();
        } catch (error) {
            console.error('Error initializing operations:', error);
        }
    }

    async loadProductsData() {
        try {
            const products = await db.getProducts();
            this.productsData = products || this.getMockProductsData();
        } catch (error) {
            console.error('Error loading products:', error);
            this.productsData = this.getMockProductsData();
        }
    }

    getMockProductsData() {
        return [
            { id: 'SKU001', name: 'Chocolate Bar', price: 2.50, shelf: 'Aisle 1 - Shelf 2', category: 'Candy', calories: 150 },
            { id: 'SKU002', name: 'Orange Juice', price: 3.75, shelf: 'Aisle 2 - Shelf 1', category: 'Beverages', calories: 120 },
            { id: 'SKU003', name: 'barni', price: 1.75, shelf: 'Aisle 3 - Shelf 1', category: 'Cake', calories: 120 },
            { id: 'SKU004', name: 'Bread Loaf', price: 2.25, shelf: 'Aisle 1 - Shelf 1', category: 'Bakery', calories: 80 },
            { id: 'SKU005', name: 'Milk 1L', price: 4.50, shelf: 'Aisle 2 - Shelf 3', category: 'Dairy', calories: 100 }
        ];
    }

    async loadSessionsData() {
        try {
            // Create sessions with products
            this.createSessionsWithProducts();
            
            // Update UI
            this.updateSessionsDisplay();
        } catch (error) {
            console.error('Error loading sessions data:', error);
        }
    }

    createSessionsWithProducts() {
        // Generate exactly 3 sessions with different statuses
        this.sessionsData = [
            {
                customerId: 'CUST001',
                timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
                status: 'processing',
                items: this.getRandomItems(2),
                total: 0
            },
            {
                customerId: 'CUST002',
                timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
                status: 'paid',
                items: this.getRandomItems(2),
                total: 0
            },
            {
                customerId: 'CUST003',
                timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
                status: 'unpaid',
                items: this.getRandomItems(2),
                total: 0
            }
        ];

        // Calculate totals
        this.sessionsData.forEach(session => {
            session.total = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        });
    }

    getRandomItems(count) {
        const shuffled = [...this.productsData].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(product => ({
            ...product,
            quantity: Math.floor(Math.random() * 3) + 1
        }));
    }

    updateSessionsDisplay() {
        const sessionsGrid = document.getElementById('sessionsGrid');
        if (!sessionsGrid) return;

        sessionsGrid.innerHTML = '';

        this.sessionsData.forEach(session => {
            const sessionCard = this.createSessionCard(session);
            sessionsGrid.appendChild(sessionCard);
        });
    }

    createSessionCard(session) {
        const card = document.createElement('div');
        card.className = `customer-session-card ${session.status === 'processing' ? 'live' : ''}`;
        
        card.innerHTML = `
            <div class="session-header">
                <div class="session-customer-info">
                    <h4>customer_id: ${session.customerId}</h4>
                    <div class="session-timestamp">session_timestamp: ${this.formatTimestamp(session.timestamp)}</div>
                </div>
                <div class="session-status ${session.status}">status: ${session.status}</div>
            </div>
            
            <div class="cart-items">
                <div class="cart-item header-row">
                    <div class="col-product">PRODUCT NAME</div>
                    <div class="col-sku">SKU</div>
                    <div class="col-qty">QTY</div>
                    <div class="col-price">PRICE</div>
                </div>
                ${session.items.map(item => `
                    <div class="cart-item">
                        <div class="col-product">${item.name}</div>
                        <div class="col-sku">${item.id}</div>
                        <div class="col-qty">${item.quantity}</div>
                        <div class="col-price">${db.formatCurrency(item.price)}</div>
                    </div>
                `).join('')}
                <div class="cart-item total-row">
                    <div class="col-product">TOTAL:</div>
                    <div class="col-sku"></div>
                    <div class="col-qty"></div>
                    <div class="col-price">${session.total.toFixed(2)} ر.س</div>
                </div>
            </div>
        `;

        return card;
    }

    formatTimestamp(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins === 1) return '1 minute ago';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    initializeFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Filter sessions
                const filter = btn.getAttribute('data-filter');
                this.filterSessions(filter);
            });
        });
    }

    filterSessions(filter) {
        const sessionsGrid = document.getElementById('sessionsGrid');
        if (!sessionsGrid) return;

        sessionsGrid.innerHTML = '';

        const filteredSessions = filter === 'all' 
            ? this.sessionsData 
            : this.sessionsData.filter(session => session.status === filter);

        filteredSessions.forEach(session => {
            const sessionCard = this.createSessionCard(session);
            sessionsGrid.appendChild(sessionCard);
        });
    }

    setupRealTimeUpdates() {
        // Update random session every 10 seconds
        setInterval(() => {
            this.updateRandomSession();
        }, 10000);
    }

    updateRandomSession() {
        // Ensure CUST001 is always 'processing', CUST002 is 'paid', CUST003 is 'unpaid'
        const sessionIndex = Math.floor(Math.random() * this.sessionsData.length);
        const session = this.sessionsData[sessionIndex];
        
        // Update timestamp to make it look live
        session.timestamp = new Date();
        
        // Update display
        this.updateSessionsDisplay();
    }
}

// Initialize operations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.operations2Service = new Operations2Service();
});

// Add CSS animations for notifications
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
    
    .customer-session-card {
        animation: slideInRight 0.3s ease-out;
    }
`;
document.head.appendChild(style);

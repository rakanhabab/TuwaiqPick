// Inventory Management JavaScript with Database Integration
import { db } from '../js/database.js';

class InventoryService {
    constructor() {
        this.initializeInventory();
    }

    async initializeInventory() {
        try {
            // Load real data from database
            await this.loadInventoryData();
            
            // Initialize UI components
            this.initializeTableInteractions();
            this.initializeSearchAndFilter();
        } catch (error) {
            console.error('Error initializing inventory:', error);
        }
    }

    async loadInventoryData() {
        try {
            // Get products and quantities
            const [products, quantities] = await Promise.all([
                db.getProducts(),
                db.getInventoryQuantities()
            ]);
            
            // Build map product_id -> quantity
            const idToQty = new Map();
            (quantities || []).forEach(row => {
                if (row && row.product_id) {
                    idToQty.set(row.product_id, Number(row.quantity) || 0);
                }
            });

            // Merge
            this.inventoryData = (products || []).map(p => ({
                ...p,
                quantity: idToQty.get(p.id) ?? 0
            }));
            
            // Update UI with real data
            this.updateInventoryDisplay();
            
            if (!products || products.length === 0) {
                this.showNotification('لا توجد منتجات في قاعدة البيانات', 'info');
            }
        } catch (error) {
            console.error('Error loading inventory data:', error);
            this.showNotification('خطأ في تحميل البيانات من قاعدة البيانات', 'error');
        }
    }

    updateInventoryDisplay() {
        const tableBody = document.querySelector('.inventory-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.inventoryData.forEach((product, index) => {
            const row = this.createProductRow(product, index);
            tableBody.appendChild(row);
        });

        this.initializeTableInteractions();
    }

    createProductRow(product, index) {
        const qty = Number(product.quantity) || 0;
        const statusInfo = this.calculateInventoryStatus(qty);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${product.name || 'غير محدد'}</td>
            <td>${product.id || 'غير محدد'}</td>
            <td>${product.category || 'أخرى'}</td>
            <td>${product.shelf || 'غير محدد'}</td>
            <td>${db.formatCurrency(product.price || 0)}</td>
            <td>${qty}</td>
            <td>${this.createStatusBadge(statusInfo)}</td>
        `;
        
        row.style.animationDelay = `${index * 0.1}s`;
        
        return row;
    }

    calculateInventoryStatus(quantity) {
        const qty = parseInt(quantity);
        if (qty === 0) {
            return { status: 'out', text: 'نفد المخزون', class: 'status-out' };
        } else if (qty <= 5) {
            return { status: 'low', text: 'مخزون منخفض', class: 'status-low' };
        } else if (qty <= 20) {
            return { status: 'normal', text: 'مخزون عادي', class: 'status-normal' };
        } else {
            return { status: 'high', text: 'مخزون مرتفع', class: 'status-high' };
        }
    }

    createStatusBadge(statusInfo) {
        return `
            <span class="status-badge ${statusInfo.class}">
                <span class="status-dot"></span>
                ${statusInfo.text}
            </span>
        `;
    }

    initializeTableInteractions() {
        // Add click event listeners to table rows
        const tableRows = document.querySelectorAll('.inventory-table tbody tr');
        tableRows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Remove active class from all rows
                tableRows.forEach(r => r.classList.remove('active'));
                // Add active class to clicked row
                row.classList.add('active');
                
                // Get product details
                const productName = row.cells[0].textContent;
                const sku = row.cells[1].textContent;
                console.log('Selected product:', productName, 'SKU:', sku);
            });
        });

        // Add hover effects for table rows
        tableRows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#f8fafc';
            });
            
            row.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.backgroundColor = '';
                }
            });
        });
    }

    initializeSearchAndFilter() {
        const branchInput = document.getElementById('branchInput');
        const searchInput = document.getElementById('searchInput');
        const applyBtn = document.getElementById('applyBtn');
        
        if (!branchInput || !searchInput || !applyBtn) return;
        
        // Apply button click handler
        applyBtn.addEventListener('click', (e) => {
            const branchId = branchInput.value.trim();
            const searchTerm = searchInput.value.trim();
            
            this.filterInventory(branchId, searchTerm);
        });
        
        // Enter key handlers
        branchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        // Real-time search
        searchInput.addEventListener('input', (e) => {
            const branchId = branchInput.value.trim();
            const searchTerm = e.target.value.trim();
            
            if (searchTerm.length >= 2 || searchTerm.length === 0) {
                this.filterInventory(branchId, searchTerm);
            }
        });
    }

    filterInventory(branchId, searchTerm) {
        const tableBody = document.querySelector('.inventory-table tbody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        
        // Show loading state
        this.showLoadingState(true);
        
        // Simulate API call delay
        setTimeout(() => {
            let visibleCount = 0;
            
            rows.forEach(row => {
                const productName = row.cells[0].textContent.toLowerCase();
                const sku = row.cells[1].textContent.toLowerCase();
                const category = row.cells[2].textContent.toLowerCase();
                
                let shouldShow = true;
                
                // Branch filter (if provided)
                if (branchId) {
                    // In a real app, you would check if the product belongs to this branch
                    shouldShow = productName.includes(branchId.toLowerCase()) || 
                               sku.includes(branchId.toLowerCase());
                }
                
                // Search filter (if provided)
                if (shouldShow && searchTerm) {
                    shouldShow = productName.includes(searchTerm.toLowerCase()) || 
                               sku.includes(searchTerm.toLowerCase()) ||
                               category.includes(searchTerm.toLowerCase());
                }
                
                // Show/hide row with animation
                if (shouldShow) {
                    row.style.display = 'table-row';
                    row.classList.add('fade-in');
                    visibleCount++;
                    
                    // Highlight search terms
                    if (searchTerm) {
                        this.highlightSearchTerms(row, searchTerm);
                    } else {
                        this.removeHighlights(row);
                    }
                } else {
                    row.style.display = 'none';
                    row.classList.remove('fade-in');
                    this.removeHighlights(row);
                }
            });
            
            // Show no results message if needed
            if (visibleCount === 0) {
                this.showNoResultsMessage();
            } else {
                this.hideNoResultsMessage();
            }
            
            // Hide loading state
            this.showLoadingState(false);
            
            // Show notification
            if (searchTerm || branchId) {
                this.showNotification(`تم العثور على ${visibleCount} منتج`);
            }
            
        }, 500);
    }

    highlightSearchTerms(row, searchTerm) {
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            const text = cell.textContent;
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            const highlightedText = text.replace(regex, '<span class="highlight">$1</span>');
            cell.innerHTML = highlightedText;
        });
    }

    removeHighlights(row) {
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            const highlights = cell.querySelectorAll('.highlight');
            highlights.forEach(highlight => {
                highlight.replaceWith(highlight.textContent);
            });
        });
    }

    showLoadingState(show) {
        const table = document.querySelector('.inventory-table');
        if (show) {
            table.classList.add('loading');
        } else {
            table.classList.remove('loading');
        }
    }

    showNoResultsMessage() {
        const tableBody = document.querySelector('.inventory-table tbody');
        let noResultsRow = tableBody.querySelector('.no-results');
        
        if (!noResultsRow) {
            noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 40px; color: #718096; font-style: italic;">
                    لا توجد منتجات تطابق معايير البحث
                </td>
            `;
            tableBody.appendChild(noResultsRow);
        }
    }

    hideNoResultsMessage() {
        const noResultsRow = document.querySelector('.no-results');
        if (noResultsRow) {
            noResultsRow.remove();
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

    // Add new product functionality
    async addNewProduct(productData) {
        try {
            const newProduct = await db.supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (newProduct) {
                // Add to local array
                this.inventoryData.push(newProduct);
                
                // Update display
                this.updateInventoryDisplay();
                
                // Show notification
                this.showNotification(`تم إضافة منتج جديد: ${productData.name}`);
            }
        } catch (error) {
            console.error('Error adding new product:', error);
            this.showNotification('خطأ في إضافة المنتج الجديد');
        }
    }

    // Update product quantity
    async updateProductQuantity(productId, newQuantity) {
        try {
            const { data, error } = await db.supabase
                .from('products')
                .update({ quantity: newQuantity })
                .eq('id', productId)
                .select()
                .single();

            if (data) {
                // Update local data
                const productIndex = this.inventoryData.findIndex(p => p.id === productId);
                if (productIndex !== -1) {
                    this.inventoryData[productIndex].quantity = newQuantity;
                }
                
                // Update display
                this.updateInventoryDisplay();
                
                // Show notification
                this.showNotification(`تم تحديث كمية المنتج`);
            }
        } catch (error) {
            console.error('Error updating product quantity:', error);
            this.showNotification('خطأ في تحديث كمية المنتج');
        }
    }
}

// Initialize inventory when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.inventoryService = new InventoryService();
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
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    
    .inventory-table tbody tr.active {
        background-color: rgba(66, 153, 225, 0.1) !important;
        border-left: 4px solid #4299e1;
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to clear filters
    if (event.key === 'Escape') {
        const branchInput = document.getElementById('branchInput');
        const searchInput = document.getElementById('searchInput');
        
        if (branchInput && searchInput && (branchInput.value || searchInput.value)) {
            branchInput.value = '';
            searchInput.value = '';
            // Access the inventory service instance
            const inventoryService = window.inventoryService;
            if (inventoryService) {
                inventoryService.filterInventory('', '');
            }
        }
    }
});

// Export for potential use
window.inventoryModule = {
    filterInventory: (branchId, searchTerm) => {
        const inventoryService = window.inventoryService;
        if (inventoryService) {
            inventoryService.filterInventory(branchId, searchTerm);
        }
    },
    showNotification: (message) => {
        const inventoryService = window.inventoryService;
        if (inventoryService) {
            inventoryService.showNotification(message);
        }
    }
};

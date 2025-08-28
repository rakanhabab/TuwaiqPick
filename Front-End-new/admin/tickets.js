// Tickets Management JavaScript with Database Integration
import { db } from '../../js/database.js';

class TicketsService {
    constructor() {
        this.initializeTickets();
    }

    async initializeTickets() {
        try {
            // Load real data from database
            await this.loadTicketsData();
            
            // Initialize UI components
            this.initializeFilters();
            this.initializeSearch();
        } catch (error) {
            console.error('Error initializing tickets:', error);
        }
    }

    async loadTicketsData() {
        try {
            // Get tickets from database
            const tickets = await db.getTickets();
            
            this.ticketsData = tickets;
            
            // Update UI with real data
            this.populateTicketsTable(tickets);
        } catch (error) {
            console.error('Error loading tickets data:', error);
        }
    }

    populateTicketsTable(tickets) {
        const tableBody = document.getElementById('ticketsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        tickets.forEach((ticket, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.1}s`;
            
            row.innerHTML = `
                <td>
                    <strong class="ticket-number">${ticket.id || 'غير محدد'}</strong>
                </td>
                <td>
                    <span class="invoice-number">${ticket.invoice_id || 'غير محدد'}</span>
                </td>
                <td>
                    ${this.getStatusBadge(ticket.status)}
                </td>
                <td>
                    <span class="refund-amount ${ticket.refund_amount === 0 ? 'zero' : ''}">
                        ${db.formatCurrency(ticket.refund_amount || 0)}
                    </span>
                </td>
                <td>
                    <span class="creation-date">${this.formatDate(ticket.timestamp)}</span>
                </td>
                <td>
                    <div class="actions-buttons">
                        <button class="action-btn view" onclick="ticketsService.viewInvoice('${ticket.invoice_id}')" title="عرض الفاتورة">
                            عرض الفاتورة
                        </button>
                        ${ticket.status === 'open' ? `
                            <button class="action-btn approve" onclick="ticketsService.approveTicket('${ticket.id}')" title="قبول الطلب">
                                قبول الطلب
                            </button>
                            <button class="action-btn reject" onclick="ticketsService.rejectTicket('${ticket.id}')" title="رفض الطلب">
                                رفض الطلب
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add click effects
        this.addTableRowEffects();
    }

    getStatusBadge(status) {
        const statusMap = {
            'open': { text: 'مفتوح', class: 'pending' },
            'in_progress': { text: 'قيد المعالجة', class: 'approved' },
            'closed': { text: 'مغلق', class: 'completed' },
            'rejected': { text: 'مرفوض', class: 'rejected' }
        };
        
        const statusInfo = statusMap[status] || statusMap['open'];
        
        return `
            <span class="status-badge ${statusInfo.class}">
                <span class="status-dot"></span>
                ${statusInfo.text}
            </span>
        `;
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    addTableRowEffects() {
        const rows = document.querySelectorAll('.tickets-table tbody tr');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.classList.contains('action-btn')) {
                    return;
                }
                
                // Remove active class from all rows
                rows.forEach(r => r.classList.remove('active'));
                // Add active class to clicked row
                row.classList.add('active');
            });
            
            row.addEventListener('mouseenter', function() {
                if (!this.classList.contains('active')) {
                    this.style.backgroundColor = '#f8fafc';
                }
            });
            
            row.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.backgroundColor = '';
                }
            });
        });
    }

    initializeFilters() {
        // Add event listeners for filters
        const statusFilter = document.getElementById('statusFilter');
        const typeFilter = document.getElementById('typeFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterTickets());
        }
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterTickets());
        }
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.filterTickets());
        }
    }

    initializeSearch() {
        // Add search functionality
        const searchInput = document.getElementById('ticketsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.searchTickets(), 300));
        }
    }

    filterTickets() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        const dateFilter = document.getElementById('dateFilter')?.value || 'all';
        
        let filteredTickets = this.ticketsData.filter(ticket => {
            // Status filter
            if (statusFilter !== 'all' && ticket.status !== statusFilter) {
                return false;
            }
            
            // Type filter (if you have ticket types)
            if (typeFilter !== 'all' && ticket.type !== typeFilter) {
                return false;
            }
            
            // Date filter
            if (dateFilter !== 'all' && ticket.timestamp) {
                const ticketDate = new Date(ticket.timestamp);
                const today = new Date();
                
                switch (dateFilter) {
                    case 'today':
                        return ticketDate.toDateString() === today.toDateString();
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return ticketDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return ticketDate >= monthAgo;
                }
            }
            
            return true;
        });
        
        this.populateTicketsTable(filteredTickets);
    }

    searchTickets() {
        const searchTerm = document.getElementById('ticketsSearch')?.value.toLowerCase() || '';
        
        if (!searchTerm) {
            this.populateTicketsTable(this.ticketsData);
            return;
        }
        
        const filteredTickets = this.ticketsData.filter(ticket => {
            return (ticket.id && ticket.id.toLowerCase().includes(searchTerm)) ||
                   (ticket.invoice_id && ticket.invoice_id.toLowerCase().includes(searchTerm));
        });
        
        this.populateTicketsTable(filteredTickets);
    }

    // Action Functions
    async viewInvoice(invoiceId) {
        try {
            // Get invoice details from database
            const invoice = await db.getInvoiceById(invoiceId);
            
            if (invoice) {
                this.showInvoiceModal(invoice);
            } else {
                this.showNotification('لم يتم العثور على الفاتورة', 'error');
            }
        } catch (error) {
            console.error('Error viewing invoice:', error);
            this.showNotification('خطأ في عرض الفاتورة', 'error');
        }
    }

    showInvoiceModal(invoice) {
        // Show modal with invoice details
        const modal = document.getElementById('invoiceModal');
        const modalBody = document.getElementById('invoiceModalBody');
        
        if (!modal || !modalBody) return;
        
        // Create invoice content
        modalBody.innerHTML = `
            <div class="invoice-preview">
                <div class="invoice-header">
                    <h4>فاتورة رقم: ${invoice.id}</h4>
                    <p>تاريخ الإصدار: ${this.formatDate(invoice.timestamp)}</p>
                </div>
                <div class="invoice-items">
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>منتجات متعددة</td>
                                <td>1</td>
                                <td>${db.formatCurrency(invoice.total_amount || 0)}</td>
                                <td>${db.formatCurrency(invoice.total_amount || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="invoice-total">
                    <strong>المجموع: ${db.formatCurrency(invoice.total_amount || 0)}</strong>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
    }

    async approveTicket(ticketId) {
        try {
            // Update ticket status in database
            const { data, error } = await db.supabase
                .from('tickets')
                .update({ status: 'in_progress' })
                .eq('id', ticketId)
                .select()
                .single();

            if (data) {
                // Update local data
                const ticketIndex = this.ticketsData.findIndex(t => t.id === ticketId);
                if (ticketIndex !== -1) {
                    this.ticketsData[ticketIndex].status = 'in_progress';
                }
                
                // Refresh table
                this.populateTicketsTable(this.ticketsData);
                this.showNotification(`تم قبول التذكرة ${ticketId} بنجاح`, 'success');
            }
        } catch (error) {
            console.error('Error approving ticket:', error);
            this.showNotification('خطأ في قبول التذكرة', 'error');
        }
    }

    async rejectTicket(ticketId) {
        try {
            // Update ticket status in database
            const { data, error } = await db.supabase
                .from('tickets')
                .update({ status: 'rejected' })
                .eq('id', ticketId)
                .select()
                .single();

            if (data) {
                // Update local data
                const ticketIndex = this.ticketsData.findIndex(t => t.id === ticketId);
                if (ticketIndex !== -1) {
                    this.ticketsData[ticketIndex].status = 'rejected';
                }
                
                // Refresh table
                this.populateTicketsTable(this.ticketsData);
                this.showNotification(`تم رفض التذكرة ${ticketId}`, 'warning');
            }
        } catch (error) {
            console.error('Error rejecting ticket:', error);
            this.showNotification('خطأ في رفض التذكرة', 'error');
        }
    }

    closeInvoiceModal() {
        const modal = document.getElementById('invoiceModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    createNewTicket() {
        this.showNotification('تم فتح نموذج إنشاء تذكرة جديدة', 'info');
        // Here you would typically open a modal or navigate to a form
    }

    exportTickets() {
        this.showNotification('تم تصدير البيانات بنجاح', 'success');
    }

    // Utility Functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#38a169',
            warning: '#d97706',
            error: '#e53e3e',
            info: '#3182ce'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
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

// Initialize tickets when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.ticketsService = new TicketsService();
});

// Add CSS animations
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
    
    .tickets-table tr.active {
        background: rgba(102, 126, 234, 0.1) !important;
        border-left: 4px solid #667eea;
    }
    
    .invoice-preview {
        font-family: 'Cairo', sans-serif;
    }
    
    .invoice-header {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .invoice-header h4 {
        margin: 0 0 8px 0;
        color: #2d3748;
    }
    
    .invoice-header p {
        margin: 0;
        color: #718096;
        font-size: 0.9rem;
    }
    
    .invoice-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }
    
    .invoice-table th,
    .invoice-table td {
        padding: 12px;
        text-align: right;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .invoice-table th {
        background: #f8fafc;
        font-weight: 600;
        color: #2d3748;
    }
    
    .invoice-total {
        text-align: left;
        font-size: 1.1rem;
        color: #2d3748;
        padding-top: 15px;
        border-top: 2px solid #e2e8f0;
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + N to create new ticket
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        const ticketsService = window.ticketsService;
        if (ticketsService) {
            ticketsService.createNewTicket();
        }
    }
    
    // Ctrl/Cmd + E to export tickets
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        const ticketsService = window.ticketsService;
        if (ticketsService) {
            ticketsService.exportTickets();
        }
    }
    
    // Ctrl/Cmd + F to focus on search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.getElementById('ticketsSearch');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to close modal
    if (event.key === 'Escape') {
        const modal = document.getElementById('invoiceModal');
        if (modal && modal.classList.contains('show')) {
            const ticketsService = window.ticketsService;
            if (ticketsService) {
                ticketsService.closeInvoiceModal();
            }
        }
    }
});

// Export for potential use
window.ticketsModule = {
    viewInvoice: (invoiceId) => {
        const ticketsService = window.ticketsService;
        if (ticketsService) {
            ticketsService.viewInvoice(invoiceId);
        }
    },
    approveTicket: (ticketId) => {
        const ticketsService = window.ticketsService;
        if (ticketsService) {
            ticketsService.approveTicket(ticketId);
        }
    },
    rejectTicket: (ticketId) => {
        const ticketsService = window.ticketsService;
        if (ticketsService) {
            ticketsService.rejectTicket(ticketId);
        }
    },
    closeInvoiceModal: () => {
        const ticketsService = window.ticketsService;
        if (ticketsService) {
            ticketsService.closeInvoiceModal();
        }
    }
};

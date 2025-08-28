// ===== INVOICE VIEW WITH DATABASE INTEGRATION =====
import { db } from './database.js'

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Invoice view page loaded');
    
    // Check if user is authenticated
    const currentUserStr = localStorage.getItem('current_user');
    if (!currentUserStr) {
        window.location.href = 'login.html';
        return;
    }
    
    // Get invoice ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    
    console.log('URL parameters:', window.location.search);
    console.log('Invoice ID from URL:', invoiceId);
    
    // Update invoice details based on ID
    if (invoiceId) {
        await updateInvoiceDetails(invoiceId);
    } else {
        console.log('No invoice ID found in URL');
        // Show default invoice or error message
        await showDefaultInvoice();
    }
});

// Function to update invoice details based on ID from database
async function updateInvoiceDetails(invoiceId) {
    console.log('Updating invoice details for ID:', invoiceId);
    
    try {
        // Get current user
        const currentUserStr = localStorage.getItem('current_user');
        const currentUser = JSON.parse(currentUserStr);
        
        // Get invoice from database
        const { data: invoice, error } = await db.supabase
            .from('invoices')
            .select(`
                *,
                branches!inner(name, address),
                products!inner(name, price)
            `)
            .eq('id', invoiceId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (error || !invoice) {
            console.error('Invoice not found:', invoiceId, error);
            showError('الفواتير غير موجودة');
            return;
        }
        
        console.log('Found invoice:', invoice);
        
        // Update invoice header
        document.getElementById('invoice-id').textContent = `#${invoice.id}`;
        document.getElementById('invoice-date').textContent = db.formatDate(invoice.timestamp);
        document.getElementById('invoice-branch').textContent = invoice.branches?.name || 'غير محدد';
        
        // Parse items from JSONB
        const items = invoice.items || [];
        
        // Update invoice items
        const itemsContainer = document.getElementById('invoice-items-list');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            
            if (items.length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6c757d;">
                        لا توجد منتجات في هذه الفاتورة
                    </div>
                `;
            } else {
                items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'invoice-item';
                    itemElement.innerHTML = `
                        <div class="item-product">${item.name || 'منتج غير محدد'}</div>
                        <div class="item-quantity">${item.quantity || 1}</div>
                        <div class="item-price">${db.formatCurrency(item.price || 0)}</div>
                        <div class="item-total">${db.formatCurrency((item.price || 0) * (item.quantity || 1))}</div>
                    `;
                    itemsContainer.appendChild(itemElement);
                });
            }
        }
        
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        const tax = subtotal * 0.15; // 15% VAT
        const total = subtotal + tax;
        
        // Update summary
        document.getElementById('subtotal').textContent = db.formatCurrency(subtotal);
        document.getElementById('tax').textContent = db.formatCurrency(tax);
        document.getElementById('total').textContent = db.formatCurrency(total);
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        showError('خطأ في تحميل الفاتورة');
    }
}

// Function to show default invoice
async function showDefaultInvoice() {
    console.log('Showing default invoice');
    
    try {
        // Get current user
        const currentUserStr = localStorage.getItem('current_user');
        const currentUser = JSON.parse(currentUserStr);
        
        // Get first invoice for current user
        const { data: invoices, error } = await db.supabase
            .from('invoices')
            .select('id')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error || !invoices || invoices.length === 0) {
            showError('لا توجد فواتير متاحة');
            return;
        }
        
        // Show the most recent invoice
        await updateInvoiceDetails(invoices[0].id);
        
    } catch (error) {
        console.error('Error loading default invoice:', error);
        showError('خطأ في تحميل الفاتورة الافتراضية');
    }
}

// Function to show error message
function showError(message) {
    const mainCard = document.querySelector('.main-card');
    if (mainCard) {
        mainCard.innerHTML = `
            <h2 class="page-title">خطأ</h2>
            <div style="text-align: center; padding: 40px;">
                <p style="font-size: 18px; color: #ef4444;">${message}</p>
                <button class="btn btn-back" onclick="history.back()" style="margin-top: 20px;">رجوع</button>
            </div>
        `;
    }
}

// Print invoice function
function printInvoice() {
    console.log('Printing invoice');
    
    // Hide the back button and actions for printing
    const nav = document.querySelector('.nav');
    const actions = document.querySelector('.invoice-actions');
    
    if (nav) nav.style.display = 'none';
    if (actions) actions.style.display = 'none';
    
    // Print the page
    window.print();
    
    // Show elements back after printing
    setTimeout(() => {
        if (nav) nav.style.display = 'flex';
        if (actions) actions.style.display = 'flex';
    }, 1000);
}

// Download PDF function
function downloadPDF() {
    console.log('Downloading PDF');
    
    // In a real application, this would generate and download a PDF
    // Here you would typically:
    // 1. Generate PDF using a library like jsPDF
    // 2. Create a download link
    // 3. Trigger the download
}

// Share invoice function
function shareInvoice() {
    console.log('Sharing invoice');
    
    // Get current invoice ID
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    
    if (navigator.share) {
        // Use Web Share API if available
        navigator.share({
            title: `فاتورة دكان فيجين #${invoiceId}`,
            text: `عرض فاتورة دكان فيجين رقم ${invoiceId}`,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        const shareUrl = window.location.href;
        navigator.clipboard.writeText(shareUrl).then(() => {
            console.log('تم نسخ رابط الفاتورة إلى الحافظة');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            console.log('تم نسخ رابط الفاتورة إلى الحافظة');
        });
    }
}

// Back button function
function goBack() {
    if (document.referrer) {
        window.history.back();
    } else {
        // Fallback: go to invoices management page
        window.location.href = 'invoices-management.html';
    }
}

// File complaint function
function fileComplaint() {
    console.log('Filing complaint');
    
    // Get current invoice ID and date
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    const invoiceDate = document.getElementById('invoice-date').textContent;
    
    // Redirect to complaint page with invoice data
    window.location.href = `complaint.html?id=${invoiceId}&date=${invoiceDate}`;
}

// Export functions for global access
window.printInvoice = printInvoice;
window.downloadPDF = downloadPDF;
window.shareInvoice = shareInvoice;
window.goBack = goBack;
window.fileComplaint = fileComplaint;

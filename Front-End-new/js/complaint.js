// Complaint Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Complaint page loaded');
    
    // Initialize form and load invoice data
    initializeComplaintForm();
    loadInvoiceData();
});

// Initialize complaint form functionality
function initializeComplaintForm() {
    const form = document.getElementById('complaintForm');
    if (form) {
        form.addEventListener('submit', handleComplaintSubmit);
    }
}

// Load invoice data from URL parameters
function loadInvoiceData() {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    const invoiceDate = urlParams.get('date');
    
    if (invoiceId) {
        document.getElementById('invoiceNumber').textContent = `#${invoiceId}`;
    }
    
    if (invoiceDate) {
        document.getElementById('invoiceDate').textContent = invoiceDate;
    }
    
    console.log('Invoice ID:', invoiceId, 'Date:', invoiceDate);
}

// Handle complaint form submission
function handleComplaintSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(event.target);
    const complaintData = {
        complaintType: formData.get('complaintType'),
        description: formData.get('description'),
        invoiceNumber: document.getElementById('invoiceNumber').textContent,
        invoiceDate: document.getElementById('invoiceDate').textContent,
        timestamp: new Date().toISOString(),
        id: generateComplaintId()
    };
    
    // Get user data from account
    const userData = getUserData();
    if (userData) {
        complaintData.name = userData.firstName + ' ' + userData.lastName;
        complaintData.phone = userData.phone;
        complaintData.email = userData.email;
    }
    
    // Validate form data
    if (!validateComplaintForm(complaintData)) {
        return;
    }
    
    // Save complaint
    saveComplaint(complaintData);
    
    // Show success message
    showMessage('تم إرسال شكواك بنجاح! سنتواصل معك قريباً.', 'success');
    
    // Clear form
    clearForm();
}

// Validate complaint form data
function validateComplaintForm(data) {
    if (!data.complaintType) {
        showMessage('يرجى اختيار نوع الشكوى', 'error');
        return false;
    }
    
    if (!data.description || data.description.trim().length < 10) {
        showMessage('يرجى كتابة شرح مفصل للشكوى (10 أحرف على الأقل)', 'error');
        return false;
    }
    
    return true;
}

// Get user data from account
function getUserData() {
    try {
        // Get user data from localStorage (from account page)
        const accountData = localStorage.getItem('accountData');
        if (accountData) {
            return JSON.parse(accountData);
        }
        
        // Fallback: return default user data
        return {
            firstName: 'مستخدم',
            lastName: 'دكان فيجين',
            phone: '0540231533',
            email: 'user@dukkanvision.com'
        };
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Generate unique complaint ID
function generateComplaintId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `COMP-${timestamp}-${random}`;
}

// Save complaint to localStorage (in real app, this would go to a database)
function saveComplaint(data) {
    try {
        // Get existing complaints
        let complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
        
        // Add new complaint
        complaints.push(data);
        
        // Save back to localStorage
        localStorage.setItem('complaints', JSON.stringify(complaints));
        
        console.log('Complaint saved:', data);
        
        // In a real application, you would send this data to your server
        // sendToServer(data);
        
    } catch (error) {
        console.error('Error saving complaint:', error);
        showMessage('حدث خطأ في حفظ الشكوى. يرجى المحاولة مرة أخرى.', 'error');
    }
}

// Send data to server (placeholder for real implementation)
function sendToServer(data) {
    // This would be replaced with actual API call
    console.log('Sending to server:', data);
    
    // Example API call:
    /*
    fetch('/api/complaints', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Success:', result);
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('حدث خطأ في إرسال الشكوى. يرجى المحاولة مرة أخرى.', 'error');
    });
    */
}

// Show message to user
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Insert message before form
    const form = document.getElementById('complaintForm');
    if (form) {
        form.parentNode.insertBefore(messageElement, form);
    }
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
}

// Clear form
function clearForm() {
    const form = document.getElementById('complaintForm');
    if (form) {
        form.reset();
    }
}

// Go back function
function goBack() {
    if (document.referrer) {
        window.history.back();
    } else {
        // Fallback: go to user page
        window.location.href = 'user.html';
    }
}

// Export functions for global access
window.clearForm = clearForm;
window.goBack = goBack;

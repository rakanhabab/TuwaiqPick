// User Dashboard - Simplified Version
const user = {
  init() {
    this.loadUserInfo();
    this.checkAuth();
    // QR functionality moved to standalone page (qr.html)
  },

  checkAuth() {
    const currentUser = localStorage.getItem('twq_current');
    if (!currentUser) {
      window.location.href = 'index.html';
    }
  },

  loadUserInfo() {
    const currentUser = JSON.parse(localStorage.getItem('twq_current') || '{}');
    const accNameEl = document.getElementById('accName');
    const accEmailEl = document.getElementById('accEmail');
    
    if (currentUser && currentUser.email) {
      const fullName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.email.split('@')[0];
      
      if (accNameEl) accNameEl.textContent = fullName;
      if (accEmailEl) accEmailEl.textContent = currentUser.email;
    }
  },

  initBarcodePages() {
    // Initialize barcode page functionality
    console.log('Barcode pages initialized');
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  user.init();
});

// Account dropdown functions
function toggleAccountMenu() {
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
    
    if (dropdown.classList.contains('active')) {
      generateDropdownQR();
      updateDropdownUserInfo();
    }
  }
}

function generateDropdownQR() {
  const qrContainer = document.getElementById('dropdownQR');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    
    const userId = '12345';
    new QRCode(qrContainer, {
      text: String(userId),
      width: 120,
      height: 120,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

function updateDropdownUserInfo() {
  const currentUser = JSON.parse(localStorage.getItem('twq_current') || '{}');
  const dropdownName = document.getElementById('dropdownName');
  const dropdownEmail = document.getElementById('dropdownEmail');
  
  if (currentUser && currentUser.email) {
    const fullName = currentUser.firstName && currentUser.lastName 
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser.email.split('@')[0];
    
    if (dropdownName) dropdownName.textContent = fullName;
    if (dropdownEmail) dropdownEmail.textContent = currentUser.email;
  }
}

function showAccountInfo() {
  alert('سيتم فتح صفحة معلومات الحساب قريباً');
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
  }
}

function logout() {
  localStorage.removeItem('twq_current');
  localStorage.removeItem('twq_is_admin');
  window.location.href = 'index.html';
}

// Barcode page functions
function showBarcodePage() {
  // Redirect to standalone QR page
  window.location.href = 'qr.html';
}

// Scan page handling now lives in qr.html

function showDashboard() {
  const dashboardPage = document.getElementById('page-dashboard');
  const barcodePage = document.getElementById('page-barcode');
  const scanPage = document.getElementById('page-barcode-scan');
  
  if (dashboardPage) {
    barcodePage?.classList.remove('active');
    scanPage?.classList.remove('active');
    dashboardPage.classList.add('active');
  }
}

function generateUserQR() {
  const qrContainer = document.getElementById('qr');
  if (qrContainer && window.QRCode) {
    qrContainer.innerHTML = '';
    
    const userId = '12345';
    new QRCode(qrContainer, {
      text: String(userId),
      width: 300,
      height: 300,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('accountDropdown');
  const accountBtn = document.querySelector('.account-btn');
  
  if (dropdown && !dropdown.contains(event.target) && !accountBtn.contains(event.target)) {
    dropdown.classList.remove('active');
  }
});

// Simple form handlers
function showSubpage(page) {
  alert(`سيتم فتح صفحة ${page} قريباً`);
} 
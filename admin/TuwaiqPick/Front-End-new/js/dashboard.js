// Dashboard Module - Simplified
window.dashboard = {
  // Initialize dashboard
  init() {
    this.loadUserInfo();
    this.loadKPIs();
    this.initBarcodePages();
  },

  // Load user info
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
    } else {
      if (accNameEl) accNameEl.textContent = 'مرحباً';
      if (accEmailEl) accEmailEl.textContent = '—';
    }
  },

  // Load KPIs
  loadKPIs() {
    const kpis = {
      visits: Math.floor(Math.random() * 200) + 50,
      spend: (Math.random() * 2000 + 500).toFixed(2),
      avg: (Math.random() * 100 + 30).toFixed(2),
      topBranch: 'الرياض - Two Pick'
    };

    const visitsEl = document.getElementById('kVisits');
    const spendEl = document.getElementById('kSpend');
    const avgEl = document.getElementById('kAvg');
    const topEl = document.getElementById('kTop');

    if (visitsEl) visitsEl.textContent = kpis.visits;
    if (spendEl) spendEl.textContent = `${kpis.spend} ر.س`;
    if (avgEl) avgEl.textContent = `${kpis.avg} ر.س`;
    if (topEl) topEl.textContent = kpis.topBranch;
  },

  // Initialize barcode pages
  initBarcodePages() {
    const simulateBtn = document.getElementById('simulateScan');
    const backDashBtn = document.getElementById('backDash');
    const backToDashboardBtn = document.getElementById('backToDashboard');

    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => this.showBarcodeScanPage());
    }
    if (backDashBtn) {
      backDashBtn.addEventListener('click', () => this.hideBarcodePage());
    }
    if (backToDashboardBtn) {
      backToDashboardBtn.addEventListener('click', () => this.hideBarcodeScanPage());
    }

    // Generate QR code when page is shown
    this.showUserQR('12345');
  },

  // Show barcode page
  showBarcodePage() {
    const dashboardPage = document.getElementById('page-dashboard');
    const barcodePage = document.getElementById('page-barcode');
    
    if (dashboardPage && barcodePage) {
      dashboardPage.classList.remove('active');
      barcodePage.classList.add('active');
      
      // Generate QR code when page is shown
      setTimeout(() => {
        this.showUserQR('12345');
      }, 100);
    }
  },

  // Hide barcode page
  hideBarcodePage() {
    const dashboardPage = document.getElementById('page-dashboard');
    const barcodePage = document.getElementById('page-barcode');
    
    if (dashboardPage && barcodePage) {
      barcodePage.classList.remove('active');
      dashboardPage.classList.add('active');
    }
  },

  // Show barcode scan page
  showBarcodeScanPage() {
    const barcodePage = document.getElementById('page-barcode');
    const barcodeScanPage = document.getElementById('page-barcode-scan');
    
    if (barcodePage && barcodeScanPage) {
      barcodePage.classList.remove('active');
      barcodeScanPage.classList.add('active');
    }
  },

  // Hide barcode scan page
  hideBarcodeScanPage() {
    const barcodePage = document.getElementById('page-barcode');
    const barcodeScanPage = document.getElementById('page-barcode-scan');
    
    if (barcodePage && barcodeScanPage) {
      barcodeScanPage.classList.remove('active');
      barcodePage.classList.add('active');
    }
  },

  // Show user QR code
  showUserQR(userId) {
    const container = document.getElementById('qr');
    if (!container) return;
    
    container.innerHTML = ''; // clear old

    // Create QR code directly
    new QRCode(container, {
      text: String(userId),
      width: 300,
      height: 300,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  dashboard.init();
});

// Update user info when switching to user dashboard
document.addEventListener('viewChanged', (e) => {
  if (e.detail.view === 'user') {
    dashboard.loadUserInfo();
  }
});

// Global function for barcode page
function showBarcodeScanPage() {
  if (window.dashboard && window.dashboard.showBarcodePage) {
    window.dashboard.showBarcodePage();
  }
}

// Global function to show user QR
function showUserQR(userId) {
  const container = document.getElementById('qr');
  if (!container) return;
  
  container.innerHTML = ''; // clear old

  // Create QR code directly
  new QRCode(container, {
    text: String(userId),
    width: 300,
    height: 300,
    colorDark: '#000000',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M
  });
}

// Barcode simulation functions
function simulateProductDetection() {
  const products = [
    { name: 'حليب طازج', price: 12.50, image: '🥛' },
    { name: 'خبز أبيض', price: 3.75, image: '🍞' },
    { name: 'تفاح أحمر', price: 8.90, image: '🍎' },
    { name: 'جبنة شيدر', price: 15.25, image: '🧀' }
  ];
  
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  addToCart(randomProduct);
  
  const cameraArea = document.querySelector('#page-barcode-scan .content .card > div > div:first-child');
  cameraArea.innerHTML = `
    <div style="width: 100%; height: 300px; background: #d4edda; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
      <div style="text-align: center; color: #155724;">
        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
        <div>تم اكتشاف المنتج!</div>
        <div style="font-size: 16px; margin-top: 5px;">${randomProduct.name}</div>
        <div style="font-size: 14px; margin-top: 5px;">${randomProduct.price} ر.س</div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    cameraArea.innerHTML = `
      <div style="width: 100%; height: 300px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <div style="text-align: center; color: #6c757d;">
          <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
          <div>امسح الباركود للمنتج</div>
          <div style="font-size: 14px; margin-top: 5px;">اضغط على زر المحاكاة</div>
        </div>
      </div>
    `;
  }, 2000);
}

function addToCart(product) {
  let cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  cart.push(product);
  localStorage.setItem('twq_cart', JSON.stringify(cart));
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cartItems');
  const cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  
  if (cartItems) {
    cartItems.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <span>${item.image} ${item.name}</span>
        <span>${item.price} ر.س</span>
        <button onclick="removeFromCart(${index})">❌</button>
      </div>
    `).join('');
  }
}

function removeFromCart(index) {
  let cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  cart.splice(index, 1);
  localStorage.setItem('twq_cart', JSON.stringify(cart));
  updateCartDisplay();
}

function completePurchase() {
  const cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  if (cart.length === 0) {
    alert('السلة فارغة!');
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const invoice = {
    id: Date.now(),
    items: cart,
    total: total,
    date: new Date().toLocaleDateString('ar-SA')
  };
  
  let invoices = JSON.parse(localStorage.getItem('twq_invoices') || '[]');
  invoices.push(invoice);
  localStorage.setItem('twq_invoices', JSON.stringify(invoices));
  localStorage.setItem('twq_cart', '[]');
  
  updateCartDisplay();
  alert(`تم إتمام الشراء! المجموع: ${total.toFixed(2)} ر.س`);
}

// Logout function
function logout() {
  if (confirm('هل تريد تسجيل الخروج؟')) {
    // Clear current user data
    localStorage.removeItem('twq_current');
    localStorage.removeItem('twq_current_index');
    localStorage.removeItem('twq_is_admin');

    // Switch to landing view
    if (window.auth) {
      window.auth.switchView('landing');
    }
  }
} 
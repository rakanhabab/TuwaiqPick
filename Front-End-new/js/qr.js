// QR/Barcode standalone logic

function ensureAuth() {
  const currentUser = localStorage.getItem('twq_current');
  if (!currentUser) {
    window.location.href = 'index.html';
  }
}

function showUserQR(userId) {
  const container = document.getElementById('qr');
  if (!container || !window.QRCode) return;
  container.innerHTML = '';
  new QRCode(container, {
    text: String(userId),
    width: 300,
    height: 300,
    colorDark: '#000000',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function simulateProductDetection() {
  const products = [
    { name: 'حليب طازج', price: 12.50, image: '🥛' },
    { name: 'خبز أبيض', price: 3.75, image: '🍞' },
    { name: 'تفاح أحمر', price: 8.90, image: '🍎' },
    { name: 'جبنة شيدر', price: 15.25, image: '🧀' }
  ];

  const randomProduct = products[Math.floor(Math.random() * products.length)];
  addToCart(randomProduct);

  const cameraArea = document.getElementById('cameraArea');
  if (!cameraArea) return;
  cameraArea.querySelector('.camera-placeholder').innerHTML = `
    <div style="width: 100%; height: 300px; background: #d4edda; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
      <div style="text-align: center; color: #155724;">
        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
        <div>تم اكتشاف المنتج!</div>
        <div style="font-size: 16px; margin-top: 5px;">${randomProduct.name}</div>
        <div style="font-size: 14px; margin-top: 5px;">${randomProduct.price} ر.س</div>
      </div>
    </div>
  `;

  setTimeout(() => {
    cameraArea.querySelector('.camera-placeholder').innerHTML = `
      <div style="text-align: center; color: #6c757d;">
        <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
        <div>امسح الباركود للمنتج</div>
        <div style="font-size: 14px; margin-top: 5px;">اضغط على زر المحاكاة</div>
      </div>
    `;
  }, 2000);
}

function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  cart.push(product);
  localStorage.setItem('twq_cart', JSON.stringify(cart));
  updateCartDisplay();
}

function removeFromCart(index) {
  const cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  cart.splice(index, 1);
  localStorage.setItem('twq_cart', JSON.stringify(cart));
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const cart = JSON.parse(localStorage.getItem('twq_cart') || '[]');
  if (!cartItems || !cartTotal) return;

  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="cart-empty"><div style="font-size: 24px; margin-bottom: 10px;">🛒</div><div>السلة فارغة</div><div style="font-size: 12px; margin-top: 5px;">سيتم إضافة المنتجات تلقائياً</div></div>';
    cartTotal.textContent = '0.00 ر.س';
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <span>${item.image} ${item.name}</span>
      <span>${item.price} ر.س</span>
      <button onclick="removeFromCart(${index})">❌</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotal.textContent = `${total.toFixed(2)} ر.س`;
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

  const invoices = JSON.parse(localStorage.getItem('twq_invoices') || '[]');
  invoices.push(invoice);
  localStorage.setItem('twq_invoices', JSON.stringify(invoices));
  localStorage.setItem('twq_cart', '[]');
  updateCartDisplay();
  alert(`تم إتمام الشراء! المجموع: ${total.toFixed(2)} ر.س`);
}

function navigateToScan() {
  const barcodePage = document.getElementById('page-barcode');
  const scanPage = document.getElementById('page-barcode-scan');
  if (barcodePage && scanPage) {
    barcodePage.classList.remove('active');
    scanPage.classList.add('active');
  }
}

function navigateToBarcode() {
  const barcodePage = document.getElementById('page-barcode');
  const scanPage = document.getElementById('page-barcode-scan');
  if (barcodePage && scanPage) {
    scanPage.classList.remove('active');
    barcodePage.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureAuth();

  // Generate user QR on load
  showUserQR('12345');

  // Buttons
  const simulateBtn = document.getElementById('simulateScan');
  const backDashBtn = document.getElementById('backDash');
  const backToDashboardBtn = document.getElementById('backToDashboard');
  const simulateProductBtn = document.getElementById('simulateProduct');
  const completeBtn = document.getElementById('completePurchase');

  if (simulateBtn) simulateBtn.addEventListener('click', navigateToScan);
  if (backDashBtn) backDashBtn.addEventListener('click', () => window.location.href = 'user.html');
  if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', navigateToBarcode);
  if (simulateProductBtn) simulateProductBtn.addEventListener('click', simulateProductDetection);
  if (completeBtn) completeBtn.addEventListener('click', completePurchase);

  updateCartDisplay();
});



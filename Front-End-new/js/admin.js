// Admin Dashboard Module
const admin = {
  // Initialize admin dashboard
  init() {
    this.checkAuth();
    this.loadAdminInfo();
    this.loadAdminKPIs();
    this.initAdminMap();
    this.bindEvents();
  },

  // Check if user is admin
  checkAuth() {
    const isAdmin = localStorage.getItem('twq_is_admin');
    if (!isAdmin || isAdmin !== '1') {
      // Redirect to main page if not admin
      window.location.href = 'index.html';
    }
  },

  // Load admin info
  loadAdminInfo() {
    const adminNameEl = document.getElementById('adminName');
    const adminEmailEl = document.getElementById('adminEmail');
    
    if (adminNameEl) adminNameEl.textContent = 'مدير النظام';
    if (adminEmailEl) adminEmailEl.textContent = 'admin@dukkanvision.com';
  },

  // Load admin KPIs
  loadAdminKPIs() {
    const kpis = {
      visits: Math.floor(Math.random() * 1000) + 500,
      profit: (Math.random() * 50000 + 10000).toFixed(2),
      avg: (Math.random() * 200 + 50).toFixed(2),
      topBranch: 'فرع النرجس - الرياض'
    };

    const visitsEl = document.getElementById('aVisits');
    const profitEl = document.getElementById('aProfit');
    const avgEl = document.getElementById('aAvg');
    const topEl = document.getElementById('aTop');

    if (visitsEl) visitsEl.textContent = kpis.visits.toLocaleString();
    if (profitEl) profitEl.textContent = `${kpis.profit} ر.س`;
    if (avgEl) avgEl.textContent = `${kpis.avg} ر.س`;
    if (topEl) topEl.textContent = kpis.topBranch;
  },

  // Initialize admin map
  initAdminMap() {
    const mapContainer = document.getElementById('adminMap');
    if (mapContainer && window.L) {
      const map = L.map('adminMap').setView([24.7136, 46.6753], 6); // Saudi Arabia center

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Leaflet | © OpenStreetMap'
      }).addTo(map);

      // Add branch markers
      const branches = [
        { name: 'فرع النرجس', lat: 24.7136, lng: 46.6753, address: 'شارع التحلية. الرياض', visits: 245 },
        { name: 'فرع العليا', lat: 24.7136, lng: 46.6753, address: 'شارع الملك فهد الرياض', visits: 189 },
        { name: 'فرع الخبر', lat: 26.4207, lng: 50.0888, address: 'شارع الملك عبدالله. الخبر', visits: 156 },
        { name: 'فرع جدة', lat: 21.4858, lng: 39.1925, address: 'شارع التحلية. جدة', visits: 203 }
      ];

      branches.forEach(branch => {
        const marker = L.marker([branch.lat, branch.lng]).addTo(map);
        marker.bindPopup(`
          <div style="text-align: center;">
            <h4>${branch.name}</h4>
            <p>${branch.address}</p>
            <p><strong>الزيارات:</strong> ${branch.visits}</p>
          </div>
        `);
      });
    }
  },

  // Bind admin events
  bindEvents() {
    // Refresh KPIs button
    const refreshBtn = document.getElementById('refreshAdminKpis');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadAdminKPIs();
        alert('تم تحديث البيانات!');
      });
    }

    // Stock search form
    const stockForm = document.getElementById('adminStockForm');
    if (stockForm) {
      stockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleStockSearch();
      });
    }

    // Admin action buttons
    const manageProductsBtn = document.getElementById('adminManageProducts');
    const manageBranchesBtn = document.getElementById('adminManageBranches');
    const complaintsBtn = document.getElementById('adminComplaints');

    if (manageProductsBtn) {
      manageProductsBtn.addEventListener('click', () => this.manageProducts());
    }
    if (manageBranchesBtn) {
      manageBranchesBtn.addEventListener('click', () => this.manageBranches());
    }
    if (complaintsBtn) {
      complaintsBtn.addEventListener('click', () => this.viewComplaints());
    }
  },

  // Handle stock search
  handleStockSearch() {
    const query = document.getElementById('adminStockQuery')?.value?.trim();
    const resultEl = document.getElementById('adminStockResult');
    
    if (!query) {
      if (resultEl) resultEl.textContent = 'يرجى إدخال اسم المنتج';
      return;
    }

    // Simulate stock search
    const products = [
      { name: 'حليب طازج', stock: 45, price: 12.50 },
      { name: 'خبز أبيض', stock: 120, price: 3.75 },
      { name: 'تفاح أحمر', stock: 67, price: 8.90 },
      { name: 'جبنة شيدر', stock: 23, price: 15.25 }
    ];

    const foundProducts = products.filter(product => 
      product.name.includes(query) || query.includes(product.name)
    );

    if (resultEl) {
      if (foundProducts.length > 0) {
        resultEl.innerHTML = foundProducts.map(product => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span>${product.name}</span>
            <span>المخزون: ${product.stock}</span>
            <span>${product.price} ر.س</span>
          </div>
        `).join('');
      } else {
        resultEl.textContent = 'لم يتم العثور على المنتج';
      }
    }
  },

  // Admin action functions
  manageProducts() {
    alert('سيتم فتح صفحة إدارة المنتجات قريباً');
  },

  manageBranches() {
    alert('سيتم فتح صفحة إدارة الفروع قريباً');
  },

  viewComplaints() {
    alert('سيتم فتح صفحة الشكاوي قريباً');
  }
};

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  admin.init();
});

// Global admin functions
function adminLogout() {
  if (confirm('هل تريد تسجيل الخروج من لوحة الإدارة؟')) {
    localStorage.removeItem('twq_is_admin');
    window.location.href = 'index.html';
  }
}

function showSubpage(page) {
  console.log('Showing subpage:', page);
  alert(`سيتم فتح صفحة ${page} قريباً`);
}

// Quick action functions
function addSampleData() {
  if (confirm('هل تريد إضافة بيانات تجريبية؟')) {
    // Add sample data to localStorage
    const sampleUsers = [
      { firstName: 'أحمد', lastName: 'محمد', email: 'ahmed@example.com' },
      { firstName: 'فاطمة', lastName: 'علي', email: 'fatima@example.com' },
      { firstName: 'خالد', lastName: 'عبدالله', email: 'khalid@example.com' }
    ];

    const sampleInvoices = [
      { id: 1001, amount: 45.60, date: '2025-01-15' },
      { id: 1002, amount: 23.40, date: '2025-01-14' },
      { id: 1003, amount: 67.80, date: '2025-01-13' }
    ];

    localStorage.setItem('twq_users', JSON.stringify(sampleUsers));
    localStorage.setItem('twq_invoices', JSON.stringify(sampleInvoices));
    
    alert('تم إضافة البيانات التجريبية بنجاح!');
    admin.loadAdminKPIs();
  }
}

function clearAllData() {
  if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
    // Clear all data except admin
    localStorage.removeItem('twq_users');
    localStorage.removeItem('twq_invoices');
    localStorage.removeItem('twq_cart');
    localStorage.removeItem('twq_current');
    localStorage.removeItem('twq_current_index');
    
    alert('تم مسح جميع البيانات بنجاح!');
    admin.loadAdminKPIs();
  }
}

function exportData() {
  // Collect all data
  const data = {
    users: JSON.parse(localStorage.getItem('twq_users') || '[]'),
    invoices: JSON.parse(localStorage.getItem('twq_invoices') || '[]'),
    timestamp: new Date().toISOString()
  };

  // Create download link
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `dukkan_vision_data_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  alert('تم تصدير البيانات بنجاح!');
}

function generateReport() {
  const users = JSON.parse(localStorage.getItem('twq_users') || '[]');
  const invoices = JSON.parse(localStorage.getItem('twq_invoices') || '[]');
  
  const report = {
    totalUsers: users.length,
    totalInvoices: invoices.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    averageInvoice: invoices.length > 0 ? (invoices.reduce((sum, inv) => sum + inv.amount, 0) / invoices.length).toFixed(2) : 0,
    generatedAt: new Date().toLocaleString('ar-SA')
  };

  const reportText = `
تقرير دكان فيجين
================

إجمالي المستخدمين: ${report.totalUsers}
إجمالي الفواتير: ${report.totalInvoices}
إجمالي الإيرادات: ${report.totalRevenue} ر.س
متوسط الفاتورة: ${report.averageInvoice} ر.س

تاريخ التقرير: ${report.generatedAt}
  `;

  // Create download link for report
  const dataBlob = new Blob([reportText], { type: 'text/plain' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `dukkan_vision_report_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  alert('تم إنشاء التقرير بنجاح!');
} 
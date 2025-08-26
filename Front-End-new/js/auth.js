// Authentication Module
const auth = {
  init() {
    this.checkAuthStatus();
  },

  checkAuthStatus() {
    const currentUser = localStorage.getItem('twq_current');
    const isAdmin = localStorage.getItem('twq_is_admin');

    if (currentUser) {
      if (isAdmin === '1') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'user.html';
      }
    }
  },

  handleLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value?.trim();
    
    if (!email || !password) {
      alert('يرجى ملء جميع الحقول');
      return;
    }
    
    const users = JSON.parse(localStorage.getItem('twq_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      if (user.email === '123' && password === '123') {
        localStorage.setItem('twq_is_admin', '1');
        localStorage.setItem('twq_current', JSON.stringify(user));
        window.location.href = 'admin.html';
        return;
      }
      localStorage.setItem('twq_current', JSON.stringify(user));
      localStorage.setItem('twq_current_index', users.indexOf(user).toString());
      localStorage.removeItem('twq_is_admin');
      window.location.href = 'user.html';
    } else {
      alert('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  },

  handleSignup() {
    const firstName = document.getElementById('signupFirst')?.value?.trim();
    const lastName = document.getElementById('signupLast')?.value?.trim();
    const email = document.getElementById('signupEmail')?.value?.trim();
    const password = document.getElementById('signupPassword')?.value?.trim();
    const confirmPassword = document.getElementById('signupConfirm')?.value?.trim();
    const agreeTerms = document.getElementById('agreeTerms')?.checked;
    
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      alert('يرجى ملء جميع الحقول');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('كلمة المرور غير متطابقة');
      return;
    }
    
    if (!agreeTerms) {
      alert('يجب الموافقة على الشروط والأحكام');
      return;
    }
    
    const users = JSON.parse(localStorage.getItem('twq_users') || '[]');
    
    if (users.find(u => u.email === email)) {
      alert('البريد الإلكتروني مستخدم بالفعل');
      return;
    }
    
    const newUser = {
      firstName,
      lastName,
      email,
      password,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('twq_users', JSON.stringify(users));
    localStorage.setItem('twq_current', JSON.stringify(newUser));
    localStorage.setItem('twq_current_index', (users.length - 1).toString());
    localStorage.removeItem('twq_is_admin');
    
    alert('تم إنشاء الحساب بنجاح!');
    window.location.href = 'user.html';
  },

  logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      localStorage.removeItem('twq_current');
      localStorage.removeItem('twq_current_index');
      localStorage.removeItem('twq_is_admin');
      window.location.href = 'index.html';
    }
  }
};

// Global functions for HTML onclick handlers
function logout() {
  auth.logout();
}

// Admin backdoor for testing
function adminLogin() {
  const adminUser = {
    firstName: 'مدير',
    lastName: 'النظام',
    email: 'admin@dukkanvision.com',
    password: 'admin123'
  };
  localStorage.setItem('twq_is_admin', '1');
  localStorage.setItem('twq_current', JSON.stringify(adminUser));
  window.location.href = 'admin.html';
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  auth.init();
}); 
// ===== USER PAGE JAVASCRIPT WITH DATABASE INTEGRATION =====
import { db } from './database.js'

// Page content for language toggle
const pageContent = {
    ar: {
        title: "صفحة المستخدم",
        welcome: "مرحباً بك في صفحة المستخدم",
        description: "هذه صفحة المستخدم لتصميم دكان فيجين. يمكنك إضافة المحتوى الخاص بك هنا.",
        statsTitle: "إحصائيات المستخدم",
        contentTitle: "قسم المحتوى",
        contentText: "أضف المحتوى الخاص بك في هذا القسم."
    },
    en: {
        title: "User Page",
        welcome: "Welcome to the User Page",
        description: "This is the user page for Dukkan Vision design. You can add your content here.",
        statsTitle: "User Statistics",
        contentTitle: "Content Section",
        contentText: "Add your content in this section."
    }
};

// User account data (will be loaded from database)
let userAccount = {
    name: "",
    email: "",
    phone: "",
    balance: "0.00 ر.س",
    lastLogin: ""
};

// Current user data
let currentUser = null;

// Initialize page
async function initializePage() {
    try {
        // Check if user is logged in
        const isLoggedIn = await checkUserLogin();
        if (!isLoggedIn) {
            window.location.href = 'login.html';
            return;
        }

        // Load all user data
        await Promise.all([
            loadUserDataFromDatabase(),
            loadUserKPIsFromDatabase(),
            loadInvoicesFromDatabase(),
            loadPaymentMethodsFromDatabase()
        ]);
        
        // Setup UI components
        setupSmoothScrolling();
        setupAnimations();
        setupMap();
        setupSparklines();
        setupAccountDropdown();
        setupQRCode();
        setupContactForm();
        setupProductSearch();
        setupInvoices();
        setupChat();
        
        console.log('✅ User page initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing user page:', error);
        showErrorMessage('حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.');
    }
}

// Check if user is logged in
async function checkUserLogin() {
    const currentUserStr = localStorage.getItem('current_user');
    if (!currentUserStr) {
        return false;
    }

    try {
        currentUser = JSON.parse(currentUserStr);
        return currentUser && currentUser.id;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return false;
    }
}

// Load user data from database
async function loadUserDataFromDatabase() {
    try {
        if (!currentUser) {
            throw new Error('No current user found');
        }

        // Get fresh user data from database
        const { data: user, error } = await db.supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error || !user) {
            console.error('Error fetching user data:', error);
            throw new Error('User not found in database');
        }

        // Update current user with fresh data
        currentUser = { ...currentUser, ...user };
        localStorage.setItem('current_user', JSON.stringify(currentUser));

        displayUserInfo(user);
        console.log('✅ User data loaded successfully');
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showErrorMessage('فشل في تحميل بيانات المستخدم');
    }
}

// Load user KPIs from database
async function loadUserKPIsFromDatabase() {
    try {
        if (!currentUser) return;

        // Get user data and invoices from database
        const [userData, invoices] = await Promise.all([
            db.supabase.from('users').select('num_visits, owed_balance').eq('id', currentUser.id).single(),
            db.supabase.from('invoices').select('total_amount, branch_id, timestamp, branch_num').eq('user_id', currentUser.id)
        ]);

        if (userData.error) {
            console.error('Error fetching user data:', userData.error);
            return;
        }

        if (invoices.error) {
            console.error('Error fetching invoices:', invoices.error);
            return;
        }

        // Calculate KPIs from real data
        const visits = userData.data?.num_visits || 0;
        const totalSpend = invoices.data?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;
        const avgInvoice = invoices.data?.length > 0 ? totalSpend / invoices.data.length : 0;

        // Find most visited branch
        const branchVisits = {};
        invoices.data?.forEach(invoice => {
            if (invoice.branch_id) {
                branchVisits[invoice.branch_id] = (branchVisits[invoice.branch_id] || 0) + 1;
            }
        });

        let mostVisitedBranch = 'غير محدد';
        let maxVisits = 0;
        for (const [branchId, visits] of Object.entries(branchVisits)) {
            if (visits > maxVisits) {
                maxVisits = visits;
                mostVisitedBranch = branchId;
            }
        }

        // Get branch name if we have a most visited branch
        if (mostVisitedBranch !== 'غير محدد') {
            const { data: branch } = await db.supabase
                .from('branches')
                .select('name')
                .eq('id', mostVisitedBranch)
                .single();
            
            if (branch) {
                mostVisitedBranch = branch.name;
            }
        }

        // Update KPI elements
        updateKPIElements({
            visits: visits,
            totalSpend: totalSpend,
            avgInvoice: avgInvoice,
            mostVisitedBranch: mostVisitedBranch
        });

        console.log('✅ User KPIs loaded successfully');
        
    } catch (error) {
        console.error('Error loading user KPIs:', error);
        // Set default values on error
        updateKPIElements({
            visits: 0,
            totalSpend: 0,
            avgInvoice: 0,
            mostVisitedBranch: 'غير محدد'
        });
    }
}

// Update KPI elements with real data
function updateKPIElements(kpis) {
    const spendEl = document.getElementById('kSpend');
    const visitsEl = document.getElementById('kVisits');
    const avgEl = document.getElementById('kAvg');
    const topEl = document.getElementById('kTop');

    if (spendEl) spendEl.textContent = db.formatCurrency(kpis.totalSpend);
    if (visitsEl) visitsEl.textContent = kpis.visits;
    if (avgEl) avgEl.textContent = db.formatCurrency(kpis.avgInvoice);
    if (topEl) topEl.textContent = kpis.mostVisitedBranch;

    // Add animation to show data is loaded
    [spendEl, visitsEl, avgEl, topEl].forEach(el => {
        if (el) {
            el.style.animation = 'fadeInUp 0.5s ease-out';
        }
    });
}

// Display user information
function displayUserInfo(user) {
    // Update user info in dropdown
    const userNameElement = document.getElementById('dropdownName');
    const userEmailElement = document.getElementById('dropdownEmail');
    
    if (userNameElement) {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        userNameElement.textContent = fullName || 'مستخدم';
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = user.email || '';
    }

    // Update user account data
    userAccount = {
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: user.phone || '',
        balance: db.formatCurrency(user.owed_balance || 0),
        lastLogin: new Date().toLocaleDateString('ar-SA')
    };
}

// Load invoices from database
async function loadInvoicesFromDatabase() {
    try {
        if (!currentUser) return;

        // Get invoices for current user with branch information
        const { data: invoices, error } = await db.supabase
            .from('invoices')
            .select(`
                *,
                branches(name, address, lat, long)
            `)
            .eq('user_id', currentUser.id)
            .order('timestamp', { ascending: false })
            .limit(5); // Limit to latest 5 invoices

        if (error) {
            console.error('Error loading invoices:', error);
            return;
        }

        displayInvoices(invoices || []);
        console.log('✅ Invoices loaded successfully');
        
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

// Display invoices for user.html page
function displayInvoices(invoices) {
    const invoicesList = document.getElementById('invoicesList');
    if (!invoicesList) return;
    
    if (invoices.length === 0) {
        invoicesList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
                <div>لا توجد فواتير حتى الآن</div>
                <div style="font-size: 12px; margin-top: 5px;">ستظهر فواتيرك هنا بعد الشراء</div>
            </div>
        `;
        return;
    }
    
    // Show only the latest 3 invoices
    const recentInvoices = invoices.slice(0, 3);
    
    invoicesList.innerHTML = recentInvoices.map(invoice => `
        <div class="invoice-item" style="animation: fadeInUp 0.5s ease-out;">
            <div class="invoice-info">
                <div class="invoice-id">#${invoice.id.slice(0, 8)}</div>
                <div class="invoice-date">${db.formatDate(invoice.timestamp)}</div>
                ${invoice.branches ? `<div class="invoice-branch" style="font-size: 12px; color: #8b5cf6;">${invoice.branches.name}</div>` : ''}
            </div>
            <div class="invoice-amount">${db.formatCurrency(invoice.total_amount)}</div>
            <button class="btn btn-purple btn-sm" onclick="window.location.href='invoice-view.html?id=${invoice.id}'">استعراض</button>
        </div>
    `).join('');
}

// Get status text in Arabic
function getStatusText(status) {
    const statusMap = {
        'pending': 'في الانتظار',
        'paid': 'مدفوع',
        'cancelled': 'ملغي',
        'refunded': 'مسترد'
    };
    return statusMap[status] || status;
}

// Load payment methods from database
async function loadPaymentMethodsFromDatabase() {
    try {
        if (!currentUser) return;

        // Get payment methods for current user
        const { data: paymentMethods, error } = await db.supabase
            .from('payment_methods')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_deleted', false)
            .order('is_default', { ascending: false });

        if (error) {
            console.error('Error loading payment methods:', error);
            return;
        }

        displayPaymentMethods(paymentMethods || []);
        console.log('✅ Payment methods loaded successfully');
        
    } catch (error) {
        console.error('Error loading payment methods:', error);
    }
}

// Display payment methods
function displayPaymentMethods(methods) {
    const methodsContainer = document.getElementById('payment-methods-container');
    if (!methodsContainer) return;
    
    if (methods.length === 0) {
        methodsContainer.innerHTML = '<p class="no-data">لا توجد طرق دفع محفوظة</p>';
        return;
    }
    
    methodsContainer.innerHTML = methods.map(method => `
        <div class="payment-method-card" style="animation: fadeInUp 0.5s ease-out;">
            <div class="card-info">
                <h4>**** **** **** ${method.card_number.slice(-4)}</h4>
                <p>${method.card_holder_name}</p>
                <p>${method.expiry_month}/${method.expiry_year}</p>
            </div>
            <div class="card-actions">
                ${method.is_default ? '<span class="default-badge">افتراضي</span>' : ''}
                <button onclick="deletePaymentMethod('${method.id}')">حذف</button>
            </div>
        </div>
    `).join('');
}

// Setup map with real branch data
async function setupMap() {
    if (typeof L !== 'undefined' && document.getElementById('map')) {
        try {
            const branches = await db.getBranches();
            const map = L.map('map').setView([24.7136, 46.6753], 6); // Saudi Arabia center
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add markers for real branches
            branches.forEach(branch => {
                if (branch.lat && branch.long) {
                    L.marker([branch.lat, branch.long])
                        .addTo(map)
                        .bindPopup(branch.name);
                }
            });
            
            console.log('✅ Map setup successfully');
        } catch (error) {
            console.error('Error setting up map:', error);
        }
    }
}

// Setup sparklines with real data
async function setupSparklines() {
    try {
        if (!currentUser) return;

        // Get invoice data for sparklines
        const { data: invoices } = await db.supabase
            .from('invoices')
            .select('total_amount, timestamp')
            .eq('user_id', currentUser.id)
            .order('timestamp', { ascending: true });

        if (!invoices || invoices.length === 0) {
            // Use default data if no invoices
            drawDefaultSparklines();
            return;
        }

        // Generate sparkline data from real invoices
        const monthlyData = {};
        invoices.forEach(invoice => {
            const month = new Date(invoice.timestamp).getMonth();
            monthlyData[month] = (monthlyData[month] || 0) + invoice.total_amount;
        });

        // Convert to array for sparklines
        const spendData = Array.from({ length: 12 }, (_, i) => monthlyData[i] || 0);
        const visitsData = Array.from({ length: 12 }, (_, i) => 
            invoices.filter(inv => new Date(inv.timestamp).getMonth() === i).length
        );

        // Draw sparklines
        drawSparkline(document.getElementById('sparkSpend'), spendData);
        drawSparkline(document.getElementById('sparkVisits'), visitsData);
        drawSparkline(document.getElementById('sparkTop'), visitsData); // Use visits data for top branch
        drawSparkline(document.getElementById('sparkAvg'), spendData.map((spend, i) => 
            visitsData[i] > 0 ? spend / visitsData[i] : 0
        ));

        console.log('✅ Sparklines setup successfully');
        
    } catch (error) {
        console.error('Error setting up sparklines:', error);
        drawDefaultSparklines();
    }
}

// Draw default sparklines
function drawDefaultSparklines() {
    const sparklineData = {
        spend: [65, 59, 80, 81, 56, 55, 40, 45, 60, 70, 75, 80],
        visits: [28, 48, 40, 19, 86, 27, 90, 45, 60, 70, 75, 80],
        top: [45, 55, 65, 75, 85, 95, 85, 75, 65, 55, 45, 35],
        avg: [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85]
    };

    Object.keys(sparklineData).forEach(key => {
        const canvas = document.getElementById(`spark${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (canvas) {
            drawSparkline(canvas, sparklineData[key]);
        }
    });
}

// Draw sparkline
function drawSparkline(canvas, data) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) return;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
}

// Setup account dropdown
function setupAccountDropdown() {
    const accountBtn = document.querySelector('.account-btn');
    const dropdown = document.getElementById('accountDropdown');
    
    if (accountBtn && dropdown) {
        accountBtn.addEventListener('click', () => {
            dropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!accountBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }
}

// Setup QR code
function setupQRCode() {
    const qrContainer = document.getElementById('dropdownQR');
    if (qrContainer && typeof QRCode !== 'undefined' && currentUser) {
        // Generate QR code with user ID
        const qrText = `DukkanVision_User_${currentUser.id}`;
        new QRCode(qrContainer, {
            text: qrText,
            width: 80,
            height: 80,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

// Setup contact form
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('contactName').value;
            const phone = document.getElementById('contactPhone').value;
            const message = document.getElementById('contactMessage').value;
            
            try {
                // Create support ticket
                const ticketData = {
                    user_id: currentUser.id,
                    subject: `رسالة دعم من ${name}`,
                    message: message,
                    contact_phone: phone,
                    status: 'open'
                };

                const { data: ticket, error } = await db.supabase
                    .from('tickets')
                    .insert([ticketData])
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                showSuccessMessage('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.');
                form.reset();
                
            } catch (error) {
                console.error('Error creating support ticket:', error);
                showErrorMessage('فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى.');
            }
        });
    }
}

// Setup product search
function setupProductSearch() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
}

// Setup invoices
function setupInvoices() {
    // This function is no longer needed as we're using direct links
    // The invoice buttons now use onclick="window.location.href='invoice.html?id=X'"
}

// Setup chat functionality
function setupChat() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');

    function addMessage(text, type) {
        if (!chatMessages) return;
        const messageDiv = document.createElement('div');
        const messageId = Date.now();
        messageDiv.id = `msg-${messageId}`;
        messageDiv.className = `msg msg-${type}`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageId;
    }

    function removeMessage(messageId) {
        const messageDiv = document.getElementById(`msg-${messageId}`);
        if (messageDiv) {
            messageDiv.remove();
        }
    }

    async function handleSend() {
        const query = (chatInput?.value || '').trim();
        if (!query) return;
        
        // Add user message
        addMessage(query, 'user');
        if (chatInput) chatInput.value = '';

        try {
            // Show loading message
            const loadingId = addMessage('جاري البحث عن إجابة...', 'bot');
            
            // Get user name from multiple possible sources
            let userName = 'مستخدم';
            if (currentUser) {
                if (currentUser.first_name && currentUser.first_name.trim()) {
                    userName = currentUser.first_name.trim();
                } else if (currentUser.name && currentUser.name.trim()) {
                    userName = currentUser.name.trim();
                } else if (currentUser.email && currentUser.email.includes('@')) {
                    const emailName = currentUser.email.split('@')[0];
                    if (emailName && emailName.trim()) {
                        userName = emailName.trim();
                    }
                }
            }
            
            console.log('Sending request to RAG API:', {
                question: query,
                user_id: currentUser?.id || null,
                user_name: userName
            });
            
            // Call RAG API
            const response = await fetch('http://localhost:8001/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({
                    question: query,
                    user_id: currentUser?.id || null,
                    user_name: userName
                })
            });
            
            // Remove loading message
            removeMessage(loadingId);

            if (response.ok) {
                const result = await response.json();
                console.log('RAG API response:', result);
                addMessage(result.answer, 'bot');
            } else {
                const errorText = await response.text();
                console.error('RAG API error:', response.status, response.statusText);
                console.error('Error details:', errorText);
                addMessage(`عذراً، حدث خطأ في الاتصال (${response.status}). تأكد من أن الخادم يعمل على المنفذ 8001.`, 'bot');
            }
        } catch (error) {
            console.error('Error calling RAG API:', error);
            addMessage('عذراً، حدث خطأ في الاتصال. تأكد من أن الخادم يعمل على المنفذ 8001.', 'bot');
        }
    }

    function handleClear() {
        if (chatMessages) {
            chatMessages.innerHTML = '<div class="msg msg-bot">مرحباً، أنا صديق 👋، مساعدك الذكي في دكان فجن، كيف أقدر أساعدك اليوم؟</div>';
        }
    }

    // Add event listeners
    if (sendMessageBtn) sendMessageBtn.addEventListener('click', handleSend);
    if (clearChatBtn) clearChatBtn.addEventListener('click', handleClear);
    
    if (chatInput) {
        // Auto-resize height to fit content
        const autoResize = () => {
            if (chatInput) {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            }
        };
        ['input','change'].forEach(evt => chatInput.addEventListener(evt, autoResize));
        autoResize();

        // Allow Enter key to send message
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
                autoResize();
            }
        });
    }

    console.log('✅ Chat functionality setup successfully');
}

// Setup smooth scrolling
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Setup animations
function setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    });

    document.querySelectorAll('.stat-card, .content-section, .card').forEach(el => {
        observer.observe(el);
    });
}

// Utility functions
function showSuccessMessage(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showErrorMessage(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Global functions
function toggleAccountMenu() {
    const dropdown = document.getElementById('accountDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function showAccountInfo() {
    const modal = document.createElement('div');
    modal.className = 'account-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>معلومات الحساب</h3>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="account-info">
                    <div class="info-item">
                        <span class="label">الاسم:</span>
                        <span class="value">${userAccount.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">البريد الإلكتروني:</span>
                        <span class="value">${userAccount.email}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">رقم الهاتف:</span>
                        <span class="value">${userAccount.phone}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">الرصيد:</span>
                        <span class="value balance">${userAccount.balance}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">آخر تسجيل دخول:</span>
                        <span class="value">${userAccount.lastLogin}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal() {
    const modal = document.querySelector('.account-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function logoutUser() {
    // Clear user data from localStorage
    localStorage.removeItem('current_user');
    localStorage.removeItem('twq_cart');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const navHeight = document.querySelector('.nav').offsetHeight;
        const sectionTop = section.offsetTop;
        const targetPosition = sectionTop - navHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Test connection to RAG API
async function testRAGConnection() {
    try {
        console.log('Testing RAG API connection...');
        const response = await fetch('http://localhost:8001/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ RAG API is running:', data);
            return true;
        } else {
            console.error('❌ RAG API is not responding properly');
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to RAG API:', error);
        return false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing user page...');
    
    // Test RAG API connection first
    const isConnected = await testRAGConnection();
    if (!isConnected) {
        console.warn('⚠️ RAG API is not available. Chat functionality may not work.');
        // Add a warning message to the chat
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            const warningMsg = document.createElement('div');
            warningMsg.className = 'msg msg-bot';
            warningMsg.textContent = '⚠️ تحذير: خادم المساعد غير متصل. يرجى تشغيل الخادم أولاً.';
            chatMessages.appendChild(warningMsg);
        }
    }
    
    // Initialize the page
    await initializePage();
});

// Export functions for global access
window.toggleAccountMenu = toggleAccountMenu;
window.showAccountInfo = showAccountInfo;
window.closeModal = closeModal;
window.logoutUser = logoutUser;
window.scrollToSection = scrollToSection;


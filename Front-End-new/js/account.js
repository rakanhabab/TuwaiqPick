import { db } from './database.js';

class AccountService {
    constructor() {
        this.form = document.getElementById('accountForm');
        this.saveBtn = document.getElementById('saveBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.applyBtn = document.getElementById('applyBtn');
        this.inputs = Array.from(this.form.querySelectorAll('input'));
        this.userData = null;
        this.isEditing = false;
        
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.setEditing(false);
    }

    async loadUserData() {
        try {
            this.userData = await db.getCurrentUser();
            
            if (!this.userData) {
                // If user doesn't exist, create a default user
                this.userData = await db.createUser({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    city: '',
                    birthdate: null
                });
            }

            this.populateForm();
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('خطأ في تحميل بيانات المستخدم', 'error');
        }
    }

    populateForm() {
        if (!this.userData) return;

        const fieldMappings = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'email': 'email',
            'phone': 'phone',
            'city': 'city',
            'birthdate': 'birthdate'
        };

        for (const [formField, dbField] of Object.entries(fieldMappings)) {
            const element = document.getElementById(formField);
            if (element && this.userData[dbField]) {
                element.value = this.userData[dbField];
            }
        }
    }

    setupEventListeners() {
        if (this.applyBtn) {
            this.applyBtn.addEventListener('click', () => this.setEditing(true));
        }

        this.cancelBtn.addEventListener('click', () => {
            this.populateForm();
            this.clearPasswordFields();
            this.setEditing(false);
            this.showNotification('تم إلغاء التغييرات', 'info');
        });

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUserData();
        });
    }

    setEditing(editing) {
        this.isEditing = editing;
        this.inputs.forEach(input => {
            input.disabled = !editing;
        });
        
        this.saveBtn.disabled = !editing;
        this.cancelBtn.disabled = !editing;
        
        if (this.applyBtn) {
            this.applyBtn.disabled = editing;
        }

        // إضافة تأثيرات بصرية
        if (editing) {
            this.form.classList.add('editing');
            this.showNotification('يمكنك الآن تعديل البيانات', 'info');
        } else {
            this.form.classList.remove('editing');
        }
    }

    clearPasswordFields() {
        document.getElementById('password').value = '';
        document.getElementById('confirmPassword').value = '';
    }

    validatePassword() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password && password !== confirmPassword) {
            this.showNotification('كلمة المرور وتأكيد كلمة المرور غير متطابقين', 'error');
            return false;
        }

        if (password && password.length < 6) {
            this.showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return false;
        }

        return true;
    }

    async saveUserData() {
        if (!this.validatePassword()) {
            return;
        }

        // إظهار حالة التحميل
        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'جاري الحفظ...';

        try {
            const formData = {};
            this.inputs.forEach(input => {
                if (input.id === 'password' || input.id === 'confirmPassword') {
                    if (input.value) {
                        formData.password = input.value;
                    }
                } else {
                    formData[input.id] = input.value;
                }
            });

            // التحقق من البيانات المطلوبة
            if (!formData.firstName || !formData.lastName || !formData.email) {
                this.showNotification('يرجى ملء الحقول المطلوبة', 'error');
                return;
            }

            // Map form fields to database fields
            const userData = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                birthdate: formData.birthdate
            };

            // Update user in database
            const updatedUser = await db.updateUser(userData);
            
            if (updatedUser) {
                this.userData = updatedUser;
                this.showNotification('تم حفظ البيانات بنجاح', 'success');
                this.clearPasswordFields();
                this.setEditing(false);
            } else {
                this.showNotification('خطأ في حفظ البيانات', 'error');
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            this.showNotification('خطأ في حفظ البيانات', 'error');
        } finally {
            // إعادة تفعيل الزر
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'حفظ التغييرات';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize account service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AccountService();
});



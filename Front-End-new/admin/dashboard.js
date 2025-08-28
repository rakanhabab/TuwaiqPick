// Dashboard Specific JavaScript with Database Integration
import { db } from '../../js/database.js';

class DashboardService {
    constructor() {
        this.initializeDashboard();
    }

    async initializeDashboard() {
        try {
            // Load all dashboard data
            await Promise.all([
                this.loadRevenueData(),
                this.loadOrdersData(),
                this.loadProductsData(),
                this.loadRecentActivity(),
                this.loadStatistics()
            ]);

            // Initialize UI components
            this.initializeDashboardCharts();
            this.initializeDashboardAnimations();
            this.initializeRealTimeUpdates();
            this.initializePeriodSelector();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }

    async loadRevenueData() {
        try {
            // Get invoices from database
            const invoices = await db.getInvoices();
            
            // Calculate revenue by period
            const today = new Date();
            const todayRevenue = invoices
                .filter(invoice => {
                    const invoiceDate = new Date(invoice.timestamp);
                    return invoiceDate.toDateString() === today.toDateString();
                })
                .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

            const weekRevenue = invoices
                .filter(invoice => {
                    const invoiceDate = new Date(invoice.timestamp);
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return invoiceDate >= weekAgo;
                })
                .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

            const monthRevenue = invoices
                .filter(invoice => {
                    const invoiceDate = new Date(invoice.timestamp);
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return invoiceDate >= monthAgo;
                })
                .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);

            this.revenueData = {
                today: todayRevenue,
                week: weekRevenue,
                month: monthRevenue
            };

            // Update UI
            this.updateRevenueDisplay();
        } catch (error) {
            console.error('Error loading revenue data:', error);
        }
    }

    async loadOrdersData() {
        try {
            const invoices = await db.getInvoices();
            
            // Calculate orders by period
            const today = new Date();
            const todayOrders = invoices.filter(invoice => {
                const invoiceDate = new Date(invoice.timestamp);
                return invoiceDate.toDateString() === today.toDateString();
            }).length;

            const weekOrders = invoices.filter(invoice => {
                const invoiceDate = new Date(invoice.timestamp);
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return invoiceDate >= weekAgo;
            }).length;

            const monthOrders = invoices.filter(invoice => {
                const invoiceDate = new Date(invoice.timestamp);
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                return invoiceDate >= monthAgo;
            }).length;

            this.ordersData = {
                today: todayOrders,
                week: weekOrders,
                month: monthOrders
            };

            // Update UI
            this.updateOrdersDisplay();
        } catch (error) {
            console.error('Error loading orders data:', error);
        }
    }

    async loadProductsData() {
        try {
            const products = await db.getProducts();
            
            // Group products by category
            const categories = {};
            products.forEach(product => {
                const category = product.category || 'أخرى';
                if (!categories[category]) {
                    categories[category] = 0;
                }
                categories[category]++;
            });

            this.productsData = {
                total: products.length,
                categories: categories
            };

            // Update UI
            this.updateProductsDisplay();
        } catch (error) {
            console.error('Error loading products data:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const invoices = await db.getInvoices();
            
            // Get recent invoices (last 10)
            const recentInvoices = invoices
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);

            this.recentActivity = recentInvoices.map(invoice => ({
                type: 'order',
                title: `طلب جديد #${invoice.id}`,
                time: this.formatTimeAgo(new Date(invoice.timestamp)),
                amount: db.formatCurrency(invoice.total_amount || 0)
            }));

            // Update UI
            this.updateActivityDisplay();
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadStatistics() {
        try {
            const invoices = await db.getInvoices();
            const products = await db.getProducts();
            
            // Calculate statistics
            const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
            const totalOrders = invoices.length;
            const totalProducts = products.length;
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            this.statistics = {
                totalRevenue,
                totalOrders,
                totalProducts,
                averageOrderValue
            };

            // Update UI
            this.updateStatisticsDisplay();
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    updateRevenueDisplay() {
        const revenueAmount = document.querySelector('.revenue-amount');
        if (revenueAmount && this.revenueData) {
            revenueAmount.textContent = db.formatCurrency(this.revenueData.today);
        }
    }

    updateOrdersDisplay() {
        const ordersAmount = document.querySelector('.orders-amount');
        if (ordersAmount && this.ordersData) {
            ordersAmount.textContent = this.ordersData.today;
        }
    }

    updateProductsDisplay() {
        const productsAmount = document.querySelector('.products-amount');
        if (productsAmount && this.productsData) {
            productsAmount.textContent = this.productsData.total;
        }
    }

    updateActivityDisplay() {
        const activityList = document.querySelector('.activity-list');
        if (activityList && this.recentActivity) {
            activityList.innerHTML = this.recentActivity.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}"></div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                        <div class="activity-amount">${activity.amount}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    updateStatisticsDisplay() {
        // Update any statistics displays
        const statsElements = document.querySelectorAll('.stat-value');
        statsElements.forEach(element => {
            const statType = element.dataset.stat;
            if (statType && this.statistics) {
                switch (statType) {
                    case 'revenue':
                        element.textContent = db.formatCurrency(this.statistics.totalRevenue);
                        break;
                    case 'orders':
                        element.textContent = this.statistics.totalOrders;
                        break;
                    case 'products':
                        element.textContent = this.statistics.totalProducts;
                        break;
                    case 'average':
                        element.textContent = db.formatCurrency(this.statistics.averageOrderValue);
                        break;
                }
            }
        });
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'منذ لحظات';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `منذ ${minutes} دقيقة`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `منذ ${hours} ساعة`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `منذ ${days} يوم`;
        }
    }

    // Initialize Dashboard Charts with real data
    initializeDashboardCharts() {
        if (!this.revenueData || !this.ordersData || !this.productsData) {
            setTimeout(() => this.initializeDashboardCharts(), 1000);
            return;
        }

        // Revenue Chart with real data
        const revenueData = {
            x: ['اليوم', 'الأسبوع', 'الشهر'],
            y: [this.revenueData.today, this.revenueData.week, this.revenueData.month],
            type: 'bar',
            name: 'الإيرادات',
            marker: {
                color: '#f9953b',
                opacity: 0.8
            }
        };

        const revenueLayout = {
            title: '',
            margin: { t: 10, r: 20, b: 40, l: 50 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
                family: 'Tajawal',
                color: '#6b7280',
                size: 12
            },
            xaxis: {
                color: '#6b7280',
                gridcolor: 'rgba(249, 115, 22, 0.1)'
            },
            yaxis: {
                color: '#6b7280',
                gridcolor: 'rgba(249, 115, 22, 0.1)',
                tickformat: ',.0f',
                ticksuffix: ' ر.س'
            },
            showlegend: false
        };

        if (window.Plotly) {
            Plotly.newPlot('revenueChart', [revenueData], revenueLayout, {
                responsive: true,
                displayModeBar: false
            });
        }

        // Products Chart with real data
        if (this.productsData.categories) {
            const categories = Object.keys(this.productsData.categories);
            const values = Object.values(this.productsData.categories);
            
            const productsData = [{
                values: values,
                labels: categories,
                type: 'pie',
                hole: 0.6,
                marker: {
                    colors: ['#f9953b', '#9f7bea', '#f97316', '#e7a7ff', '#f59e0b', '#10b981']
                },
                textinfo: 'label+percent',
                textposition: 'outside'
            }];

            const productsLayout = {
                title: '',
                margin: { t: 10, r: 10, b: 10, l: 10 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: {
                    family: 'Tajawal',
                    color: '#6b7280',
                    size: 11
                },
                showlegend: false
            };

            if (window.Plotly) {
                Plotly.newPlot('productsChart', productsData, productsLayout, {
                    responsive: true,
                    displayModeBar: false
                });
            }
        }
    }

    // Initialize Period Selector
    initializePeriodSelector() {
        const periodBtns = document.querySelectorAll('.period-btn');
        
        periodBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                periodBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Update revenue based on selected period
                this.updateRevenueForPeriod(btn.dataset.period);
            });
        });
    }

    // Update Revenue for Selected Period
    updateRevenueForPeriod(period) {
        const revenueAmount = document.querySelector('.revenue-amount');
        if (!revenueAmount || !this.revenueData) return;
        
        const amount = this.revenueData[period] || 0;
        
        // Animate the change
        revenueAmount.style.transform = 'scale(1.05)';
        setTimeout(() => {
            revenueAmount.textContent = db.formatCurrency(amount);
            revenueAmount.style.transform = 'scale(1)';
        }, 150);
    }

    // Initialize Dashboard Animations
    initializeDashboardAnimations() {
        // Animate metric values
        const metricValues = document.querySelectorAll('.revenue-amount, .orders-amount, .products-amount');
        metricValues.forEach(value => {
            const finalValue = value.textContent;
            const numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));
            if (!isNaN(numericValue)) {
                this.animateValue(value, 0, numericValue, 2000);
            }
        });
    }

    // Animate numeric values
    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const suffix = element.textContent.match(/[^0-9,.]*$/)?.[0] || '';
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * progress;
            element.textContent = current.toLocaleString('ar-SA') + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    // Initialize Real-time Updates
    initializeRealTimeUpdates() {
        setInterval(() => {
            // Refresh data every 5 minutes
            this.loadRecentActivity();
        }, 300000); // 5 minutes
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new DashboardService();
});

// Add keyboard shortcuts for dashboard
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + R to refresh data
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
    }
    
    // Numbers 1-3 to switch periods
    if (e.key >= '1' && e.key <= '3') {
        const periods = ['today', 'week', 'month'];
        const periodIndex = parseInt(e.key) - 1;
        const periodBtn = document.querySelector(`[data-period="${periods[periodIndex]}"]`);
        if (periodBtn) {
            periodBtn.click();
        }
    }
});

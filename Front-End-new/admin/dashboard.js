// Dashboard Specific JavaScript with Database Integration
import { db } from '../js/database.js';

class DashboardService {
    constructor() {
        this.initializeDashboard();
    }

    async initializeDashboard() {
        try {
            await Promise.all([
                this.loadRevenueData(),
                this.loadProductsData()
            ]);

            this.initializeDashboardCharts();
            this.initializeDashboardAnimations();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }

    async loadRevenueData() {
        try {
            // Use all invoices (admin view)
            const invoices = await db.getAllInvoices();
            const normalize = s => (s || '').toString().toLowerCase();
            const paidStatuses = new Set(['paid', 'completed', 'success', 'settled']);
            const paid = (invoices || []).filter(inv => paidStatuses.has(normalize(inv.status)));

            const sumAmount = arr => arr.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

            const totalRevenue = sumAmount(paid);
            const averageOrderValue = paid.length > 0 ? totalRevenue / paid.length : 0;

            this.revenueData = { total: totalRevenue || 0, average: averageOrderValue || 0 };

            this.updateRevenueDisplay();
            this.updateStatisticsDisplay();
        } catch (error) {
            console.error('Error loading revenue data:', error);
            this.revenueData = { total: 0, average: 0 };
            this.updateRevenueDisplay();
            this.updateStatisticsDisplay();
        }
    }

    async loadProductsData() {
        try {
            const products = await db.getProducts();
            const categories = {};
            (products || []).forEach(product => {
                const category = product.category || 'أخرى';
                if (!categories[category]) categories[category] = 0;
                categories[category]++;
            });

            this.productsData = {
                total: (products || []).length || 0,
                categories
            };

            this.updateProductsDisplay();
        } catch (error) {
            console.error('Error loading products data:', error);
            this.productsData = { total: 0, categories: {} };
            this.updateProductsDisplay();
        }
    }

    updateRevenueDisplay() {
        const revenueAmount = document.querySelector('.revenue-amount');
        if (revenueAmount && this.revenueData) {
            revenueAmount.textContent = db.formatCurrency(this.revenueData.total);
        }
    }

    updateProductsDisplay() {
        const productsAmount = document.querySelector('.products-amount');
        if (productsAmount && this.productsData) {
            productsAmount.textContent = this.productsData.total;
        }
    }

    updateStatisticsDisplay() {
        const avgEl = document.querySelector('[data-stat="average"]');
        if (avgEl && this.revenueData) {
            avgEl.textContent = db.formatCurrency(this.revenueData.average || 0);
        }
    }

    initializeDashboardCharts() {
        if (!this.revenueData || !this.productsData) {
            setTimeout(() => this.initializeDashboardCharts(), 800);
            return;
        }

        // Revenue Chart: single total bar
        const revenueData = {
            x: ['الإجمالي'],
            y: [this.revenueData.total],
            type: 'bar',
            name: 'إجمالي الإيرادات (مدفوعة)',
            marker: { color: '#f9953b', opacity: 0.8 }
        };
        const revenueLayout = {
            title: '',
            margin: { t: 10, r: 20, b: 40, l: 50 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Tajawal', color: '#6b7280', size: 12 },
            xaxis: { color: '#6b7280' },
            yaxis: { color: '#6b7280', tickformat: ',.0f', ticksuffix: ' ر.س' },
            showlegend: false
        };
        if (window.Plotly) {
            Plotly.newPlot('revenueChart', [revenueData], revenueLayout, { responsive: true, displayModeBar: false });
        }

        // Products Chart by categories
        if (this.productsData.categories) {
            const categories = Object.keys(this.productsData.categories);
            const values = Object.values(this.productsData.categories);
            const productsData = [{
                values,
                labels: categories,
                type: 'pie',
                hole: 0.6,
                marker: { colors: ['#f9953b', '#9f7bea', '#f97316', '#e7a7ff', '#f59e0b', '#10b981'] },
                textinfo: 'label+percent',
                textposition: 'outside'
            }];
            const productsLayout = {
                title: '',
                margin: { t: 10, r: 10, b: 10, l: 10 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { family: 'Tajawal', color: '#6b7280', size: 11 },
                showlegend: false
            };
            if (window.Plotly) {
                Plotly.newPlot('productsChart', productsData, productsLayout, { responsive: true, displayModeBar: false });
            }
        }
    }

    initializeDashboardAnimations() {
        const metricValues = document.querySelectorAll('.revenue-amount, .products-amount');
        metricValues.forEach(value => {
            const finalValue = value.textContent;
            const numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));
            if (!isNaN(numericValue)) {
                this.animateValue(value, 0, numericValue, 2000);
            }
        });
    }

    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const suffix = element.textContent.match(/[^0-9,.]*$/)?.[0] || '';
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = start + (end - start) * progress;
            element.textContent = current.toLocaleString('ar-SA') + suffix;
            if (progress < 1) requestAnimationFrame(updateValue);
        }
        requestAnimationFrame(updateValue);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    new DashboardService();
});

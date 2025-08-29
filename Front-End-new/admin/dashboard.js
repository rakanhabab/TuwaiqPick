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

            const sumAmount = arr => arr.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

            const totalRevenue = sumAmount(paid);
            const averageOrderValue = paid.length > 0 ? totalRevenue / paid.length : 0;

            // Create timeline data for chart
            const timelineData = this.processInvoicesForTimeline(paid);

            this.revenueData = { 
                total: totalRevenue || 0, 
                average: averageOrderValue || 0,
                timeline: timelineData
            };

            this.updateRevenueDisplay();
            this.updateStatisticsDisplay();
        } catch (error) {
            console.error('Error loading revenue data:', error);
            this.revenueData = { total: 0, average: 0, timeline: [] };
            this.updateRevenueDisplay();
            this.updateStatisticsDisplay();
        }
    }

    processInvoicesForTimeline(invoices) {
        // Group invoices by date and sum amounts
        const dailyData = {};
        
        invoices.forEach(invoice => {
            if (invoice.timestamp) {
                const date = new Date(invoice.timestamp);
                const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
                
                if (!dailyData[dateKey]) {
                    dailyData[dateKey] = 0;
                }
                dailyData[dateKey] += parseFloat(invoice.total_amount) || 0;
            }
        });

        // Convert to sorted array
        const sortedDates = Object.keys(dailyData).sort();
        return sortedDates.map(date => ({
            date: date,
            amount: dailyData[date]
        }));
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

        // Revenue Chart: Timeline line chart with smaller size
        const revenueTimeline = this.revenueData.timeline || [];
        const revenueData = {
            x: revenueTimeline.map(item => item.date),
            y: revenueTimeline.map(item => item.amount),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'الإيرادات اليومية',
            line: { color: '#f9953b', width: 2 },
            marker: { color: '#f9953b', size: 4 }
        };
        const revenueLayout = {
            title: '',
            margin: { t: 5, r: 10, b: 20, l: 25 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Tajawal', color: '#6b7280', size: 10 },
            xaxis: { 
                color: '#6b7280',
                title: 'التاريخ',
                type: 'date',
                tickfont: { size: 9 }
            },
            yaxis: { 
                color: '#6b7280', 
                tickformat: ',.0f', 
                ticksuffix: ' ر.س',
                title: 'المبيعات',
                tickfont: { size: 9 }
            },
            showlegend: false,
            height: 200
        };
        if (window.Plotly) {
            Plotly.newPlot('revenueChart', [revenueData], revenueLayout, { responsive: true, displayModeBar: false });
        }

        // Products Chart by categories with smaller size
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
                textposition: 'outside',
                textfont: { size: 9 }
            }];
            const productsLayout = {
                title: '',
                margin: { t: 5, r: 5, b: 5, l: 5 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { family: 'Tajawal', color: '#6b7280', size: 9 },
                showlegend: false,
                height: 200
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

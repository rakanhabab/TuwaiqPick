// Dashboard JavaScript with Database Integration
import { db } from '../js/database.js';

class DashboardService {
    constructor() {
        this.initializeDashboard();
    }

    async initializeDashboard() {
        try {

            // Debug: Show all invoices
            await this.debugShowAllInvoices();
            
            // Load branches for filter
            await this.loadBranches();
            
            // Initialize dashboard with default filters
            await this.updateDashboard();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }


    async loadBranches() {
        try {
            const branches = await db.getBranches();
            const branchFilter = document.getElementById('branchFilter');
            
            if (branchFilter && branches) {
                // Clear existing options except "all"
                branchFilter.innerHTML = '<option value="all">جميع الفروع</option>';
                
                // Add branch options
                branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.branch_num;
                    option.textContent = branch.name || branch.branch_num;
                    branchFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }

    async updateDashboard() {
        try {
            const timeFilter = document.getElementById('timeFilter')?.value || 'month';
            const branchFilter = document.getElementById('branchFilter')?.value || 'all';
            
            console.log('Updating dashboard with filters:', { timeFilter, branchFilter });
            
            // Get date range based on time filter
            const { fromDate, toDate } = this.getDateRange(timeFilter);
            console.log('Date range:', { fromDate, toDate });
            
            // Update all dashboard components sequentially to avoid conflicts
            console.log('Starting dashboard updates...');
            
            await this.updateStatistics(fromDate, toDate, branchFilter);
            console.log('Statistics updated');
            
            await this.updateBranchSalesChart(fromDate, toDate, branchFilter);
            console.log('Branch sales chart updated');
            
            await this.updateRevenueChart(fromDate, toDate, branchFilter);
            console.log('Revenue chart updated');
            
            await this.updateCategoryChart();
            console.log('Category chart updated');
            
            await this.updateLowStockChart();
            console.log('Low stock chart updated');
            
            await this.updateLowStockTable();
            console.log('Low stock table updated');
            
            console.log('Dashboard update completed');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    getDateRange(timeFilter) {
        const now = new Date();
        let fromDate, toDate;
        
        switch (timeFilter) {
            case 'today':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                toDate = now;
                break;
            case 'month':
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                toDate = now;
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                fromDate = new Date(now.getFullYear(), quarter * 3, 1);
                toDate = now;
                break;
            case 'year':
                fromDate = new Date(now.getFullYear(), 0, 1);
                toDate = now;
                break;
            default:
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                toDate = now;
        }
        
        return {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0]
        };
    }

    async updateStatistics(fromDate, toDate, branchNum) {
        try {
            // Get net sales (gross sales - refunds)
            const netSales = await this.getNetSales(fromDate, toDate, branchNum);
            
            // Get orders, AOV, and paid rate
            const { orders, aov, paidRate } = await this.getOrdersStats(fromDate, toDate, branchNum);
            
            // Get refunds
            const refunds = await this.getRefunds(fromDate, toDate, branchNum);
            
            // Update UI
            this.updateStatValue('netSalesValue', db.formatCurrency(netSales));
            this.updateStatValue('ordersValue', orders.toLocaleString('ar-SA'));
            this.updateStatValue('aovValue', db.formatCurrency(aov));
            this.updateStatValue('paidRateValue', `${paidRate.toFixed(1)}%`);
            this.updateStatValue('refundsValue', db.formatCurrency(refunds));
            
        } catch (error) {

            console.error('Error updating statistics:', error);
        }
    }

    async getNetSales(fromDate, toDate, branchNum) {
        try {
            console.log('Getting net sales with filters:', { fromDate, toDate, branchNum });
            
            // Get all invoices for the period
            const invoices = await db.getDashboardInvoices(fromDate, toDate, branchNum);
            console.log('All invoices for period:', invoices);
            
            // Filter paid invoices and calculate gross sales
            const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');
            const grossSales = paidInvoices.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0);
            console.log('Gross sales:', grossSales, 'from', paidInvoices.length, 'paid invoices');
            
            // Get refunds
            let refundsQuery = db.supabase
                .from('tickets')
                .select('refund_price')
                .eq('status', 'approved')
                .gte('timestamp', fromDate)
                .lte('timestamp', toDate);
            
            if (branchNum !== 'all') {
                // Get invoice numbers for the branch
                const { data: branchInvoices } = await db.supabase
                    .from('invoices')
                    .select('invoice_num')
                    .eq('branch_num', branchNum);
                
                const branchInvoiceNums = branchInvoices?.map(inv => inv.invoice_num) || [];
                if (branchInvoiceNums.length > 0) {
                    refundsQuery = refundsQuery.in('invoice_num', branchInvoiceNums);
                }
            }
            
            const { data: refundsData } = await refundsQuery;
            const refunds = refundsData?.reduce((sum, ticket) => sum + (Number(ticket.refund_price) || 0), 0) || 0;
            
            return grossSales - refunds;
        } catch (error) {
            console.error('Error getting net sales:', error);
            return 0;
        }
    }

    async getOrdersStats(fromDate, toDate, branchNum) {
        try {
            console.log('Getting orders stats with filters:', { fromDate, toDate, branchNum });
            
            // Get all invoices for the period
            const invoices = await db.getDashboardInvoices(fromDate, toDate, branchNum);
            console.log('Orders data:', invoices);
            
            if (!invoices || invoices.length === 0) {
                return { orders: 0, aov: 0, paidRate: 0 };
            }
            
            const paidInvoices = invoices.filter(inv => inv.status === 'paid');
            const orders = paidInvoices.length;
            const totalAmount = paidInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
            const aov = orders > 0 ? totalAmount / orders : 0;
            const paidRate = (orders / invoices.length) * 100;
            
            return { orders, aov, paidRate };
        } catch (error) {
            console.error('Error getting orders stats:', error);
            return { orders: 0, aov: 0, paidRate: 0 };
        }
    }

    async getRefunds(fromDate, toDate, branchNum) {
        try {
            let query = db.supabase
                .from('tickets')
                .select('refund_price')
                .eq('status', 'approved')
                .gte('timestamp', fromDate)
                .lte('timestamp', toDate);
            
            if (branchNum !== 'all') {
                // Get invoice numbers for the branch
                const { data: branchInvoices } = await db.supabase
                    .from('invoices')
                    .select('invoice_num')
                    .eq('branch_num', branchNum);
                
                const branchInvoiceNums = branchInvoices?.map(inv => inv.invoice_num) || [];
                if (branchInvoiceNums.length > 0) {
                    query = query.in('invoice_num', branchInvoiceNums);
                }
            }
            
            const { data: refundsData } = await query;
            return refundsData?.reduce((sum, ticket) => sum + (Number(ticket.refund_price) || 0), 0) || 0;
        } catch (error) {
            console.error('Error getting refunds:', error);
            return 0;
        }
    }

    async updateBranchSalesChart(fromDate, toDate, branchNum) {
        try {
            console.log('Updating branch sales chart with filters:', { fromDate, toDate, branchNum });
            
            // Get all branches first
            const allBranches = await db.getBranches();
            console.log('All branches:', allBranches);
            
            // Get all invoices for the period
            const allInvoices = await db.getDashboardInvoices(fromDate, toDate, branchNum);
            console.log('All invoices for branch sales:', allInvoices);
            
            // Filter paid invoices
            const salesData = allInvoices.filter(invoice => invoice.status === 'paid');
            console.log('Paid invoices for branch sales:', salesData);
            
            // Initialize sales for all branches with 0
            const branchSales = {};
            allBranches.forEach(branch => {
                branchSales[branch.branch_num] = 0;
            });
            
            // Add actual sales data
            salesData.forEach(invoice => {
                const branchName = invoice.branch_num || 'غير محدد';
                branchSales[branchName] = (branchSales[branchName] || 0) + (Number(invoice.total_amount) || 0);
            });
            
            const branches = Object.keys(branchSales);
            const sales = Object.values(branchSales);
            
            const data = [{
                x: branches,
                y: sales,
            type: 'bar',

                marker: {
                    color: 'rgba(59, 130, 246, 0.8)',
                    line: {
                        color: '#2563eb',
                        width: 1
                    }
                }
            }];
            
            const layout = {
                title: {
                    text: 'المبيعات حسب الفرع',
                    font: { size: 14, family: 'Tajawal' }
                },
                xaxis: {
                    title: { text: 'الفرع', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                yaxis: {
                    title: { text: 'المبيعات (ر.س)', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                margin: { l: 60, r: 30, t: 40, b: 60 },
                height: 250,
            showlegend: false
        };

            
            // Check if Plotly is available
            if (typeof Plotly !== 'undefined') {
                Plotly.newPlot('branchSalesChart', data, layout, { responsive: true });
            } else {
                console.error('Plotly is not loaded');
                this.createEmptyChart('branchSalesChart', 'خطأ في تحميل مكتبة الرسومات');
            }
        } catch (error) {
            console.error('Error updating branch sales chart:', error);
            this.createEmptyChart('branchSalesChart', 'خطأ في تحميل البيانات');
        }
    }

    async updateRevenueChart(fromDate, toDate, branchNum) {
        try {
            console.log('Updating revenue chart with filters:', { fromDate, toDate, branchNum });
            
            // Get all branches
            const allBranches = await db.getBranches();
            
            // Get all invoices for the period
            const allInvoices = await db.getDashboardInvoices(fromDate, toDate, branchNum);
            const paidInvoices = allInvoices.filter(invoice => invoice.status === 'paid');
            
            // Group by month and branch
            const monthlyData = {};
            const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                           'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            
            // Initialize data structure
            months.forEach((month, index) => {
                monthlyData[index] = { month, total: 0 };
                allBranches.forEach(branch => {
                    monthlyData[index][branch.branch_num] = 0;
                });
            });
            
            // Fill in actual data
            paidInvoices.forEach(invoice => {
                const date = new Date(invoice.timestamp);
                const monthIndex = date.getMonth();
                const amount = Number(invoice.total_amount) || 0;
                
                monthlyData[monthIndex].total += amount;
                if (invoice.branch_num) {
                    monthlyData[monthIndex][invoice.branch_num] += amount;
                }
            });
            
            // Prepare data for plotting
            const traces = [];
            
            // Add total line
            traces.push({
                x: months,
                y: months.map((_, index) => monthlyData[index].total),
                type: 'scatter',
                mode: 'lines+markers',
                name: 'إجمالي الفروع',
                line: { color: '#1f2937', width: 3 },
                marker: { size: 6 }
            });
            
            // Add branch lines
            allBranches.forEach(branch => {
                traces.push({
                    x: months,
                    y: months.map((_, index) => monthlyData[index][branch.branch_num] || 0),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: branch.name || branch.branch_num,
                    line: { width: 2 },
                    marker: { size: 4 }
                });
            });
            
            const layout = {
                title: {
                    text: 'الإيرادات الشهرية',
                    font: { size: 14, family: 'Tajawal' }
                },
                xaxis: {
                    title: { text: 'الشهر', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                yaxis: {
                    title: { text: 'الإيرادات (ر.س)', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                margin: { l: 60, r: 30, t: 40, b: 60 },
                height: 250,
                showlegend: true,
                legend: {
                    font: { family: 'Tajawal', size: 10 }
                }
            };
            
            if (typeof Plotly !== 'undefined') {
                Plotly.newPlot('revenueChart', traces, layout, { responsive: true });
            } else {
                this.createEmptyChart('revenueChart', 'خطأ في تحميل مكتبة الرسومات');
            }
        } catch (error) {
            console.error('Error updating revenue chart:', error);
            this.createEmptyChart('revenueChart', 'خطأ في تحميل البيانات');
        }
    }

    async updateCategoryChart() {
        try {
            console.log('Updating category chart');
            
            // Get all products
            const products = await db.getProducts();
            
            // Group by category
            const categoryCount = {};
            products.forEach(product => {
                const category = product.category || 'غير محدد';
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            });
            
            const categories = Object.keys(categoryCount);
            const counts = Object.values(categoryCount);
            
            const data = [{
                values: counts,
                labels: categories,
                type: 'pie',

                hole: 0.4,
                marker: {
                    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
                }
            }];
            
            const layout = {
                title: {
                    text: 'المنتجات حسب الفئة',
                    font: { size: 14, family: 'Tajawal' }
                },
                margin: { l: 30, r: 30, t: 40, b: 30 },
                height: 250,
                showlegend: true,
                legend: {
                    font: { family: 'Tajawal', size: 10 }
                }
            };
            
            if (typeof Plotly !== 'undefined') {
                Plotly.newPlot('categoryChart', data, layout, { responsive: true });
            } else {
                this.createEmptyChart('categoryChart', 'خطأ في تحميل مكتبة الرسومات');
            }
        } catch (error) {
            console.error('Error updating category chart:', error);
            this.createEmptyChart('categoryChart', 'خطأ في تحميل البيانات');
        }
    }

    async updateLowStockChart() {
        try {
            console.log('Updating low stock chart');
            
            // Get inventory data
            const inventoryData = await db.getInventoryQuantities();
            const products = await db.getProducts();
            
            // Create product map
            const productMap = {};
            products.forEach(product => {
                productMap[product.id] = product;
            });
            
            // Calculate total quantity per product
            const productQuantities = {};
            inventoryData.forEach(item => {
                const productId = item.product_id;
                if (!productQuantities[productId]) {
                    productQuantities[productId] = 0;
                }
                productQuantities[productId] += Number(item.quantity) || 0;
            });
            
            // Sort by quantity (ascending) and get top 7
            const sortedProducts = Object.entries(productQuantities)
                .sort(([,a], [,b]) => a - b)
                .slice(0, 7);
            
            const productNames = sortedProducts.map(([productId]) => 
                productMap[productId]?.name || productId
            );
            const quantities = sortedProducts.map(([, quantity]) => quantity);
            
            const data = [{
                x: quantities,
                y: productNames,
                type: 'bar',
                orientation: 'h',
                marker: {
                    color: 'rgba(239, 68, 68, 0.8)',
                    line: {
                        color: '#dc2626',
                        width: 1
                    }
                }
            }];
            
            const layout = {
                title: {
                    text: 'أقل 7 منتجات توفراً',
                    font: { size: 14, family: 'Tajawal' }
                },
                xaxis: {
                    title: { text: 'الكمية المتوفرة', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                yaxis: {
                    title: { text: 'المنتج', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                margin: { l: 120, r: 30, t: 40, b: 60 },
                height: 250,
                showlegend: false
            };

            
            if (typeof Plotly !== 'undefined') {
                Plotly.newPlot('lowStockChart', data, layout, { responsive: true });
            } else {
                this.createEmptyChart('lowStockChart', 'خطأ في تحميل مكتبة الرسومات');
            }
        } catch (error) {
            console.error('Error updating low stock chart:', error);
            this.createEmptyChart('lowStockChart', 'خطأ في تحميل البيانات');
        }
    }

    async updateTopProductsChart(fromDate, toDate, branchNum) {
        try {
            console.log('Updating top products chart with filters:', { fromDate, toDate, branchNum });
            
            // Get all invoices for the period
            const allInvoices = await db.getDashboardInvoices(fromDate, toDate, branchNum);
            console.log('All invoices for products:', allInvoices);
            
            // Filter paid invoices
            const invoices = allInvoices.filter(invoice => invoice.status === 'paid');
            console.log('Paid invoices for products:', invoices);
            
            if (!invoices || invoices.length === 0) {
                this.createEmptyChart('topProductsChart', 'لا توجد بيانات للمنتجات');
                return;
            }
            
            // Aggregate product data
            const productStats = {};
            
            invoices.forEach(invoice => {
                try {
                    const products = JSON.parse(invoice.products_and_quantities || '[]');
                    products.forEach(product => {
                        const productName = product.name || 'غير محدد';
                        if (!productStats[productName]) {
                            productStats[productName] = { revenue: 0, units: 0 };
                        }
                        productStats[productName].revenue += Number(product.line_total) || 0;
                        productStats[productName].units += Number(product.quantity) || 0;
                    });
                } catch (error) {
                    console.error('Error parsing products:', error);
                }
            });
            
            // Sort by revenue and get top 10
            const topProducts = Object.entries(productStats)
                .sort(([,a], [,b]) => b.revenue - a.revenue)
                .slice(0, 10);
            
            const productNames = topProducts.map(([name]) => name);
            const revenues = topProducts.map(([,stats]) => stats.revenue);
            
            const data = [{
                x: productNames,
                y: revenues,
                type: 'bar',
                marker: {
                    color: 'rgba(16, 185, 129, 0.8)',
                    line: {
                        color: '#059669',
                        width: 1
                    }
                }
            }];
            
            const layout = {
                title: {
                    text: 'أفضل 10 منتجات',
                    font: { size: 14, family: 'Tajawal' }
                },
                xaxis: {
                    title: { text: 'المنتج', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                yaxis: {
                    title: { text: 'الإيرادات (ر.س)', font: { family: 'Tajawal' } },
                    tickfont: { family: 'Tajawal' }
                },
                margin: { l: 60, r: 30, t: 40, b: 80 },
                height: 250,
                showlegend: false
            };
            
            // Check if Plotly is available
            if (typeof Plotly !== 'undefined') {
                Plotly.newPlot('topProductsChart', data, layout, { responsive: true });
            } else {
                console.error('Plotly is not loaded');
                this.createEmptyChart('topProductsChart', 'خطأ في تحميل مكتبة الرسومات');
            }
        } catch (error) {
            console.error('Error updating top products chart:', error);
            this.createEmptyChart('topProductsChart', 'خطأ في تحميل البيانات');
        }
    }

    async updateLowStockTable() {
        try {
            const { data: lowStockData } = await db.supabase
                .from('inventory')
                .select(`
                    branch_num,
                    product_id,
                    quantity,
                    products!inner(name)
                `)
                .lte('quantity', 10)
                .order('quantity', { ascending: true });
            
            const tableBody = document.getElementById('lowStockTableBody');
            if (!tableBody) return;
            
            tableBody.innerHTML = '';
            
            if (!lowStockData || lowStockData.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="4" style="text-align: center; color: #6b7280;">لا توجد منتجات بمخزون منخفض</td>';
                tableBody.appendChild(row);
                return;
            }
            
            lowStockData.forEach(item => {
                const row = document.createElement('tr');
                const status = this.getStockStatus(item.quantity);
                
                row.innerHTML = `
                    <td>${item.branch_num || 'غير محدد'}</td>
                    <td>${item.products?.name || 'غير محدد'}</td>
                    <td>${item.quantity}</td>
                    <td><span class="stock-status ${status.class}">${status.text}</span></td>
                `;
                
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error updating low stock table:', error);
        }
    }

    getStockStatus(quantity) {
        if (quantity === 0) {
            return { text: 'نفذ المخزون', class: 'critical' };
        } else if (quantity <= 5) {
            return { text: 'مخزون منخفض', class: 'low' };
        } else {
            return { text: 'تحذير', class: 'warning' };
        }
    }

    createEmptyChart(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-family: 'Tajawal';">
                    ${message}
                </div>
            `;
        }
    }

    updateStatValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    // Debug function to show all invoices
    async debugShowAllInvoices() {
        try {
            const allInvoices = await db.supabase
                .from('invoices')
                .select('*')
                .limit(10);
            
            console.log('First 10 invoices from database:', allInvoices);
        } catch (error) {
            console.error('Error debugging invoices:', error);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if Plotly is loaded
    if (typeof Plotly === 'undefined') {
        console.error('Plotly is not loaded. Loading from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
        script.onload = function() {
            console.log('Plotly loaded successfully');
            window.dashboardService = new DashboardService();
        };
        script.onerror = function() {
            console.error('Failed to load Plotly');
            window.dashboardService = new DashboardService();
        };
        document.head.appendChild(script);
    } else {
        console.log('Plotly is already loaded');
        window.dashboardService = new DashboardService();
    }
});

// Add CSS for empty charts
const style = document.createElement('style');
style.textContent = `
    .chart-container {
        position: relative;
    }
    
    .chart-container > div {
        width: 100% !important;
        height: 100% !important;
    }
    
    .chart-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6b7280;
        font-family: 'Tajawal';
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);

// Add loading message to charts
document.addEventListener('DOMContentLoaded', function() {

    const chartContainers = document.querySelectorAll('.chart');
    chartContainers.forEach(container => {
        container.innerHTML = '<div class="chart-loading">جاري تحميل البيانات...</div>';
    });
});




// /admin/assets/js/dashboard.js
import { kpiCard } from './ui.js';

const kpiRow = document.getElementById('kpiRow');
if (kpiRow) {
  kpiRow.innerHTML = [
    kpiCard('k1','إجمالي المنتجات','—'),
    kpiCard('k2','الفروع النشطة','—'),
    kpiCard('k3','شكاوى مفتوحة','—'),
    kpiCard('k4','تنبيهات مخزون منخفض','—')
  ].join('');
}

// عيّنة رسم بياني (بيانات وهمية الآن)
const ctx = document.getElementById('chart1');
if (ctx && window.Chart) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Sat','Sun','Mon','Tue','Wed','Thu','Fri'],
      datasets: [{ label: 'حركة المخزون', data: [12,19,7,15,9,13,17]}]
    }
  });
}

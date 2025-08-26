// /admin/assets/js/vision.js
// UI فقط (زميلك يربط الستريم/السوكت)
const tabs = document.querySelectorAll('.tab');
const views = {
  tracking: document.getElementById('view-tracking'),
  detection: document.getElementById('view-detection'),
  combined: document.getElementById('view-combined'),
};
tabs.forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelector('.tab.active')?.classList.remove('active');
    b.classList.add('active');
    document.querySelector('.view.active')?.classList.remove('active');
    const key = b.getAttribute('data-tab');
    views[key]?.classList.add('active');
  });
});

// أزرار التشغيل/الإيقاف (placeholder)
document.getElementById('btnStart')?.addEventListener('click', ()=>{
  document.getElementById('status').textContent = 'running';
});
document.getElementById('btnStop')?.addEventListener('click', ()=>{
  document.getElementById('status').textContent = 'idle';
});

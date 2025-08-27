// /admin/assets/js/i18n.js
const cache = {};
let current = localStorage.getItem('lang') || 'ar';

export async function setLang(lang='ar') {
  current = lang;
  localStorage.setItem('lang', lang);
  await applyI18n();
}

export async function applyI18n() {
  if (!cache[current]) {
    const resp = await fetch(`../assets/i18n/${current}.json`);
    cache[current] = await resp.json();
  }
  const dict = cache[current];

  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });

  // زر اللغات
  const toggle = document.getElementById('langToggle');
  if (toggle) toggle.textContent = current === 'ar' ? 'EN' : 'AR';
  
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
}
export function getLang(){ return current; }

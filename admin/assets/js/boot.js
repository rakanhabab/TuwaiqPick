// /admin/assets/js/boot.js
import { ensureAuthenticated } from './auth-guard.js';
import { setLang, applyI18n, getLang } from './i18n.js';
import { signOutAndRedirect } from './supabaseClient.js';
import './chatbot.js';

async function injectPartials() {
  const headerHost = document.getElementById('appHeader');
  const sidebarHost = document.getElementById('appSidebar');
  const [h, s] = await Promise.all([
    fetch('../partials/header.html').then(r=>r.text()),
    fetch('../partials/sidebar.html').then(r=>r.text())
  ]);
  headerHost.innerHTML = h;
  sidebarHost.innerHTML = s;
}

async function wireHeader() {
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', ()=>{
      const next = getLang()==='ar' ? 'en' : 'ar';
      setLang(next);
    });
  }
  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn) accountBtn.addEventListener('click', ()=> {
    window.location.href = '../pages/account.html';
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', signOutAndRedirect);
}

(async function boot(){
  if (!await ensureAuthenticated()) return;
  await injectPartials();
  await applyI18n();
  await wireHeader();
})();


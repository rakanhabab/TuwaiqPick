import { supabase, signOutAndRedirect } from './supabaseClient.js';

document.getElementById('logoutBtn2')?.addEventListener('click', signOutAndRedirect);

(async ()=>{
  const { data: { user } } = await supabase.auth.getUser();
  const host = document.getElementById('acctInfo');
  if (user && host) {
    host.innerHTML = `
      <div><b>Email:</b> ${user.email}</div>
      <div><b>User ID:</b> ${user.id}</div>
    `;
  }
})();

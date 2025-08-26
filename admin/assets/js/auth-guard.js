// /admin/assets/js/auth-guard.js
import { getSession } from './supabaseClient.js';

export async function ensureAuthenticated() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html'; // عدلي المسار حسب موقع login.html
    return false;
  }
  return true;
}

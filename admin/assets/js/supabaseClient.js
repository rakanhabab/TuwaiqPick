// /admin/assets/js/supabaseClient.js
export const SUPABASE_URL = 'https://uidrnyzcqfvppglupbrm.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZHJueXpjcWZ2cHBnbHVwYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Mzc2NjQsImV4cCI6MjA3MTUxMzY2NH0.AEOHzO3n4j3oEZ8WIw5_DA0NU9IOQCbsWHN8KXvaJ2s';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Helpers
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOutAndRedirect() {
  await supabase.auth.signOut();
  // عدلي المسار إذا كان مختلف
  window.location.href = '/login.html';
}

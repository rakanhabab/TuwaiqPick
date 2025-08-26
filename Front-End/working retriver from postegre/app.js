// /public/app.js
(() => {
  const API_URL = 'http://localhost:5050/api/chat';

  const $  = (s, r=document) => r.querySelector(s);
  const feed = $('#feed');
  const q    = $('#q');
  const ask  = $('#ask');

  function add(text, who='me'){
    const d=document.createElement('div');
    d.className = 'msg ' + (who==='me'?'me':'bot');
    d.textContent=text;
    feed.appendChild(d);
    feed.scrollTop=feed.scrollHeight;
  }
  add('مرحباً 👋 جرّب اسألني سؤال.');

  let history = [];
  ask?.addEventListener('click', async ()=>{
    const text = (q.value||'').trim();
    if(!text) return;
    add(text,'me'); q.value='';
    const wait = document.createElement('div'); wait.className='msg bot'; wait.textContent='...';
    feed.appendChild(wait); feed.scrollTop=feed.scrollHeight;
    try{
      history.push({role:'user', content:text});
      const r = await fetch(API_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages: history })
      });
      const data = await r.json();
      const reply = data?.reply || '…';
      wait.textContent = reply;
      history.push({role:'assistant', content: reply});
    }catch(e){
      console.error(e); wait.textContent='تعذر الاتصال بالخادم.';
    }
  });

  // ===== Supabase examples (users table وفق سكيمتك) =====
  const first=$('#first'), last=$('#last'), email=$('#email'), phone=$('#phone'), out=$('#out');

  $('#insert')?.addEventListener('click', async ()=>{
    out.textContent='جارٍ الإدخال…';
    const payload = {
      first_name: first.value.trim(),
      last_name : last.value.trim(),
      email     : email.value.trim(),
      phone     : phone.value.trim(),
      password  : 'DemoPass123', // للعرض فقط
      is_admin  : false
    };
    const { data, error } = await window.supabase.from('users').insert(payload).select('*').limit(1);
    out.textContent = error ? ('خطأ: '+error.message) : JSON.stringify(data, null, 2);
  });

  $('#list')?.addEventListener('click', async ()=>{
    out.textContent='جارٍ الجلب…';
    const { data, error } = await window.supabase.from('users').select('id,first_name,last_name,email,phone').limit(5);
    out.textContent = error ? ('خطأ: '+error.message) : JSON.stringify(data, null, 2);
  });
})();

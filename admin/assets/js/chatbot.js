// /admin/assets/js/chatbot.js
function addMsg(text, who='user'){
  const feed = document.getElementById('chatFeed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.textContent = text;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

async function handleQuestion(q){
  // Placeholder: لاحقاً نربطه بـ Supabase أو GPT
  // الآن بحث تجريبي بكلمات بسيطة
  if (/منتج|product/i.test(q)) return 'تقدرين تبحثين في صفحة المخزون.';
  if (/فرع|branch/i.test(q)) return 'تفاصيل الفروع في صفحة إدارة الفروع.';
  if (/شكوى|complaint/i.test(q)) return 'الشكاوى تلاقيها في صفحة إدارة الشكاوى.';
  return 'تمام، سجّلت سؤالك — نطوّر الإجابات لاحقًا 👌';
}

document.addEventListener('submit', async (e)=>{
  if (e.target?.id !== 'chatForm') return;
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const q = (input?.value || '').trim();
  if (!q) return;
  addMsg(q, 'user');
  input.value = '';
  const a = await handleQuestion(q);
  addMsg(a, 'bot');
});

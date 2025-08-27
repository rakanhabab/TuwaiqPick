// /server/index.js
const path   = require('path');
const express= require('express');
const cors   = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files from the "public" folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple language detector (Arabic vs English)
function detectLang(txt=''){
  const ar=/[\u0600-\u06FF]/.test(txt), en=/[A-Za-z]/.test(txt);
  if (en && !ar) return 'en';
  if (ar && !en) return 'ar';
  const last=(txt.match(/[\p{L}\p{N}]+/gu)||[]).pop()||'';
  return /[A-Za-z]/.test(last)?'en':'ar';
}

// Chatbot API endpoint
app.post('/api/chat', async (req,res)=>{
  try{
    const msgs = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const last = [...msgs].reverse().find(m=>m.role==='user')?.content || '';
    const lang = detectLang(last);

    // System message depending on detected language
    const SYSTEM =
      lang==='en'
        ? 'You are a helpful assistant. Always reply in clear, natural English.'
        : 'انت مساعد ودود. ردّك باللهجة السعودية وبوضوح.';

    const messages = [{role:'system', content: SYSTEM}, ...msgs];

    // Create a chat completion
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5
    });

    const reply = completion.choices?.[0]?.message?.content || '…';
    res.json({ reply, lang });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, ()=> console.log(`API & web on http://localhost:${PORT}`));

// /server/index.js
const path   = require('path');
const fs     = require('fs');
const express= require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());

// Serve frontend static files directly from the Front-End root
const FRONTEND_DIR = path.join(__dirname, '..', '..', '..'); // .../Front-End
app.use(express.static(FRONTEND_DIR));

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===== Enforce platform-only access =====
const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || `http://localhost:${process.env.PORT||5050}`;

function requestFromPlatform(req){
  const origin = (req.headers.origin||'').toString();
  const referer = (req.headers.referer||'').toString();
  return (origin.startsWith(PLATFORM_ORIGIN) || referer.startsWith(PLATFORM_ORIGIN));
}

function platformGuard(req,res,next){
  if (requestFromPlatform(req)) return next();
  return res.status(403).json({ error: 'forbidden' });
}

// Guard all API routes
app.use('/api', platformGuard);

// ===== Simple vector store: Postgres (preferred) or JSON fallback =====
const RAG_STORE_PATH = path.join(__dirname, 'rag_store.json');

function dbEnabled(){
  return !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME && process.env.DB_PORT);
}

let pgPool = null;
function getPgPool(){
  if (!dbEnabled()) return null;
  if (!pgPool){
    pgPool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pgPool;
}

async function ensureTable(){
  if (!dbEnabled()) return;
  const pool = getPgPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rag_vectors (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS rag_vectors_namespace_idx ON rag_vectors(namespace);
  `);
}

function loadStore(){
  try{
    const raw = fs.readFileSync(RAG_STORE_PATH, 'utf8');
    return JSON.parse(raw);
  }catch(_){
    return { vectors: [] };
  }
}

function saveStore(store){
  fs.writeFileSync(RAG_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function cosineSimilarity(a=[], b=[]){
  let dot=0, na=0, nb=0;
  const len = Math.min(a.length, b.length);
  for(let i=0;i<len;i++){
    const x=a[i], y=b[i];
    dot += x*y; na += x*x; nb += y*y;
  }
  if(!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedText(text){
  const res = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return res.data[0].embedding;
}

function chunkText(text, maxChars=800){
  const chunks=[];
  let i=0;
  while(i < text.length){
    const slice = text.slice(i, i+maxChars);
    chunks.push(slice);
    i += maxChars;
  }
  return chunks;
}

// ===== RAG endpoints =====
// Upsert: { text: string, source?: string, namespace?: string }
app.post('/api/rag/upsert', async (req,res)=>{
  try{
    const text = (req.body?.text||'').toString();
    const source = (req.body?.source||'manual').toString();
    const namespace = (req.body?.namespace||'default').toString();
    if(!text.trim()) return res.status(400).json({ error: 'text required' });

    const chunks = chunkText(text);
    const results = [];

    if (dbEnabled()){
      await ensureTable();
      const pool = getPgPool();
      for(const content of chunks){
        const embedding = await embedText(content);
        const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        await pool.query(
          'INSERT INTO rag_vectors (id, namespace, source, content, embedding) VALUES ($1,$2,$3,$4,$5)',
          [id, namespace, source, content, JSON.stringify(embedding)]
        );
        results.push({ id, namespace, source, contentLength: content.length });
      }
      res.json({ upserted: results.length, items: results, storage: 'postgres' });
    } else {
      const store = loadStore();
      for(const content of chunks){
        const embedding = await embedText(content);
        const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        const item = { id, namespace, source, content, embedding };
        store.vectors.push(item);
        results.push({ id, namespace, source, contentLength: content.length });
      }
      saveStore(store);
      res.json({ upserted: results.length, items: results, storage: 'file' });
    }
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'upsert failed' });
  }
});

// Search: { query: string, k?: number, namespace?: string }
app.post('/api/rag/search', async (req,res)=>{
  try{
    const query = (req.body?.query||'').toString();
    const k = Number(req.body?.k||5);
    const namespace = (req.body?.namespace||'default').toString();
    if(!query.trim()) return res.status(400).json({ error: 'query required' });
    const qEmbedding = await embedText(query);
    if (dbEnabled()){
      await ensureTable();
      const pool = getPgPool();
      const { rows } = await pool.query('SELECT id, source, content, embedding FROM rag_vectors WHERE namespace=$1', [namespace]);
      const scored = rows.map(r=>({
        id: r.id,
        source: r.source,
        content: r.content,
        score: cosineSimilarity(qEmbedding, r.embedding)
      }))
      .sort((a,b)=>b.score-a.score)
      .slice(0, k);
      res.json({ matches: scored, storage: 'postgres' });
    } else {
      const store = loadStore();
      const items = store.vectors.filter(v=>v.namespace===namespace);
      const scored = items.map(v=>({
        id: v.id,
        source: v.source,
        content: v.content,
        score: cosineSimilarity(qEmbedding, v.embedding)
      }))
      .sort((a,b)=>b.score-a.score)
      .slice(0, k);
      res.json({ matches: scored, storage: 'file' });
    }
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'search failed' });
  }
});

// Simple language detector (Arabic vs English)
function detectLang(txt=''){
  const ar=/[\u0600-\u06FF]/.test(txt), en=/[A-Za-z]/.test(txt);
  if (en && !ar) return 'en';
  if (ar && !en) return 'ar';
  const last=(txt.match(/[\p{L}\p{N}]+/gu)||[]).pop()||'';
  return /[A-Za-z]/.test(last)?'en':'ar';
}

// Chatbot API endpoint (with retrieval)
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

    // Retrieve top-k context
    let contextBlocks = [];
    try{
      const ns = (req.body?.namespace||'default').toString();
      const qEmbedding = await embedText(last);
      if (dbEnabled()){
        await ensureTable();
        const pool = getPgPool();
        const { rows } = await pool.query('SELECT source, content, embedding FROM rag_vectors WHERE namespace=$1', [ns]);
        const top = rows.map(r=>({ r, score: cosineSimilarity(qEmbedding, r.embedding) }))
          .sort((a,b)=>b.score-a.score)
          .slice(0, Number(req.body?.k||5));
        contextBlocks = top.map(t=>`[${t.r.source}] ${t.r.content}`);
      } else {
        const store = loadStore();
        const items = store.vectors.filter(v=>v.namespace===ns);
        const top = items.map(v=>({ v, score: cosineSimilarity(qEmbedding, v.embedding) }))
          .sort((a,b)=>b.score-a.score)
          .slice(0, Number(req.body?.k||5));
        contextBlocks = top.map(t=>`[${t.v.source}] ${t.v.content}`);
      }
    }catch(e){ console.warn('RAG retrieval failed:', e.message); }

    const contextHeader = contextBlocks.length
      ? (lang==='en'
          ? `Use the following context to answer. If not relevant, say you don’t know.
Context:
${contextBlocks.join('\n\n')}`
          : `استخدم المعلومات التالية للإجابة. إذا لم تكن مناسبة، قل لا أعلم.
السياق:
${contextBlocks.join('\n\n')}`)
      : '';

    const messages = contextHeader
      ? [{role:'system', content: SYSTEM}, {role:'system', content: contextHeader}, ...msgs]
      : [{role:'system', content: SYSTEM}, ...msgs];

    // Create a chat completion
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3
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

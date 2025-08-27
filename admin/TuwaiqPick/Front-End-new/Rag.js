import { createClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "langchain/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { ConversationalRetrievalChain } from "langchain/chains";



// ======== مفاتيح مباشرة (غير آمن للمتصفح) ========
const SUPABASE_URL = "https://uidrnyzcqfvppglupbrm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZHJueXpjcWZ2cHBnbHVwYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Mzc2NjQsImV4cCI6MjA3MTUxMzY2NH0.AEOHzO3n4j3oEZ8WIw5_DA0NU9IOQCbsWHN8KXvaJ2s";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY_HERE";

// ======== إنشاء عميل Supabase ========
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ======== إعداد LangChain LLM ========
const llm = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0.7,
  openAIApiKey: OPENAI_API_KEY
});

// ======== RAG Class ديناميكي ========
export class DynamicRAG {
  constructor(userId) {
    this.userId = userId;
    this.chatHistory = [];
    this.chain = null;
  }

  async initialize() {
    // إنشاء Vector Store للـ RAG
    const vectorStore = new SupabaseVectorStore(supabase, {
      tableName: "documents",
      queryName: "match_documents"
    });

    this.chain = ConversationalRetrievalChain.fromLLM(
      llm,
      vectorStore.asRetriever(),
      { returnSourceDocuments: true, verbose: true }
    );

    console.log("Dynamic RAG Initialized!");
  }

  async loadData() {
    const { data: products } = await supabase.from("products").select("*");
    const { data: branches } = await supabase.from("branches").select("*");
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", this.userId);
    return { products, branches, invoices };
  }

  translateProductName(name) {
    const translations = {
      'Almarai_juice': 'عصير المراعي',
      'alrabie_juice': 'عصير الربيع',
      'Nadec_Mlik': 'حليب نادك',
      'Sun_top': 'صن توب',
      'barni': 'بارني',
      'biskrem': 'بسكريم',
      'loacker': 'لويكر',
      'oreos': 'أوريو',
      'galaxy': 'جالكسي',
      'green_skittles': 'سكيتلز أخضر',
      'kit_kat': 'كيت كات',
      'pink_skittles': 'سكيتلز وردي',
      'protein_bar': 'بروتين بار'
    };
    return translations[name] || name;
  }

  formatProducts(products) {
    if (!products || products.length === 0) return "لا توجد منتجات متوفرة.";
    return products.map((p, i) => `${i + 1}. ${this.translateProductName(p.name)} - ${p.price} ر.س`).join("\n");
  }

  formatBranches(branches) {
    if (!branches || branches.length === 0) return "لا توجد فروع متوفرة.";
    return branches.map((b, i) => `${i + 1}. ${b.name} - ${b.address}`).join("\n");
  }

  formatInvoices(invoices) {
    if (!invoices || invoices.length === 0) return "لا توجد فواتير لهذا المستخدم.";
    return invoices.map((inv, i) => `${i + 1}. ID: ${inv.id}, المجموع: ${inv.total_amount} ر.س, الحالة: ${inv.status}`).join("\n");
  }

  async askQuestion(question) {
    const data = await this.loadData();
    const lower = question.toLowerCase();

    // أسئلة المنتجات
    if (lower.includes("المنتجات") || lower.includes("products")) {
      return `المنتجات المتوفرة:\n${this.formatProducts(data.products)}`;
    }

    // أسئلة الفروع
    if (lower.includes("الفروع") || lower.includes("branches")) {
      return `الفروع المتوفرة:\n${this.formatBranches(data.branches)}`;
    }

    // أسئلة الفواتير
    if (lower.includes("الفواتير") || lower.includes("invoices")) {
      return `فواتيرك:\n${this.formatInvoices(data.invoices)}`;
    }

    // أسئلة عامة: استخدم RAG
    const response = await this.chain.call({
      question,
      chat_history: this.chatHistory
    });

    this.chatHistory.push([question, response.answer]);
    return response.answer;
  }

  clearHistory() {
    this.chatHistory = [];
  }
}

// ======== مثال سريع للاختبار ========
export async function runExample() {
  const rag = new DynamicRAG("abd7fa57-05e1-4128-bc8e-462d25bcdd66"); // user_id
  await rag.initialize();

  console.log(await rag.askQuestion("ما هي المنتجات؟"));
  console.log(await rag.askQuestion("أين الفروع؟"));
  console.log(await rag.askQuestion("أعطني فواتيري"));
  console.log(await rag.askQuestion("هل لدي عرض على Kit Kat؟"));
}

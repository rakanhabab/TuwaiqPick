// Simple RAG System for Tuwaiq Pick Platform
// This system provides intelligent responses about store information, products, and services

class TuwaiqRAG {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE';
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
    
    // Initialize knowledge base
    this.knowledgeBase = {
      store_info: {
        name: "طويق بيك (Tuwaiq Pick)",
        description: "منصة سعودية مبتكرة توفّر تجربة تسوّق ذاتي ذكية وسلسة",
        features: [
          "ذكاء اصطناعي لرصد المنتجات",
          "دفع تلقائي وآمن", 
          "إيصال رقمي فوري",
          "تجربة سلسة بدون طوابير"
        ],
        branches: [] // Will be loaded from Supabase
      },
      products: {
        available: [], // Will be loaded from Supabase
        categories: {}, // Will be loaded from Supabase
        products_data: []
      },
      services: {
        shopping_process: [
          "ابدأ بالباركود - اعرض باركود الدخول من حسابك عند بوابة المتجر",
          "اختر منتجاتك - تسوّق بحرّية، وسيتم رصد كل شيء تلقائيًا",
          "اخرج واستلم الفاتورة - بمجرد خروجك تصلك فاتورة رقمية فورًا"
        ],
        payment: "الدفع يتم تلقائياً عند الخروج من المتجر",
        support: "يمكن التواصل معنا عبر قسم 'تواصل معنا' في لوحة التحكم"
      },
      inventory: [] // Will be loaded from Supabase
    };
  }

  // Load data from Supabase
  async loadDataFromSupabase() {
    try {
      console.log('Loading data from Supabase...');
      
      // Load products
      const products = await supabaseService.getProducts();
      console.log('Products loaded:', products);
      
      if (products && products.length > 0) {
        this.knowledgeBase.products = {
          available: products.map(p => `${p.name} - ${p.price} ر.س`),
          categories: this.groupProductsByCategory(products),
          products_data: products
        };
        console.log('Products processed:', this.knowledgeBase.products.available);
      } else {
        console.log('No products found in database');
      }

      // Load branches
      const branches = await supabaseService.getBranches();
      console.log('Branches loaded:', branches);
      
      if (branches && branches.length > 0) {
        this.knowledgeBase.store_info.branches = branches.map(b => 
          `${b.name} (${b.address}) - الموقع: ${b.lat}, ${b.long}`
        );
      } else {
        console.log('No branches found in database');
      }

      // Load inventory for first branch (if exists)
      if (branches && branches.length > 0) {
        const inventory = await supabaseService.getProductInventory(branches[0].id);
        console.log('Inventory loaded:', inventory);
        
        if (inventory && inventory.length > 0) {
          this.knowledgeBase.inventory = inventory.map(item => ({
            product: item.products.name,
            quantity: item.quantity,
            price: item.products.price
          }));
        }
      }

      console.log('Data loaded from Supabase successfully');
      console.log('Current knowledge base:', this.knowledgeBase);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }
  }

  // Group products by category
  groupProductsByCategory(products) {
    const categories = {};
    products.forEach(product => {
      if (!categories[product.category]) {
        categories[product.category] = [];
      }
      categories[product.category].push(product.name);
    });
    return categories;
  }

  // Simple retrieval function
  retrieveRelevantInfo(query) {
    const queryLower = query.toLowerCase();
    const relevantInfo = [];

    // Check store information
    if (queryLower.includes('متجر') || queryLower.includes('طويق') || queryLower.includes('store')) {
      relevantInfo.push(this.knowledgeBase.store_info);
    }

    // Check products
    if (queryLower.includes('منتج') || queryLower.includes('product') || 
        queryLower.includes('توفر') || queryLower.includes('available')) {
      relevantInfo.push(this.knowledgeBase.products);
      
      // Add inventory information if available
      if (this.knowledgeBase.inventory && this.knowledgeBase.inventory.length > 0) {
        relevantInfo.push({ inventory: this.knowledgeBase.inventory });
      }
    }

    // Check branches
    if (queryLower.includes('فرع') || queryLower.includes('branch') || 
        queryLower.includes('موقع') || queryLower.includes('location')) {
      relevantInfo.push({ branches: this.knowledgeBase.store_info.branches });
    }

    // Check services
    if (queryLower.includes('خدمة') || queryLower.includes('service') || 
        queryLower.includes('طريقة') || queryLower.includes('how')) {
      relevantInfo.push(this.knowledgeBase.services);
    }

    return relevantInfo;
  }

  // Generate response using OpenAI API
  async generateResponse(query, context) {
    try {
      const contextText = JSON.stringify(context, null, 2);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `أنت مساعد ذكي لمنصة طويق بيك. أجب باللغة العربية بطريقة ودية ومفيدة. استخدم المعلومات المقدمة للإجابة على أسئلة المستخدمين.`
            },
            {
              role: 'user',
              content: `المعلومات المتاحة: ${contextText}\n\nسؤال المستخدم: ${query}`
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response:', error);
      return this.getFallbackResponse(query);
    }
  }

  // Fallback response when API fails
  getFallbackResponse(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('منتج') || queryLower.includes('توفر') || queryLower.includes('عدد')) {
      const products = this.knowledgeBase.products?.available || [];
      const inventory = this.knowledgeBase.inventory || [];
      
      console.log('Fallback response - Products available:', products);
      console.log('Fallback response - Inventory:', inventory);
      
      if (products.length > 0) {
        let response = `المنتجات المتوفرة في طويق بيك تشمل: ${products.join('، ')}.`;
        
        if (inventory.length > 0) {
          const availableProducts = inventory.filter(item => item.quantity > 0);
          if (availableProducts.length > 0) {
            response += `\n\nالمنتجات المتوفرة حالياً: ${availableProducts.map(item => `${item.product} (${item.quantity} قطعة)`).join('، ')}.`;
          }
        }
        
        return response;
      }
      
      // If no products loaded from Supabase, try to load them
      this.loadDataFromSupabase();
      return 'جاري تحميل قائمة المنتجات من قاعدة البيانات... يرجى المحاولة مرة أخرى بعد ثانية.\n\nملاحظة: إذا لم تظهر المنتجات، قد تكون قاعدة البيانات فارغة أو هناك مشكلة في الاتصال.';
    }
    
    if (queryLower.includes('فرع') || queryLower.includes('موقع')) {
      const branches = this.knowledgeBase.store_info?.branches || [];
      if (branches.length > 0) {
        return `فروع طويق بيك: ${branches.join('، ')}. يمكنك رؤية المواقع على الخريطة في لوحة التحكم.`;
      }
      return 'جاري تحميل معلومات الفروع من قاعدة البيانات... يرجى المحاولة مرة أخرى.\n\nملاحظة: إذا لم تظهر الفروع، قد تكون قاعدة البيانات فارغة أو هناك مشكلة في الاتصال.';
    }
    
    if (queryLower.includes('طريقة') || queryLower.includes('كيف')) {
      return `طريقة التسوق في طويق بيك: ${this.knowledgeBase.services.shopping_process.join('، ')}.`;
    }
    
    return 'مرحباً! كيف يمكنني مساعدتك في طويق بيك؟ يمكنني الإجابة عن المنتجات، الفروع، طريقة التسوق، وغيرها.';
  }

  // Main RAG function
  async answerQuestion(query) {
    console.log('Answering question:', query);
    
    // Step 1: Load fresh data from Supabase if needed
    await this.loadDataFromSupabase();
    
    // Step 2: Retrieve relevant information
    const relevantInfo = this.retrieveRelevantInfo(query);
    console.log('Relevant info:', relevantInfo);
    
    // Step 3: Generate response
    const response = await this.generateResponse(query, relevantInfo);
    console.log('Generated response:', response);
    
    return response;
  }
}

// Initialize RAG system
const tuwaiqRAG = new TuwaiqRAG();

// Initialize and load data from Supabase
async function initializeRAGSystem() {
  try {
    console.log('Initializing RAG system...');
    
    // Test connection first
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest) {
      console.error('Failed to connect to Supabase');
      return;
    }
    
    await tuwaiqRAG.loadDataFromSupabase();
    console.log('RAG system initialized with Supabase data');
    
    // Check if data was loaded successfully
    const productsCount = tuwaiqRAG.knowledgeBase.products?.available?.length || 0;
    const branchesCount = tuwaiqRAG.knowledgeBase.store_info?.branches?.length || 0;
    
    console.log(`Loaded ${productsCount} products and ${branchesCount} branches from Supabase`);
    
    if (productsCount === 0) {
      console.warn('No products found in database. Please add products to Supabase.');
    }
    
    if (branchesCount === 0) {
      console.warn('No branches found in database. Please add branches to Supabase.');
    }
  } catch (error) {
    console.error('Error initializing RAG system:', error);
  }
}

// Export for use in other files
window.tuwaiqRAG = tuwaiqRAG;
window.initializeRAGSystem = initializeRAGSystem; 
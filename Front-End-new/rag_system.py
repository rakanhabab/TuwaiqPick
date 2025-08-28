import os
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import aiohttp
import json

# AI / LangChain
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.schema import Document
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

# Supabase
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RAGConfig:
    openai_api_key: str
    supabase_url: str
    supabase_key: str
    model_name: str = os.getenv("MODEL_NAME", "gpt-3.5-turbo")
    temperature: float = float(os.getenv("MODEL_TEMPERATURE", "0.7"))
    max_tokens: int = int(os.getenv("MODEL_MAX_TOKENS", "1000"))
    chunk_size: int = 1000
    chunk_overlap: int = 200
    table_name: str = os.getenv("VECTOR_TABLE", "documents")
    query_name: str = os.getenv("VECTOR_QUERY_FN", "match_documents")

class SupabaseRAG:
    def __init__(self, config: RAGConfig):
        self.config = config
        self.supabase: Optional[Client] = None
        self.llm = None
        self.embeddings = None
        self.vector_store = None
        self.chain = None
        self.memory = None
        self._initialize()

    def _initialize(self):
        try:
            # Supabase
            self.supabase = create_client(self.config.supabase_url, self.config.supabase_key)
            logger.info("Supabase client initialized")

            # OpenAI
            self.llm = ChatOpenAI(
                model=self.config.model_name,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                openai_api_key=self.config.openai_api_key,
            )
            logger.info("OpenAI LLM initialized")

            # Embeddings
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=self.config.openai_api_key
            )
            logger.info("OpenAI Embeddings initialized")

            # Vector store
            self.vector_store = SupabaseVectorStore(
                client=self.supabase,
                embedding=self.embeddings,
                table_name=self.config.table_name,
                query_name=self.config.query_name
            )
            logger.info("Vector store initialized")

            # Conversational RAG chain
            self.memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                input_key="question",
                output_key="answer"
            )
            
            self.chain = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=self.vector_store.as_retriever(search_kwargs={"k": 5}),
                memory=self.memory,
                return_source_documents=True,
                verbose=True,
                output_key="answer"
            )
            logger.info("Conversational chain initialized")

        except Exception as e:
            logger.error(f"Error initializing RAG system: {e}")
            raise

    def get_smart_response(self, question: str, user_name: Optional[str] = None) -> Optional[str]:
        """Get smart responses for general and site-related questions"""
        if not question:
            return None
            
        q = question.lower().strip()
        hello = f"أهلاً {user_name}!" if user_name else "أهلاً وسهلاً!"
        
        logger.info(f"Checking smart response for: '{q}'")
        
        # Check if any keyword matches
        keywords = ["اهلا", "أهلا", "مرحبا", "السلام عليكم", "hello", "hi", "مرحبتين", "هلا", "أهلين"]
        for keyword in keywords:
            if keyword in q:
                logger.info(f"Found keyword: '{keyword}' in '{q}'")
                response = f"{hello} كيف حالك؟ أنا صديق، مساعدك الذكي في دكان فجن، سعيد بلقائك."
                logger.info(f"Returning smart response: {response}")
                return response

        # 🔹 التحيات والوداع
        if any(w in q for w in ["اهلا", "أهلا", "مرحبا", "السلام عليكم", "hello", "hi", "مرحبتين", "هلا", "أهلين"]):
            return f"{hello} كيف حالك؟ أنا صديق، مساعدك الذكي في دكان فجن، سعيد بلقائك."
        if any(w in q for w in ["مع السلامة", "إلى اللقاء", "goodbye", "bye", "سلام", "باي"]):
            return "وداعاً! نتمنى لك يوماً سعيداً."
        if any(w in q for w in ["كيف الحال", "كيف حالك", "how are you", "شخبارك", "شلونك", "كيفك"]):
            return f"الحمد لله بخير {user_name or ''}. كيف أقدر أساعدك اليوم؟"
        if any(w in q for w in ["شكرا", "شكراً", "thank you", "thanks", "مشكور", "تسلم"]):
            return f"العفو {user_name or ''}! سعيد بمساعدتك."
        
        # 🔹 عن المساعد نفسه
        if any(w in q for w in ["اسمك", "your name", "من انت", "من أنت", "وش اسمك", "ما اسمك"]):
            return "أنا صديق، مساعدك الذكي في دكان فجن. أساعدك في التسوق والإجابة على أسئلتك."
        
        # 🔹 عن المستخدم
        if any(w in q for w in ["وش اسمي", "ما اسمي", "اسمي", "my name", "who am i", "من أنا"]):
            if user_name and user_name != "مستخدم":
                return f"اسمك {user_name} 😊"
            else:
                return "عذراً، لا أعرف اسمك. هل يمكنك إخباري باسمك؟"
        if any(w in q for w in ["وش تقدر تسوي", "what can you do", "قدراتك", "وش تسوي", "إيش تقدر"]):
            return "أساعدك في: البحث عن المنتجات، معرفة الفروع، طرق الدفع، الفواتير، إلخ."
        
        # 🔹 عن دكان فجن
        if any(w in q for w in ["دكان فجن", "الشركة", "company", "المتجر", "المنصة"]):
            return f"دكان فجن {hello} منصة سعودية مبتكرة تقدم تجربة تسوق ذكية؛ تدخل، تختار منتجاتك، وتخرج بدون الحاجة للوقوف عند الكاشير."
        if any(w in q for w in ["qr", "كيو آر", "باركود", "كود"]):
            return "في دكان فجن تبدأ رحلتك بمسح كود QR، ومن ثم يمكنك التسوق بحرية والدفع يتم بشكل تلقائي وسلس عند المغادرة."

        elif any(w in q for w in ["ذكاء اصطناعي", "ai", "artificial intelligence", "الذكاء"]):
            return "نستخدم تقنيات الذكاء الاصطناعي لتتبع المشتريات، تخصيص العروض، وضمان تجربة سلسة بدون تدخل يدوي."

        elif any(w in q for w in ["آلة بيع", "ماكينة", "vending machine", "ماكينات"]):
            return "آلاتنا ليست مجرد ماكينات بيع تقليدية؛ بل هي منصات ذكية تتيح لك الدخول، اختيار المنتجات، والخروج والدفع مباشرة بدون انتظار."

        # 🔹 طرق الشراء والدفع
        if any(w in q for w in ["كيف أشتري", "طريقة الدفع", "كيف أستخدم", "طريقة الشراء", "وش تقدم المنصة", "الخدمات"]):
            return f"دكان فجن {hello} يقدم: 1) تسوق سريع عبر QR، 2) منتجات متنوعة (مشروبات، وجبات خفيفة)، 3) دفع إلكتروني آمن، 4) فروع 24/7، 5) تجربة ذكية مخصصة."
        if any(w in q for w in ["كيف ادفع", "طرق الدفع", "payment", "دفع"]):
            return "ندعم في دكان فجن: مدى/بطاقات، Apple Pay/Google Pay، نقداً، وSTC Pay."
        
        # 🔹 الفروع والمواقع
        if any(w in q for w in ["أين الفروع", "وين موقعكم", "فروع", "branches", "locations"]):
            return f"لدينا فروع دكان فجن في الرياض وجدة والدمام والخبر والمدينة {hello}."
        if any(w in q for w in ["متى تفتحون", "ساعات العمل", "open"]):
            return "فروع دكان فجن تعمل 24/7 لتوفير الخدمة على مدار الساعة."
        if any(w in q for w in ["كم الأسعار", "price", "السعر", "التكلفة"]):
            return f"أسعار دكان فجن {hello} تتراوح من 2.50 ر.س إلى 8.00 ر.س حسب المنتج."
        
        # 🔹 معلومات عامة
        if any(w in q for w in ["الطقس", "weather"]):
            return "ما أقدر أجيب الطقس الآن، لكن أقدر أساعدك في التسوق من دكان فجن."
        if any(w in q for w in ["التاريخ", "date", "اليوم"]):
            return f"التاريخ: {datetime.now().strftime('%Y/%m/%d')}"
        
        # 🔹 أسئلة المنتجات الذكية
        if any(w in q for w in ["اعلى سعر", "أعلى سعر", "اغلى", "أغلى", "أعلى تكلفة", "اعلى تكلفة", "highest price", "most expensive"]):
            return "smart_product_query: highest_price"
        if any(w in q for w in ["اقل سعر", "أقل سعر", "ارخص", "أرخص", "أقل تكلفة", "اقل تكلفة", "lowest price", "cheapest"]):
            return "smart_product_query: lowest_price"
        if any(w in q for w in ["اعلى كالوري", "أعلى كالوري", "أعلى سعرات", "اعلى سعرات", "highest calories", "most calories"]):
            return "smart_product_query: highest_calories"
        
        # 🔹 أسئلة السعرات الحرارية
        if any(w in q for w in ["كم فيه سعرة", "كم سعرة", "كم سعرات", "كم سعرات حرارية", "calories", "سعرات حرارية", "سعرة حرارية"]):
            return "smart_product_query: all_calories"
        
        # 🔹 أسئلة محددة للمنتجات
        if any(w in q for w in ["كم سعر العصير", "سعر العصير", "تكلفة العصير", "price of juice"]):
            return "smart_product_query: juice_prices"
        if any(w in q for w in ["كم سعر الحليب", "سعر الحليب", "تكلفة الحليب", "price of milk"]):
            return "smart_product_query: milk_prices"
        if any(w in q for w in ["كم سعر الشوكولاتة", "سعر الشوكولاتة", "تكلفة الشوكولاتة", "price of chocolate"]):
            return "smart_product_query: chocolate_prices"
        
        # 🔹 نطاق المعرفة
        if any(w in q for w in ["نطاق معرفتك", "نطاق المعرفة", "قدراتك", "وش تقدر", "إيش تقدر"]):
            return f"نطاق معرفتي {hello} يتركز على دكان فجن: المنتجات، الفروع، الفواتير، طرق الدفع، الخدمات، والتسوق الذكي. يمكنني مساعدتك في أي استفسار حول خدماتنا."
        
        # 🔹 السياق والمنصة
        if any(w in q for w in ["المنصة", "platform", "السياق", "context"]):
            return f"المنصة التي أتحدث عنها هي دكان فجن {hello} - منصة التسوق الذكي السعودية. نحن نقدم خدمات البيع الآلي الذكي مع تجربة دفع سريعة وآمنة."
        
        # 🔹 مقارنة الأسعار
        if any(w in q for w in ["قارن", "مقارنة", "مقارنه", "compare", "competition", "منافسة", "منافسين", "الاسواق", "متجر اخر", "متجر آخر"]):
            return "smart_product_query: price_comparison"
        
        # 🔹 أسئلة معلومات المنتجات
        product_keywords = ["عصير المراعي", "عصير الربيع", "بارني", "بسكريم", "جالكسي", "سكيتلز", "كيت كات", "لويكر", "حليب نادك", "أوريو", "بروتين بار", "صن توب"]
        for product in product_keywords:
            if product.lower() in q:
                return f"smart_product_query: product_info:{product}"
        
        return None

    def translate_product_name(self, name: str) -> str:
        """Translate product name from English to Arabic"""
        translations = {
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
        }
        return translations.get(name, name)

    def format_products(self, products: List[Dict], show_prices: bool = True) -> str:
        """Format products for display"""
        if not products:
            return "لا توجد منتجات متوفرة."
        out = []
        for i, p in enumerate(products, 1):
            name = self.translate_product_name(p.get('name', ''))
            if show_prices:
                price = p.get('price', 0)
                out.append(f"{i}. {name} - {price} ر.س")
            else:
                out.append(f"{i}. {name}")
        return "\n".join(out)
    
    def get_highest_price_product(self, products: List[Dict]) -> Dict:
        """Get product with highest price"""
        if not products:
            return {}
        return max(products, key=lambda x: x.get('price', 0))
    
    def get_lowest_price_product(self, products: List[Dict]) -> Dict:
        """Get product with lowest price"""
        if not products:
            return {}
        return min(products, key=lambda x: x.get('price', 0))
    
    def get_highest_calorie_product(self, products: List[Dict]) -> Dict:
        """Get product with highest calories"""
        if not products:
            return {}
        return max(products, key=lambda x: x.get('calories', 0))

    async def get_product_info_from_web(self, product_name: str) -> str:
        """Get additional product information from web search"""
        try:
            # Use OpenAI to get product information
            prompt = f"""
            أعطني معلومات مفيدة ومختصرة عن المنتج التالي: {product_name}
            
            أريد معلومات عن:
            - المكونات الرئيسية
            - الفوائد الصحية
            - القيمة الغذائية
            - نصائح للاستهلاك
            - معلومات عامة مثيرة للاهتمام
            
            اكتب الإجابة باللغة العربية وبشكل مختصر ومفيد.
            """
            
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "أنت مساعد متخصص في معلومات المنتجات الغذائية. أعط معلومات دقيقة ومفيدة."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error getting product info from web: {e}")
            return "عذراً، لا يمكنني جلب معلومات إضافية عن هذا المنتج حالياً."

    def format_branches(self, branches: List[Dict]) -> str:
        """Format branches for display"""
        if not branches:
            return "لا توجد فروع متوفرة."
        out = []
        for i, b in enumerate(branches, 1):
            out.append(f"{i}. {b.get('name','')} - {b.get('address','')}")
        return "\n".join(out)

    def format_invoices(self, invoices: List[Dict]) -> str:
        """Format invoices for display"""
        if not invoices:
            return "لا توجد فواتير لهذا المستخدم."
        out = []
        for i, inv in enumerate(invoices, 1):
            out.append(f"{i}. ID: {inv.get('id','')}, المجموع: {inv.get('total_amount',0)} ر.س, الحالة: {inv.get('status','')}")
        return "\n".join(out)

    async def ask_question(self, question: str, user_id: Optional[str] = None, user_name: Optional[str] = None):
        try:
            if not question or not question.strip():
                return {
                    "answer": "يرجى إدخال سؤال صحيح.",
                    "source": "validation_error",
                    "confidence": 0.0
                }
            
            question = question.strip()
            logger.info(f"Question: '{question}'")
            logger.info(f"User ID: {user_id}")
            logger.info(f"User name: {user_name}")
            
            # First check for smart responses
            smart_response = self.get_smart_response(question, user_name)
            logger.info(f"Smart response: {smart_response}")
            
            if smart_response:
                logger.info(f"Smart response: {smart_response}")
                
                # Handle smart product queries
                if smart_response.startswith("smart_product_query:"):
                    query_type = smart_response.split(":")[1].strip()
                    data = await self.load_database_data(user_id)
                    products = data['products']
                    
                    if query_type == "highest_price":
                        product = self.get_highest_price_product(products)
                        if product:
                            name = self.translate_product_name(product.get('name', ''))
                            price = product.get('price', 0)
                            return {
                                "answer": f"أعلى سعر في دكان فجن هو {name} بسعر {price} ر.س",
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "lowest_price":
                        product = self.get_lowest_price_product(products)
                        if product:
                            name = self.translate_product_name(product.get('name', ''))
                            price = product.get('price', 0)
                            return {
                                "answer": f"أقل سعر في دكان فجن هو {name} بسعر {price} ر.س",
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "highest_calories":
                        product = self.get_highest_calorie_product(products)
                        if product:
                            name = self.translate_product_name(product.get('name', ''))
                            calories = product.get('calories', 0)
                            return {
                                "answer": f"أعلى سعرات حرارية في دكان فجن هو {name} بـ {calories} سعرة حرارية",
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "juice_prices":
                        juice_products = [p for p in products if "عصير" in self.translate_product_name(p.get('name', '')).lower()]
                        if juice_products:
                            result = "أسعار العصائر في دكان فجن:\n"
                            for product in juice_products:
                                name = self.translate_product_name(product.get('name', ''))
                                price = product.get('price', 0)
                                result += f"• {name}: {price} ر.س\n"
                            return {
                                "answer": result,
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "milk_prices":
                        milk_products = [p for p in products if "حليب" in self.translate_product_name(p.get('name', '')).lower()]
                        if milk_products:
                            result = "أسعار الحليب في دكان فجن:\n"
                            for product in milk_products:
                                name = self.translate_product_name(product.get('name', ''))
                                price = product.get('price', 0)
                                result += f"• {name}: {price} ر.س\n"
                            return {
                                "answer": result,
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "chocolate_prices":
                        chocolate_products = [p for p in products if any(w in self.translate_product_name(p.get('name', '')).lower() for w in ["بارني", "جالكسي", "كيت كات", "أوريو"])]
                        if chocolate_products:
                            result = "أسعار الشوكولاتة في دكان فجن:\n"
                            for product in chocolate_products:
                                name = self.translate_product_name(product.get('name', ''))
                                price = product.get('price', 0)
                                result += f"• {name}: {price} ر.س\n"
                            return {
                                "answer": result,
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "all_calories":
                        # Filter products that have calories data
                        products_with_calories = [p for p in products if p.get('calories', 0) > 0]
                        if products_with_calories:
                            result = "السعرات الحرارية للمنتجات في دكان فجن:\n"
                            for product in products_with_calories:
                                name = self.translate_product_name(product.get('name', ''))
                                calories = product.get('calories', 0)
                                result += f"• {name}: {calories} سعرة حرارية\n"
                            return {
                                "answer": result,
                                "source": "database",
                                "confidence": 1.0
                            }
                        else:
                            return {
                                "answer": "عذراً، لا تتوفر معلومات السعرات الحرارية للمنتجات حالياً.",
                                "source": "database",
                                "confidence": 1.0
                            }
                    
                    elif query_type == "price_comparison":
                        # Create a price comparison response
                        result = "مقارنة أسعار دكان فجن مع المتاجر الأخرى:\n\n"
                        result += "🏪 **دكان فجن:**\n"
                        result += "• أسعار تنافسية تتراوح من 2.50 ر.س إلى 8.00 ر.س\n"
                        result += "• لا توجد رسوم إضافية أو عمولات\n"
                        result += "• دفع إلكتروني آمن وسريع\n"
                        result += "• خدمة 24/7 بدون انتظار\n\n"
                        
                        result += "🛒 **المتاجر التقليدية:**\n"
                        result += "• أسعار مماثلة أو أعلى قليلاً\n"
                        result += "• قد توجد رسوم توصيل إضافية\n"
                        result += "• وقت انتظار في الطوابير\n"
                        result += "• ساعات عمل محدودة\n\n"
                        
                        result += "💡 **مزايا دكان فجن:**\n"
                        result += "• تجربة تسوق سريعة ومريحة\n"
                        result += "• توفير الوقت والجهد\n"
                        result += "• تقنيات ذكية متطورة\n"
                        result += "• أسعار شفافة بدون مفاجآت"
                        
                        return {
                            "answer": result,
                            "source": "smart_response",
                            "confidence": 1.0
                        }
                    
                    elif query_type.startswith("product_info:"):
                        product_name = query_type.split(":", 1)[1]
                        # Get basic product info from database
                        data = await self.load_database_data(user_id)
                        products = data['products']
                        
                        # Find the product in database
                        product_info = None
                        for product in products:
                            if product_name.lower() in self.translate_product_name(product.get('name', '')).lower():
                                product_info = product
                                break
                        
                        if product_info:
                            # Get additional info from web
                            web_info = await self.get_product_info_from_web(product_name)
                            
                            result = f"📦 **معلومات {product_name}:**\n\n"
                            result += f"💰 **السعر:** {product_info.get('price', 0)} ر.س\n"
                            if product_info.get('calories', 0) > 0:
                                result += f"🔥 **السعرات الحرارية:** {product_info.get('calories', 0)} سعرة حرارية\n"
                            result += f"\n📚 **معلومات إضافية:**\n{web_info}"
                            
                            return {
                                "answer": result,
                                "source": "database_and_web",
                                "confidence": 1.0
                            }
                        else:
                            # Product not found in database, but get web info anyway
                            web_info = await self.get_product_info_from_web(product_name)
                            result = f"📦 **معلومات {product_name}:**\n\n"
                            result += f"📚 **معلومات من الإنترنت:**\n{web_info}"
                            
                            return {
                                "answer": result,
                                "source": "web_only",
                                "confidence": 0.8
                            }
                
                return {
                    "answer": smart_response,
                    "source": "smart_response",
                    "confidence": 1.0
                }
            
            logger.info("No smart response found, checking database queries...")
            
            # Check for specific data queries with better context understanding
            q_lower = question.lower()
            
            # Products queries - Smart handling
            if any(k in q_lower for k in ["المنتجات", "products", "product", "وش المنتجات", "ما هي المنتجات", "عرض المنتجات"]):
                data = await self.load_database_data(user_id)
                # Show only names if asking about products generally
                if any(w in q_lower for w in ["المنتجات", "products", "product"]):
                    return {
                        "answer": f"المنتجات المتوفرة في دكان فجن:\n{self.format_products(data['products'], show_prices=False)}",
                        "source": "database",
                        "confidence": 1.0
                    }
                else:
                    return {
                        "answer": f"المنتجات المتوفرة في دكان فجن:\n{self.format_products(data['products'], show_prices=True)}",
                        "source": "database",
                        "confidence": 1.0
                    }
            
            # Prices queries
            if any(k in q_lower for k in ["الاسعار", "prices", "price", "كم السعر", "كم الاسعار", "التكلفة", "cost"]):
                data = await self.load_database_data(user_id)
                return {
                    "answer": f"أسعار المنتجات في دكان فجن:\n{self.format_products(data['products'], show_prices=True)}",
                    "source": "database",
                    "confidence": 1.0
                }
            
            # Specific product queries (price or info)
            product_keywords = ["عصير المراعي", "عصير الربيع", "بارني", "بسكريم", "جالكسي", "سكيتلز", "كيت كات", "لويكر", "حليب نادك", "أوريو", "بروتين بار", "صن توب"]
            
            # Check if asking about specific product
            for product in product_keywords:
                if product.lower() in q_lower:
                    # If asking about price specifically
                    if any(k in q_lower for k in ["كم سعر", "سعر", "تكلفة", "بكم"]):
                        data = await self.load_database_data(user_id)
                        products = data['products']
                        
                        # Find the product
                        product_info = None
                        for p in products:
                            if product.lower() in self.translate_product_name(p.get('name', '')).lower():
                                product_info = p
                                break
                        
                        if product_info:
                            name = self.translate_product_name(product_info.get('name', ''))
                            price = product_info.get('price', 0)
                            return {
                                "answer": f"سعر {name}: {price} ر.س",
                                "source": "database",
                                "confidence": 1.0
                            }
                        else:
                            return {
                                "answer": f"عذراً، لا أجد {product} في قاعدة البيانات.",
                                "source": "database",
                                "confidence": 1.0
                            }
                    else:
                        # Asking for general info about the product
                        web_info = await self.get_product_info_from_web(product)
                        result = f"📦 **معلومات {product}:**\n\n"
                        result += f"📚 **معلومات من الإنترنت:**\n{web_info}"
                        
                        return {
                            "answer": result,
                            "source": "web_only",
                            "confidence": 0.8
                        }
            
            # Branches queries
            if any(k in q_lower for k in ["الفروع", "branches", "branch", "وين الفروع", "أين الفروع", "مواقع الفروع", "فروعكم"]):
                data = await self.load_database_data(user_id)
                return {
                    "answer": f"فروع دكان فجن المتوفرة:\n{self.format_branches(data['branches'])}",
                    "source": "database",
                    "confidence": 1.0
                }
            
            # Invoices queries - check for user-specific questions
            if any(k in q_lower for k in ["فواتيري", "فواتيري", "invoices", "invoice", "كم عدد فواتيري", "عرض فواتيري", "فواتيري"]):
                if user_id:
                    data = await self.load_database_data(user_id)
                    invoice_count = len(data['invoices'])
                    if invoice_count > 0:
                        return {
                            "answer": f"لديك {invoice_count} فواتير:\n{self.format_invoices(data['invoices'])}",
                            "source": "database",
                            "confidence": 1.0
                        }
                    else:
                        return {
                            "answer": "لا توجد فواتير لك حتى الآن.",
                            "source": "database",
                            "confidence": 1.0
                        }
                else:
                    return {
                        "answer": "عذراً، لا يمكنني عرض فواتيرك بدون تسجيل الدخول. يرجى تسجيل الدخول أولاً.",
                        "source": "user_auth_required",
                        "confidence": 1.0
                    }
            
            # General invoices query (not user-specific)
            if any(k in q_lower for k in ["الفواتير", "invoices", "invoice"]) and not any(k in q_lower for k in ["فواتيري", "فواتيري"]):
                data = await self.load_database_data(user_id)
                return {
                    "answer": f"معلومات عن الفواتير في دكان فجن:\n{self.format_invoices(data['invoices'])}",
                    "source": "database",
                    "confidence": 1.0
                }
            
            # Use RAG for other questions
            try:
                resp = await self.chain.ainvoke({"question": question})
                return {
                    "answer": resp.get("answer", "عذراً، لا أستطيع الإجابة على هذا السؤال."),
                    "source": "rag",
                    "confidence": 0.8,
                    "source_documents": resp.get("source_documents", [])
                }
            except Exception as e:
                logger.error(f"Error in RAG chain: {e}")
                return {
                    "answer": "عذراً، لا أستطيع الإجابة على هذا السؤال.",
                    "source": "rag_error",
                    "confidence": 0.0
                }
                
        except Exception as e:
            logger.error(f"Error in ask_question: {e}")
            import traceback
            traceback.print_exc()
            return {"answer": "عذراً، حدث خطأ في معالجة سؤالك.", "source": "error", "confidence": 0.0}

    async def add_documents(self, documents: List[Dict[str, Any]]) -> bool:
        try:
            docs = []
            for doc in documents:
                content = doc.get('content', '')
                metadata = doc.get('metadata', {}) or {}
                metadata.setdefault('timestamp', datetime.now().isoformat())
                docs.append(Document(page_content=content, metadata=metadata))

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.config.chunk_size,
                chunk_overlap=self.config.chunk_overlap
            )
            split_docs = splitter.split_documents(docs)
            self.vector_store.add_documents(split_docs)
            logger.info(f"Added {len(split_docs)} chunks to vector store")
            return True
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            return False

    async def load_database_data(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        try:
            data: Dict[str, Any] = {}
            data['products'] = self.supabase.table("products").select("*").execute().data or []
            data['branches'] = self.supabase.table("branches").select("*").execute().data or []
            q = self.supabase.table("invoices").select("*")
            if user_id: q = q.eq("user_id", user_id)
            data['invoices'] = q.execute().data or []
            return data
        except Exception as e:
            logger.error(f"Error loading DB: {e}")
            return {"products": [], "branches": [], "invoices": []}

    async def add_knowledge_base(self, knowledge_data: List[Dict[str, Any]]) -> bool:
        """Add knowledge base documents to the system"""
        try:
            docs = []
            for item in knowledge_data:
                docs.append({
                    "content": item.get("content", ""),
                    "metadata": {
                        "type": item.get("type", "general"),
                        "category": item.get("category", "unknown"),
                        "source": item.get("source", "manual"),
                        "timestamp": datetime.now().isoformat(),
                    }
                })
            return await self.add_documents(docs)
        except Exception as e:
            logger.error(f"Error adding knowledge base: {e}")
            return False

    def clear_memory(self, user_id: Optional[str] = None):
        """Clear conversation memory"""
        try:
            if self.memory:
                self.memory.clear()
                logger.info("Conversation memory cleared")
        except Exception as e:
            logger.error(f"Error clearing memory: {e}")

    async def get_conversation_history(self, user_id: Optional[str] = None) -> List[Dict[str, str]]:
        """Get conversation history"""
        try:
            if self.memory and hasattr(self.memory, 'chat_memory'):
                return self.memory.chat_memory.messages
            return []
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

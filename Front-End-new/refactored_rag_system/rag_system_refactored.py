import logging
from typing import Dict, List, Any, Optional
from config import RAGConfig
from db_service import DatabaseService
from smart_service import SmartResponseService
from rag_service import RAGService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RefactoredSupabaseRAG:
    """
    Refactored RAG system using modular design and configuration-based approach.
    
    This implementation addresses the maintainability issues by:
    1. Using configuration files instead of hardcoded if-else blocks
    2. Modular design with separate services
    3. Per-user memory management
    4. Cleaner separation of concerns
    """
    
    def __init__(self, config: RAGConfig):
        self.config = config
        self.db_service = DatabaseService(config.supabase_url, config.supabase_key)
        self.smart_service = SmartResponseService()
        self.rag_service = RAGService(config)
        logger.info("Refactored RAG system initialized")

    async def ask_question(self, question: str, user_id: Optional[str] = None, user_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Main question processing method using the modular approach.
        
        This replaces the original monolithic ask_question method with a cleaner,
        more maintainable implementation.
        """
        try:
            if not question or not question.strip():
                return {
                    "answer": "يرجى إدخال سؤال صحيح.",
                    "source": "validation_error",
                    "confidence": 0.0
                }
            
            question = question.strip()
            logger.info(f"Processing question: '{question}' for user {user_id}")
            
            # Step 1: Check for smart responses (configuration-based)
            smart_response = self.smart_service.get_smart_response(question, user_name)
            if smart_response:
                # Save to memory for context awareness
                await self._save_to_memory(question, smart_response, user_id)
                return {
                    "answer": smart_response,
                    "source": "smart_response",
                    "confidence": 1.0
                }
            
            # Step 2: Check for smart product queries
            smart_product_query = self.smart_service.get_smart_product_query(question)
            if smart_product_query:
                result = await self._handle_smart_product_query(smart_product_query, user_id)
                # Save to memory for context awareness
                await self._save_to_memory(question, result["answer"], user_id)
                return result
            
            # Step 3: Check for database queries
            db_query = self.smart_service.get_database_query(question)
            if db_query:
                result = await self._handle_database_query(db_query, question, user_id)
                # Save to memory for context awareness
                await self._save_to_memory(question, result["answer"], user_id)
                return result
            
            # Step 4: Use RAG for everything else
            return await self.rag_service.ask_rag(question, user_id)
            
        except Exception as e:
            logger.error(f"Error in ask_question: {e}")
            return {
                "answer": "عذراً، حدث خطأ في معالجة سؤالك.",
                "source": "error",
                "confidence": 0.0
            }

    async def _handle_smart_product_query(self, query_type: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Handle smart product queries using database service"""
        try:
            products = await self.db_service.get_products()
            
            if query_type == "smart_product_query: highest_price":
                product = self.smart_service.get_highest_price_product(products)
                if product:
                    name = self.smart_service.translate_product_name(product.get('name', ''))
                    price = product.get('price', 0)
                    return {
                        "answer": f"أعلى سعر في دكان فجن هو {name} بسعر {price} ر.س",
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: lowest_price":
                product = self.smart_service.get_lowest_price_product(products)
                if product:
                    name = self.smart_service.translate_product_name(product.get('name', ''))
                    price = product.get('price', 0)
                    return {
                        "answer": f"أقل سعر في دكان فجن هو {name} بسعر {price} ر.س",
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: highest_calories":
                product = self.smart_service.get_highest_calorie_product(products)
                if product:
                    name = self.smart_service.translate_product_name(product.get('name', ''))
                    calories = product.get('calories', 0)
                    return {
                        "answer": f"أعلى سعرات حرارية في دكان فجن هو {name} بـ {calories} سعرة حرارية",
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: juice_prices":
                juice_products = [p for p in products if "عصير" in self.smart_service.translate_product_name(p.get('name', '')).lower()]
                if juice_products:
                    result = "أسعار العصائر في دكان فجن:\n"
                    for product in juice_products:
                        name = self.smart_service.translate_product_name(product.get('name', ''))
                        price = product.get('price', 0)
                        result += f"• {name}: {price} ر.س\n"
                    return {
                        "answer": result,
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: milk_prices":
                milk_products = [p for p in products if "حليب" in self.smart_service.translate_product_name(p.get('name', '')).lower()]
                if milk_products:
                    result = "أسعار الحليب في دكان فجن:\n"
                    for product in milk_products:
                        name = self.smart_service.translate_product_name(product.get('name', ''))
                        price = product.get('price', 0)
                        result += f"• {name}: {price} ر.س\n"
                    return {
                        "answer": result,
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: chocolate_prices":
                chocolate_products = [p for p in products if any(w in self.smart_service.translate_product_name(p.get('name', '')).lower() for w in ["بارني", "جالكسي", "كيت كات", "أوريو"])]
                if chocolate_products:
                    result = "أسعار الشوكولاتة في دكان فجن:\n"
                    for product in chocolate_products:
                        name = self.smart_service.translate_product_name(product.get('name', ''))
                        price = product.get('price', 0)
                        result += f"• {name}: {price} ر.س\n"
                    return {
                        "answer": result,
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: chips_prices":
                chips_products = [p for p in products if any(w in self.smart_service.translate_product_name(p.get('name', '')).lower() for w in ["شيبس", "برينجلز", "lays", "pringles"])]
                if chips_products:
                    result = "أسعار المقرمشات والشيبس في دكان فجن:\n"
                    for product in chips_products:
                        name = self.smart_service.translate_product_name(product.get('name', ''))
                        price = product.get('price', 0)
                        result += f"• {name}: {price} ر.س\n"
                    return {
                        "answer": result,
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "smart_product_query: all_calories":
                products_with_calories = [p for p in products if p.get('calories', 0) > 0]
                if products_with_calories:
                    result = "السعرات الحرارية للمنتجات في دكان فجن:\n"
                    for product in products_with_calories:
                        name = self.smart_service.translate_product_name(product.get('name', ''))
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
            
            elif query_type == "smart_product_query: price_comparison":
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
            
            elif query_type == "smart_product_query: context_pronoun":
                # Handle context-aware questions with pronouns
                return await self._handle_context_pronoun_query(products, user_id)
            
            elif query_type.startswith("smart_product_query: product_info:"):
                product_name = query_type.split(":", 1)[1]
                
                # Find the product in database
                product_info = None
                for product in products:
                    if product_name.lower() in self.smart_service.translate_product_name(product.get('name', '')).lower():
                        product_info = product
                        break
                
                if product_info:
                    # Get additional info from web
                    web_info = await self.rag_service.get_product_info_from_web(product_name)
                    
                    result = f"📦 **معلومات {product_name}:**\n\n"
                    result += f"💰 **السعر:** {product_info.get('price', 0)} ر.س\n"
                    if product_info.get('calories', 0) > 0:
                        result += f"🔥 **السعرات الحرارية:** {product_info.get('calories', 0)} سعرة حرارية\n"
                    result += f"\n{web_info}"
                    
                    return {
                        "answer": result,
                        "source": "database_and_web",
                        "confidence": 1.0
                    }
                else:
                    # Product not found in database, but get web info anyway
                    web_info = await self.rag_service.get_product_info_from_web(product_name)
                    result = f"📦 **معلومات {product_name}:**\n\n"
                    result += f"{web_info}"
                    
                    return {
                        "answer": result,
                        "source": "web_only",
                        "confidence": 0.8
                    }
            
            return {
                "answer": "عذراً، لا أستطيع معالجة هذا النوع من الاستعلام.",
                "source": "unknown_query",
                "confidence": 0.0
            }
            
        except Exception as e:
            logger.error(f"Error handling smart product query: {e}")
            return {
                "answer": "عذراً، حدث خطأ في معالجة استعلام المنتج.",
                "source": "error",
                "confidence": 0.0
            }

    async def _handle_database_query(self, query_type: str, question: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Handle database queries using database service"""
        try:
            q_lower = question.lower()
            
            if query_type == "products":
                products = await self.db_service.get_products()
                # Show only names if asking about products generally
                if any(w in q_lower for w in ["المنتجات", "products", "product"]):
                    return {
                        "answer": f"المنتجات المتوفرة في دكان فجن:\n{self.smart_service.format_products(products, show_prices=False)}",
                        "source": "database",
                        "confidence": 1.0
                    }
                else:
                    return {
                        "answer": f"المنتجات المتوفرة في دكان فجن:\n{self.smart_service.format_products(products, show_prices=True)}",
                        "source": "database",
                        "confidence": 1.0
                    }
            
            elif query_type == "prices":
                products = await self.db_service.get_products()
                return {
                    "answer": f"أسعار المنتجات في دكان فجن:\n{self.smart_service.format_products(products, show_prices=True)}",
                    "source": "database",
                    "confidence": 1.0
                }
            
            elif query_type == "branches":
                branches = await self.db_service.get_branches()
                return {
                    "answer": f"فروع دكان فجن المتوفرة:\n{self.smart_service.format_branches(branches)}",
                    "source": "database",
                    "confidence": 1.0
                }
            
            elif query_type == "user_invoices":
                if user_id:
                    invoices = await self.db_service.get_invoices(user_id)
                    invoice_count = len(invoices)
                    if invoice_count > 0:
                        return {
                            "answer": f"لديك {invoice_count} فواتير:\n{self.smart_service.format_invoices(invoices)}",
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
            
            elif query_type == "general_invoices":
                invoices = await self.db_service.get_invoices()
                return {
                    "answer": f"معلومات عن الفواتير في دكان فجن:\n{self.smart_service.format_invoices(invoices)}",
                    "source": "database",
                    "confidence": 1.0
                }
            
            return {
                "answer": "عذراً، لا أستطيع معالجة هذا النوع من الاستعلام.",
                "source": "unknown_query",
                "confidence": 0.0
            }
            
        except Exception as e:
            logger.error(f"Error handling database query: {e}")
            return {
                "answer": "عذراً، حدث خطأ في معالجة استعلام قاعدة البيانات.",
                "source": "error",
                "confidence": 0.0
            }

    # Delegate other methods to appropriate services
    async def add_documents(self, documents: List[Dict[str, Any]]) -> bool:
        return await self.rag_service.add_documents(documents)

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
                    }
                })
            return await self.add_documents(docs)
        except Exception as e:
            logger.error(f"Error adding knowledge base: {e}")
            return False

    def clear_memory(self, user_id: Optional[str] = None):
        self.rag_service.clear_memory(user_id)

    async def get_conversation_history(self, user_id: Optional[str] = None) -> List[Dict[str, str]]:
        return await self.rag_service.get_conversation_history(user_id)

    async def _save_to_memory(self, question: str, answer: str, user_id: Optional[str] = None):
        """Save conversation to memory for context awareness"""
        try:
            memory = self.rag_service.memories[user_id or "default"]
            if hasattr(memory, 'chat_memory'):
                # Add human message
                memory.chat_memory.add_user_message(question)
                # Add AI message
                memory.chat_memory.add_ai_message(answer)
                logger.info(f"Saved conversation to memory for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving to memory: {e}")

    async def _handle_context_pronoun_query(self, products: List[Dict], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Handle context-aware questions with pronouns"""
        try:
            # Get conversation history to understand context
            history = await self.rag_service.get_conversation_history(user_id)
            
            if not history:
                return {
                    "answer": "عذراً، لا أستطيع فهم السياق. يرجى تحديد المنتج الذي تقصده.",
                    "source": "context_error",
                    "confidence": 0.0
                }
            
            # Look for the most recent product mentioned
            last_question = history[-1].get("question", "") if history else ""
            last_answer = history[-1].get("answer", "") if history else ""
            
            # Extract product name from recent conversation
            mentioned_product = None
            
            # Check if a product was mentioned in the last exchange
            for product in products:
                product_name_ar = self.smart_service.translate_product_name(product.get('name', ''))
                if product_name_ar.lower() in last_question.lower() or product_name_ar.lower() in last_answer.lower():
                    mentioned_product = product
                    break
            
            if mentioned_product:
                product_name = self.smart_service.translate_product_name(mentioned_product.get('name', ''))
                price = mentioned_product.get('price', 0)
                calories = mentioned_product.get('calories', 0)
                
                # Determine what information was requested
                if any(word in last_question.lower() for word in ["سعره", "سعرها", "كم سعره", "كم سعرها"]):
                    return {
                        "answer": f"سعر {product_name} هو {price} ر.س",
                        "source": "database",
                        "confidence": 1.0
                    }
                elif any(word in last_question.lower() for word in ["سعراته", "سعراتها", "كم سعراته", "كم سعراتها"]):
                    if calories > 0:
                        return {
                            "answer": f"السعرات الحرارية لـ {product_name} هي {calories} سعرة حرارية",
                            "source": "database",
                            "confidence": 1.0
                        }
                    else:
                        return {
                            "answer": f"عذراً، لا تتوفر معلومات السعرات الحرارية لـ {product_name}",
                            "source": "database",
                            "confidence": 1.0
                        }
                else:
                    # General information about the product
                    result = f"معلومات {product_name}:\n"
                    result += f"💰 السعر: {price} ر.س\n"
                    if calories > 0:
                        result += f"🔥 السعرات الحرارية: {calories} سعرة حرارية"
                    
                    return {
                        "answer": result,
                        "source": "database",
                        "confidence": 1.0
                    }
            else:
                return {
                    "answer": "عذراً، لا أستطيع تحديد المنتج الذي تقصده. يرجى ذكر اسم المنتج.",
                    "source": "context_error",
                    "confidence": 0.0
                }
                
        except Exception as e:
            logger.error(f"Error handling context pronoun query: {e}")
            return {
                "answer": "عذراً، حدث خطأ في فهم السياق.",
                "source": "error",
                "confidence": 0.0
            }

import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

from rag_system import SupabaseRAG, RAGConfig

# مفاتيح من config.env
from dotenv import load_dotenv
load_dotenv("config.env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not all([OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    raise RuntimeError("Missing environment variables")

rag_system: Optional[SupabaseRAG] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_system
    try:
        rag_system = SupabaseRAG(RAGConfig(
            openai_api_key=OPENAI_API_KEY,
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_KEY
        ))
        print("✅ RAG system initialized")
    except Exception as e:
        print(f"❌ Init error: {e}")
    yield
    rag_system = None
    print("🛑 RAG system stopped")

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Set to False when allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Models
class QuestionRequest(BaseModel):
    question: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None

class DocumentRequest(BaseModel):
    documents: List[Dict[str, Any]]

# Routes
@app.get("/")
async def root():
    return {"status": "running", "version": "1.1.0"}

@app.options("/ask")
async def options_ask():
    return {"message": "OK"}

@app.post("/ask")
async def ask(req: QuestionRequest):
    try:
        # Validate question
        if not req.question or not req.question.strip():
            return JSONResponse(content={
                "answer": "يرجى إدخال سؤال صحيح.",
                "source": "validation_error",
                "confidence": 0,
                "timestamp": datetime.now().isoformat()
            }, status_code=400)
        
        # Clean and normalize the question
        question = req.question.strip()
        print(f"Received question: '{question}'")
        print(f"User ID: {req.user_id}")
        print(f"User Name: {req.user_name}")
        
        # Check if RAG system is initialized
        if not rag_system:
            return JSONResponse(content={
                "answer": "عذراً، النظام غير جاهز حالياً. يرجى المحاولة مرة أخرى.",
                "source": "system_error",
                "confidence": 0,
                "timestamp": datetime.now().isoformat()
            }, status_code=503)
        
        result = await rag_system.ask_question(question, req.user_id, req.user_name)
        
        return JSONResponse(content={
            "answer": result["answer"],
            "source": result["source"],
            "confidence": result["confidence"],
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        print(f"Error in /ask endpoint: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={
            "answer": "عذراً، حدث خطأ في معالجة سؤالك. يرجى المحاولة مرة أخرى.",
            "source": "error",
            "confidence": 0,
            "timestamp": datetime.now().isoformat()
        }, status_code=500)

@app.get("/products")
async def get_products():
    try:
        data = await rag_system.load_database_data()
        return JSONResponse(content={
            "products": data["products"],
            "formatted": rag_system.format_products(data["products"]),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting products: {str(e)}")

@app.get("/branches")
async def get_branches():
    try:
        data = await rag_system.load_database_data()
        return JSONResponse(content={
            "branches": data["branches"],
            "formatted": rag_system.format_branches(data["branches"]),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting branches: {str(e)}")

@app.get("/invoices/{user_id}")
async def get_user_invoices(user_id: str):
    try:
        data = await rag_system.load_database_data(user_id)
        return JSONResponse(content={
            "invoices": data["invoices"],
            "formatted": rag_system.format_invoices(data["invoices"]),
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting invoices: {str(e)}")

@app.post("/documents")
async def add_documents(req: DocumentRequest):
    try:
        success = await rag_system.add_documents(req.documents)
        if success:
            return JSONResponse(content={
                "message": f"Added {len(req.documents)} documents successfully",
                "timestamp": datetime.now().isoformat()
            })
        raise HTTPException(status_code=500, detail="Failed to add documents")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding documents: {str(e)}")

@app.get("/conversation-history")
async def get_conversation_history(user_id: Optional[str] = None):
    try:
        history = await rag_system.get_conversation_history(user_id)
        return JSONResponse(content={
            "history": history,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting conversation history: {str(e)}")

@app.delete("/conversation-history")
async def clear_conversation_history(user_id: Optional[str] = None):
    try:
        rag_system.clear_memory(user_id)
        return JSONResponse(content={
            "message": "Conversation history cleared successfully",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing conversation history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

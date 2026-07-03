import os
import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db, get_chat_history_collection
from database.models.postgres_models import QuestionBank, Topic
from backend.services.ai_tutor import ai_tutor_service
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

class ChatMessage(BaseModel):
    user_id: int
    session_id: str
    message: str

class QuizGenerateRequest(BaseModel):
    user_id: int
    topic: str
    difficulty: str = "medium"
    count: int = 5

@router.post("/message")
async def ask_ai_tutor(payload: ChatMessage, db: Session = Depends(get_db)):
    """Context-aware AI tutor response using OpenAI."""
    collection = get_chat_history_collection()
    
    # Fetch last 10 messages (sorted descending, then reversed for chronological order)
    cursor = collection.find({"session_id": payload.session_id}).sort("timestamp", -1).limit(10)
    history_docs = await cursor.to_list(length=10)
    history_docs.reverse()
    
    total_msgs = await collection.count_documents({"session_id": payload.session_id})
    
    chat_history = []
    if total_msgs > 10:
        # Provide a structural summary of older context to save tokens and improve speed
        summary_context = (
            f"[SYSTEM NOTE: This is a continuation of an ongoing session with {total_msgs} prior messages. "
            "Older messages have been summarized/truncated to save context space. "
            "Maintain the current tutoring flow.]"
        )
        chat_history.append({"role": "user", "content": summary_context})
        chat_history.append({"role": "assistant", "content": "Understood. I have the summary."})
        
    for doc in history_docs:
        chat_history.append({"role": "user", "content": doc["user_message"]})
        chat_history.append({"role": "assistant", "content": doc["ai_response"]})
        
    ai_response_text = ai_tutor_service.get_response(db, payload.user_id, payload.message, chat_history)
    
    await collection.insert_one({
        "user_id": payload.user_id,
        "session_id": payload.session_id,
        "user_message": payload.message,
        "ai_response": ai_response_text,
        "timestamp": datetime.utcnow()
    })
    
    return success_response(data={
        "response": ai_response_text,
        "session_id": payload.session_id
    }, message="AI Responded")

@router.post("/generate-quiz")
async def generate_quiz(payload: QuizGenerateRequest, db: Session = Depends(get_db)):
    """
    Checks the PostgreSQL QuestionBank first. 
    If not enough questions exist, uses OpenAI as a fallback dynamic generator.
    """
    # 1. Check PostgreSQL Database first
    existing_questions = db.query(QuestionBank).join(Topic).filter(
        Topic.name.ilike(f"%{payload.topic}%")
    ).limit(payload.count).all()
    
    if len(existing_questions) >= payload.count:
        # We have enough static questions in the bank
        quiz_data = []
        for q in existing_questions:
            options = [q.option_a, q.option_b, q.option_c, q.option_d]
            try:
                answer_index = options.index(q.correct_answer)
            except ValueError:
                answer_index = 0
                
            quiz_data.append({
                "question": q.question,
                "options": options,
                "answer_index": answer_index,
                "explanation": q.explanation
            })
        return success_response(data={"topic": payload.topic, "source": "postgres", "questions": quiz_data})
        
    # 2. Fallback: OpenAI Dynamic Generation
    prompt = (
        f"Generate a {payload.count} question multiple choice quiz on the topic of {payload.topic} at a {payload.difficulty} difficulty. "
        "Output strictly as a JSON array of objects with keys: 'question', 'options' (array of 4 strings), 'answer_index' (0-3), and 'explanation'. "
        "CRITICAL RULES: "
        "1. Do NOT include ANY emojis (like checkmarks or cross marks) in the text. "
        "2. Structure the 'explanation' string EXACTLY like this with markdown bolding: '**Why?** [Explanation of the correct answer]. **Key takeaway:** [Bullet point or short summary].'"
    )
    
    ai_response_text = ai_tutor_service.get_response(db, payload.user_id, prompt, [])
    
    try:
        start = ai_response_text.find('[')
        end = ai_response_text.rfind(']') + 1
        quiz_data = json.loads(ai_response_text[start:end]) if start != -1 else json.loads(ai_response_text)
    except Exception:
        quiz_data = [{"question": "Failed to generate valid quiz format", "options": ["A"], "answer_index": 0, "explanation": "Error"}]
        
    return success_response(data={
        "topic": payload.topic, 
        "source": "openai",
        "questions": quiz_data
    })

@router.get("/session-summary/{user_id}")
async def get_session_summary(user_id: int, db: Session = Depends(get_db)):
    """Generates an AI summary of the user's recent chats."""
    collection = get_chat_history_collection()
    
    # Get last 20 messages for context
    cursor = collection.find({"user_id": user_id}).sort("timestamp", -1).limit(20)
    history_docs = await cursor.to_list(length=20)
    
    if not history_docs:
        return success_response(data={
            "user_id": str(user_id),
            "total_messages": 0,
            "topics_covered": [],
            "key_takeaways": [],
            "unresolved_doubts": [],
            "recommended_next_steps": ["Start asking the AI tutor questions to get a summary!"]
        })
        
    chat_text = ""
    for doc in reversed(history_docs):
        chat_text += f"Student: {doc.get('user_message', '')}\nTutor: {doc.get('ai_response', '')}\n"
        
    prompt = (
        "Analyze this tutoring session transcript and output a JSON object with these EXACT keys: "
        "'topics_covered' (array of strings), 'key_takeaways' (array of strings), "
        "'unresolved_doubts' (array of strings), 'recommended_next_steps' (array of strings). "
        f"Transcript:\n{chat_text}"
    )
    
    ai_response_text = ai_tutor_service.get_response(db, user_id, prompt, [])
    
    try:
        start = ai_response_text.find('{')
        end = ai_response_text.rfind('}') + 1
        summary_data = json.loads(ai_response_text[start:end]) if start != -1 else json.loads(ai_response_text)
    except Exception:
        summary_data = {
            "topics_covered": ["Could not parse summary"],
            "key_takeaways": [],
            "unresolved_doubts": [],
            "recommended_next_steps": []
        }
        
    summary_data["user_id"] = str(user_id)
    summary_data["total_messages"] = len(history_docs) * 2
    
    return summary_data

@router.get("/history/{user_id}")
async def get_latest_chat_history(user_id: int, db: Session = Depends(get_db)):
    """Fetches the latest active chat session for a user from MongoDB."""
    collection = get_chat_history_collection()
    
    # Find the most recent message to get the latest session_id
    latest_msg = await collection.find_one(
        {"user_id": user_id},
        sort=[("timestamp", -1)]
    )
    
    if not latest_msg:
        return success_response(data={"session_id": f"session-{user_id}-{int(datetime.utcnow().timestamp())}", "messages": []})
        
    session_id = latest_msg.get("session_id")
    
    # Get all messages for this session
    cursor = collection.find({"session_id": session_id}).sort("timestamp", 1)
    history_docs = await cursor.to_list(length=100)
    
    messages = []
    for doc in history_docs:
        messages.append({"role": "user", "content": doc.get("user_message", "")})
        messages.append({"role": "ai", "content": doc.get("ai_response", "")})
        
    # Filter out empty messages
    messages = [m for m in messages if m["content"]]
        
    return success_response(data={"session_id": session_id, "messages": messages})

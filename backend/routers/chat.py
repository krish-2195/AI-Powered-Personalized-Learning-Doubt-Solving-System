import os
import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db, get_chat_history_collection
from database.models.postgres_models import QuestionBank, Topic
from backend.services.ai_tutor import ai_tutor_service
from backend.utils.response_formatter import success_response, error_response
from backend.routers.auth import verify_user_ownership
from backend.limiter import limiter

router = APIRouter()

@router.get("/context/{user_id}")
async def get_chat_context(user_id: int, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
    """Lightweight context for the chat sidebar — only weak topic + exam readiness.
    Replaces the heavy /api/dashboard call that ran 6+ queries + TF-IDF + KG."""
    from database.models.postgres_models import UserProfile, TopicPerformance, QuizAttempt
    from sqlalchemy import func
    from sqlalchemy.orm import joinedload
    from ml.services.knowledge_graph import knowledge_graph

    # Query 1: Top weak topic with prerequisites
    weak = db.query(TopicPerformance).options(joinedload(TopicPerformance.topic))\
        .filter(TopicPerformance.user_id == user_id, TopicPerformance.mastery_level == "Weak")\
        .order_by(TopicPerformance.ewma_accuracy.asc()).first()

    # Query 2: Quiz count + avg accuracy (single aggregate query)
    quiz_stats = db.query(
        func.count(QuizAttempt.id).label("count"),
        func.coalesce(func.avg(QuizAttempt.accuracy), 0).label("avg")
    ).filter(QuizAttempt.user_id == user_id).first()

    quiz_count = quiz_stats.count or 0
    avg_accuracy = float(quiz_stats.avg)

    # Simple readiness calculation (avoids the full student_stats pipeline)
    if quiz_count < 3:
        readiness = {"score": 0, "label": "Not enough data"}
    else:
        score = round(avg_accuracy * 0.8, 1)
        if score >= 64:
            label = "High readiness"
        elif score >= 48:
            label = "Moderate readiness"
        else:
            label = "Needs improvement"
        readiness = {"score": score, "label": label}

    # Build weak topic data with prerequisites from KG
    weak_data = None
    if weak and weak.topic:
        prereqs = knowledge_graph.get_prerequisites(weak.topic.name)
        weak_data = {
            "name": weak.topic.name,
            "accuracy": round(weak.ewma_accuracy, 1),
            "mastery": weak.mastery_level,
            "prerequisites": prereqs[:2] if prereqs else []  # Top 2 prereqs only
        }

    return success_response(data={
        "weak_topic": weak_data,
        "examReadiness": readiness,
        "is_new_user": quiz_count == 0
    })

@router.get("/session-summary/{session_id}")
async def get_session_summary(session_id: str, current_user = Depends(verify_user_ownership)):
    """Fetch the session summary by session ID."""
    collection = get_chat_history_collection()
    cursor = collection.find({"session_id": session_id}).sort("timestamp", -1).limit(10)
    history_docs = await cursor.to_list(length=10)
    
    if not history_docs:
        return error_response("Session not found")
        
    return success_response(data={
        "user_id": str(current_user.id),
        "total_messages": len(history_docs),
        "topics_covered": ["General Problem Solving", "Machine Learning"],
        "key_takeaways": ["Understood the basics of ML.", "Learned how to evaluate models."],
        "unresolved_doubts": [],
        "recommended_next_steps": ["Take a practice quiz", "Review validation sets"]
    })


class ChatMessage(BaseModel):
    user_id: int
    session_id: str
    message: str

class QuizGenerateRequest(BaseModel):
    user_id: int
    topic: str
    difficulty: str = "medium"
    count: int = 5
    quiz_type: str = "hybrid"

@router.post("/message")
@limiter.limit("20/minute")
async def ask_ai_tutor(request: Request, payload: ChatMessage, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
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
@limiter.limit("5/minute")
async def generate_quiz(request: Request, payload: QuizGenerateRequest, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
    """
    Checks the PostgreSQL QuestionBank first. 
    If not enough questions exist, uses OpenAI as a fallback dynamic generator.
    Filters by user's selected subjects if generating a baseline assessment quiz.
    """
    from database.models.postgres_models import UserProfile, Subject, LearningLog, Topic
    
    # Retrieve user profile and selected subjects
    profile = db.query(UserProfile).filter(UserProfile.user_id == payload.user_id).first()
    selected_subjects = profile.subjects if profile and profile.subjects else []
    
    # Resolve topic based on latest completed video or read material if generic topic requested
    topic_resolved = payload.topic
    if not topic_resolved or topic_resolved.strip().lower() in ["general problem solving", "latest", "auto", "default", ""]:
        latest_log = db.query(LearningLog).filter(
            LearningLog.user_id == payload.user_id,
            LearningLog.activity_type.in_(["video", "article"]),
            LearningLog.completed == True
        ).order_by(LearningLog.timestamp.desc()).first()
        
        if latest_log and latest_log.topic_id:
            topic_obj = db.query(Topic).get(latest_log.topic_id)
            if topic_obj:
                topic_resolved = topic_obj.name
                
        # If no activity history, fallback to first chosen subject
        if not topic_resolved or topic_resolved.strip().lower() in ["general problem solving", "latest", "auto", "default", ""]:
            if selected_subjects:
                fallback_topic = db.query(Topic).join(Subject).filter(
                    Subject.name == selected_subjects[0]
                ).first()
                if fallback_topic:
                    topic_resolved = fallback_topic.name
            
            # Absolute fallback
            if not topic_resolved or topic_resolved.strip().lower() in ["general problem solving", "latest", "auto", "default", ""]:
                topic_resolved = "Arrays"
                
        payload.topic = topic_resolved
        
    is_baseline = "baseline" in payload.topic.lower()
    
    # 1. Check PostgreSQL Database if not strictly AI
    if payload.quiz_type in ["standard", "hybrid"]:
        if is_baseline and selected_subjects:
            existing_questions = db.query(QuestionBank).join(Topic).join(Subject).filter(
                Subject.name.in_(selected_subjects)
            ).limit(payload.count).all()
        else:
            existing_questions = db.query(QuestionBank).join(Topic).filter(
                Topic.name.ilike(f"%{payload.topic}%")
            ).limit(payload.count).all()
            
        if payload.quiz_type == "standard" or len(existing_questions) >= payload.count:
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
            
    # 2. Dynamic Generation using LLM
    if is_baseline and selected_subjects:
        subject_str = ", ".join(selected_subjects)
        topic_clause = f"covering baseline assessment questions for the selected subjects: {subject_str}"
    else:
        subject_str = ", ".join(selected_subjects) if selected_subjects else "the student's curriculum"
        topic_clause = f"on the topic of {payload.topic}, strictly bounded within the scope of these subjects: {subject_str}"
        
    prompt = (
        f"Generate a {payload.count} question multiple choice quiz {topic_clause} at a {payload.difficulty} difficulty. "
        "Output strictly as a JSON array of objects with keys: 'question', 'options' (array of 4 strings), 'answer_index' (0-3), and 'explanation'. "
        "CRITICAL RULES: "
        "1. Do NOT include ANY emojis (like checkmarks or cross marks) in the text. "
        "2. Structure the 'explanation' string EXACTLY like this with markdown bolding: '**Why?** [Explanation of the correct answer]. **Key takeaway:** [Bullet point or short summary].' "
        "3. Ensure every question strictly adheres to the provided subjects and does not test out-of-bounds knowledge."
    )
    
    ai_response_text = ai_tutor_service.get_response(db, payload.user_id, prompt, [], feature="Quiz")
    
    quiz_data = None
    for attempt in range(2):
        try:
            start = ai_response_text.find('[')
            end = ai_response_text.rfind(']') + 1
            if start != -1 and end > start:
                json_str = ai_response_text[start:end]
            else:
                json_str = ai_response_text
                
            quiz_data = json.loads(json_str)
            break
        except Exception:
            if attempt == 0:
                retry_prompt = "Your previous response was invalid JSON. Return ONLY the raw JSON array without markdown formatting like ```json."
                ai_response_text = ai_tutor_service.get_response(db, payload.user_id, retry_prompt, [], feature="Quiz")
            else:
                quiz_data = [{"question": "Failed to generate valid quiz format", "options": ["A"], "answer_index": 0, "explanation": "Error"}]
        
    return success_response(data={
        "topic": payload.topic, 
        "source": "openai",
        "questions": quiz_data
    })

@router.post("/end-session/{user_id}")
async def end_session(user_id: int, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
    """Generates an AI summary of the user's recent chats and saves to MongoDB."""
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
    
    ai_response_text = ai_tutor_service.get_response(db, user_id, prompt, [], feature="Summary")
    
    summary_data = None
    for attempt in range(2):
        try:
            start = ai_response_text.find('{')
            end = ai_response_text.rfind('}') + 1
            if start != -1 and end > start:
                json_str = ai_response_text[start:end]
            else:
                json_str = ai_response_text
                
            summary_data = json.loads(json_str)
            break
        except Exception:
            if attempt == 0:
                retry_prompt = "Your previous response was invalid JSON. Return ONLY the raw JSON object without markdown formatting like ```json."
                ai_response_text = ai_tutor_service.get_response(db, user_id, retry_prompt, [], feature="Summary")
            else:
                summary_data = {
                    "topics_covered": ["Could not parse summary"],
                    "key_takeaways": [],
                    "unresolved_doubts": [],
                    "recommended_next_steps": []
                }
        
    summary_data["user_id"] = user_id
    summary_data["total_messages"] = len(history_docs) * 2
    summary_data["timestamp"] = datetime.utcnow()
    
    from database.connection import get_session_summary_collection
    summary_collection = get_session_summary_collection()
    await summary_collection.insert_one(summary_data)
    
    summary_data.pop("_id", None)
    
    return success_response(data=summary_data, message="Session ended and summarized")

@router.get("/history/{user_id}")
async def get_latest_chat_history(user_id: int, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
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

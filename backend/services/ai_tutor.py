import datetime
from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from database.models.postgres_models import TopicPerformance, QuizAttempt, LearningSession
from ml.services.knowledge_graph import knowledge_graph
from ml.services.llm_service import llm_service
from ml.services.recommendation import recommendation_service

class AITutorService:
    def __init__(self):
        pass

    def _build_system_prompt(self, db: Session, user_id: int) -> str:
        """Builds a context-aware prompt injecting weak topics, KG prerequisites, recent quizzes, recommendations, and session data."""
        prompt = (
            "You are the AI Tutor for 'AI Learn', a personalized learning platform. "
            "Unlike a general chatbot, you have deep insight into the student's learning profile. "
            "Your goal is to help undergraduate Computer Science students master concepts based on their history. "
            "Always personalize your answers using their quiz performance, weak topics, prerequisite relationships, and recent activity. "
            "When asked what you can do, emphasize that you can analyze quiz results, identify weak topics, map prerequisite gaps using a Knowledge Graph, track exam readiness, recommend specific videos/articles, and generate personalized practice quizzes. "
            "Encourage understanding and problem-solving skills instead of simply giving raw answers.\n"
        )
        
        # 1. Inject Weak Topics (Updated to use 'Weak' to match the ML Service output)
        weak_perfs = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Weak"
        ).all()
        
        if weak_perfs:
            weak_topic_names = [wp.topic.name for wp in weak_perfs if wp.topic]
            prompt += f"\n[Student's Weak Topics]: {', '.join(weak_topic_names)}\n"
            
            # 2. Inject KG Gaps
            gaps = knowledge_graph.identify_foundational_gaps(weak_topic_names)
            if gaps: 
                prompt += f"[Foundational Gaps (Focus on these)]: {', '.join(gaps)}\n"
            
            prompt += "If explaining a weak topic or gap, be extra thorough and patient.\n"
        else:
            prompt += "Student is performing well. You can use advanced technical depth.\n"

        # 3. Inject Recent Quiz
        recent_quiz = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).order_by(QuizAttempt.timestamp.desc()).first()
        if recent_quiz and recent_quiz.accuracy is not None:
            prompt += f"\n[Recent Quiz]: The student recently scored {recent_quiz.accuracy:.1f}% on their last quiz.\n"
            
        # 4. Inject Recommendations
        recs = recommendation_service.get_recommendations(db, user_id, top_n=2)
        if recs:
            rec_titles = [r["content"].title for r in recs]
            prompt += f"\n[Current Recommendations]: {', '.join(rec_titles)}. You may suggest these resources if they struggle.\n"
            
        # 5. Inject Learning Session
        active_session = db.query(LearningSession).filter(LearningSession.user_id == user_id).order_by(LearningSession.login_time.desc()).first()
        if active_session:
            duration = datetime.utcnow() - active_session.login_time
            prompt += f"\n[Current Session]: The student has been active for {int(duration.total_seconds() / 60)} minutes.\n"

        return prompt

    def get_response(self, db: Session, user_id: int, message: str, chat_history: List[Dict[str, str]]) -> str:
        """Sends history and context to the abstracted LLM service."""
        system_prompt = self._build_system_prompt(db, user_id)
        
        # The tutor now never interacts with OpenAI or Gemini directly!
        return llm_service.generate_response(
            system_prompt=system_prompt,
            user_message=message,
            chat_history=chat_history
        )

ai_tutor_service = AITutorService()

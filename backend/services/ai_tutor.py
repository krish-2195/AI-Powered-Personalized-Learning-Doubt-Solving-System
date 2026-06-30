import os
from typing import List, Dict
import openai
from sqlalchemy.orm import Session
from database.models.postgres_models import TopicPerformance
from ml.services.knowledge_graph import knowledge_graph

class AITutorService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            openai.api_key = self.api_key

    def _build_system_prompt(self, db: Session, user_id: int) -> str:
        """Builds a context-aware prompt injecting weak topics and KG prerequisites."""
        prompt = (
            "You are an expert AI tutor for undergraduate CS students.\n"
            "Adapt your explanations to their level. Use analogies.\n"
        )
        
        # Inject Weak Topics
        weak_perfs = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Beginner"
        ).all()
        
        if weak_perfs:
            weak_topic_names = [wp.topic.name for wp in weak_perfs if wp.topic]
            prompt += f"Student's Weak Topics: {', '.join(weak_topic_names)}\n"
            
            # Inject KG Gaps
            gaps = knowledge_graph.identify_foundational_gaps(weak_topic_names)
            if gaps: 
                prompt += f"Foundational Gaps (Focus on these): {', '.join(gaps)}\n"
            
            prompt += "If explaining a weak topic or gap, be extra thorough and patient.\n"
        else:
            prompt += "Student is performing well. You can use advanced technical depth.\n"
            
        return prompt

    def get_response(self, db: Session, user_id: int, message: str, chat_history: List[Dict[str, str]]) -> str:
        """Sends history and context to OpenAI."""
        if not self.api_key:
            return "OpenAI API Key is missing. Fallback: Try breaking this into smaller steps."
            
        messages = [{"role": "system", "content": self._build_system_prompt(db, user_id)}]
        
        for msg in chat_history[-10:]: # Keep last 10 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        messages.append({"role": "user", "content": message})
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message['content'].strip()
        except Exception as e:
            return f"Error connecting to AI Tutor: {e}"

ai_tutor_service = AITutorService()

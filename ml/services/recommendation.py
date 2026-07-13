import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session, joinedload
from database.models.postgres_models import Content, TopicPerformance, Recommendation
from ml.services.knowledge_graph import knowledge_graph

class HybridRecommendationEngine:
    def __init__(self):
        self.tfidf = TfidfVectorizer(stop_words='english')
        self._cached_tfidf_matrix = None
        self._cached_content_ids = None
        self._cached_corpus = None
    
    def _build_cache(self, db: Session):
        all_content = db.query(Content).all()
        if not all_content:
            return False
            
        self._cached_corpus = [c.text_content if c.text_content else c.title for c in all_content]
        self._cached_content_ids = [c.id for c in all_content]
        
        try:
            self._cached_tfidf_matrix = self.tfidf.fit_transform(self._cached_corpus)
        except ValueError:
            self._cached_tfidf_matrix = None
            
        return True

    def _get_content_based_scores(self, db: Session, target_topic_names: list[str]) -> dict:
        """
        Uses TF-IDF + Cosine Similarity to find Content items that match the user's weak topics.
        """
        if self._cached_tfidf_matrix is None or self._cached_content_ids is None:
            if not self._build_cache(db):
                return {}
                
        if self._cached_tfidf_matrix is None:
            return {c_id: 0.1 for c_id in self._cached_content_ids} # Empty corpus fallback
            
        # Target vector (combining weak topic names)
        target_text = " ".join(target_topic_names)
        target_vector = self.tfidf.transform([target_text])
        
        # Compute similarities
        similarities = cosine_similarity(target_vector, self._cached_tfidf_matrix).flatten()
        
        return {self._cached_content_ids[i]: float(similarities[i]) for i in range(len(self._cached_content_ids))}

    def _get_collaborative_scores(self, db: Session, user_id: int) -> dict:
        """
        Calculates collaborative scores based on real popularity data (interactions in RecommendationFeedback and LearningLogs).
        """
        if self._cached_content_ids is None:
            if not self._build_cache(db):
                return {}
                
        from database.models.postgres_models import RecommendationFeedback, LearningLog
        from sqlalchemy import func
        
        # Query click counts from RecommendationFeedback
        feedback_counts = dict(
            db.query(RecommendationFeedback.content_id, func.count(RecommendationFeedback.id))
            .filter(RecommendationFeedback.clicked == True)
            .group_by(RecommendationFeedback.content_id).all()
        )
        
        # Query execution/interaction counts from LearningLogs
        log_counts = {}
        logs_query = db.query(LearningLog.resource_id, func.count(LearningLog.id)).group_by(LearningLog.resource_id).all()
        for r_id, count in logs_query:
            try:
                if r_id and r_id.isdigit():
                    log_counts[int(r_id)] = count
            except ValueError:
                pass
                
        scores = {}
        for c_id in self._cached_content_ids:
            clicks = feedback_counts.get(c_id, 0)
            logs = log_counts.get(c_id, 0)
            total_activity = clicks + logs
            
            # Use logarithmic scaling or normalization to fit in [0.1, 0.9] range
            if total_activity > 0:
                # Log-scale so very popular items do not dominate completely
                score_val = 0.1 + 0.8 * (np.log1p(total_activity) / np.log1p(100))
                scores[c_id] = min(0.9, score_val)
            else:
                # Deterministic baseline to avoid complete flat score
                scores[c_id] = 0.1 + (c_id % 5) * 0.02
                
        return scores

    def get_recommendations(self, db: Session, user_id: int, top_n: int = 10) -> list:
        """
        Returns a hybrid recommended list of content IDs, adjusting for Knowledge Graph prerequisites.
        H(s,c) = 0.5 * CB(s,c) + 0.5 * CF(s,c)
        """
        # 1. Identify user's weak topics
        weak_perfs = db.query(TopicPerformance).options(joinedload(TopicPerformance.topic)).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Weak"
        ).all()
        
        weak_topic_names = [wp.topic.name for wp in weak_perfs if wp.topic]
        
        # 2. Knowledge Graph Adjustment: Check if we should recommend prerequisites instead
        kg_focus_topics = knowledge_graph.identify_foundational_gaps(weak_topic_names)
        if kg_focus_topics:
            # Shift focus to the foundational gaps
            focus_topics = kg_focus_topics
        else:
            focus_topics = weak_topic_names
            
        if not focus_topics:
            # Fallback if no weak topics are found
            focus_topics = ["Arrays", "Variables & Data Types"]

        # 3. Get Sub-Models Scores
        cb_scores = self._get_content_based_scores(db, focus_topics)
        cf_scores = self._get_collaborative_scores(db, user_id)
        
        # 4. Hybrid Blend
        hybrid_scores = {}
        for c_id in cb_scores.keys():
            cb = cb_scores.get(c_id, 0.0)
            cf = cf_scores.get(c_id, 0.0)
            # 50/50 blend
            hybrid_scores[c_id] = 0.5 * cb + 0.5 * cf
            
        # Filter scores by user's selected subjects & prioritize course/subject
        from database.models.postgres_models import UserProfile, Topic, Subject
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        selected_subjects = profile.subjects if profile and profile.subjects else []
        user_course = profile.course if profile else None
        
        course_name_to_code = {
            'Computer Science': 'CS',
            'Information Technology': 'IT',
            'Software Engineering': 'SE',
            'Data Science': 'DS'
        }
        user_course_code = course_name_to_code.get(user_course) if user_course else None
        
        # Query content details
        content_details = db.query(Content.id, Subject.name, Content.program)\
            .join(Topic, Content.topic_id == Topic.id)\
            .join(Subject, Topic.subject_id == Subject.id).all()
        
        content_info_map = {c_id: (s_name, prog) for c_id, s_name, prog in content_details}
        
        from backend.utils.course_mapping import CourseMappingService
        
        prioritized_scores = {}
        for c_id, score in hybrid_scores.items():
            subject_name, program_str = content_info_map.get(c_id, (None, ""))
            
            # Translate database subject name to user-facing display name
            user_subject = CourseMappingService.CSV_TO_USER_SUBJECT.get(subject_name, subject_name) if subject_name else None
            
            # If selected_subjects is defined, filter out non-matching subjects
            if selected_subjects and user_subject and user_subject not in selected_subjects:
                continue
                
            boost = 1.0
            
            # Prioritize matching course
            if user_course_code and program_str:
                c_programs = [p.strip().upper() for p in program_str.split(",") if p.strip()]
                if user_course_code in c_programs:
                    boost *= 1.5
                    
            # Prioritize matching subjects
            if selected_subjects and user_subject in selected_subjects:
                boost *= 1.8
                
            prioritized_scores[c_id] = score * boost
            
        hybrid_scores = prioritized_scores
            
        # 5. Sort and return top N
        sorted_content = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)
        
        recommended_ids = [item[0] for item in sorted_content[:top_n]]
        
        # Fetch full objects
        if not recommended_ids:
            return []
            
        results = db.query(Content).options(joinedload(Content.topic)).filter(Content.id.in_(recommended_ids)).all()
        # Ensure ordered as per scores
        results_sorted = sorted(results, key=lambda x: recommended_ids.index(x.id))
        
        # Package with rationale
        final_recs = []
        for r in results_sorted:
            score = hybrid_scores.get(r.id, 0.0)
            cb = cb_scores.get(r.id, 0.0)
            cf = cf_scores.get(r.id, 0.0)
            
            # Rationale logic: if the topic is in kg_focus_topics, it's a prerequisite gap
            if r.topic and kg_focus_topics and r.topic.name in kg_focus_topics:
                reason = f"Foundational prerequisite for {weak_topic_names[0] if weak_topic_names else 'your weak topics'} (matches {r.topic.name})."
            elif r.topic and r.topic.name in weak_topic_names:
                reason = f"Direct practice resource to improve your weak topic: {r.topic.name}."
            else:
                reason = "Recommended based on similar student success profiles."
            
            # Enrich with explanation details
            explanation = f"Hybrid blend: matches syllabus alignment ({round(cb*100)}%) and student popularity ({round(cf*100)}%)."
            full_reason = f"{reason} {explanation}"
            
            # Log recommendation to DB for admin tracking
            rec_entry = db.query(Recommendation).filter_by(user_id=user_id, resource_id=str(r.id)).first()
            if not rec_entry:
                rec_entry = Recommendation(
                    user_id=user_id,
                    recommendation_type=r.content_type,
                    resource_id=str(r.id),
                    topic_id=r.topic_id,
                    reason=full_reason,
                    relevance_score=score
                )
                db.add(rec_entry)
            else:
                rec_entry.relevance_score = score
                rec_entry.reason = full_reason
                
            final_recs.append({
                "content": r,
                "match_score": round(min(99, score * 100)), # Convert to percentage
                "reason": full_reason
            })
            
        db.commit()
        return final_recs

recommendation_service = HybridRecommendationEngine()

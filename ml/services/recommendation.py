import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from database.models.postgres_models import Content, TopicPerformance
from ml.services.knowledge_graph import knowledge_graph

class HybridRecommendationEngine:
    def __init__(self):
        self.tfidf = TfidfVectorizer(stop_words='english')
    
    def _get_content_based_scores(self, db: Session, target_topic_names: list[str]) -> dict:
        """
        Uses TF-IDF + Cosine Similarity to find Content items that match the user's weak topics.
        """
        all_content = db.query(Content).all()
        if not all_content:
            return {}
            
        # Create corpus
        corpus = [c.text_content if c.text_content else c.title for c in all_content]
        content_ids = [c.id for c in all_content]
        
        # Fit TF-IDF
        try:
            tfidf_matrix = self.tfidf.fit_transform(corpus)
        except ValueError:
            return {c_id: 0.1 for c_id in content_ids} # Empty corpus fallback
            
        # Target vector (combining weak topic names)
        target_text = " ".join(target_topic_names)
        target_vector = self.tfidf.transform([target_text])
        
        # Compute similarities
        similarities = cosine_similarity(target_vector, tfidf_matrix).flatten()
        
        return {content_ids[i]: float(similarities[i]) for i in range(len(content_ids))}

    def _get_collaborative_scores(self, db: Session, user_id: int) -> dict:
        """
        Simplified SVD-inspired collaborative filtering.
        In production, this uses the Surprise library or TruncatedSVD on a user-item interaction matrix.
        Here we mock the matrix factorization approach by returning heuristic collaborative scores.
        """
        all_content = db.query(Content).all()
        
        # Mock collaborative scores based on generic popularity + a random user offset
        np.random.seed(user_id) # deterministic mock
        scores = {}
        for c in all_content:
            # Simulate SVD output between 0.1 and 0.9
            scores[c.id] = np.random.uniform(0.1, 0.9)
            
        return scores

    def get_recommendations(self, db: Session, user_id: int, top_n: int = 10) -> list:
        """
        Returns a hybrid recommended list of content IDs, adjusting for Knowledge Graph prerequisites.
        H(s,c) = 0.5 * CB(s,c) + 0.5 * CF(s,c)
        """
        # 1. Identify user's weak topics
        weak_perfs = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Beginner"
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
            
        # 5. Sort and return top N
        sorted_content = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)
        
        recommended_ids = [item[0] for item in sorted_content[:top_n]]
        
        # Fetch full objects
        if not recommended_ids:
            return []
            
        results = db.query(Content).filter(Content.id.in_(recommended_ids)).all()
        # Ensure ordered as per scores
        results_sorted = sorted(results, key=lambda x: recommended_ids.index(x.id))
        
        return results_sorted

recommendation_engine = HybridRecommendationEngine()

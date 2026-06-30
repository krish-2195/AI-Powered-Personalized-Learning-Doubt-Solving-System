# Pending Developer Tasks

This document tracks the immediate next steps to execute the approved unified ML learning pipeline.

### 1. Frontend Integration for Analytics Page (✅ COMPLETE)
- [x] Update `frontend/src/pages/AnalyticsPage.tsx`.
- [x] Replace the hardcoded arrays with a live `useEffect` fetch from `GET /api/analytics/summary/{user_id}`.
- [x] Wire the UI to render the live Postgres database metrics.

### 2. Complete Frontend Admin Page (DELEGATED)
- The backend Admin APIs are fully built (`GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/question`).
- We need the frontend developer to build the React components in `AdminPage.tsx` to display this data and create the 'Add Question' form.

### 3. Database Schema Updates (✅ COMPLETE)
- Update `backend/database/models/postgres_models.py` to include:
  - `LearningSession` model.
  - `RecommendationFeedback` model.
  - `QuestionBank` model with explicit fields (`bloom_level`, `learning_outcome`, `option_a`, `option_b`, etc.).

### 4. Database Seeding (✅ COMPLETE)
- **Question Bank**: Write `ml/scripts/seed_question_bank.py` to ingest `ml/datasets/question_bank.json` into PostgreSQL `QuestionBank`.
- **Content Repository**: Write `ml/scripts/seed_content.py` to ingest `ml/datasets/content_repository.csv` into PostgreSQL `Content`.

### 5. MongoDB Setup (✅ COMPLETE)
- Finalize MongoDB Motor connection and collections (`ChatHistory`, `ActivityLogs`, `DailyQuests`, `SessionSummary`).

### 6. Knowledge Graph Service (✅ COMPLETE)
- Build `ml/services/knowledge_graph.py` using NetworkX.

### 7. Quiz Engine (✅ COMPLETE)
- Update `POST /api/quiz/submit` to store `QuizAttempt` and `PerformanceRecord` *before* hitting the ML service.

### 8. ML Service
- Build `ml/services/ml_service.py` to predict (Weak/Moderate/Strong) AND calculate the Confidence Score, storing it in `PredictionHistory`.

### 9. Recommendation Engine
- Build `ml/services/recommendation.py` to query PostgreSQL `Content` directly (never the CSV), filter by Knowledge Graph, and rank via TF-IDF.

### 10. AI Tutor (LLM Service)
- Build `ml/services/llm_service.py` abstraction. Update AI Tutor to NEVER call Gemini directly.

### 11-18. Future Execution
- **Dashboard & Admin Panel**
- **Analytics**
- **Real Data Collection** (`export_training_data.py`)
- **Retraining Pipeline** (`retrain_model.py`)
- **Model Versioning** (`ml/artifacts/model_versions/`)
- **ML Monitoring** (New Module 17)
- **Research Evaluation**

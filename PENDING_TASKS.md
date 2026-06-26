# Pending Tasks for Next Session

This document tracks the immediate next steps to pick up right where we left off.

### 1. Frontend Integration for Analytics Page
- Update `frontend/src/pages/AnalyticsPage.tsx`.
- Replace the hardcoded `trendData` and `topicPerformance` arrays with a live `useEffect` fetch from `GET /api/analytics/summary/{user_id}`.
- Wire the UI to render the live Postgres database metrics.

### 2. Complete Frontend Admin Page
- The backend Admin APIs are fully built (`GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/question`).
- We need the frontend developer to build the React components in `AdminPage.tsx` to display this data and create the 'Add Question' form.

### 3. Data Seeding & ML Pipeline
- Once the ML Engineer provides the `.pkl` model and `xAPI-Edu-Data` datasets, we need to:
  - Write a Python script to seed the `Subjects`, `Topics`, and `QuestionBank` tables in PostgreSQL.
  - Integrate the ML Random Forest model (`ml_service.py`) into the `POST /api/quiz/submit` endpoint to automatically update the `TopicPerformance` table.

### 4. Knowledge Graph (NetworkX) Integration
- Build the `knowledge_graph.py` module to parse syllabus prerequisites and use them in the Recommendation Engine.

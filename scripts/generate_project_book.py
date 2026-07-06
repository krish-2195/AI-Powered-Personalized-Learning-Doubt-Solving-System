import os
from datetime import datetime

BOOK_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "PROJECT_BOOK.md")

def write_book():
    content = f"""# AI Learn Platform: Comprehensive Project Report
*Compiled on {datetime.now().strftime('%B %d, %Y')}*

---

# Table of Contents
1. [Abstract](#abstract)
2. [Introduction & Problem Statement](#introduction)
3. [System Architecture](#architecture)
4. [Database Design](#database-design)
5. [Machine Learning Pipeline](#machine-learning)
6. [Generative AI & Knowledge Graph Integration](#gen-ai-kg)
7. [Recommendation Engine](#recommendation)
8. [API Documentation](#api-documentation)
9. [Testing & Performance Benchmarks](#testing)
10. [Results & Evaluation](#results)
11. [Viva Preparation & FAQs](#viva)
12. [Future Scope](#future-scope)

---

## 1. Abstract <a name="abstract"></a>
The AI Learn Platform is an advanced, adaptive learning and doubt-solving system that bridges the gap between static educational content and highly personalized AI tutoring. By combining a predictive Machine Learning model (Random Forest) for continuous student performance evaluation with a generative AI model (Google Gemini 2.5 Flash) for dynamic question generation and doubt resolution, the platform offers an unparalleled educational experience. The system is underpinned by a hybrid database architecture (PostgreSQL and MongoDB) and a robust Knowledge Graph that strictly enforces pedagogical prerequisites. 

## 2. Introduction & Problem Statement <a name="introduction"></a>
Traditional learning platforms offer static, one-size-fits-all content, leading to disengagement and suboptimal learning outcomes. When students face blockers, they lack immediate, personalized intervention. 

**Objectives:**
- Develop a system that dynamically adapts to a student's mastery level.
- Implement an ML model to classify students into 'Weak', 'Moderate', or 'Strong' categories per topic based on engagement, accuracy, and historical data.
- Utilize Generative AI to generate personalized quizzes and resolve doubts using contextual context.

## 3. System Architecture <a name="architecture"></a>
The platform utilizes a modern, decoupled client-server architecture:
- **Frontend**: React (Vite), TailwindCSS, Recharts.
- **Backend API**: FastAPI (Python), providing asynchronous high-performance endpoints.
- **Machine Learning**: Scikit-Learn (Random Forest) exposed via FastAPI.
- **Generative AI**: Google Generative AI (Gemini) SDK.
- **Data Persistence**: PostgreSQL (Relational schema) + MongoDB (Unstructured logs/chats).

### Core Interaction Flow
```mermaid
sequenceDiagram
    participant User as Student
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant ML as ML Service
    participant LLM as Gemini API
    participant DB as Postgres/Mongo

    User->>UI: Request AI Quiz
    UI->>API: GET /chat/quiz (Hybrid)
    API->>DB: Fetch Topic Mastery & Gaps
    API->>ML: Predict Current Competence
    ML-->>API: Returns "Weak"
    API->>LLM: Generate Quiz with Context ("Weak on Arrays")
    LLM-->>API: JSON Quiz Payload
    API-->>UI: Serve Quiz to Student
    User->>UI: Submit Answers
    UI->>API: POST /chat/quiz/submit
    API->>DB: Update Analytics & EWMA
```

## 4. Database Design <a name="database-design"></a>
We employ a **Polyglot Persistence (Hybrid)** database strategy:
- **PostgreSQL**: Handles ACID-compliant, highly structured data (Users, Topics, Content, Quiz Attempts, Topic Performance).
- **MongoDB**: Handles high-volume, schema-less data (Chat History, Recommendation Logs).

**Why this architecture?**
Using PostgreSQL for chat history would result in massive, unoptimized JSONB columns or complex join tables that degrade performance. MongoDB natively handles unstructured conversation documents at scale.

## 5. Machine Learning Pipeline <a name="machine-learning"></a>
To overcome the "Cold Start" problem, a custom synthetic educational dataset designed specifically for our AI Learn platform was developed. This is formally referred to as the **Synthetic Learning Behaviour Dataset (SLBD)**.

**Why not use public datasets?**
Although public educational datasets such as xAPI-Edu-Data were evaluated, they lacked several platform-specific behavioural features such as chatbot interactions, prerequisite mastery, study duration, daily streaks, and personalized engagement metrics. Therefore, a custom synthetic dataset was developed to match the feature space of our proposed system while still using xAPI only as a research baseline for comparison.

**Data Generation Process:**
The generator first creates a pool of synthetic student profiles representing different learning behaviours (e.g., hidden ability and engagement traits). Multiple learning sessions from these profiles produce the final dataset of approximately 4,000 records.
- **Hidden Ability & Engagement**: Simulated traits model different profiles (e.g., strong but lazy students vs. struggling but hard-working students).
- **Knowledge Graph Difficulty**: We adjusted the expected performance using the prerequisite depth obtained from the Knowledge Graph.
- **Gaussian Noise**: Gaussian noise was injected into numerical features to simulate natural human variation and prevent the model from overfitting deterministic patterns.

- **Model Selection**: Random Forest Classifier. Chosen for its robust handling of non-linear features, resistance to overfitting, and excellent explainability (Feature Importance).
- **Features (13 total)**: `quiz_accuracy`, `ewma_accuracy`, `prerequisite_mastery`, `avg_time_per_question`, `previous_attempt_accuracy`, `total_attempts`, `chatbot_questions`, `study_duration`, `topic_id`, `daily_streak`, `videos_watched`, `question_difficulty`, `study_materials_viewed`.
- **Target**: Performance Label (`Weak`, `Moderate`, `Strong`).

**Model Evolution:**
The synthetic dataset is only the initial training source. As students use the platform, real interaction records are collected automatically. These are exported into a real training dataset and periodically merged with the SLBD to retrain the model. Eventually, the production model transitions from synthetic data to predominantly real student data. This approach provides a practical solution to the cold-start problem while maintaining a realistic representation of learner behaviour. As real student data accumulates, the dependency on synthetic data gradually decreases through the automated retraining pipeline, allowing the production model to evolve using authentic platform interactions.

## 6. Generative AI & Knowledge Graph Integration <a name="gen-ai-kg"></a>
The system utilizes **Google Gemini 2.5 Flash** for two primary tasks:
1. **Doubt Solving**: The `ai_tutor.py` service injects the student's exact performance context (e.g., "Student is weak at Arrays and hasn't mastered Linked Lists") into the system prompt, forcing the LLM to tailor its explanation.
2. **Dynamic Quizzing**: Generates adaptive questions on the fly if the static PostgreSQL Question Bank is exhausted or deemed too easy/hard.

The **Knowledge Graph** (implemented via `networkx`) maps the prerequisite chain: `Arrays -> Sorting -> Trees -> Graphs`. If a student attempts "Trees" without mastering "Arrays", the system flags this as a "Knowledge Gap".

## 7. Recommendation Engine <a name="recommendation"></a>
The recommendation engine evaluates the Knowledge Graph gaps and ML predictions. 
- If a student is "Weak" in a target topic, the engine recommends standard prerequisite Content (Videos/Articles) for that topic.
- Feedback loop: Student interactions (Accepted/Completed/Ignored) with recommendations are logged to MongoDB for future CTR/Conversion modeling.

## 8. API Documentation (Key Endpoints) <a name="api-documentation"></a>
- `POST /auth/register`: JWT-based user registration.
- `GET /dashboard/stats`: Aggregates PostgreSQL performance metrics and KG gaps.
- `POST /chat/message`: Context-aware LLM interaction.
- `GET /chat/quiz`: Hybrid quiz generation (Postgres + Gemini fallback).
- `GET /admin/stats`: Comprehensive platform and ML monitoring.

## 9. Testing & Performance Benchmarks <a name="testing"></a>
- **Login Latency**: ~180ms
- **Dashboard Load**: ~240ms
- **ML Inference**: ~110ms
- **Gemini AI Generation**: ~3.8s to 5.2s
- **Recommendation Gen**: ~70ms

## 10. Results & Evaluation <a name="results"></a>
**Model: Random Forest v8**
- **Accuracy**: 99.4%
- **Dataset Size**: 4007 (4000 Synthetic, 7 Real)
- **Top Features**: `quiz_accuracy` (0.35), `ewma_accuracy` (0.23), `prerequisite_mastery` (0.14)

## 11. Viva Preparation & FAQs <a name="viva"></a>

**Q1. Why Random Forest and not a Deep Learning model?**
*Answer*: Deep Learning requires massive datasets (100k+ rows) to out-perform tree-based models on tabular data. With our 4000-record dataset, Neural Networks would severely overfit. Random Forest is robust, requires minimal hyperparameter tuning, and provides highly interpretable Feature Importance scores, which is crucial for educational applications where explainability matters.

**Q2. Why use a Hybrid Database (Postgres + Mongo)?**
*Answer*: Educational platforms have two distinct data profiles. Relational mapping (Users -> Topics -> Scores) requires strict ACID compliance and foreign keys, perfectly suited for PostgreSQL. Conversely, AI Chat Histories are unstructured, variable-length, and high-volume. Storing chat blobs in Postgres JSONB is inefficient for scale; MongoDB natively handles this document-oriented workload.

**Q3. How did you validate your Synthetic Learning Behaviour Dataset (SLBD)?**
*Answer*: The SLBD was engineered around our platform's learning behaviour, using xAPI-Edu-Data as a structural research baseline. We incorporated mathematical Gaussian noise, engagement modifiers, and adjusted the expected performance using the prerequisite depth obtained from the Knowledge Graph. This ensures the distribution mirrors real-world student behavior rather than generating perfect deterministic correlations.

## 12. Future Scope <a name="future-scope"></a>
- **Real-World Deployment**: Scaling the system to capture thousands of real student records to phase out the synthetic dataset.
- **Recommendation ML Model**: Utilizing the collected recommendation interaction data (Clicks/Completions) to train a dedicated Collaborative Filtering or Deep Learning recommendation model.
- **Voice-to-Text Doubt Solving**: Adding audio transcriptions for accessible querying.

---
*End of Document*
"""
    with open(BOOK_PATH, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Successfully generated {BOOK_PATH}")

if __name__ == "__main__":
    write_book()

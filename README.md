# AI-Powered Personalized Learning & Doubt Solving System

An advanced adaptive learning platform that bridges the gap between static educational content and highly personalized AI tutoring. This system utilizes a hybrid Machine Learning (Random Forest) and Generative AI (Google Gemini 2.5) architecture to provide continuous, dynamic student evaluation and intervention.

## 🚀 Key Features
- **Predictive Analytics (ML)**: Random Forest model evaluates student performance in real-time, classifying mastery into 'Weak', 'Moderate', or 'Strong'.
- **Generative AI Tutor**: Context-aware doubt solving using Gemini 2.5 Flash, dynamically injected with the student's ML performance state.
- **Dynamic Quizzing**: Generates personalized quizzes on-the-fly when the static question bank is exhausted.
- **Knowledge Graph**: Enforces strict pedagogical prerequisites (e.g., Arrays -> Linked Lists -> Trees) using `networkx`.
- **Recommendation Engine**: Suggests optimal learning paths based on identified knowledge gaps.
- **Admin Dashboard**: Comprehensive monitoring of ML metrics, version history, and platform usage.

## 🏗 System Architecture
The platform utilizes a modern, decoupled client-server architecture with a Polyglot Database strategy.

- **Frontend**: React (Vite), TailwindCSS, Recharts.
- **Backend**: FastAPI (Python), providing asynchronous high-performance endpoints.
- **Machine Learning**: Scikit-Learn (Random Forest v8).
- **Generative AI**: Google Generative AI (Gemini) SDK.
- **Data Persistence**: 
  - **PostgreSQL**: Relational schema for ACID-compliant structured data (Users, Topics, Quiz Attempts).
  - **MongoDB**: Unstructured, high-volume data (Chat History, Recommendation Logs).

*(See `docs/architecture_diagram.html` for a detailed visual architecture).*

## 📊 Dataset & ML Pipeline
To overcome the "Cold Start" problem, a custom synthetic educational dataset designed specifically for our AI Learn platform was developed. This is formally referred to as the **Synthetic Learning Behaviour Dataset (SLBD)**.
- **Why SLBD?**: Public datasets (like xAPI-Edu-Data) lacked platform-specific features (e.g., prerequisite mastery, chatbot interactions). We engineered the SLBD around our platform's learning behaviour, using xAPI only as a structural baseline.
- **Dataset Size**: 4007 records generated from a pool of synthetic student profiles simulating hidden ability and engagement traits.
- **Features**: 13 features including `quiz_accuracy`, `ewma_accuracy`, `prerequisite_mastery`, `avg_time_per_question`, `study_duration`, `chatbot_questions`.
- **Target**: Mastery Label (`Weak`, `Moderate`, `Strong`).
- **Model Evaluation**: 99.4% Overall Accuracy on the test validation set. Gaussian noise was injected to simulate natural human variation and prevent overfitting.
- **Model Evolution**: As real student data is collected automatically, it is merged with the SLBD. The production model transitions from synthetic data to predominantly real student data through an automated retraining pipeline.

## 🧠 Knowledge Graph & AI Tutor
- **Knowledge Graph**: Maps topic dependencies to prevent students from accessing advanced topics (e.g., Trees) without mastering prerequisites (e.g., Arrays).
- **AI Tutor**: When a student asks a question, the backend retrieves their ML mastery state and KG gaps, injecting them into the Gemini System Prompt. This forces the LLM to tailor explanations (e.g., "Use simple analogies because this student is weak at Arrays").

## 🔒 Security
- **Authentication**: JWT-based stateless authentication.
- **Password Hashing**: Bcrypt with salt generation.
- **CORS & Middleware**: Strict origin validation and rate limiting.
- **Database Safety**: Parameterized queries via SQLAlchemy ORM to prevent SQL Injection.

## ⚡ Performance & Testing
- **Login Latency**: ~180ms
- **Dashboard Load**: ~240ms
- **ML Inference**: ~110ms
- **Gemini AI Generation**: ~3.8s to 5.2s
- **Recommendation Gen**: ~70ms

## 📸 Screenshots
*(Add screenshots of your running application here)*
- `docs/screenshots/dashboard.png`
- `docs/screenshots/ai_tutor.png`
- `docs/screenshots/admin_panel.png`

## 🔮 Future Scope
- **Real-World Deployment**: Scaling to capture thousands of real student records, phasing out synthetic datasets.
- **Deep Learning Recommendation**: Utilizing collected click-through data to train Collaborative Filtering models.
- **Voice-to-Text**: Adding audio transcriptions for accessible querying.

## 🛠 Setup & Installation
1. **Backend Setup**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # (Windows: .\.venv\Scripts\activate)
   pip install -r requirements.txt
   ```
2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Environment Variables**: Provide `.env` files for Postgres, MongoDB, and your `GEMINI_API_KEY`.
4. **Run Server**:
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

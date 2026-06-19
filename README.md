# 🎓 AI-Powered Adaptive Learning Platform

An intelligent learning platform that uses AI/ML to provide personalized learning experiences, weak topic detection, prerequisite mapping, and exam readiness prediction.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [System Architecture](#system-architecture)
- [Project Flow](#project-flow)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## ✨ Features

### 1. **User Registration & Profile Management**
- Student registration with course/subject selection
- Learning level assessment (Beginner/Intermediate/Advanced)
- Exam target and timeline tracking
- Personalized profile creation

### 2. **Learning Interaction & Data Collection**
- Video lesson tracking
- Interactive quizzes with performance analysis
- AI-powered doubt resolution chat
- Real-time progress monitoring

### 3. **Performance Analysis Engine**
- Topic-wise performance metrics
- ML-based weak topic detection
- Speed vs accuracy analysis
- Performance heatmap visualization

### 4. **Knowledge Graph Mapping**
- Syllabus as directed graph structure
- Prerequisite relationship mapping
- Adaptive learning path generation
- Smart topic sequencing

### 5. **Hybrid Recommendation System**
- Content-based filtering for weak topics
- Collaborative filtering based on similar learners
- Personalized video/quiz recommendations
- Dynamic study schedule generation

### 6. **AI Doubt-Solving Chat**
- Natural language question understanding
- GPT-powered explanations
- Topic detection and classification
- Step-by-step answer generation

### 7. **Exam Readiness Prediction**
- ML regression for readiness scoring
- Success probability prediction
- Actionable improvement tips
- Progress trend analysis

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **React Router** for navigation
- **Recharts** for data visualization
- **Zustand** for state management

### Backend
- **FastAPI** (Python 3.11+)
- **Uvicorn** ASGI server
- **Pydantic** for data validation
- **JWT** authentication

### AI/ML
- **Transformers** for NLP
- **OpenAI GPT** for chatbot
- **scikit-learn** for ML models
- **PyTorch** for deep learning

### Knowledge Graph
- **NetworkX** for graph operations
- **Matplotlib** for visualization

### Databases
- **PostgreSQL** for structured data (users, logs, performance)
- **MongoDB** for flexible content (videos, quizzes, materials)

## 📁 Project Structure

```
PROJECT 2/
├── .github/
│   └── copilot-instructions.md
├── backend/
│   ├── routers/
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── users.py             # User management
│   │   ├── learning.py          # Learning activities
│   │   ├── performance.py       # Performance analysis
│   │   ├── recommendations.py   # Recommendation engine
│   │   └── chat.py              # AI chat endpoints
│   ├── main.py                  # FastAPI application
│   └── config.py                # Configuration settings
├── database/
│   ├── models/
│   │   ├── postgres_models.py   # SQLAlchemy models
│   │   └── mongodb_schemas.py   # Pydantic schemas
│   └── connection.py            # Database connections
├── ml_models/
│   ├── nlp_module.py           # NLP & GPT integration
│   ├── performance_analysis.py  # Weak topic detection
│   ├── recommendation_engine.py # Hybrid recommendations
│   └── exam_readiness.py       # Readiness prediction
├── knowledge_graph/
│   └── graph_manager.py        # Knowledge graph logic
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Learning.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── QuizPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── AnalyticsPage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── requirements.txt            # Python dependencies
├── .env.example               # Environment template
├── .gitignore
└── README.md
```

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                        │
│  React UI (Dashboard, Learning, Chat, Analytics, Profile)   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│                      BACKEND API LAYER                       │
│      FastAPI (Auth, Routing, Data Handling, API Logic)      │
└─────┬─────────────┬─────────────┬─────────────┬────────────┘
      │             │             │             │
      ▼             ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   NLP    │  │  Perf.   │  │  Recom.  │  │  Exam    │
│  Module  │  │ Analysis │  │  Engine  │  │Readiness │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
      │             │             │             │
      └─────────────┴─────────────┴─────────────┘
                    │
      ┌─────────────┴─────────────┐
      ▼                           ▼
┌──────────────┐          ┌──────────────┐
│  Knowledge   │          │   Database   │
│    Graph     │          │   Layer      │
│  (NetworkX)  │          │ (PostgreSQL  │
└──────────────┘          │  + MongoDB)  │
                          └──────────────┘
```

## 🔄 Project Flow

### Step-by-Step Workflow

1. **User Registration** → Student creates profile with course info and exam goals
2. **Learning Interaction** → Watch videos, take quizzes, ask doubts
3. **Data Collection** → System tracks accuracy, time, attempts, scores
4. **Performance Analysis** → ML detects weak topics and patterns
5. **Knowledge Graph** → Maps prerequisites and generates adaptive paths
6. **Recommendations** → Suggests personalized videos/quizzes/schedules
7. **AI Chat** → Provides instant doubt resolution with explanations
8. **Progress Tracking** → Displays readiness score and improvement tips

## 🚀 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- MongoDB 6+

### Backend Setup

1. **Clone the repository**
   ```bash
   cd "c:\Users\karan\Desktop\PROJECT 2"
   ```

2. **Create virtual environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install Python dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your database credentials and API keys
   ```

5. **Initialize databases**
   ```powershell
   # Start PostgreSQL and MongoDB services
   # Then initialize tables
   python -c "from database.connection import init_postgres_db; init_postgres_db()"
   ```

6. **Run the backend**
   ```powershell
   uvicorn backend.main:app --reload --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend**
   ```powershell
   cd frontend
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Run development server**
   ```powershell
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📖 Usage

### For Students

1. **Register** with course details and exam goals
2. **Complete profile** with subject preferences and current level
3. **Start learning** by watching recommended videos
4. **Take quizzes** to test your knowledge
5. **Ask doubts** in AI chat for instant help
6. **View analytics** to track performance and weak topics
7. **Follow recommendations** for personalized study plans

### For Developers

#### Run Backend Tests
```powershell
pytest backend/tests/
```

#### Build Frontend for Production
```powershell
cd frontend
npm run build
```

#### Generate Knowledge Graph Visualization
```python
from knowledge_graph import knowledge_graph
knowledge_graph.visualize_graph("syllabus_graph.png")
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Learning
- `POST /api/learning/video/track` - Track video watch
- `POST /api/learning/quiz/submit` - Submit quiz attempt
- `POST /api/learning/doubt/ask` - Ask a doubt

#### Performance
- `GET /api/performance/analyze/{user_id}` - Get performance analysis
- `GET /api/performance/weak-topics/{user_id}` - Get weak topics
- `GET /api/performance/heatmap/{user_id}` - Get performance heatmap

#### Recommendations
- `GET /api/recommendations/personalized/{user_id}` - Get recommendations
- `GET /api/recommendations/study-plan/{user_id}` - Get study plan

#### AI Chat
- `POST /api/chat/ask` - Ask AI tutor a question
- `GET /api/chat/history/{user_id}` - Get chat history

## 🎯 Key ML Models

### 1. Weak Topic Detection
- **Algorithm**: Random Forest Classifier
- **Features**: Accuracy, time taken, attempts, consistency
- **Output**: Weakness score (0-1) and reasons

### 2. Performance Analysis
- **Method**: Threshold-based + ML classification
- **Metrics**: Accuracy, speed, consistency
- **Visualization**: Heatmaps and trend charts

### 3. Recommendation Engine
- **Approach**: Hybrid (Content-based + Collaborative)
- **Content Filtering**: Based on weak topics and difficulty
- **Collaborative Filtering**: Based on similar users

### 4. Exam Readiness Prediction
- **Algorithm**: Gradient Boosting Regressor
- **Output**: Readiness score, success probability, tips

### 5. NLP Doubt Solver
- **Models**: BART (topic classification), GPT (response generation)
- **Features**: Intent understanding, topic detection, explanation

## 🔐 Security

- JWT token-based authentication
- Password hashing with bcrypt
- CORS protection
- Environment variable configuration
- SQL injection prevention with ORM

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is for educational purposes.

## 👥 Team

AI-Powered Adaptive Learning Platform Team

## 📞 Support

For issues and questions, please open a GitHub issue or contact the development team.

---

**Built with ❤️ using AI/ML and Modern Web Technologies**

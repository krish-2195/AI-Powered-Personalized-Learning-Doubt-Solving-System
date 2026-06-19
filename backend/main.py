from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, users, learning, performance, recommendations, chat, analytics
from backend.config import settings
from database.connection import engine
from database.models.postgres_models import Base
from sqlalchemy import text

app = FastAPI(
    title="AI-Powered Adaptive Learning Platform API",
    description="Backend API for personalized learning with AI/ML capabilities",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(learning.router, prefix="/api/learning", tags=["Learning"])
app.include_router(performance.router, prefix="/api/performance", tags=["Performance"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])


@app.on_event("startup")
async def startup_init_db():
    Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {
        "message": "AI-Powered Adaptive Learning Platform API",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/health/db")
async def health_check_db():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "healthy", "db": "up"}
    except Exception:
        return {"status": "degraded", "db": "down"}

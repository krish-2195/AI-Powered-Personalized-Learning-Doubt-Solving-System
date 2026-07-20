from contextlib import asynccontextmanager
from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.limiter import limiter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from backend.routers import auth, users, learning, performance, recommendations, chat, analytics, dashboard, admin, content, streak, instructor, messages
from backend.config import settings
from database.connection import engine, MongoDBManager, init_postgres_db
from database.models.postgres_models import Base
from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    # Startup
    init_postgres_db()
    MongoDBManager.connect_db()
    
    # Create MongoDB indexes for fast chat history lookups
    from database.connection import get_chat_history_collection
    chat_coll = get_chat_history_collection()
    await chat_coll.create_index([("user_id", 1), ("timestamp", -1)])
    await chat_coll.create_index([("session_id", 1), ("timestamp", 1)])
    print("MongoDB chat_history indexes ensured")
    
    yield
    # Shutdown
    MongoDBManager.close_db()

app = FastAPI(
    title="AI-Powered Adaptive Learning Platform API",
    description="Backend API for personalized learning with AI/ML capabilities",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
from database.connection import get_db
from database.models.postgres_models import SystemSetting
from backend.services.auth import TokenService

@app.middleware("http")
async def maintenance_mode_middleware(request: Request, call_next):
    # Only protect /api/ routes, but allow auth routes so admins can still login
    if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/auth/"):
        # We need a db session
        db_generator = get_db()
        db = next(db_generator)
        try:
            maintenance_setting = db.query(SystemSetting).filter(SystemSetting.key == "maintenance_mode").first()
            if maintenance_setting and maintenance_setting.value.lower() == "true":
                # Check if user is admin
                is_admin = False
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    try:
                        payload = TokenService.decode_access_token(token)
                        # We encoded role in token manually? Wait, standard implementation might just encode sub.
                        # We'll check the DB if role isn't in token.
                        from database.models.postgres_models import User
                        email = payload.get("sub")
                        if email:
                            user = db.query(User).filter(User.email == email).first()
                            if user and user.role in ["admin", "super_admin"]:
                                is_admin = True
                    except:
                        pass
                
                if not is_admin:
                    return JSONResponse(
                        status_code=503,
                        content={"success": False, "message": "System is currently under maintenance. Please try again later."}
                    )
        finally:
            db.close()
            
    response = await call_next(request)
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(learning.router, prefix="/api/learning", tags=["Learning"])
app.include_router(performance.router, prefix="/api/performance", tags=["Performance"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(streak.router, prefix="/api/streak", tags=["Streak"])
app.include_router(messages.router) # Prefix is in router
app.include_router(instructor.router)  # Prefix is defined in the router itself


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

# AI Learn - Project Changelog & Future Roadmap

This document outlines everything we have accomplished over the last few sessions to upgrade AI Learn from a standard project to a robust, production-ready SaaS platform (Phase A). It also serves as a permanent record for our deferred "Phase B" tasks.

---

## 🚀 What We've Built (Phase A: Demo & Launch Ready)

### 1. Authentication & Role-Based Access Control (RBAC)
- **OAuth Integration:** Successfully added Google and GitHub single sign-on (SSO) login flows.
- **Role System:** Implemented a strict 4-tier role hierarchy (`student`, `instructor`, `admin`, `super_admin`).
- **Security Middleware:** Added the `require_role` FastAPI dependency to securely lock down backend endpoints based on the authenticated user's permissions.

### 2. The Student Journey & Core Learning
- **Relational Data Migration:** Moved `Notes` and `Bookmarks` out of MongoDB and correctly modeled them in PostgreSQL to leverage relational mapping.
- **AI Session Summaries:** Replaced hardcoded mocks with a real `POST /api/chat/end-session`. It securely prompts Gemini with the user's active session history, generates a structured summary (Topics Covered, Weak Areas, Recommendations), and saves it to MongoDB.
- **AI Context Injection:** The AI Tutor now dynamically reads the student's actual performance history and knowledge graph gaps before answering, providing deeply personalized tutoring.

### 3. The Instructor Journey & Analytics
- **Course Ownership & Hierarchy:** Updated the upload flow (`POST /api/instructor/upload`) to strictly enforce the relational hierarchy: `Course -> Subject -> Topic -> Content`. Instructors now own their courses.
- **Instructor Dashboards:** Added new endpoints to give instructors powerful oversight:
  - `GET /api/instructor/students-at-risk`: Identifies students with low average scores.
  - `GET /api/instructor/readiness-distribution`: Aggregates the platform's readiness levels for beautiful pie charts.

### 4. Admin, Super Admin & Operations
- **System Settings & Maintenance Mode:** Added a `SystemSetting` PostgreSQL table and a global HTTP middleware. If `maintenance_mode` is `"true"`, all students see a 503 Service Unavailable, while Admins can still log in and operate.
- **AI Usage Tracking:** Created the `AIUsageLog` model to track exactly which feature (e.g., "Quiz", "Tutor") and which model (e.g., `gemini-3.5-flash`) consumes tokens. Built the `GET /api/admin/ai-usage` dashboard endpoint.
- **Audit Logging & Course Approval:** Added `AuditLog` to permanently record critical admin actions. Added a `PATCH` endpoint for admins to approve courses before they go live.

### 5. Stability, SDKs & Security
- **Core AI SDK Migration:** Upgraded from the deprecated `google.generativeai` to the modern `google.genai` SDK, ensuring future compatibility with newer Gemini models.
- **Fallback AI Models:** Built automatic fallback logic in `llm_service.py` that automatically routes requests to `gemini-3.1-flash-lite` if the primary `3.5-flash` model hits rate limits or throws errors.
- **Database Migrations:** Set up `Alembic` to safely autogenerate and apply database schema changes.
- **Rate Limiting:** Installed `SlowAPI` and applied IP-based rate limits to intensive AI endpoints (preventing abuse and saving API costs).

### 6. Professional Testing & Developer Experience
- **Frontend API Contract:** Wrote a comprehensive `frontend/API_CONTRACT.md` detailing exact JSON requests and responses for the frontend developer.
- **E2E Pytest Suite:** Created an industry-standard `tests/` directory with `conftest.py`, testing complete user journeys for students, instructors, and admins using `FastAPI TestClient`.
- **Real Test Assets:** Generated actual, tiny binary files (`sample_video.mp4`, `sample.jpg`) and invalid files (`invalid.exe`) to professionally test the upload constraints.
- **Manual Demo Script:** Created `scripts/demo_flow.py` for quick, one-click manual demonstrations of the backend.

---

## 🔮 What We Will Build Next (Phase B: Production SaaS)
We have intentionally deferred these features to avoid delaying your Phase A launch and placements demo. These are recorded here so we can tackle them in the future:

1. **Asynchronous Background Tasks (Celery/RabbitMQ + Redis):**
   - Offload long-running tasks like AI Study Plan generation, sending verification emails, and heavy dataset processing so the main API thread isn't blocked.
2. **Advanced Dockerization & CI/CD:**
   - Create a production `Dockerfile` and `docker-compose.yml` to containerize FastAPI, PostgreSQL, and MongoDB.
   - Set up GitHub Actions for automated testing.
3. **Advanced Caching (Redis):**
   - Cache expensive database queries (like the Admin and Instructor dashboard aggregations) to massively improve response times.
4. **Strict Upload Validation:**
   - Go beyond checking file extensions. Implement magic byte checking, MIME validation, and automatic video thumbnail generation using `ffmpeg`.

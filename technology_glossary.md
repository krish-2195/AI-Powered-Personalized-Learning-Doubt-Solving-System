# AI Learn Platform - Technology & Concepts Glossary

This document explains **each and every major technology, framework, and concept** used in the backend of the AI Learn Platform. For each item, you will find out what it is in simple terms, exactly how it is used in this project, and why it was chosen.

---

## 1. FastAPI
**What it is:** A modern, incredibly fast web framework for building APIs with Python. It is known for its high performance (on par with NodeJS and Go) and automatic generation of API documentation.
**How it is used here:** 
- It is the core skeleton of the backend (found in `backend/main.py`). 
- It listens for requests from the React frontend (like a request to login or generate a quiz) and routes them to the correct Python function in the `routers/` directory.
**Why it's used:** Because the platform needs to handle simultaneous requests fast—especially when interacting with Machine Learning models and external AI APIs.

## 2. SQLAlchemy ORM (Object-Relational Mapper)
**What it is:** A Python tool that lets developers write Python code to interact with a database instead of writing raw SQL queries (like `SELECT * FROM users`). It translates Python classes into database tables.
**How it is used here:**
- Found in `database/models/postgres_models.py`.
- It defines the structure of the **PostgreSQL** database. For example, `class User(Base):` tells the database to create a table called `users` with columns for email, password, etc.
- When a user logs in, the code does `db.query(User).filter(...)` to find them instead of writing SQL.
**Why it's used:** It makes the code much cleaner, prevents SQL injection attacks, and makes it easy to manage relationships (like a User having many Quiz Attempts).

## 3. Pydantic
**What it is:** A data validation library for Python. You define how data *should* look, and Pydantic ensures the actual data matches those rules.
**How it is used here:**
- Found in `database/models/mongodb_schemas.py` and for API request payloads.
- **For APIs**: If the frontend sends a chat message, Pydantic checks that the payload has a `user_id` (integer), `session_id` (string), and `message` (string). If it's wrong, it automatically rejects the request.
- **For MongoDB**: It defines the structure of the `ChatHistory` documents to ensure consistency before saving them to the NoSQL database.

## 4. PostgreSQL (Relational Database)
**What it is:** A powerful, open-source relational database system. It stores data in highly structured tables with rows and columns, linked by strict relationships.
**How it is used here:**
- It is the primary memory for structured data.
- It stores `Users`, `Topics`, `Content` (videos/articles), `Quiz Attempts`, and `Topic Performance` (whether a student is Weak/Moderate/Strong).
**Why it's used:** Because educational data needs strict integrity. A quiz attempt *must* belong to a real user and a real topic. Postgres enforces these rules (ACID compliance).

## 5. MongoDB (NoSQL Document Database)
**What it is:** A database that stores data in flexible, JSON-like documents rather than rigid tables. 
**How it is used here:**
- It stores the `ChatHistory` (the back-and-forth messages between the student and the AI tutor) and `ActivityLogs`.
**Why it's used:** Chat conversations are unpredictable in length and structure. Trying to force thousands of chat logs into a rigid PostgreSQL table would be slow and messy. MongoDB naturally handles this unstructured "blob" of text efficiently.

## 6. Scikit-Learn & Random Forest (Machine Learning)
**What it is:** Scikit-Learn is Python's standard Machine Learning library. **Random Forest** is an algorithm that creates many "decision trees" and combines their predictions to get a highly accurate result.
**How it is used here:**
- Found in `backend/services/ml_service.py`.
- It takes in 4 numbers about a student's quiz attempt: their `accuracy`, how long they took (`avg_time_seconds`), how many times they tried (`total_attempts`), and the quiz `difficulty`.
- It processes these numbers through its "trees" to classify the student's mastery level as **"Weak"**, **"Moderate"**, or **"Strong"**.
**Why it's used:** It avoids the "Cold Start" problem. Unlike complex Deep Learning models that need millions of records, a Random Forest works great on smaller, tabular datasets (like the synthetic 4,000 record dataset used in this project).

## 7. Google Gemini 2.5 Flash (Generative AI / LLM)
**What it is:** A Large Language Model created by Google, capable of understanding context, writing code, and generating human-like text.
**How it is used here:**
- Managed by `backend/services/ai_tutor.py`.
- **Doubt Solving**: When a student asks a question, the backend injects secret context (like "This student is weak at Arrays") into the prompt and sends it to Gemini. Gemini replies with a personalized explanation.
- **Dynamic Quizzing**: If the platform runs out of pre-written questions for a topic, it asks Gemini to invent brand new multiple-choice questions on the fly and return them in strict JSON format.

## 8. Knowledge Graph (Using NetworkX)
**What it is:** A way of representing relationships between concepts as a web (nodes and edges).
**How it is used here:**
- Mentioned in the `PROJECT_BOOK.md`.
- It maps the prerequisites of subjects. For example: `Variables -> Arrays -> Linked Lists`.
- If a student is failing "Linked Lists", the system checks the Knowledge Graph, realizes they never mastered "Arrays", and flags "Arrays" as a foundational gap. This gap is then told to the AI Tutor to help the student.

## 9. JWT (JSON Web Tokens) & Authentication
**What it is:** A secure way to transmit information between the frontend and backend as a tiny, encrypted string.
**How it is used here:**
- When a user logs in (`backend/routers/auth.py`), the server verifies their password and gives them a JWT.
- The React frontend saves this token and attaches it to every future request (like asking for a quiz).
- The FastAPI backend reads the token, decrypts it, and says "Ah, this is User #5, let me fetch their specific data."

## 10. CORS (Cross-Origin Resource Sharing) Middleware
**What it is:** A security feature built into web browsers that stops a malicious website from making secret requests to a different API.
**How it is used here:**
- Found in `backend/main.py`.
- Because the backend runs on `localhost:8000` and the frontend runs on `localhost:3000`, the browser considers them "different websites" (different origins).
- The CORS middleware explicitly tells the browser: "It is safe to let `localhost:3000` talk to me." Without this, the frontend would be completely blocked from communicating with the backend.

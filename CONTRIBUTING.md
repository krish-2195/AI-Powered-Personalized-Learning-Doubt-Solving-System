# Developer Guide: Avoiding Directory Conflicts

> **Read this before starting any work on this project.**

Recent merge conflicts were caused by Git's confusion over where React frontend files should live. To avoid this happening again, the entire team must follow the standard structure below.

---

## Repository Structure

This is a **Monorepo** — all code lives in one repo, but each concern is strictly separated:

| Directory | Purpose |
|-----------|---------|
| `backend/` | All FastAPI Python code |
| `frontend/` | All React/Vite TypeScript code |
| `ml/` | Machine Learning models and datasets |
| `database/` | Database connection and ORM models |
| `scripts/` | General project utilities |

> ⚠️ **Never run `npm` commands from the repository root.** Always `cd frontend` first.

---

## Onboarding / Resync Checklist

Run these steps **before starting any new work**, especially after a major merge:

### 1. Stash any uncommitted work

If you are currently in the middle of something, save it first:

```bash
git stash
```

### 2. Pull the clean main branch

Sync your local machine with the latest state on GitHub:

```bash
git fetch origin
git checkout main
git reset --hard origin/main
```

> **Note:** `reset --hard` wipes your local `main` and makes it an exact copy of GitHub. This is intentional — it clears out any structural mess from bad merges.

### 3. Work inside the correct directory

Whenever you want to run `npm install`, add a new React component, or start the dev server, your terminal **must be inside `frontend/`**:

```bash
cd frontend
npm install
npm run dev
```

---

## The Golden Rule: Never commit `package.json` to the root

If you accidentally run `npm install <package>` while your terminal is in the **root directory**, it will create a rogue `package.json` and `node_modules/` folder at the root.

**If this happens:**

1. Delete the root-level `package.json` and `node_modules/` immediately.
2. Do **not** commit them.
3. Switch to `frontend/` and re-run `npm install` there.

```bash
# To check you're in the right place before running npm:
pwd   # Should end in .../redesigned-frontend/frontend
```

---

## Running the Project

### Frontend (React/Vite)

```bash
cd frontend
npm install       # only needed first time or after package.json changes
npm run dev       # starts dev server at http://localhost:5173
```

### Backend (FastAPI)

```bash
# From the repo root
.\start-backend.ps1
# or manually:
cd backend
uvicorn main:app --reload
```

### Both together

```bash
# From repo root (PowerShell)
.\start-backend.ps1   # in one terminal
# In a second terminal:
cd frontend && npm run dev
```

---

## Quick Reference: What Goes Where

| You want to… | Do this |
|---|---|
| Add a React component | `cd frontend/src/components` |
| Add a new API route | `cd backend/routers/` |
| Add a Python dependency | Add to `requirements.txt`, then `pip install -r requirements.txt` |
| Add an npm package | `cd frontend && npm install <package>` |
| Run database migrations | `cd scripts && python migrate_*.py` |
| Train/update ML models | `cd ml/` |

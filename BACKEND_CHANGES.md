# Backend Updates Required for Gamified Streak System

The frontend has implemented a new Daily Learning Streak System with animations, a daily popup panel, and milestone celebrations. To fully support this without relying on frontend `localStorage`, the backend needs to implement the following changes.

## 1. Database Schema Additions
Add the following fields to the `User` or `Streak` model:
- `longest_streak` (Integer): The maximum streak the user has ever achieved. Default `0`.
- `last_check_in` (DateTime/Timestamp): The exact date and time the user last extended their streak.

## 2. API Response Updates
Update the user profile payload (e.g., in `/api/auth/me` and `/api/auth/login` responses) to include the new fields.
**Example Payload:**
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "streak_count": 14,
  "longest_streak": 20,
  "last_check_in": "2026-07-08T08:30:00Z"
}
```

## 3. New Check-In Endpoint
Create a new endpoint `POST /api/streak/check-in` that the frontend will call daily when the user logs in or completes a learning action.

**Backend Logic Required:**
1. Check the user's `last_check_in` date.
2. If `last_check_in` was yesterday (or within 24-48 hours depending on timezone logic): Increment `streak_count` by `1`.
3. If `last_check_in` was > 48 hours ago: Reset `streak_count` to `1`.
4. If the newly calculated `streak_count` > `longest_streak`: Update `longest_streak`.
5. Update `last_check_in` to the current timestamp.

## 4. Note on Frontend Behavior
The frontend currently handles the following presentation logic automatically based on the `streak_count`:
- **Daily Popup**: The detailed streak panel automatically pops up once per day on login, complete with a "+1" animation.
- **Milestone Celebrations**: A massive full-screen confetti celebration triggers **only** on Day 1 and multiples of 10 (Day 10, Day 20, etc.). 
- **Next Milestone**: The next target milestone is calculated dynamically on the frontend.

**Summary**: The backend does NOT need to manage when animations trigger. It simply needs to ensure the core data (`streak_count`, `longest_streak`, and `last_check_in`) is accurate and persistent!

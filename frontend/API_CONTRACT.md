# AI Learn - Frontend API Contract

This document provides the exact JSON requests and responses for the newly implemented Phase 1 endpoints to assist frontend integration.

## Learning Features

### 1. Save a Note
`POST /api/learning/notes`

**Headers**:
`Authorization: Bearer <token>`

**Request Body**:
```json
{
  "content_id": 15,
  "title": "Sorting Algorithms",
  "note_text": "Quick sort is typically O(n log n)."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Note created successfully",
  "data": {
    "id": 24,
    "title": "Sorting Algorithms",
    "note_text": "Quick sort is typically O(n log n)."
  },
  "error": null
}
```

---

### 2. Add a Bookmark
`POST /api/learning/bookmarks`

**Headers**:
`Authorization: Bearer <token>`

**Request Body**:
```json
{
  "content_id": 15,
  "note": "Watch this before the exam!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Content bookmarked successfully",
  "data": {
    "id": 12,
    "content_id": 15,
    "note": "Watch this before the exam!"
  },
  "error": null
}
```

---

### 3. End AI Session & Generate Summary
`POST /api/chat/end-session/{user_id}`

**Headers**:
`Authorization: Bearer <token>`

**Request Body**: None (URL param `user_id` required).

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Session ended and summary generated",
  "data": {
    "topics_covered": ["Binary Search", "Time Complexity"],
    "weak_areas": ["Recursion limits"],
    "recommendations": ["Review the 'Recursion basics' video."]
  },
  "error": null
}
```

---

## Instructor Dashboard

### 4. Students at Risk
`GET /api/instructor/students-at-risk`

**Headers**:
`Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Students at risk fetched successfully",
  "data": [
    {
      "id": 3,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "completion": 40,
      "avg_score": 45,
      "last_active": "2026-07-15 10:30",
      "risk_level": "High"
    }
  ],
  "error": null
}
```

---

### 5. Readiness Distribution
`GET /api/instructor/readiness-distribution`

**Headers**:
`Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Readiness distribution fetched successfully",
  "data": [
    {"name": "Ready", "value": 15, "color": "#10B981"},
    {"name": "Needs Review", "value": 8, "color": "#F59E0B"},
    {"name": "At Risk", "value": 3, "color": "#EF4444"}
  ],
  "error": null
}
```

---

### 6. Upload Course Content
`POST /api/instructor/upload`

**Headers**:
`Authorization: Bearer <token>`
`Content-Type: multipart/form-data`

**Form Data**:
- `title`: string
- `description`: string (optional)
- `content_type`: string ("video" or "study-material")
- `course_id`: integer
- `subject`: string
- `topic`: string
- `file`: File (MP4, WEBM, PDF)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Content uploaded successfully",
  "data": {
    "filename": "video.mp4",
    "url": "http://localhost:8000/uploads/uuid.mp4",
    "size": 1048576,
    "type": "video/mp4"
  },
  "error": null
}
```

---

## Admin Dashboard

### 7. AI Usage Stats
`GET /api/admin/ai-usage`

**Headers**:
`Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "by_model": [
      {
        "model": "gemini-3.5-flash",
        "tokens": 45000,
        "requests": 150
      }
    ],
    "by_feature": [
      {
        "feature": "Tutor",
        "tokens": 20000
      },
      {
        "feature": "Summary",
        "tokens": 25000
      }
    ],
    "total_tokens_all_time": 45000
  },
  "error": null
}
```

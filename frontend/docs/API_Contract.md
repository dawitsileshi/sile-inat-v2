# MomHub API Contract

**Version:** 0.1 (draft) · **Date:** 2026-06-06

This document defines the HTTP API between the frontend (React + Vite) and
backend (Flask + SQLite). It is the source of truth for both sides.

---

## 1. Conventions

### Base URL
- Local: `http://localhost:5000`
- Deployed: `https://<your-vercel-deployment>/`

All routes are prefixed with `/api/`.

### Auth
- **None.** The system is intentionally anonymous for judge testing.
- POST endpoints should be IP-rate-limited on the backend (e.g. 30/min) to
  prevent abuse. Not enforced by the contract; backend responsibility.

### Trailing slashes
- All collection routes end with `/` (e.g. `/api/questions/`).
- Sub-resources also end with `/` (e.g. `/api/questions/{id}/answers/`).
- Action routes do **not** end with `/` (e.g. `/api/events/{id}/rsvp`).

### IDs
- All resource IDs are positive integers (`int`), auto-incremented by SQLite.

### Timestamps
- All timestamps are ISO 8601 UTC strings, e.g. `"2026-06-06T10:00:00Z"`.

### Content type
- Requests and responses are `application/json; charset=utf-8`.

### Status codes
| Code | Meaning                                                     |
|------|-------------------------------------------------------------|
| 200  | OK — successful GET / action                                |
| 201  | Created — successful POST that created a resource           |
| 204  | No Content — successful DELETE                              |
| 400  | Bad Request — malformed JSON                                |
| 404  | Not Found — resource does not exist                         |
| 422  | Unprocessable Entity — validation failed                    |
| 429  | Too Many Requests — rate limit hit                          |
| 500  | Server Error                                                |

### Error format
Every non-2xx response uses this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Field 'title' is required.",
    "fields": { "title": "required" }
  }
}
```

- `code` — short machine-readable string (snake_case).
- `message` — human-readable summary.
- `fields` — optional, present on 422; maps field name to error reason.

### Pagination
List endpoints accept:
- `?page=<int>` (default `1`, min `1`)
- `?limit=<int>` (default `20`, max `100`)

Responses are wrapped:

```json
{
  "items": [ /* ... */ ],
  "page": 1,
  "limit": 20,
  "total": 137
}
```

### Filtering / sorting
Per-resource query params are listed below. Default sort is `created_at desc`
unless stated otherwise.

---

## 2. Questions

### `GET /api/questions/`
List questions.

**Query params:**
- `category` (optional) — filter by category slug
- `page`, `limit` — pagination

**200 OK:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Is breastfeeding painful normal?",
      "detail": "I feel pain when breastfeeding...",
      "category": "breastfeeding",
      "display_name": "Anonymous",
      "answer_count": 2,
      "created_at": "2026-06-06T10:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### `POST /api/questions/`
Submit a new question.

**Request:**
```json
{
  "title": "Is this normal after childbirth?",
  "detail": "I feel very tired and emotional after delivery, is this normal?",
  "category": "postpartum_recovery",
  "display_name": "Anonymous"
}
```

**Validation:**
- `title` — required, 5–200 chars
- `detail` — required, 10–4000 chars
- `category` — required, must be a known category slug
- `display_name` — optional, 1–40 chars, defaults to `"Anonymous"`

**201 Created:** returns the created question (same shape as list item, with
`answer_count: 0`).

### `GET /api/questions/{id}/`
Get one question with its answers.

**200 OK:**
```json
{
  "id": 1,
  "title": "Is breastfeeding painful normal?",
  "detail": "I feel pain when breastfeeding and I'm not sure if it's normal.",
  "category": "breastfeeding",
  "display_name": "Anonymous",
  "created_at": "2026-06-06T10:00:00Z",
  "answers": [
    {
      "id": 101,
      "answer": "Some discomfort is normal at first...",
      "display_name": "Anonymous",
      "created_at": "2026-06-06T11:00:00Z"
    }
  ]
}
```

### `POST /api/questions/{id}/answers/`
Add an answer to a question.

**Request:**
```json
{
  "answer": "Make sure the baby has a deep latch...",
  "display_name": "Anonymous"
}
```

**Validation:**
- `answer` — required, 5–2000 chars
- `display_name` — optional, 1–40 chars

**201 Created:**
```json
{
  "id": 103,
  "question_id": 1,
  "answer": "Make sure the baby has a deep latch...",
  "display_name": "Anonymous",
  "created_at": "2026-06-06T13:00:00Z"
}
```

---

## 3. Categories

### `GET /api/categories/`

**200 OK:**
```json
{
  "items": [
    { "slug": "postpartum_recovery", "name": "Postpartum Recovery" },
    { "slug": "breastfeeding",       "name": "Breastfeeding" },
    { "slug": "mental_health",       "name": "Mental Health" },
    { "slug": "newborn_care",        "name": "Newborn Care" },
    { "slug": "nutrition",           "name": "Nutrition" },
    { "slug": "sleep",               "name": "Sleep" }
  ]
}
```

Categories are seeded by the backend; no POST in MVP.

---

## 4. Experts

### `GET /api/experts/`
**Query params:** `page`, `limit`

**200 OK:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Dr. Maria Lopez",
      "specialty": "Postpartum Mental Health",
      "origin": "Spain",
      "bio": "Specialist in emotional recovery after childbirth.",
      "next_event": "2026-06-12T15:00:00Z"
    }
  ],
  "page": 1, "limit": 20, "total": 1
}
```

### `GET /api/experts/{id}/`
Same shape as list item.

### `POST /api/experts/`
**Request:**
```json
{
  "name": "Dr. John Smith",
  "specialty": "Nutrition",
  "origin": "USA",
  "bio": "Expert in maternal nutrition and recovery."
}
```
**Validation:** all four fields required, 1–200 chars.
**201 Created:** returns created expert.

---

## 5. Stories

### `GET /api/stories/`
**Query params:** `page`, `limit`

**200 OK:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "My Journey with Postpartum Recovery",
      "author": "Anonymous",
      "detail": "Sharing my experience of emotional healing...",
      "created_at": "2026-06-05T09:00:00Z"
    }
  ],
  "page": 1, "limit": 20, "total": 1
}
```

### `GET /api/stories/{id}/`
Same shape as list item.

### `POST /api/stories/`
**Request:**
```json
{
  "title": "Weekly Support Group Launch",
  "author": "Community Center",
  "detail": "We are starting a weekly support group for new mothers."
}
```
**Validation:** `title` 5–200, `author` 1–80, `detail` 10–8000.
**201 Created:** returns created story.

---

## 6. Events

### `GET /api/events/`
**Query params:**
- `upcoming` (optional) — `true` to return only events with `time >= now`
- `page`, `limit`

Default sort: `time asc`.

**200 OK:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Breastfeeding Support Group",
      "detail": "Weekly support session for new mothers.",
      "location": "City Health Center",
      "time": "2026-06-08T10:00:00Z",
      "speaker": "Dr. Maria Lopez",
      "recurring": "weekly",
      "rsvp_count": 12
    }
  ],
  "page": 1, "limit": 20, "total": 1
}
```

`recurring` is one of: `"none"`, `"daily"`, `"weekly"`, `"monthly"`.

### `GET /api/events/{id}/`
Same shape as list item.

### `POST /api/events/`
**Request:**
```json
{
  "title": "Nutrition Workshop",
  "detail": "Practical tips for postpartum nutrition.",
  "location": "City Health Center",
  "time": "2026-06-09T11:00:00Z",
  "speaker": "Dr. John Smith",
  "recurring": "none"
}
```
**201 Created:** returns created event with `rsvp_count: 0`.

### `POST /api/events/{id}/rsvp`
Anonymous RSVP. The frontend should send a `session_token` it generates once
and stores in `localStorage`; this lets the user un-RSVP later without auth.

**Request:**
```json
{ "session_token": "a8f2c9d1-..." }
```

**200 OK:**
```json
{ "event_id": 1, "rsvp_count": 13, "rsvped": true }
```

If the same `session_token` RSVPs twice, the server is idempotent (count
doesn't double).

### `DELETE /api/events/{id}/rsvp`
**Request body:**
```json
{ "session_token": "a8f2c9d1-..." }
```
**200 OK:**
```json
{ "event_id": 1, "rsvp_count": 12, "rsvped": false }
```

---

## 7. Knowledge Capsules

### `GET /api/capsules/`
**Query params:**
- `type` (optional) — `"article"` or `"video"`
- `page`, `limit`

**200 OK:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "3 Ways to Improve Sleep",
      "type": "article",
      "content": "Short tips for better postpartum sleep...",
      "content_url": null,
      "author": "Dr. John Smith",
      "created_at": "2026-06-06T08:00:00Z"
    }
  ],
  "page": 1, "limit": 20, "total": 1
}
```

For `type: "article"`, `content` holds the text and `content_url` is null.
For `type: "video"`, `content_url` holds the URL and `content` is null.

### `GET /api/capsules/{id}/`
Same shape as list item.

### `POST /api/capsules/`
**Request (article):**
```json
{
  "title": "Nutrition Tips for Recovery",
  "type": "article",
  "content": "Eat iron-rich foods...",
  "author": "Dr. Maria Lopez"
}
```

**Request (video):**
```json
{
  "title": "Nutrition Tips for Recovery",
  "type": "video",
  "content_url": "https://wellnesscenter.org/videos/nutrition",
  "author": "Dr. Maria Lopez"
}
```

**Validation:**
- `type` must be `"article"` or `"video"`
- if `article` → `content` required
- if `video` → `content_url` required and must be a valid `https://` URL

**201 Created:** returns created capsule.

---

## 8. Discovery Feed

### `GET /api/feed/`
Mixed feed combining experts, stories, events, and capsules.

**Query params:**
- `limit` (default `20`, max `50`)

**200 OK:** returns an array of feed items. Each item is a discriminated
union keyed by `type`:

```json
{
  "items": [
    {
      "type": "expert",
      "id": 1,
      "title": "Meet Dr. Maria Lopez",
      "detail": "Postpartum mental health specialist visiting from Spain."
    },
    {
      "type": "story",
      "id": 4,
      "title": "Community Spotlight: Recovery Journey",
      "detail": "Anonymous mother shares her healing process."
    },
    {
      "type": "event",
      "id": 2,
      "title": "Nutrition Workshop",
      "time": "2026-06-09T11:00:00Z"
    },
    {
      "type": "capsule",
      "id": 7,
      "title": "Daily Wellness Tip",
      "detail": "Drink water before meals to improve digestion."
    }
  ]
}
```

Frontend should switch on `item.type` to render the correct card. The `id`
links back to the resource's detail endpoint.

In MVP, the feed is a simple recency mix (no personalization). No `user_id`
is required.

---

## 9. Deployment note (important)

**Vercel + SQLite caveat:** Vercel's serverless functions have an ephemeral
filesystem. A SQLite file written during one request will not survive cold
starts. For the demo to work for judges, the backend must either:

- Use **Vercel Postgres** (free tier) instead of SQLite, or
- Use **Turso / libSQL** (SQLite-compatible, hosted), or
- Deploy the Flask app to **Render / Railway / Fly.io** where the disk is
  persistent, and only point Vercel at the frontend.

Local development with SQLite is fine.

---

## 10. Open questions

- Do we need image upload for stories / experts? (not in MVP)
- Should the feed support `?type=expert,event` filtering? (TBD)
- Moderation / delete endpoints — needed for demo? (TBD)

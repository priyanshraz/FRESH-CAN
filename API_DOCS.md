# API_DOCS.md — API Reference

---

## Overview

| Field | Value |
|-------|-------|
| **Base URL (Local)** | `http://localhost:3000/api` |
| **Base URL (Production)** | TBD |
| **Auth Method** | None (internal tool) |
| **Response Format** | JSON |

---

## Standard Response Format

**Success**
```json
{ "success": true }
```

**Error**
```json
{ "success": false, "error": "Human readable message" }
```

---

## Endpoints

---

### Webhooks

#### `POST /api/webhooks/n8n-callback`
**Auth:** No (called by n8n server)
**Description:** Receives callback events from n8n after content generation or social posting.

**Request Body:**
```json
{
  "job_id": "uuid",
  "content_type": "video | image_post | blog",
  "event": "draft_ready | generation_complete | post_complete",
  "data": {
    // draft_ready:
    "draft_data": { "title": "...", "body": "..." },

    // generation_complete:
    "file_url": "https://...",
    "thumbnail_url": "https://...",
    "output_data": {},

    // post_complete:
    "platform": "instagram | facebook | twitter | x",
    "platform_post_id": "...",
    "post_url": "https://..."
  }
}
```

**Behavior by event:**
| Event | Action |
|-------|--------|
| `draft_ready` | Upserts row in `content_drafts`, sets job status → `draft_ready` |
| `generation_complete` | Upserts row in `generated_content`, sets job status → `ready` when all types done |
| `post_complete` | Upserts row in `social_platform_logs`, updates `social_posts.status` → `posted` |

**Response (success):**
```json
{ "success": true }
```

**Response (error):**
```json
{ "error": "Job not found" }
```
Status: 400 / 404 / 500

---

## n8n Outbound Webhooks (called by this app, not routes)

These are fired from the frontend — documented here for reference.

### New Content Submission
**URL:** Depends on content type (see CLAUDE.md)
**Method:** POST
**Payload:**
```json
{
  "job_id": "uuid",
  "topic": "string",
  "keywords": "string",
  "category": "string",
  "target_audience": "string",
  "language": "EN | FR | BOTH",
  "brand": "Fresh-CAN",
  "content_type": "video | image_post | blog"
}
```

### Draft Approved → Re-generate
**URL:** Same webhook URLs as above
**Method:** POST
**Payload:**
```json
{
  "job_id": "uuid",
  "content_type": "video | image_post | blog",
  "draft_data": {},
  "brand": "Fresh-CAN"
}
```

### Social Post Approved
**URL:** `https://n8n.srv1712072.hstgr.cloud/webhook/social-post`
**Method:** POST
**Payload:**
```json
{
  "job_id": "uuid",
  "social_post_id": "uuid",
  "content_type": "video | image_post | blog",
  "caption": "string",
  "hashtags": ["tag1", "tag2"],
  "platforms": ["instagram", "facebook"],
  "brand": "Fresh-CAN"
}
```

---

## Changelog

| Date | Change | Endpoint |
|------|--------|----------|
| 2026-06-15 | Created | POST /api/webhooks/n8n-callback |

# CLAUDE.md — Project Brain

---

## 🏗 PROJECT OVERVIEW

| Field | Value |
|---|---|
| **Project Name** | Fresh-CAN Content Automation Dashboard |
| **Description** | AI-powered dashboard: one form triggers Image Post, Video, and Blog via n8n + AI pipelines |
| **Type** | ✅ Dashboard  ✅ Full-Stack |
| **Start Date** | 2026-06-15 |
| **Status** | ✅ In Progress |

---

## 👥 TEAM

| Name | Role | Tool | Contact |
|------|------|------|---------|
| Pri | Lead Developer / Owner | Claude Code CLI | Pri@aumatic.ai |

---

## 🛠️ TECH STACK

| Layer | Choice | Notes |
|-------|--------|-------|
| **Frontend** | Next.js 16 App Router | `/src/app` |
| **Styling** | Tailwind CSS v4 + ShadCN UI | components in `/src/components/ui` |
| **State** | React hooks + Supabase Realtime | realtime on job detail page |
| **Database** | Supabase (PostgreSQL) | project: `jbrktjnscnzmhwupojiu` |
| **API** | Next.js API Routes (REST) | |
| **Automation** | n8n webhooks | 3 webhook URLs |
| **Auth** | Fixed ID/password, HMAC-signed session cookie | `src/proxy.ts` gates all routes; login at `/login` |

---

## 📁 PROJECT STRUCTURE

```
src/
├── app/
│   ├── dashboard/             ← KPI + recent jobs grid
│   │   ├── new/               ← Input form → fires n8n
│   │   ├── jobs/[job_id]/     ← Draft editor (tabbed)
│   │   │   └── social/        ← Caption approval + posting
│   │   └── library/           ← Content library grid
│   └── api/webhooks/n8n-callback/  ← Receives n8n events
│
├── components/
│   ├── layout/                ← Sidebar, DashboardLayout, TopBar
│   ├── ui/                    ← ShadCN primitives
│   ├── skeletons/             ← Loading skeleton components
│   ├── StatusBadge.tsx
│   ├── KPICard.tsx
│   ├── ContentCard.tsx
│   ├── DraftEditor.tsx
│   ├── SocialApprovalCard.tsx
│   └── PlatformSelector.tsx
│
├── services/
│   └── contentService.ts      ← ALL Supabase calls live here
│
├── lib/
│   ├── supabase.ts
│   └── dateUtils.ts
│
└── types/
    ├── content.ts
    └── database.ts
```

---

## 🔐 ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=https://jbrktjnscnzmhwupojiu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase → Settings → API>
N8N_VIDEO_WEBHOOK=https://n8n.srv1712072.hstgr.cloud/webhook/video-genration
N8N_BLOG_WEBHOOK=https://n8n.srv1712072.hstgr.cloud/webhook/blog-post
N8N_IMAGE_WEBHOOK=https://n8n.srv1712072.hstgr.cloud/webhook/image-post
```

---

## 🗄️ SUPABASE TABLES

| Table | Purpose |
|-------|---------|
| `content_jobs` | Parent record per submission |
| `content_drafts` | 3 rows per job — editable AI drafts |
| `generated_content` | Final file URLs |
| `social_posts` | Caption + hashtags + platforms |
| `social_platform_logs` | Per-platform post results |

### Status Colors (NEVER deviate)
| Status | Color |
|--------|-------|
| `pending` | Gray |
| `draft_ready` | Amber |
| `approved` / `generating` | Blue |
| `ready` | Green |
| `failed` | Red |
| `posted` | Purple |

---

## 🌐 N8N WEBHOOK URLS

| Type | URL |
|------|-----|
| Image Post | `https://n8n.srv1712072.hstgr.cloud/webhook/image-post` |
| Video | `https://n8n.srv1712072.hstgr.cloud/webhook/video-genration` *(typo intentional)* |
| Blog | `https://n8n.srv1712072.hstgr.cloud/webhook/blog-post` |
| Callback (inbound) | `POST /api/webhooks/n8n-callback` |

---

## 📐 CODING STANDARDS

1. TypeScript strictly — `any` only for Supabase client generic (documented exception)
2. All DB calls inside `/src/services/contentService.ts` — never fetch in components
3. Every component must have: **loading skeleton**, **error state**, **empty state**
4. ShadCN components only — no new UI libraries without asking
5. Status colors must match the table above exactly
6. No `console.log` in production code

---

## ⚡ COMMANDS

```bash
npm run dev          # http://localhost:3000 → redirects to /dashboard
npm run build        # Production build
npx tsc --noEmit     # TypeScript check
```

---

## 🤖 CLAUDE SESSION RULES

1. Start every session: read `CLAUDE.md` + `PROGRESS.md` + `TASKS.md`
2. After every prompt: update `PROGRESS.md`
3. Task done: mark complete in `TASKS.md`
4. New endpoint: add to `API_DOCS.md`
5. Never change tech stack without asking
6. End of session: ✅ done · 🔄 in progress · ⭐ next steps

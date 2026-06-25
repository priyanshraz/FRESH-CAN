# DECISIONS.md — Architecture Decisions

---

### ADR-001 — Frontend Framework
Date: 2026-06-15
Status: Accepted

Context: Need a full-stack dashboard with server-side API routes and realtime UI.
Decision: Next.js 16 App Router
Reasons: Unified frontend + API routes in one project; App Router enables server components; excellent Vercel deployment story.
Trade-offs: App Router has steeper learning curve than Pages Router; `'use client'` boundaries must be managed carefully.

---

### ADR-002 — Database
Date: 2026-06-15
Status: Accepted

Context: Need a managed Postgres DB with realtime capabilities and a JS client.
Decision: Supabase (project: jbrktjnscnzmhwupojiu)
Reasons: Built-in realtime subscriptions needed for live status updates on job pages; hosted Postgres with no infra to manage; JS client with row-level security.
Trade-offs: Vendor lock-in; realtime has per-second event limits (configured at 10/sec).

---

### ADR-003 — No ORM
Date: 2026-06-15
Status: Accepted

Context: Supabase JS client provides a query builder on top of PostgREST.
Decision: Use Supabase JS client directly — no Prisma/Drizzle.
Reasons: Supabase's query builder is sufficient; adding Prisma would require a separate DB connection and adds complexity; realtime works natively with the Supabase client.
Trade-offs: No migration tooling from the ORM; schema must be managed via Supabase dashboard or raw SQL.

---

### ADR-004 — Supabase Client Generic Type
Date: 2026-06-15
Status: Accepted

Context: `createClient<Database>` with a hand-written Database type caused TypeScript `never` type errors in supabase-js v2 because our type didn't include `Relationships` and `CompositeTypes` fields.
Decision: Use `createClient<any>` — service layer (`contentService.ts`) handles all explicit casting to domain types.
Reasons: Unblocks TypeScript compilation with zero errors; domain types in `content.ts` remain the source of truth.
Trade-offs: No IDE auto-complete on raw Supabase client calls; mitigated by all queries being in the service layer which is explicitly typed.
Future: Generate proper types via `supabase gen types typescript` once DB is stable.

---

### ADR-005 — All Supabase Calls in Service Layer
Date: 2026-06-15
Status: Accepted

Context: Dashboard has 5 pages and 6+ components all needing DB data.
Decision: 100% of Supabase calls live in `/src/services/contentService.ts`.
Reasons: Single place to audit all DB queries; easy to add caching/error handling; components stay pure (props in, events out).
Trade-offs: Service file will grow large — split into multiple service files if it exceeds ~400 lines.

---

### ADR-006 — Realtime Subscription Scope
Date: 2026-06-15
Status: Accepted

Context: Need live updates when n8n posts back to the callback route.
Decision: Subscribe only on `/dashboard/jobs/[job_id]` page — filter by `job_id`.
Reasons: Subscribing globally wastes connections; job detail page is the only place status changes need to appear without a refresh.
Trade-offs: Dashboard KPI cards and library don't auto-refresh; user must navigate away and back. Acceptable for MVP.

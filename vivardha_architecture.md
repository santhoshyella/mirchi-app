# Vivardha — Web App Architecture

> Companion to `vivardha_process_instructions.md`. The process doc describes **what** the business does. This doc describes **how** the software is built to support it.

**Decisions locked in:**

- **Deployment** — Cloud-hosted (single Indian region for low latency to Guntur ops).
- **Scale** — Single business, 20–100 staff. Tens to a few hundred concurrent users at peak.
- **Mobile** — Mobile-supported (responsive, no offline-first). Desktop is primary; phones are convenience devices for floor staff.
- **Backend** — Custom Node.js (NestJS) + PostgreSQL.

---

## 1. High-level architecture

```
                            ┌──────────────────────────────────┐
                            │     Cloudflare (CDN + WAF)       │
                            └──────────────┬───────────────────┘
                                           │
                  ┌────────────────────────┴───────────────────┐
                  │                                            │
        ┌─────────▼──────────┐                       ┌─────────▼──────────┐
        │  Frontend (Vercel) │  ←─── WebSocket ───→  │  Backend (Render/  │
        │  React + Vite + TS │                       │  Railway · NestJS) │
        └─────────┬──────────┘                       └────┬──────┬────────┘
                  │                                       │      │
                  │ HTTPS REST                            │      │
                  └───────────────────────────────────────┘      │
                                                                 │
                                  ┌──────────────────────────────┤
                                  │                              │
                       ┌──────────▼──────────┐         ┌─────────▼────────┐
                       │  Postgres (Neon /   │         │  Redis           │
                       │  managed AWS RDS    │         │  (BullMQ jobs +  │
                       │  · ap-south-1)      │         │  sessions cache) │
                       └─────────────────────┘         └──────────────────┘
                                  │
                                  │
                       ┌──────────▼──────────┐
                       │  Object storage     │
                       │  (S3 / R2 · docs +  │
                       │   bill scans)       │
                       └─────────────────────┘
```

A single-page React app served from Vercel talks to a NestJS API hosted on a managed container platform (Render, Railway, or Fly.io). The API persists to managed PostgreSQL in the Mumbai region for low latency to Guntur. Redis holds background-job queues and a session cache. Object storage holds uploaded bill scans / consignment documentation. WebSocket connections (via the API) push real-time updates so multiple users on the same screen don't trip over each other.

---

## 2. Frontend layer

**Foundation kept from the prototype:**

- React 18 + TypeScript + Vite — already shipping, builds in ~2.5s
- Tailwind CSS with CSS-variable design tokens (`--vv-acc`, `--vv-suc`, etc.) — already in place
- React Router 6 — already wired
- Zustand for **client-only** UI state (filter selections, focus param, etc.) — keep
- lucide-react for icons — keep
- Prettier (already configured) — keep

**To add for production:**

| Concern | Library | Why |
|---|---|---|
| Server state | **TanStack Query (React Query) v5** | Caching, refetch, optimistic updates, pagination. Replaces the in-memory Zustand stores' role of holding domain data |
| Forms | **React Hook Form + Zod** | Type-safe forms with schema-shared validation between FE and BE |
| API client | **Auto-generated from OpenAPI** | NestJS exposes OpenAPI; we generate a typed client (`openapi-typescript-codegen` or `orval`) so frontend types stay in lockstep with API |
| Auth state | **In-memory + httpOnly refresh cookie** | Access token in JS memory, refresh token in httpOnly cookie. CSRF-safe |
| Date handling | **date-fns** (already in deps) | Keep |
| Error tracking | **Sentry** | Frontend errors with source maps |
| Analytics | **PostHog** or none initially | Optional — usage analytics per role |

**Mobile-supported posture:**

- Existing Tailwind responsive breakpoints carry the bulk of the work
- Touch targets stay at min 40px for any tap-interactive element on mobile (Tailwind `min-h-[40px]` discipline)
- The TopBar / Sidebar / MobileTabBar split already handles desktop vs mobile chrome
- No service worker / offline cache in v1 — operators are expected to have connectivity

**State boundary:**

| State kind | Where it lives | Example |
|---|---|---|
| Server-owned data | React Query cache (keyed by URL) | Purchases, destemming jobs, raasi batches, orders |
| Client-only UI state | Zustand store per feature | Filter selections, focus param, draft form values |
| Auth | React Context + memory + cookie | Current user, role, permissions |

The current Zustand stores migrate to React Query for the server-state half; the UI-state half (filters, focus, expanded panels) stays in Zustand.

---

## 3. Backend layer

**Framework: NestJS**

Chosen over Fastify-alone because the domain has clear module boundaries that map perfectly to NestJS modules: `purchase`, `destemming`, `raasi`, `order`, `auth`, `users`, `accounts`, `reports`. NestJS's DI + decorators + guards keep cross-cutting concerns (auth, RBAC, audit) clean without rolling our own framework.

**Language: TypeScript** (shared types with FE via a `packages/shared-types` workspace; or generate types from Prisma + OpenAPI).

### Module layout

```
apps/
  api/                          ← NestJS application
    src/
      modules/
        auth/                   ← Login, refresh, password reset, MFA
        users/                  ← User CRUD, role assignment
        purchase/               ← Purchase items, stage advance, notes
        destemming/             ← Jobs, dispatches, receipts
        raasi/                  ← Batches, source merge, collect
        order/                  ← Orders, allocations, advance, settle
        inventory/              ← availableInventory selector as API
        reports/                ← Aggregations: P&L per consignment, daily KPIs
        labour-cost/            ← Per-stage daily labour records
        audit/                  ← Append-only audit log
        notifications/          ← Email/SMS hooks (settle reminders, etc.)
      common/
        guards/                 ← JwtAuthGuard, RolesGuard
        decorators/             ← @Roles(), @CurrentUser()
        interceptors/           ← AuditInterceptor, LoggingInterceptor
        filters/                ← HttpExceptionFilter (consistent error shape)
      config/                   ← env, db, redis, jwt config (validated by class-validator)
      prisma/                   ← Prisma client + custom extensions
  web/                          ← Existing React app (renamed from vivardhaa-app/web)
packages/
  shared-types/                 ← Zod schemas + inferred TS types shared FE/BE
```

A pnpm workspace monorepo so the FE and API can share `shared-types` without publishing to npm.

### API style

**REST + OpenAPI** is the right call here over GraphQL:

- Domain is procedural (stage transitions, allocations, settlement) more than graph-y. Mutations dominate over flexible reads
- Auto-generated OpenAPI spec → auto-generated typed client for FE → no manual API contract drift
- Cacheable in React Query by URL — simple and predictable

**Real-time** via Socket.IO (NestJS Gateways): clients subscribe to `room:${entityType}:${entityId}` so when User A advances a purchase, User B's open view of that lot live-updates. Don't try to make every list page reactive — only entity detail views and shared queues benefit; the overhead isn't worth it for KPI rollups.

### ORM: Prisma

Prisma over TypeORM:

- Best-in-class DX with generated types
- Migrations are SQL files that humans can review (vs TypeORM's auto-sync foot-gun)
- Good Postgres feature support (JSONB, arrays, partial indexes)

### Background jobs: BullMQ + Redis

- Settlement reminder emails / SMS (delivery deadline in 3 days)
- Daily KPI rollup pre-computation
- Bill discrepancy escalation notifications
- Invoice PDF generation
- Future: batch exports / reports

### Validation: Zod everywhere

- Same Zod schemas validate API input AND drive FE forms
- Lives in `packages/shared-types` so both sides import the same definitions
- NestJS `ZodValidationPipe` accepts these schemas in route decorators

---

## 4. Database layer

### Engine: PostgreSQL 15+

Managed Postgres on **Neon** (serverless, autoscale, cheap) or **AWS RDS** (Mumbai region — `ap-south-1`) for production. Both support point-in-time recovery and read replicas if reporting load grows.

### Schema overview

The schema maps closely to the domain types already in `vivardhaa-app/web/src/types/domain.ts`. Key tables:

```sql
-- Identity
users               (id, name, phone, email, password_hash, created_at)
roles               (id, name, description)
user_roles          (user_id, role_id)                      -- many-to-many

-- Purchase
purchases           (id, date, source_type, shop, variety, type, mark,
                     bags, kg, price_per_kg, destination,
                     dispatch_deadline, current_stage, probability,
                     is_rejected, accounts_status, settled_at, created_at)
purchase_notes      (id, purchase_id, stage, text, author_id, at)
purchase_stage_log  (id, purchase_id, stage, entered_at, assignee_id)

-- Destemming
destemming_jobs     (id, purchase_id, snapshot_shop, snapshot_variety, …,
                     status, date, created_at)
destemming_dispatches (id, job_id, point, sent_bags, sent_kg, sent_at,
                       received_kg, received_at, note)
destemming_notes    (id, job_id, text, point, author_id, at)

-- Raasi
raasi_batches       (id, source_type, snapshot_shop, snapshot_variety, …,
                     input_bags, input_wet_kg, spread_date,
                     collected_date, output_dry_kg, status, created_at)
raasi_sources       (batch_id, source_kind, source_id)      -- multi-source
raasi_notes         (id, batch_id, text, author_id, at)

-- Outward orders
orders              (id, customer, destination_city, date, variety, mark,
                     target_kg, price_per_kg, delivery_deadline,
                     current_stage, settled_at, is_cancelled, created_at)
order_allocations   (id, order_id, source_kind, source_id, snapshot_shop,
                     snapshot_variety, snapshot_type, snapshot_mark,
                     allocated_kg, allocated_at, note)
order_notes         (id, order_id, stage, text, author_id, at)
order_stage_log     (id, order_id, stage, entered_at, assignee_id)

-- Labour costs (per stage, per process, per day)
labour_costs        (id, process, stage, date, head_count, cost_per_person,
                     total_cost)

-- Audit log (append-only, who-did-what)
audit_log           (id, actor_id, entity_type, entity_id, action, diff_json,
                     at)
```

### Key design decisions

**Snapshot vs join.** The same pattern from the prototype carries over: when a destemming job is created from a purchase, the relevant purchase fields (shop, variety, type, mark) are **copied** into the job row (`snapshot_*` columns). This means:

- Rendering a destemming row doesn't require a join — pure read of one table
- A later edit to the source purchase doesn't retroactively rewrite history downstream
- Trade-off: ~5% more storage, ~zero query time

Same pattern for raasi batches (snapshot from primary source) and order allocations (snapshot from lot).

**`raasi_sources` as a join table.** Raasi's multi-source merging makes a 1:N relationship between batch and source. Modeled as a separate table rather than as a JSON array column so we can index `(source_kind, source_id)` for the cross-link queries ("which raasi batch used this destemming job?").

**Computed status, stored.** `destemming_jobs.status` and `orders.current_stage` are stored even though they're derivable from `dispatches` / `stage_log`. Storing them keeps stage-chip count queries to one indexed scan instead of a per-row aggregate.

**Audit log.** Every state-changing action (advance, settle, allocate, cancel) writes a row to `audit_log` with the before/after JSON diff. This is the foundation for the "who did what when" reporting that businesses always end up needing.

### Indexes

Heavy-hit indexes (created in initial migration):

- `purchases (current_stage, date, variety)` — list page filters
- `purchases (id) WHERE is_rejected = false` — partial index for active stock
- `destemming_jobs (status, date)` — list + queue counts
- `destemming_dispatches (job_id, point)` — point-projection queries
- `raasi_sources (source_kind, source_id)` — "is this lot in raasi?" lookup
- `orders (current_stage, settled_at)` — KPI computations
- `order_allocations (source_kind, source_id)` — "left over" calculations
- `audit_log (entity_type, entity_id, at DESC)` — entity-history view

### Backup & recovery

- Postgres point-in-time recovery (PITR) — 7-day window via Neon/RDS
- Daily logical backups to S3, retained 30 days
- Monthly snapshot retained 1 year

### Data privacy

India's DPDP Act 2023 applies. PII fields (`users.phone`, `users.email`, customer phone numbers if added) are flagged at the schema level. Encryption at rest is provided by the managed Postgres host; encryption in transit via TLS 1.3.

---

## 5. Authentication & Authorization

### Authentication

**Primary**: phone + OTP (highly preferred in India — most staff have phones, fewer have emails)
**Secondary**: email + password (for admin / accounts / desktop users)
**Future**: optional TOTP MFA for admin role

**Sessions**:
- Short-lived **access token** (JWT, 15 min, in-memory on FE)
- Long-lived **refresh token** (opaque, 30 days, rotating, stored in httpOnly + Secure + SameSite=strict cookie)
- Logout revokes refresh token at the DB level (small `revoked_refresh_tokens` table with TTL cleanup)

**OTP delivery**: MSG91 or Twilio for SMS. Both have INR pricing for India SMS. Budget ~₹0.25/SMS.

### Authorization — RBAC

Roles map to the operational teams from `vivardha_process_instructions.md`:

| Role | Can do |
|---|---|
| `admin` | Everything; user management |
| `purchase_head` | Approve purchases, resolve discrepancies, see all P&L |
| `purchase_team` | Create purchase items, set probability |
| `machule_team` | Stage 2 actions only (pass/reject) |
| `weighing_team` | Stage 3 actions only (confirm weight) |
| `loading_team` | Stage 4 actions only |
| `ac_incharge` / `godown_incharge` / `direct_load_incharge` / `raasi_incharge` | Receipt confirmation; godown gets destemming/raasi too |
| `accounts_team` | Bill verification, settle payments, invoice generation |
| `outward_incharge` / `outward_team` | Outward order create/advance |
| `viewer` | Read-only access (e.g. owner's family member, auditor) |

Implemented as NestJS guards: `@Roles('machule_team', 'admin')` on each route. RBAC matrix lives in a single config file and is also exposed to the frontend (via `/me`) so the FE hides actions the user can't perform.

**Beyond RBAC** (future): per-record assignment (Purchase row's `stageAssignee`) is informational, not security. If we ever need "only the assigned user can advance this row", that becomes an attribute-based check on top of RBAC.

---

## 6. Infrastructure & deployment

### Recommended stack

| Layer | Provider | Why |
|---|---|---|
| Frontend hosting | **Vercel** | Best DX for Vite/React. Preview env per PR. Edge caching. Free tier covers this scale |
| Backend hosting | **Render** or **Railway** | Container deploys, managed Postgres, $10–$30/mo footprint. Both have India-region (or low-latency to India) edge. Fly.io is the alternative if you need true regional control |
| Database | **Neon** (serverless Postgres, Singapore region — closest to India) or **AWS RDS Mumbai** if you need ap-south-1 strict | Neon has the better solo-dev DX; RDS has stronger SLAs |
| Redis | **Upstash Redis** (serverless, pay-per-request) | Cheap at this scale; native Singapore/India edge |
| Object storage | **Cloudflare R2** | S3-compatible, no egress fees |
| CDN + WAF | **Cloudflare** | Free tier covers DDoS, bot protection, asset caching |
| Email | **Resend** or **SendGrid** | Transactional only (password reset, settle reminders) |
| SMS / OTP | **MSG91** | India-first; better deliverability than Twilio inside India |
| Error tracking | **Sentry** | FE + BE; free tier OK to start |
| Logs | Platform's built-in + **Better Stack** if needed | Platform-native is fine until reporting needs cross-correlation |

### Environments

- **Dev** — Local `pnpm dev` against a local Docker Postgres
- **Preview** — Per-PR Vercel preview + per-branch Render service deploys (optional, can skip BE preview to save cost)
- **Staging** — `staging.vivardha.com` against a staging DB. Used for QA, training, and the rare migration dry-run
- **Production** — `app.vivardha.com`. Locked down; deploys via PR merge to `main` after manual approval

### Region & latency

Target sub-200ms p50 for Guntur ops:

- Frontend on Vercel edge — sub-50ms from anywhere
- Backend on Render Singapore — ~90ms RTT from Guntur
- Postgres on Neon Singapore — co-located with backend, single-digit ms intra-DC
- Cloudflare on top — caches static assets and the OpenAPI spec

If Render's Singapore latency proves too high, move BE to a Mumbai-region provider (AWS Lightsail, DigitalOcean Bangalore) for ~30ms RTT.

---

## 7. CI/CD

### GitHub Actions pipeline

```
Pull request opened
  ├─ Lint (ESLint + Prettier check)
  ├─ Typecheck (tsc -b)
  ├─ Unit tests (Vitest)
  ├─ Integration tests (BE only — spin up Postgres in docker-compose)
  └─ Deploy preview to Vercel (FE) + Render preview env (BE)

PR merged to main
  ├─ All the above
  ├─ Build production bundles
  ├─ Run DB migrations against staging
  ├─ Deploy to staging.vivardha.com
  └─ Manual approval gate

Approval clicked
  ├─ Run DB migrations against production (Prisma migrate deploy)
  └─ Deploy to app.vivardha.com (zero-downtime rolling)
```

### Migrations discipline

- Every PR that changes the schema must include a Prisma migration
- Migrations are reviewed in PR (not auto-applied locally during `prisma generate`)
- Production migrations run in a separate step before the app rolls — never inside container startup
- Schema-breaking changes go in two PRs: PR1 adds the new shape backward-compatibly, PR2 removes the old shape after the deploy stabilizes

### Secrets

- Per-environment secret store in the host platform (Vercel Env Vars + Render Env Vars)
- Local dev uses `.env.local` (gitignored)
- No secrets in git, ever

---

## 8. Monitoring & observability

| Concern | Tool | Setup |
|---|---|---|
| Frontend errors | Sentry | Auto-capture unhandled errors + source maps from Vite build |
| Backend errors | Sentry | NestJS exception filter forwards everything to Sentry |
| Logs | Platform-native (Render / Vercel) | Filter by request-id (NestJS interceptor sets one) |
| Uptime | UptimeRobot or BetterStack | Pings `/health` every minute from 5 regions |
| Performance | Vercel Analytics (FE) + APM via Sentry (BE) | Catches the slow route before users complain |
| Database | Neon / RDS dashboard | Query duration p99, connection count |
| Cost | Per-platform billing alerts | Email at 80% of monthly budget |

### Key dashboards we'll need

- **Operational health** — error rate, p99 latency, active users
- **Business health** — daily new orders, KG sold, settlement aging
- **Cost** — infra spend per month, per-feature

---

## 9. Migration path from current prototype

The existing prototype is a static React app with in-memory Zustand stores. The migration to the architecture above happens incrementally — the app never breaks for users.

### Phase A · Backend skeleton (1–2 weeks)

1. Set up the monorepo (`pnpm` workspaces): move existing `vivardhaa-app/web` to `apps/web`, scaffold `apps/api` (NestJS), create `packages/shared-types`
2. Prisma schema for `users`, `purchases`, `purchase_notes`, `purchase_stage_log`, `audit_log`
3. NestJS modules: `auth` (phone OTP + JWT refresh), `users`, `purchase`
4. Migration runner, seed script for an admin user
5. Deploy to staging on Render + Neon

### Phase B · Wire Purchase end-to-end (1 week)

1. OpenAPI spec exposed at `/api-spec.json`
2. Generate FE client via `orval`
3. Swap PurchaseListPage's Zustand domain reads for React Query calls
4. Mutations: createPurchase, advanceStage, settleAtAccounts, etc.
5. RBAC enforced on each endpoint; FE hides actions the user can't perform
6. Login screen + auth flow on the FE
7. Audit log appends on every state change

### Phase C · Destemming + Raasi + Orders (2–3 weeks)

1. Prisma schema for the remaining three feature areas
2. NestJS modules for each
3. Swap remaining Zustand domain reads for React Query
4. Cross-store concerns (inventory, left-over) move to a server `inventory` module so a single SQL query computes them — no more in-FE recomputation

### Phase D · Reports + real-time (1–2 weeks)

1. `reports` module with the P&L per-consignment + daily KPI rollups
2. WebSocket gateway with rooms per entity (`purchase:p-001`, `destemming:d-001`, etc.)
3. FE detail views subscribe; list views still poll (every 30s) via React Query refetch interval
4. Background jobs: settle reminder emails/SMS via BullMQ

### Phase E · Polish + production deploy (1 week)

1. Sentry wired in FE + BE
2. UptimeRobot monitors
3. Production DB provisioned (Neon prod project or RDS Mumbai)
4. Domain DNS pointed (Cloudflare)
5. Soft-launch to 2–3 power users for a week
6. Full rollout, prototype Zustand domain stores removed

**Total estimate: 6–10 weeks of solo work**, dependent on how much QA / training you fold in. With a second developer it compresses to 4–6 weeks.

---

## 10. Cost estimate

| Item | Plan | Monthly cost |
|---|---|---|
| Vercel | Hobby (free) → Pro at scale | ₹0 → ₹1,700 ($20) |
| Render or Railway (BE + Redis) | Starter | ₹2,500 ($30) |
| Neon Postgres | Pro | ₹1,700 ($20) |
| Upstash Redis | Pay-as-you-go | ₹500 ($6) |
| Cloudflare | Free | ₹0 |
| Cloudflare R2 (storage) | Pay-per-GB | ₹400 ($5) |
| Sentry | Team (small) | ₹2,200 ($26) |
| MSG91 SMS (OTP) | Per-message | ~₹1,500 ($18) at 5000 OTPs/mo |
| Domain | annual | ₹100/mo equivalent |
| **Total (production)** |   | **~₹10,000 ($120)/mo** |

Staging adds ~₹3,000–4,000/mo (separate Neon project + Render service); skip if budget is tight and use a single shared staging DB on the free tier.

Phase A–B (build + initial deploy) runs on free tiers of everything except SMS and the domain — under ₹2,000/mo.

---

## 11. Things explicitly out of scope (for now)

These are good ideas that we deliberately defer until the core is stable:

- **Offline PWA / service workers** — Mobile-supported posture means we don't need this for v1. Can add later if internet reliability turns out to be a problem
- **Native mobile app** — A PWA wrapped in Capacitor would get us to App Store / Play Store fast, but only after the web UX is solid
- **Multi-tenant SaaS** — Architected to be single-tenant. If we later sell to other mirchi businesses, the path is: add `tenant_id` columns + RLS policies, route by subdomain
- **GraphQL** — REST + OpenAPI is enough given the procedural domain
- **Event sourcing** — The audit log gives us 90% of the benefit at 5% of the complexity
- **Microservices** — Single NestJS monolith fits 20–100 users comfortably; split only if a single module dominates load

---

## 12. Open questions to revisit

These need product decisions before we commit to a design:

1. **Bill scans / photo uploads** — Are operators expected to photograph bills at purchase time and upload? Drives S3 quotas and a `attachments` table
2. **Multi-language UI** — Telugu support? Affects the design system early (RTL not a concern; just translation infrastructure)
3. **Printable invoices** — PDF generation server-side (puppeteer) vs client-side (jsPDF)? Affects whether we need a render service
4. **Reporting exports** — Excel/CSV downloads via the UI? Drives a `reports/export` route + temporary file storage
5. **Notifications channel** — Email + SMS, or also WhatsApp Business? WhatsApp is more reliable than SMS in India but requires Business API approval

---

## 13. Reference — current prototype to production mapping

How each piece of the existing app maps to the proposed architecture:

| Prototype today | Production target |
|---|---|
| `features/purchase/store.ts` (Zustand) | NestJS `PurchaseModule` + React Query hooks |
| `features/purchase/selectors.ts` | SQL queries in NestJS service + the same selector shape exposed to FE |
| `features/order/selectors.ts → availableInventory` | A single SQL view or service method `inventory.list()` on the backend |
| `Zustand seeds (now empty)` | Prisma `seed.ts` script run against dev/staging DBs |
| In-memory ID generation (`p-001`) | Postgres serial sequence per entity |
| In-memory cross-store reads (`useDestemmingStore.getState()` inside Raasi store) | SQL joins + foreign keys |
| `?focus=` URL param | Keep verbatim — works the same against API-backed lists |
| `cn`, `fmtIN`, `fmtKG`, `fmtINR`, etc. | Keep verbatim in `apps/web/src/lib` |
| Component library (`Card`, `Pill`, `Chip`, etc.) | Keep verbatim — design system stays |
| Tailwind tokens (`--vv-acc`, etc.) | Keep verbatim |

The frontend's component library, routing, and design system **don't change** at all. The migration is almost entirely about replacing "Zustand → in-memory data" with "React Query → API → Postgres".

---

*End of architecture doc. Keep this open during BE scaffolding and migration; revise as decisions are made on the open questions above. Companion business-process doc: `vivardha_process_instructions.md`.*

## 🚀 Features Overview

CleanerOps is an end-to-end SaaS platform designed to manage, optimize and grow professional cleaning service businesses.

It combines operational execution, customer experience, financial intelligence and monetization systems into a single scalable architecture.

### 🧭 Operations & Dispatch

- Smart weekly scheduling board with team assignment  
- Route optimization engine (heuristic-based, map-provider ready)  
- Travel time estimation and buffer suggestions  
- Load balancing signals between teams  
- Lateness and overbooking risk indicators  
- Recurring service influence on planning  
- Suggested visit reordering with one-click apply  
- Visit execution workflow (start / finish / cancel / reopen)

### 🗺 Routing & Geographic Intelligence

- Route recommendation per team/day  
- Current vs optimized route comparison  
- Distance and travel efficiency metrics  
- Coordinate resolution readiness (exact vs estimated)  
- Map preview payload structure (markers / polyline ready)  
- Profitability analysis by suburb / operational area  

### 👥 Client & CRM Management

- Full client lifecycle tracking (lead → active → at-risk → churn)  
- VIP / high-value customer signals  
- Service frequency visibility  
- Client notes timeline and service history  
- Acquisition source tracking (referral, web, phone, etc.)  
- Referral program foundation and campaign tracking  
- CRM segmentation readiness for retention and growth  

### 🧾 Visits, Proof of Service & Communication

- Visit history with execution metrics  
- Before/after photo references and proof timeline  
- Reminder workflow pipeline (job lifecycle + retry readiness)  
- Service completion communication flow  
- Invoice lifecycle domain (draft / issued / paid / failed readiness)  
- Communication status visibility for operators  

### 💰 Finance & Profitability

- Daily and monthly revenue summaries  
- Cost tracking signals (travel impact estimation)  
- Margin and profitability visibility  
- Suburb / region financial analytics  
- Operational financial dashboard widgets  

### 💳 Payments & Monetization

- Payment domain with lifecycle transitions (pending → captured → refunded, etc.)  
- Invoice balance synchronization on payment events  
- Provider adapter boundary (Stripe-ready)  
- Payment reconciliation model with idempotency strategy  
- Subscription plan catalog and recurring revenue metrics (MRR / ARR readiness)  
- Client membership lifecycle management  

### 🧑‍💻 Customer Portal & Booking

- Customer portal foundation with protected routing  
- Online booking request workflow  
- Recurring cleaning configuration (weekly / fortnightly / monthly readiness)  
- Upcoming services visibility  
- Service history and invoice references  
- Membership / subscription visibility  

### ⚙️ Background Jobs & Reliability

- Operations job pipeline foundation (reminders, invoices, lifecycle refresh, payments)  
- Retry-safe execution model  
- Sync health and degraded-mode signals  
- Audit event timeline readiness  
- Error boundary and runtime configuration validation  

### 🏗 Architecture & Scalability

- Modular domain-service-repository architecture  
- Persistence gateway (local durable store → Supabase migration ready)  
- Multi-tenant readiness with organization scoping strategy  
- Auth + role model (owner / ops / cleaner / portal user)  
- Route-level lazy loading and performance chunking  
- Vitest domain test foundation  
- Deployment runbooks and production hardening documentation  

CleanerOps is currently in a **production-ready MVP stage**, prepared for real tenant rollout, provider credential wiring and live operational validation.

## Run locally

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run test:run
npm run build
```

Release gates:

```bash
npm run check:env:staging
npm run check:env:production
npm run db:bundle:pilot
```

Portal login (local demo): `http://localhost:5173/portal/login`

## Environment

Copy `.env.example` to `.env` and configure provider mode:

- `VITE_DATA_PROVIDER=local` (default) or `supabase`
- `VITE_AUTH_PROVIDER=local` (default) or `supabase`
- `VITE_ORGANIZATION_ID` for tenant-scoped readiness
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` when using Supabase mode
- `VITE_EMAIL_TRANSPORT=mock|webhook` and `VITE_EMAIL_WEBHOOK_URL`
- `VITE_PHOTO_STORAGE_PROVIDER=placeholder|webhook` and `VITE_PHOTO_WEBHOOK_URL`
- `VITE_MAP_PROVIDER=mock|webhook` and `VITE_MAP_WEBHOOK_URL`
- `VITE_PAYMENT_PROVIDER=manual|stripe|paypal|subscription_billing` and `VITE_PAYMENT_WEBHOOK_URL`
- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN` and `VITE_STRIPE_PUBLISHABLE_KEY` for Stripe-first adapter readiness

## Included foundations

- Modular frontend architecture with domain-separated services
- Dashboard + operations pages (clients, schedule, teams, employees, finance, products, visits, bookings, recurring, monetization, CRM)
- Communications operations page for reminder/invoice/completion pipeline lifecycle
- Work clock flow (start/finish visits) with history and duration tracking
- Reminder queue, invoice lifecycle, completion email workflow, and unified communication job tracking
- Proof-of-service metadata lifecycle with before/after grouping and readiness visibility
- Customer portal foundation with separate route/shell/auth boundary
- Customer booking request flow and internal booking review pipeline
- Recurring rule projection and materialization workflow
- Route optimization heuristic engine with dispatch apply flow and map-preview-ready payloads
- Smarter schedule signals (overbook/lateness/load balance) and area profitability analytics
- Payment records linked to invoices with capture/refund lifecycle and provider-ready adapters
- Subscription plan + client membership foundation with MRR/ARR analytics
- CRM lifecycle, referral tracking, and growth campaign foundation
- Stripe-first payment hardening (idempotency, provider events, reconciliation cycle)
- Background operations job queue for async workflows (dispatch, lifecycle refresh, reconciliation)
- Audit timeline foundation for critical mutation traceability
- Repository-backed persistence flow with local durable storage + Supabase-ready data source gateway
- Conflict-aware Supabase reconciliation with tenant-scoped strategy controls
- Auth/session foundation with protected routing, role model, and user-type boundary (internal/customer)
- Route-level code splitting and chunk strategy for production runtime performance
- Vitest test foundation for core payment/optimization/CRM/persistence reliability paths
- Scheduling estimation and finance logic as pure utility modules
- Supabase-ready data model documentation and replaceable service layer
- Future-ready placeholders for advanced reminders/invoices/photos provider integrations, ratings, payments, and AI optimization layers

## Docs

- `docs/architecture.md`
- `docs/mvp-scope.md`
- `docs/data-model.md`
- `docs/workflows.md`
- `docs/roadmap.md`
- `docs/implementation-status.md`
- `docs/persistence.md`
- `docs/auth-strategy.md`
- `docs/customer-portal.md`
- `docs/production-hardening.md`
- `docs/deployment/launch-checklist.md`
- `docs/deployment/frontend-deployment.md`
- `docs/deployment/supabase-setup.md`
- `docs/deployment/stripe-setup.md`
- `docs/deployment/webhook-deployment.md`
- `docs/deployment/worker-runtime.md`
- `docs/deployment/post-deploy-checks.md`
- `docs/deployment/rollback-checklist.md`
- `docs/deployment/schema-mismatch-audit.md`
- `docs/deployment/deploy-command-templates.md`
- `RELEASE_PREP/README.md`
- `RUNBOOK.md`
- `PILOT_RUNBOOK.md`
- `PILOT_CHECKLIST.md`
- `OPERATOR_QUICK_START.md`
- `PILOT_READINESS.md`
- `AGENTS.md`
- `samples/pilot-clients-sample.csv`

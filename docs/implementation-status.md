# Implementation Status

## Implemented now (real behavior)

### Internal operations

- Clients, schedule, visits, teams, employees, finance, products, dashboard.
- Visit execution lifecycle with proof metadata and communication status linkage.
- Reminder/invoice/completion communication pipelines with job tracking and retries.

### Operational intelligence and optimization (Phase 6)

- Route optimization foundation:
  - team/day route analysis with nearest-neighbor heuristic ordering
  - current-order vs recommended-order travel distance/time comparisons
  - route recommendation apply flow persisted via schedule repository action
- Map integration readiness:
  - map provider abstraction (`mock` + webhook/provider-ready mode)
  - coordinate-aware route preview payloads (markers + polyline-ready structure)
  - explicit geocode quality/coverage signals across schedule and team views
- Smarter scheduling signals:
  - dynamic travel buffer recommendation
  - lateness risk indicators
  - overbook risk indicators
  - cross-team load balance signals (overloaded/underutilized)
  - recurring influence signal in day planning
- Finance analytics expansion:
  - travel-cost-adjusted daily/monthly profit
  - suburb/area profitability with margin + signal quality states
  - route-distance impact included in finance trends and dashboard widgets

### Monetization, CRM, and growth (Phase 7)

- Payments foundation:
  - payment records linked to invoices/clients
  - lifecycle states (pending/captured/failed/refunded/cancelled)
  - invoice balance synchronization on capture/refund
  - internal and portal payment visibility
- Subscription foundation:
  - recurring plan catalog and pricing tiers
  - client subscription assignments and lifecycle states
  - recurring revenue analytics (MRR/ARR)
  - portal visibility for active plan context
- CRM lifecycle foundation:
  - enriched lifecycle profiles per client
  - stage/risk/VIP controls
  - lead vs customer visibility
  - retention/reactivation and upsell-ready segmentation signals
- Marketing/referral foundation:
  - referral records with status and reward readiness
  - campaign tracking with conversion metrics
  - acquisition source analytics and growth visibility widgets
- Product surfaces:
  - new internal Monetization page
  - new internal CRM & Growth page
  - dashboard + settings + finance + portal upgraded for monetization/lifecycle coherence

### Customer-facing (Phase 5)

- Dedicated customer portal route group and shell.
- Customer login route and customer role/user-type access model.
- Portal pages for:
  - overview/upcoming services
  - service history + proof references
  - invoices
  - booking requests
  - recurring plan projections
  - account details
- Booking request domain:
  - validation, estimation, submission, lifecycle status transitions
  - internal booking review module
- Recurring scheduling domain:
  - configurable rules (weekly/fortnightly/monthly/custom-ready)
  - future projection logic
  - materialization of projected occurrences into scheduled visits
  - internal recurring management module

### Persistence/auth evolution

- Repository coverage expanded to bookings and recurring modules.
- Data model expanded with `bookingRequests` and `portalAccounts`.
- Route guards now enforce both roles and user types (`internal` vs `customer`).

### Production hardening (Final phase)

- Stripe-first payment integration boundary hardened:
  - idempotency keys + replay-safe creation
  - provider event ingestion and dedupe (`paymentEvents`)
  - reconciliation cycle for pending provider payments
- Supabase persistence depth improved:
  - tenant-aware collection sync strategy
  - conflict-aware server reconciliation by freshness (`updated_at`)
  - persist result can reconcile app state post-write
- Background operations queue introduced:
  - `operationJobs` with retry-aware lifecycle
  - executor handlers for reminders, invoices, lifecycle refresh, and payment reconciliation
- Reliability and auditability:
  - `auditEvents` timeline for mutation history
  - app-wide error boundary
  - degraded sync and session-expiry visibility signals
- Performance:
  - route-level lazy loading and suspense fallback
  - manual Vite chunk strategy
  - shared table windowing readiness for large list rendering
- Testing:
  - Vitest suite covering payment lifecycle, routing optimization, subscriptions, CRM transitions, and persistence retry logic

## Implemented with adapter boundaries

- Email transport adapters: mock + webhook boundary
- Photo storage adapters: placeholder + webhook boundary
- Invoice export references (PDF generation still adapter-ready)
- Map provider adapters: heuristic mock now, webhook/provider-ready boundary for external maps API later
- Payment adapters: manual flow implemented, Stripe/PayPal/subscription-billing provider boundaries prepared
- Stripe-first adapter now includes payment intent and reconciliation gateway contract, pending credentialed backend hookup
- Webhook verification and worker runtime reference templates are added under `infra/` for deployment wiring

## Partial / scaffolded

- Credentialed webhook/worker hosting infrastructure (serverless runtime, scheduler, secrets)
- Real map distance/traffic provider integration
- Live credentialed Stripe webhook runtime and signature enforcement
- Availability engine for booking confirmation
- Automated recurring materialization worker
- Fully self-serve portal-side settlement/checkouts
- Lifecycle campaign automation execution engine

## Deployment runbooks now available

- `docs/deployment/launch-checklist.md`
- `docs/deployment/frontend-deployment.md`
- `docs/deployment/supabase-setup.md`
- `docs/deployment/stripe-setup.md`
- `docs/deployment/webhook-deployment.md`
- `docs/deployment/worker-runtime.md`
- `docs/deployment/post-deploy-checks.md`
- `docs/deployment/rollback-checklist.md`
- `docs/deployment/schema-mismatch-audit.md`
- `docs/deployment/env-reference.md`

## Intentionally deferred

- Full tenant provisioning and SaaS plan billing
- Advanced customer self-service rescheduling/cancellation automation
- AI routing/pricing/forecasting modules

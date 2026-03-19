# Roadmap

## Phase A - Operations MVP foundation (completed)

- Core dispatch, visit execution, finance, inventory, and client management.
- Modular service layer and normalized data model.

## Phase B - Persistence and auth foundation (completed)

- Local/Supabase-ready persistence gateway and repository mutation flow.
- Auth/session and role-protected routes.

## Phase C - Communication and proof workflows (completed)

- Reminder/invoice/completion pipelines with status/retry handling.
- Proof metadata and readiness visibility.

## Phase D - Customer self-service and recurrence (completed in current phase)

- Customer portal route/app-shell separation.
- Customer login and safe access boundary model.
- Booking request lifecycle and internal review workflow.
- Real recurring rule model, projections, and schedule materialization.

## Phase E - Operational intelligence and optimization (completed in current phase)

- Route optimization heuristic engine and recommendation apply flow.
- Map integration boundary with coordinate readiness model.
- Smarter scheduling risk/load signals.
- Travel-cost-aware finance and profitability-by-suburb analytics.
- Dashboard-level operational intelligence widgets.

## Phase F - Monetization, CRM, and growth foundation (completed in current phase)

- Payment domain with invoice-linked transaction lifecycle.
- Subscription plan and client membership model with recurring-revenue analytics.
- CRM lifecycle profiling, churn/retention signals, and segmentation readiness.
- Referral and campaign tracking foundations.
- Monetization + CRM internal modules and portal billing/subscription visibility upgrades.

## Phase G - Provider and automation hardening (completed in current phase)

- Stripe-first payment hardening:
  - payment-intent adapter boundary
  - webhook/event ingestion readiness
  - idempotent payment lifecycle + reconciliation loop
- Supabase migration depth:
  - conflict-aware reconciliation and tenant-aware sync strategy
- Background operations queue:
  - reminder/invoice/lifecycle/reconciliation job contracts with retry lifecycle
- Reliability hardening:
  - mutation audit timeline model
  - app-wide error boundary
  - degraded sync/session-expiry runtime signals
- Performance hardening:
  - route-level code splitting and manual chunk strategy
  - shared list windowing readiness
- Test foundation established with Vitest for critical domain flows.

## Phase H - Production infrastructure completion (next)

- Deploy credentialed provider gateways (Stripe webhook signature verification, email/storage runtimes).
- Move operation job executor to dedicated worker runtime/scheduler.
- Add immutable observability sinks for audit and pipeline telemetry.
- Introduce stricter DB constraints/indexes and RLS policy test suite.

## Phase I - SaaS scale evolution (later)

- Tenant/org provisioning and RLS policy hardening.
- Customer payment integration and portal billing actions.
- Multi-region dispatch optimization and deeper automation.
- Predictive AI modules for capacity, delays, and profitability.

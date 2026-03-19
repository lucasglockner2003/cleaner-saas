# Architecture

## Product direction

The platform now supports both:

- internal operations workflows (dispatch, visits, finance, inventory, communications)
- customer-facing workflows (portal, booking requests, recurring service visibility)

The architecture keeps these experiences separated while sharing one normalized domain model and persistence stack.

## Core principles

- Keep UI concerns separate from business/workflow logic.
- Keep provider integrations behind adapters and pipelines.
- Keep persistence behind repositories and persist plans.
- Keep customer and internal route boundaries explicit.
- Build realistic workflows now, preserve extensibility for SaaS scale later.

## Application layers

1. `app/`
   - router, providers, auth guards, shell selection
2. `components/`
   - reusable UI primitives and shell components
3. `features/`
   - page modules:
     - internal: dashboard, clients, schedule, teams, employees, finance, products, visits, bookings, recurring, communications, monetization, crm, settings
     - customer: portal overview, history, invoices, booking, recurring, account
4. `services/`
   - domain logic, communication pipelines, booking/recurrence logic, monetization/CRM/growth logic, portal-safe read models
5. `persistence/`
   - datasource gateway + repositories
6. `mocks/`
   - normalized seed entities
7. `docs/`
   - scope, model, workflows, auth, persistence, roadmap

## Experience separation

### Internal app

- routes under `/`
- `AppShell` with sidebar, operational feedback banners, sync status
- role-scoped internal modules

### Customer portal

- routes under `/portal/*`
- dedicated `PortalShell` with portal navigation
- customer-only data view models from `customerPortalService`
- no direct reuse of internal operations layout/navigation

## Access model architecture

- `ProtectedRoute` now checks:
  - authentication state
  - allowed role(s)
  - allowed user type(s): `internal` vs `customer`
- login routes are separated:
  - `/login` for internal users
  - `/portal/login` for customer users

## Domain/service architecture

### Internal operations

- `clientsService`, `scheduleService`, `visitsService`, `teamsService`, `employeesService`, `financeService`, `productsService`

### Operational intelligence (Phase 6)

- `routeOptimizationService`
  - nearest-neighbor route recommendation by team/day
  - current-vs-recommended travel comparison
  - route preview payload with markers/polyline readiness
  - geocode coverage and confidence scoring
- `mapProviderService`
  - map provider boundary (`mock` now, webhook/provider-ready mode prepared)
  - coordinate resolution strategy:
    - exact record coordinates
    - suburb/region centroid fallback
  - leg distance/travel estimation contract reusable across schedule/finance/teams
- `scheduleService` (expanded)
  - route-aware day estimation (dynamic travel buffers)
  - overbook/lateness risk signals
  - team load-balance signals by day
  - route recommendation apply mutation
- `financeService` (expanded)
  - travel-cost-aware profitability
  - suburb/area profit signals
  - monthly/day adjusted profit trends including estimated travel impact

### Communication workflows

- `remindersService` + reminder pipeline
- `invoicesService` + invoice pipeline
- `completionService` + completion pipeline
- `communicationJobsService`
- `photoStorageService`

### Monetization and lifecycle workflows (Phase 7)

- `paymentsService`
  - payment records linked to invoices
  - payment status lifecycle (pending/captured/failed/refunded/cancelled)
  - invoice balance synchronization on capture/refund
  - payment provider adapter boundary (`manual`, `stripe`, `paypal`, `subscription_billing`)
- `subscriptionsService`
  - plan catalog and pricing tiers
  - client subscription assignments
  - recurring revenue summaries (MRR/ARR)
  - recurring billing readiness metadata
- `crmService`
  - customer lifecycle model (lead/new/active/at-risk/inactive/churned)
  - churn and reactivation signal derivation
  - VIP/high-value and lifecycle enrichment controls
  - automation-ready audience segmentation
- `growthService`
  - referral lifecycle records and reward readiness
  - campaign records and conversion tracking
  - acquisition/source analytics for growth visibility

### Production hardening systems (Final phase)

- `paymentProviderAdapterService`
  - Stripe-first provider contract for payment-intent + reconciliation calls
  - gateway-ready transport boundary with idempotency header support
- `operationsJobService`
  - unified background job model for operational async workloads
  - retry-aware execution lifecycle with pluggable handlers
- `auditService`
  - mutation-level audit timeline for reliability and incident tracing
- `supabaseDataSource` (expanded)
  - collection-level strategy controls (tenant scope, reconcile, prune)
  - conflict-aware merge and post-persist state reconciliation

### Customer-facing workflows (Phase 5)

- `bookingsService`
  - booking request validation, estimation, lifecycle transitions
- `recurringScheduleService`
  - recurrence rule validation, projection, status control, materialization into scheduled visits
- `customerPortalService`
  - customer-safe snapshot (upcoming/past visits, invoices, proof references, recurring projection, booking requests)

## Repository and persistence architecture

- `createRepositoryBundle` now includes:
  - bookings repository
  - recurring repository
  - payments repository
  - subscriptions repository
  - crm repository
  - growth repository
  - operations repository
  - previous operational and communication repositories
- App actions execute repository mutations only (no page-level persistence logic)
- persist plans isolate writes by collection for Supabase-ready module migration

## Provider boundaries

- Email transport adapters: mock + webhook
- Photo storage adapters: placeholder + webhook
- Map provider adapter: mock heuristics + webhook/provider-ready boundary
- Payment adapters: manual capture now + Stripe/PayPal/subscription-billing boundaries
- Future: real provider implementations can replace adapters without UI refactors

## SaaS evolution readiness

### Real now

- split internal vs customer route surfaces
- customer-safe data shaping
- booking and recurring domain models linked to schedule/visit/invoice/proof
- repository-backed mutation flows for new customer-facing modules
- route/map intelligence layer decoupled from UI and persistence provider
- suburb-level profitability model prepared for territory and pricing automation
- monetization domain linked across invoice/payment/subscription surfaces
- CRM and growth domain linked across clients/bookings/invoices/communications/referrals
- background job queue abstraction for async operations
- audit timeline model and reliability visibility for critical mutations
- route-level code splitting and chunk strategy suitable for dashboard scale

### Prepared next

- provider-backed customer notifications
- availability and pricing engines for booking flow
- workerized recurring/materialization automation
- tenant-scoped auth/data policies for multi-company mode
- real map distance/traffic APIs with provider adapters
- AI-assisted dispatch optimization (reordering + load prediction)
- hosted payment provider capture and webhook reconciliation
- lifecycle campaign automation runners and attribution models
- tenant-scoped RLS enforcement and multi-org policy hardening

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
     - internal: dashboard, clients, schedule, teams, employees, finance, products, visits, bookings, recurring, communications, settings
     - customer: portal overview, history, invoices, booking, recurring, account
4. `services/`
   - domain logic, communication pipelines, booking/recurrence logic, portal-safe read models
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

### Communication workflows

- `remindersService` + reminder pipeline
- `invoicesService` + invoice pipeline
- `completionService` + completion pipeline
- `communicationJobsService`
- `photoStorageService`

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
  - previous operational and communication repositories
- App actions execute repository mutations only (no page-level persistence logic)
- persist plans isolate writes by collection for Supabase-ready module migration

## Provider boundaries

- Email transport adapters: mock + webhook
- Photo storage adapters: placeholder + webhook
- Future: real provider implementations can replace adapters without UI refactors

## SaaS evolution readiness

### Real now

- split internal vs customer route surfaces
- customer-safe data shaping
- booking and recurring domain models linked to schedule/visit/invoice/proof
- repository-backed mutation flows for new customer-facing modules

### Prepared next

- provider-backed customer notifications
- availability and pricing engines for booking flow
- workerized recurring/materialization automation
- tenant-scoped auth/data policies for multi-company mode

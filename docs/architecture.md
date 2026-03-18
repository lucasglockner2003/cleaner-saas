# Architecture

## Product direction

This project is the foundation of an internal operations platform for cleaning companies, designed to evolve into a multi-tenant SaaS product. The MVP prioritizes daily execution visibility over advanced automation.

## Architectural principles

- Keep domain logic separate from rendering/UI.
- Keep modules replaceable so mock data can be swapped for Supabase adapters.
- Optimize for operations readability first (desktop-first with responsive support).
- Normalize core entities and derive page-friendly summaries in services.
- Scaffold advanced capabilities with interfaces, not heavy integrations.

## Frontend architecture

### App layers

1. `app/`
   - routing, app shell, global providers
2. `features/`
   - page-level containers and domain-specific presentation components
3. `components/`
   - reusable layout and UI primitives
4. `services/`
   - domain access APIs and orchestration logic (mock-backed now)
5. `mocks/`
   - normalized seed data and derived view seeds
6. `utils/`
   - pure scheduling and finance calculations
7. `docs/`
   - architecture, scope, workflows, roadmap

### State approach

- A central `AppDataProvider` holds current in-memory operational state.
- Feature pages read state via a custom hook and call domain actions.
- Domain services provide query and mutation functions to avoid page logic bloat.
- All mutations happen through service/action methods to keep future persistence migration straightforward.

## Service architecture

### Implemented now

- `clientsService`: client retrieval, suburb grouping/filtering, per-client timeline data.
- `scheduleService`: weekly schedule map, team/day loading, projected workload helpers.
- `visitsService`: start/finish actions, duration deltas, visit history and status summaries.
- `employeesService`: employee utilization basics and team assignment snapshots.
- `financeService`: daily/monthly totals, profit calculations, cost composition.
- `productsService`: stock status, low-stock detection, movement timeline placeholders.
- `remindersService`: reminder payload construction and provider interface placeholders.

### Scaffolded for later

- `invoicesService`: invoice generation contract (not full billing integration).
- `photoStorageService`: photo metadata + storage provider contract.
- route optimization provider interface
- customer portal API gateway interface
- payments adapter contract (Stripe/PayPal)
- ratings/reviews service contract

## Data architecture and Supabase evolution strategy

- Entity IDs are explicit and stable.
- Table-like seeds map directly to relational schema design.
- Join entities (`team_members`, `recurring_services`) are modeled separately.
- Business calculations are derived from entities instead of denormalized source-of-truth tables.

### Supabase migration path

1. Replace mock repository reads with Supabase queries in service layer.
2. Replace mutation actions with Supabase `insert/update` flows.
3. Introduce auth + row-level policies (manager/dispatcher/cleaner scopes).
4. Move file metadata to `visit_photos`; back photo files with Supabase storage buckets.
5. Add background jobs for reminders, invoice dispatch, and future automation rules.

## SaaS readiness decisions

### Implemented decisions

- Data model includes `organization_id` placeholders in docs and service contracts.
- Regional scaling considered via `suburb`, `region`, and `schedule_day` segmentation.
- Role-aware workflows documented for owner/operations/cleaners.
- Domain boundaries align with eventual microservice decomposition if needed.

### Deferred intentionally

- Full multi-tenant auth and org isolation
- billing/payments
- route engine
- client self-service portal
- AI-assisted pricing/forecasting


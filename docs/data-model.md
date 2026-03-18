# Data Model (Supabase-ready)

This model now supports internal operations and customer-facing workflows.

## Core operational entities

### `clients`

- Customer profile and operational preferences.
- Key fields: identity/contact, address/suburb, service preference, status, timestamps.
- Related to visits, notes, reminders, invoices, recurring services, and portal accounts.

### `client_notes`

- Operational instruction timeline for service teams.

### `service_types`

- Service catalog with default duration/price used by scheduling and booking estimation.

### `teams`, `employees`, `team_members`

- Dispatch and workforce model.

### `schedule_days`, `scheduled_visits`, `visit_logs`

- Scheduling and execution model:
  - planned windows
  - start/finish runtime
  - actual duration and notes

### `visit_photos`

- Proof metadata model:
  - phase (`before`/`after`)
  - storage refs
  - upload status/provider ref
  - grouped proof timeline support

### `expenses`, `products`, `product_movements`

- Finance and inventory support tables.

## Communication and billing entities

### `reminders`

- Visit reminder lifecycle:
  - schedule/send/retry/fail metadata
  - payload and provider refs

### `invoices`

- Invoice lifecycle model:
  - draft/issued/paid/failed
  - communication status
  - line items, tax totals, export reference

### `communication_jobs`

- Unified queue for reminder/invoice/completion communications.
- Tracks attempts, status, payload, provider refs, and linkage to domain records.

## Customer-facing entities (Phase 5)

### `portal_accounts`

- Customer portal identity linkage.
- Key fields:
  - `id`, `client_id`, `email`, `full_name`, `status`
  - `preferred_contact`, `last_login_at`, timestamps
- Purpose:
  - bind customer login identity to a single client profile
  - enforce customer-safe data boundaries

### `booking_requests`

- Customer/public booking workflow records.
- Key fields:
  - `id`, `client_id` (nullable), `portal_account_id` (nullable), `source`
  - requester contact fields
  - address/suburb/service preference/date window
  - notes/service scope/home size
  - estimated duration/price summary
  - lifecycle status (`new|reviewing|quoted|approved|rejected|cancelled`)
  - reviewer/internal notes/timestamps
- Purpose:
  - capture demand from customer portal and new leads
  - feed internal review and scheduling workflows

### `recurring_services` (expanded)

- Recurring service rule model now includes:
  - status (`active|paused|ended`)
  - pattern (`weekly|fortnightly|monthly|custom`)
  - interval fields (`interval_count`, `monthly_day`, `custom_interval_days`)
  - service/time window/team preference
  - projection pointers (`next_service_date`, `last_generated_at`)
- Purpose:
  - project future services
  - materialize projected occurrences into scheduled visits
  - support customer-visible recurring plan views

## Placeholder/future entities

### `ratings`

- Customer quality feedback model placeholder.

## Relationship highlights

- `clients` -> many `scheduled_visits`, `invoices`, `reminders`, `booking_requests`, `recurring_services`
- `portal_accounts` -> one `clients` (current model assumes one active client link)
- `booking_requests` -> optional `clients` and optional `portal_accounts`
- `recurring_services` -> `clients` and optionally preferred `teams`
- `recurring_services` projections can materialize into `scheduled_visits`
- `communication_jobs` -> links to reminders/invoices/visits and clients

## Normalization and read-model strategy

- Source data stays normalized.
- UI-specific aggregations are computed in services (`dashboard`, `portal`, `bookings`, `recurring`, `communications`).
- No direct provider-specific fields leaked into UI components.

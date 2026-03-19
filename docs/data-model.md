# Data Model (Supabase-ready)

This model now supports internal operations and customer-facing workflows.

## Core operational entities

### `clients`

- Customer profile and operational preferences.
- Key fields: identity/contact, address/suburb, service preference, status, timestamps.
- Phase 6 geo fields:
  - `latitude`, `longitude`
  - `geocode_status` (`verified|estimated|pending|missing`)
  - `geo_source`
- Related to visits, notes, reminders, invoices, recurring services, and portal accounts.

### `client_notes`

- Operational instruction timeline for service teams.

### `service_types`

- Service catalog with default duration/price used by scheduling and booking estimation.

### `teams`, `employees`, `team_members`

- Dispatch and workforce model.
- Phase 6 route fields on `teams`:
  - `depot_latitude`, `depot_longitude`
  - `target_day_minutes` (planning capacity baseline)

### `schedule_days`, `scheduled_visits`, `visit_logs`

- Scheduling and execution model:
  - planned windows
  - start/finish runtime
  - actual duration and notes
- Phase 6 planning fields on `schedule_days`:
  - `travel_buffer_min` (route-aware planning buffer)
  - `target_day_minutes` (day capacity for overbook risk)

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

### `payments` (Phase 7)

- Invoice-linked payment records with lifecycle states.
- Key fields:
  - `invoice_id`, `client_id`, `amount`, `currency`
  - `status` (`pending|captured|failed|refunded|cancelled`)
  - `method_type`, `provider`, provider refs/errors
  - `refunded_amount`, capture timestamps
- Purpose:
  - reconcile invoice balances
  - expose payment history for internal and portal billing views
  - support provider integration boundaries

### `payment_events` (Final phase)

- Provider webhook/reconciliation event ledger for idempotent payment processing.
- Key fields:
  - `provider`, `provider_event_id`, `event_type`
  - `payment_id`, `invoice_id`
  - processing status/message
  - raw payload snapshot
- Purpose:
  - dedupe webhook replays
  - trace rejected/unmatched events
  - support reconciliation auditing

### `communication_jobs`

- Unified queue for reminder/invoice/completion communications.
- Tracks attempts, status, payload, provider refs, and linkage to domain records.

### `operation_jobs` (Final phase)

- Background operations queue model for async workflows.
- Key fields:
  - `job_type` (`reminder_dispatch|invoice_dispatch|lifecycle_refresh|payment_reconciliation`)
  - status (`queued|running|completed|failed|retry_scheduled|cancelled`)
  - priority, attempts, next attempt, payload/result summary
- Purpose:
  - worker-ready execution abstraction
  - retry-safe operational automation without page-level coupling

### `audit_events` (Final phase)

- Mutation timeline model for reliability and traceability.
- Key fields:
  - `action_key`, `entity_type`, `entity_id`
  - `outcome`, `severity`
  - actor identity and metadata
- Purpose:
  - provide operational auditability
  - support incident investigation and compliance-readiness

## Monetization entities (Phase 7)

### `subscription_plans`

- Plan catalog for recurring revenue strategy.
- Key fields:
  - code/name/tier
  - billing cycle (`weekly|fortnightly|monthly`)
  - recurring price/currency
  - quota/discount metadata
  - active state and description

### `client_subscriptions`

- Client-to-plan assignment and recurring billing readiness state.
- Key fields:
  - `client_id`, `plan_id`
  - `status` (`active|paused|cancelled|trial|expired`)
  - billing anchor/next billing date
  - payment provider/method hints
  - auto-renew + metadata

## CRM and growth entities (Phase 7)

### `crm_profiles`

- Lifecycle enrichment profile per client.
- Key fields:
  - lifecycle stage
  - lead status
  - acquisition source/channel
  - referral source
  - churn risk and VIP level
  - win-back/reactivation/upsell signals

### `referrals`

- Referral lead lifecycle and reward-readiness tracking.
- Key fields:
  - referrer/referred linkage
  - source channel
  - referral status
  - reward amount/type/state
  - campaign linkage

### `growth_campaigns`

- Growth campaign records and conversion tracking.
- Key fields:
  - campaign type/channel/status
  - audience segment
  - sent/response/conversion counts
  - start/end timestamps

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

## Derived analytical read models (service-level)

These are not persisted tables yet; they are built in service layer from normalized data:

- Route plan read model:
  - current route legs
  - recommended route legs/order
  - travel distance/time deltas
  - geocode confidence coverage
- Day intelligence read model:
  - overbook risk
  - lateness risk
  - load-balance signal
  - recurring influence
- Area profitability read model:
  - suburb revenue/cost/profit/margin
  - travel cost impact
  - profitability signal state
- Monetization read models:
  - payment collection snapshot
  - subscription MRR/ARR summaries
- CRM/growth read models:
  - lifecycle segmentation audiences
  - acquisition source trends
  - referral and campaign performance summaries

## Relationship highlights

- `clients` -> many `scheduled_visits`, `invoices`, `reminders`, `booking_requests`, `recurring_services`
- `clients` -> many `payments`, `client_subscriptions`, `crm_profiles` (1-to-1 logical profile), `referrals` (as referrer/referred)
- `portal_accounts` -> one `clients` (current model assumes one active client link)
- `booking_requests` -> optional `clients` and optional `portal_accounts`
- `recurring_services` -> `clients` and optionally preferred `teams`
- `recurring_services` projections can materialize into `scheduled_visits`
- `communication_jobs` -> links to reminders/invoices/visits and clients
- route and area analytics map to `clients` suburb + geo fields and `schedule_days`/`scheduled_visits`
- `invoices` -> many `payments` (partial capture/refund-ready)
- `payments` -> many `payment_events` (provider event lineage)
- `subscription_plans` -> many `client_subscriptions`
- `growth_campaigns` -> many `referrals` (optional linkage)
- `operation_jobs` -> invoke handlers across communications/payments/crm domains

## Tenant scope readiness

- Key final-phase entities now support `organization_id` propagation for future tenant scoping:
  - `clients`, `payments`, `payment_events`
  - `subscription_plans`, `client_subscriptions`
  - `crm_profiles`, `referrals`, `growth_campaigns`
  - `operation_jobs`, `audit_events`
- Supabase strategy can apply organization-aware sync where schema supports `organization_id`.

## Normalization and read-model strategy

- Source data stays normalized.
- UI-specific aggregations are computed in services (`dashboard`, `portal`, `bookings`, `recurring`, `communications`).
- No direct provider-specific fields leaked into UI components.

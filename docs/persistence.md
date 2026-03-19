# Persistence Architecture

## Runtime providers

- `local` (default): durable local browser storage
- `supabase`: table-backed adapter with fallback-safe behavior when tables are missing

## Provider controls

- `VITE_DATA_PROVIDER=local|supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ORGANIZATION_ID`
- `VITE_EMAIL_TRANSPORT=mock|webhook`
- `VITE_EMAIL_WEBHOOK_URL`
- `VITE_PHOTO_STORAGE_PROVIDER=placeholder|webhook`
- `VITE_PHOTO_WEBHOOK_URL`
- `VITE_MAP_PROVIDER=mock|webhook`
- `VITE_MAP_WEBHOOK_URL`
- `VITE_PAYMENT_PROVIDER=manual|stripe|paypal|subscription_billing`
- `VITE_PAYMENT_WEBHOOK_URL`
- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## Persistence flow

1. `AppDataProvider` bootstraps state from gateway.
2. Missing collections are normalized against seed shape.
3. Mutations are optimistic via repository actions.
4. Persist writes run asynchronously with retry and sync health signaling.
5. In Supabase mode, persisted collections can return reconciled server state (conflict-aware freshness merge).

## Supabase production sync behavior (Final phase)

- Collection strategy controls:
  - tenant scoping (`organization_id`) where available
  - conflict-aware reconciliation by `updated_at`
  - selective prune for controlled collections
- Save pipeline now returns:
  - `reconciledDb` (server-merged view)
  - sync stats (`tables/upserted/deleted/conflicts`)
- `AppDataProvider` can apply reconciled state after successful remote write.

## Repository coverage

### Operations and execution

- clients
- visits
- schedule
- products
- teams
- employees

### Communication and billing

- reminders
- invoices
- completion communications
- payments

### Customer-facing and recurrence (Phase 5)

- bookings (`booking_requests`)
- recurring (`recurring_services` + materialized `scheduled_visits`)

### Monetization + CRM + Growth (Phase 7)

- subscriptions (`subscription_plans`, `client_subscriptions`)
- crm (`crm_profiles`)
- growth (`referrals`, `growth_campaigns`)

### Reliability and worker systems (Final phase)

- payments events (`payment_events`)
- operations queue (`operation_jobs`)
- mutation audit timeline (`audit_events`)

## Persisted entities expanded in Phase 5

- `bookingRequests` -> `booking_requests`
- `portalAccounts` -> `portal_accounts`
- expanded `recurringServices` rule schema

## Persisted shape expanded in Phase 6

- `clients`:
  - `latitude`, `longitude`, `geocode_status`, `geo_source`
- `teams`:
  - `depot_latitude`, `depot_longitude`, `target_day_minutes`
- `scheduleDays`:
  - `travel_buffer_min`, `target_day_minutes`

## Persisted shape expanded in Phase 7

- `payments`:
  - invoice/client linkage
  - provider/method/status lifecycle fields
  - refund metadata
  - idempotency key
  - reconciliation status fields
- `paymentEvents`:
  - provider event ids
  - processing status/message
- `subscriptionPlans` / `clientSubscriptions`:
  - recurring pricing/tier data
  - membership status and next billing metadata
- `crmProfiles`:
  - lifecycle stage/risk/source/vip enrichment fields
- `referrals` / `growthCampaigns`:
  - growth attribution, reward readiness, and campaign conversion tracking
- `operationJobs`:
  - retry-safe async job lifecycle metadata
- `auditEvents`:
  - action outcome timeline with actor/severity metadata

## Supabase migration path

1. Move from snapshot save/load toward per-module CRUD repositories.
2. Add SQL migrations for:
   - `booking_requests`
   - `portal_accounts`
   - expanded recurring columns
3. Add RLS for customer-linked portal visibility.
4. Move pipeline dispatch/materialization to worker processes.
5. Add module-level tables or materialized views for route/day intelligence snapshots as needed.
6. Introduce provider-backed map distance table/cache for deterministic travel costing.
7. Enable live payment provider webhooks and signature verification in gateway.
8. Move operation job executor to external worker runtime.
9. Add background campaign/lifecycle runner tables for automated audience execution.

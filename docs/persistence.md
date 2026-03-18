# Persistence Architecture

## Runtime providers

- `local` (default): durable local browser storage
- `supabase`: table-backed adapter with fallback-safe behavior when tables are missing

## Provider controls

- `VITE_DATA_PROVIDER=local|supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EMAIL_TRANSPORT=mock|webhook`
- `VITE_EMAIL_WEBHOOK_URL`
- `VITE_PHOTO_STORAGE_PROVIDER=placeholder|webhook`
- `VITE_PHOTO_WEBHOOK_URL`

## Persistence flow

1. `AppDataProvider` bootstraps state from gateway.
2. Missing collections are normalized against seed shape.
3. Mutations are optimistic via repository actions.
4. Persist writes run asynchronously with retry and sync health signaling.

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

### Customer-facing and recurrence (Phase 5)

- bookings (`booking_requests`)
- recurring (`recurring_services` + materialized `scheduled_visits`)

## Persisted entities expanded in Phase 5

- `bookingRequests` -> `booking_requests`
- `portalAccounts` -> `portal_accounts`
- expanded `recurringServices` rule schema

## Supabase migration path

1. Move from snapshot save/load toward per-module CRUD repositories.
2. Add SQL migrations for:
   - `booking_requests`
   - `portal_accounts`
   - expanded recurring columns
3. Add RLS for customer-linked portal visibility.
4. Move pipeline dispatch/materialization to worker processes.

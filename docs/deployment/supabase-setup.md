# Supabase Setup (First Live Deployment)

## 1. Prerequisites

- `psql` installed and available in PATH (or set `PSQL_BIN`).
- `PRODUCTION_DATABASE_URL` and `STAGING_DATABASE_URL` set.
- `.env.staging` and `.env.production` created from examples.

## 2. Build migration bundle (single source for deployment)

```bash
npm run db:bundle:pilot
```

Bundle output:

- `supabase/migrations/generated/pilot-launch-bundle.sql`

## 3. Apply migrations to staging first

```bash
npm run db:staging:migrate
```

Optional staging reseed:

```bash
npm run db:staging:reset-seed
```

## 4. Apply migrations to production

```bash
npm run db:production:migrate
```

## 5. Required schema after migration

Must exist:

- `payment_events`
- `operation_jobs`
- `audit_events`

Must exist on `payments`:

- `idempotency_key`
- `provider_event_id`
- `reconciliation_status`
- `provider_last_error`
- `last_reconciled_at`

Must exist for tenant scope:

- `organization_id` on launch-critical tables (`clients`, `invoices`, `payments`, `portal_accounts`, `booking_requests`, `payment_events`, `operation_jobs`, `audit_events`, etc.)

## 6. Post-migration SQL validation (run in Supabase SQL editor)

```sql
select count(*) as payment_events from public.payment_events;
select count(*) as operation_jobs from public.operation_jobs;
select count(*) as audit_events from public.audit_events;
```

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'payments'
  and column_name in (
    'idempotency_key',
    'provider_event_id',
    'reconciliation_status',
    'provider_last_error',
    'last_reconciled_at'
  )
order by column_name;
```

```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('payments', 'payment_events', 'operation_jobs', 'audit_events')
order by tablename, indexname;
```

## 7. RLS expectations for first live tenant

Required JWT claims:

- `organization_id` for internal users
- `organization_id`, `user_type=customer`, and `client_id` for portal users

Deployment expectation:

1. RLS enabled on launch-critical tables.
2. Tenant select policies active.
3. Portal self-access policies active.
4. Service-role paths used by webhook/worker runtimes.

## 8. Blockers (do not go live if true)

- Missing migration bundle apply in production.
- Any missing launch-critical table/column listed above.
- RLS policies not enforced for tenant separation.
- `organization_id` default values not replaced for live tenant writes.

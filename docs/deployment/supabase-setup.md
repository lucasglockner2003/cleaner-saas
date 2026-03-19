# Supabase Setup (Launch)

## 1. Apply migration

Apply:

- `supabase/migrations/20260320_launch_readiness.sql`

This migration adds:

- `payment_events`
- `operation_jobs`
- `audit_events`
- launch-critical `organization_id` columns
- indexes for billing/worker/audit paths
- baseline RLS policies

## 2. Schema expectations from code

Code expects all collections in `src/persistence/tableMap.js` to exist as tables.

Launch-critical additions:

- `payments` columns:
  - `idempotency_key`
  - `provider_event_id`
  - `reconciliation_status`
  - `provider_last_error`
  - `last_reconciled_at`
- `operation_jobs`:
  - lease fields (`worker_id`, `lock_expires_at`)
- `audit_events`:
  - immutable action timeline rows

## 3. Tenant scope

Expected JWT claim:

- `organization_id`

Expected behavior:

- Internal users: read/write rows for their `organization_id`
- Customer users: restricted to own `client_id` + `organization_id`

## 4. RLS rollout strategy

1. Enable RLS on launch-critical tables.
2. Apply tenant read policies first.
3. Apply write policies for service-role worker/webhook runtimes.
4. Run policy tests with:
   - owner/ops user
   - customer user
   - wrong-tenant user (should deny)

## 5. Known schema mismatch risks

- Missing `organization_id` in tables: app falls back in some reads, but production should treat this as blocker.
- Missing `updated_at`: conflict reconciliation quality drops.
- Missing indexes on `operation_jobs` and `payments`: queue/reconciliation throughput degrades.

## 6. Validation queries

Run after migration:

```sql
select count(*) from public.payment_events;
select count(*) from public.operation_jobs;
select count(*) from public.audit_events;
```

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'payments'
  and column_name in ('idempotency_key','provider_event_id','reconciliation_status','provider_last_error','last_reconciled_at');
```

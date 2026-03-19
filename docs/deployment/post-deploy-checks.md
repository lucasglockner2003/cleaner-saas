# Post-Deploy Checks

## Immediate (first 15 minutes)

1. Open Settings and confirm no critical config blockers.
2. Validate internal login and portal login.
3. Create/update client and confirm persistence.
4. Queue and run one operation job cycle.
5. Record a payment and verify invoice balance update.

## Stripe checks

1. Send Stripe test webhook event.
2. Confirm event appears in `payment_events`.
3. Confirm matching payment transitions correctly.
4. Confirm no rejected/unmatched event spike.

## Supabase checks

1. Confirm RLS allows expected tenant users.
2. Confirm wrong-tenant access is denied.
3. Confirm `organization_id` is populated in new rows.

## Worker checks

1. Ensure scheduler runs operation cycle on cadence.
2. Confirm `operation_jobs` do not accumulate stale `running` locks.
3. Confirm retries eventually settle into `completed` or `failed`.

## Audit checks

1. Trigger a successful mutation and verify `audit_events` append.
2. Trigger a validation failure and verify failure audit event.

## First-24h monitoring

- failed operation jobs
- failed/rejected payment events
- sync degradation warnings
- auth/session anomalies

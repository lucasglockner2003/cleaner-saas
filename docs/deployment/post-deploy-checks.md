# Post-Deploy Checks

Use together with `RELEASE_PREP/smoke-test-checklist.md`.

## 1. Frontend health checks

1. Open `/login` and `/portal/login`; both must render.
2. Login with internal and customer test accounts.
3. Confirm Settings page shows zero critical config blockers.
4. Navigate key pages (`/`, `/schedule`, `/visits`, `/monetization`, `/communications`) without runtime error boundary.

## 2. Webhook runtime health checks

1. Call webhook health endpoint:
   ```bash
   curl -i https://<webhook-domain>/health
   ```
2. Expect `HTTP 200`.
3. Send Stripe test event to `POST /webhooks/stripe`.
4. Verify webhook logs show signature verification success and forwarding success.

## 3. Worker runtime health checks

1. Run one manual worker cycle.
2. Confirm operation jobs transition from `queued/running` to `completed|retry_scheduled|failed`.
3. Confirm stale running locks are recovered on subsequent cycle.
4. Confirm scheduler cadence is active (every 1-5 minutes).

## 4. Supabase connectivity checks

1. Create/update a client in app and verify persistence after refresh.
2. Run SQL checks:
   ```sql
   select count(*) from public.operation_jobs;
   select count(*) from public.payment_events;
   select count(*) from public.audit_events;
   ```
3. Confirm tenant scope:
   - expected tenant users can read/write
   - wrong-tenant access is denied
   - new rows include correct `organization_id`

## 5. Stripe connectivity checks

1. Confirm Stripe test event creates/updates corresponding `payment_events` row.
2. Confirm matching payment status transition occurs.
3. Replay same event id and confirm idempotent behavior (no duplicate state mutation).
4. Run reconciliation cycle and verify pending provider-backed payments settle.

## 6. Audit and reliability checks

1. Trigger one successful mutation and confirm `audit_events` append.
2. Trigger one validation failure and confirm failure audit event.
3. Confirm no sustained spikes in:
   - failed operation jobs
   - rejected/unmatched payment events
   - sync degradation warnings
   - auth/session anomalies

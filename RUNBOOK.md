# RUNBOOK

Operational runbook for pilot rollout and daily support.

## 1. Local runtime

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run test:run
npm run build
```

## 2. Staging runtime

1. Create `.env.staging` from `.env.staging.example`.
2. Validate config:

```bash
npm run check:env:staging
```

3. Apply migrations and stage data:

```bash
npm run db:bundle:pilot
npm run db:staging:reset-seed
```

4. Deploy/launch webhook and worker examples (or production equivalents):

```bash
npm run webhook:stripe:example
npm run worker:operations:example
```

5. Run smoke checks from `RELEASE_PREP/smoke-test-checklist.md`.

## 3. Env var rotation

Rotate these together:

- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN`
- `PAYMENT_GATEWAY_AUTH_TOKEN`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY` (as needed)

Rotation process:

1. Add new values in secret manager.
2. Deploy webhook/worker runtime with new values.
3. Deploy frontend with new `VITE_PAYMENT_GATEWAY_AUTH_TOKEN`.
4. Verify webhook and payment reconciliation health.
5. Remove old values.

## 4. Webhook health verification

Endpoints:

- `GET /health` on webhook runtime
- `POST /webhooks/stripe` for Stripe signed events

Checks:

1. Health endpoint returns `200`.
2. Signature verification passes for test event.
3. Event forward call returns success.
4. Payment event appears in `payment_events`.

## 5. Worker health verification

Checks:

1. Run one cycle manually:

```bash
npm run worker:operations:example
```

2. Confirm queued jobs reduce in `operation_jobs`.
3. Confirm failed jobs move to `retry_scheduled` or `failed` with `error_message`.
4. Confirm stale running jobs recover after lease expiry.

## 6. Failed jobs and audit inspection

Inspect in app:

- Settings page operation jobs panel (status + retry controls)
- Settings page audit event timeline

Inspect in SQL:

```sql
select job_type, status, count(*) from public.operation_jobs group by 1,2 order by 1,2;
select id, job_type, status, attempt_count, error_message, updated_at
from public.operation_jobs
where status in ('failed', 'retry_scheduled')
order by updated_at desc
limit 50;

select action_key, outcome, severity, created_at
from public.audit_events
order by created_at desc
limit 100;
```

## 7. Incident response baseline

1. Pause scheduler when repeated failures appear.
2. Keep webhook running to avoid event loss.
3. Retry failed operation jobs after root-cause fix.
4. Use `RELEASE_PREP/rollback-checklist.md` if system-wide risk is detected.

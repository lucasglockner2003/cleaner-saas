# STAGING_SMOKE_TEST

Exact validation sequence before sharing the staging link with the first company.

## 0. Inputs (fill before testing)

- `STAGING_APP_URL` = `https://<frontend-staging-domain>`
- `STAGING_WEBHOOK_URL` = `https://<stripe-webhook-domain>`
- `STAGING_GATEWAY_URL` = `https://<gateway-domain>/payments/gateway`
- `STAGING_SUPABASE_URL` = `https://<project>.supabase.co`

## 1. Pre-check commands (local)

```bash
npm run deploy:check:staging
npm run db:bundle:pilot
npm run db:staging:migrate
```

If you need a clean demo dataset:

```bash
npm run db:staging:reset-seed
```

## 2. Frontend online checks

1. Open `STAGING_APP_URL/login` and verify page loads.
2. Open `STAGING_APP_URL/portal/login` and verify page loads.
3. Login with internal account and verify no critical config banner.
4. Open Dashboard, Schedule, Visits, Monetization, Communications; verify each page loads without crash/empty render loops.

Pass condition:

- App is reachable and stable for internal + portal routes.

## 3. Pilot flow checks in staging UI

1. Go to `/pilot-tools`.
2. Run **Demo mode helper** once.
3. Confirm all helper steps return `ok`.
4. Go to `/schedule`; confirm weekday dispatch board is populated.
5. Go to `/visits`; run one visit from `scheduled -> in_progress -> completed`.
6. Go to `/monetization`; confirm invoice and payment records are visible.
7. Go to `/communications`; confirm job statuses show queued/sent/failed/retry states.

Pass condition:

- One complete operational path works without manual DB edits.

## 4. Webhook runtime checks

1. Health endpoint:
   ```bash
   curl -i ${STAGING_WEBHOOK_URL}/health
   ```
2. Confirm HTTP `200`.
3. In Stripe dashboard, send a test event to `${STAGING_WEBHOOK_URL}/webhooks/stripe`.
4. Confirm webhook runtime logs show:
   - signature verified
   - forwarding to gateway succeeded

Pass condition:

- Test event accepted and forwarded end-to-end.

## 5. Worker runtime checks

Run one manual cycle against staging gateway:

```bash
APP_PAYMENT_WEBHOOK_URL=${STAGING_GATEWAY_URL} PAYMENT_GATEWAY_AUTH_TOKEN=<token> npm run worker:operations:example
```

Then verify in UI:

1. Open `/settings`.
2. Confirm operation jobs move from queued/running to completed/retry/failed.
3. Confirm no stale running locks remain.

Pass condition:

- Worker cycle processes queue and exits cleanly.

## 6. Supabase connectivity checks

Run in Supabase SQL editor for staging project:

```sql
select count(*) as operation_jobs from public.operation_jobs;
select count(*) as payment_events from public.payment_events;
select count(*) as audit_events from public.audit_events;
```

```sql
select organization_id, count(*) 
from public.clients
group by organization_id
order by count(*) desc;
```

Pass condition:

- App writes are visible in Supabase and tenant scope is present.

## 7. Stripe connectivity checks

1. Confirm `payment_events` receives the Stripe test event.
2. Confirm no duplicate mutation when replaying same event id.
3. Run payment reconciliation from Settings or Monetization page.
4. Confirm pending provider-backed payments reconcile correctly.

Pass condition:

- Stripe -> webhook -> gateway -> app state path is functional and idempotent.

## 8. Final staging go/no-go

Go if all are true:

- Frontend stable and accessible
- Pilot flow fully executable
- Webhook health + Stripe test event successful
- Worker cycle successful
- Supabase write/read path validated
- No critical config blockers in app

No-go if any of the above fails.

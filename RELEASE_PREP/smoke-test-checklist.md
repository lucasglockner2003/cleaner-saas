# Smoke Test Checklist

Run this after staging deploy and after production cutover.

## Commands

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] `npm run check:env:staging` (or `npm run check:env:production`)

## Core operational flows

- [ ] Dashboard loads with metrics cards and no crash banner.
- [ ] Clients list renders and client detail page opens.
- [ ] Schedule board renders Monday-Friday with team grouping.
- [ ] Visit can transition start -> finish and reflects actual duration.
- [ ] Products page highlights low stock items.
- [ ] Finance page shows daily and monthly summaries.

## Communication and billing

- [ ] Reminder pipeline jobs visible with status lifecycle.
- [ ] Invoice status changes draft -> issued -> paid (or failed path).
- [ ] Completion communication status updates after visit completion.
- [ ] Payment reconciliation cycle runs and updates status.

## Integration health checks

- [ ] Stripe webhook runtime `GET /health` returns 200.
- [ ] Stripe test event accepted and forwarded once (no duplicate state mutation).
- [ ] Operations worker cycle executes and reduces queued jobs.
- [ ] Audit timeline records critical actions.

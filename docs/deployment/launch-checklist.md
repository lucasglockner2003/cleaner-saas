# Launch Checklist

Use `RELEASE_PREP/*` checklists as the canonical rollout gate set.

## Fast command gates

```bash
npm run deploy:check:staging
npm run deploy:check:production
```

## Pre-launch gates

1. `npm run test:run` passes.
2. `npm run build` passes.
3. Runtime config report shows no critical blockers in Settings.
4. Supabase staging migration applied successfully (`npm run db:staging:migrate`).
5. Stripe webhook verification tested with signed test event.
6. Operation worker cycle tested end-to-end in staging.

## Required production environment

Frontend:

- `VITE_DATA_PROVIDER=supabase`
- `VITE_AUTH_PROVIDER=supabase`
- `VITE_ORGANIZATION_ID=<tenant-id>`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EMAIL_TRANSPORT` and optional `VITE_EMAIL_WEBHOOK_URL`
- `VITE_PHOTO_STORAGE_PROVIDER` and optional `VITE_PHOTO_WEBHOOK_URL`
- `VITE_MAP_PROVIDER` and optional `VITE_MAP_WEBHOOK_URL`
- `VITE_PAYMENT_PROVIDER`
- `VITE_PAYMENT_WEBHOOK_URL`
- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN`
- `VITE_STRIPE_PUBLISHABLE_KEY` (if Stripe mode)

Server/webhook runtime (not exposed to frontend):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMENT_GATEWAY_AUTH_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY` (if webhook writes directly to Supabase)

## Release-day sequence

1. Build migration bundle (`npm run db:bundle:pilot`) and deploy to production Supabase (`npm run db:production:migrate`).
2. Deploy webhook runtime and verify signature checks.
3. Deploy worker runtime/scheduler for operation jobs.
4. Deploy frontend.
5. Run post-deploy checks (`post-deploy-checks.md`).
6. Monitor first 24h for:
   - failed payment events
   - failed operation jobs
   - sync degradation
   - auth/session anomalies

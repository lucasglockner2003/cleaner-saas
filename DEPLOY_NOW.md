# DEPLOY_NOW

Single-file execution guide for first live deployment.

## 1. Services to create

Create these services before go-live:

1. `supabase-staging` project
2. `supabase-production` project
3. `cleaner-app-frontend` (Vercel project; static Vite app)
4. `cleaner-app-gateway` (server runtime that handles payment/ops gateway actions)
5. `cleaner-app-stripe-webhook` (Stripe signature verification + forwarding)
6. `cleaner-app-worker` (operation job runner)
7. Scheduler/cron trigger for worker (every 1-5 minutes)

## 2. Exact required environment variables

### Frontend (Vercel / static app runtime)

Required:

- `VITE_RUNTIME_ENV=production`
- `VITE_DATA_PROVIDER=supabase`
- `VITE_AUTH_PROVIDER=supabase`
- `VITE_ORGANIZATION_ID=<live_org_id>`
- `VITE_SUPABASE_URL=<https://...supabase.co>`
- `VITE_SUPABASE_ANON_KEY=<anon key>`

Required for Stripe path:

- `VITE_PAYMENT_PROVIDER=stripe`
- `VITE_PAYMENT_WEBHOOK_URL=<https://gateway-host/payments/gateway>`
- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN=<shared token>`
- `VITE_STRIPE_PUBLISHABLE_KEY=<pk_live_...>`

Conditional:

- If `VITE_EMAIL_TRANSPORT=webhook` -> `VITE_EMAIL_WEBHOOK_URL`
- If `VITE_PHOTO_STORAGE_PROVIDER=webhook` -> `VITE_PHOTO_WEBHOOK_URL`
- If `VITE_MAP_PROVIDER=webhook` -> `VITE_MAP_WEBHOOK_URL`

### Server runtimes (gateway/webhook/worker)

Required:

- `PAYMENT_GATEWAY_AUTH_TOKEN=<same shared token>`
- `APP_PAYMENT_WEBHOOK_URL=<https://gateway-host/payments/gateway>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`

Stripe webhook runtime:

- `STRIPE_SECRET_KEY=<sk_live_...>`
- `STRIPE_WEBHOOK_SECRET=<whsec_...>`

### DB script variables (local deployment execution)

- `STAGING_DATABASE_URL=<postgres connection string>`
- `PRODUCTION_DATABASE_URL=<postgres connection string>`

## 3. Exact deployment order

1. **Prepare env files**
   - `.env.staging` from `.env.staging.example`
   - `.env.production` from `.env.production.example`
2. **Run staging deployment checks**
   - `npm run deploy:check:staging`
3. **Build migration bundle**
   - `npm run db:bundle:pilot`
4. **Apply staging migration**
   - `npm run db:staging:migrate`
5. **(Optional) reseed staging**
   - `npm run db:staging:reset-seed`
6. **Deploy staging runtimes**
   - gateway service
   - stripe webhook service
   - worker service + scheduler
   - frontend
7. **Run staging checks** (see section 5)
8. **Run production deployment checks**
   - `npm run deploy:check:production`
9. **Apply production migration**
   - `npm run db:production:migrate`
10. **Deploy production runtimes in this order**
   - gateway service
   - stripe webhook service
   - worker service + scheduler
   - frontend
11. **Run production checks** (see section 6)

## 4. Exact commands to run

```bash
npm install
npm run deploy:check:staging
npm run db:bundle:pilot
npm run db:staging:migrate
npm run db:staging:reset-seed

npm run deploy:check:production
npm run db:production:migrate
```

Optional full check including DB apply:

```bash
node scripts/release/check-deploy-ready.mjs --environment staging --with-db
node scripts/release/check-deploy-ready.mjs --environment production --with-db
```

## 5. Exact staging checks

1. `npm run check:env:staging` passes.
2. `npm run test:run` passes.
3. `npm run build` passes.
4. Webhook health endpoint returns 200.
5. Worker can run one manual cycle successfully.
6. App login works (internal + portal).
7. One visit can be started and finished.
8. One invoice can move lifecycle state.
9. One payment provider event is ingested (idempotent replay verified).

## 6. Exact production checks

1. `npm run check:env:production` passes.
2. Settings page shows no critical config blockers.
3. Internal login + portal login succeed.
4. Stripe test/live-safe webhook event reaches `payment_events`.
5. Worker cycle reduces queued jobs and does not leave stale locks.
6. One payment update correctly adjusts invoice balance.
7. Audit events append for successful and failed actions.

## 7. Minimum go-live success criteria

- No critical config banner.
- No sustained failed webhook/worker spikes.
- Payment + invoice state transitions consistent.
- Tenant-scoped data access working (`organization_id` respected).

## 8. Fast references

- Supabase setup: `docs/deployment/supabase-setup.md`
- Stripe setup: `docs/deployment/stripe-setup.md`
- Webhook deployment: `docs/deployment/webhook-deployment.md`
- Worker runtime: `docs/deployment/worker-runtime.md`
- Post deploy checks: `docs/deployment/post-deploy-checks.md`

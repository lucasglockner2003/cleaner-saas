# Staging Environment Checklist

## Environment files and secrets

- [ ] `.env.staging` created from `.env.staging.example`.
- [ ] `VITE_RUNTIME_ENV=staging`.
- [ ] `VITE_DATA_PROVIDER=supabase`.
- [ ] `VITE_AUTH_PROVIDER=supabase`.
- [ ] `VITE_ORGANIZATION_ID` set to pilot tenant id.
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
- [ ] `VITE_PAYMENT_PROVIDER=stripe` (or approved provider mode).
- [ ] `VITE_PAYMENT_WEBHOOK_URL` set and reachable.
- [ ] `VITE_PAYMENT_GATEWAY_AUTH_TOKEN` configured.
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` configured.
- [ ] Server secrets configured: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.

## Validation commands

- [ ] `npm run check:env:staging` passes.
- [ ] `npm run test:run` passes.
- [ ] `npm run build` passes.

## Staging data state

- [ ] `STAGING_DATABASE_URL` exported in shell.
- [ ] `npm run db:bundle:pilot` generated bundle artifact.
- [ ] `npm run db:staging:reset-seed` completed.
- [ ] Staging login works for owner, ops, and cleaner roles.

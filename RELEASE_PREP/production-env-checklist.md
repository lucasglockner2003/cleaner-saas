# Production Environment Checklist

## Environment and runtime

- [ ] `.env.production` created from `.env.production.example`.
- [ ] `VITE_RUNTIME_ENV=production`.
- [ ] `VITE_ORGANIZATION_ID` is not `org-default`.
- [ ] `VITE_SUPABASE_URL` uses HTTPS.
- [ ] `VITE_PAYMENT_WEBHOOK_URL` uses HTTPS.
- [ ] `VITE_EMAIL_WEBHOOK_URL`, `VITE_PHOTO_WEBHOOK_URL`, and `VITE_MAP_WEBHOOK_URL` use HTTPS when enabled.
- [ ] `VITE_PAYMENT_GATEWAY_AUTH_TOKEN` is set and rotated for production cutover.
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` is production key (`pk_live_...`).

## Server-only secrets

- [ ] `STRIPE_SECRET_KEY` is production key (`sk_live_...`).
- [ ] `STRIPE_WEBHOOK_SECRET` created for production endpoint.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in webhook/worker runtime only.
- [ ] `PAYMENT_GATEWAY_AUTH_TOKEN` set in webhook runtime and matches frontend gateway token.
- [ ] `APP_PAYMENT_WEBHOOK_URL` points to the deployed gateway endpoint.

## Validation commands

- [ ] `npm run check:env:production` passes.
- [ ] `npm run test:run` passes.
- [ ] `npm run build` passes.
- [ ] `npm run db:bundle:pilot` generated launch migration bundle.

## Safe launch posture

- [ ] Staging smoke checklist is green before production deploy.
- [ ] Rollback owner confirmed.
- [ ] On-call owner and operator available for first 24h.

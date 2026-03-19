# Environment Reference (Production)

## Required (frontend runtime)

- `VITE_RUNTIME_ENV` (`local|staging|production`)
- `VITE_DATA_PROVIDER`
- `VITE_AUTH_PROVIDER`
- `VITE_ORGANIZATION_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Required (when provider mode is enabled)

### Email

- if `VITE_EMAIL_TRANSPORT=webhook`:
  - `VITE_EMAIL_WEBHOOK_URL`

### Photo storage

- if `VITE_PHOTO_STORAGE_PROVIDER=webhook`:
  - `VITE_PHOTO_WEBHOOK_URL`

### Maps

- if `VITE_MAP_PROVIDER=webhook`:
  - `VITE_MAP_WEBHOOK_URL`

### Payments

- if `VITE_PAYMENT_PROVIDER != manual`:
  - `VITE_PAYMENT_WEBHOOK_URL`
  - `VITE_PAYMENT_GATEWAY_AUTH_TOKEN`
- if `VITE_PAYMENT_PROVIDER=stripe`:
  - `VITE_STRIPE_PUBLISHABLE_KEY`

## Server-only secrets (never expose to frontend)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMENT_GATEWAY_AUTH_TOKEN`
- `APP_PAYMENT_WEBHOOK_URL`

## DB script variables

- `STAGING_DATABASE_URL` (required for `db:staging:*` scripts)
- `PRODUCTION_DATABASE_URL` (required for `db:production:migrate`)

## Misconfiguration detection

The app now surfaces runtime config issues in:

- app shell config banner
- settings runtime status panel

Launch should be blocked when critical issues are present.

## Scripted validation

```bash
npm run check:env:staging
npm run check:env:production
```

Production env check now runs in strict mode and fails when required server-side launch vars are missing.

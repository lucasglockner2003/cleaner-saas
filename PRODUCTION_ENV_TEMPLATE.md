# PRODUCTION_ENV_TEMPLATE

Copy this into your production secret manager (or `.env.production` for validation) and replace placeholders.

## Frontend runtime variables (`VITE_*`)

| Variable | Required | Example | Plain-English purpose |
|---|---|---|---|
| `VITE_RUNTIME_ENV` | Yes | `production` | Turns on production runtime checks and behavior. |
| `VITE_DATA_PROVIDER` | Yes | `supabase` | Chooses backend data source for app data reads/writes. |
| `VITE_AUTH_PROVIDER` | Yes | `supabase` | Chooses auth provider for login/session flow. |
| `VITE_ORGANIZATION_ID` | Yes | `org-firstclean-auckland` | Tenant/company identifier written with operational records. |
| `VITE_SUPABASE_URL` | Yes | `https://xyz.supabase.co` | Supabase project URL used by frontend SDK. |
| `VITE_SUPABASE_ANON_KEY` | Yes | `<anon-key>` | Supabase public anon key for frontend access. |
| `VITE_PAYMENT_PROVIDER` | Yes | `stripe` | Enables Stripe-backed payment mode in UI/service layer. |
| `VITE_PAYMENT_WEBHOOK_URL` | Yes (provider-backed payments) | `https://gateway.example.com/payments/gateway` | Gateway endpoint frontend calls for payment intent/reconciliation actions. |
| `VITE_PAYMENT_GATEWAY_AUTH_TOKEN` | Yes (provider-backed payments) | `<shared-token>` | Shared auth token sent to gateway endpoint from frontend calls. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Yes when Stripe | `pk_live_xxx` | Stripe public key for provider mode readiness. |
| `VITE_EMAIL_TRANSPORT` | Conditional | `webhook` or `mock` | Controls reminder/completion email dispatch transport strategy. |
| `VITE_EMAIL_WEBHOOK_URL` | Required if email transport is webhook | `https://comms.example.com/email` | Email transport endpoint for webhook-based dispatch. |
| `VITE_PHOTO_STORAGE_PROVIDER` | Conditional | `webhook` or `placeholder` | Controls proof photo transport/storage path. |
| `VITE_PHOTO_WEBHOOK_URL` | Required if photo provider is webhook | `https://media.example.com/photos` | Endpoint for photo upload/storage handoff. |
| `VITE_MAP_PROVIDER` | Conditional | `webhook` or `mock` | Controls route/map provider mode. |
| `VITE_MAP_WEBHOOK_URL` | Required if map provider is webhook | `https://maps.example.com/route` | Endpoint for map/route provider calls. |

## Server/runtime-only variables (do not expose in frontend bundle)

| Variable | Required | Example | Plain-English purpose |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `<service-role-key>` | Server-side Supabase key for privileged webhook/worker operations. |
| `PAYMENT_GATEWAY_AUTH_TOKEN` | Yes | `<shared-token>` | Server-side token that must match the frontend gateway token. |
| `APP_PAYMENT_WEBHOOK_URL` | Yes | `https://gateway.example.com/payments/gateway` | Canonical gateway endpoint used by webhook/worker runtime forwarding. |
| `STRIPE_SECRET_KEY` | Yes when Stripe | `sk_live_xxx` | Stripe secret key for webhook/gateway server runtime. |
| `STRIPE_WEBHOOK_SECRET` | Yes when Stripe | `whsec_xxx` | Stripe signature secret used to verify webhook payloads. |
| `STAGING_DATABASE_URL` | Required for staging DB scripts | `postgresql://...` | Connection string used by staging migration/seed scripts. |
| `PRODUCTION_DATABASE_URL` | Required for production DB scripts | `postgresql://...` | Connection string used by production migration script. |

## Validation commands

```bash
npm run check:env:production
npm run deploy:check:production
```

If either command fails, do not deploy production.

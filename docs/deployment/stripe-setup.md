# Stripe Setup (First Live Deployment)

## 1. Stripe resources to create

1. Stripe account (live mode enabled).
2. Webhook endpoint pointing to your webhook runtime:
   - `https://<your-webhook-host>/webhooks/stripe`
3. Capture the webhook signing secret (`whsec_...`).
4. Capture API keys:
   - publishable: `pk_live_...`
   - secret: `sk_live_...`

Recommended webhook events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`

## 2. Required environment values

Frontend:

- `VITE_PAYMENT_PROVIDER=stripe`
- `VITE_PAYMENT_WEBHOOK_URL=https://<gateway-host>/payments/gateway`
- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN=<shared-token>`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`

Webhook runtime / gateway runtime:

- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `PAYMENT_GATEWAY_AUTH_TOKEN=<shared-token>`
- `APP_PAYMENT_WEBHOOK_URL=https://<gateway-host>/payments/gateway`

## 3. Runtime contract (must be implemented)

The payment gateway endpoint at `VITE_PAYMENT_WEBHOOK_URL` / `APP_PAYMENT_WEBHOOK_URL` must support:

- `action=create_payment_intent`
- `action=reconcile_payment`
- `action=payment_provider_event`
- `action=operation_job_cycle`

This endpoint is external runtime infrastructure and must be deployed outside the static frontend.

## 4. Reference implementation files (repo)

- `infra/webhooks/stripe/verifyStripeSignature.mjs`
- `infra/webhooks/stripe/mapStripeEventToPaymentEvent.mjs`
- `infra/webhooks/stripe/handlerExample.mjs`
- `infra/webhooks/stripe/serverExample.mjs`

Run local webhook runtime example:

```bash
npm run webhook:stripe:example
```

## 5. Verification checklist before go-live

1. `GET /health` on webhook runtime returns 200.
2. Stripe test event reaches `/webhooks/stripe`.
3. Event is accepted only when signature is valid.
4. Event forwards to gateway and creates/updates `payment_events` rows.
5. Replay of same Stripe event is idempotent (`provider_event_id` dedupe).
6. Reconciliation cycle updates stale pending provider-backed payments.

## 6. Failure cases to monitor

- Signature verification failures (HTTP 400).
- Forwarding failures from webhook runtime to gateway.
- `ignored_unmatched` provider events.
- `rejected` events due to invalid transitions.
- Growth in pending provider-backed payments without reconciliation progress.

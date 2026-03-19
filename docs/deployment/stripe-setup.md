# Stripe Setup (Launch)

## Integration model

- Frontend uses Stripe-first adapter boundary via payment service.
- Provider events are verified server-side, then forwarded as normalized payloads.
- Payment lifecycle is idempotent and replay-safe via `idempotency_key` + `payment_events`.

## Required configuration

Frontend:

- `VITE_PAYMENT_PROVIDER=stripe`
- `VITE_PAYMENT_WEBHOOK_URL=<gateway-endpoint>`
- `VITE_PAYMENT_GATEWAY_AUTH_TOKEN=<shared-token>`
- `VITE_STRIPE_PUBLISHABLE_KEY=<pk_live_...>`

Webhook runtime:

- `STRIPE_WEBHOOK_SECRET=<whsec_...>`
- `STRIPE_SECRET_KEY=<sk_live_...>`
- `PAYMENT_GATEWAY_AUTH_TOKEN`
- `APP_PAYMENT_WEBHOOK_URL=<app-ingest-endpoint>`

## Signature verification path

Reference implementation:

- `infra/webhooks/stripe/verifyStripeSignature.mjs`
- `infra/webhooks/stripe/mapStripeEventToPaymentEvent.mjs`
- `infra/webhooks/stripe/handlerExample.mjs`
- `infra/webhooks/stripe/serverExample.mjs`

## Reconciliation flow

1. Payment intent prepared and pending payment recorded.
2. Stripe webhook event is verified and mapped to provider payload.
3. `applyPaymentProviderEvent` applies transition if event is new.
4. `runPaymentReconciliationCycle` re-checks unresolved provider-backed pending payments.
5. Invoice balances stay consistent through capture/refund transitions.

## Failure cases to monitor

- Signature verification failure (should return HTTP 400).
- Unmatched provider events (`processing_status=ignored_unmatched`).
- Rejected events (`processing_status=rejected`) due to invalid transitions.
- Pending provider payments older than SLA threshold.

## Launch test cases

1. Successful payment intent -> `captured` event -> invoice balance update.
2. Failed payment event -> payment `failed` state with reason.
3. Webhook replay with same `provider_event_id` -> idempotent no-op.
4. Reconciliation cycle converts pending payment to captured/failed when provider confirms.

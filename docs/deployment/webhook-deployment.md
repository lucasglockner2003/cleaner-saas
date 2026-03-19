# Webhook Deployment

## Scope

Current launch path focuses on Stripe payment webhooks.

## Endpoint requirements

- Must read raw request body (no pre-parsing before signature verification).
- Must validate Stripe signature using webhook secret.
- Must reject unsigned/invalid payloads with `400`.
- Must authenticate forwarding calls to app/payment endpoint.

## Reference implementation

- `infra/webhooks/stripe/verifyStripeSignature.mjs`
- `infra/webhooks/stripe/mapStripeEventToPaymentEvent.mjs`
- `infra/webhooks/stripe/handlerExample.mjs`

## Security controls

- Keep `STRIPE_WEBHOOK_SECRET` server-side only.
- Keep `PAYMENT_GATEWAY_AUTH_TOKEN` server-side only.
- Rotate tokens periodically and on incident.
- Rate-limit webhook endpoint where possible.

## Delivery contract to app

Forwarded payload should include:

- `provider`
- `provider_event_id`
- `event_type`
- `provider_intent_id`
- `provider_ref`
- `payment_status`
- `failure_reason`
- `raw_payload`

## Observability

Track:

- webhook verification failures
- forwarding failures
- unmatched/rejected payment events in app tables

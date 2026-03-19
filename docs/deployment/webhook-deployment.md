# Webhook Deployment (Stripe First)

## 1. Service to deploy

Deploy a dedicated webhook service exposing:

- `GET /health`
- `POST /webhooks/stripe`

Use `infra/webhooks/stripe/serverExample.mjs` as the baseline wiring.

## 2. Required environment variables

- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `PAYMENT_GATEWAY_AUTH_TOKEN`
- `APP_PAYMENT_WEBHOOK_URL`
- optional: `STRIPE_WEBHOOK_PORT` (default `8787`)

## 3. Critical behavior requirements

1. Read raw body exactly (do not pre-parse JSON before verification).
2. Verify `stripe-signature`.
3. Reject invalid signature with `400`.
4. Map event to normalized payload.
5. Forward payload to `APP_PAYMENT_WEBHOOK_URL` with header:
   - `x-payment-gateway-token`
6. Return non-2xx only for true failure conditions.

## 4. Local verification flow

Start webhook runtime:

```bash
npm run webhook:stripe:example
```

Health check:

```bash
curl http://localhost:8787/health
```

## 5. Production verification flow

1. Call `GET /health` on deployed webhook URL.
2. Send Stripe test event from dashboard.
3. Confirm webhook logs show:
   - signature verified
   - event forwarded to gateway
4. Confirm app-side `payment_events` has new row for `provider_event_id`.

## 6. Security controls

- Keep Stripe keys and webhook secret server-side only.
- Keep `PAYMENT_GATEWAY_AUTH_TOKEN` server-side only.
- Use HTTPS only.
- Rotate secrets/tokens on schedule and after incidents.
- Apply rate limiting and request size limits at edge/proxy.

## 7. Minimum observability signals

- verification failures count
- forwarding failures count
- non-2xx responses from app gateway
- end-to-end webhook latency

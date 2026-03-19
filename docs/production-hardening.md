# Production Hardening (Final Phase)

## Scope completed

This phase focuses on shipping reliability and integration depth on top of existing product features (not broad feature expansion).

## 1. Payment provider hardening (Stripe-first boundary)

Implemented:

- Stripe-first provider adapter boundary at `services/payments/paymentProviderAdapterService.js`
- idempotency key generation and replay protection in payment creation
- provider event ingestion endpoint contract (`applyPaymentProviderEvent`)
- webhook/event deduplication via `paymentEvents` collection
- reconciliation cycle (`runPaymentReconciliationCycle`) for pending provider payments
- provider error propagation + retry-safe transitions

Still infra-dependent:

- live Stripe webhook endpoint + signature verification
- secure gateway token management and secret rotation
- payment-intent creation endpoint deployment

## 2. Supabase migration depth

Implemented:

- collection-level sync strategies (tenant scope, reconcile, selective prune)
- conflict-aware reconciliation (`updated_at` freshness merge)
- persisted `reconciledDb` feedback loop into app state
- expanded table map for monetization/CRM/reliability collections
- `organization_id` propagation readiness for key monetization/CRM/reliability entities

Still infra-dependent:

- SQL migrations for newly added tables/columns
- strict DB constraints and indexes
- full RLS policy rollout and policy tests

## 3. Background jobs / worker readiness

Implemented:

- generic operations queue model (`operationJobs`)
- queue lifecycle (`queued/running/completed/failed/retry_scheduled`)
- executor cycle with retry behavior
- handlers wired for:
  - reminder dispatch
  - invoice dispatch
  - CRM lifecycle refresh
  - payment reconciliation

Still infra-dependent:

- external scheduler/worker runtime (cron/queue consumer)
- distributed lock strategy for multi-instance execution

## 4. Performance hardening

Implemented:

- route-level lazy loading for major page modules
- suspense fallback for route chunks
- manual vendor chunking in Vite config
- shared table row-windowing readiness (`DataTable` `windowSize`)

Result:

- prior large single-bundle warning resolved; build now emits split chunks by route/vendor.

## 5. Reliability and auditability

Implemented:

- `auditEvents` model and service-level timeline appends on mutations
- settings UI visibility for operation job queue and audit timeline
- app-wide error boundary fallback (`AppErrorBoundary`)
- degraded sync + session-expiry visibility in header/shell

Still infra-dependent:

- centralized log sink/observability backend
- immutable audit export pipeline

## 6. Test foundation

Implemented with Vitest:

- payment lifecycle + idempotency + webhook idempotency tests
- route optimization output contract test
- subscription assignment guard test
- CRM lifecycle refresh transition test
- persistence retry/reconciliation behavior test
- operation job execution flow test

Command:

```bash
npm run test:run
```

## 7. Security and tenancy readiness

Implemented:

- `organization_id` runtime configuration (`VITE_ORGANIZATION_ID`)
- tenant-aware Supabase query/upsert strategy where supported
- session-expiry surfacing and auth session monitoring pattern

Recommended RLS direction:

- require `organization_id = auth.jwt() ->> 'organization_id'` on operational tables
- constrain portal/customer tables by `client_id` ownership
- separate internal-operator and customer policies

## 8. Deployment readiness checklist

1. Provision Supabase schema and indexes for newly introduced tables.
2. Enable RLS and apply tenant/customer policies.
3. Deploy payment gateway webhook endpoint with Stripe signature verification.
4. Set production env:
   - `VITE_DATA_PROVIDER=supabase`
   - `VITE_AUTH_PROVIDER=supabase`
   - `VITE_ORGANIZATION_ID`
   - payment/email/photo/map gateway URLs + tokens
5. Run build and test gates:
   - `npm run test:run`
   - `npm run build`
6. Enable worker scheduler for `operationJobs` execution cycles.

Detailed launch runbooks:

- `docs/deployment/launch-checklist.md`
- `docs/deployment/frontend-deployment.md`
- `docs/deployment/supabase-setup.md`
- `docs/deployment/stripe-setup.md`
- `docs/deployment/webhook-deployment.md`
- `docs/deployment/worker-runtime.md`
- `docs/deployment/post-deploy-checks.md`
- `docs/deployment/rollback-checklist.md`
- `docs/deployment/schema-mismatch-audit.md`
- `docs/deployment/env-reference.md`

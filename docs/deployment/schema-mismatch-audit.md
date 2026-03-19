# Schema Mismatch Audit (Code vs DB)

This checklist highlights launch-critical mismatches to verify before go-live.

## 1. Table existence

Required tables from persistence map must exist:

- `payments`, `payment_events`
- `subscription_plans`, `client_subscriptions`
- `crm_profiles`, `referrals`, `growth_campaigns`
- `operation_jobs`, `audit_events`

## 2. Launch-critical columns

### `payments`

- `idempotency_key`
- `provider_event_id`
- `reconciliation_status`
- `provider_last_error`
- `last_reconciled_at`

### Multi-tenant scope

`organization_id` should exist on:

- `clients`, `invoices`, `payments`
- `subscription_plans`, `client_subscriptions`
- `crm_profiles`, `referrals`, `growth_campaigns`
- `portal_accounts`, `booking_requests`
- `payment_events`, `operation_jobs`, `audit_events`

### Queue reliability

`operation_jobs` should include:

- `worker_id`
- `lock_expires_at`
- `next_attempt_at`
- `attempt_count`, `max_attempts`

## 3. Timestamp consistency

For conflict-aware reconciliation quality, ensure `created_at` and `updated_at` are present and maintained on mutable tables.

## 4. Index coverage

Verify indexes for:

- payment lookup: `invoice_id`, `provider_intent_id`, `idempotency_key`
- operation queue scan: `organization_id,status,next_attempt_at`
- audit timeline: `organization_id,created_at`

## 5. RLS policy coverage

Validate policies exist for:

- tenant internal access (`organization_id` claim)
- portal customer self-access (`client_id` + `organization_id`)
- service-role write paths (worker/webhook runtime)

# Rollback Checklist

## Trigger conditions

- Sustained payment event failures/rejections.
- Worker queue runaway failures.
- RLS misconfiguration blocking core operations.
- Critical auth/session failures.

## Rollback actions

1. Freeze provider-backed payment mode:
   - set `VITE_PAYMENT_PROVIDER=manual`
2. Pause worker scheduler for operation jobs.
3. Keep webhook endpoint active but respond `202` without forwarding (temporary safe mode).
4. Revert frontend deployment to last known good build.
5. If migration-related issue:
   - disable problematic RLS policy
   - apply hotfix migration (do not drop launch data tables)

## Data safety principles

- Do not delete `payments`, `payment_events`, `operation_jobs`, or `audit_events` during incident response.
- Preserve event/audit trails for reconciliation and postmortem.

## Recovery validation

1. Internal operations usable (client/schedule/visit/finance paths).
2. Payment capture can continue in manual mode.
3. Queue growth is bounded and visible.
4. Audit logging remains active.

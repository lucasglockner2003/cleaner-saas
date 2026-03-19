# Rollback Checklist

## Trigger conditions

- [ ] Authentication outage for internal users.
- [ ] Stripe webhook verification failures > 20% sustained for 10 minutes.
- [ ] Operation worker stuck/failing and jobs cannot be recovered.
- [ ] Payment lifecycle transitions are inconsistent or duplicated.
- [ ] Critical data write errors across core modules.

## Rollback steps

1. [ ] Stop new deployments and pause scheduler/worker.
2. [ ] Switch frontend to previous stable release artifact.
3. [ ] Redirect webhook endpoint to previous stable runtime.
4. [ ] Restore previous payment gateway token if token rotation caused failures.
5. [ ] If schema migration caused failure, apply prepared rollback SQL or restore backup snapshot.
6. [ ] Re-run smoke subset on rolled-back stack.

## Post-rollback actions

- [ ] Capture incident timeline.
- [ ] Export failed operation jobs and payment events for analysis.
- [ ] Open remediation ticket with owner and due date.
- [ ] Confirm customer-facing impact and communication plan.

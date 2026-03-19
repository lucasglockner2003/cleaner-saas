# Pilot Rollout Checklist

## Pre-pilot prep

- [ ] Pilot tenant organization id approved and mapped.
- [ ] Pilot users created (owner, ops, at least one cleaner).
- [ ] Customer portal pilot accounts provisioned.
- [ ] Pilot schedule week seeded and verified.
- [ ] Pilot invoice/payment flow dry run completed in staging.

## Deployment sequence

- [ ] Apply migration bundle: `npm run db:bundle:pilot` then `npm run db:staging:migrate` / `npm run db:production:migrate`.
- [ ] Deploy webhook runtime (Stripe verifier + gateway forwarding).
- [ ] Deploy operation worker runtime and scheduler.
- [ ] Deploy frontend with pilot environment configuration.

## Day-0 validation

- [ ] Internal login and role guards verified.
- [ ] Dispatch board loads and route suggestions render.
- [ ] Start/finish visit flow updates status and audit timeline.
- [ ] Reminder jobs can queue, run, and retry.
- [ ] Invoice generation and status transitions visible.
- [ ] Payment event ingest updates payment and invoice state.
- [ ] Portal user can view upcoming visits and invoice references.

## First pilot handoff

- [ ] Pilot team receives runbook and escalation contacts.
- [ ] Monitoring dashboard links shared.
- [ ] Daily check-in cadence defined for first week.

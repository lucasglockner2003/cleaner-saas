# AGENTS.md

Repository operating rules for production-phase changes.

## Engineering guardrails

1. Keep files small and focused.
2. Do not create giant pages/components; extract reusable blocks.
3. Keep service/repository boundaries strict.
4. Do not put persistence/provider logic in UI pages.
5. Prefer targeted changes over wide refactors in rollout windows.

## Critical flow protection

1. Payment lifecycle changes must remain idempotent and reconciliation-safe.
2. Persistence writes must preserve `organization_id` propagation.
3. Communication jobs must preserve retry-safe transitions.
4. Do not bypass audit/event logging for critical mutations.

## Change process for risky areas

For changes touching payments, persistence, auth, queue/jobs, or webhook handling:

1. Update related docs/runbooks/checklists.
2. Run:
   - `npm run test:run`
   - `npm run build`
3. Include rollback notes in PR/commit summary.

## Testing expectations

1. Add or update tests for domain logic changes.
2. Keep tests deterministic and fast.
3. Do not merge risky changes without test/build green.

## Release phase behavior

1. Avoid introducing large new features.
2. Avoid renaming domains/modules unless launch-critical.
3. Prefer explicit configuration validation over hidden defaults.
4. Keep deployment commands scriptable and reproducible.

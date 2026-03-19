# PILOT_READINESS

Status snapshot for first real tenant rollout.

## 1. Ready now

- Modular app architecture with Supabase-ready persistence boundaries.
- Stripe-first payment adapter flow with provider event ingestion model.
- Operation jobs queue model with retry and lease recovery.
- Communication and invoice pipelines with lifecycle statuses.
- Customer portal, booking, recurring schedule, and optimization foundations.
- Deployment docs, release checklists, runbook, and CI build/test workflow.

## 2. Exact blockers

1. Real production credentials and runtime infrastructure are not in-repo.
2. Webhook runtime and worker runtime require deployment target binding.
3. Supabase project schema must be applied/validated in target environment.
4. Stripe webhook endpoint must be registered in Stripe dashboard.
5. Observability stack (alerts/log forwarding) must be connected externally.

## 3. Exact assumptions

1. One pilot tenant (`organization_id`) is used for first rollout.
2. Stripe is first payment provider for pilot.
3. Webhook and worker are deployed as separate runtime processes.
4. Supabase RLS policies are applied from migration artifacts.
5. Pilot team uses manual operational check-ins for first week.

## 4. External services still required

- Supabase project (staging + production) with credentials and service role key.
- Stripe account with live/test keys and webhook signing secret.
- Hosting platform for frontend deployment.
- Runtime host for webhook endpoint.
- Runtime host/scheduler for worker execution.
- Secret manager for token/key rotation.

## 5. First tenant onboarding flow

1. Create tenant identifier (`organization_id`) and configure env files.
2. Apply migrations and seed pilot data in staging.
3. Create internal users (owner, ops, cleaner) and portal accounts.
4. Validate core smoke checklist in staging.
5. Deploy production stack and run go-live checklist.
6. Import/enter first live client, schedule first week, and verify reminders/invoices.

## 6. First-week monitoring plan

Daily checks (first 7 days):

1. Operation job queue health (`queued`, `retry_scheduled`, `failed`).
2. Payment event ingestion and reconciliation status.
3. Reminder and completion communication outcomes.
4. Worker cycle success frequency and lease recovery events.
5. Audit timeline anomalies for critical flows (payments, schedule mutations, auth).

Escalation thresholds:

- Any sustained failed job growth > 20 jobs/hour.
- Any payment provider event backlog > 30 minutes.
- Any webhook signature failure spike > 10% over 10 minutes.

Response:

- Pause scheduler, keep webhook intake online, triage root cause, run controlled retries, rollback if required.

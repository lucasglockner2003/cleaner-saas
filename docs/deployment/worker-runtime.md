# Worker Runtime (First Live Deployment)

## 1. Service to deploy

Deploy one worker runtime process per environment that can trigger operation cycles.

Reference files:

- `infra/workers/operations/runnerExample.mjs`
- `infra/workers/operations/runCycleExample.mjs`

## 2. Required environment variables

- `APP_PAYMENT_WEBHOOK_URL` (gateway endpoint supporting `operation_job_cycle`)
- `PAYMENT_GATEWAY_AUTH_TOKEN`
- `OPS_WORKER_ID` (example: `ops-worker-prod-1`)
- optional:
  - `OPS_WORKER_MAX_JOBS` (default 20)
  - `OPS_WORKER_LOOP` (`true|false`)
  - `OPS_WORKER_INTERVAL_MS` (default 60000)

## 3. Execution model (production)

Recommended:

1. Scheduler triggers worker every 1-5 minutes.
2. Worker sends:
   - `action=operation_job_cycle`
   - payload with `workerId`, `maxJobs`, `leaseMinutes`, `recoverStaleRunning=true`
3. Worker logs cycle outcome counts.

## 4. Local run command

```bash
npm run worker:operations:example
```

## 5. Production verification checklist

1. Run one manual worker cycle after deploy.
2. Confirm `operation_jobs` transitions:
   - `queued -> running -> completed|retry_scheduled|failed`
3. Confirm stale `running` rows recover when lease expires.
4. Confirm reminder/invoice/CRM/payment jobs are processed.

## 6. Operational safeguards

- Keep one active worker per tenant for initial rollout.
- Protect gateway endpoint with `PAYMENT_GATEWAY_AUTH_TOKEN`.
- Alert when:
  - failed jobs spike
  - retry queue grows continuously
  - running jobs exceed lease time repeatedly

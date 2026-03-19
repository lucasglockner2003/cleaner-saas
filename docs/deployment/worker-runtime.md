# Worker Runtime (Operation Jobs)

## Purpose

Operation jobs execute asynchronous workflows outside request/UI paths:

- reminder dispatch
- invoice dispatch
- CRM lifecycle refresh
- payment reconciliation

## Queue contract

Job lifecycle:

- `queued`
- `running` (with `worker_id` + `lock_expires_at`)
- `completed`
- `retry_scheduled`
- `failed`

Safety behavior:

- stale `running` jobs with expired lease can be recovered
- retry count bounded by `max_attempts`

## Runtime deployment model

Recommended:

1. Scheduler (every 1-5 minutes) triggers a worker endpoint.
2. Worker calls app operation cycle action with:
   - `workerId`
   - `maxJobs`
   - `leaseMinutes`
   - `recoverStaleRunning=true`
3. Worker emits metrics/logs for success/failure/retry counts.

Reference template:

- `infra/workers/operations/runnerExample.mjs`
- `infra/workers/operations/runCycleExample.mjs` (CLI/loop runner template)

Run local worker cycle:

```bash
npm run worker:operations:example
```

## Operational safeguards

- Single-worker-per-tenant preferred initially.
- Use strict request auth token for worker trigger endpoint.
- Alert on:
  - high failed job count
  - growing retry queue
  - stale running jobs

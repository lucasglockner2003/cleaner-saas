# Supabase Launch Artifacts

This folder contains launch-ready database artifacts aligned with the current application model.

## Migrations

- `migrations/20260320_launch_readiness.sql`
  - creates reliability tables (`payment_events`, `operation_jobs`, `audit_events`)
  - adds tenant-ready `organization_id` columns where required
  - adds indexes for payment, worker, and audit paths
  - enables RLS and creates baseline tenant/customer policies

- `migrations/bundles/pilot-launch.manifest.json`
  - ordered migration manifest for pilot release packaging
  - used by `npm run db:bundle:pilot`
- `migrations/generated/pilot-launch-bundle.sql`
  - generated review artifact composed from source migrations

## Seeds

- `seeds/staging/reset.sql`
- `seeds/staging/seed.sql`
- run via:
  - `npm run db:staging:reset`
  - `npm run db:staging:seed`
  - `npm run db:staging:reset-seed`

## Rollout flow

1. Build migration bundle: `npm run db:bundle:pilot`.
2. Apply migration in staging: `npm run db:staging:migrate`.
2. Validate RLS with owner/ops/customer JWT claims.
3. Apply migration in production: `npm run db:production:migrate`.
4. Run application in `VITE_DATA_PROVIDER=supabase`.
5. Execute post-deploy checks from `docs/deployment/post-deploy-checks.md`.

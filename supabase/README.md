# Supabase Launch Artifacts

This folder contains launch-ready database artifacts aligned with the current application model.

## Migrations

- `migrations/20260320_launch_readiness.sql`
  - creates reliability tables (`payment_events`, `operation_jobs`, `audit_events`)
  - adds tenant-ready `organization_id` columns where required
  - adds indexes for payment, worker, and audit paths
  - enables RLS and creates baseline tenant/customer policies

## Rollout flow

1. Apply migration in staging.
2. Validate RLS with owner/ops/customer JWT claims.
3. Run application in `VITE_DATA_PROVIDER=supabase`.
4. Execute post-deploy checks from `docs/deployment/post-deploy-checks.md`.

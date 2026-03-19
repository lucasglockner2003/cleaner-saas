# Migration Bundles

This folder stores ordered migration manifests used for release packaging.

## Why this exists

- keeps migration ordering explicit for pilot and production releases
- allows generating a single reviewable SQL bundle artifact
- avoids ad-hoc migration selection during rollout windows

## Current bundle

- `pilot-launch.manifest.json`: launch-safe baseline for pilot environments

## Generate bundle artifact

```bash
npm run db:bundle:pilot
```

Output:

- `supabase/migrations/generated/pilot-launch-bundle.sql`

The generated file is an artifact for release review. Source-of-truth remains each migration file under `supabase/migrations/`.

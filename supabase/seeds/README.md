# Supabase Seeds

## Staging seed/reset

- `staging/reset.sql`: truncates launch-relevant tables for a clean pilot dataset
- `staging/seed.sql`: inserts a practical baseline dataset for operational smoke tests

Run with:

```bash
npm run db:staging:reset-seed
```

Requirements:

- `psql` available in PATH (or set `PSQL_BIN`)
- `STAGING_DATABASE_URL` set to your staging Postgres/Supabase connection string

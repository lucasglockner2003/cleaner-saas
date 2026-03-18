# Cleaner Management SaaS MVP Foundation

Operations-focused MVP foundation for cleaning companies, designed for long-term SaaS evolution.

## Run locally

```bash
npm install
npm run dev
```

Portal login (local demo): `http://localhost:5173/portal/login`

## Environment

Copy `.env.example` to `.env` and configure provider mode:

- `VITE_DATA_PROVIDER=local` (default) or `supabase`
- `VITE_AUTH_PROVIDER=local` (default) or `supabase`
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` when using Supabase mode
- `VITE_EMAIL_TRANSPORT=mock|webhook` and `VITE_EMAIL_WEBHOOK_URL`
- `VITE_PHOTO_STORAGE_PROVIDER=placeholder|webhook` and `VITE_PHOTO_WEBHOOK_URL`

## Included foundations

- Modular frontend architecture with domain-separated services
- Dashboard + operations pages (clients, schedule, teams, employees, finance, products, visits, bookings, recurring)
- Communications operations page for reminder/invoice/completion pipeline lifecycle
- Work clock flow (start/finish visits) with history and duration tracking
- Reminder queue, invoice lifecycle, completion email workflow, and unified communication job tracking
- Proof-of-service metadata lifecycle with before/after grouping and readiness visibility
- Customer portal foundation with separate route/shell/auth boundary
- Customer booking request flow and internal booking review pipeline
- Recurring rule projection and materialization workflow
- Repository-backed persistence flow with local durable storage + Supabase-ready data source gateway
- Auth/session foundation with protected routing, role model, and user-type boundary (internal/customer)
- Scheduling estimation and finance logic as pure utility modules
- Supabase-ready data model documentation and replaceable service layer
- Future-ready placeholders for reminders, invoices, photos, route optimization, portal, ratings, and payments

## Docs

- `docs/architecture.md`
- `docs/mvp-scope.md`
- `docs/data-model.md`
- `docs/workflows.md`
- `docs/roadmap.md`
- `docs/implementation-status.md`
- `docs/persistence.md`
- `docs/auth-strategy.md`
- `docs/customer-portal.md`

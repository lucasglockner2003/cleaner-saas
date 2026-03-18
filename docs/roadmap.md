# Roadmap

## Phase A - Operations MVP foundation (completed)

- Core dispatch, visit execution, finance, inventory, and client management.
- Modular service layer and normalized data model.

## Phase B - Persistence and auth foundation (completed)

- Local/Supabase-ready persistence gateway and repository mutation flow.
- Auth/session and role-protected routes.

## Phase C - Communication and proof workflows (completed)

- Reminder/invoice/completion pipelines with status/retry handling.
- Proof metadata and readiness visibility.

## Phase D - Customer self-service and recurrence (completed in current phase)

- Customer portal route/app-shell separation.
- Customer login and safe access boundary model.
- Booking request lifecycle and internal review workflow.
- Real recurring rule model, projections, and schedule materialization.

## Phase E - Provider and automation hardening (next)

- Real email provider integration and event ingestion.
- Real storage upload pipeline + signed proof delivery.
- Invoice PDF generation worker and artifact storage.
- Recurring and communication background job runners.
- Availability engine to auto-assess booking requests.

## Phase F - SaaS scale evolution (later)

- Tenant/org provisioning and RLS policy hardening.
- Customer payment integration and portal billing actions.
- Multi-region dispatch optimization and deeper automation.
- Predictive AI modules for capacity, delays, and profitability.

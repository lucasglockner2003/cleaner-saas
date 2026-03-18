# Implementation Status

## Implemented now (real behavior)

### Internal operations

- Clients, schedule, visits, teams, employees, finance, products, dashboard.
- Visit execution lifecycle with proof metadata and communication status linkage.
- Reminder/invoice/completion communication pipelines with job tracking and retries.

### Customer-facing (Phase 5)

- Dedicated customer portal route group and shell.
- Customer login route and customer role/user-type access model.
- Portal pages for:
  - overview/upcoming services
  - service history + proof references
  - invoices
  - booking requests
  - recurring plan projections
  - account details
- Booking request domain:
  - validation, estimation, submission, lifecycle status transitions
  - internal booking review module
- Recurring scheduling domain:
  - configurable rules (weekly/fortnightly/monthly/custom-ready)
  - future projection logic
  - materialization of projected occurrences into scheduled visits
  - internal recurring management module

### Persistence/auth evolution

- Repository coverage expanded to bookings and recurring modules.
- Data model expanded with `bookingRequests` and `portalAccounts`.
- Route guards now enforce both roles and user types (`internal` vs `customer`).

## Implemented with adapter boundaries

- Email transport adapters: mock + webhook boundary
- Photo storage adapters: placeholder + webhook boundary
- Invoice export references (PDF generation still adapter-ready)

## Partial / scaffolded

- Real external provider integrations (email/storage/PDF workers)
- Availability engine for booking confirmation
- Automated recurring materialization worker
- Portal-side payment and online settlement flows

## Intentionally deferred

- Full tenant provisioning and SaaS plan billing
- Advanced customer self-service rescheduling/cancellation automation
- AI routing/pricing/forecasting modules

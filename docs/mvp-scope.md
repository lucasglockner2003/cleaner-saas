# MVP Scope

## Goal

Deliver a production-minded operational platform that now includes customer self-service foundations, while preserving maintainable architecture and clear module boundaries.

## In scope now

1. Internal operations modules:
   - clients, schedule, visits, teams, employees, finance, products, dashboard
2. Communication workflows:
   - reminders, completion communication, invoice communication, proof readiness
3. Customer portal foundation:
   - separate routing, layout, and login path
   - customer-safe service history/upcoming/invoice/proof/account views
4. Online booking foundation:
   - booking request submission with realistic fields and estimates
   - internal review/status workflow
5. Recurring scheduling foundation:
   - recurrence rule management (weekly/fortnightly/monthly/custom-ready)
   - projection of upcoming recurring services
   - materialization into scheduled visits

## Partial in current scope

- Email/storage providers use adapter boundaries; real provider plumbing is next.
- Booking flow supports request/review lifecycle but not full availability/quote/payment automation.
- Recurrence supports projection and manual materialization; full automation workers are pending.

## Out of scope for this phase

- Full payment collection and subscription billing
- Customer self-service reschedule/cancel orchestration with fees
- Multi-tenant provisioning and tenant billing plans
- AI optimization modules

## Architectural constraints (enforced)

- No page-level persistence logic
- No direct transport/storage provider calls in UI
- Customer and internal route surfaces remain separated
- Shared domain consistency across portal and internal workflows

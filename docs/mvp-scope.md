# MVP Scope

## Goal

Deliver a practical operations platform MVP that helps a cleaning business run daily scheduling, track work completion, monitor basic finances, and keep house-level service history.

## User roles (MVP)

- Owner/Manager: monitors performance, finance, and overall planning.
- Operations Coordinator: manages schedule, clients, teams, and reminders.
- Cleaner/Team Member: executes visits and logs service completion.

## Implemented in MVP

1. Client registration and management data model + UI list.
2. Client details with profile, service notes, visit history, and photo placeholders.
3. Monday-Friday schedule board with teams, ordered visits, and status display.
4. Start/Finish visit execution flow with actual timing and variance.
5. Suburb filtering/grouping support for operational planning.
6. Teams and employee management visibility with baseline productivity metrics.
7. Daily finance summary + monthly aggregate calculations.
8. Product inventory tracking with stock status and low-stock indicators.
9. Visit history page with proof/notes timeline foundation.
10. Reminder architecture placeholders for email reminders.
11. Dashboard with monthly and operational KPIs.

## Scaffolded now, not fully implemented

- Reminder delivery providers (email transport integration)
- invoice generation and dispatch engine
- photo cloud upload/storage integration
- route optimization engine contract
- customer portal service boundary
- payments/rating/review integration boundaries
- recurring automation rules engine boundary

## Explicitly deferred

- Full customer portal
- online booking
- cancellation fees and rescheduling automation
- payment collection
- quality scoring and incentive logic
- AI pricing and predictive profitability
- multi-tenant authentication + organization provisioning flows

## Out-of-scope guardrails

- No hard dependency on external services for core local MVP run.
- No heavy workflow automation before stable manual operations flow.
- No “single giant page” architecture.


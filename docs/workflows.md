# Workflows

## 1. Internal operations workflow

1. Ops manages clients, schedule, teams, and visits.
2. Team executes start/finish work clock.
3. System tracks actual duration, deltas, and proof metadata.
4. Communication pipelines handle reminders, completion messages, and invoice dispatch.

## 2. Customer portal workflow (Phase 5)

1. Customer signs in via `/portal/login`.
2. Portal resolves account-to-client mapping through portal-safe service layer.
3. Customer can view:
   - upcoming services
   - past history and proof references
   - invoice records
   - recurring plan and projected upcoming dates
   - account/service profile summary

## 3. Online booking request workflow

1. Customer submits booking request from portal booking page (or public/internal lead source).
2. Request captures address, service type, date preference, notes, and home details.
3. System computes initial duration/price estimate summary.
4. Request enters booking lifecycle queue:
   - `new -> reviewing -> quoted -> approved` or `rejected/cancelled`
5. Internal ops reviews and updates status from bookings module.

## 4. Recurring scheduling workflow

1. Ops creates recurring rule with pattern and window preferences.
2. System projects upcoming occurrences for planning horizon.
3. Ops can materialize projected occurrence into scheduled visit.
4. Materialized visits flow into normal schedule/dispatch execution.
5. Customer sees recurring plan and projected upcoming services in portal.

## 5. Customer/internal consistency workflow

1. Portal service history is derived from the same visit records used internally.
2. Portal invoices are derived from the same invoice objects used by operations.
3. Portal proof references come from the same visit photo metadata used in operations/completion workflows.
4. Booking requests submitted by customers appear directly in internal booking review queue.
5. Recurring rules maintained internally generate customer-visible projections and internal scheduling inputs.

## 6. Access and boundary workflow

1. Internal login (`/login`) only accepts internal user accounts.
2. Portal login (`/portal/login`) only accepts customer user accounts.
3. Guard layer enforces both role and user type (`internal` vs `customer`).
4. Portal pages consume customer-safe snapshot service rather than raw module data joins in UI.

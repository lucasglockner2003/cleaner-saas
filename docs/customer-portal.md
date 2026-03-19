# Customer Portal Foundation

## Purpose

Provide customer self-service capability without polluting internal operations UX or bypassing data boundaries.

## Route structure

- `/portal/login`
- `/portal`
- `/portal/history`
- `/portal/invoices`
- `/portal/booking`
- `/portal/recurring`
- `/portal/account`

These routes run inside `PortalShell`, separate from internal `AppShell`.

## Access model

- Requires user type `customer` and role `customer`.
- Customer users carry `client_id` and `portal_account_id` claims.
- Guard layer enforces user type and role before rendering portal routes.

## Data access model

- Portal pages consume `customerPortalService.getCustomerPortalSnapshot`.
- Snapshot is scoped to linked client account and includes:
  - profile/account summary
  - upcoming and past visits
  - invoice list
  - payment references linked to invoices
  - active subscription/membership snapshot
  - proof references
  - recurring services and projections
  - booking requests

## Booking workflow integration

- Portal booking form writes to `booking_requests` via booking repository action.
- Internal bookings module reads the same records for review/approval.
- Booking status lifecycle supports operational triage.

## Recurring workflow integration

- Portal recurring view reflects same `recurring_services` model used internally.
- Internal recurring module projects and materializes occurrences into schedule.
- Portal and internal upcoming views remain consistent.

## Future expansion path

- Add provider-backed portal-side payment checkout actions.
- Add customer notifications for booking/recurrence status changes.
- Add secure proof artifact delivery links.

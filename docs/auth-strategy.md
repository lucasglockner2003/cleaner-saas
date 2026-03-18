# Auth and Access Strategy

## Current auth architecture

- `AuthProvider` manages session lifecycle and role/user-type helpers.
- `authRepository` supports local and Supabase adapters.
- `ProtectedRoute` enforces:
  - authenticated session
  - allowed role(s)
  - allowed user type(s): `internal` or `customer`

## Identity model

### Internal users

- Roles:
  - `owner`
  - `ops`
  - `cleaner`
- User type: `internal`
- Login route: `/login`

### Customer portal users

- Role: `customer`
- User type: `customer`
- Linked fields:
  - `client_id`
  - `portal_account_id`
- Login route: `/portal/login`

## Route safety boundaries

- Internal routes explicitly restrict to `allowedUserTypes=["internal"]`.
- Portal routes explicitly restrict to `allowedUserTypes=["customer"]` and customer role.
- Unauthorized users are redirected to appropriate home path (`/` or `/portal`).

## Data boundary strategy

- Portal pages use `customerPortalService` snapshots scoped by linked client identity.
- Booking submission from portal enforces client link (`requireClientLink`).
- Internal pages continue to use full operational services/repositories.

## Supabase readiness

- Supabase user metadata mapping supports:
  - `role`
  - `user_type`
  - `client_id`
  - `portal_account_id`
- This supports future row-level policies for:
  - internal operational access
  - customer self-service access limited to own records

## Next security hardening steps

1. Move local demo users to real identity provider only.
2. Add tenant/org claims to all sessions.
3. Enforce RLS by tenant + user type + linked client.
4. Add action-level authorization checks in repositories.
5. Add audit logs for sensitive status and billing transitions.

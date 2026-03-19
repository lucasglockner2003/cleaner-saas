# FIRST_COMPANY_ONBOARDING

Exact sequence to onboard the first cleaning company.

## 1. Collect onboarding inputs (required)

Collect and lock these values:

1. Company legal/brand name
2. Primary owner full name + email
3. Ops manager full name + email
4. Cleaner accounts needed for day 1
5. Primary operating suburb/region
6. Timezone and business hours
7. Billing currency
8. Stripe account ownership and admin contact

## 2. Create tenant id and environment mapping

1. Generate tenant id format: `org-<company-slug>` (example: `org-firstclean-auckland`).
2. Set this id as `VITE_ORGANIZATION_ID` for the company environment.
3. Ensure staging and production use the same tenant id for this first company.

## 3. Provision required infrastructure

1. Supabase project(s) ready and migrated.
2. Frontend hosting ready.
3. Gateway runtime deployed (`/payments/gateway` contract).
4. Stripe webhook runtime deployed (`/webhooks/stripe`).
5. Worker runtime + scheduler deployed.

## 4. Configure production/staging secrets

Set all required variables from:

- `PRODUCTION_ENV_TEMPLATE.md`
- `DEPLOY_NOW.md`

Run strict checks:

```bash
npm run check:env:staging
npm run check:env:production
```

## 5. Validate onboarding in staging first

1. Run `STAGING_SMOKE_TEST.md` fully.
2. Confirm pass conditions for frontend/webhook/worker/Supabase/Stripe.
3. Do not proceed to production until staging smoke is green.

## 6. Create initial users (internal + portal)

For Supabase auth users, ensure metadata includes:

- internal users:
  - `role`: `owner|ops|cleaner`
  - `user_type`: `internal`
  - `organization_id`: `<org-id>`
- customer portal users:
  - `role`: `customer`
  - `user_type`: `customer`
  - `organization_id`: `<org-id>`
  - `client_id`
  - `portal_account_id`

## 7. Load initial company dataset

1. Login as owner.
2. Open `/pilot-tools`.
3. Import real client CSV (or pilot sample then replace).
4. Generate first operating week schedule.
5. Validate visits, reminders, invoices, and payment visibility.

## 8. Run first live operational rehearsal

1. Start and finish one scheduled visit.
2. Confirm completion communication status updates.
3. Generate/issue invoice.
4. Confirm payment event handling path (or manual payment record).
5. Confirm audit and operation job records exist.

## 9. Operator handoff

Share these docs with company owner/ops:

- `OPERATOR_QUICK_START.md`
- `PILOT_RUNBOOK.md`
- `PILOT_CHECKLIST.md`

## 10. Week-1 monitoring plan

Daily checks:

1. Failed/retry operation jobs
2. Failed/rejected payment events
3. Webhook health endpoint
4. Worker cycle status
5. Critical config or sync degradation banners

Escalate immediately if payment/webhook/job failures trend upward for more than one cycle window.

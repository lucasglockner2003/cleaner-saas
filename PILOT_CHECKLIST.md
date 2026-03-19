# PILOT_CHECKLIST

Execution checklist for real pilot sessions.

## Pre-demo validation

- [ ] App starts cleanly with `npm run dev`.
- [ ] Login works for `owner@cleanerops.local`.
- [ ] Pilot tools page loads without console/runtime errors.
- [ ] Sample CSV file is available: `samples/pilot-clients-sample.csv`.
- [ ] Demo mode helper runs and completes all steps (`ok`).
- [ ] Schedule board contains Monday-Friday dispatch data.
- [ ] Visits page has at least 1 scheduled and 1 completed visit.
- [ ] Monetization page shows invoices and linked payments.
- [ ] Communications page shows job statuses (queued/sent/failed/retry).
- [ ] No blocking config banner in header for intended demo environment.

## During-demo validation

- [ ] Operator can explain and run each pilot step without engineering help.
- [ ] Client import shows clear success/failure feedback.
- [ ] Schedule filters are understandable to dispatcher users.
- [ ] Start/finish visit flow is clear and completes in under 30 seconds.
- [ ] Visit status transitions are visible and coherent.
- [ ] Proof placeholders (before/after) are easy to add and verify.
- [ ] Invoice and payment statuses are easy to read.
- [ ] Failed communication/payment states are visible and explainable.
- [ ] No dead-end empty states on key pages.
- [ ] No major UI lag or blocking spinner confusion.

## Post-demo validation

- [ ] Capture operator feedback by module:
  - [ ] Pilot tools
  - [ ] Schedule
  - [ ] Visits
  - [ ] Monetization
  - [ ] Communications
- [ ] Record all defects with reproducible steps.
- [ ] Record any misleading labels/messages for first-time operators.
- [ ] Confirm whether one operator can run flow solo end-to-end.
- [ ] Mark go/no-go for next pilot session.

## Critical failure triggers (stop and triage)

- [ ] Login failure for pilot operator accounts.
- [ ] Demo mode helper cannot complete after one retry.
- [ ] Visit cannot transition from scheduled -> in_progress -> completed.
- [ ] Invoice generation produces no output with completed visits present.
- [ ] Payment simulation cannot attach to issued invoices.
- [ ] Communication jobs fail without retry visibility.

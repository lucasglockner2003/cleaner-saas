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

## 7. Route optimization workflow (Phase 6)

1. Schedule day visits are read in persisted order.
2. Route engine builds stop coordinates from client records (with suburb fallback estimates when needed).
3. Heuristic optimizer computes recommended visit order (nearest-neighbor v1).
4. System compares:
   - current route distance/time
   - recommended route distance/time
   - potential savings and geocode confidence
5. Dispatch can apply recommended order through repository mutation, which:
   - rewrites visit order indexes
   - recalculates estimated visit windows
   - updates schedule day travel buffer baseline

## 8. Smarter schedule signal workflow

1. Route outputs feed schedule estimation (travel buffer intelligence).
2. Day summary computes:
   - overbook risk
   - lateness risk score
   - recurring influence signal
3. Weekly pass computes team load-balance signals per date:
   - overloaded
   - balanced
   - underutilized
4. Dashboard and schedule board surface signals for proactive dispatch decisions.

## 9. Profitability-by-area workflow

1. Completed visits are grouped by suburb.
2. Cost model combines:
   - baseline operational costs (visit + shared team/day expenses)
   - estimated travel cost from route distance legs
3. Suburb-level outputs compute:
   - revenue
   - total cost
   - profit
   - margin
   - risk signal (`healthy|watch|at_risk`)
4. Finance and dashboard render area profitability for territory and pricing decisions.

## 10. Payment and invoice consistency workflow (Phase 7)

1. Operator records payment against issued invoice.
2. Payment record captures method/provider/status/amount and references invoice + client.
3. On capture:
   - invoice `balance_due` is reduced
   - invoice status moves to `paid` when balance reaches zero
4. On refund:
   - refunded amount is tracked on payment record
   - invoice `balance_due` is increased accordingly
5. Portal invoice view reads the same invoice + payment snapshot used internally.

## 11. Subscription and recurring-revenue workflow

1. Ops defines subscription plans (tier, cycle, price, discount, quota).
2. Ops assigns clients to plans with billing metadata.
3. Subscription states are managed (`active|paused|cancelled|trial|expired`).
4. Monetization service derives MRR/ARR and membership health for dashboard/reporting.
5. Portal account surfaces active plan details and next billing reference.

## 12. CRM lifecycle workflow

1. CRM profiles enrich each client with lifecycle stage, churn risk, source, and VIP signal.
2. Lifecycle rows combine operational history + billing + recurring activity.
3. Ops can update lifecycle/churn/VIP controls from CRM view.
4. Refresh flow recomputes win-back/reactivation signals from behavior patterns.
5. Segmentation outputs feed campaign/readiness decisions.

## 13. Referral and campaign growth workflow

1. Referral records capture referrer, referred contact, status, reward readiness, and source.
2. Referral lifecycle progresses from invite/qualification to conversion/reward.
3. Campaign records track audience segment, channel, status, and conversion metrics.
4. Growth summary aggregates acquisition sources, referral conversions, and campaign performance.
5. Dashboard/CRM expose growth signals without embedding campaign logic in UI components.

## 14. Payment provider and reconciliation workflow (Final phase)

1. Ops prepares provider-backed payment intent (Stripe-first boundary) with idempotency key.
2. System records a pending payment transaction linked to invoice/client.
3. Provider event/webhook payloads are ingested through `applyPaymentProviderEvent`.
4. Event dedupe is enforced using `provider_event_id` in `paymentEvents`.
5. Payment transitions remain retry-safe and update invoice balances consistently.
6. Reconciliation cycle can re-check unresolved provider-backed pending payments.

## 15. Background operations queue workflow

1. Internal actions queue operation jobs (`operationJobs`) by type and priority.
2. Executor cycle picks runnable jobs (`queued|retry_scheduled`).
3. Each job runs mapped handler:
   - reminder dispatch
   - invoice dispatch
   - lifecycle refresh
   - payment reconciliation
4. Job status moves through:
   - `queued -> running -> completed`
   - or `queued/running -> retry_scheduled -> completed|failed`
5. Settings UI exposes queue metrics, retries, and manual cycle execution.

## 16. Audit and reliability workflow

1. Every mutation appends an audit event with action key, actor, severity, and outcome.
2. Persisted audit records support timeline review and incident triage.
3. Sync degradation and session expiry are surfaced in runtime UI signals.
4. Error boundary catches top-level crashes and preserves recovery actions.

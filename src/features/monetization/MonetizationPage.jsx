import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { invoicesService, paymentsService, subscriptionsService } from "../../services";
import { resolveOperationalMonth } from "../../utils/operationsDate";

function paymentTone(status) {
  if (status === "captured") return "success";
  if (status === "pending") return "warning";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "refunded") return "muted";
  return "neutral";
}

function subscriptionTone(status) {
  if (status === "active" || status === "trial") return "success";
  if (status === "paused") return "warning";
  if (status === "cancelled" || status === "expired") return "danger";
  return "neutral";
}

const PLAN_FORM_DEFAULTS = {
  code: "",
  name: "",
  tier: "standard",
  billing_cycle: "monthly",
  currency: "NZD",
  price: 150,
  visit_quota_per_cycle: 1,
  discount_pct: 0,
  description: ""
};

export function MonetizationPage() {
  const { db, actions, mutationState } = useAppData();
  const [month, setMonth] = useState(resolveOperationalMonth(db));
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    amount: "",
    method_type: "bank_transfer",
    provider: "manual",
    status: "captured",
    notes: ""
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  const [planForm, setPlanForm] = useState(PLAN_FORM_DEFAULTS);
  const [planErrors, setPlanErrors] = useState({});
  const [assignmentForm, setAssignmentForm] = useState({
    client_id: "",
    plan_id: "",
    status: "active",
    start_date: new Date().toISOString().slice(0, 10),
    auto_renew: true,
    payment_provider: "manual",
    payment_method_hint: "bank_transfer"
  });
  const [assignmentErrors, setAssignmentErrors] = useState({});

  const paymentSummary = useMemo(() => paymentsService.getPaymentsSummary(db, { month }), [db, month]);
  const providerStatus = useMemo(() => paymentsService.getPaymentProviderStatus(), []);
  const providerLaunchChecks = useMemo(
    () => paymentsService.getPaymentProviderLaunchChecks(paymentForm.provider),
    [paymentForm.provider]
  );
  const invoiceStats = useMemo(() => invoicesService.getInvoiceStats(db), [db]);
  const invoices = useMemo(() => invoicesService.listInvoices(db), [db]);
  const openInvoices = invoices.filter((invoice) => invoice.status === "issued" && invoice.balance_due > 0);
  const paymentRows = useMemo(() => paymentsService.listPayments(db, { month }), [db, month]);
  const plans = useMemo(() => subscriptionsService.listSubscriptionPlans(db), [db]);
  const subscriptions = useMemo(() => subscriptionsService.listClientSubscriptions(db), [db]);
  const subscriptionSummary = useMemo(() => subscriptionsService.getSubscriptionRevenueSummary(db), [db]);
  const reconciliationStats = useMemo(() => paymentsService.getPaymentReconciliationStats(db), [db]);
  const paymentEvents = useMemo(() => paymentsService.listPaymentEvents(db).slice(0, 8), [db]);

  function updatePaymentField(key, value) {
    setPaymentForm((current) => ({
      ...current,
      [key]: value
    }));
    setPaymentErrors((current) => ({
      ...current,
      [key]: undefined
    }));
  }

  function handleSelectInvoice(invoiceId) {
    const invoice = openInvoices.find((row) => row.id === invoiceId);
    setPaymentForm((current) => ({
      ...current,
      invoice_id: invoiceId,
      amount: invoice ? Number(invoice.balance_due).toFixed(2) : ""
    }));
  }

  async function submitPayment(event) {
    event.preventDefault();
    const providerBacked = paymentForm.provider !== "manual";
    const payload = {
      ...paymentForm,
      status: providerBacked ? "pending" : paymentForm.status,
      amount: Number(paymentForm.amount)
    };
    const result = providerBacked
      ? await actions.preparePaymentIntent(payload)
      : actions.createPayment(payload);

    if (!result.ok) {
      setPaymentErrors(result.errors || { root: result.message });
      return;
    }

    setPaymentErrors({});
    setPaymentForm({
      invoice_id: "",
      amount: "",
      method_type: "bank_transfer",
      provider: "manual",
      status: "captured",
      notes: ""
    });
  }

  function submitPlan(event) {
    event.preventDefault();
    const result = actions.createSubscriptionPlan({
      ...planForm,
      price: Number(planForm.price),
      visit_quota_per_cycle: Number(planForm.visit_quota_per_cycle),
      discount_pct: Number(planForm.discount_pct)
    });

    if (!result.ok) {
      setPlanErrors(result.errors || { root: result.message });
      return;
    }

    setPlanErrors({});
    setPlanForm(PLAN_FORM_DEFAULTS);
  }

  function submitAssignment(event) {
    event.preventDefault();
    const result = actions.assignClientSubscription(assignmentForm);
    if (!result.ok) {
      setAssignmentErrors(result.errors || { root: result.message });
      return;
    }

    setAssignmentErrors({});
    setAssignmentForm({
      client_id: "",
      plan_id: "",
      status: "active",
      start_date: new Date().toISOString().slice(0, 10),
      auto_renew: true,
      payment_provider: "manual",
      payment_method_hint: "bank_transfer"
    });
  }

  const paymentColumns = [
    { key: "created_at", label: "Created", render: (row) => row.created_at.slice(0, 10) },
    { key: "invoice_number", label: "Invoice" },
    { key: "client_name", label: "Client" },
    { key: "amount", label: "Amount", render: (row) => `$${row.amount.toFixed(2)}` },
    { key: "method_type", label: "Method" },
    { key: "provider", label: "Provider" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={paymentTone(row.status)} />
    },
    { key: "provider_ref", label: "Provider Ref", render: (row) => row.provider_ref || "-" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          {row.status === "pending" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setPaymentStatus(row.id, "captured")}>
              Capture
            </button>
          ) : null}
          {row.status === "pending" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => actions.setPaymentStatus(row.id, "failed", { failure_reason: "Failed from billing panel" })}
            >
              Fail
            </button>
          ) : null}
          {row.status === "pending" && row.provider !== "manual" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => actions.runPaymentReconciliationCycle({ maxPayments: 1, providers: [row.provider] })}
            >
              Reconcile
            </button>
          ) : null}
          {row.status === "captured" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const input = window.prompt("Refund amount", String(row.amount - (row.refunded_amount || 0)));
                const parsed = Number(input);
                if (!input || Number.isNaN(parsed) || parsed <= 0) {
                  return;
                }

                actions.setPaymentStatus(row.id, "refunded", {
                  refund_amount: parsed,
                  notes: "Refund from billing panel"
                });
              }}
            >
              Refund
            </button>
          ) : null}
        </div>
      )
    }
  ];

  const planColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Plan" },
    { key: "tier", label: "Tier" },
    { key: "billing_cycle", label: "Cycle" },
    { key: "price", label: "Price", render: (row) => `$${row.price.toFixed(2)}` },
    { key: "discount_pct", label: "Discount", render: (row) => `${row.discount_pct}%` },
    { key: "visit_quota_per_cycle", label: "Visits/Cycle" },
    {
      key: "active",
      label: "State",
      render: (row) => <Badge value={row.active ? "active" : "inactive"} tone={row.active ? "success" : "warning"} />
    }
  ];

  const subscriptionColumns = [
    { key: "client_name", label: "Client" },
    { key: "plan_name", label: "Plan" },
    { key: "billing_cycle", label: "Cycle" },
    { key: "plan_price", label: "Price", render: (row) => `$${row.plan_price.toFixed(2)}` },
    { key: "next_billing_date", label: "Next Billing" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={subscriptionTone(row.status)} />
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          {row.status === "active" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setClientSubscriptionStatus(row.id, "paused")}>
              Pause
            </button>
          ) : null}
          {row.status === "paused" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setClientSubscriptionStatus(row.id, "active")}>
              Resume
            </button>
          ) : null}
          {row.status !== "cancelled" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const confirmed = window.confirm("Cancel this subscription?");
                if (!confirmed) {
                  return;
                }

                actions.setClientSubscriptionStatus(row.id, "cancelled");
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Reporting month
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </section>

      <section className="stat-grid">
        <StatCard label="Billed" value={`$${paymentSummary.billedAmount.toFixed(2)}`} hint={`${month} invoices`} />
        <StatCard label="Collected" value={`$${paymentSummary.capturedAmount.toFixed(2)}`} hint={`Collection ${paymentSummary.collectionRate}%`} />
        <StatCard label="Outstanding" value={`$${paymentSummary.balanceDue.toFixed(2)}`} hint={`${invoiceStats.issued} issued invoices`} />
        <StatCard label="MRR" value={`$${subscriptionSummary.mrr.toFixed(2)}`} hint={`${subscriptionSummary.activeSubscriptions} active memberships`} />
      </section>

      <section className="split-grid">
        <Card title="Record payment" subtitle="Capture manual/provider-linked payments against invoice balances">
          <form className="form-grid" onSubmit={submitPayment}>
            <label className="span-2">
              Invoice
              <select value={paymentForm.invoice_id} onChange={(event) => handleSelectInvoice(event.target.value)}>
                <option value="">Select open invoice</option>
                {openInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number || invoice.id} - {invoice.client_name} (${invoice.balance_due.toFixed(2)})
                  </option>
                ))}
              </select>
              {paymentErrors.invoice_id ? <span className="field-error">{paymentErrors.invoice_id}</span> : null}
            </label>

            <label>
              Amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) => updatePaymentField("amount", event.target.value)}
              />
              {paymentErrors.amount ? <span className="field-error">{paymentErrors.amount}</span> : null}
            </label>

            <label>
              Status
              <select
                value={paymentForm.status}
                onChange={(event) => updatePaymentField("status", event.target.value)}
                disabled={paymentForm.provider !== "manual"}
              >
                <option value="captured">Captured</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              {paymentErrors.status ? <span className="field-error">{paymentErrors.status}</span> : null}
            </label>

            <label>
              Method
              <select value={paymentForm.method_type} onChange={(event) => updatePaymentField("method_type", event.target.value)}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="portal_link">Portal link</option>
                <option value="direct_debit">Direct debit</option>
              </select>
            </label>

            <label>
              Provider
              <select value={paymentForm.provider} onChange={(event) => updatePaymentField("provider", event.target.value)}>
                <option value="manual">Manual</option>
                <option value="stripe">Stripe (adapter-ready)</option>
                <option value="paypal">PayPal (adapter-ready)</option>
                <option value="subscription_billing">Subscription billing</option>
              </select>
            </label>

            <label className="span-2">
              Notes
              <input value={paymentForm.notes} onChange={(event) => updatePaymentField("notes", event.target.value)} />
            </label>

            {paymentErrors.root ? <p className="field-error span-2">{paymentErrors.root}</p> : null}

            <div className="form-actions span-2">
              <button type="submit" className="btn" disabled={mutationState.createPayment}>
                {mutationState.createPayment || mutationState.preparePaymentIntent
                  ? "Saving..."
                  : paymentForm.provider === "manual"
                    ? "Save payment"
                    : "Prepare provider intent"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Payments and invoice collection">
          <div className="detail-list">
            <p>
              <span>Pending payment amount</span>
              <strong>${paymentSummary.pendingAmount.toFixed(2)}</strong>
            </p>
            <p>
              <span>Refunded amount</span>
              <strong>${paymentSummary.refundedAmount.toFixed(2)}</strong>
            </p>
            <p>
              <span>Failed payments</span>
              <strong>{paymentSummary.failedCount}</strong>
            </p>
            <p>
              <span>Open invoice count</span>
              <strong>{openInvoices.length}</strong>
            </p>
            <p>
              <span>Pending provider reconciliation</span>
              <strong>{reconciliationStats.pendingProviderPayments}</strong>
            </p>
            <p>
              <span>Rejected provider events</span>
              <strong>{reconciliationStats.rejectedEvents}</strong>
            </p>
          </div>
          <hr className="divider" />
          <h4>Provider readiness</h4>
          <ul className="simple-list">
            {providerStatus.map((provider) => (
              <li key={provider.provider}>
                <strong>{provider.provider}</strong> - {provider.ready ? "ready" : "adapter-only"}
                {provider.configuredAsDefault ? " (default)" : ""}
              </li>
            ))}
          </ul>
          {providerLaunchChecks.checks.length ? (
            <>
              <hr className="divider" />
              <h4>Selected provider launch checks</h4>
              <ul className="simple-list">
                {providerLaunchChecks.checks.map((check) => (
                  <li key={check.key}>
                    <strong>{check.ok ? "ok" : "missing"}</strong> - {check.message}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>
      </section>

      <Card title="Payment records">
        <DataTable
          columns={paymentColumns}
          rows={paymentRows}
          empty={<EmptyState title="No payments" message="Record first payment to start collection tracking." />}
        />
      </Card>

      <section className="split-grid">
        <Card title="Provider reconciliation">
          <div className="detail-list">
            <p>
              <span>Processed provider events</span>
              <strong>{reconciliationStats.processedEvents}</strong>
            </p>
            <p>
              <span>Unmatched provider events</span>
              <strong>{reconciliationStats.unmatchedEvents}</strong>
            </p>
            <p>
              <span>Provider payment failures</span>
              <strong>{reconciliationStats.providerFailures}</strong>
            </p>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => actions.runPaymentReconciliationCycle({ maxPayments: 20 })}
              disabled={mutationState.runPaymentReconciliationCycle}
            >
              {mutationState.runPaymentReconciliationCycle ? "Reconciling..." : "Run reconciliation cycle"}
            </button>
          </div>
        </Card>

        <Card title="Latest provider events">
          {paymentEvents.length ? (
            <div className="stack-list">
              {paymentEvents.map((event) => (
                <article key={event.id} className="row-item">
                  <div>
                    <strong>{event.event_type}</strong>
                    <p className="muted">
                      {event.provider} | {event.processing_status}
                    </p>
                    <p className="muted">{event.processing_message || "-"}</p>
                  </div>
                  <Badge value={event.provider_event_id} tone="neutral" />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No provider events" message="Webhook and reconciliation events will appear here." />
          )}
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Create subscription plan" subtitle="Recurring revenue catalog for customer memberships">
          <form className="form-grid" onSubmit={submitPlan}>
            <label>
              Plan code
              <input value={planForm.code} onChange={(event) => setPlanForm((current) => ({ ...current, code: event.target.value }))} />
              {planErrors.code ? <span className="field-error">{planErrors.code}</span> : null}
            </label>
            <label>
              Name
              <input value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} />
              {planErrors.name ? <span className="field-error">{planErrors.name}</span> : null}
            </label>
            <label>
              Tier
              <select value={planForm.tier} onChange={(event) => setPlanForm((current) => ({ ...current, tier: event.target.value }))}>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </label>
            <label>
              Billing cycle
              <select
                value={planForm.billing_cycle}
                onChange={(event) => setPlanForm((current) => ({ ...current, billing_cycle: event.target.value }))}
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>
              Price
              <input
                type="number"
                min={0}
                step="0.01"
                value={planForm.price}
                onChange={(event) => setPlanForm((current) => ({ ...current, price: event.target.value }))}
              />
            </label>
            <label>
              Visit quota
              <input
                type="number"
                min={1}
                value={planForm.visit_quota_per_cycle}
                onChange={(event) => setPlanForm((current) => ({ ...current, visit_quota_per_cycle: event.target.value }))}
              />
            </label>
            <label>
              Discount %
              <input
                type="number"
                min={0}
                value={planForm.discount_pct}
                onChange={(event) => setPlanForm((current) => ({ ...current, discount_pct: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Description
              <input
                value={planForm.description}
                onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            {planErrors.root ? <p className="field-error span-2">{planErrors.root}</p> : null}
            <div className="form-actions span-2">
              <button type="submit" className="btn" disabled={mutationState.createSubscriptionPlan}>
                {mutationState.createSubscriptionPlan ? "Saving..." : "Create plan"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Assign plan to client">
          <form className="form-grid" onSubmit={submitAssignment}>
            <label className="span-2">
              Client
              <select
                value={assignmentForm.client_id}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, client_id: event.target.value }))}
              >
                <option value="">Select client</option>
                {db.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
              {assignmentErrors.client_id ? <span className="field-error">{assignmentErrors.client_id}</span> : null}
            </label>
            <label className="span-2">
              Plan
              <select
                value={assignmentForm.plan_id}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, plan_id: event.target.value }))}
              >
                <option value="">Select plan</option>
                {plans.filter((plan) => plan.active).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (${plan.price.toFixed(2)} / {plan.billing_cycle})
                  </option>
                ))}
              </select>
              {assignmentErrors.plan_id ? <span className="field-error">{assignmentErrors.plan_id}</span> : null}
            </label>
            <label>
              Start date
              <input
                type="date"
                value={assignmentForm.start_date}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, start_date: event.target.value }))}
              />
            </label>
            <label>
              Status
              <select
                value={assignmentForm.status}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label>
              Payment provider
              <select
                value={assignmentForm.payment_provider}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, payment_provider: event.target.value }))}
              >
                <option value="manual">Manual</option>
                <option value="stripe">Stripe (adapter-ready)</option>
                <option value="paypal">PayPal (adapter-ready)</option>
                <option value="subscription_billing">Subscription billing</option>
              </select>
            </label>
            <label>
              Method hint
              <select
                value={assignmentForm.payment_method_hint}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, payment_method_hint: event.target.value }))}
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="direct_debit">Direct debit</option>
              </select>
            </label>
            <div className="form-actions span-2">
              <button type="submit" className="btn" disabled={mutationState.assignClientSubscription}>
                {mutationState.assignClientSubscription ? "Assigning..." : "Assign membership"}
              </button>
            </div>
          </form>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Subscription plans">
          <DataTable
            columns={planColumns}
            rows={plans}
            empty={<EmptyState title="No plans" message="Create your first plan to enable recurring billing." />}
          />
        </Card>

        <Card title="Client memberships">
          <DataTable
            columns={subscriptionColumns}
            rows={subscriptions}
            empty={<EmptyState title="No memberships" message="Assign clients to active plans." />}
          />
        </Card>
      </section>
    </div>
  );
}

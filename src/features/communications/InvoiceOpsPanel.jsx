import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { communicationStatusTone } from "./statusTone";

function renderInvoiceActions(row, actions) {
  return (
    <div className="inline-actions">
      {row.status === "draft" ? (
        <button type="button" className="btn" onClick={() => actions.onIssue(row.id)}>
          Issue
        </button>
      ) : null}
      {row.status === "issued" ? (
        <button type="button" className="btn btn-ghost" onClick={() => actions.onQueueEmail(row.id)}>
          Queue email
        </button>
      ) : null}
      {row.status === "issued" ? (
        <button type="button" className="btn btn-ghost" onClick={() => actions.onMarkPaid(row.id)}>
          Mark paid
        </button>
      ) : null}
      {row.status === "failed" ? (
        <button type="button" className="btn btn-ghost" onClick={() => actions.onIssue(row.id)}>
          Re-issue
        </button>
      ) : null}
      {row.status !== "failed" && row.status !== "paid" ? (
        <button type="button" className="btn btn-ghost" onClick={() => actions.onMarkFailed(row.id)}>
          Flag failed
        </button>
      ) : null}
    </div>
  );
}

export function InvoiceOpsPanel({
  invoices,
  invoiceStats,
  invoiceCommunicationStats,
  billingMonth,
  onBillingMonthChange,
  onGenerateDrafts,
  onRunDispatchCycle,
  onIssueInvoice,
  onMarkInvoicePaid,
  onMarkInvoiceFailed,
  onQueueInvoiceEmail
}) {
  const columns = [
    { key: "invoice_number", label: "Invoice", render: (row) => row.invoice_number || row.id },
    { key: "client_name", label: "Client" },
    { key: "period_start", label: "Period", render: (row) => `${row.period_start} to ${row.period_end}` },
    {
      key: "status",
      label: "Invoice Status",
      render: (row) => <Badge value={row.status} tone={communicationStatusTone(row.status)} />
    },
    {
      key: "communication_status",
      label: "Communication",
      render: (row) => <Badge value={row.communication_status} tone={communicationStatusTone(row.communication_status)} />
    },
    {
      key: "balance_due",
      label: "Balance Due",
      render: (row) => `$${Number(row.balance_due ?? row.total ?? 0).toFixed(2)}`
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        renderInvoiceActions(row, {
          onIssue: onIssueInvoice,
          onMarkPaid: onMarkInvoicePaid,
          onMarkFailed: onMarkInvoiceFailed,
          onQueueEmail: onQueueInvoiceEmail
        })
    }
  ];

  return (
    <Card title="Invoice workflow" subtitle="Draft generation, issuing, payment tracking, and email dispatch">
      <section className="toolbar">
        <label>
          Billing month
          <input type="month" value={billingMonth} onChange={(event) => onBillingMonthChange(event.target.value)} />
        </label>
        <button type="button" className="btn" onClick={onGenerateDrafts}>
          Generate drafts
        </button>
        <button type="button" className="btn btn-ghost" onClick={onRunDispatchCycle}>
          Run invoice dispatch
        </button>
      </section>

      <div className="metric-list compact">
        <div>
          <strong>{invoiceStats.total}</strong>
          <span>Total invoices</span>
        </div>
        <div>
          <strong>{invoiceStats.draft}</strong>
          <span>Draft</span>
        </div>
        <div>
          <strong>{invoiceStats.issued}</strong>
          <span>Issued</span>
        </div>
        <div>
          <strong>{invoiceStats.paid}</strong>
          <span>Paid</span>
        </div>
      </div>

      <div className="detail-list">
        <p>
          <span>Communication queued</span>
          <strong>{invoiceCommunicationStats.queued}</strong>
        </p>
        <p>
          <span>Communication retries</span>
          <strong>{invoiceCommunicationStats.retry_scheduled}</strong>
        </p>
        <p>
          <span>Communication failed</span>
          <strong>{invoiceCommunicationStats.failed}</strong>
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={invoices}
        empty={
          <EmptyState
            title="No invoices available"
            message="Generate monthly drafts from completed visits to begin billing workflow."
          />
        }
      />
    </Card>
  );
}

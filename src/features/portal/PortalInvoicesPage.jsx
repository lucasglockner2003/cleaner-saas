import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { usePortalSnapshot } from "./usePortalSnapshot";

function invoiceTone(status) {
  if (status === "paid") return "success";
  if (status === "captured") return "success";
  if (status === "issued") return "warning";
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  if (status === "cancelled") return "danger";
  if (status === "refunded") return "muted";
  return "neutral";
}

export function PortalInvoicesPage() {
  const snapshot = usePortalSnapshot();
  if (!snapshot) {
    return (
      <Card title="Portal account not available">
        <p className="muted">Your portal account could not be linked to invoice data.</p>
      </Card>
    );
  }

  const invoices = snapshot.invoices;
  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.total += invoice.total ?? 0;
      acc.balanceDue += invoice.balance_due ?? 0;
      acc.captured += invoice.captured_amount ?? 0;
      acc.pending += invoice.pending_payment_amount ?? 0;
      return acc;
    },
    {
      total: 0,
      balanceDue: 0,
      captured: 0,
      pending: 0
    }
  );

  const columns = [
    { key: "invoice_number", label: "Invoice" },
    { key: "period", label: "Period", render: (row) => `${row.period_start} to ${row.period_end}` },
    { key: "due_date", label: "Due Date", render: (row) => row.due_date || "-" },
    { key: "total", label: "Total", render: (row) => `$${row.total.toFixed(2)}` },
    { key: "captured_amount", label: "Paid", render: (row) => `$${row.captured_amount.toFixed(2)}` },
    { key: "balance_due", label: "Balance Due", render: (row) => `$${row.balance_due.toFixed(2)}` },
    {
      key: "status",
      label: "Invoice Status",
      render: (row) => <Badge value={row.status} tone={invoiceTone(row.status)} />
    },
    {
      key: "communication_status",
      label: "Delivery",
      render: (row) => <Badge value={row.communication_status} tone={row.communication_status === "sent" ? "success" : "warning"} />
    },
    {
      key: "latest_payment_status",
      label: "Latest Payment",
      render: (row) => <Badge value={row.latest_payment_status || "none"} tone={invoiceTone(row.latest_payment_status)} />
    },
    {
      key: "latest_payment_ref",
      label: "Payment Ref",
      render: (row) => row.latest_payment_ref || "-"
    }
  ];

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Total Invoices" value={invoices.length} hint="Billing records" />
        <StatCard
          label="Open Invoices"
          value={invoices.filter((item) => item.status === "issued" && item.balance_due > 0).length}
          hint="Awaiting payment"
        />
        <StatCard label="Total Billed" value={`$${totals.total.toFixed(2)}`} hint="Lifetime records" />
        <StatCard label="Outstanding Balance" value={`$${totals.balanceDue.toFixed(2)}`} hint="Current due" />
        <StatCard label="Total Paid" value={`$${totals.captured.toFixed(2)}`} hint="Captured payments" />
        <StatCard label="Pending Payments" value={`$${totals.pending.toFixed(2)}`} hint="Awaiting capture" />
      </section>

      <Card title="Invoice history">
        <DataTable
          columns={columns}
          rows={invoices}
          empty={<EmptyState title="No invoices available" message="Invoices appear here after services are billed." />}
        />
      </Card>
    </div>
  );
}

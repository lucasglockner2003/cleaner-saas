import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { communicationStatusTone } from "./statusTone";

export function CompletionOpsPanel({
  completionRows,
  completionStats,
  onQueueCompletionEmail,
  onDispatchCycle,
  onRetryJob
}) {
  const columns = [
    { key: "date", label: "Visit Date" },
    { key: "client_name", label: "Client" },
    {
      key: "invoice_number",
      label: "Invoice Ref",
      render: (row) => row.invoice_number || row.invoice_id || "Pending"
    },
    {
      key: "proof_ready",
      label: "Proof",
      render: (row) =>
        row.proof_ready ? (
          <Badge value={`${row.before_count}/${row.after_count}`} tone="success" />
        ) : (
          <Badge value={`${row.before_count}/${row.after_count}`} tone="warning" />
        )
    },
    {
      key: "status",
      label: "Completion Email",
      render: (row) => <Badge value={row.status} tone={communicationStatusTone(row.status)} />
    },
    {
      key: "error_message",
      label: "Error",
      render: (row) => row.error_message || "-"
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          {row.status === "not_queued" ? (
            <button type="button" className="btn" onClick={() => onQueueCompletionEmail(row.visit_id)}>
              Queue
            </button>
          ) : null}
          {row.status === "failed" && row.latest_job_id ? (
            <button type="button" className="btn btn-ghost" onClick={() => onRetryJob(row.latest_job_id)}>
              Retry
            </button>
          ) : null}
          {(row.status === "retry_scheduled" || row.status === "queued") && row.latest_job_id ? (
            <button type="button" className="btn btn-ghost" onClick={() => onRetryJob(row.latest_job_id)}>
              Retry now
            </button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <Card title="Service completion communication" subtitle="Completion emails, proof readiness, and retry handling">
      <section className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onDispatchCycle}>
          Run completion dispatch
        </button>
      </section>

      <div className="metric-list compact">
        <div>
          <strong>{completionStats.total}</strong>
          <span>Completed visits</span>
        </div>
        <div>
          <strong>{completionStats.sent}</strong>
          <span>Sent</span>
        </div>
        <div>
          <strong>{completionStats.failed}</strong>
          <span>Failed</span>
        </div>
        <div>
          <strong>{completionStats.proof_missing}</strong>
          <span>Proof missing</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={completionRows}
        empty={
          <EmptyState
            title="No completed visits found"
            message="Complete services to unlock completion communication flow."
          />
        }
      />
    </Card>
  );
}

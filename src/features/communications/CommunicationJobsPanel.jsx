import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { formatDateTime } from "../../utils/dateTime";
import { communicationStatusTone, humanizeJobType } from "./statusTone";

function renderRetryAction(row, actions) {
  if (row.status !== "failed" && row.status !== "retry_scheduled" && row.status !== "queued") {
    return "-";
  }

  if (row.job_type === "reminder_email" && row.reminder_id) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => actions.onRetryReminder(row.reminder_id)}>
        Retry
      </button>
    );
  }

  if (row.job_type === "invoice_email") {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => actions.onRetryInvoice(row.id)}>
        Retry
      </button>
    );
  }

  if (row.job_type === "service_completion_email") {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => actions.onRetryCompletion(row.id)}>
        Retry
      </button>
    );
  }

  return "-";
}

function renderTypeSummary(title, stats) {
  return (
    <div>
      <strong>{title}</strong>
      <p className="muted">
        queued {stats.queued} | sent {stats.sent} | retries {stats.retry_scheduled} | failed {stats.failed}
      </p>
    </div>
  );
}

export function CommunicationJobsPanel({
  jobs,
  jobStats,
  onRetryReminder,
  onRetryInvoice,
  onRetryCompletion
}) {
  const columns = [
    {
      key: "job_type",
      label: "Type",
      render: (row) => humanizeJobType(row.job_type)
    },
    { key: "client_name", label: "Client" },
    { key: "recipient", label: "Recipient" },
    { key: "subject", label: "Subject" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={communicationStatusTone(row.status)} />
    },
    {
      key: "attempt_count",
      label: "Attempts",
      render: (row) => `${row.attempt_count}/${row.max_attempts}`
    },
    {
      key: "next_attempt_at",
      label: "Next Attempt",
      render: (row) => formatDateTime(row.next_attempt_at)
    },
    {
      key: "error_message",
      label: "Last error",
      render: (row) => row.error_message || "-"
    },
    {
      key: "action",
      label: "Retry",
      render: (row) =>
        renderRetryAction(row, {
          onRetryReminder,
          onRetryInvoice,
          onRetryCompletion
        })
    }
  ];

  return (
    <Card title="Communication job monitor" subtitle="Unified queue for reminders, invoices, and completion emails">
      {jobStats.overall.failed > 0 ? (
        <p className="field-error">Failed jobs detected. Retry items after checking payloads and provider connectivity.</p>
      ) : (
        <p className="muted">Queue is stable. Monitor retry counts to catch intermittent provider issues early.</p>
      )}

      <div className="cards-grid">
        <article className="row-item">
          {renderTypeSummary("Overall", jobStats.overall)}
          <Badge value={jobStats.overall.failed} tone={jobStats.overall.failed > 0 ? "danger" : "success"} />
        </article>
        <article className="row-item">
          {renderTypeSummary("Reminders", jobStats.byType.reminder_email)}
          <Badge value={jobStats.byType.reminder_email.failed} tone={jobStats.byType.reminder_email.failed > 0 ? "danger" : "success"} />
        </article>
        <article className="row-item">
          {renderTypeSummary("Invoices", jobStats.byType.invoice_email)}
          <Badge value={jobStats.byType.invoice_email.failed} tone={jobStats.byType.invoice_email.failed > 0 ? "danger" : "success"} />
        </article>
        <article className="row-item">
          {renderTypeSummary("Completion", jobStats.byType.service_completion_email)}
          <Badge
            value={jobStats.byType.service_completion_email.failed}
            tone={jobStats.byType.service_completion_email.failed > 0 ? "danger" : "success"}
          />
        </article>
      </div>

      <DataTable
        columns={columns}
        rows={jobs}
        windowSize={25}
        empty={
          <EmptyState title="No communication jobs" message="Queue reminders, invoices, or completion emails to create jobs." />
        }
      />
    </Card>
  );
}

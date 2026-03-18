import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { communicationStatusTone } from "./statusTone";

export function ReminderOpsPanel({
  reminders,
  reminderStats,
  targetDate,
  onTargetDateChange,
  onPrepareQueue,
  onDispatchCycle,
  onRetryReminder
}) {
  const columns = [
    { key: "visit_date", label: "Visit Date" },
    { key: "client_name", label: "Client" },
    { key: "estimated_start", label: "ETA" },
    {
      key: "status",
      label: "Reminder Status",
      render: (row) => <Badge value={row.status} tone={communicationStatusTone(row.status)} />
    },
    {
      key: "attempt_count",
      label: "Attempts",
      render: (row) => `${row.attempt_count}/${row.max_attempts}`
    },
    {
      key: "latest_job_status",
      label: "Job",
      render: (row) =>
        row.latest_job_status ? (
          <Badge value={row.latest_job_status} tone={communicationStatusTone(row.latest_job_status)} />
        ) : (
          "-"
        )
    },
    {
      key: "error_message",
      label: "Error",
      render: (row) => row.error_message || "-"
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        row.status === "failed" || row.status === "retry_scheduled" ? (
          <button type="button" className="btn btn-ghost" onClick={() => onRetryReminder(row.id)}>
            Retry
          </button>
        ) : (
          "-"
        )
    }
  ];

  return (
    <Card title="Reminder workflow" subtitle="Queue preparation, dispatch, retries, and status visibility">
      <section className="toolbar">
        <label>
          Reminder date
          <input type="date" value={targetDate} onChange={(event) => onTargetDateChange(event.target.value)} />
        </label>
        <button type="button" className="btn" onClick={onPrepareQueue}>
          Prepare queue
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDispatchCycle}>
          Run dispatch cycle
        </button>
      </section>

      <div className="metric-list compact">
        <div>
          <strong>{reminderStats.total}</strong>
          <span>Total reminders</span>
        </div>
        <div>
          <strong>{reminderStats.queued}</strong>
          <span>Queued</span>
        </div>
        <div>
          <strong>{reminderStats.retry_scheduled}</strong>
          <span>Retry scheduled</span>
        </div>
        <div>
          <strong>{reminderStats.failed}</strong>
          <span>Failed</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={reminders}
        empty={
          <EmptyState
            title="No reminders queued"
            message="Prepare a queue for a schedule date to create reminder jobs."
          />
        }
      />
    </Card>
  );
}

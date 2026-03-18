import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { usePortalSnapshot } from "./usePortalSnapshot";
import { formatDateTime } from "../../utils/dateTime";

function tone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export function PortalHistoryPage() {
  const snapshot = usePortalSnapshot();
  if (!snapshot) {
    return (
      <Card title="Portal account not available">
        <p className="muted">Your portal account could not be linked to service history.</p>
      </Card>
    );
  }

  const rows = snapshot.pastVisits;
  const columns = [
    { key: "date", label: "Date" },
    { key: "service_type_name", label: "Service" },
    { key: "team_name", label: "Team" },
    {
      key: "actual_duration_min",
      label: "Actual Duration",
      render: (row) => (row.actual_duration_min ? `${row.actual_duration_min} min` : "-")
    },
    {
      key: "proof",
      label: "Proof",
      render: (row) => `${row.proof.before.length}/${row.proof.after.length}`
    },
    {
      key: "invoice",
      label: "Invoice Ref",
      render: (row) => row.invoice_number || row.invoice_id || "-"
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={tone(row.status)} />
    }
  ];

  return (
    <div className="page-grid">
      <Card title="Service history" subtitle="Past completed and cancelled services with proof and invoice references">
        <DataTable
          columns={columns}
          rows={rows}
          empty={<EmptyState title="No history records" message="Your completed services will appear here." />}
        />
      </Card>

      <Card title="Latest service notes and proof timeline">
        {rows.length ? (
          <div className="stack-list">
            {rows.slice(0, 8).map((row) => (
              <article key={row.id} className="timeline-item">
                <div>
                  <strong>
                    {row.date} - {row.service_type_name}
                  </strong>
                  <p className="muted">
                    Start: {formatDateTime(row.actual_start)} | Finish: {formatDateTime(row.actual_finish)}
                  </p>
                  <p>{row.notes || "No notes recorded."}</p>
                  <p className="muted">
                    Before proof: {row.proof.before.length} | After proof: {row.proof.after.length}
                  </p>
                </div>
                <Badge value={row.status} tone={tone(row.status)} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No timeline yet" message="Timeline entries appear after your first completed service." />
        )}
      </Card>
    </div>
  );
}

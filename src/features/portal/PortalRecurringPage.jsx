import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { usePortalSnapshot } from "./usePortalSnapshot";

function statusTone(status) {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  return "muted";
}

export function PortalRecurringPage() {
  const snapshot = usePortalSnapshot();
  if (!snapshot) {
    return (
      <Card title="Portal account not available">
        <p className="muted">Your portal account could not be linked to recurring service data.</p>
      </Card>
    );
  }

  const recurringColumns = [
    { key: "service_type_name", label: "Service" },
    { key: "frequency", label: "Frequency" },
    { key: "window", label: "Preferred Window", render: (row) => `${row.window_start} - ${row.window_end}` },
    { key: "next_service_date", label: "Next Date" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={statusTone(row.status)} />
    }
  ];

  const projectionColumns = [
    { key: "date", label: "Projected Date" },
    { key: "service_type_name", label: "Service" },
    { key: "window", label: "Window", render: (row) => `${row.window_start} - ${row.window_end}` },
    { key: "team", label: "Preferred Team", render: (row) => row.preferred_team_name },
    {
      key: "status",
      label: "Planning Status",
      render: (row) => <Badge value={row.status} tone={row.status === "already_scheduled" ? "success" : "neutral"} />
    }
  ];

  return (
    <div className="page-grid">
      <Card title="Your recurring service plans">
        <DataTable
          columns={recurringColumns}
          rows={snapshot.recurringServices}
          empty={<EmptyState title="No recurring services" message="No recurring plans are currently configured." />}
        />
      </Card>

      <Card title="Upcoming recurring projection (next 90 days)">
        <DataTable
          columns={projectionColumns}
          rows={snapshot.recurringProjections}
          empty={<EmptyState title="No upcoming projection" message="Future recurring services will appear here." />}
        />
      </Card>
    </div>
  );
}

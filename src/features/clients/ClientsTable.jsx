import { Link } from "react-router-dom";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { formatDate } from "../../utils/dateTime";

function statusTone(status) {
  if (status === "active") return "success";
  if (status === "inactive") return "muted";
  return "neutral";
}

export function ClientsTable({ clients }) {
  const columns = [
    {
      key: "full_name",
      label: "Client",
      render: (row) => <Link to={`/clients/${row.id}`}>{row.full_name}</Link>
    },
    { key: "suburb", label: "Suburb" },
    { key: "acquisition_source", label: "Source", render: (row) => row.acquisition_source || "-" },
    { key: "service_type_name", label: "Service" },
    { key: "cleaning_frequency", label: "Frequency" },
    {
      key: "estimated_duration_min",
      label: "Est. Duration",
      render: (row) => `${row.estimated_duration_min} min`
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={statusTone(row.status)} />
    },
    {
      key: "last_cleaning_at",
      label: "Last Cleaning",
      render: (row) => formatDate(row.last_cleaning_at)
    },
    {
      key: "instructions",
      label: "Instructions",
      render: (row) => (row.special_instructions ? "Yes" : "No")
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={clients}
      empty={<EmptyState title="No clients found" message="Try adjusting suburb, status, or search filters." />}
    />
  );
}

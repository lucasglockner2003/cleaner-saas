import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";

function proofTone(row) {
  if (!row.needs_proof) {
    return "neutral";
  }

  return row.proof_ready ? "success" : "warning";
}

export function ProofOpsPanel({ proofRows, proofStats }) {
  const columns = [
    { key: "date", label: "Visit Date" },
    { key: "client_name", label: "Client" },
    { key: "team_name", label: "Team" },
    {
      key: "needs_proof",
      label: "Proof Required",
      render: (row) => (row.needs_proof ? "Yes" : "No")
    },
    {
      key: "coverage",
      label: "Before/After",
      render: (row) => `${row.before_count}/${row.after_count}`
    },
    {
      key: "proof_ready",
      label: "Status",
      render: (row) => <Badge value={row.proof_ready ? "ready" : "missing"} tone={proofTone(row)} />
    }
  ];

  return (
    <Card title="Proof-of-service readiness" subtitle="Before/after coverage and upload metadata completeness">
      <div className="metric-list compact">
        <div>
          <strong>{proofStats.totalCompletedVisits}</strong>
          <span>Completed visits</span>
        </div>
        <div>
          <strong>{proofStats.proofRequiredVisits}</strong>
          <span>Proof required</span>
        </div>
        <div>
          <strong>{proofStats.proofReadyRequiredVisits}</strong>
          <span>Proof ready</span>
        </div>
        <div>
          <strong>{proofStats.proofMissingRequiredVisits}</strong>
          <span>Missing proof</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={proofRows}
        empty={<EmptyState title="No proof rows" message="Completed visits will appear here for proof checks." />}
      />
    </Card>
  );
}

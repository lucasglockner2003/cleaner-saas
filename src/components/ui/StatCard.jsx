import { Card } from "./Card";

export function StatCard({ label, value, hint }) {
  return (
    <Card className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </Card>
  );
}


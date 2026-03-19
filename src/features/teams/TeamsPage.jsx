import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAppData } from "../../hooks/useAppData";
import { teamsService } from "../../services";
import { resolveOperationalDate } from "../../utils/operationsDate";

function overrunTone(rate) {
  if (rate <= 0.2) return "success";
  if (rate <= 0.4) return "warning";
  return "danger";
}

export function TeamsPage() {
  const { db } = useAppData();
  const teams = teamsService.listTeamsWithWorkload(db);
  const operatingDate = resolveOperationalDate(db);

  const totalMembers = teams.reduce((total, team) => total + team.members.length, 0);
  const totalAssignedVisits = teams.reduce((total, team) => total + team.stats.assignedVisits, 0);
  const totalWorkloadHours = teams.reduce((total, team) => total + team.stats.workloadHours, 0);
  const totalRevenue = teams.reduce((total, team) => total + team.stats.totalRevenue, 0);
  const totalRouteKm = teams.reduce((total, team) => total + (team.stats.routeDistanceKm ?? 0), 0);

  const performanceRows = teams.map((team) => ({
    id: team.id,
    name: team.name,
    region: team.region,
    members: team.members.length,
    assigned: team.stats.assignedVisits,
    completed: team.stats.completedVisits,
    in_progress: team.stats.inProgressVisits,
    workload: team.stats.workloadHours,
    revenue: team.stats.totalRevenue,
    overrun_rate: team.stats.overrunRate,
    route_km: team.stats.routeDistanceKm ?? 0,
    route_travel_min: team.stats.routeTravelMin ?? 0,
    route_save_min: team.stats.routeTravelMinSaved ?? 0,
    geocode_coverage: team.stats.geocodeCoveragePct ?? 0
  }));

  const columns = [
    { key: "name", label: "Team" },
    { key: "region", label: "Region" },
    { key: "members", label: "Members" },
    { key: "assigned", label: "Assigned Visits" },
    { key: "completed", label: "Completed" },
    { key: "in_progress", label: "In Progress" },
    { key: "workload", label: "Workload (hrs)" },
    {
      key: "revenue",
      label: "Revenue",
      render: (row) => `$${row.revenue.toFixed(2)}`
    },
    {
      key: "overrun_rate",
      label: "Overrun Rate",
      render: (row) => <Badge value={`${Math.round(row.overrun_rate * 100)}%`} tone={overrunTone(row.overrun_rate)} />
    },
    {
      key: "route_km",
      label: "Route km",
      render: (row) => row.route_km.toFixed(1)
    },
    {
      key: "route_travel_min",
      label: "Travel min",
      render: (row) => row.route_travel_min
    },
    {
      key: "route_save_min",
      label: "Potential save",
      render: (row) => `${row.route_save_min}m`
    },
    {
      key: "geocode_coverage",
      label: "Geo coverage",
      render: (row) => `${Math.round(row.geocode_coverage * 100)}%`
    }
  ];

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Teams" value={teams.length} hint="Active delivery teams" />
        <StatCard label="Team Members" value={totalMembers} hint="Across all teams" />
        <StatCard label="Assigned Visits" value={totalAssignedVisits} hint="Current schedule set" />
        <StatCard
          label="Workload"
          value={`${totalWorkloadHours.toFixed(1)} hrs`}
          hint={`Completed revenue $${totalRevenue.toFixed(2)}`}
        />
        <StatCard label="Route Distance" value={`${totalRouteKm.toFixed(1)} km`} hint="Current schedule set" />
      </section>

      <Card title="Team management overview">
        <DataTable
          columns={columns}
          rows={performanceRows}
          empty={<EmptyState title="No teams found" message="Team records will appear here." />}
        />
      </Card>

      <section className="cards-grid">
        {teams.map((team) => {
          const projection = teamsService.getTeamDayProjection(db, team.id, operatingDate);
          return (
            <Card key={team.id} title={team.name} subtitle={`Region: ${team.region}`}>
              <div className="metric-list compact">
                <div>
                  <strong>{team.stats.assignedVisits}</strong>
                  <span>Assigned visits</span>
                </div>
                <div>
                  <strong>{team.stats.completedVisits}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{team.stats.inProgressVisits}</strong>
                  <span>In progress</span>
                </div>
                <div>
                  <strong>${team.stats.totalRevenue.toFixed(0)}</strong>
                  <span>Revenue</span>
                </div>
              </div>

              <h4>Members</h4>
              <div className="row-chip-list">
                {team.members.map((member) => (
                  <Badge key={member.id} value={member.full_name} tone="neutral" />
                ))}
              </div>

              <hr className="divider" />

              <div className="detail-list">
                <p>
                  <span>Projected day end</span>
                  <strong>{projection?.projectedEnd ?? "-"}</strong>
                </p>
                <p>
                  <span>Projected utilization</span>
                  <strong>{projection ? `${Math.round(projection.utilizationRate * 100)}%` : "-"}</strong>
                </p>
                <p>
                  <span>Overrun rate</span>
                  <strong>{Math.round(team.stats.overrunRate * 100)}%</strong>
                </p>
                <p>
                  <span>Route distance</span>
                  <strong>{(team.stats.routeDistanceKm ?? 0).toFixed(1)} km</strong>
                </p>
                <p>
                  <span>Travel time</span>
                  <strong>{team.stats.routeTravelMin ?? 0} min</strong>
                </p>
                <p>
                  <span>Potential route save</span>
                  <strong>{team.stats.routeTravelMinSaved ?? 0} min</strong>
                </p>
                <p>
                  <span>Geo coverage</span>
                  <strong>{Math.round((team.stats.geocodeCoveragePct ?? 0) * 100)}%</strong>
                </p>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

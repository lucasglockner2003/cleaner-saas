import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { teamsService } from "../../services";
import { resolveOperationalDate } from "../../utils/operationsDate";

export function TeamsPage() {
  const { db } = useAppData();
  const teams = teamsService.listTeamsWithWorkload(db);
  const operatingDate = resolveOperationalDate(db);

  const totalMembers = teams.reduce((total, team) => total + team.members.length, 0);
  const totalAssignedVisits = teams.reduce((total, team) => total + team.stats.assignedVisits, 0);
  const totalWorkloadHours = teams.reduce((total, team) => total + team.stats.workloadHours, 0);

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Teams" value={teams.length} hint="Active delivery teams" />
        <StatCard label="Team Members" value={totalMembers} hint="Across all teams" />
        <StatCard label="Assigned Visits" value={totalAssignedVisits} hint="Current schedule set" />
        <StatCard label="Workload" value={`${totalWorkloadHours.toFixed(1)} hrs`} hint="Estimated visit hours" />
      </section>

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
                  <strong>{team.stats.workloadHours}</strong>
                  <span>Workload hrs</span>
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
                  <span>Route module</span>
                  <strong>{team.route_placeholder}</strong>
                </p>
                <p>
                  <span>Performance module</span>
                  <strong>{team.performance_placeholder}</strong>
                </p>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}


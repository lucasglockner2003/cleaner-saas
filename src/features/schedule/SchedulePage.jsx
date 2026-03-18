import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { scheduleService } from "../../services";
import { ScheduleDayColumn } from "./ScheduleDayColumn";
import { useAuth } from "../../auth/useAuth";
import { ROLES } from "../../auth/roles";

export function SchedulePage() {
  const { db, actions } = useAppData();
  const { canAccess } = useAuth();
  const week = scheduleService.getWeeklySchedule(db);
  const stats = scheduleService.getScheduleQuickStats(db);
  const [teamFilter, setTeamFilter] = useState("all");
  const canManageDispatch = canAccess([ROLES.OWNER, ROLES.OPS]);

  const dispatchDays = useMemo(
    () => week.filter((day) => (teamFilter === "all" ? true : day.team_id === teamFilter)),
    [teamFilter, week]
  );

  const summaryRows = dispatchDays.map((day) => ({
    id: day.id ?? day.day_name,
    day_name: day.day_name,
    team_name: day.team_name,
    total: day.daySummary?.total ?? 0,
    completed: day.daySummary?.completed ?? 0,
    in_progress: day.daySummary?.inProgress ?? 0,
    overruns: day.daySummary?.overrunCount ?? 0,
    late_starts: day.daySummary?.lateStarts ?? 0,
    projected_end: day.estimation?.projectedEnd ?? "-"
  }));

  const summaryColumns = [
    { key: "day_name", label: "Day" },
    { key: "team_name", label: "Team" },
    { key: "total", label: "Visits" },
    { key: "completed", label: "Done" },
    { key: "in_progress", label: "In Progress" },
    { key: "overruns", label: "Overruns" },
    { key: "late_starts", label: "Late Starts" },
    { key: "projected_end", label: "Projected End" }
  ];

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Team view
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="all">All dispatch teams</option>
            {db.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="stat-grid">
        <StatCard label="Total Visits" value={stats.total} hint="This schedule set" />
        <StatCard label="Completed" value={stats.completed} hint="Execution tracked" />
        <StatCard label="In Progress" value={stats.inProgress} hint="Live houses now" />
        <StatCard label="Scheduled" value={stats.scheduled} hint="Upcoming today/week" />
      </section>

      <Card title="Dispatch day summary" subtitle="At-a-glance operations board by day and assigned team">
        <DataTable
          columns={summaryColumns}
          rows={summaryRows}
          empty={<EmptyState title="No day summaries" message="No schedule data available for this filter." />}
        />
      </Card>

      <Card
        title="Weekly dispatch board (Monday-Friday)"
        subtitle="Order visits, assign teams/cleaners, and run start/finish actions from one board"
      >
        <div className="schedule-grid">
          {dispatchDays.map((day) => (
            <ScheduleDayColumn
              key={`${day.day_name}-${day.team_id ?? "none"}`}
              day={day}
              teams={db.teams}
              employees={db.employees.filter((employee) => employee.status === "active")}
              onStart={(visitId) => actions.startVisit(visitId)}
              onFinish={(visitId) => actions.finishVisit(visitId, "Finished from schedule board")}
              onCancel={(visitId) => {
                if (!canManageDispatch) {
                  return null;
                }

                const confirmed = window.confirm("Cancel this scheduled visit?");
                if (!confirmed) {
                  return null;
                }

                return actions.cancelVisit(visitId, "Cancelled by dispatch board");
              }}
              onReopen={(visitId) => actions.reopenVisit(visitId)}
              onMove={(visitId, direction) => (canManageDispatch ? actions.moveVisit(visitId, direction) : null)}
              onAssignTeam={(visitId, teamId) => (canManageDispatch ? actions.assignVisitTeam(visitId, teamId) : null)}
              onAssignEmployee={(visitId, employeeId) =>
                canManageDispatch ? actions.assignVisitEmployee(visitId, employeeId) : null
              }
              canManageDispatch={canManageDispatch}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

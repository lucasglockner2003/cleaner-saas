import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { scheduleService } from "../../services";
import { ScheduleDayColumn } from "./ScheduleDayColumn";
import { useAuth } from "../../auth/useAuth";
import { ROLES } from "../../auth/roles";

export function SchedulePage() {
  const { db, actions, mutationState } = useAppData();
  const { canAccess } = useAuth();
  const navigate = useNavigate();
  const week = scheduleService.getWeeklySchedule(db);
  const stats = scheduleService.getScheduleQuickStats(db);
  const optimizationSignals = scheduleService.getWeeklyOptimizationSignals(db);
  const [teamFilter, setTeamFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const canManageDispatch = canAccess([ROLES.OWNER, ROLES.OPS]);

  function dayNeedsAttention(day) {
    return (
      day.daySummary?.overbookRisk !== "low" ||
      day.daySummary?.latenessRiskLevel !== "low" ||
      day.loadSignal?.signal === "overloaded"
    );
  }

  const dispatchDays = useMemo(
    () =>
      week
        .filter((day) => (teamFilter === "all" ? true : day.team_id === teamFilter))
        .filter((day) => (riskFilter === "attention" ? dayNeedsAttention(day) : true)),
    [riskFilter, teamFilter, week]
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
    route_distance: day.daySummary?.routeDistanceKm ?? 0,
    route_travel: day.daySummary?.routeTravelMin ?? 0,
    route_savings: day.daySummary?.routeTravelMinSaved ?? 0,
    overbook_risk: day.daySummary?.overbookRisk ?? "low",
    geocode_coverage: day.daySummary ? Math.round((day.daySummary.geocodeCoveragePct ?? 0) * 100) : 0,
    load_signal: day.loadSignal?.signal ?? "balanced",
    projected_end: day.estimation?.projectedEnd ?? "-"
  }));

  const summaryColumns = [
    { key: "day_name", label: "Day" },
    { key: "team_name", label: "Team" },
    { key: "total", label: "Visits" },
    { key: "completed", label: "Done" },
    { key: "in_progress", label: "In Progress" },
    { key: "route_distance", label: "Route km", render: (row) => row.route_distance.toFixed(1) },
    { key: "route_travel", label: "Travel min", render: (row) => `${row.route_travel}m` },
    { key: "route_savings", label: "Potential save", render: (row) => `${row.route_savings}m` },
    {
      key: "overbook_risk",
      label: "Overbook",
      render: (row) => <Badge value={row.overbook_risk} tone={row.overbook_risk === "high" ? "danger" : row.overbook_risk === "medium" ? "warning" : "success"} />
    },
    {
      key: "load_signal",
      label: "Load signal",
      render: (row) => (
        <Badge
          value={row.load_signal}
          tone={row.load_signal === "overloaded" ? "danger" : row.load_signal === "underutilized" ? "warning" : "neutral"}
        />
      )
    },
    { key: "geocode_coverage", label: "Geo ready", render: (row) => `${row.geocode_coverage}%` },
    { key: "overruns", label: "Overruns" },
    { key: "late_starts", label: "Late starts" },
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

        <label>
          Risk focus
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="all">All day boards</option>
            <option value="attention">Only needs-attention days</option>
          </select>
        </label>

        {(teamFilter !== "all" || riskFilter !== "all") ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setTeamFilter("all");
              setRiskFilter("all");
            }}
          >
            Reset filters
          </button>
        ) : null}
      </section>

      <section className="stat-grid">
        <StatCard label="Total Visits" value={stats.total} hint="This schedule set" />
        <StatCard label="Completed" value={stats.completed} hint="Execution tracked" />
        <StatCard label="Route Save Potential" value={`${stats.routeSavingsMin} min`} hint="Weekly recommended gains" />
        <StatCard
          label="Load Warnings"
          value={`${stats.overloadedDays} overloaded / ${stats.underutilizedDays} underused`}
          hint="Cross-team balancing signal"
        />
      </section>

      {stats.total === 0 ? (
        <Card title="No pilot schedule data yet" subtitle="Use Pilot Tools to bootstrap a workable dispatch week in one flow.">
          <div className="inline-actions">
            <button type="button" className="btn" onClick={() => navigate("/pilot-tools")}>
              Open pilot tools
            </button>
          </div>
        </Card>
      ) : null}

      <section className="split-grid">
        <Card title="Dispatch legend">
          <div className="row-chip-list">
            <Badge value="Overbook high" tone="danger" />
            <span className="muted">Projected day overrun is severe and likely needs reordering or reassignment.</span>
          </div>
          <div className="row-chip-list">
            <Badge value="Lateness medium/high" tone="warning" />
            <span className="muted">Start times are at risk due to travel + duration pressure.</span>
          </div>
          <div className="row-chip-list">
            <Badge value="Load overloaded" tone="danger" />
            <span className="muted">Team utilization is above safe range for this day.</span>
          </div>
          <div className="row-chip-list">
            <Badge value="Geo ready" tone="success" />
            <span className="muted">Higher geocode coverage improves route confidence.</span>
          </div>
        </Card>

        <Card title="Routing intelligence snapshot" subtitle="Heuristic optimization and map-readiness indicators">
          <div className="detail-list">
            <p>
              <span>Estimated route distance (week)</span>
              <strong>{optimizationSignals.routeDistanceKm.toFixed(1)} km</strong>
            </p>
            <p>
              <span>Estimated travel time</span>
              <strong>{optimizationSignals.routeTravelMin} min</strong>
            </p>
            <p>
              <span>Potential travel reduction</span>
              <strong>{optimizationSignals.potentialTravelMinSaved} min</strong>
            </p>
            <p>
              <span>Potential km reduction</span>
              <strong>{optimizationSignals.potentialDistanceKmSaved.toFixed(1)} km</strong>
            </p>
            <p>
              <span>Average geocode coverage</span>
              <strong>{Math.round(optimizationSignals.averageGeocodeCoveragePct * 100)}%</strong>
            </p>
          </div>
        </Card>

        <Card title="Top optimization opportunity">
          {optimizationSignals.topOpportunity ? (
            <div className="detail-list">
              <p>
                <span>Day / Team</span>
                <strong>
                  {optimizationSignals.topOpportunity.day_name} - {optimizationSignals.topOpportunity.team_name}
                </strong>
              </p>
              <p>
                <span>Date</span>
                <strong>{optimizationSignals.topOpportunity.date}</strong>
              </p>
              <p>
                <span>Travel minutes save</span>
                <strong>{optimizationSignals.topOpportunity.travel_min_saved} min</strong>
              </p>
              <p>
                <span>Distance save</span>
                <strong>{optimizationSignals.topOpportunity.distance_km_saved.toFixed(1)} km</strong>
              </p>
            </div>
          ) : (
            <EmptyState title="No optimization opportunity" message="More scheduled visits are needed for route analysis." />
          )}
        </Card>
      </section>

      <Card title="Dispatch day summary" subtitle="At-a-glance operations board by day and assigned team">
        <DataTable
          columns={summaryColumns}
          rows={summaryRows}
          empty={
            <EmptyState
              title="No day summaries"
              message={stats.total === 0 ? "No schedule data available yet. Use Pilot Tools to generate a week." : "No schedule data available for this filter."}
              actionLabel={stats.total === 0 ? "Open pilot tools" : "Reset filters"}
              onAction={() => {
                if (stats.total === 0) {
                  navigate("/pilot-tools");
                  return;
                }
                setTeamFilter("all");
                setRiskFilter("all");
              }}
            />
          }
        />
      </Card>

      <Card
        title="Weekly dispatch board (Monday-Friday)"
        subtitle="Order visits, assign teams/cleaners, and run start/finish actions from one board"
      >
        {dispatchDays.length ? (
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
                onApplySuggestedOrder={(scheduleDayId) =>
                  canManageDispatch ? actions.applySuggestedRouteOrder(scheduleDayId) : null
                }
                mutationState={mutationState}
                canManageDispatch={canManageDispatch}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No dispatch days match this filter"
            message={stats.total === 0 ? "No schedule data available yet. Bootstrap from Pilot Tools first." : "Reset team/risk filters to restore the weekly board."}
            actionLabel={stats.total === 0 ? "Open pilot tools" : "Reset filters"}
            onAction={() => {
              if (stats.total === 0) {
                navigate("/pilot-tools");
                return;
              }
              setTeamFilter("all");
              setRiskFilter("all");
            }}
          />
        )}
      </Card>
    </div>
  );
}

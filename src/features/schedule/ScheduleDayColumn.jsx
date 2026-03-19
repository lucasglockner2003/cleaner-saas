import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";

function visitTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  if (status === "cancelled") return "danger";
  return "muted";
}

function riskTone(level) {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "success";
}

function loadTone(signal) {
  if (signal === "overloaded") return "danger";
  if (signal === "underutilized") return "warning";
  return "neutral";
}

function getEstimatedWindow(day, visitId) {
  const matched = day.estimation?.windows?.find((window) => window.type === "visit" && window.visitId === visitId);

  return {
    start: matched?.start ?? "-",
    end: matched?.end ?? "-"
  };
}

export function ScheduleDayColumn({
  day,
  teams,
  employees,
  onStart,
  onFinish,
  onCancel,
  onReopen,
  onMove,
  onAssignTeam,
  onAssignEmployee,
  onApplySuggestedOrder,
  mutationState,
  canManageDispatch
}) {
  if (!day?.date) {
    return (
      <section className="schedule-column">
        <header>
          <h3>{day.day_name}</h3>
          <p className="muted">No schedule</p>
        </header>
      </section>
    );
  }

  const applySuggestedPending = Boolean(mutationState?.applySuggestedRouteOrder);
  const movePending = Boolean(mutationState?.moveVisit);
  const assignPending = Boolean(mutationState?.assignVisitTeam) || Boolean(mutationState?.assignVisitEmployee);
  const startPending = Boolean(mutationState?.startVisit);
  const finishPending = Boolean(mutationState?.finishVisit);
  const cancelPending = Boolean(mutationState?.cancelVisit);
  const reopenPending = Boolean(mutationState?.reopenVisit);

  function getNextActionHint(status) {
    if (status === "scheduled") {
      return "Next: start house when crew arrives.";
    }
    if (status === "in_progress") {
      return "Next: finish house and confirm completion notes.";
    }
    if (status === "completed") {
      return "Completed. Review delta and proof readiness.";
    }
    if (status === "cancelled") {
      return canManageDispatch ? "Cancelled. Reopen only if service is reinstated." : "Cancelled by dispatch.";
    }
    return "No action required.";
  }

  return (
    <section className="schedule-column dispatch-column">
      <header className="schedule-column-header">
        <div>
          <h3>{day.day_name}</h3>
          <p className="muted">{day.date}</p>
        </div>
        <Badge value={day.team_name} tone="accent" />
      </header>

      <div className="schedule-day-summary">
        <p>
          <span>Visits</span>
          <strong>{day.daySummary.total}</strong>
        </p>
        <p>
          <span>Done</span>
          <strong>{day.daySummary.completed}</strong>
        </p>
        <p>
          <span>Overruns</span>
          <strong>{day.daySummary.overrunCount}</strong>
        </p>
        <p>
          <span>Late starts</span>
          <strong>{day.daySummary.lateStarts}</strong>
        </p>
        <p>
          <span>Travel</span>
          <strong>{day.daySummary.routeTravelMin} min</strong>
        </p>
        <p>
          <span>Potential save</span>
          <strong>{day.daySummary.routeTravelMinSaved} min</strong>
        </p>
      </div>

      {day.routePlan ? (
        <div className="route-insight-box">
          <div className="history-row">
            <div>
              <strong>Route optimization</strong>
              <p className="muted">
                {day.routePlan.strategy} | {day.routePlan.mapProvider.mode}
              </p>
            </div>
            <Badge value={day.intelligence?.routeEfficiency?.label || "No signal"} tone={day.intelligence?.routeEfficiency?.level || "neutral"} />
          </div>

          <div className="visit-metrics-inline">
            <span>{day.routePlan.recommended.estimatedDistanceKm.toFixed(1)} km</span>
            <span>{day.routePlan.recommended.estimatedTravelMin} travel min</span>
            <span>{Math.round(day.routePlan.recommended.coordinateCoverage.coveragePct * 100)}% geocode ready</span>
          </div>

          {canManageDispatch && day.routePlan.recommendationChanged ? (
            <button
              className="btn btn-ghost"
              disabled={applySuggestedPending}
              onClick={() => onApplySuggestedOrder(day.id)}
            >
              {applySuggestedPending ? "Applying..." : "Apply recommended order"}
            </button>
          ) : (
            <p className="muted">
              {day.routePlan.recommendationChanged
                ? "Dispatch permissions required to apply route recommendation."
                : "Current order is already close to recommended route."}
            </p>
          )}

          <div className="route-preview-list">
            {day.routePlan.recommended.orderedStops.slice(0, 5).map((stop) => (
              <article key={stop.visit_id} className="row-item">
                <div>
                  <strong>
                    #{stop.recommended_order} {stop.client_name}
                  </strong>
                  <p className="muted">
                    {stop.suburb} | current #{stop.current_order}
                  </p>
                </div>
                <Badge value={stop.point_quality} tone={stop.point_quality === "exact" ? "success" : stop.point_quality === "estimated" ? "warning" : "danger"} />
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="visit-metrics-inline">
        <span>
          <Badge value={`Overbook ${day.daySummary.overbookRisk}`} tone={riskTone(day.daySummary.overbookRisk)} />
        </span>
        <span>
          <Badge value={`Lateness ${day.daySummary.latenessRiskLevel}`} tone={riskTone(day.daySummary.latenessRiskLevel)} />
        </span>
        <span>
          <Badge value={`Load ${day.loadSignal?.signal || "balanced"}`} tone={loadTone(day.loadSignal?.signal)} />
        </span>
      </div>

      {day.visits.length ? (
        <div className="stack-list">
          {day.visits.map((visit) => {
            const window = getEstimatedWindow(day, visit.id);
            return (
              <article key={visit.id} className={`visit-card dispatch-card tone-${visit.status}`.trim()}>
                <div className="history-row">
                  <div>
                    <strong>
                      #{visit.order_index} {visit.client_name}
                    </strong>
                    <p className="muted">
                      {window.start} - {window.end} ({visit.estimated_duration_min} min)
                    </p>
                  </div>
                  <Badge value={visit.status} tone={visitTone(visit.status)} />
                </div>

                <p className="muted">
                  {visit.client_suburb} - {visit.service_type_name}
                </p>
                <p className="muted">Assigned cleaner: {visit.employee_name}</p>
                <p className="muted">{getNextActionHint(visit.status)}</p>

                <div className="visit-metrics-inline">
                  <span>Actual: {visit.actual_duration_min ? `${visit.actual_duration_min}m` : "-"}</span>
                  <span>Delta: {visit.delta_min == null ? "-" : `${visit.delta_min > 0 ? "+" : ""}${visit.delta_min}m`}</span>
                  <span>Lateness: {visit.lateness_min == null ? "-" : `${visit.lateness_min}m`}</span>
                </div>

                {canManageDispatch ? (
                  <div className="visit-assignment-grid">
                    <label>
                      Team
                      <select
                        value={visit.team_id}
                        onChange={(event) => onAssignTeam(visit.id, event.target.value)}
                        disabled={assignPending}
                      >
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Cleaner
                      <select
                        value={visit.employee_id || ""}
                        onChange={(event) => onAssignEmployee(visit.id, event.target.value)}
                        disabled={assignPending}
                      >
                        <option value="">Unassigned</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                <div className="visit-card-actions">
                  {canManageDispatch ? (
                    <div className="inline-actions">
                      <button className="btn btn-ghost" onClick={() => onMove(visit.id, "up")} disabled={movePending}>
                        {movePending ? "Updating..." : "Move up"}
                      </button>
                      <button className="btn btn-ghost" onClick={() => onMove(visit.id, "down")} disabled={movePending}>
                        {movePending ? "Updating..." : "Move down"}
                      </button>
                    </div>
                  ) : (
                    <span className="muted">Dispatch adjustments require ops role.</span>
                  )}

                  <div className="inline-actions">
                    {visit.status === "scheduled" ? (
                      <button className="btn" onClick={() => onStart(visit.id)} disabled={startPending || cancelPending}>
                        {startPending ? "Starting..." : "Start house"}
                      </button>
                    ) : null}
                    {visit.status === "in_progress" ? (
                      <button className="btn" onClick={() => onFinish(visit.id)} disabled={finishPending || cancelPending}>
                        {finishPending ? "Finishing..." : "Finish house"}
                      </button>
                    ) : null}
                    {canManageDispatch && (visit.status === "scheduled" || visit.status === "in_progress") ? (
                      <button className="btn btn-ghost" onClick={() => onCancel(visit.id)} disabled={cancelPending || startPending || finishPending}>
                        {cancelPending ? "Cancelling..." : "Cancel"}
                      </button>
                    ) : null}
                    {canManageDispatch && visit.status === "cancelled" ? (
                      <button className="btn btn-ghost" onClick={() => onReopen(visit.id)} disabled={reopenPending}>
                        {reopenPending ? "Reopening..." : "Reopen"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No visits assigned" message="This dispatch day has no visits yet. Add visits from scheduling workflows." />
      )}

      <footer className="schedule-column-footer">
        <p>
          <span>Projected end:</span> <strong>{day.estimation?.projectedEnd ?? "-"}</strong>
        </p>
        <p>
          <span>Utilization:</span>{" "}
          <strong>{day.estimation ? `${Math.round(day.estimation.utilizationRate * 100)}%` : "-"}</strong>
        </p>
        <p>
          <span>Route distance:</span> <strong>{day.daySummary.routeDistanceKm.toFixed(1)} km</strong>
        </p>
        <p>
          <span>Recurring influence:</span>{" "}
          <strong>{Math.round((day.daySummary.recurringInfluenceRate ?? 0) * 100)}%</strong>
        </p>
      </footer>
    </section>
  );
}

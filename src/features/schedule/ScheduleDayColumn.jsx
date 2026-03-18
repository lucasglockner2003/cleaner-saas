import { Badge } from "../../components/ui/Badge";

function visitTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  if (status === "cancelled") return "danger";
  return "muted";
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
      </div>

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

              <div className="visit-metrics-inline">
                <span>Actual: {visit.actual_duration_min ? `${visit.actual_duration_min}m` : "-"}</span>
                <span>Delta: {visit.delta_min == null ? "-" : `${visit.delta_min > 0 ? "+" : ""}${visit.delta_min}m`}</span>
                <span>Lateness: {visit.lateness_min == null ? "-" : `${visit.lateness_min}m`}</span>
              </div>

              {canManageDispatch ? (
                <div className="visit-assignment-grid">
                  <label>
                    Team
                    <select value={visit.team_id} onChange={(event) => onAssignTeam(visit.id, event.target.value)}>
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
                    <button className="btn btn-ghost" onClick={() => onMove(visit.id, "up")}>
                      Move up
                    </button>
                    <button className="btn btn-ghost" onClick={() => onMove(visit.id, "down")}>
                      Move down
                    </button>
                  </div>
                ) : (
                  <span className="muted">Dispatch adjustments require ops role.</span>
                )}

                <div className="inline-actions">
                  {visit.status === "scheduled" ? (
                    <button className="btn" onClick={() => onStart(visit.id)}>
                      Start house
                    </button>
                  ) : null}
                  {visit.status === "in_progress" ? (
                    <button className="btn" onClick={() => onFinish(visit.id)}>
                      Finish house
                    </button>
                  ) : null}
                  {canManageDispatch && (visit.status === "scheduled" || visit.status === "in_progress") ? (
                    <button className="btn btn-ghost" onClick={() => onCancel(visit.id)}>
                      Cancel
                    </button>
                  ) : null}
                  {canManageDispatch && visit.status === "cancelled" ? (
                    <button className="btn btn-ghost" onClick={() => onReopen(visit.id)}>
                      Reopen
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="schedule-column-footer">
        <p>
          <span>Projected end:</span> <strong>{day.estimation?.projectedEnd ?? "-"}</strong>
        </p>
        <p>
          <span>Utilization:</span>{" "}
          <strong>{day.estimation ? `${Math.round(day.estimation.utilizationRate * 100)}%` : "-"}</strong>
        </p>
      </footer>
    </section>
  );
}

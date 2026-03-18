import { Badge } from "../../components/ui/Badge";

function visitTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  return "muted";
}

function getEstimatedWindow(day, visitId) {
  const matched = day.estimation?.windows?.find((window) => window.type === "visit" && window.visitId === visitId);

  return {
    start: matched?.start ?? "-",
    end: matched?.end ?? "-"
  };
}

export function ScheduleDayColumn({ day, onStart, onFinish }) {
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
    <section className="schedule-column">
      <header className="schedule-column-header">
        <div>
          <h3>{day.day_name}</h3>
          <p className="muted">{day.date}</p>
        </div>
        <Badge value={day.team_name} tone="accent" />
      </header>

      <div className="stack-list">
        {day.visits.map((visit) => {
          const window = getEstimatedWindow(day, visit.id);
          return (
            <article key={visit.id} className="visit-card">
              <div className="visit-card-main">
                <strong>{visit.client_name}</strong>
                <p className="muted">
                  {window.start} - {window.end} ({visit.estimated_duration_min} min)
                </p>
                <p className="muted">
                  {visit.client_suburb} - {visit.service_type_name}
                </p>
              </div>
              <div className="visit-card-actions">
                <Badge value={visit.status} tone={visitTone(visit.status)} />
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


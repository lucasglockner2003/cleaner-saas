import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/dateTime";

function statusTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  if (status === "cancelled") return "danger";
  return "muted";
}

function getDurationRatio(estimated, actual) {
  if (!estimated || !actual) {
    return 0;
  }

  return Math.min(1.5, actual / estimated);
}

export function ClientVisitHistoryPanel({ visits, onStart, onFinish }) {
  if (!visits.length) {
    return <EmptyState title="No visit history" message="Scheduled and completed visits for this client will appear here." />;
  }

  return (
    <div className="stack-list">
      {visits.map((visit) => {
        const ratio = getDurationRatio(visit.estimated_duration_min, visit.actual_duration_min);
        return (
          <article key={visit.id} className="history-card">
            <div className="history-row">
              <div>
                <strong>{visit.date}</strong>
                <p className="muted">
                  {visit.team_name} - {visit.service_type_name}
                </p>
              </div>
              <Badge value={visit.status} tone={statusTone(visit.status)} />
            </div>

            <div className="history-metrics">
              <p>
                <span>Estimated:</span> <strong>{visit.estimated_duration_min} min</strong>
              </p>
              <p>
                <span>Actual:</span> <strong>{visit.actual_duration_min ? `${visit.actual_duration_min} min` : "-"}</strong>
              </p>
              <p>
                <span>Delta:</span>{" "}
                <strong>
                  {visit.delta_min == null ? "-" : `${visit.delta_min > 0 ? "+" : ""}${visit.delta_min} min`}
                </strong>
              </p>
              <p>
                <span>Lateness:</span>{" "}
                <strong>{visit.lateness_min == null ? "-" : `${visit.lateness_min} min`}</strong>
              </p>
              <p>
                <span>Proof:</span> <strong>{visit.photos.length} photos</strong>
              </p>
            </div>

            <div className="duration-bar-wrap">
              <p className="muted">Estimated vs actual duration</p>
              <div className="duration-bar">
                <span className="duration-bar-estimated" />
                <span className="duration-bar-actual" style={{ width: `${Math.max(6, ratio * 100)}%` }} />
              </div>
            </div>

            <p className="muted">{visit.notes || "No execution notes recorded."}</p>
            {visit.actual_start || visit.actual_finish ? (
              <p className="muted">
                Start: {formatDateTime(visit.actual_start)} | Finish: {formatDateTime(visit.actual_finish)}
              </p>
            ) : null}

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
            </div>
          </article>
        );
      })}
    </div>
  );
}


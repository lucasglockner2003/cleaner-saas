import { Link, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { clientsService } from "../../services";
import { formatDate, formatDateTime } from "../../utils/dateTime";

function statusTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  return "muted";
}

export function ClientDetailsPage() {
  const { clientId } = useParams();
  const { db, actions } = useAppData();

  const snapshot = clientsService.getClientDetailSnapshot(db, clientId);

  if (!snapshot) {
    return (
      <Card title="Client not found">
        <p className="muted">This client record does not exist in the current dataset.</p>
        <Link to="/clients">Back to clients</Link>
      </Card>
    );
  }

  const { client, notes, visitHistory, metrics } = snapshot;

  return (
    <div className="page-grid">
      <div className="page-title-row">
        <div>
          <h2>{client.full_name}</h2>
          <p className="muted">{client.address}</p>
        </div>
        <Badge value={client.status} tone={client.status === "active" ? "success" : "muted"} />
      </div>

      <section className="stat-grid">
        <StatCard label="Suburb" value={client.suburb} hint="Grouping region" />
        <StatCard label="Est. Duration" value={`${client.estimated_duration_min} min`} hint={client.cleaning_frequency} />
        <StatCard label="Visits Logged" value={metrics.totalVisits} hint={`${metrics.completedVisits} completed`} />
        <StatCard
          label="Avg Actual Duration"
          value={metrics.averageActualDuration ? `${metrics.averageActualDuration} min` : "-"}
          hint="From completed visits"
        />
      </section>

      <section className="split-grid">
        <Card title="Operational profile">
          <div className="detail-list">
            <p>
              <span>Phone</span>
              <strong>{client.phone}</strong>
            </p>
            <p>
              <span>Email</span>
              <strong>{client.email}</strong>
            </p>
            <p>
              <span>Service Type</span>
              <strong>{client.service_type_name}</strong>
            </p>
            <p>
              <span>Frequency</span>
              <strong>{client.cleaning_frequency}</strong>
            </p>
            <p>
              <span>Last Cleaning</span>
              <strong>{formatDate(client.last_cleaning_at)}</strong>
            </p>
            <p>
              <span>Notes Summary</span>
              <strong>{client.notes_summary}</strong>
            </p>
          </div>
        </Card>

        <Card title="Special instructions">
          <p>{client.special_instructions}</p>
          <hr className="divider" />
          <h4>Service notes</h4>
          {notes.length ? (
            <ul className="simple-list">
              {notes.map((note) => (
                <li key={note.id}>
                  <strong>{note.note_type}</strong>: {note.body}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No active notes" message="Add notes to support team execution consistency." />
          )}
        </Card>
      </section>

      <Card title="Visit history and proof timeline">
        {visitHistory.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Service</th>
                  <th>Estimated</th>
                  <th>Actual</th>
                  <th>Delta</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitHistory.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.date}</td>
                    <td>{visit.team_name}</td>
                    <td>{visit.service_type_name}</td>
                    <td>{visit.estimated_duration_min} min</td>
                    <td>{visit.actual_duration_min ? `${visit.actual_duration_min} min` : "-"}</td>
                    <td>{visit.delta_min == null ? "-" : `${visit.delta_min > 0 ? "+" : ""}${visit.delta_min} min`}</td>
                    <td>
                      <Badge value={visit.status} tone={statusTone(visit.status)} />
                    </td>
                    <td>{visit.photos.length} photos</td>
                    <td>
                      {visit.status === "scheduled" ? (
                        <button className="btn" onClick={() => actions.startVisit(visit.id)}>
                          Start house
                        </button>
                      ) : null}
                      {visit.status === "in_progress" ? (
                        <button className="btn" onClick={() => actions.finishVisit(visit.id, "Completed from client page")}>
                          Finish house
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No visit history" message="Scheduled and completed visits for this client will appear here." />
        )}
      </Card>

      <Card title="Latest service notes">
        {visitHistory.slice(0, 3).map((visit) => (
          <article key={visit.id} className="row-item">
            <div>
              <strong>{visit.date}</strong>
              <p>{visit.notes || "No notes recorded."}</p>
            </div>
            <span className="muted">{formatDateTime(client.updated_at)}</span>
          </article>
        ))}
      </Card>
    </div>
  );
}


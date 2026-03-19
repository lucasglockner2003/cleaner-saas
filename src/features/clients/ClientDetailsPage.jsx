import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { clientsService } from "../../services";
import { formatDate, formatDateTime } from "../../utils/dateTime";
import { ClientEditForm } from "./ClientEditForm";
import { ClientNotesPanel } from "./ClientNotesPanel";
import { ClientVisitHistoryPanel } from "./ClientVisitHistoryPanel";

function statusTone(status) {
  if (status === "active") return "success";
  if (status === "inactive") return "muted";
  return "neutral";
}

export function ClientDetailsPage() {
  const { clientId } = useParams();
  const { db, actions } = useAppData();
  const [isEditing, setIsEditing] = useState(false);

  const snapshot = clientsService.getClientDetailSnapshot(db, clientId);

  const activeNotes = useMemo(
    () => snapshot?.notes.filter((note) => note.is_active) ?? [],
    [snapshot?.notes]
  );

  if (!snapshot) {
    return (
      <Card title="Client not found">
        <p className="muted">This client record does not exist in the current dataset.</p>
        <Link to="/clients">Back to clients</Link>
      </Card>
    );
  }

  const { client, notes, visitHistory, metrics, instructionTokens, nextVisit, recurringServices, crmProfile } = snapshot;

  function handleSaveClient(payload) {
    const result = actions.updateClient(client.id, payload);
    if (result.ok) {
      setIsEditing(false);
    }
    return result;
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete/archive this client? Clients with visit history will be set inactive, not hard deleted."
    );
    if (!confirmed) {
      return;
    }

    actions.deleteClient(client.id);
  }

  return (
    <div className="page-grid">
      <div className="page-title-row">
        <div>
          <h2>{client.full_name}</h2>
          <p className="muted">{client.address}</p>
          <p className="muted">
            Last updated {formatDateTime(client.updated_at)} | Created {formatDate(client.created_at)}
          </p>
        </div>
        <div className="inline-actions">
          <Badge value={client.status} tone={statusTone(client.status)} />
          <button type="button" className="btn btn-ghost" onClick={() => setIsEditing((value) => !value)}>
            {isEditing ? "Close edit" : "Edit client"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.setClientStatus(client.id, client.status === "active" ? "inactive" : "active")}
          >
            {client.status === "active" ? "Set inactive" : "Set active"}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete / Archive
          </button>
        </div>
      </div>

      {isEditing ? (
        <Card title="Edit client profile">
          <ClientEditForm
            client={client}
            serviceTypes={db.serviceTypes}
            onSave={handleSaveClient}
            onCancel={() => setIsEditing(false)}
          />
        </Card>
      ) : null}

      <section className="stat-grid">
        <StatCard label="Suburb" value={client.suburb} hint="Grouping region" />
        <StatCard label="Est. Duration" value={`${client.estimated_duration_min} min`} hint={client.cleaning_frequency} />
        <StatCard label="On-time Rate" value={`${Math.round(metrics.onTimeRate * 100)}%`} hint="Completed visits" />
        <StatCard
          label="Proof Coverage"
          value={`${Math.round(metrics.proofCoverageRate * 100)}%`}
          hint={`${metrics.overrunVisits} overruns logged`}
        />
      </section>

      <section className="split-grid">
        <Card title="Operations profile">
          <div className="detail-list">
            <p>
              <span>Phone</span>
              <strong>{client.phone}</strong>
            </p>
            <p>
              <span>Email</span>
              <strong>{client.email || "-"}</strong>
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
              <span>Acquisition source</span>
              <strong>{client.acquisition_source || crmProfile?.acquisition_source || "-"}</strong>
            </p>
            <p>
              <span>Referral source</span>
              <strong>{client.referral_source || crmProfile?.referral_source || "-"}</strong>
            </p>
            <p>
              <span>Notes Summary</span>
              <strong>{client.notes_summary || "-"}</strong>
            </p>
            <p>
              <span>Location readiness</span>
              <strong>{metrics.geocodeReady ? "Geocoded" : "Pending geocode"}</strong>
            </p>
            <p>
              <span>Coordinates</span>
              <strong>
                {client.latitude != null && client.longitude != null
                  ? `${client.latitude.toFixed(4)}, ${client.longitude.toFixed(4)}`
                  : "-"}
              </strong>
            </p>
            <p>
              <span>Average Actual Duration</span>
              <strong>{metrics.averageActualDuration ? `${metrics.averageActualDuration} min` : "-"}</strong>
            </p>
            <p>
              <span>Average Delta</span>
              <strong>
                {metrics.averageDeltaMin == null
                  ? "-"
                  : `${metrics.averageDeltaMin > 0 ? "+" : ""}${metrics.averageDeltaMin} min`}
              </strong>
            </p>
            <p>
              <span>Total revenue</span>
              <strong>${metrics.totalRevenue.toFixed(2)}</strong>
            </p>
            <p>
              <span>Paid total</span>
              <strong>${metrics.paidTotal.toFixed(2)}</strong>
            </p>
            <p>
              <span>Outstanding balance</span>
              <strong>${metrics.outstandingBalance.toFixed(2)}</strong>
            </p>
          </div>
        </Card>

        <Card title="Special instructions and next visit">
          {instructionTokens.length ? (
            <div className="row-chip-list">
              {instructionTokens.map((token) => (
                <Badge key={token} value={token} tone="warning" />
              ))}
            </div>
          ) : (
            <EmptyState title="No special instructions" message="Add key instructions to guide teams during dispatch." />
          )}

          <hr className="divider" />
          <h4>Next scheduled visit</h4>
          {nextVisit ? (
            <div className="detail-list">
              <p>
                <span>Date</span>
                <strong>{nextVisit.date}</strong>
              </p>
              <p>
                <span>Window</span>
                <strong>
                  {nextVisit.estimated_start} - {nextVisit.estimated_end}
                </strong>
              </p>
              <p>
                <span>Assigned Team</span>
                <strong>{nextVisit.team_name}</strong>
              </p>
              <p>
                <span>Status</span>
                <strong>{nextVisit.status}</strong>
              </p>
            </div>
          ) : (
            <p className="muted">No pending visit.</p>
          )}

          <hr className="divider" />
          <h4>Recurring services</h4>
          {recurringServices.length ? (
            <div className="stack-list">
              {recurringServices.map((item) => (
                <article key={item.id} className="row-item">
                  <div>
                    <strong>{item.frequency}</strong>
                    <p className="muted">
                      {item.window_start} - {item.window_end}
                    </p>
                    <p className="muted">Next: {item.next_service_date || "-"}</p>
                  </div>
                  <Badge value={item.status || "active"} tone={(item.status || "active") === "active" ? "success" : "warning"} />
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No recurring services configured.</p>
          )}
        </Card>
      </section>

      <Card title={`Service notes timeline (${activeNotes.length} active)`}>
        <ClientNotesPanel
          notes={notes}
          onAddNote={(payload) => actions.addClientNote(client.id, payload)}
          onSetNoteActive={actions.setClientNoteActive}
        />
      </Card>

      <Card title="Visit history control panel">
        <ClientVisitHistoryPanel
          visits={visitHistory}
          onStart={(visitId) => actions.startVisit(visitId)}
          onFinish={(visitId) => actions.finishVisit(visitId, "Completed from client control panel")}
        />
      </Card>
    </div>
  );
}

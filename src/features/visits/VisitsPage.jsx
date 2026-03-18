import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { visitsService, clientsService } from "../../services";
import { resolveOperationalDate } from "../../utils/operationsDate";
import { VisitExecutionPanel } from "./VisitExecutionPanel";
import { useAuth } from "../../auth/useAuth";
import { ROLES } from "../../auth/roles";

function visitTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  if (status === "cancelled") return "danger";
  return "muted";
}

function communicationTone(status) {
  if (status === "sent") return "success";
  if (status === "queued" || status === "retry_scheduled" || status === "sending") return "warning";
  if (status === "failed") return "danger";
  if (status === "not_queued") return "neutral";
  return "muted";
}

export function VisitsPage() {
  const { db, actions } = useAppData();
  const { canAccess } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [suburbFilter, setSuburbFilter] = useState("all");
  const [selectedVisitId, setSelectedVisitId] = useState(null);

  const operatingDate = resolveOperationalDate(db);
  const visits = visitsService.listVisits(db, {
    status: statusFilter,
    day: dayFilter,
    teamId: teamFilter,
    suburb: suburbFilter
  });
  const suburbs = clientsService.listSuburbs(db);
  const dates = [...new Set(db.scheduledVisits.map((visit) => visit.date))].sort();
  const timeline = visitsService.getVisitHistoryTimeline(db).slice(0, 10);
  const summary = visitsService.getVisitPerformanceSummary(db);
  const completionFailedCount = visits.filter((visit) => visit.completion_communication_status === "failed").length;
  const proofMissingCount = visits.filter((visit) => visit.needs_proof && !visit.proof_ready).length;
  const canManageLifecycle = canAccess([ROLES.OWNER, ROLES.OPS]);

  const resolvedSelectedVisitId = visits.some((visit) => visit.id === selectedVisitId)
    ? selectedVisitId
    : visits[0]?.id ?? null;
  const selectedSnapshot = useMemo(
    () => (resolvedSelectedVisitId ? visitsService.getVisitExecutionSnapshot(db, resolvedSelectedVisitId) : null),
    [db, resolvedSelectedVisitId]
  );

  const columns = [
    { key: "date", label: "Date" },
    {
      key: "client_name",
      label: "Client",
      render: (row) => (
        <button type="button" className="table-link-btn" onClick={() => setSelectedVisitId(row.id)}>
          {row.client_name}
        </button>
      )
    },
    { key: "team_name", label: "Team" },
    { key: "employee_name", label: "Cleaner" },
    {
      key: "estimated_duration_min",
      label: "Estimated",
      render: (row) => `${row.estimated_duration_min} min`
    },
    {
      key: "actual_duration_min",
      label: "Actual",
      render: (row) => (row.actual_duration_min ? `${row.actual_duration_min} min` : "-")
    },
    {
      key: "lateness_min",
      label: "Lateness",
      render: (row) => (row.lateness_min == null ? "-" : `${row.lateness_min} min`)
    },
    {
      key: "delta_min",
      label: "Delta",
      render: (row) => (row.delta_min == null ? "-" : `${row.delta_min > 0 ? "+" : ""}${row.delta_min} min`)
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={visitTone(row.status)} />
    },
    {
      key: "completion_communication_status",
      label: "Completion Email",
      render: (row) => <Badge value={row.completion_communication_status} tone={communicationTone(row.completion_communication_status)} />
    },
    {
      key: "linked_invoice_number",
      label: "Invoice",
      render: (row) => row.linked_invoice_number || row.linked_invoice_id || "-"
    },
    {
      key: "proof",
      label: "Proof",
      render: (row) => `${row.before_photo_count}/${row.after_photo_count}`
    }
  ];

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Day
          <select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
            <option value="all">All dates</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>

        <label>
          Team
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="all">All teams</option>
            {db.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Suburb
          <select value={suburbFilter} onChange={(event) => setSuburbFilter(event.target.value)}>
            <option value="all">All suburbs</option>
            {suburbs.map((suburb) => (
              <option key={suburb} value={suburb}>
                {suburb}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="stat-grid">
        <StatCard label="Total Records" value={visits.length} hint="Filtered visits" />
        <StatCard label="Completed" value={summary.completed} hint="Done houses" />
        <StatCard label="Late Starts" value={summary.lateStarts} hint={`Operational date ${operatingDate}`} />
        <StatCard label="Average Delta" value={`${summary.averageDelta > 0 ? "+" : ""}${summary.averageDelta} min`} hint="Duration variance" />
      </section>

      <section className="stat-grid">
        <StatCard label="Proof Missing" value={proofMissingCount} hint="Required before/after outstanding" />
        <StatCard label="Completion Failed" value={completionFailedCount} hint="Needs communication retry" />
        <StatCard
          label="Proof Ready"
          value={visits.filter((visit) => visit.proof_ready).length}
          hint="Current filtered set"
        />
        <StatCard
          label="Completion Sent"
          value={visits.filter((visit) => visit.completion_communication_status === "sent").length}
          hint="Customer notified"
        />
      </section>

      <section className="split-grid wide-right">
        <Card title="Visit history and metrics">
          <DataTable
            columns={columns}
            rows={visits}
            empty={<EmptyState title="No visits for this filter" message="Adjust filters to view visit records." />}
          />
        </Card>

        <Card title="Execution control panel" subtitle="Start/finish workflow, notes, and before/after proof">
          <VisitExecutionPanel
            snapshot={selectedSnapshot}
            onStart={(visitId) => actions.startVisit(visitId)}
            onFinish={(visitId) => actions.finishVisit(visitId, "Completed from visit control panel")}
            onCancel={(visitId) => {
              if (!canManageLifecycle) {
                return null;
              }

              const confirmed = window.confirm("Cancel this visit?");
              if (!confirmed) {
                return null;
              }

              return actions.cancelVisit(visitId, "Cancelled from visit control panel");
            }}
            onReopen={(visitId) => (canManageLifecycle ? actions.reopenVisit(visitId) : null)}
            onSaveNotes={actions.updateVisitNotes}
            onAddPhoto={actions.addVisitPhoto}
            canManageLifecycle={canManageLifecycle}
            onQueueCompletionEmail={actions.queueCompletionEmail}
            onRetryCompletionJob={actions.retryCompletionJob}
          />
        </Card>
      </section>

      <Card title="Service timeline and proof insights">
        {timeline.length ? (
          <div className="stack-list">
            {timeline.map((item) => (
              <article key={item.id} className="timeline-item">
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.date} - {item.team_name}
                  </p>
                  <p>{item.notes || "No note captured."}</p>
                  <p className="muted">
                    Proof: {item.proof_summary || "No proof summary"} | Photos: {item.photo_count} | Late:{" "}
                    {item.lateness_min == null ? "-" : `${item.lateness_min} min`} | Delta:{" "}
                    {item.delta_min == null ? "-" : `${item.delta_min > 0 ? "+" : ""}${item.delta_min} min`}
                  </p>
                </div>
                <Badge value={item.status} tone={visitTone(item.status)} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No timeline records" message="Completed visits will populate this timeline." />
        )}
      </Card>
    </div>
  );
}

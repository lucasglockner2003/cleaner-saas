import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { visitsService, clientsService } from "../../services";
import { resolveOperationalDate } from "../../utils/operationsDate";

function visitTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  return "muted";
}

export function VisitsPage() {
  const { db, actions } = useAppData();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [suburbFilter, setSuburbFilter] = useState("all");

  const operatingDate = resolveOperationalDate(db);
  const visits = visitsService.listVisits(db, {
    status: statusFilter,
    day: dayFilter,
    teamId: teamFilter,
    suburb: suburbFilter
  });
  const suburbs = clientsService.listSuburbs(db);
  const dates = [...new Set(db.scheduledVisits.map((visit) => visit.date))].sort();
  const timeline = visitsService.getVisitHistoryTimeline(db).slice(0, 8);

  const columns = [
    { key: "date", label: "Date" },
    { key: "client_name", label: "Client" },
    { key: "team_name", label: "Team" },
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
      key: "delta_min",
      label: "Delta",
      render: (row) =>
        row.delta_min == null ? "-" : `${row.delta_min > 0 ? "+" : ""}${row.delta_min} min`
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={visitTone(row.status)} />
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          {row.status === "scheduled" ? (
            <button className="btn" onClick={() => actions.startVisit(row.id)}>
              Start house
            </button>
          ) : null}
          {row.status === "in_progress" ? (
            <button className="btn" onClick={() => actions.finishVisit(row.id, "Completed from visit history page")}>
              Finish house
            </button>
          ) : null}
        </div>
      )
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
        <StatCard
          label="Completed"
          value={visits.filter((visit) => visit.status === "completed").length}
          hint="Done houses"
        />
        <StatCard
          label="In Progress"
          value={visits.filter((visit) => visit.status === "in_progress").length}
          hint={`Operational date ${operatingDate}`}
        />
        <StatCard
          label="Photo Metadata"
          value={visits.reduce((total, visit) => total + visit.photo_count, 0)}
          hint="Before/after placeholders"
        />
      </section>

      <Card title="Visit history and execution">
        <DataTable
          columns={columns}
          rows={visits}
          empty={<EmptyState title="No visits for this filter" message="Adjust filters to view visit records." />}
        />
      </Card>

      <Card title="Service timeline and proof notes">
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
                    Proof: {item.proof_summary || "No proof summary"} | Photos: {item.photo_count}
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

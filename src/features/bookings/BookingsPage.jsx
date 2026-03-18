import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { useAuth } from "../../auth/useAuth";
import { bookingsService } from "../../services";

function statusTone(status) {
  if (status === "approved") return "success";
  if (status === "new" || status === "reviewing" || status === "quoted") return "warning";
  if (status === "rejected" || status === "cancelled") return "danger";
  return "muted";
}

function nextActionsForStatus(status) {
  if (status === "new") return ["reviewing", "rejected"];
  if (status === "reviewing") return ["quoted", "approved", "rejected"];
  if (status === "quoted") return ["approved", "rejected"];
  if (status === "approved") return ["cancelled"];
  if (status === "rejected" || status === "cancelled") return ["reviewing"];
  return [];
}

export function BookingsPage() {
  const { db, actions } = useAppData();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [internalNotes, setInternalNotes] = useState("");

  const rows = bookingsService.listBookingRequests(db, {
    status: statusFilter,
    source: sourceFilter
  });
  const summary = bookingsService.getBookingPipelineSummary(db);
  const selected = useMemo(() => rows.find((item) => item.id === selectedBookingId) ?? rows[0] ?? null, [rows, selectedBookingId]);

  const columns = [
    {
      key: "id",
      label: "Request",
      render: (row) => (
        <button type="button" className="table-link-btn" onClick={() => setSelectedBookingId(row.id)}>
          {row.id}
        </button>
      )
    },
    { key: "requester_name", label: "Requester" },
    { key: "source", label: "Source" },
    { key: "service_type_name", label: "Service" },
    { key: "preferred_date", label: "Preferred Date" },
    { key: "preferred_time_window", label: "Window" },
    {
      key: "estimated_price",
      label: "Estimate",
      render: (row) => `$${Number(row.estimated_price ?? 0).toFixed(2)}`
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={statusTone(row.status)} />
    }
  ];

  function applyStatus(nextStatus) {
    if (!selected) {
      return;
    }

    const noteToSave = internalNotes || selected.internal_notes || "";
    const result = actions.updateBookingRequestStatus(selected.id, nextStatus, user?.id ?? null, noteToSave);
    if (result.ok) {
      setInternalNotes("");
    }
  }

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="quoted">Quoted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label>
          Source
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="portal">Portal</option>
            <option value="public">Public</option>
          </select>
        </label>
      </section>

      <section className="stat-grid">
        <StatCard label="Total Requests" value={summary.total} hint="Booking pipeline" />
        <StatCard label="New" value={summary.new} hint="Needs triage" />
        <StatCard label="Reviewing" value={summary.reviewing} hint="In assessment" />
        <StatCard label="Approved" value={summary.approved} hint="Ready for scheduling" />
      </section>

      <section className="split-grid wide-right">
        <Card title="Booking request queue">
          <DataTable
            columns={columns}
            rows={rows}
            empty={<EmptyState title="No booking requests" message="Customer booking requests will appear here." />}
          />
        </Card>

        <Card title="Review workspace">
          {selected ? (
            <div className="page-grid compact-grid">
              <div className="detail-list">
                <p>
                  <span>Request</span>
                  <strong>{selected.id}</strong>
                </p>
                <p>
                  <span>Requester</span>
                  <strong>{selected.requester_name}</strong>
                </p>
                <p>
                  <span>Contact</span>
                  <strong>{selected.requester_email}</strong>
                </p>
                <p>
                  <span>Phone</span>
                  <strong>{selected.requester_phone}</strong>
                </p>
                <p>
                  <span>Address</span>
                  <strong>{selected.address}</strong>
                </p>
                <p>
                  <span>Home size</span>
                  <strong>{selected.home_size || "-"}</strong>
                </p>
                <p>
                  <span>Service details</span>
                  <strong>{selected.service_scope || "-"}</strong>
                </p>
              </div>

              <label>
                Internal notes
                <textarea
                  className="input-textarea"
                  value={internalNotes}
                  onChange={(event) => setInternalNotes(event.target.value)}
                  placeholder={selected.internal_notes || "Add review notes for operations team"}
                />
              </label>

              <div className="inline-actions">
                {nextActionsForStatus(selected.status).map((nextStatus) => (
                  <button key={nextStatus} type="button" className="btn btn-ghost" onClick={() => applyStatus(nextStatus)}>
                    Mark {nextStatus}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No request selected" message="Select a request to review details and update status." />
          )}
        </Card>
      </section>
    </div>
  );
}

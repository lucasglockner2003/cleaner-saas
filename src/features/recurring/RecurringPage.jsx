import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { recurringScheduleService } from "../../services";

function recurringTone(status) {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  return "muted";
}

function initialForm() {
  return {
    client_id: "",
    status: "active",
    pattern_type: "weekly",
    interval_count: 1,
    weekday: "Monday",
    monthly_day: "",
    custom_interval_days: "",
    window_start: "08:00",
    window_end: "11:00",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    service_type_id: "",
    estimated_duration_min: 90,
    preferred_team_id: "",
    notes: ""
  };
}

export function RecurringPage() {
  const { db, actions } = useAppData();
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(initialForm);

  const recurringRows = recurringScheduleService.listRecurringPreferences(db, {
    status: statusFilter
  });
  const overview = recurringScheduleService.getRecurringOperationalOverview(db, {
    fromDate: new Date().toISOString().slice(0, 10),
    horizonDays: 90
  });
  const projectedRows = overview.projected;

  const selectedRecurring = useMemo(
    () => recurringRows.find((item) => item.id === editingId) ?? null,
    [editingId, recurringRows]
  );

  function setField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function startEdit(recurring) {
    setEditingId(recurring.id);
    setErrors({});
    setForm({
      client_id: recurring.client_id,
      status: recurring.status,
      pattern_type: recurring.pattern_type,
      interval_count: recurring.interval_count,
      weekday: recurring.weekday || "Monday",
      monthly_day: recurring.monthly_day || "",
      custom_interval_days: recurring.custom_interval_days || "",
      window_start: recurring.window_start,
      window_end: recurring.window_end,
      start_date: recurring.start_date,
      end_date: recurring.end_date || "",
      service_type_id: recurring.service_type_id,
      estimated_duration_min: recurring.estimated_duration_min,
      preferred_team_id: recurring.preferred_team_id || "",
      notes: recurring.notes || ""
    });
  }

  function clearEdit() {
    setEditingId(null);
    setErrors({});
    setForm(initialForm());
  }

  function submitForm(event) {
    event.preventDefault();
    const payload = {
      ...form,
      interval_count: Number(form.interval_count || 1),
      monthly_day: form.monthly_day ? Number(form.monthly_day) : null,
      custom_interval_days: form.custom_interval_days ? Number(form.custom_interval_days) : null,
      estimated_duration_min: Number(form.estimated_duration_min || 90),
      end_date: form.end_date || null
    };

    const result = editingId
      ? actions.updateRecurringService(editingId, payload)
      : actions.createRecurringService(payload);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      return;
    }

    clearEdit();
  }

  const recurringColumns = [
    {
      key: "id",
      label: "Rule",
      render: (row) => (
        <button type="button" className="table-link-btn" onClick={() => startEdit(row)}>
          {row.id}
        </button>
      )
    },
    { key: "client_name", label: "Client" },
    { key: "service_type_name", label: "Service" },
    { key: "frequency", label: "Frequency" },
    { key: "window", label: "Window", render: (row) => `${row.window_start} - ${row.window_end}` },
    { key: "next_service_date", label: "Next Service" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={recurringTone(row.status)} />
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inline-actions">
          <button type="button" className="btn btn-ghost" onClick={() => startEdit(row)}>
            Edit
          </button>
          {row.status === "active" ? (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setRecurringServiceStatus(row.id, "paused")}>
              Pause
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => actions.setRecurringServiceStatus(row.id, "active")}>
              Activate
            </button>
          )}
        </div>
      )
    }
  ];

  const projectionColumns = [
    { key: "date", label: "Date" },
    { key: "client_name", label: "Client" },
    { key: "service_type_name", label: "Service" },
    { key: "window", label: "Window", render: (row) => `${row.window_start} - ${row.window_end}` },
    { key: "preferred_team_name", label: "Preferred Team" },
    {
      key: "status",
      label: "Planning",
      render: (row) => <Badge value={row.status} tone={row.status === "already_scheduled" ? "success" : "neutral"} />
    },
    {
      key: "add",
      label: "Action",
      render: (row) =>
        row.status === "projected" ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.materializeRecurringOccurrence(row.recurrence_id, row.date, { teamId: row.preferred_team_id })}
          >
            Add to schedule
          </button>
        ) : (
          "-"
        )
    }
  ];

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label>
          Rule status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </label>
      </section>

      <section className="stat-grid">
        <StatCard label="Recurring Rules" value={overview.summary.total} hint="Configured clients" />
        <StatCard label="Active Rules" value={overview.summary.active} hint="Generating projections" />
        <StatCard label="Paused Rules" value={overview.summary.paused} hint="Temporarily stopped" />
        <StatCard
          label="Projected Visits"
          value={projectedRows.filter((row) => row.status === "projected").length}
          hint="Not yet scheduled"
        />
      </section>

      <section className="split-grid wide-right">
        <Card title="Recurring service rules">
          <DataTable
            columns={recurringColumns}
            rows={recurringRows}
            empty={<EmptyState title="No recurring rules" message="Create recurring rules to generate future service projections." />}
          />
        </Card>

        <Card title={editingId ? `Edit rule ${editingId}` : "Create recurring rule"}>
          <form className="page-grid compact-grid" onSubmit={submitForm}>
            <label>
              Client
              <select value={form.client_id} onChange={(event) => setField("client_id", event.target.value)}>
                <option value="">Select client</option>
                {db.clients
                  .filter((client) => client.status === "active")
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
              </select>
              {errors.client_id ? <span className="field-error">{errors.client_id}</span> : null}
            </label>

            <label>
              Service type
              <select value={form.service_type_id} onChange={(event) => setField("service_type_id", event.target.value)}>
                <option value="">Select service</option>
                {db.serviceTypes
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              {errors.service_type_id ? <span className="field-error">{errors.service_type_id}</span> : null}
            </label>

            <label>
              Pattern
              <select value={form.pattern_type} onChange={(event) => setField("pattern_type", event.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <label>
              Interval
              <input
                type="number"
                min={1}
                max={12}
                value={form.interval_count}
                onChange={(event) => setField("interval_count", event.target.value)}
              />
              {errors.interval_count ? <span className="field-error">{errors.interval_count}</span> : null}
            </label>

            {form.pattern_type === "monthly" ? (
              <label>
                Day of month
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.monthly_day}
                  onChange={(event) => setField("monthly_day", event.target.value)}
                />
                {errors.monthly_day ? <span className="field-error">{errors.monthly_day}</span> : null}
              </label>
            ) : null}

            {form.pattern_type === "custom" ? (
              <label>
                Custom interval days
                <input
                  type="number"
                  min={3}
                  max={90}
                  value={form.custom_interval_days}
                  onChange={(event) => setField("custom_interval_days", event.target.value)}
                />
                {errors.custom_interval_days ? <span className="field-error">{errors.custom_interval_days}</span> : null}
              </label>
            ) : null}

            {form.pattern_type !== "monthly" && form.pattern_type !== "custom" ? (
              <label>
                Weekday
                <select value={form.weekday} onChange={(event) => setField("weekday", event.target.value)}>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </select>
                {errors.weekday ? <span className="field-error">{errors.weekday}</span> : null}
              </label>
            ) : null}

            <label>
              Window start
              <input type="time" value={form.window_start} onChange={(event) => setField("window_start", event.target.value)} />
            </label>

            <label>
              Window end
              <input type="time" value={form.window_end} onChange={(event) => setField("window_end", event.target.value)} />
              {errors.window_end ? <span className="field-error">{errors.window_end}</span> : null}
            </label>

            <label>
              Start date
              <input type="date" value={form.start_date} onChange={(event) => setField("start_date", event.target.value)} />
            </label>

            <label>
              End date
              <input type="date" value={form.end_date} onChange={(event) => setField("end_date", event.target.value)} />
              {errors.end_date ? <span className="field-error">{errors.end_date}</span> : null}
            </label>

            <label>
              Preferred team
              <select value={form.preferred_team_id} onChange={(event) => setField("preferred_team_id", event.target.value)}>
                <option value="">Any team</option>
                {db.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Estimated duration (min)
              <input
                type="number"
                min={30}
                value={form.estimated_duration_min}
                onChange={(event) => setField("estimated_duration_min", event.target.value)}
              />
              {errors.estimated_duration_min ? <span className="field-error">{errors.estimated_duration_min}</span> : null}
            </label>

            <label>
              Notes
              <textarea className="input-textarea" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
            </label>

            <div className="inline-actions">
              <button type="submit" className="btn">
                {editingId ? "Update rule" : "Create rule"}
              </button>
              {editingId ? (
                <button type="button" className="btn btn-ghost" onClick={clearEdit}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <Card title="Projected recurring visits">
        <DataTable
          columns={projectionColumns}
          rows={projectedRows}
          empty={<EmptyState title="No projections" message="Active recurring rules will project upcoming services." />}
        />
      </Card>

      {selectedRecurring ? (
        <Card title={`Selected rule: ${selectedRecurring.id}`}>
          <div className="detail-list">
            <p>
              <span>Client</span>
              <strong>{selectedRecurring.client_name}</strong>
            </p>
            <p>
              <span>Pattern</span>
              <strong>{selectedRecurring.pattern_type}</strong>
            </p>
            <p>
              <span>Status</span>
              <strong>{selectedRecurring.status}</strong>
            </p>
            <p>
              <span>Next service date</span>
              <strong>{selectedRecurring.next_service_date}</strong>
            </p>
            <p>
              <span>Preferred team</span>
              <strong>{selectedRecurring.preferred_team_name}</strong>
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

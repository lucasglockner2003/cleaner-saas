import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { usePortalSnapshot } from "./usePortalSnapshot";

function statusTone(status) {
  if (status === "approved") return "success";
  if (status === "rejected" || status === "cancelled") return "danger";
  if (status === "quoted" || status === "reviewing") return "warning";
  return "neutral";
}

function initialForm(snapshot) {
  return {
    requester_name: snapshot?.profile?.full_name ?? "",
    requester_email: snapshot?.profile?.email ?? "",
    requester_phone: snapshot?.profile?.phone ?? "",
    suburb: snapshot?.profile?.suburb ?? "",
    address: snapshot?.profile?.address ?? "",
    service_type_id: snapshot?.recurringServices?.[0]?.service_type_id ?? "",
    preferred_date: "",
    preferred_time_window: "Morning",
    home_size: "",
    service_scope: "",
    notes: ""
  };
}

export function PortalBookingPage() {
  const { actions } = useAppData();
  const snapshot = usePortalSnapshot();
  const [form, setForm] = useState(() => initialForm(snapshot));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setForm((current) => {
      if (current.requester_name || current.requester_email || current.address) {
        return current;
      }

      return initialForm(snapshot);
    });
  }, [snapshot]);

  if (!snapshot) {
    return (
      <Card title="Portal account not available">
        <p className="muted">Your portal account could not be linked to booking actions.</p>
      </Card>
    );
  }

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function submitBooking(event) {
    event.preventDefault();
    const result = actions.createBookingRequest(
      {
        ...form,
        client_id: snapshot.profile.client_id,
        portal_account_id: snapshot.account.id,
        source: "portal"
      },
      {
        requireClientLink: true
      }
    );

    if (!result.ok) {
      setErrors(result.errors ?? {});
      return;
    }

    setErrors({});
    setForm(initialForm(snapshot));
  }

  const bookingColumns = [
    { key: "created_at", label: "Submitted", render: (row) => row.created_at.slice(0, 10) },
    { key: "service_type_name", label: "Service" },
    { key: "preferred_date", label: "Preferred Date" },
    { key: "preferred_time_window", label: "Time Window" },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} tone={statusTone(row.status)} />
    },
    {
      key: "estimated_price",
      label: "Estimate",
      render: (row) => `$${Number(row.estimated_price ?? 0).toFixed(2)}`
    }
  ];

  const latestSummary = useMemo(() => snapshot.bookingRequests[0] ?? null, [snapshot.bookingRequests]);

  return (
    <div className="page-grid">
      <Card title="Request a cleaning" subtitle="Submit a booking request for review and scheduling confirmation">
        <form className="form-grid" onSubmit={submitBooking}>
          <label>
            Full name
            <input value={form.requester_name} onChange={(event) => updateField("requester_name", event.target.value)} />
            {errors.requester_name ? <span className="field-error">{errors.requester_name}</span> : null}
          </label>

          <label>
            Email
            <input value={form.requester_email} onChange={(event) => updateField("requester_email", event.target.value)} />
            {errors.requester_email ? <span className="field-error">{errors.requester_email}</span> : null}
          </label>

          <label>
            Phone
            <input value={form.requester_phone} onChange={(event) => updateField("requester_phone", event.target.value)} />
            {errors.requester_phone ? <span className="field-error">{errors.requester_phone}</span> : null}
          </label>

          <label>
            Suburb
            <input value={form.suburb} onChange={(event) => updateField("suburb", event.target.value)} />
            {errors.suburb ? <span className="field-error">{errors.suburb}</span> : null}
          </label>

          <label className="span-2">
            Address
            <input value={form.address} onChange={(event) => updateField("address", event.target.value)} />
            {errors.address ? <span className="field-error">{errors.address}</span> : null}
          </label>

          <label>
            Service type
            <select value={form.service_type_id} onChange={(event) => updateField("service_type_id", event.target.value)}>
              <option value="">Select service</option>
              {snapshot.serviceCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {errors.service_type_id ? <span className="field-error">{errors.service_type_id}</span> : null}
          </label>

          <label>
            Preferred date
            <input type="date" value={form.preferred_date} onChange={(event) => updateField("preferred_date", event.target.value)} />
            {errors.preferred_date ? <span className="field-error">{errors.preferred_date}</span> : null}
          </label>

          <label>
            Time window
            <select value={form.preferred_time_window} onChange={(event) => updateField("preferred_time_window", event.target.value)}>
              <option>Morning</option>
              <option>Midday</option>
              <option>Afternoon</option>
              <option>Flexible</option>
            </select>
          </label>

          <label>
            Home size
            <input
              value={form.home_size}
              onChange={(event) => updateField("home_size", event.target.value)}
              placeholder="e.g. 3 bedrooms / 2 bathrooms"
            />
          </label>

          <label className="span-2">
            Service details
            <input
              value={form.service_scope}
              onChange={(event) => updateField("service_scope", event.target.value)}
              placeholder="Rooms or tasks to prioritize"
            />
          </label>

          <label className="span-2">
            Notes
            <textarea
              className="input-textarea"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Any access notes or special instructions"
            />
          </label>

          <div className="form-actions span-2">
            <button type="submit" className="btn">
              Submit booking request
            </button>
          </div>
        </form>
      </Card>

      <section className="split-grid">
        <Card title="Booking request summary">
          {latestSummary ? (
            <div className="detail-list">
              <p>
                <span>Latest request</span>
                <strong>{latestSummary.id}</strong>
              </p>
              <p>
                <span>Status</span>
                <strong>{latestSummary.status}</strong>
              </p>
              <p>
                <span>Preferred date</span>
                <strong>{latestSummary.preferred_date}</strong>
              </p>
              <p>
                <span>Estimated duration</span>
                <strong>{latestSummary.estimated_duration_min} min</strong>
              </p>
              <p>
                <span>Estimated price</span>
                <strong>${Number(latestSummary.estimated_price ?? 0).toFixed(2)}</strong>
              </p>
            </div>
          ) : (
            <EmptyState title="No requests yet" message="Submit your first booking request above." />
          )}
        </Card>

        <Card title="How this works">
          <div className="stack-list">
            <p>1. Submit your preferred date, service, and house details.</p>
            <p>2. Operations reviews your request and confirms team availability.</p>
            <p>3. You receive status updates and final scheduling confirmation.</p>
          </div>
        </Card>
      </section>

      <Card title="Your booking requests">
        <DataTable
          columns={bookingColumns}
          rows={snapshot.bookingRequests}
          empty={<EmptyState title="No booking requests" message="Your portal requests will appear here." />}
        />
      </Card>
    </div>
  );
}

import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDate } from "../../utils/dateTime";
import { usePortalSnapshot } from "./usePortalSnapshot";

function visitTone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  if (status === "cancelled") return "danger";
  return "muted";
}

export function PortalHomePage() {
  const snapshot = usePortalSnapshot();

  if (!snapshot) {
    return (
      <Card title="Portal account not available">
        <p className="muted">Your portal account could not be linked to a client profile.</p>
      </Card>
    );
  }

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Upcoming Services" value={snapshot.metrics.upcomingCount} hint="Next scheduled visits" />
        <StatCard label="Completed Services" value={snapshot.metrics.completedCount} hint="Your service history" />
        <StatCard label="Outstanding Balance" value={`$${snapshot.metrics.outstandingBalance.toFixed(2)}`} hint="Awaiting payment" />
        <StatCard label="Active Plan" value={snapshot.metrics.activePlan} hint="Subscription status" />
      </section>

      <section className="split-grid">
        <Card title="Next cleanings">
          {snapshot.upcomingVisits.length ? (
            <div className="stack-list">
              {snapshot.upcomingVisits.slice(0, 6).map((visit) => (
                <article key={visit.id} className="row-item">
                  <div>
                    <strong>{visit.service_type_name}</strong>
                    <p className="muted">
                      {visit.date} {visit.estimated_start} - {visit.estimated_end}
                    </p>
                    <p className="muted">Team: {visit.team_name}</p>
                  </div>
                  <Badge value={visit.status} tone={visitTone(visit.status)} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming cleanings" message="You currently have no future scheduled visits." />
          )}
        </Card>

        <Card title="Recurring plan preview">
          {snapshot.recurringProjections.length ? (
            <div className="stack-list">
              {snapshot.recurringProjections.slice(0, 6).map((item) => (
                <article key={`${item.recurrence_id}-${item.date}`} className="row-item">
                  <div>
                    <strong>{item.service_type_name}</strong>
                    <p className="muted">
                      {item.date} {item.window_start} - {item.window_end}
                    </p>
                    <p className="muted">Preferred team: {item.preferred_team_name}</p>
                  </div>
                  <Badge value={item.status} tone={item.status === "already_scheduled" ? "success" : "neutral"} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No recurring plan projection" message="Your recurring services will appear here." />
          )}
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Latest invoices">
          {snapshot.invoices.length ? (
            <div className="stack-list">
              {snapshot.invoices.slice(0, 5).map((invoice) => (
                <article key={invoice.id} className="row-item">
                  <div>
                    <strong>{invoice.invoice_number}</strong>
                    <p className="muted">
                      {invoice.period_start} to {invoice.period_end}
                    </p>
                    <p className="muted">Due: {invoice.due_date || "-"}</p>
                  </div>
                  <Badge value={invoice.status} tone={invoice.status === "paid" ? "success" : "warning"} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No invoices yet" message="Invoice records will appear once services are billed." />
          )}
        </Card>

        <Card title="Account summary">
          <div className="detail-list">
            <p>
              <span>Client</span>
              <strong>{snapshot.profile.full_name}</strong>
            </p>
            <p>
              <span>Service type</span>
              <strong>{snapshot.profile.service_type_name}</strong>
            </p>
            <p>
              <span>Frequency</span>
              <strong>{snapshot.profile.cleaning_frequency}</strong>
            </p>
            <p>
              <span>Address</span>
              <strong>{snapshot.profile.address}</strong>
            </p>
            <p>
              <span>Total paid</span>
              <strong>${snapshot.metrics.paidTotal.toFixed(2)}</strong>
            </p>
            <p>
              <span>Visits with proof</span>
              <strong>{snapshot.metrics.proofReadyVisits}</strong>
            </p>
            <p>
              <span>Last portal login</span>
              <strong>{formatDate(snapshot.account.last_login_at)}</strong>
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}

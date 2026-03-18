import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import { remindersService, invoicesService } from "../../services";

const futureModules = [
  { name: "Reminder email provider integration", state: "scaffolded", note: "Transport adapters can be plugged in." },
  { name: "Invoice generation workflow", state: "scaffolded", note: "Draft contract available, no billing yet." },
  { name: "Photo cloud upload and sharing", state: "scaffolded", note: "Metadata model complete, storage adapter pending." },
  { name: "Route optimization engine", state: "deferred", note: "Will consume schedule + geolocation inputs." },
  { name: "Customer portal", state: "deferred", note: "Planned after core operations hardening." },
  { name: "Payments (Stripe/PayPal)", state: "deferred", note: "Integration boundary planned in architecture." },
  { name: "Ratings and review requests", state: "scaffolded", note: "Ratings entity documented and seeded." }
];

function stateTone(state) {
  if (state === "implemented") return "success";
  if (state === "scaffolded") return "warning";
  return "muted";
}

export function SettingsPage() {
  const { db } = useAppData();
  const reminders = remindersService.listReminders(db);
  const invoices = invoicesService.listInvoices(db);
  const firstScheduledVisit = db.scheduledVisits.find((visit) => visit.status === "scheduled");
  const sampleReminder = firstScheduledVisit
    ? remindersService.buildVisitReminderEmail(db, firstScheduledVisit.id)
    : null;

  return (
    <div className="page-grid">
      <Card
        title="System foundations and future modules"
        subtitle="This page distinguishes implemented MVP capabilities from scaffolded/deferred systems"
      >
        <div className="stack-list">
          {futureModules.map((module) => (
            <article key={module.name} className="row-item">
              <div>
                <strong>{module.name}</strong>
                <p>{module.note}</p>
              </div>
              <Badge value={module.state} tone={stateTone(module.state)} />
            </article>
          ))}
        </div>
      </Card>

      <section className="split-grid">
        <Card title="Reminder email architecture">
          <p className="muted">Queued reminders: {reminders.length}</p>
          {sampleReminder ? (
            <div className="code-like">
              <p>
                <strong>To:</strong> {sampleReminder.to}
              </p>
              <p>
                <strong>Subject:</strong> {sampleReminder.subject}
              </p>
              <p>
                <strong>Body:</strong> {sampleReminder.body}
              </p>
            </div>
          ) : (
            <p className="muted">No scheduled visit available for reminder preview.</p>
          )}
        </Card>

        <Card title="Invoice foundation">
          <p className="muted">Draft invoices in placeholder model: {invoices.length}</p>
          <p className="muted">
            Full invoice issuance, payment links, and customer delivery are intentionally deferred.
          </p>
        </Card>
      </section>
    </div>
  );
}


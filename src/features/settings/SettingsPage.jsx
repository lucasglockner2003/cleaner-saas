import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import {
  communicationJobsService,
  completionService,
  invoicesService,
  photoStorageService,
  remindersService
} from "../../services";
import { useAuth } from "../../auth/useAuth";
import { appEnv } from "../../config/env";

const integrationModules = [
  {
    name: "Reminder transport",
    state: "implemented",
    note: "Mock and webhook transport adapters supported through service boundary."
  },
  {
    name: "Invoice lifecycle",
    state: "implemented",
    note: "Draft, issued, paid, failed states with dispatch queue support."
  },
  {
    name: "Completion communication",
    state: "implemented",
    note: "Completion payload includes service summary, invoice reference, and proof metadata."
  },
  {
    name: "Photo storage provider",
    state: "scaffolded",
    note: "Placeholder + webhook adapters available. Real file upload worker still pending."
  },
  {
    name: "Payment provider",
    state: "deferred",
    note: "Stripe/PayPal integration remains outside Phase 4 scope."
  },
  {
    name: "Background worker runner",
    state: "deferred",
    note: "Current dispatch cycles run from operator actions, ready for worker extraction."
  }
];

function stateTone(state) {
  if (state === "implemented") return "success";
  if (state === "scaffolded") return "warning";
  return "muted";
}

export function SettingsPage() {
  const { db, persistence } = useAppData();
  const { authMode, user } = useAuth();
  const reminderStats = remindersService.getReminderStats(db);
  const invoiceStats = invoicesService.getInvoiceStats(db);
  const jobStats = communicationJobsService.getCommunicationJobStatsByType(db);
  const proofStats = photoStorageService.getProofCompletenessStats(db);
  const completionStats = completionService.getCompletionCommunicationStats(db);

  const firstScheduledVisit = db.scheduledVisits.find((visit) => visit.status === "scheduled");
  const firstCompletedVisit = db.scheduledVisits.find((visit) => visit.status === "completed");
  const firstIssuedInvoice = db.invoices.find((invoice) => invoice.status === "issued");

  const reminderPreview = firstScheduledVisit ? remindersService.buildVisitReminderEmail(db, firstScheduledVisit.id) : null;
  const completionPreview = firstCompletedVisit
    ? completionService.buildServiceCompletionEmailPayload(db, firstCompletedVisit.id)
    : null;
  const invoicePreview = firstIssuedInvoice ? invoicesService.buildInvoiceEmailPayload(db, firstIssuedInvoice.id) : null;

  return (
    <div className="page-grid">
      <Card title="Runtime architecture status" subtitle="Persistence, authentication, and communication runtime modes">
        <div className="detail-list">
          <p>
            <span>Data provider requested</span>
            <strong>{persistence.requestedProvider}</strong>
          </p>
          <p>
            <span>Data provider active</span>
            <strong>{persistence.mode}</strong>
          </p>
          <p>
            <span>Sync status</span>
            <strong>{persistence.syncState.status}</strong>
          </p>
          <p>
            <span>Auth provider</span>
            <strong>{authMode}</strong>
          </p>
          <p>
            <span>Signed-in role</span>
            <strong>{user?.role ?? "-"}</strong>
          </p>
          <p>
            <span>Email transport mode</span>
            <strong>{appEnv.emailTransport}</strong>
          </p>
          <p>
            <span>Photo storage mode</span>
            <strong>{appEnv.photoStorageProvider}</strong>
          </p>
        </div>
      </Card>

      <Card title="Workflow readiness by module" subtitle="Implemented, scaffolded, and intentionally deferred boundaries">
        <div className="stack-list">
          {integrationModules.map((module) => (
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
        <Card title="Communication and proof health">
          <div className="detail-list">
            <p>
              <span>Reminder queued</span>
              <strong>{reminderStats.queued}</strong>
            </p>
            <p>
              <span>Reminder failed</span>
              <strong>{reminderStats.failed}</strong>
            </p>
            <p>
              <span>Invoice issued</span>
              <strong>{invoiceStats.issued}</strong>
            </p>
            <p>
              <span>Completion failed</span>
              <strong>{completionStats.failed}</strong>
            </p>
            <p>
              <span>Proof missing (required)</span>
              <strong>{proofStats.proofMissingRequiredVisits}</strong>
            </p>
            <p>
              <span>Total communication jobs</span>
              <strong>{jobStats.overall.total}</strong>
            </p>
          </div>
        </Card>

        <Card title="Queue status breakdown">
          <div className="detail-list">
            <p>
              <span>Queued jobs</span>
              <strong>{jobStats.overall.queued}</strong>
            </p>
            <p>
              <span>Sending jobs</span>
              <strong>{jobStats.overall.sending}</strong>
            </p>
            <p>
              <span>Retry scheduled</span>
              <strong>{jobStats.overall.retry_scheduled}</strong>
            </p>
            <p>
              <span>Sent</span>
              <strong>{jobStats.overall.sent}</strong>
            </p>
            <p>
              <span>Failed</span>
              <strong>{jobStats.overall.failed}</strong>
            </p>
          </div>
        </Card>
      </section>

      <section className="split-grid">
        <Card title="Reminder payload preview">
          {reminderPreview ? (
            <div className="code-like">
              <p>
                <strong>To:</strong> {reminderPreview.to}
              </p>
              <p>
                <strong>Subject:</strong> {reminderPreview.subject}
              </p>
              <p>
                <strong>Body:</strong> {reminderPreview.body}
              </p>
            </div>
          ) : (
            <p className="muted">No scheduled visit with email-ready client for preview.</p>
          )}
        </Card>

        <Card title="Invoice payload preview">
          {invoicePreview ? (
            <div className="code-like">
              <p>
                <strong>To:</strong> {invoicePreview.to}
              </p>
              <p>
                <strong>Subject:</strong> {invoicePreview.subject}
              </p>
              <p>
                <strong>Body:</strong> {invoicePreview.body}
              </p>
            </div>
          ) : (
            <p className="muted">No issued invoice with client email available for preview.</p>
          )}
        </Card>
      </section>

      <Card title="Completion payload preview">
        {completionPreview ? (
          <div className="code-like">
            <p>
              <strong>To:</strong> {completionPreview.to}
            </p>
            <p>
              <strong>Subject:</strong> {completionPreview.subject}
            </p>
            <p>
              <strong>Body:</strong> {completionPreview.body}
            </p>
          </div>
        ) : (
          <p className="muted">No completed visit with email-ready client available for completion preview.</p>
        )}
      </Card>
    </div>
  );
}

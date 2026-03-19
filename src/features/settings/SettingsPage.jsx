import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../hooks/useAppData";
import {
  auditService,
  communicationJobsService,
  completionService,
  crmService,
  growthService,
  invoicesService,
  operationsJobService,
  paymentsService,
  photoStorageService,
  remindersService,
  subscriptionsService
} from "../../services";
import { useAuth } from "../../auth/useAuth";
import { appEnv, getRuntimeConfigReport } from "../../config/env";

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
    state: "scaffolded",
    note: "Payment domain implemented with manual capture and Stripe/PayPal adapter boundaries."
  },
  {
    name: "Subscription billing",
    state: "implemented",
    note: "Plan catalog and client memberships support recurring-revenue foundation."
  },
  {
    name: "CRM lifecycle engine",
    state: "implemented",
    note: "Lifecycle stages, churn signals, and automation-ready audience segments available."
  },
  {
    name: "Growth and referrals",
    state: "implemented",
    note: "Referral and campaign tracking supports acquisition and conversion visibility."
  },
  {
    name: "Background worker runner",
    state: "scaffolded",
    note: "Operation job contracts are implemented; external scheduler/runtime deployment is the remaining step."
  }
];

function stateTone(state) {
  if (state === "implemented") return "success";
  if (state === "scaffolded") return "warning";
  return "muted";
}

export function SettingsPage() {
  const { db, persistence, actions, mutationState } = useAppData();
  const { authMode, user } = useAuth();
  const reminderStats = remindersService.getReminderStats(db);
  const invoiceStats = invoicesService.getInvoiceStats(db);
  const paymentStats = paymentsService.getPaymentsSummary(db);
  const subscriptionSummary = subscriptionsService.getSubscriptionRevenueSummary(db);
  const lifecycleSummary = crmService.getLifecycleSummary(db);
  const growthSummary = growthService.getGrowthSummary(db);
  const jobStats = communicationJobsService.getCommunicationJobStatsByType(db);
  const proofStats = photoStorageService.getProofCompletenessStats(db);
  const completionStats = completionService.getCompletionCommunicationStats(db);
  const operationStats = operationsJobService.getOperationJobStats(db);
  const operationJobs = operationsJobService.listOperationJobs(db).slice(0, 8);
  const auditSummary = auditService.getAuditSummary(db);
  const recentAuditEvents = auditService.listAuditEvents(db).slice(0, 10);
  const configReport = getRuntimeConfigReport();

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
          <p>
            <span>Map provider mode</span>
            <strong>{appEnv.mapProvider}</strong>
          </p>
          <p>
            <span>Payment provider mode</span>
            <strong>{appEnv.paymentProvider}</strong>
          </p>
          <p>
            <span>Config launch status</span>
            <strong>{configReport.isLaunchReady ? "launch-ready" : "blocked"}</strong>
          </p>
        </div>
        {(configReport.criticalIssues.length || configReport.warnings.length) ? (
          <>
            <hr className="divider" />
            <div className="detail-list">
              <p>
                <span>Critical config issues</span>
                <strong>{configReport.criticalIssues.length}</strong>
              </p>
              <p>
                <span>Config warnings</span>
                <strong>{configReport.warnings.length}</strong>
              </p>
            </div>
            {configReport.criticalIssues.length ? (
              <ul className="simple-list">
                {configReport.criticalIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            {configReport.warnings.length ? (
              <ul className="simple-list">
                {configReport.warnings.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
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
              <span>Captured payments</span>
              <strong>${paymentStats.capturedAmount.toFixed(2)}</strong>
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
        <Card title="Monetization and lifecycle status">
          <div className="detail-list">
            <p>
              <span>Active memberships</span>
              <strong>{subscriptionSummary.activeSubscriptions}</strong>
            </p>
            <p>
              <span>MRR</span>
              <strong>${subscriptionSummary.mrr.toFixed(2)}</strong>
            </p>
            <p>
              <span>At-risk clients</span>
              <strong>{lifecycleSummary.atRiskClients}</strong>
            </p>
            <p>
              <span>Referral conversions</span>
              <strong>{growthSummary.referrals.converted}</strong>
            </p>
            <p>
              <span>Active campaigns</span>
              <strong>{growthSummary.campaigns.active}</strong>
            </p>
          </div>
        </Card>

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

      <Card title="Background operations queue" subtitle="Worker-style execution for dispatch, lifecycle refresh, and reconciliation">
        <div className="detail-list">
          <p>
            <span>Total jobs</span>
            <strong>{operationStats.total}</strong>
          </p>
          <p>
            <span>Queued</span>
            <strong>{operationStats.queued}</strong>
          </p>
          <p>
            <span>Retry scheduled</span>
            <strong>{operationStats.retry_scheduled}</strong>
          </p>
          <p>
            <span>Failed</span>
            <strong>{operationStats.failed}</strong>
          </p>
        </div>

        <div className="inline-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.queueOperationJob({ job_type: "reminder_dispatch", payload: { maxJobs: 30 } })}
          >
            Queue reminder job
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.queueOperationJob({ job_type: "invoice_dispatch", payload: { maxJobs: 20 } })}
          >
            Queue invoice job
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.queueOperationJob({ job_type: "lifecycle_refresh", payload: { winBackThresholdDays: 45 } })}
          >
            Queue lifecycle job
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.queueOperationJob({ job_type: "payment_reconciliation", payload: { maxPayments: 20 } })}
          >
            Queue payment job
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => actions.runOperationJobCycle({ maxJobs: 20 })}
            disabled={mutationState.runOperationJobCycle}
          >
            {mutationState.runOperationJobCycle ? "Running jobs..." : "Run queued jobs"}
          </button>
        </div>

        {operationJobs.length ? (
          <div className="stack-list">
            {operationJobs.map((job) => (
              <article key={job.id} className="row-item">
                <div>
                  <strong>{job.job_type}</strong>
                  <p className="muted">
                    {job.status} | attempts {job.attempt_count}/{job.max_attempts}
                  </p>
                  <p className="muted">worker {job.worker_id || "-"}</p>
                  <p className="muted">{job.error_message || "-"}</p>
                </div>
                <div className="inline-actions">
                  <Badge value={job.status} tone={job.status === "completed" ? "success" : job.status === "failed" ? "danger" : "warning"} />
                  {(job.status === "failed" || job.status === "retry_scheduled") ? (
                    <button type="button" className="btn btn-ghost" onClick={() => actions.retryOperationJob(job.id)}>
                      Retry now
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No queued operation jobs.</p>
        )}
      </Card>

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

      <Card title="Audit timeline readiness" subtitle="Critical action history for payments, lifecycle, and operations">
        <div className="detail-list">
          <p>
            <span>Total audit events</span>
            <strong>{auditSummary.total}</strong>
          </p>
          <p>
            <span>Failures</span>
            <strong>{auditSummary.failures}</strong>
          </p>
          <p>
            <span>Warnings</span>
            <strong>{auditSummary.warnings}</strong>
          </p>
          <p>
            <span>Errors</span>
            <strong>{auditSummary.errors}</strong>
          </p>
        </div>

        {recentAuditEvents.length ? (
          <div className="stack-list">
            {recentAuditEvents.map((event) => (
              <article key={event.id} className="row-item">
                <div>
                  <strong>{event.action_key}</strong>
                  <p className="muted">
                    {event.actor_role} | {event.outcome} | {event.created_at}
                  </p>
                  <p className="muted">{event.message}</p>
                </div>
                <Badge value={event.severity} tone={event.severity === "error" ? "danger" : event.severity === "warning" ? "warning" : "neutral"} />
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No audit events recorded yet.</p>
        )}
      </Card>
    </div>
  );
}

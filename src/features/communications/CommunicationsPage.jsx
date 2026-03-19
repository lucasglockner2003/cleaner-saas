import { useMemo, useState } from "react";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import {
  communicationJobsService,
  completionService,
  invoicesService,
  paymentsService,
  photoStorageService,
  remindersService
} from "../../services";
import { resolveOperationalDate, resolveOperationalMonth } from "../../utils/operationsDate";
import { ReminderOpsPanel } from "./ReminderOpsPanel";
import { InvoiceOpsPanel } from "./InvoiceOpsPanel";
import { CompletionOpsPanel } from "./CompletionOpsPanel";
import { CommunicationJobsPanel } from "./CommunicationJobsPanel";
import { ProofOpsPanel } from "./ProofOpsPanel";

function getMonthRange(monthValue) {
  if (!monthValue) {
    return null;
  }

  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!year || !month) {
    return null;
  }

  const startDate = `${yearRaw}-${monthRaw}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return {
    startDate,
    endDate
  };
}

export function CommunicationsPage() {
  const { db, actions, mutationState } = useAppData();
  const operatingDate = resolveOperationalDate(db);
  const [reminderDate, setReminderDate] = useState(operatingDate);
  const [billingMonth, setBillingMonth] = useState(resolveOperationalMonth(db, operatingDate));

  const reminders = useMemo(() => remindersService.listReminders(db).slice(0, 40), [db]);
  const reminderStats = useMemo(() => remindersService.getReminderStats(db), [db]);
  const invoices = useMemo(() => invoicesService.listInvoices(db), [db]);
  const invoiceStats = useMemo(() => invoicesService.getInvoiceStats(db), [db]);
  const paymentSummary = useMemo(() => paymentsService.getPaymentsSummary(db), [db]);
  const invoiceCommunicationStats = useMemo(() => invoicesService.getInvoiceCommunicationStats(db), [db]);
  const completionRows = useMemo(() => completionService.listCompletionCommunicationStatus(db), [db]);
  const completionStats = useMemo(() => completionService.getCompletionCommunicationStats(db), [db]);
  const proofRows = useMemo(() => photoStorageService.getProofCompletenessOverview(db), [db]);
  const proofStats = useMemo(() => photoStorageService.getProofCompletenessStats(db), [db]);
  const jobs = useMemo(() => communicationJobsService.listCommunicationJobsWithContext(db).slice(0, 40), [db]);
  const jobStats = useMemo(() => communicationJobsService.getCommunicationJobStatsByType(db), [db]);
  const isRunningCycle =
    mutationState.runReminderDispatchCycle ||
    mutationState.runInvoiceDispatchCycle ||
    mutationState.runCompletionDispatchCycle;

  function handleGenerateDrafts() {
    const monthRange = getMonthRange(billingMonth);
    if (!monthRange) {
      return;
    }

    actions.generateInvoiceDrafts(monthRange.startDate, monthRange.endDate);
  }

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard label="Queued Jobs" value={jobStats.overall.queued} hint="Pending communication queue" />
        <StatCard label="Retry Scheduled" value={jobStats.overall.retry_scheduled} hint="Jobs waiting another attempt" />
        <StatCard label="Failed Jobs" value={jobStats.overall.failed} hint="Needs operator action" />
        <StatCard label="Proof Missing" value={proofStats.proofMissingRequiredVisits} hint="Completed visits requiring proof" />
        <StatCard label="Captured Payments" value={`$${paymentSummary.capturedAmount.toFixed(2)}`} hint="Invoice-linked transactions" />
      </section>

      <ReminderOpsPanel
        reminders={reminders}
        reminderStats={reminderStats}
        targetDate={reminderDate}
        onTargetDateChange={setReminderDate}
        onPrepareQueue={() => actions.prepareRemindersForDate(reminderDate)}
        onDispatchCycle={() => actions.runReminderDispatchCycle({ targetDate: reminderDate })}
        onRetryReminder={actions.retryReminder}
      />

      <InvoiceOpsPanel
        invoices={invoices}
        invoiceStats={invoiceStats}
        invoiceCommunicationStats={invoiceCommunicationStats}
        billingMonth={billingMonth}
        onBillingMonthChange={setBillingMonth}
        onGenerateDrafts={handleGenerateDrafts}
        onRunDispatchCycle={() => actions.runInvoiceDispatchCycle({ maxJobs: 30 })}
        onIssueInvoice={(invoiceId) => actions.setInvoiceStatus(invoiceId, "issued")}
        onRecordInvoicePayment={(invoiceId, amount) =>
          actions.createPayment({
            invoice_id: invoiceId,
            amount: Number(amount),
            method_type: "bank_transfer",
            provider: "manual",
            status: "captured",
            notes: "Captured from communications billing panel"
          })
        }
        onMarkInvoiceFailed={(invoiceId) => actions.setInvoiceStatus(invoiceId, "failed")}
        onQueueInvoiceEmail={actions.queueInvoiceEmail}
      />

      <CompletionOpsPanel
        completionRows={completionRows}
        completionStats={completionStats}
        onQueueCompletionEmail={actions.queueCompletionEmail}
        onDispatchCycle={() => actions.runCompletionDispatchCycle({ maxJobs: 30 })}
        onRetryJob={actions.retryCompletionJob}
      />

      <ProofOpsPanel proofRows={proofRows} proofStats={proofStats} />

      <CommunicationJobsPanel
        jobs={jobs}
        jobStats={jobStats}
        onRetryReminder={actions.retryReminder}
        onRetryInvoice={actions.retryInvoiceEmailJob}
        onRetryCompletion={actions.retryCompletionJob}
      />

      {isRunningCycle ? <p className="muted">Pipeline cycle running. Refresh panels in a moment.</p> : null}
    </div>
  );
}

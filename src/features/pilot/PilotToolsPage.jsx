import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { useAppData } from "../../hooks/useAppData";
import { invoicesService } from "../../services";
import { resolveOperationalDate } from "../../utils/operationsDate";
import { ClientCsvImportPanel } from "./ClientCsvImportPanel";
import { WeekScheduleGeneratorPanel } from "./WeekScheduleGeneratorPanel";
import { FakeVisitGeneratorPanel } from "./FakeVisitGeneratorPanel";
import { TestInvoiceGeneratorPanel } from "./TestInvoiceGeneratorPanel";
import { PaymentSimulatorPanel } from "./PaymentSimulatorPanel";

export function PilotToolsPage() {
  const { db, actions, mutationState } = useAppData();
  const operationalDate = resolveOperationalDate(db);
  const openInvoices = invoicesService.listInvoices(db).filter((invoice) => invoice.status === "issued" && invoice.balance_due > 0);
  const activeClients = db.clients.filter((client) => client.status === "active").length;
  const scheduledVisits = db.scheduledVisits.filter((visit) => visit.status === "scheduled").length;
  const completedVisits = db.scheduledVisits.filter((visit) => visit.status === "completed").length;

  return (
    <div className="page-grid">
      <Card
        title="Pilot data tooling"
        subtitle="Fast-track setup for pilot environments: import clients, generate schedule, simulate operations, billing, and payments."
      >
        <p className="muted">
          These tools are designed for staging/pilot setup. Run them in sequence for fastest setup: CSV import, then week schedule,
          then fake visits, then invoice generation, then payment simulation.
        </p>
      </Card>

      <section className="stat-grid">
        <StatCard label="Active clients" value={activeClients} hint="Ready for scheduling" />
        <StatCard label="Scheduled visits" value={scheduledVisits} hint="Pending execution" />
        <StatCard label="Completed visits" value={completedVisits} hint="History and billing source" />
        <StatCard label="Open invoices" value={openInvoices.length} hint={`Operational date ${operationalDate}`} />
      </section>

      <ClientCsvImportPanel actions={actions} mutationState={mutationState} clientsCount={db.clients.length} />
      <WeekScheduleGeneratorPanel actions={actions} mutationState={mutationState} activeClients={activeClients} />
      <FakeVisitGeneratorPanel actions={actions} mutationState={mutationState} defaultDate={operationalDate} />
      <TestInvoiceGeneratorPanel actions={actions} mutationState={mutationState} defaultDate={operationalDate} />
      <PaymentSimulatorPanel actions={actions} mutationState={mutationState} openInvoiceCount={openInvoices.length} />
    </div>
  );
}

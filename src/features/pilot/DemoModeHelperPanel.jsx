import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { PilotActionResult } from "./PilotActionResult";

function nextMondayIso(seedIso) {
  const seedDate = new Date(`${seedIso || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const day = seedDate.getUTCDay();
  const offset = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  seedDate.setUTCDate(seedDate.getUTCDate() + offset);
  return seedDate.toISOString().slice(0, 10);
}

function addDaysIso(dateIso, days) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function stepTone(ok) {
  return ok ? "success" : "danger";
}

function summarizeStep(stepResult) {
  if (!stepResult?.summary) {
    return "";
  }

  const summary = stepResult.summary;
  if (summary.createdVisits != null) {
    return `${summary.createdVisits} visit(s) created`;
  }
  if (summary.imported != null) {
    return `${summary.imported} client(s) imported`;
  }
  if (summary.processed != null) {
    return `${summary.processed} visit(s) processed`;
  }
  if (summary.issuedCount != null) {
    return `${summary.issuedCount} invoice(s) issued`;
  }
  if (summary.created != null) {
    return `${summary.created} payment(s) created`;
  }
  return "";
}

export function DemoModeHelperPanel({ actions, mutationState, defaultDate }) {
  const [weekStartDate, setWeekStartDate] = useState(nextMondayIso(defaultDate));
  const [month, setMonth] = useState(String(defaultDate || new Date().toISOString().slice(0, 10)).slice(0, 7));
  const [maxClients, setMaxClients] = useState(18);
  const [maxVisits, setMaxVisits] = useState(12);
  const [paymentMode, setPaymentMode] = useState("mixed");
  const [steps, setSteps] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const isPilotMutationInFlight = Boolean(
    mutationState.importPilotClientsCsv ||
      mutationState.generatePilotWeekSchedule ||
      mutationState.generatePilotFakeVisits ||
      mutationState.generatePilotTestInvoices ||
      mutationState.simulatePilotPayments
  );

  function handleRunDemoMode(event) {
    event.preventDefault();
    setIsRunning(true);

    const runSteps = [];
    const sampleCsv = typeof actions.getPilotCsvSample === "function" ? actions.getPilotCsvSample() : actions.getPilotCsvTemplate();
    const weekEndDate = addDaysIso(weekStartDate, 4);

    const sequence = [
      {
        key: "import",
        label: "Import sample clients",
        run: () => actions.importPilotClientsCsv(sampleCsv)
      },
      {
        key: "schedule",
        label: "Generate weekly schedule",
        run: () =>
          actions.generatePilotWeekSchedule({
            weekStartDate,
            maxClients,
            clearExistingWeek: true,
            removeCompleted: false
          })
      },
      {
        key: "visits",
        label: "Generate fake visit execution",
        run: () =>
          actions.generatePilotFakeVisits({
            fromDate: weekStartDate,
            toDate: weekEndDate,
            maxVisits,
            addProof: true
          })
      },
      {
        key: "invoices",
        label: "Generate test invoices",
        run: () =>
          actions.generatePilotTestInvoices({
            month,
            issueDrafts: true,
            queueEmail: true,
            maxIssue: 50
          })
      },
      {
        key: "payments",
        label: "Simulate invoice payments",
        run: () =>
          actions.simulatePilotPayments({
            mode: paymentMode,
            provider: "manual",
            methodType: "bank_transfer",
            amountMode: "full",
            maxInvoices: 20
          })
      }
    ];

    for (const step of sequence) {
      const result = step.run();
      const normalized = {
        key: step.key,
        label: step.label,
        ok: Boolean(result?.ok),
        message: result?.message || "No result message.",
        meta: summarizeStep(result)
      };
      runSteps.push(normalized);

      if (!normalized.ok) {
        break;
      }
    }

    setSteps(runSteps);
    setIsRunning(false);
  }

  const failedStep = steps.find((step) => !step.ok);
  const flowResult =
    steps.length === 0
      ? null
      : failedStep
        ? {
            ok: false,
            message: `Demo mode stopped at "${failedStep.label}". Resolve the issue and run again.`
          }
        : {
            ok: true,
            message: "Demo mode sequence finished successfully."
          };

  return (
    <Card
      title="0) Demo mode helper"
      subtitle="One-click pilot setup sequence for live demo sessions (sample clients -> schedule -> visits -> invoices -> payments)."
    >
      <form className="form-grid" onSubmit={handleRunDemoMode}>
        <label>
          Week start (Monday)
          <input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} required />
        </label>

        <label>
          Billing month
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
        </label>

        <label>
          Max clients to schedule
          <input type="number" min={1} value={maxClients} onChange={(event) => setMaxClients(Number(event.target.value))} />
        </label>

        <label>
          Max visits to simulate
          <input type="number" min={1} value={maxVisits} onChange={(event) => setMaxVisits(Number(event.target.value))} />
        </label>

        <label>
          Payment simulation mode
          <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
            <option value="mixed">Mixed outcome</option>
            <option value="captured">Captured only</option>
            <option value="pending">Pending only</option>
            <option value="failed">Failed only</option>
          </select>
        </label>

        <div className="form-actions span-2">
          <button type="submit" className="btn" disabled={isRunning || isPilotMutationInFlight}>
            {isRunning ? "Running demo mode..." : "Run demo mode sequence"}
          </button>
        </div>
      </form>

      <p className="muted">
        Sample CSV file in repo: <code>samples/pilot-clients-sample.csv</code>
      </p>
      <PilotActionResult result={flowResult} />

      {steps.length ? (
        <div className="stack-list">
          {steps.map((step) => (
            <article key={step.key} className="row-item">
              <div>
                <strong>{step.label}</strong>
                <p className="muted">{step.message}</p>
                {step.meta ? <p className="muted">{step.meta}</p> : null}
              </div>
              <Badge value={step.ok ? "ok" : "failed"} tone={stepTone(step.ok)} />
            </article>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

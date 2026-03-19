import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { PilotActionResult } from "./PilotActionResult";

function defaultMonthValue(dateValue) {
  if (!dateValue) {
    return new Date().toISOString().slice(0, 7);
  }
  return String(dateValue).slice(0, 7);
}

export function TestInvoiceGeneratorPanel({ actions, mutationState, defaultDate }) {
  const [month, setMonth] = useState(defaultMonthValue(defaultDate));
  const [issueDrafts, setIssueDrafts] = useState(true);
  const [queueEmail, setQueueEmail] = useState(true);
  const [maxIssue, setMaxIssue] = useState(25);
  const [result, setResult] = useState(null);
  const isRunning = Boolean(mutationState.generatePilotTestInvoices);

  function handleRun(event) {
    event.preventDefault();
    const runResult = actions.generatePilotTestInvoices({
      month,
      issueDrafts,
      queueEmail,
      maxIssue
    });
    setResult(runResult);
  }

  return (
    <Card title="4) Test invoice generator" subtitle="Create draft invoices for a month, optionally issue and queue communication jobs.">
      <form className="form-grid" onSubmit={handleRun}>
        <label>
          Billing month
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
        </label>

        <label>
          Issue generated drafts
          <select value={issueDrafts ? "yes" : "no"} onChange={(event) => setIssueDrafts(event.target.value === "yes")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Queue invoice emails
          <select value={queueEmail ? "yes" : "no"} onChange={(event) => setQueueEmail(event.target.value === "yes")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Max drafts to issue
          <input type="number" min={1} value={maxIssue} onChange={(event) => setMaxIssue(Number(event.target.value))} />
        </label>

        <div className="form-actions span-2">
          <button type="submit" className="btn" disabled={isRunning}>
            {isRunning ? "Generating..." : "Generate test invoices"}
          </button>
        </div>
      </form>

      <PilotActionResult result={result} />
      {result?.summary ? (
        <div className="detail-list">
          <p>
            <span>Created drafts</span>
            <strong>{result.summary.createdDrafts}</strong>
          </p>
          <p>
            <span>Updated drafts</span>
            <strong>{result.summary.updatedDrafts}</strong>
          </p>
          <p>
            <span>Issued invoices</span>
            <strong>{result.summary.issuedCount}</strong>
          </p>
          <p>
            <span>Queued invoice emails</span>
            <strong>{result.summary.queuedCount}</strong>
          </p>
        </div>
      ) : null}
    </Card>
  );
}

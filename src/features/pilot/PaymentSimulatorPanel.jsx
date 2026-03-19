import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { PilotActionResult } from "./PilotActionResult";

export function PaymentSimulatorPanel({ actions, mutationState, openInvoiceCount }) {
  const [mode, setMode] = useState("mixed");
  const [provider, setProvider] = useState("manual");
  const [methodType, setMethodType] = useState("bank_transfer");
  const [amountMode, setAmountMode] = useState("full");
  const [maxInvoices, setMaxInvoices] = useState(8);
  const [result, setResult] = useState(null);
  const isRunning = Boolean(mutationState.simulatePilotPayments);

  function handleRun(event) {
    event.preventDefault();
    const runResult = actions.simulatePilotPayments({
      mode,
      provider,
      methodType,
      amountMode,
      maxInvoices
    });
    setResult(runResult);
  }

  return (
    <Card title="5) Test payment simulator" subtitle="Generate captured/pending/failed payments against issued invoices for billing flow validation.">
      <form className="form-grid" onSubmit={handleRun}>
        <label>
          Simulation mode
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="mixed">Mixed (captured/pending/failed)</option>
            <option value="captured">Captured only</option>
            <option value="pending">Pending only</option>
            <option value="failed">Failed only</option>
          </select>
        </label>

        <label>
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="manual">Manual</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="subscription_billing">Subscription billing</option>
          </select>
        </label>

        <label>
          Method type
          <select value={methodType} onChange={(event) => setMethodType(event.target.value)}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
            <option value="portal_link">Portal link</option>
            <option value="direct_debit">Direct debit</option>
            <option value="cash">Cash</option>
          </select>
        </label>

        <label>
          Amount mode
          <select value={amountMode} onChange={(event) => setAmountMode(event.target.value)}>
            <option value="full">Full invoice balance</option>
            <option value="partial">Partial (captured only)</option>
          </select>
        </label>

        <label>
          Max invoices to simulate
          <input type="number" min={1} value={maxInvoices} onChange={(event) => setMaxInvoices(Number(event.target.value))} />
        </label>

        <p className="muted">Issued invoices with balance due available: {openInvoiceCount}</p>

        <div className="form-actions span-2">
          <button type="submit" className="btn" disabled={isRunning}>
            {isRunning ? "Simulating..." : "Run payment simulation"}
          </button>
        </div>
      </form>

      <PilotActionResult result={result} />
      {result?.summary ? (
        <div className="detail-list">
          <p>
            <span>Payments created</span>
            <strong>{result.summary.created}</strong>
          </p>
          <p>
            <span>Captured / Pending / Failed</span>
            <strong>
              {result.summary.captured} / {result.summary.pending} / {result.summary.failed}
            </strong>
          </p>
          <p>
            <span>Invoices considered</span>
            <strong>{result.summary.invoicesConsidered}</strong>
          </p>
          <p>
            <span>Mode / Provider</span>
            <strong>
              {result.summary.mode} / {result.summary.provider}
            </strong>
          </p>
        </div>
      ) : null}
    </Card>
  );
}

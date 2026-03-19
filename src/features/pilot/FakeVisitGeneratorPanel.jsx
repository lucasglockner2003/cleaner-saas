import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { PilotActionResult } from "./PilotActionResult";

export function FakeVisitGeneratorPanel({ actions, mutationState, defaultDate }) {
  const [fromDate, setFromDate] = useState(defaultDate);
  const [toDate, setToDate] = useState(defaultDate);
  const [maxVisits, setMaxVisits] = useState(25);
  const [addProof, setAddProof] = useState(true);
  const [result, setResult] = useState(null);
  const isRunning = Boolean(mutationState.generatePilotFakeVisits);

  function handleGenerate(event) {
    event.preventDefault();
    const runResult = actions.generatePilotFakeVisits({
      fromDate,
      toDate,
      maxVisits,
      addProof
    });
    setResult(runResult);
  }

  return (
    <Card title="3) Fake visit generator" subtitle="Generate realistic execution outcomes (completed/in-progress/cancelled) for flow testing.">
      <form className="form-grid" onSubmit={handleGenerate}>
        <label>
          From date
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} required />
        </label>
        <label>
          To date
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} required />
        </label>
        <label>
          Max visits to process
          <input type="number" min={1} value={maxVisits} onChange={(event) => setMaxVisits(Number(event.target.value))} />
        </label>
        <label>
          Auto-add before/after proof
          <select value={addProof ? "yes" : "no"} onChange={(event) => setAddProof(event.target.value === "yes")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <div className="form-actions span-2">
          <button type="submit" className="btn" disabled={isRunning}>
            {isRunning ? "Generating..." : "Generate synthetic visit data"}
          </button>
        </div>
      </form>

      <PilotActionResult result={result} />
      {result?.summary ? (
        <div className="detail-list">
          <p>
            <span>Processed visits</span>
            <strong>{result.summary.processed}</strong>
          </p>
          <p>
            <span>Completed / In progress / Cancelled</span>
            <strong>
              {result.summary.completed} / {result.summary.inProgress} / {result.summary.cancelled}
            </strong>
          </p>
          <p>
            <span>Proof entries added</span>
            <strong>{result.summary.photosAdded}</strong>
          </p>
          <p>
            <span>Completion jobs sent / failed</span>
            <strong>
              {result.summary.completionSent} / {result.summary.completionFailed}
            </strong>
          </p>
        </div>
      ) : null}
    </Card>
  );
}

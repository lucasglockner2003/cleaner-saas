import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { PilotActionResult } from "./PilotActionResult";

function nextMondayIso() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const delta = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

export function WeekScheduleGeneratorPanel({ actions, mutationState, activeClients }) {
  const [weekStartDate, setWeekStartDate] = useState(nextMondayIso());
  const [maxClients, setMaxClients] = useState(Math.max(10, activeClients));
  const [clearExistingWeek, setClearExistingWeek] = useState(true);
  const [removeCompleted, setRemoveCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const isRunning = Boolean(mutationState.generatePilotWeekSchedule);

  function handleGenerate(event) {
    event.preventDefault();
    const runResult = actions.generatePilotWeekSchedule({
      weekStartDate,
      maxClients,
      clearExistingWeek,
      removeCompleted
    });
    setResult(runResult);
  }

  return (
    <Card title="2) Quick week schedule generator" subtitle="Build a full Monday-Friday dispatch board with one action.">
      <form className="form-grid" onSubmit={handleGenerate}>
        <label>
          Week start (Monday)
          <input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} required />
        </label>

        <label>
          Max active clients to place
          <input
            type="number"
            min={1}
            value={maxClients}
            onChange={(event) => setMaxClients(Number(event.target.value))}
          />
        </label>

        <label>
          Clear existing week visits
          <select value={clearExistingWeek ? "yes" : "no"} onChange={(event) => setClearExistingWeek(event.target.value === "yes")}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Remove completed week visits when clearing
          <select value={removeCompleted ? "yes" : "no"} onChange={(event) => setRemoveCompleted(event.target.value === "yes")}>
            <option value="no">No (preserve history)</option>
            <option value="yes">Yes (full reset)</option>
          </select>
        </label>

        <div className="form-actions span-2">
          <button type="submit" className="btn" disabled={isRunning}>
            {isRunning ? "Generating..." : "Generate week schedule"}
          </button>
        </div>
      </form>

      <PilotActionResult result={result} />
      {result?.summary ? (
        <div className="detail-list">
          <p>
            <span>Week range</span>
            <strong>
              {result.summary.weekStart} to {result.summary.weekEnd}
            </strong>
          </p>
          <p>
            <span>Created schedule days</span>
            <strong>{result.summary.createdScheduleDays}</strong>
          </p>
          <p>
            <span>Created visits</span>
            <strong>{result.summary.createdVisits}</strong>
          </p>
          <p>
            <span>Cleared visits</span>
            <strong>{result.summary.clearedVisits}</strong>
          </p>
        </div>
      ) : null}
    </Card>
  );
}

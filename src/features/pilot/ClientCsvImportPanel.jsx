import { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PilotActionResult } from "./PilotActionResult";

export function ClientCsvImportPanel({ actions, mutationState, clientsCount }) {
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState(null);
  const [loadedFileName, setLoadedFileName] = useState("");
  const csvTemplate = useMemo(() => actions.getPilotCsvTemplate(), [actions]);
  const csvSample = useMemo(
    () => (typeof actions.getPilotCsvSample === "function" ? actions.getPilotCsvSample() : ""),
    [actions]
  );
  const isRunning = Boolean(mutationState.importPilotClientsCsv);

  async function handleLoadFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setLoadedFileName(file.name);
    setResult(null);
  }

  function handleLoadTemplate() {
    setCsvText(csvTemplate);
    setLoadedFileName("template.csv");
    setResult(null);
  }

  function handleLoadSample() {
    if (!csvSample) {
      return;
    }
    setCsvText(csvSample);
    setLoadedFileName("pilot-clients-sample.csv");
    setResult(null);
  }

  function handleImport(event) {
    event.preventDefault();
    const runResult = actions.importPilotClientsCsv(csvText);
    setResult(runResult);
  }

  return (
    <Card title="1) CSV client import" subtitle="Paste or upload CSV to bulk-create pilot clients in minutes.">
      <form className="page-grid compact-grid" onSubmit={handleImport}>
        <div className="inline-actions">
          <button type="button" className="btn btn-ghost" onClick={handleLoadTemplate}>
            Load template
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLoadSample} disabled={!csvSample}>
            Load pilot sample
          </button>
          <label className="btn btn-ghost file-btn">
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={handleLoadFile} />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setCsvText("");
              setLoadedFileName("");
              setResult(null);
            }}
          >
            Clear
          </button>
        </div>

        <p className="muted">
          Current clients: {clientsCount}. {loadedFileName ? `Loaded file: ${loadedFileName}.` : "No file loaded."}
        </p>

        <label>
          CSV content
          <textarea
            className="input-textarea pilot-textarea"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder="full_name,phone,email,suburb,address,service_type,cleaning_frequency,estimated_duration_min"
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={isRunning || !csvText.trim()}>
            {isRunning ? "Importing..." : "Import clients from CSV"}
          </button>
        </div>
      </form>

      <PilotActionResult result={result} />
      {result?.summary ? (
        <div className="detail-list">
          <p>
            <span>Rows processed</span>
            <strong>{result.summary.rows}</strong>
          </p>
          <p>
            <span>Imported</span>
            <strong>{result.summary.imported}</strong>
          </p>
          <p>
            <span>Failed</span>
            <strong>{result.summary.failed}</strong>
          </p>
        </div>
      ) : null}
    </Card>
  );
}

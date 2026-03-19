export function PilotActionResult({ result }) {
  if (!result) {
    return null;
  }

  if (!result.ok) {
    return (
      <div className="pilot-result is-error">
        <strong>Action failed</strong>
        <p>{result.message || "The tooling action did not complete."}</p>
        {result.errors?.root ? <p className="muted">{result.errors.root}</p> : null}
      </div>
    );
  }

  return (
    <div className="pilot-result is-success">
      <strong>Action completed</strong>
      <p>{result.message}</p>
    </div>
  );
}

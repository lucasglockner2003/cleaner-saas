export function ConfigStatusBanner({ report }) {
  if (!report || (report.criticalIssues.length === 0 && report.warnings.length === 0)) {
    return null;
  }

  const hasCritical = report.criticalIssues.length > 0;

  return (
    <div className={`sync-banner ${hasCritical ? "is-critical-config" : ""}`}>
      <div>
        <p>
          {hasCritical
            ? `Configuration blockers: ${report.criticalIssues.length}`
            : `Configuration warnings: ${report.warnings.length}`}
        </p>
        {hasCritical ? (
          <p className="muted">{report.criticalIssues[0]}</p>
        ) : (
          <p className="muted">{report.warnings[0]}</p>
        )}
      </div>
    </div>
  );
}

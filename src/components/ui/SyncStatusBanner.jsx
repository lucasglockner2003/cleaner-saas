export function SyncStatusBanner({ persistence, onRetry }) {
  if (!persistence || persistence.syncState.status === "healthy") {
    return null;
  }

  return (
    <div className="sync-banner">
      <div>
        <p>Data sync needs attention ({persistence.mode} mode).</p>
        <p className="muted">{persistence.syncState.error || "Last sync attempt failed."}</p>
      </div>
      <button type="button" className="btn btn-ghost" onClick={onRetry}>
        Retry sync
      </button>
    </div>
  );
}

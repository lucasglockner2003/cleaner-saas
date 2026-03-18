export function SyncStatusBanner({ persistence, onRetry }) {
  if (!persistence || persistence.syncState.status === "healthy") {
    return null;
  }

  return (
    <div className="sync-banner">
      <p>
        Persistence mode: {persistence.mode}. Sync issue: {persistence.syncState.error}
      </p>
      <button type="button" className="btn btn-ghost" onClick={onRetry}>
        Retry sync
      </button>
    </div>
  );
}


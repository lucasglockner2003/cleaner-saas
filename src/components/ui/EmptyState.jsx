export function EmptyState({ title, message, actionLabel = "", onAction = null }) {
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      <p>{message}</p>
      {actionLabel && typeof onAction === "function" ? (
        <button type="button" className="btn btn-ghost" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

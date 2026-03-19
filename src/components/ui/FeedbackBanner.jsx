export function FeedbackBanner({ feedback, onDismiss }) {
  if (!feedback?.message) {
    return null;
  }

  const isError = feedback.type === "error";
  const title = isError ? "Action needs attention" : "Update saved";
  const timeLabel =
    typeof feedback.at === "number"
      ? new Intl.DateTimeFormat("en-NZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(feedback.at))
      : null;

  return (
    <div className={`feedback-banner ${isError ? "is-error" : "is-success"}`}>
      <div>
        <strong>{title}</strong>
        <p>{feedback.message}</p>
        {timeLabel ? <p className="muted">Logged at {timeLabel}</p> : null}
      </div>
      <button type="button" className="btn btn-ghost" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

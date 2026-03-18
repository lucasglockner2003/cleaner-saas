export function FeedbackBanner({ feedback, onDismiss }) {
  if (!feedback?.message) {
    return null;
  }

  return (
    <div className={`feedback-banner ${feedback.type === "error" ? "is-error" : "is-success"}`}>
      <p>{feedback.message}</p>
      <button type="button" className="btn btn-ghost" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}


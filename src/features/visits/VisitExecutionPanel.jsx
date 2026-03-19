import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/dateTime";

function tone(status) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "neutral";
  if (status === "cancelled") return "danger";
  return "muted";
}

function communicationTone(status) {
  if (status === "sent" || status === "uploaded") return "success";
  if (status === "queued" || status === "retry_scheduled" || status === "sending") return "warning";
  if (status === "failed") return "danger";
  if (status === "not_queued") return "neutral";
  return "muted";
}

export function VisitExecutionPanel({
  snapshot,
  onStart,
  onFinish,
  onCancel,
  onReopen,
  onSaveNotes,
  onAddPhoto,
  canManageLifecycle,
  onQueueCompletionEmail,
  onRetryCompletionJob,
  mutationState
}) {
  const [notes, setNotes] = useState(snapshot?.visit.visit_notes ?? "");
  const [beforeFileName, setBeforeFileName] = useState("");
  const [afterFileName, setAfterFileName] = useState("");
  const [inlineError, setInlineError] = useState("");
  const [inlineMessage, setInlineMessage] = useState("");

  useEffect(() => {
    setNotes(snapshot?.visit.visit_notes ?? "");
    setBeforeFileName("");
    setAfterFileName("");
    setInlineError("");
    setInlineMessage("");
  }, [snapshot?.visit.id, snapshot?.visit.visit_notes]);

  if (!snapshot) {
    return <EmptyState title="Select a visit" message="Choose a row from visit history to open execution controls." />;
  }

  const { visit, beforePhotos, afterPhotos, metrics, proofTimeline } = snapshot;
  const baseNotes = snapshot?.visit.visit_notes ?? "";
  const notesChanged = notes.trim() !== baseNotes.trim();
  const startPending = Boolean(mutationState?.startVisit);
  const finishPending = Boolean(mutationState?.finishVisit);
  const cancelPending = Boolean(mutationState?.cancelVisit);
  const reopenPending = Boolean(mutationState?.reopenVisit);
  const saveNotesPending = Boolean(mutationState?.updateVisitNotes);
  const addPhotoPending = Boolean(mutationState?.addVisitPhoto);
  const queueCompletionPending = Boolean(mutationState?.queueCompletionEmail);
  const retryCompletionPending = Boolean(mutationState?.retryCompletionJob);

  function setResultFeedback(result, successMessage) {
    if (result?.ok === false) {
      setInlineError(result.message || "Action failed.");
      setInlineMessage("");
      return false;
    }
    setInlineError("");
    setInlineMessage(successMessage);
    return true;
  }

  function handleSaveNotes() {
    const result = onSaveNotes(visit.id, notes);
    setResultFeedback(result, "Visit notes saved.");
  }

  function handleAddPhoto(phase, fileName) {
    const normalized = String(fileName || "").trim();
    if (!normalized) {
      setInlineError("Enter a file name before adding proof metadata.");
      setInlineMessage("");
      return;
    }

    const result = onAddPhoto(visit.id, phase, normalized);
    const ok = setResultFeedback(result, `${phase === "before" ? "Before" : "After"} proof metadata added.`);
    if (ok) {
      if (phase === "before") {
        setBeforeFileName("");
      } else {
        setAfterFileName("");
      }
    }
  }

  function handleQueueCompletion() {
    const result = onQueueCompletionEmail(visit.id);
    setResultFeedback(result, "Completion email queued.");
  }

  function handleRetryCompletion() {
    const result = onRetryCompletionJob(visit.completion_job_id);
    setResultFeedback(result, "Completion email retry scheduled.");
  }

  function getNextStepMessage() {
    if (visit.status === "scheduled") {
      return "Next step: start house when cleaner arrives.";
    }
    if (visit.status === "in_progress") {
      return "Next step: finish house, save final notes, and check proof readiness.";
    }
    if (visit.status === "completed" && visit.completion_communication_status === "not_queued") {
      return "Next step: queue completion email and verify proof/invoice linkage.";
    }
    if (visit.status === "completed") {
      return "Completed flow: verify communication status and close remaining proof gaps.";
    }
    if (visit.status === "cancelled") {
      return canManageLifecycle ? "Visit cancelled. Reopen only if customer confirms reinstatement." : "Visit cancelled by operations.";
    }
    return "Review visit details and continue workflow.";
  }

  return (
    <div className="page-grid compact-grid">
      <div className="history-row">
        <div>
          <h4>{visit.client_name}</h4>
          <p className="muted">
            {visit.date} - {visit.team_name} - {visit.employee_name}
          </p>
        </div>
        <Badge value={visit.status} tone={tone(visit.status)} />
      </div>

      <div className="visit-next-step">{getNextStepMessage()}</div>

      <div className="detail-list">
        <p>
          <span>Estimated window</span>
          <strong>
            {visit.estimated_start} - {visit.estimated_end}
          </strong>
        </p>
        <p>
          <span>Actual start</span>
          <strong>{formatDateTime(visit.actual_start)}</strong>
        </p>
        <p>
          <span>Actual finish</span>
          <strong>{formatDateTime(visit.actual_finish)}</strong>
        </p>
        <p>
          <span>Lateness</span>
          <strong>{metrics.latenessMin == null ? "-" : `${metrics.latenessMin} min`}</strong>
        </p>
        <p>
          <span>Duration delta</span>
          <strong>
            {metrics.deltaMin == null ? "-" : `${metrics.deltaMin > 0 ? "+" : ""}${metrics.deltaMin} min`}
          </strong>
        </p>
        <p>
          <span>Proof readiness</span>
          <strong>{metrics.proofReady ? "Ready" : "Pending proof"}</strong>
        </p>
        <p>
          <span>Completion email</span>
          <strong>
            <Badge value={visit.completion_communication_status} tone={communicationTone(visit.completion_communication_status)} />
          </strong>
        </p>
        <p>
          <span>Linked invoice</span>
          <strong>{visit.linked_invoice_number || visit.linked_invoice_id || "Pending"}</strong>
        </p>
      </div>

      {inlineError ? <p className="field-error">{inlineError}</p> : null}
      {inlineMessage ? <p className="success-inline">{inlineMessage}</p> : null}

      <div className="inline-actions">
        {visit.status === "scheduled" ? (
          <button className="btn" onClick={() => onStart(visit.id)} disabled={startPending || cancelPending}>
            {startPending ? "Starting..." : "Start house"}
          </button>
        ) : null}
        {visit.status === "in_progress" ? (
          <button className="btn" onClick={() => onFinish(visit.id)} disabled={finishPending || cancelPending}>
            {finishPending ? "Finishing..." : "Finish house"}
          </button>
        ) : null}
        {canManageLifecycle && (visit.status === "scheduled" || visit.status === "in_progress") ? (
          <button className="btn btn-ghost" onClick={() => onCancel(visit.id)} disabled={cancelPending || startPending || finishPending}>
            {cancelPending ? "Cancelling..." : "Cancel"}
          </button>
        ) : null}
        {canManageLifecycle && visit.status === "cancelled" ? (
          <button className="btn btn-ghost" onClick={() => onReopen(visit.id)} disabled={reopenPending}>
            {reopenPending ? "Reopening..." : "Reopen"}
          </button>
        ) : null}
        {visit.status === "completed" && visit.completion_communication_status === "not_queued" ? (
          <button className="btn btn-ghost" onClick={handleQueueCompletion} disabled={queueCompletionPending}>
            {queueCompletionPending ? "Queueing..." : "Queue completion email"}
          </button>
        ) : null}
        {visit.status === "completed" &&
        (visit.completion_communication_status === "failed" || visit.completion_communication_status === "retry_scheduled") &&
        visit.completion_job_id ? (
          <button className="btn btn-ghost" onClick={handleRetryCompletion} disabled={retryCompletionPending}>
            {retryCompletionPending ? "Scheduling retry..." : "Retry completion email"}
          </button>
        ) : null}
      </div>

      <label>
        Service notes
        <textarea
          className="input-textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add details about execution quality, incident, or customer request."
        />
      </label>
      <div className="form-actions">
        <button className="btn btn-ghost" onClick={handleSaveNotes} disabled={!notesChanged || saveNotesPending}>
          {saveNotesPending ? "Saving notes..." : "Save notes"}
        </button>
      </div>

      <div className="split-grid">
        <div className="proof-column">
          <h4>Before proof ({beforePhotos.length})</h4>
          <div className="inline-actions">
            <input
              value={beforeFileName}
              onChange={(event) => setBeforeFileName(event.target.value)}
              placeholder="before-kitchen.jpg"
            />
            <button className="btn" onClick={() => handleAddPhoto("before", beforeFileName)} disabled={addPhotoPending}>
              {addPhotoPending ? "Adding..." : "Add"}
            </button>
          </div>
          {beforePhotos.length ? (
            <ul className="simple-list">
              {beforePhotos.map((photo) => (
                <li key={photo.id}>
                  {photo.file_name} ({photo.upload_status})
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No before proof yet.</p>
          )}
        </div>

        <div className="proof-column">
          <h4>After proof ({afterPhotos.length})</h4>
          <div className="inline-actions">
            <input
              value={afterFileName}
              onChange={(event) => setAfterFileName(event.target.value)}
              placeholder="after-kitchen.jpg"
            />
            <button className="btn" onClick={() => handleAddPhoto("after", afterFileName)} disabled={addPhotoPending}>
              {addPhotoPending ? "Adding..." : "Add"}
            </button>
          </div>
          {afterPhotos.length ? (
            <ul className="simple-list">
              {afterPhotos.map((photo) => (
                <li key={photo.id}>
                  {photo.file_name} ({photo.upload_status})
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No after proof yet.</p>
          )}
        </div>
      </div>

      <div className="proof-column">
        <h4>Proof timeline</h4>
        {proofTimeline.length ? (
          <div className="stack-list">
            {proofTimeline.map((item) => (
              <article key={item.id} className="row-item">
                <div>
                  <strong>{item.phase.toUpperCase()}</strong>
                  <p className="muted">
                    {item.file_name} | {item.room} / {item.angle}
                  </p>
                  <p className="muted">{formatDateTime(item.captured_at)}</p>
                </div>
                <Badge value={item.upload_status} tone={communicationTone(item.upload_status)} />
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No proof files recorded for this visit yet.</p>
        )}
      </div>
    </div>
  );
}

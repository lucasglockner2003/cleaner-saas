import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/dateTime";

export function ClientNotesPanel({ notes, onAddNote, onSetNoteActive }) {
  const [noteType, setNoteType] = useState("instruction");
  const [noteBody, setNoteBody] = useState("");
  const [errors, setErrors] = useState({});

  function submitNote(event) {
    event.preventDefault();
    const result = onAddNote({
      note_type: noteType,
      body: noteBody
    });

    if (!result?.ok) {
      setErrors(result.errors ?? {});
      return;
    }

    setErrors({});
    setNoteBody("");
    setNoteType("instruction");
  }

  return (
    <div className="page-grid compact-grid">
      <form className="form-grid note-form" onSubmit={submitNote}>
        <label>
          Note type
          <select value={noteType} onChange={(event) => setNoteType(event.target.value)}>
            <option value="instruction">Instruction</option>
            <option value="security">Security</option>
            <option value="special_request">Special request</option>
            <option value="incident">Incident</option>
            <option value="proof">Proof</option>
          </select>
        </label>

        <label className="span-2">
          Add note
          <input
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Dog inside house / alarm code on file / call before arrival"
          />
          {errors.body ? <span className="field-error">{errors.body}</span> : null}
        </label>

        <div className="form-actions span-2">
          <button type="submit" className="btn">
            Add note
          </button>
        </div>
      </form>

      {notes.length ? (
        <div className="stack-list">
          {notes.map((note) => (
            <article key={note.id} className={`note-item ${note.is_active ? "" : "is-inactive"}`.trim()}>
              <div className="note-item-head">
                <Badge value={note.note_type} tone={note.is_active ? "accent" : "muted"} />
                <span className="muted">{formatDateTime(note.created_at)}</span>
              </div>
              <p>{note.body}</p>
              <div className="inline-actions">
                {note.is_active ? (
                  <button type="button" className="btn btn-ghost" onClick={() => onSetNoteActive(note.id, false)}>
                    Archive
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => onSetNoteActive(note.id, true)}>
                    Restore
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No service notes yet" message="Add dispatch notes to improve house execution consistency." />
      )}
    </div>
  );
}


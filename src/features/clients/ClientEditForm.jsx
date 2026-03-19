import { useEffect, useState } from "react";
import { ClientFormFields } from "./ClientFormFields";
import { normalizeClientForm } from "./clientFormDefaults";

export function ClientEditForm({ client, serviceTypes, onSave, onCancel }) {
  const [form, setForm] = useState(() => normalizeClientForm(client));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const errorMessages = Object.values(errors || {}).filter(Boolean);

  useEffect(() => {
    setForm(normalizeClientForm(client));
    setErrors({});
  }, [client]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));

    setErrors((current) => ({
      ...current,
      [key]: undefined
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await Promise.resolve(onSave(form));

      if (!result?.ok) {
        setErrors(result.errors ?? {});
        return;
      }

      setErrors({});
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <ClientFormFields form={form} errors={errors} serviceTypes={serviceTypes} onChange={updateField} />
      {errorMessages.length ? (
        <div className="span-2 validation-summary">
          <strong>Update blocked by validation:</strong>
          <ul className="simple-list">
            {errorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="form-actions split-actions span-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save client updates"}
        </button>
      </div>
    </form>
  );
}

import { useEffect, useState } from "react";
import { ClientFormFields } from "./ClientFormFields";
import { normalizeClientForm } from "./clientFormDefaults";

export function ClientEditForm({ client, serviceTypes, onSave, onCancel }) {
  const [form, setForm] = useState(() => normalizeClientForm(client));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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

  function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    const result = onSave(form);
    setIsSaving(false);

    if (!result?.ok) {
      setErrors(result.errors ?? {});
      return;
    }

    setErrors({});
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <ClientFormFields form={form} errors={errors} serviceTypes={serviceTypes} onChange={updateField} />
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


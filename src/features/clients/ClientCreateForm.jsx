import { useState } from "react";
import { CLIENT_FORM_DEFAULTS, normalizeClientForm } from "./clientFormDefaults";
import { ClientFormFields } from "./ClientFormFields";

export function ClientCreateForm({ serviceTypes, onCreate }) {
  const [form, setForm] = useState(CLIENT_FORM_DEFAULTS);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    const result = onCreate(form);
    setIsSubmitting(false);

    if (!result?.ok) {
      setErrors(result.errors ?? {});
      return;
    }

    setForm(normalizeClientForm());
    setErrors({});
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <ClientFormFields form={form} errors={errors} serviceTypes={serviceTypes} onChange={updateField} />

      <div className="form-actions span-2">
        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Register client"}
        </button>
      </div>
    </form>
  );
}

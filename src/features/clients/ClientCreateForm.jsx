import { useState } from "react";
import { CLIENT_FORM_DEFAULTS, normalizeClientForm } from "./clientFormDefaults";
import { ClientFormFields } from "./ClientFormFields";

export function ClientCreateForm({ serviceTypes, onCreate }) {
  const [form, setForm] = useState(CLIENT_FORM_DEFAULTS);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorMessages = Object.values(errors || {}).filter(Boolean);

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
    setIsSubmitting(true);
    try {
      const result = await Promise.resolve(onCreate(form));

      if (!result?.ok) {
        setErrors(result.errors ?? {});
        return;
      }

      setForm(normalizeClientForm());
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <p className="muted span-2">
        Minimum for dispatch onboarding: full name, phone, suburb, full address, service type, and estimated duration.
      </p>
      <ClientFormFields form={form} errors={errors} serviceTypes={serviceTypes} onChange={updateField} />
      {errorMessages.length ? (
        <div className="span-2 validation-summary">
          <strong>Please fix the following before saving:</strong>
          <ul className="simple-list">
            {errorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="form-actions span-2">
        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Register client"}
        </button>
      </div>
    </form>
  );
}

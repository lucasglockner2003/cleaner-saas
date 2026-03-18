function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

export function ClientFormFields({ form, errors, serviceTypes, onChange }) {
  function updateField(key, value) {
    onChange(key, value);
  }

  return (
    <>
      <label>
        Full name
        <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} required />
        <FieldError message={errors.full_name} />
      </label>

      <label>
        Phone
        <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
        <FieldError message={errors.phone} />
      </label>

      <label>
        Email
        <input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        <FieldError message={errors.email} />
      </label>

      <label>
        Suburb
        <input value={form.suburb} onChange={(event) => updateField("suburb", event.target.value)} required />
        <FieldError message={errors.suburb} />
      </label>

      <label className="span-2">
        Full address
        <input value={form.address} onChange={(event) => updateField("address", event.target.value)} required />
        <FieldError message={errors.address} />
      </label>

      <label>
        Service type
        <select value={form.service_type_id} onChange={(event) => updateField("service_type_id", event.target.value)}>
          {serviceTypes.map((serviceType) => (
            <option key={serviceType.id} value={serviceType.id}>
              {serviceType.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.service_type_id} />
      </label>

      <label>
        Frequency
        <select
          value={form.cleaning_frequency}
          onChange={(event) => updateField("cleaning_frequency", event.target.value)}
        >
          <option value="Weekly">Weekly</option>
          <option value="Fortnightly">Fortnightly</option>
          <option value="Monthly">Monthly</option>
          <option value="One-off">One-off</option>
        </select>
        <FieldError message={errors.cleaning_frequency} />
      </label>

      <label>
        Estimated duration (min)
        <input
          type="number"
          min={30}
          value={form.estimated_duration_min}
          onChange={(event) => updateField("estimated_duration_min", Number(event.target.value))}
        />
        <FieldError message={errors.estimated_duration_min} />
      </label>

      <label className="span-2">
        Notes summary
        <input
          value={form.notes_summary}
          onChange={(event) => updateField("notes_summary", event.target.value)}
          placeholder="Client asked to clean the oven"
        />
      </label>

      <label className="span-2">
        Special instructions
        <input
          value={form.special_instructions}
          onChange={(event) => updateField("special_instructions", event.target.value)}
          placeholder="Call before arrival, dog inside house, alarm code on file"
        />
      </label>

      {errors.root ? (
        <p className="field-error span-2">{errors.root}</p>
      ) : null}
    </>
  );
}


import { useState } from "react";

const initialState = {
  full_name: "",
  phone: "",
  email: "",
  suburb: "",
  address: "",
  service_type_id: "st-regular",
  cleaning_frequency: "Weekly",
  estimated_duration_min: 90,
  notes_summary: "",
  special_instructions: ""
};

export function ClientCreateForm({ serviceTypes, onCreate }) {
  const [form, setForm] = useState(initialState);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.full_name || !form.phone || !form.suburb || !form.address) {
      return;
    }

    onCreate(form);
    setForm(initialState);
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        Full name
        <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} required />
      </label>

      <label>
        Phone
        <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
      </label>

      <label>
        Email
        <input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
      </label>

      <label>
        Suburb
        <input value={form.suburb} onChange={(event) => updateField("suburb", event.target.value)} required />
      </label>

      <label className="span-2">
        Full address
        <input value={form.address} onChange={(event) => updateField("address", event.target.value)} required />
      </label>

      <label>
        Service type
        <select
          value={form.service_type_id}
          onChange={(event) => updateField("service_type_id", event.target.value)}
        >
          {serviceTypes.map((serviceType) => (
            <option key={serviceType.id} value={serviceType.id}>
              {serviceType.name}
            </option>
          ))}
        </select>
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
      </label>

      <label>
        Estimated duration (min)
        <input
          type="number"
          min={30}
          value={form.estimated_duration_min}
          onChange={(event) => updateField("estimated_duration_min", Number(event.target.value))}
        />
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

      <div className="form-actions span-2">
        <button type="submit" className="btn">
          Register client
        </button>
      </div>
    </form>
  );
}


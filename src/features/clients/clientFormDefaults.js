export const CLIENT_FORM_DEFAULTS = {
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

export function normalizeClientForm(initial = {}) {
  return {
    ...CLIENT_FORM_DEFAULTS,
    ...initial,
    estimated_duration_min: Number(initial.estimated_duration_min ?? CLIENT_FORM_DEFAULTS.estimated_duration_min)
  };
}


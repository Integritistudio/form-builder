const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSubmission(schema, data) {
  const errors = {};
  const fields = schema?.fields || [];

  for (const field of fields) {
    if (field.type === "heading" || field.type === "paragraph") continue;

    const value = data[field.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }

    if (isEmpty) continue;

    if (field.type === "email" && !EMAIL_REGEX.test(String(value))) {
      errors[field.id] = "Enter a valid email address";
    }

    if (field.type === "number" && Number.isNaN(Number(value))) {
      errors[field.id] = "Enter a valid number";
    }

    const strVal = String(value);
    if (field.minLength && strVal.length < field.minLength) {
      errors[field.id] = `Minimum ${field.minLength} characters`;
    }
    if (field.maxLength && strVal.length > field.maxLength) {
      errors[field.id] = `Maximum ${field.maxLength} characters`;
    }
  }

  return errors;
}

export function formatSubmissionForDisplay(schema, payload) {
  const rows = [];
  for (const field of schema?.fields || []) {
    if (field.type === "heading" || field.type === "paragraph") continue;
    let value = payload[field.id];
    if (Array.isArray(value)) value = value.join(", ");
    if (field.type === "checkbox") value = value ? "Yes" : "No";
    rows.push({ label: field.label, value: value ?? "" });
  }
  return rows;
}

import { useState } from "react";
import { getFormStyles } from "./formStyles.js";

export default function FormRenderer({
  schema,
  styles,
  customCss = "",
  formId = "preview",
  preview = false,
  onSubmit,
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const scopeClass = `integriti-form integriti-form-${formId}`;
  const css = getFormStyles(styles, customCss, formId);

  function setValue(fieldId, value) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function toggleCheckboxGroup(fieldId, option, checked) {
    const current = values[fieldId] || [];
    const next = checked
      ? [...current, option]
      : current.filter((v) => v !== option);
    setValue(fieldId, next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (preview) return;

    setSubmitting(true);
    setFormError("");
    try {
      if (onSubmit) {
        await onSubmit(values);
        setSuccess(true);
      }
    } catch (err) {
      if (err.data?.errors) {
        setErrors(err.data.errors);
      } else {
        setFormError(err.message || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={scopeClass}>
        <style>{css}</style>
        <div className="integriti-form-success">
          {schema?.successMessage || "Thank you for your submission."}
        </div>
      </div>
    );
  }

  return (
    <div className={scopeClass}>
      <style>{css}</style>
      {schema?.title && <h2 className="integriti-form-title">{schema.title}</h2>}
      {schema?.description && (
        <p className="integriti-form-description">{schema.description}</p>
      )}
      {formError && <div className="integriti-form-error">{formError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="_hp_field"
          className="integriti-hp"
          tabIndex={-1}
          autoComplete="off"
        />
        <div className="integriti-form-fields">
          {(schema?.fields || []).map((field) => (
            <Field
              key={field.id}
              field={field}
              value={values[field.id]}
              error={errors[field.id]}
              preview={preview}
              onChange={setValue}
              onToggleGroup={toggleCheckboxGroup}
            />
          ))}
        </div>
        <button
          type="submit"
          className="integriti-submit"
          disabled={submitting || preview}
        >
          {submitting ? "Sending..." : schema?.submitLabel || "Submit"}
        </button>
      </form>
    </div>
  );
}

function Field({ field, value, error, preview, onChange, onToggleGroup }) {
  const widthClass =
    field.width === "half" ? "integriti-field--half" : "integriti-field--full";

  if (field.type === "heading") {
    return (
      <div className={`integriti-field ${widthClass}`}>
        <h3 className="integriti-heading">{field.label}</h3>
      </div>
    );
  }

  if (field.type === "paragraph") {
    return (
      <div className={`integriti-field ${widthClass}`}>
        <p className="integriti-paragraph">{field.label}</p>
      </div>
    );
  }

  const inputId = `field-${field.id}`;

  return (
    <div className={`integriti-field ${widthClass}`}>
      <label className="integriti-label" htmlFor={inputId}>
        {field.label}
        {field.required && " *"}
      </label>

      {field.type === "textarea" && (
        <textarea
          id={inputId}
          className="integriti-textarea"
          placeholder={field.placeholder}
          value={value || ""}
          disabled={preview}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {["text", "email", "tel", "number", "date"].includes(field.type) && (
        <input
          id={inputId}
          type={field.type}
          className="integriti-input"
          placeholder={field.placeholder}
          value={value || ""}
          disabled={preview}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {field.type === "select" && (
        <select
          id={inputId}
          className="integriti-select"
          value={value || ""}
          disabled={preview}
          onChange={(e) => onChange(field.id, e.target.value)}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === "radio" && (
        <div className="integriti-options" role="radiogroup">
          {(field.options || []).map((opt) => (
            <label key={opt} className="integriti-option">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                disabled={preview}
                onChange={() => onChange(field.id, opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.type === "checkbox" && (
        <label className="integriti-option">
          <input
            id={inputId}
            type="checkbox"
            checked={Boolean(value)}
            disabled={preview}
            onChange={(e) => onChange(field.id, e.target.checked)}
          />
          {field.placeholder || field.label}
        </label>
      )}

      {field.type === "checkbox_group" && (
        <div className="integriti-options">
          {(field.options || []).map((opt) => (
            <label key={opt} className="integriti-option">
              <input
                type="checkbox"
                checked={(value || []).includes(opt)}
                disabled={preview}
                onChange={(e) =>
                  onToggleGroup(field.id, opt, e.target.checked)
                }
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.helpText && <p className="integriti-help">{field.helpText}</p>}
      {error && <p className="integriti-error">{error}</p>}
    </div>
  );
}

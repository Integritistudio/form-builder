import { useState, useEffect } from "react";
import { getFormStyles } from "./formStyles.js";
import { fieldClassName } from "../../../lib/formDefaults.js";
import {
  isMultiStepActive,
  getStepFieldGroups,
  validateStepFieldsSync,
} from "../../../lib/multiStep.js";

function StepProgress({
  schema,
  currentStep,
  totalSteps,
  onStepClick,
  interactive,
}) {
  const config = schema.multiStep || {};
  if (!config.showProgress) return null;

  const style = config.progressStyle || "bar";
  const pct = Math.round(((currentStep + 1) / totalSteps) * 100);
  const steps = schema.steps || [];

  function stepClass(index, base) {
    let cls = base;
    if (index === currentStep) cls += ` ${base}--active`;
    else if (index < currentStep) cls += ` ${base}--done`;
    return cls;
  }

  if (style === "pills") {
    return (
      <div className="integriti-step-pills" role="list" aria-label="Form progress">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            role="listitem"
            className={stepClass(i, "integriti-step-pill")}
            disabled={!interactive}
            onClick={() => interactive && onStepClick?.(i)}
          >
            <span className="integriti-step-pill-num">{i + 1}</span>
            <span className="integriti-step-pill-text">{step.title}</span>
          </button>
        ))}
      </div>
    );
  }

  if (style === "dots") {
    return (
      <div className="integriti-step-dots" aria-hidden>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={stepClass(i, "integriti-step-dot")} />
        ))}
      </div>
    );
  }

  if (style === "numbered") {
    return (
      <div className="integriti-step-numbered" role="list" aria-label="Form progress">
        {steps.map((step, i) => (
          <div key={step.id} className="integriti-step-numbered-item">
            {i > 0 && (
              <span
                className={`integriti-step-connector${
                  i <= currentStep ? " integriti-step-connector--done" : ""
                }`}
                aria-hidden
              />
            )}
            <button
              type="button"
              role="listitem"
              className={stepClass(i, "integriti-step-number")}
              disabled={!interactive}
              onClick={() => interactive && onStepClick?.(i)}
            >
              <span className="integriti-step-number-badge">{i + 1}</span>
              <span className="integriti-step-number-label">{step.title}</span>
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="integriti-step-progress">
      <div className="integriti-step-progress-label">
        <span>
          Step {currentStep + 1} of {totalSteps}
          {steps[currentStep]?.title ? ` — ${steps[currentStep].title}` : ""}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="integriti-step-progress-track">
        <div
          className="integriti-step-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function FormRenderer({
  schema,
  styles,
  customCss = "",
  formId = "preview",
  preview = false,
  onSubmit,
  uploadFile,
  stepIndex,
  onStepChange,
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState({});
  const [internalStep, setInternalStep] = useState(0);

  const multiStep = isMultiStepActive(schema);
  const stepGroups = multiStep ? getStepFieldGroups(schema) : [];
  const totalSteps = multiStep ? stepGroups.length : 1;
  const isControlled = stepIndex !== undefined && stepIndex !== null;
  const currentStep = isControlled
    ? Math.min(stepIndex, totalSteps - 1)
    : internalStep;
  const activeGroup = multiStep ? stepGroups[currentStep] : null;
  const visibleFields = multiStep
    ? activeGroup?.fields || []
    : schema?.fields || [];
  const isLastStep = !multiStep || currentStep >= totalSteps - 1;
  const stepConfig = schema?.multiStep || {};

  useEffect(() => {
    if (!multiStep) {
      setInternalStep(0);
    }
  }, [multiStep]);

  useEffect(() => {
    if (isControlled && stepIndex > totalSteps - 1) {
      onStepChange?.(Math.max(0, totalSteps - 1));
    }
  }, [isControlled, stepIndex, totalSteps, onStepChange]);

  const scopeClass = `integriti-form integriti-form-${formId}`;
  const css = getFormStyles(styles, customCss, formId);

  function setStep(next) {
    const clamped = Math.max(0, Math.min(next, totalSteps - 1));
    if (isControlled) onStepChange?.(clamped);
    else setInternalStep(clamped);
  }

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

  async function handleFileChange(field, file) {
    if (!file) {
      setValue(field.id, null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        [field.id]: "File must be 2 MB or smaller.",
      }));
      return;
    }
    if (preview) return;

    setUploading((prev) => ({ ...prev, [field.id]: true }));
    try {
      if (uploadFile) {
        const result = await uploadFile(field.id, file);
        setValue(field.id, {
          fileId: result.fileId,
          originalName: file.name,
          mimeType: file.type,
        });
      } else {
        setValue(field.id, { originalName: file.name, mimeType: file.type });
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [field.id]: err.message || "Upload failed",
      }));
    } finally {
      setUploading((prev) => ({ ...prev, [field.id]: false }));
    }
  }

  function validateCurrentStep() {
    if (!multiStep) return true;
    const stepId = activeGroup?.step?.id;
    const stepErrors = validateStepFieldsSync(schema, stepId, values);
    setErrors((prev) => {
      const next = { ...prev };
      visibleFields.forEach((f) => delete next[f.id]);
      return { ...next, ...stepErrors };
    });
    return Object.keys(stepErrors).length === 0;
  }

  function handleNext() {
    if (!preview && !validateCurrentStep()) return;
    setFormError("");
    setStep(currentStep + 1);
  }

  function handleBack() {
    setFormError("");
    setErrors({});
    setStep(currentStep - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (multiStep && !isLastStep) {
      handleNext();
      return;
    }

    if (preview) return;

    if (multiStep && !validateCurrentStep()) return;

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

  const hasHeader = schema?.title || schema?.description;
  const showStepHeader =
    multiStep &&
    stepConfig.showStepTitles !== false &&
    activeGroup?.step &&
    (activeGroup.step.title || activeGroup.step.description);

  const nextLabel = isLastStep
    ? schema?.submitLabel || "Submit"
    : activeGroup?.step?.nextLabel || "Continue";

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

  const showPreviewHint = preview && multiStep;

  return (
    <div className={scopeClass}>
      <style>{css}</style>
      {hasHeader && (
        <div className="integriti-form-header">
          {schema?.title && (
            <h2 className="integriti-form-title">{schema.title}</h2>
          )}
          {schema?.description && (
            <p className="integriti-form-description">{schema.description}</p>
          )}
        </div>
      )}
      {multiStep && (
        <StepProgress
          schema={schema}
          currentStep={currentStep}
          totalSteps={totalSteps}
          interactive={preview}
          onStepClick={setStep}
        />
      )}
      {showStepHeader && (
        <div className="integriti-step-header">
          {activeGroup.step.title && (
            <h3 className="integriti-step-title">{activeGroup.step.title}</h3>
          )}
          {activeGroup.step.description && (
            <p className="integriti-step-description">
              {activeGroup.step.description}
            </p>
          )}
        </div>
      )}
      {showPreviewHint && (
        <p className="integriti-preview-hint">
          Preview mode — click steps above or use Next / Back to explore each page.
        </p>
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
        <div
          className={`integriti-form-fields${
            multiStep && stepConfig.animateTransitions !== false
              ? " integriti-step-fields"
              : ""
          }`}
          key={multiStep ? currentStep : "single"}
        >
          {visibleFields.length === 0 ? (
            <div className="integriti-step-empty">
              This step has no fields yet. Add fields in the form editor and assign
              them to this step.
            </div>
          ) : (
            visibleFields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={values[field.id]}
                error={errors[field.id]}
                preview={preview}
                uploading={uploading[field.id]}
                onChange={setValue}
                onToggleGroup={toggleCheckboxGroup}
                onFileChange={handleFileChange}
              />
            ))
          )}
        </div>
        {multiStep ? (
          <div
            className={`integriti-step-nav${
              stepConfig.allowBack !== false && currentStep > 0
                ? " integriti-step-nav--split"
                : ""
            }`}
          >
            {stepConfig.allowBack !== false && currentStep > 0 && (
              <button
                type="button"
                className="integriti-btn-back"
                onClick={handleBack}
              >
                {stepConfig.backLabel || "Back"}
              </button>
            )}
            {isLastStep ? (
              <button
                type="submit"
                className="integriti-btn-next"
                disabled={
                  (!preview && submitting) ||
                  Object.values(uploading).some(Boolean)
                }
                title={preview ? "Submit is disabled in preview" : undefined}
              >
                {preview ? nextLabel : submitting ? "Sending..." : nextLabel}
              </button>
            ) : (
              <button
                type="button"
                className="integriti-btn-next"
                onClick={handleNext}
                disabled={Object.values(uploading).some(Boolean)}
              >
                {nextLabel}
              </button>
            )}
          </div>
        ) : (
          <button
            type="submit"
            className="integriti-submit"
            disabled={
              preview ||
              submitting ||
              Object.values(uploading).some(Boolean)
            }
          >
            {schema?.submitLabel || "Submit"}
          </button>
        )}
      </form>
    </div>
  );
}

function Field({
  field,
  value,
  error,
  preview,
  uploading,
  onChange,
  onToggleGroup,
  onFileChange,
}) {
  const className = fieldClassName(field);

  if (field.type === "heading") {
    return (
      <div className={className}>
        <h3 className="integriti-heading">{field.label}</h3>
      </div>
    );
  }

  if (field.type === "paragraph") {
    return (
      <div className={className}>
        <p className="integriti-paragraph">{field.label}</p>
      </div>
    );
  }

  const inputId = `field-${field.id}`;

  return (
    <div className={className}>
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

      {field.type === "file" && (
        <>
          <input
            id={inputId}
            type="file"
            className="integriti-file"
            disabled={preview || uploading}
            onChange={(e) => onFileChange(field, e.target.files?.[0])}
          />
          {uploading && (
            <p className="integriti-file-name">Uploading...</p>
          )}
          {value?.originalName && !uploading && (
            <p className="integriti-file-name">{value.originalName}</p>
          )}
        </>
      )}

      {field.helpText && <p className="integriti-help">{field.helpText}</p>}
      {error && <p className="integriti-error">{error}</p>}
    </div>
  );
}

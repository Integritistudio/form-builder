import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Banner,
  Checkbox,
  Collapsible,
  FormLayout,
  Select,
  Stack,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  createStep,
  disableMultiStepSchema,
  initializeMultiStepSchema,
  isMultiStepActive,
  assignFieldToStep,
  fieldTypeLabel,
  getFieldsForStepId,
} from "../../../lib/multiStep.js";

const QUICK_ADD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "phone", label: "Phone" },
  { value: "checkbox", label: "Checkbox" },
  { value: "heading", label: "Heading" },
  { value: "file", label: "File", pro: true },
];

function FieldRow({
  field,
  index,
  total,
  steps,
  multiStepEnabled,
  onEdit,
  onMove,
  onRemove,
  onMoveToStep,
}) {
  return (
    <li className="fe-field-item">
      <div className="fe-field-index">{index + 1}</div>
      <div className="fe-field-body">
        <div className="fe-field-top">
          <span className="fe-field-label">{field.label}</span>
          <span className="fe-field-type-badge">{fieldTypeLabel(field.type)}</span>
          {field.required && <span className="fe-field-required">Required</span>}
        </div>
        {field.placeholder && (
          <span className="fe-field-meta">Placeholder: {field.placeholder}</span>
        )}
      </div>
      <div className="fe-field-actions">
        {multiStepEnabled && steps.length > 1 && onMoveToStep && (
          <Select
            label="Move to step"
            labelHidden
            options={steps.map((s, i) => ({
              label: `Step ${i + 1}: ${s.title}`,
              value: s.id,
            }))}
            value={field.stepId || steps[0]?.id}
            onChange={(v) => onMoveToStep(field.id, v)}
          />
        )}
        <ButtonGroup>
          <Button size="slim" onClick={() => onMove(field.id, -1)} disabled={index === 0}>
            ↑
          </Button>
          <Button
            size="slim"
            onClick={() => onMove(field.id, 1)}
            disabled={index >= total - 1}
          >
            ↓
          </Button>
          <Button size="slim" onClick={() => onEdit(field.id)}>
            Edit
          </Button>
          <Button size="slim" destructive onClick={() => onRemove(field.id)}>
            ×
          </Button>
        </ButtonGroup>
      </div>
    </li>
  );
}

export default function FieldListPanel({
  schema,
  features,
  selectedStep = 0,
  onSelectStep,
  onSchemaChange,
  onRequestAddField,
  onEditField,
  onMoveField,
  onRemoveField,
  onNavigatePlans,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stepSettingsOpen, setStepSettingsOpen] = useState(false);

  const multiStep = schema?.multiStep || {};
  const steps = schema?.steps || [];
  const allFields = schema?.fields || [];
  const multiStepEnabled = isMultiStepActive(schema);
  const activeIndex = Math.min(selectedStep, Math.max(0, steps.length - 1));
  const activeStep = multiStepEnabled ? steps[activeIndex] : null;

  const visibleFields = multiStepEnabled && activeStep
    ? getFieldsForStepId(schema, activeStep.id)
    : allFields;

  function updateSchema(patch) {
    onSchemaChange({ ...schema, ...patch });
  }

  function updateMultiStep(patch) {
    updateSchema({ multiStep: { ...multiStep, ...patch } });
  }

  function toggleMultiStep(checked) {
    if (checked) {
      onSchemaChange(initializeMultiStepSchema(schema));
      onSelectStep?.(0);
    } else {
      onSchemaChange(disableMultiStepSchema(schema));
      onSelectStep?.(0);
    }
  }

  function addStep() {
    const step = createStep(`Step ${steps.length + 1}`);
    updateSchema({ steps: [...steps, step] });
    onSelectStep?.(steps.length);
  }

  function removeStep(index) {
    if (steps.length <= 2) return;
    const removed = steps[index];
    const fallbackId = steps[index === 0 ? 1 : index - 1]?.id;
    updateSchema({
      steps: steps.filter((_, i) => i !== index),
      fields: allFields.map((f) =>
        f.stepId === removed.id ? { ...f, stepId: fallbackId } : f
      ),
    });
    onSelectStep?.(Math.max(0, index - 1));
  }

  function moveStep(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    updateSchema({ steps: next });
    if (activeIndex === index) onSelectStep?.(target);
    else if (activeIndex === target) onSelectStep?.(index);
  }

  function updateStep(index, patch) {
    updateSchema({
      steps: steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }

  function moveFieldToStep(fieldId, stepId) {
    onSchemaChange(assignFieldToStep(schema, fieldId, stepId));
  }

  return (
    <div className="fe-panel">
      <div className="fe-fields-header">
        <div>
          <h3 className="fe-section-title">Fields & steps</h3>
          <p className="fe-section-desc">
            {multiStepEnabled
              ? "Pick a step, then add fields to it. Customers see one step at a time."
              : `${allFields.length} field${allFields.length === 1 ? "" : "s"} on your form`}
          </p>
        </div>
        <Button primary onClick={() => onRequestAddField("text")}>
          Add field
        </Button>
      </div>

      {features.multiStep ? (
        <label className="ms-editor-toggle">
          <Checkbox
            label="Multi-step form (split into pages)"
            checked={multiStepEnabled}
            onChange={toggleMultiStep}
          />
        </label>
      ) : (
        <Banner
          status="info"
          action={{ content: "View plans", onAction: onNavigatePlans }}
        >
          Multi-step forms are available on Pro and Premium plans.
        </Banner>
      )}

      {multiStepEnabled && (
        <>
          <div className="ms-stepper ms-stepper--compact" role="tablist">
            {steps.map((step, index) => {
              const count = getFieldsForStepId(schema, step.id).length;
              return (
                <div key={step.id} className="ms-stepper-item-wrap">
                  {index > 0 && (
                    <span
                      className={`ms-stepper-line${
                        index <= activeIndex ? " ms-stepper-line--done" : ""
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    className={`ms-stepper-item${
                      index === activeIndex ? " ms-stepper-item--active" : ""
                    }`}
                    onClick={() => onSelectStep?.(index)}
                  >
                    <span className="ms-stepper-num">{index + 1}</span>
                    <span className="ms-stepper-label">{step.title}</span>
                    <span className="ms-stepper-meta">
                      {count} field{count === 1 ? "" : "s"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {activeStep && (
            <div className="fe-step-active-bar">
              <Text variant="headingSm" as="h4">
                Step {activeIndex + 1}: {activeStep.title}
              </Text>
              <ButtonGroup>
                <Button size="slim" onClick={() => moveStep(activeIndex, -1)} disabled={activeIndex === 0}>
                  Move step up
                </Button>
                <Button
                  size="slim"
                  onClick={() => moveStep(activeIndex, 1)}
                  disabled={activeIndex === steps.length - 1}
                >
                  Move step down
                </Button>
                <Button
                  size="slim"
                  destructive
                  onClick={() => removeStep(activeIndex)}
                  disabled={steps.length <= 2}
                >
                  Delete step
                </Button>
              </ButtonGroup>
            </div>
          )}

          <Button
            plain
            onClick={() => setStepSettingsOpen((o) => !o)}
            disclosure={stepSettingsOpen ? "up" : "down"}
          >
            Step title & button labels
          </Button>
          <Collapsible open={stepSettingsOpen}>
            {activeStep && (
              <div className="fe-step-settings">
                <FormLayout>
                  <TextField
                    label="Step title"
                    value={activeStep.title}
                    onChange={(v) => updateStep(activeIndex, { title: v })}
                    autoComplete="off"
                  />
                  <TextField
                    label="Step description (optional)"
                    value={activeStep.description || ""}
                    onChange={(v) => updateStep(activeIndex, { description: v })}
                    multiline={2}
                    autoComplete="off"
                  />
                  {activeIndex < steps.length - 1 ? (
                    <TextField
                      label="Next button label"
                      value={activeStep.nextLabel || "Continue"}
                      onChange={(v) => updateStep(activeIndex, { nextLabel: v })}
                      autoComplete="off"
                    />
                  ) : (
                    <Text variant="bodySm" color="subdued">
                      Last step uses your submit button label from General.
                    </Text>
                  )}
                </FormLayout>
              </div>
            )}
          </Collapsible>
        </>
      )}

      <div className="fe-quick-add">
        <Text variant="bodySm" color="subdued">
          {multiStepEnabled
            ? `Quick add to step ${activeIndex + 1} — or use Add field to pick a type`
            : "Quick add — or use Add field to pick a type"}
        </Text>
        <div className="fe-quick-add-grid">
          {QUICK_ADD_TYPES.map((t) => {
            if (t.pro && !features.fileUpload && t.value === "file") return null;
            return (
              <button
                key={t.value}
                type="button"
                className="fe-quick-add-btn"
                onClick={() => onRequestAddField(t.value)}
              >
                {t.label}
                {t.pro && <span className="fe-pro-tag">Pro</span>}
              </button>
            );
          })}
        </div>
      </div>

      {!features.fileUpload && (
        <Banner
          status="info"
          action={{ content: "View plans", onAction: onNavigatePlans }}
        >
          File upload fields require Pro or Premium.
        </Banner>
      )}

      {visibleFields.length === 0 ? (
        <div className="fe-fields-empty">
          <div className="fe-fields-empty-icon">+</div>
          <h4>
            {multiStepEnabled
              ? `No fields on step ${activeIndex + 1} yet`
              : "No fields yet"}
          </h4>
          <p>
            Tap a field type above to add one
            {multiStepEnabled ? " to this step" : ""}.
          </p>
        </div>
      ) : (
        <ul className="fe-field-list">
          {visibleFields.map((field, index) => (
            <FieldRow
              key={field.id}
              field={field}
              index={index}
              total={visibleFields.length}
              steps={steps}
              multiStepEnabled={multiStepEnabled}
              onEdit={onEditField}
              onMove={onMoveField}
              onRemove={onRemoveField}
              onMoveToStep={multiStepEnabled ? moveFieldToStep : null}
            />
          ))}
        </ul>
      )}

      {multiStepEnabled && (
        <Stack distribution="equalSpacing" alignment="center">
          <Button onClick={addStep}>Add another step</Button>
          <Button
            plain
            onClick={() => setSettingsOpen((o) => !o)}
            disclosure={settingsOpen ? "up" : "down"}
          >
            Progress bar settings
          </Button>
        </Stack>
      )}

      {multiStepEnabled && (
        <Collapsible open={settingsOpen} id="ms-display-settings">
          <div className="ms-settings-panel">
            <FormLayout>
              <Select
                label="Progress indicator"
                options={[
                  { label: "Progress bar", value: "bar" },
                  { label: "Step pills", value: "pills" },
                  { label: "Dots", value: "dots" },
                  { label: "Numbered steps", value: "numbered" },
                ]}
                value={multiStep.progressStyle || "bar"}
                onChange={(v) => updateMultiStep({ progressStyle: v })}
              />
              <Checkbox
                label="Show progress indicator"
                checked={multiStep.showProgress !== false}
                onChange={(v) => updateMultiStep({ showProgress: v })}
              />
              <Checkbox
                label="Show step titles on each page"
                checked={multiStep.showStepTitles !== false}
                onChange={(v) => updateMultiStep({ showStepTitles: v })}
              />
              <Checkbox
                label="Allow back navigation"
                checked={multiStep.allowBack !== false}
                onChange={(v) => updateMultiStep({ allowBack: v })}
              />
              <TextField
                label="Back button label"
                value={multiStep.backLabel || "Back"}
                onChange={(v) => updateMultiStep({ backLabel: v })}
                autoComplete="off"
              />
            </FormLayout>
          </div>
        </Collapsible>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Button,
  ButtonGroup,
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
} from "../../lib/multiStep.js";

export default function MultiStepEditor({
  schema,
  onChange,
  selectedStep = 0,
  onSelectStep,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const multiStep = schema?.multiStep || {};
  const steps = schema?.steps || [];
  const enabled = isMultiStepActive(schema);
  const activeIndex = Math.min(selectedStep, Math.max(0, steps.length - 1));
  const activeStep = steps[activeIndex];

  function updateSchema(patch) {
    onChange({ ...schema, ...patch });
  }

  function updateMultiStep(patch) {
    updateSchema({
      multiStep: { ...multiStep, ...patch },
    });
  }

  function toggleEnabled(checked) {
    if (checked) {
      onChange(initializeMultiStepSchema(schema));
      onSelectStep?.(0);
    } else {
      onChange(disableMultiStepSchema(schema));
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
    const nextSteps = steps.filter((_, i) => i !== index);
    const nextFields = (schema.fields || []).map((field) =>
      field.stepId === removed.id ? { ...field, stepId: fallbackId } : field
    );
    updateSchema({ steps: nextSteps, fields: nextFields });
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
    const next = steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateSchema({ steps: next });
  }

  function moveFieldToStep(fieldId, stepId) {
    onChange(assignFieldToStep(schema, fieldId, stepId));
  }

  const stepFields = activeStep
    ? getFieldsForStepId(schema, activeStep.id)
    : [];

  return (
    <div className="ms-editor">
      <div className="ms-editor-intro">
        <Text variant="bodyMd" as="p">
          Build a guided form experience. Each step is a separate page on your
          storefront with its own title and fields.
        </Text>
      </div>

      <label className="ms-editor-toggle">
        <Checkbox
          label="Enable multi-step form"
          checked={enabled}
          onChange={toggleEnabled}
        />
      </label>

      {enabled && (
        <>
          <div className="ms-stepper" role="tablist" aria-label="Form steps">
            {steps.map((step, index) => {
              const count = getFieldsForStepId(schema, step.id).length;
              const isActive = index === activeIndex;
              const isLast = index === steps.length - 1;
              return (
                <div key={step.id} className="ms-stepper-item-wrap">
                  {index > 0 && (
                    <span
                      className={`ms-stepper-line${
                        index <= activeIndex ? " ms-stepper-line--done" : ""
                      }`}
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`ms-stepper-item${isActive ? " ms-stepper-item--active" : ""}${
                      index < activeIndex ? " ms-stepper-item--done" : ""
                    }`}
                    onClick={() => onSelectStep?.(index)}
                  >
                    <span className="ms-stepper-num">{index + 1}</span>
                    <span className="ms-stepper-label">{step.title}</span>
                    <span className="ms-stepper-meta">
                      {count} field{count === 1 ? "" : "s"}
                      {isLast ? " · Submit" : ""}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {activeStep && (
            <div className="ms-step-panel">
              <div className="ms-step-panel-toolbar">
                <Text variant="headingSm" as="h3">
                  Step {activeIndex + 1} settings
                </Text>
                <ButtonGroup>
                  <Button
                    size="slim"
                    onClick={() => moveStep(activeIndex, -1)}
                    disabled={activeIndex === 0}
                  >
                    Up
                  </Button>
                  <Button
                    size="slim"
                    onClick={() => moveStep(activeIndex, 1)}
                    disabled={activeIndex === steps.length - 1}
                  >
                    Down
                  </Button>
                  <Button
                    size="slim"
                    destructive
                    onClick={() => removeStep(activeIndex)}
                    disabled={steps.length <= 2}
                  >
                    Remove
                  </Button>
                </ButtonGroup>
              </div>

              <FormLayout>
                <TextField
                  label="Step title"
                  value={activeStep.title}
                  onChange={(v) => updateStep(activeIndex, { title: v })}
                  autoComplete="off"
                  helpText="Shown at the top of this step on the storefront"
                />
                <TextField
                  label="Step description"
                  value={activeStep.description || ""}
                  onChange={(v) => updateStep(activeIndex, { description: v })}
                  multiline={2}
                  autoComplete="off"
                  placeholder="Optional helper text for this step"
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
                    The last step uses your form&apos;s submit button label from
                    the Form tab.
                  </Text>
                )}
              </FormLayout>

              <div className="ms-field-list">
                <Text variant="headingSm" as="h4">
                  Fields on this step
                </Text>
                {stepFields.length === 0 ? (
                  <div className="ms-field-empty">
                    <p>No fields on this step yet.</p>
                    <p className="ms-field-empty-hint">
                      Add fields from the Fields tab, or move fields here from
                      another step.
                    </p>
                  </div>
                ) : (
                  <ul className="ms-field-chips">
                    {stepFields.map((field) => (
                      <li key={field.id} className="ms-field-chip">
                        <div className="ms-field-chip-info">
                          <span className="ms-field-chip-label">{field.label}</span>
                          <span className="ms-field-chip-type">
                            {fieldTypeLabel(field.type)}
                          </span>
                        </div>
                        {steps.length > 1 && (
                          <Select
                            label="Move to step"
                            labelHidden
                            options={steps.map((s, i) => ({
                              label: `${i + 1}. ${s.title}`,
                              value: s.id,
                            }))}
                            value={field.stepId || steps[0]?.id}
                            onChange={(v) => moveFieldToStep(field.id, v)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <Stack distribution="equalSpacing" alignment="center">
            <Button onClick={addStep}>Add step</Button>
            <Button
              plain
              onClick={() => setSettingsOpen((o) => !o)}
              disclosure={settingsOpen ? "up" : "down"}
            >
              Display settings
            </Button>
          </Stack>

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
                <Checkbox
                  label="Animate step transitions"
                  checked={multiStep.animateTransitions !== false}
                  onChange={(v) => updateMultiStep({ animateTransitions: v })}
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
        </>
      )}
    </div>
  );
}

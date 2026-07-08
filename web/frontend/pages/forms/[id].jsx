import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  TextField,
  Select,
  Button,
  Banner,
  Modal,
  FormLayout,
  Checkbox,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";

import { FormRenderer } from "../../components/FormRenderer";
import DevicePreview from "../../components/DevicePreview";
import MultiStepEditor from "../../components/MultiStepEditor";
import {
  FormSettingsPanel,
  FieldListPanel,
  DesignPanel,
} from "../../components/formEditor";
import { AppShell } from "../../components/layout";
import { apiFetch } from "../../utils/api";
import {
  DEFAULT_STYLES,
  FIELD_TYPES,
  createField,
} from "../../../lib/formDefaults.js";
import { CSS_CLASS_REFERENCE } from "../../../lib/formStyles.js";
import { isMultiStepActive, getDefaultStepId } from "../../../lib/multiStep.js";

const TYPE_MAP = { phone: "tel" };

const BASE_FIELD_TYPES = FIELD_TYPES.filter((f) => f.value !== "file");

const NAV_ITEMS = [
  { id: "general", label: "General" },
  { id: "fields", label: "Fields" },
  { id: "steps", label: "Steps", pro: true },
  { id: "design", label: "Design" },
  { id: "advanced", label: "Advanced" },
];

export default function FormEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("general");
  const [editingField, setEditingField] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addType, setAddType] = useState("text");
  const [saveStatus, setSaveStatus] = useState("");
  const [previewStep, setPreviewStep] = useState(0);

  const { data, isLoading } = useQuery(["form", id], () =>
    apiFetch(`/api/forms/${id}`)
  );

  const { data: planData } = useQuery(["plan"], () => apiFetch("/api/plan"));

  const features = planData?.features || {};
  const form = data?.form;
  const [local, setLocal] = useState(null);
  const state = local || form;
  const hasUnsavedChanges = local !== null;

  const availableFieldTypes = features.fileUpload
    ? FIELD_TYPES.map((f) => ({
        label: f.label,
        value: f.value === "tel" ? "phone" : f.value,
      }))
    : BASE_FIELD_TYPES.map((f) => ({
        label: f.label,
        value: f.value === "tel" ? "phone" : f.value,
      }));

  const updateLocal = useCallback(
    (patch) => {
      setLocal((prev) => {
        const base = prev || form;
        return { ...base, ...patch };
      });
    },
    [form]
  );

  const saveMutation = useMutation(
    (payload) =>
      apiFetch(`/api/forms/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["form", id]);
        queryClient.invalidateQueries(["forms"]);
        setLocal(null);
        setSaveStatus("Saved");
        setTimeout(() => setSaveStatus(""), 2000);
      },
      onError: (err) => setSaveStatus(err.message),
    }
  );

  function handleSave() {
    if (!state) return;
    const schema = { ...state.schema };
    if (!features.multiStep) {
      schema.multiStep = { ...(schema.multiStep || {}), enabled: false };
    }
    saveMutation.mutate({
      name: state.name,
      status: state.status,
      schema,
      styles: state.styles,
      customCss: features.customCss ? state.customCss : "",
    });
  }

  function updateSchema(patch) {
    updateLocal({ schema: { ...state.schema, ...patch } });
  }

  function updateField(index, patch) {
    const fields = [...(state.schema?.fields || [])];
    fields[index] = { ...fields[index], ...patch };
    updateSchema({ fields });
  }

  function moveField(index, direction) {
    const fields = [...(state.schema?.fields || [])];
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    updateSchema({ fields });
  }

  function removeField(index) {
    const fields = (state.schema?.fields || []).filter((_, i) => i !== index);
    updateSchema({ fields });
    setEditingField(null);
  }

  function addField(type = addType) {
    const resolved = TYPE_MAP[type] || type;
    const field = createField(resolved);
    if (isMultiStepActive(state.schema)) {
      const steps = state.schema.steps || [];
      field.stepId =
        steps[previewStep]?.id ||
        steps[steps.length - 1]?.id ||
        getDefaultStepId(state.schema);
    }
    const fields = [...(state.schema?.fields || []), field];
    updateSchema({ fields });
    setAddModal(false);
    setActiveSection("fields");
    setEditingField(fields.length - 1);
  }

  function updateStyle(key, value) {
    updateLocal({
      styles: { ...(state.styles || DEFAULT_STYLES), [key]: value },
    });
  }

  const multiStepEnabled = state ? isMultiStepActive(state.schema) : false;
  const previewStepCount = state?.schema?.steps?.length || 0;
  const fieldCount = state?.schema?.fields?.length || 0;

  useEffect(() => {
    if (!multiStepEnabled) setPreviewStep(0);
    else if (previewStep >= previewStepCount) {
      setPreviewStep(Math.max(0, previewStepCount - 1));
    }
  }, [multiStepEnabled, previewStep, previewStepCount]);

  const navItems = NAV_ITEMS.filter(
    (item) => item.id !== "steps" || features.multiStep
  );

  if (isLoading || !state) {
    return (
      <AppShell>
        <Page fullWidth>
          <TitleBar title="Loading..." />
          <div className="fe-layout" style={{ marginTop: 24 }}>
            <div className="app-panel">
              <div className="app-panel-body">
                <SkeletonDisplayText size="small" />
                <div style={{ marginTop: 16 }}>
                  <SkeletonBodyText lines={10} />
                </div>
              </div>
            </div>
            <div className="app-preview-frame">
              <div style={{ padding: 24 }}>
                <SkeletonDisplayText size="large" />
                <div style={{ marginTop: 16 }}>
                  <SkeletonBodyText lines={8} />
                </div>
              </div>
            </div>
          </div>
        </Page>
      </AppShell>
    );
  }

  const saveLabel =
    saveStatus === "Saved"
      ? "Saved ✓"
      : saveStatus && saveStatus !== "Saved"
        ? saveStatus
        : hasUnsavedChanges
          ? "Save changes"
          : "Save";

  return (
    <AppShell className="app-editor-layout">
      <Page fullWidth backAction={{ onAction: () => navigate("/") }}>
        <TitleBar title={state.name}>
          <button variant="primary" onClick={handleSave}>
            Save
          </button>
        </TitleBar>

        <Layout>
          <Layout.Section>
            <div className="fe-header">
              <div className="fe-header-main">
                <h1>{state.name}</h1>
                <div className="fe-header-meta">
                  <span
                    className={`app-status app-status--${
                      state.status === "active" ? "active" : "draft"
                    }`}
                  >
                    {state.status}
                  </span>
                  <span className="app-subdued">
                    {fieldCount} field{fieldCount === 1 ? "" : "s"}
                  </span>
                  {multiStepEnabled && (
                    <span className="app-badge-inline">Multi-step</span>
                  )}
                  {hasUnsavedChanges && (
                    <span className="app-badge-inline" style={{ background: "#fef3c7", color: "#92400e" }}>
                      Unsaved changes
                    </span>
                  )}
                </div>
              </div>
              <div className="fe-header-actions">
                <Button onClick={() => navigate(`/forms/${id}/submissions`)}>
                  Submissions
                </Button>
                <Button
                  primary
                  loading={saveMutation.isLoading}
                  onClick={handleSave}
                >
                  {saveLabel}
                </Button>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="fe-unsaved-banner">
                <Banner status="warning" action={{ content: "Save now", onAction: handleSave }}>
                  You have unsaved changes. Save before leaving this page.
                </Banner>
              </div>
            )}

            {state.status !== "active" && (
              <div className="fe-unsaved-banner">
                <Banner status="warning">
                  This form is a draft. Activate it before adding to your theme.
                </Banner>
              </div>
            )}

            <div className="fe-layout">
              <aside className="fe-sidebar">
                <nav className="fe-nav" aria-label="Form editor sections">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`fe-nav-btn${
                        activeSection === item.id ? " fe-nav-btn--active" : ""
                      }`}
                      onClick={() => setActiveSection(item.id)}
                    >
                      <span>{item.label}</span>
                      {item.id === "fields" && fieldCount > 0 && (
                        <span className="fe-nav-badge">{fieldCount}</span>
                      )}
                      {item.pro && !features.multiStep && item.id === "steps" && (
                        <span className="fe-nav-badge">Pro</span>
                      )}
                    </button>
                  ))}
                </nav>

                <div className="fe-sidebar-content">
                  {activeSection === "general" && (
                    <FormSettingsPanel
                      state={state}
                      onUpdateName={(v) => updateLocal({ name: v })}
                      onUpdateSchema={updateSchema}
                      onToggleStatus={() =>
                        updateLocal({
                          status: state.status === "active" ? "draft" : "active",
                        })
                      }
                    />
                  )}

                  {activeSection === "fields" && (
                    <FieldListPanel
                      fields={state.schema?.fields || []}
                      steps={state.schema?.steps}
                      multiStepEnabled={multiStepEnabled}
                      features={features}
                      onAddType={(type) => {
                        setAddType(type);
                        addField(type);
                      }}
                      onEdit={setEditingField}
                      onMove={moveField}
                      onRemove={removeField}
                      onNavigatePlans={() => navigate("/plans")}
                    />
                  )}

                  {activeSection === "steps" && features.multiStep && (
                    <div className="fe-panel">
                      <MultiStepEditor
                        schema={state.schema}
                        selectedStep={previewStep}
                        onSelectStep={setPreviewStep}
                        onChange={(nextSchema) =>
                          updateLocal({ schema: nextSchema })
                        }
                      />
                    </div>
                  )}

                  {activeSection === "design" && (
                    <DesignPanel
                      styles={state.styles || DEFAULT_STYLES}
                      allowGradients={features.gradients}
                      onUpdateStyle={updateStyle}
                      onNavigatePlans={() => navigate("/plans")}
                    />
                  )}

                  {activeSection === "advanced" && (
                    <div className="fe-panel">
                      <h3 className="fe-section-title">Custom CSS</h3>
                      <p className="fe-section-desc">
                        Add advanced styling scoped to your form.
                      </p>
                      {features.customCss ? (
                        <>
                          <TextField
                            label="Custom CSS"
                            labelHidden
                            value={state.customCss || ""}
                            onChange={(v) => updateLocal({ customCss: v })}
                            multiline={12}
                            helpText="Use field classes like .integriti-field--field_name"
                            autoComplete="off"
                          />
                          <div className="fe-css-ref">
                            <strong>CSS class reference</strong>
                            <pre>{CSS_CLASS_REFERENCE}</pre>
                          </div>
                        </>
                      ) : (
                        <Banner
                          status="info"
                          action={{
                            content: "Upgrade",
                            onAction: () => navigate("/plans"),
                          }}
                        >
                          Custom CSS is available on Pro and Premium plans.
                        </Banner>
                      )}
                    </div>
                  )}
                </div>
              </aside>

              <div className="fe-preview-sticky">
                <div className="app-preview-frame">
                  <div className="app-panel-header fe-preview-header">
                    <h2 className="app-panel-title">Live preview</h2>
                    <span className="fe-preview-badge">Updates as you edit</span>
                  </div>
                  {multiStepEnabled && previewStepCount > 0 && (
                    <div className="app-preview-step-bar" role="tablist">
                      {(state.schema.steps || []).map((step, i) => (
                        <button
                          key={step.id}
                          type="button"
                          role="tab"
                          aria-selected={previewStep === i}
                          className={`app-preview-step-pill${
                            previewStep === i
                              ? " app-preview-step-pill--active"
                              : ""
                          }`}
                          onClick={() => setPreviewStep(i)}
                        >
                          {i + 1}. {step.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: 24 }}>
                    <DevicePreview>
                      <FormRenderer
                        schema={state.schema}
                        styles={state.styles || DEFAULT_STYLES}
                        customCss={features.customCss ? state.customCss : ""}
                        formId={state.id}
                        preview
                        stepIndex={multiStepEnabled ? previewStep : undefined}
                        onStepChange={setPreviewStep}
                      />
                    </DevicePreview>
                  </div>
                </div>
              </div>
            </div>
          </Layout.Section>
        </Layout>

        <Modal
          open={addModal}
          onClose={() => setAddModal(false)}
          title="Add field"
          primaryAction={{ content: "Add", onAction: () => addField() }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setAddModal(false) },
          ]}
        >
          <Modal.Section>
            <Select
              label="Field type"
              options={availableFieldTypes}
              value={addType}
              onChange={setAddType}
            />
          </Modal.Section>
        </Modal>

        {editingField !== null && state.schema?.fields?.[editingField] && (
          <FieldEditorModal
            field={state.schema.fields[editingField]}
            steps={multiStepEnabled ? state.schema.steps || [] : []}
            onClose={() => setEditingField(null)}
            onSave={(patch) => {
              updateField(editingField, patch);
              setEditingField(null);
            }}
          />
        )}
      </Page>
    </AppShell>
  );
}

function FieldEditorModal({ field, steps, onClose, onSave }) {
  const [local, setLocal] = useState({ ...field });
  const hasOptions = ["select", "radio", "checkbox_group"].includes(field.type);
  const isStatic = ["heading", "paragraph"].includes(field.type);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${field.type} field`}
      primaryAction={{ content: "Save field", onAction: () => onSave(local) }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <FormLayout>
          <TextField
            label={isStatic && field.type === "paragraph" ? "Text" : "Label"}
            value={local.label}
            onChange={(v) => setLocal({ ...local, label: v })}
            autoComplete="off"
          />
          {isStatic && steps.length > 0 && (
            <Select
              label="Step"
              options={steps.map((s) => ({ label: s.title, value: s.id }))}
              value={local.stepId || steps[0]?.id}
              onChange={(v) => setLocal({ ...local, stepId: v })}
            />
          )}
          {!isStatic && field.type !== "file" && (
            <>
              {steps.length > 0 && (
                <Select
                  label="Step"
                  options={steps.map((s) => ({ label: s.title, value: s.id }))}
                  value={local.stepId || steps[0]?.id}
                  onChange={(v) => setLocal({ ...local, stepId: v })}
                />
              )}
              <TextField
                label="Placeholder"
                value={local.placeholder || ""}
                onChange={(v) => setLocal({ ...local, placeholder: v })}
                autoComplete="off"
              />
              <TextField
                label="Help text"
                value={local.helpText || ""}
                onChange={(v) => setLocal({ ...local, helpText: v })}
                autoComplete="off"
              />
              <Checkbox
                label="Required"
                checked={local.required}
                onChange={(v) => setLocal({ ...local, required: v })}
              />
              <Select
                label="Width"
                options={[
                  { label: "Full width", value: "full" },
                  { label: "Half width", value: "half" },
                ]}
                value={local.width || "full"}
                onChange={(v) => setLocal({ ...local, width: v })}
              />
            </>
          )}
          {field.type === "file" && (
            <>
              {steps.length > 0 && (
                <Select
                  label="Step"
                  options={steps.map((s) => ({ label: s.title, value: s.id }))}
                  value={local.stepId || steps[0]?.id}
                  onChange={(v) => setLocal({ ...local, stepId: v })}
                />
              )}
              <TextField
                label="Help text"
                value={local.helpText || ""}
                onChange={(v) => setLocal({ ...local, helpText: v })}
                autoComplete="off"
              />
              <Checkbox
                label="Required"
                checked={local.required}
                onChange={(v) => setLocal({ ...local, required: v })}
              />
            </>
          )}
          {hasOptions && (
            <TextField
              label="Options (one per line)"
              value={(local.options || []).join("\n")}
              onChange={(v) =>
                setLocal({
                  ...local,
                  options: v.split("\n").filter(Boolean),
                })
              }
              multiline={4}
              autoComplete="off"
            />
          )}
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

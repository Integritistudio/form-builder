import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Tabs,
  TextField,
  Select,
  Button,
  Stack,
  Text,
  Banner,
  Badge,
  Modal,
  FormLayout,
  Checkbox,
  ButtonGroup,
  Box,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";

import { FormRenderer } from "../../components/FormRenderer";
import DevicePreview from "../../components/DevicePreview";
import ColorControl from "../../components/ColorControl";
import { apiFetch } from "../../utils/api";
import {
  DEFAULT_STYLES,
  FIELD_TYPES,
  createField,
} from "../../../lib/formDefaults.js";
import { CSS_CLASS_REFERENCE } from "../../../lib/formStyles.js";

const TYPE_MAP = { phone: "tel" };

const BASE_FIELD_TYPES = FIELD_TYPES.filter((f) => f.value !== "file");

export default function FormEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addType, setAddType] = useState("text");
  const [saveStatus, setSaveStatus] = useState("");

  const { data, isLoading } = useQuery(["form", id], () =>
    apiFetch(`/api/forms/${id}`)
  );

  const { data: planData } = useQuery(["plan"], () => apiFetch("/api/plan"));

  const features = planData?.features || {};
  const form = data?.form;
  const [local, setLocal] = useState(null);
  const state = local || form;

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
    saveMutation.mutate({
      name: state.name,
      status: state.status,
      schema: state.schema,
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

  function addField() {
    const resolved = TYPE_MAP[addType] || addType;
    const fields = [...(state.schema?.fields || []), createField(resolved)];
    updateSchema({ fields });
    setAddModal(false);
    setEditingField(fields.length - 1);
  }

  function updateStyle(key, value) {
    updateLocal({
      styles: { ...(state.styles || DEFAULT_STYLES), [key]: value },
    });
  }

  if (isLoading || !state) {
    return (
      <Page>
        <TitleBar title="Loading..." />
        <Layout>
          <Layout.Section variant="oneThird">
            <Card sectioned>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={8} />
              </Box>
            </Card>
          </Layout.Section>
          <Layout.Section variant="twoThirds">
            <Card sectioned>
              <SkeletonDisplayText size="large" />
              <Box paddingBlockStart="400">
                <SkeletonBodyText lines={6} />
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const tabs = [
    { id: "form", content: "Form" },
    { id: "fields", content: "Fields" },
    { id: "design", content: "Design" },
    { id: "advanced", content: "Advanced" },
  ];

  const allowGradients = features.gradients;

  return (
    <Page
      title={state.name}
      backAction={{ onAction: () => navigate("/") }}
      primaryAction={{
        content: saveStatus || "Save",
        onAction: handleSave,
        loading: saveMutation.isLoading,
      }}
      secondaryActions={[
        {
          content: state.status === "active" ? "Set draft" : "Activate",
          onAction: () =>
            updateLocal({
              status: state.status === "active" ? "draft" : "active",
            }),
        },
        {
          content: "Submissions",
          onAction: () => navigate(`/forms/${id}/submissions`),
        },
      ]}
    >
      <TitleBar title={state.name}>
        <button variant="primary" onClick={handleSave}>
          Save
        </button>
      </TitleBar>

      <Layout>
        <Layout.Section variant="oneThird">
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <Box padding="400">
                {selectedTab === 0 && (
                  <FormLayout>
                    <TextField
                      label="Form name"
                      value={state.name}
                      onChange={(v) => updateLocal({ name: v })}
                      autoComplete="off"
                    />
                    <TextField
                      label="Title"
                      value={state.schema?.title || ""}
                      onChange={(v) => updateSchema({ title: v })}
                      autoComplete="off"
                    />
                    <TextField
                      label="Description"
                      value={state.schema?.description || ""}
                      onChange={(v) => updateSchema({ description: v })}
                      multiline={3}
                      autoComplete="off"
                    />
                    <TextField
                      label="Submit button label"
                      value={state.schema?.submitLabel || ""}
                      onChange={(v) => updateSchema({ submitLabel: v })}
                      autoComplete="off"
                    />
                    <TextField
                      label="Success message"
                      value={state.schema?.successMessage || ""}
                      onChange={(v) => updateSchema({ successMessage: v })}
                      multiline={2}
                      autoComplete="off"
                    />
                    <Stack spacing="tight">
                      <Text variant="bodySm" color="subdued">
                        Form ID
                      </Text>
                      <Text as="span" fontWeight="medium">
                        <code>{state.id}</code>
                      </Text>
                      <Badge status={state.status === "active" ? "success" : "info"}>
                        {state.status}
                      </Badge>
                    </Stack>
                  </FormLayout>
                )}

                {selectedTab === 1 && (
                  <Stack vertical spacing="loose">
                    <Button onClick={() => setAddModal(true)}>Add field</Button>
                    {!features.fileUpload && (
                      <Banner
                        status="info"
                        action={{
                          content: "View plans",
                          onAction: () => navigate("/plans"),
                        }}
                      >
                        File upload fields are available on Pro and Premium plans.
                      </Banner>
                    )}
                    {(state.schema?.fields || []).map((field, index) => (
                      <Card key={field.id} sectioned>
                        <Stack distribution="equalSpacing" alignment="center">
                          <Stack vertical spacing="extraTight">
                            <Text fontWeight="semibold">{field.label}</Text>
                            <Text variant="bodySm" color="subdued">
                              {field.type}
                            </Text>
                          </Stack>
                          <ButtonGroup>
                            <Button
                              size="slim"
                              onClick={() => moveField(index, -1)}
                              disabled={index === 0}
                            >
                              Up
                            </Button>
                            <Button
                              size="slim"
                              onClick={() => moveField(index, 1)}
                              disabled={
                                index === (state.schema?.fields || []).length - 1
                              }
                            >
                              Down
                            </Button>
                            <Button
                              size="slim"
                              onClick={() => setEditingField(index)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="slim"
                              destructive
                              onClick={() => removeField(index)}
                            >
                              Remove
                            </Button>
                          </ButtonGroup>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}

                {selectedTab === 2 && (
                  <FormLayout>
                    <Text variant="headingSm" as="h3">
                      Header
                    </Text>
                    <ColorControl
                      label="Header background"
                      value={state.styles?.headerBackground}
                      onChange={(v) => updateStyle("headerBackground", v)}
                      allowGradient={allowGradients}
                      fallback="transparent"
                    />
                    <TextField
                      label="Header padding (px)"
                      type="number"
                      value={state.styles?.headerPadding || "0"}
                      onChange={(v) => updateStyle("headerPadding", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Header border radius (px)"
                      type="number"
                      value={state.styles?.headerBorderRadius || "0"}
                      onChange={(v) => updateStyle("headerBorderRadius", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Title color"
                      value={state.styles?.titleColor || ""}
                      onChange={(v) => updateStyle("titleColor", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Title size (px)"
                      type="number"
                      value={state.styles?.titleSize || "24"}
                      onChange={(v) => updateStyle("titleSize", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Description color"
                      value={state.styles?.descriptionColor || ""}
                      onChange={(v) => updateStyle("descriptionColor", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Description size (px)"
                      type="number"
                      value={state.styles?.descriptionSize || "16"}
                      onChange={(v) => updateStyle("descriptionSize", v)}
                      autoComplete="off"
                    />

                    <Text variant="headingSm" as="h3">
                      Form
                    </Text>
                    <ColorControl
                      label="Background"
                      value={state.styles?.backgroundColor}
                      onChange={(v) => updateStyle("backgroundColor", v)}
                      allowGradient={allowGradients}
                    />
                    <TextField
                      label="Text color"
                      value={state.styles?.textColor || ""}
                      onChange={(v) => updateStyle("textColor", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Label color"
                      value={state.styles?.labelColor || ""}
                      onChange={(v) => updateStyle("labelColor", v)}
                      autoComplete="off"
                    />
                    <ColorControl
                      label="Input border"
                      value={state.styles?.inputBorderColor}
                      onChange={(v) => updateStyle("inputBorderColor", v)}
                      allowGradient={allowGradients}
                      fallback="#cccccc"
                    />
                    <ColorControl
                      label="Focus border"
                      value={state.styles?.focusBorderColor}
                      onChange={(v) => updateStyle("focusBorderColor", v)}
                      allowGradient={allowGradients}
                      fallback="#1a1a1a"
                    />
                    <ColorControl
                      label="Button background"
                      value={state.styles?.buttonBackgroundColor}
                      onChange={(v) => updateStyle("buttonBackgroundColor", v)}
                      allowGradient={allowGradients}
                      fallback="#1a1a1a"
                    />
                    <TextField
                      label="Button text color"
                      value={state.styles?.buttonTextColor || ""}
                      onChange={(v) => updateStyle("buttonTextColor", v)}
                      autoComplete="off"
                    />
                    <Select
                      label="Field spacing"
                      options={[
                        { label: "Compact", value: "compact" },
                        { label: "Comfortable", value: "comfortable" },
                        { label: "Spacious", value: "spacious" },
                      ]}
                      value={state.styles?.fieldSpacing || "comfortable"}
                      onChange={(v) => updateStyle("fieldSpacing", v)}
                    />
                    <TextField
                      label="Max width (px)"
                      type="number"
                      value={state.styles?.maxWidth || "640"}
                      onChange={(v) => updateStyle("maxWidth", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Border radius (px)"
                      type="number"
                      value={state.styles?.borderRadius || "4"}
                      onChange={(v) => updateStyle("borderRadius", v)}
                      autoComplete="off"
                    />
                    <Select
                      label="Font"
                      options={[
                        { label: "Inherit from theme", value: "inherit" },
                        { label: "Arial", value: "Arial, sans-serif" },
                        { label: "Georgia", value: "Georgia, serif" },
                        { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
                      ]}
                      value={state.styles?.fontFamily || "inherit"}
                      onChange={(v) => updateStyle("fontFamily", v)}
                    />
                    {!allowGradients && (
                      <Banner
                        status="info"
                        action={{
                          content: "View plans",
                          onAction: () => navigate("/plans"),
                        }}
                      >
                        Gradient colors are available on Pro and Premium plans.
                      </Banner>
                    )}
                  </FormLayout>
                )}

                {selectedTab === 3 && (
                  <FormLayout>
                    {features.customCss ? (
                      <>
                        <TextField
                          label="Custom CSS"
                          value={state.customCss || ""}
                          onChange={(v) => updateLocal({ customCss: v })}
                          multiline={10}
                          helpText="Scope rules to your form. Use field classes like .integriti-field--field_name"
                          autoComplete="off"
                        />
                        <Box
                          padding="300"
                          background="bg-surface-secondary"
                          borderRadius="200"
                        >
                          <Text variant="bodySm" as="p" fontWeight="semibold">
                            CSS class reference
                          </Text>
                          <pre
                            style={{
                              fontSize: 11,
                              whiteSpace: "pre-wrap",
                              margin: "8px 0 0",
                            }}
                          >
                            {CSS_CLASS_REFERENCE}
                          </pre>
                        </Box>
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
                  </FormLayout>
                )}
              </Box>
            </Tabs>
          </Card>

          {state.status !== "active" && (
            <Box paddingBlockStart="400">
              <Banner status="warning">
                This form is a draft. Activate it before adding to your theme.
              </Banner>
            </Box>
          )}
        </Layout.Section>

        <Layout.Section variant="twoThirds">
          <div style={{ position: "sticky", top: "16px" }}>
            <Card title="Preview" sectioned>
              <DevicePreview>
                <FormRenderer
                  schema={state.schema}
                  styles={state.styles || DEFAULT_STYLES}
                  customCss={features.customCss ? state.customCss : ""}
                  formId={state.id}
                  preview
                />
              </DevicePreview>
            </Card>
          </div>
        </Layout.Section>
      </Layout>

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add field"
        primaryAction={{ content: "Add", onAction: addField }}
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
          onClose={() => setEditingField(null)}
          onSave={(patch) => {
            updateField(editingField, patch);
            setEditingField(null);
          }}
        />
      )}
    </Page>
  );
}

function FieldEditorModal({ field, onClose, onSave }) {
  const [local, setLocal] = useState({ ...field });
  const hasOptions = ["select", "radio", "checkbox_group"].includes(field.type);
  const isStatic = ["heading", "paragraph"].includes(field.type);

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit field"
      primaryAction={{ content: "Done", onAction: () => onSave(local) }}
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
          {!isStatic && field.type !== "file" && (
            <>
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

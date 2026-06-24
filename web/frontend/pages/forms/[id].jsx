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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";

import { FormRenderer } from "../../components/FormRenderer";
import { apiFetch } from "../../utils/api";

const FIELD_TYPES = [
  { label: "Text", value: "text" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Long text", value: "textarea" },
  { label: "Number", value: "number" },
  { label: "Date", value: "date" },
  { label: "Dropdown", value: "select" },
  { label: "Radio", value: "radio" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Checkbox group", value: "checkbox_group" },
  { label: "Heading", value: "heading" },
  { label: "Paragraph", value: "paragraph" },
];

const TYPE_MAP = { phone: "tel" };

function createField(type) {
  const resolved = TYPE_MAP[type] || type;
  const base = {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: resolved,
    label: "New field",
    placeholder: "",
    required: false,
    width: "full",
    helpText: "",
    options: ["Option 1", "Option 2"],
    defaultValue: "",
    minLength: null,
    maxLength: null,
  };
  if (resolved === "heading") base.label = "Section heading";
  if (resolved === "paragraph") base.label = "Add your text here.";
  if (resolved === "checkbox") base.label = "I agree";
  return base;
}

const DEFAULT_STYLES = {
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  labelColor: "#444444",
  inputBorderColor: "#cccccc",
  focusBorderColor: "#1a1a1a",
  buttonBackgroundColor: "#1a1a1a",
  buttonTextColor: "#ffffff",
  errorColor: "#b42318",
  fontFamily: "inherit",
  labelSize: "14",
  inputSize: "16",
  fieldSpacing: "comfortable",
  maxWidth: "640",
  borderRadius: "4",
  inputPadding: "12",
};

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

  const form = data?.form;
  const [local, setLocal] = useState(null);

  const state = local || form;

  const updateLocal = useCallback((patch) => {
    setLocal((prev) => {
      const base = prev || form;
      return { ...base, ...patch };
    });
  }, [form]);

  const saveMutation = useMutation(
    (payload) => apiFetch(`/api/forms/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
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
      customCss: state.customCss,
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
    const fields = [...(state.schema?.fields || []), createField(addType)];
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
      </Page>
    );
  }

  const tabs = [
    { id: "form", content: "Form" },
    { id: "fields", content: "Fields" },
    { id: "design", content: "Design" },
    { id: "advanced", content: "Advanced" },
  ];

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
        <Layout.Section variant="oneHalf">
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
                            <Button size="slim" onClick={() => setEditingField(index)}>
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
                    <TextField
                      label="Background color"
                      value={state.styles?.backgroundColor || ""}
                      onChange={(v) => updateStyle("backgroundColor", v)}
                      autoComplete="off"
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
                    <TextField
                      label="Input border color"
                      value={state.styles?.inputBorderColor || ""}
                      onChange={(v) => updateStyle("inputBorderColor", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Focus border color"
                      value={state.styles?.focusBorderColor || ""}
                      onChange={(v) => updateStyle("focusBorderColor", v)}
                      autoComplete="off"
                    />
                    <TextField
                      label="Button color"
                      value={state.styles?.buttonBackgroundColor || ""}
                      onChange={(v) => updateStyle("buttonBackgroundColor", v)}
                      autoComplete="off"
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
                  </FormLayout>
                )}

                {selectedTab === 3 && (
                  <FormLayout>
                    <TextField
                      label="Custom CSS"
                      value={state.customCss || ""}
                      onChange={(v) => updateLocal({ customCss: v })}
                      multiline={10}
                      helpText="Add CSS rules scoped to your form. Example: .integriti-submit { letter-spacing: 1px; }"
                      autoComplete="off"
                    />
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

        <Layout.Section variant="oneHalf">
          <Card title="Preview" sectioned>
            <FormRenderer
              schema={state.schema}
              styles={state.styles || DEFAULT_STYLES}
              customCss={state.customCss}
              formId={state.id}
              preview
            />
          </Card>
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
            options={FIELD_TYPES}
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
          {!isStatic && (
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

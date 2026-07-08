import { Button, ButtonGroup, Badge, Banner, Text } from "@shopify/polaris";
import { fieldTypeLabel } from "../../../lib/multiStep.js";

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

export default function FieldListPanel({
  fields,
  steps,
  multiStepEnabled,
  features,
  onAddType,
  onEdit,
  onMove,
  onRemove,
  onNavigatePlans,
}) {
  const stepTitle = (field) => {
    if (!multiStepEnabled || !steps?.length) return null;
    return steps.find((s) => s.id === (field.stepId || steps[0]?.id))?.title;
  };

  return (
    <div className="fe-panel">
      <div className="fe-fields-header">
        <div>
          <h3 className="fe-section-title">Form fields</h3>
          <p className="fe-section-desc">
            {fields.length} field{fields.length === 1 ? "" : "s"} — drag order with Up / Down
          </p>
        </div>
        <Button primary onClick={() => onAddType("text")}>
          Add field
        </Button>
      </div>

      <div className="fe-quick-add">
        <Text variant="bodySm" color="subdued">
          Quick add
        </Text>
        <div className="fe-quick-add-grid">
          {QUICK_ADD_TYPES.map((t) => {
            const locked = t.pro && !features.fileUpload && t.value === "file";
            if (locked) return null;
            return (
              <button
                key={t.value}
                type="button"
                className="fe-quick-add-btn"
                onClick={() => onAddType(t.value)}
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
          File upload fields are available on Pro and Premium plans.
        </Banner>
      )}

      {!features.multiStep && (
        <Banner
          status="info"
          action={{ content: "View plans", onAction: onNavigatePlans }}
        >
          Multi-step forms are available on Pro and Premium plans.
        </Banner>
      )}

      {fields.length === 0 ? (
        <div className="fe-fields-empty">
          <div className="fe-fields-empty-icon">+</div>
          <h4>No fields yet</h4>
          <p>Add your first field using the buttons above or click &quot;Add field&quot;.</p>
        </div>
      ) : (
        <ul className="fe-field-list">
          {fields.map((field, index) => {
            const step = stepTitle(field);
            return (
              <li key={field.id} className="fe-field-item">
                <div className="fe-field-index">{index + 1}</div>
                <div className="fe-field-body">
                  <div className="fe-field-top">
                    <span className="fe-field-label">{field.label}</span>
                    <span className="fe-field-type-badge">
                      {fieldTypeLabel(field.type)}
                    </span>
                    {field.required && (
                      <span className="fe-field-required">Required</span>
                    )}
                    {step && <Badge size="small">{step}</Badge>}
                  </div>
                  {field.placeholder && (
                    <span className="fe-field-meta">
                      Placeholder: {field.placeholder}
                    </span>
                  )}
                </div>
                <ButtonGroup>
                  <Button
                    size="slim"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="slim"
                    onClick={() => onMove(index, 1)}
                    disabled={index === fields.length - 1}
                  >
                    ↓
                  </Button>
                  <Button size="slim" onClick={() => onEdit(index)}>
                    Edit
                  </Button>
                  <Button size="slim" destructive onClick={() => onRemove(index)}>
                    ×
                  </Button>
                </ButtonGroup>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

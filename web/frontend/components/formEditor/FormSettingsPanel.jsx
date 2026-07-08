import { useState } from "react";
import { Button, FormLayout, TextField, Text } from "@shopify/polaris";

function CopyIdButton({ id }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="app-btn-outline fe-copy-btn" onClick={copy}>
      {copied ? "Copied!" : "Copy ID"}
    </button>
  );
}

export default function FormSettingsPanel({ state, onUpdateName, onUpdateSchema, onToggleStatus }) {
  const isActive = state.status === "active";

  return (
    <div className="fe-panel">
      <section className="fe-section">
        <h3 className="fe-section-title">Form details</h3>
        <FormLayout>
          <TextField
            label="Internal name"
            value={state.name}
            onChange={onUpdateName}
            helpText="Only visible in the app — not shown on your storefront"
            autoComplete="off"
          />
          <div className="fe-status-row">
            <div>
              <Text variant="bodySm" color="subdued">
                Status
              </Text>
              <div className="fe-status-pill-wrap">
                <span
                  className={`app-status app-status--${
                    isActive ? "active" : "draft"
                  }`}
                >
                  {state.status}
                </span>
              </div>
            </div>
            <Button onClick={onToggleStatus}>
              {isActive ? "Set as draft" : "Activate form"}
            </Button>
          </div>
        </FormLayout>
      </section>

      <section className="fe-section">
        <h3 className="fe-section-title">Storefront content</h3>
        <p className="fe-section-desc">
          What customers see when the form loads on your theme.
        </p>
        <FormLayout>
          <TextField
            label="Form title"
            value={state.schema?.title || ""}
            onChange={(v) => onUpdateSchema({ title: v })}
            autoComplete="off"
          />
          <TextField
            label="Description"
            value={state.schema?.description || ""}
            onChange={(v) => onUpdateSchema({ description: v })}
            multiline={3}
            autoComplete="off"
          />
          <TextField
            label="Submit button label"
            value={state.schema?.submitLabel || ""}
            onChange={(v) => onUpdateSchema({ submitLabel: v })}
            autoComplete="off"
          />
          <TextField
            label="Success message"
            value={state.schema?.successMessage || ""}
            onChange={(v) => onUpdateSchema({ successMessage: v })}
            multiline={2}
            helpText="Shown after a successful submission"
            autoComplete="off"
          />
        </FormLayout>
      </section>

      <section className="fe-section fe-section--embed">
        <h3 className="fe-section-title">Add to your theme</h3>
        <p className="fe-section-desc">
          Paste this Form ID into the Integriti Form block in your theme editor.
        </p>
        <div className="fe-embed-box">
          <code className="fe-embed-id">{state.id}</code>
          <CopyIdButton id={state.id} />
        </div>
        <ol className="fe-embed-steps">
          <li>Online Store → Themes → Customize</li>
          <li>Add the <strong>Integriti Form</strong> block</li>
          <li>Paste your Form ID and save</li>
        </ol>
        {!isActive && (
          <p className="fe-embed-warning">
            Activate this form before adding it to your theme.
          </p>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import {
  Banner,
  Collapsible,
  FormLayout,
  Select,
  TextField,
} from "@shopify/polaris";
import ColorControl from "../ColorControl";

function DesignSection({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="fe-design-section">
      <button
        type="button"
        className="fe-design-section-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <span className="fe-design-section-title">{title}</span>
          {description && (
            <span className="fe-design-section-desc">{description}</span>
          )}
        </div>
        <span className="fe-design-chevron">{open ? "−" : "+"}</span>
      </button>
      <Collapsible open={open}>
        <div className="fe-design-section-body">
          <FormLayout>{children}</FormLayout>
        </div>
      </Collapsible>
    </div>
  );
}

export default function DesignPanel({
  styles,
  allowGradients,
  onUpdateStyle,
  onNavigatePlans,
}) {
  return (
    <div className="fe-panel">
      <div className="fe-fields-header">
        <div>
          <h3 className="fe-section-title">Design & styling</h3>
          <p className="fe-section-desc">
            Customize how your form looks on the storefront. Changes appear in the
            live preview instantly.
          </p>
        </div>
      </div>

      {!allowGradients && (
        <Banner
          status="info"
          action={{ content: "View plans", onAction: onNavigatePlans }}
        >
          Gradient colors are available on Pro and Premium plans.
        </Banner>
      )}

      <DesignSection title="Header" description="Title and description area" defaultOpen>
        <ColorControl
          label="Header background"
          value={styles?.headerBackground}
          onChange={(v) => onUpdateStyle("headerBackground", v)}
          allowGradient={allowGradients}
          fallback="transparent"
        />
        <TextField
          label="Header padding (px)"
          type="number"
          value={styles?.headerPadding || "0"}
          onChange={(v) => onUpdateStyle("headerPadding", v)}
          autoComplete="off"
        />
        <TextField
          label="Header border radius (px)"
          type="number"
          value={styles?.headerBorderRadius || "0"}
          onChange={(v) => onUpdateStyle("headerBorderRadius", v)}
          autoComplete="off"
        />
        <TextField
          label="Title color"
          value={styles?.titleColor || ""}
          onChange={(v) => onUpdateStyle("titleColor", v)}
          autoComplete="off"
        />
        <TextField
          label="Title size (px)"
          type="number"
          value={styles?.titleSize || "24"}
          onChange={(v) => onUpdateStyle("titleSize", v)}
          autoComplete="off"
        />
        <TextField
          label="Description color"
          value={styles?.descriptionColor || ""}
          onChange={(v) => onUpdateStyle("descriptionColor", v)}
          autoComplete="off"
        />
        <TextField
          label="Description size (px)"
          type="number"
          value={styles?.descriptionSize || "16"}
          onChange={(v) => onUpdateStyle("descriptionSize", v)}
          autoComplete="off"
        />
      </DesignSection>

      <DesignSection title="Colors" description="Background, text, and inputs">
        <ColorControl
          label="Form background"
          value={styles?.backgroundColor}
          onChange={(v) => onUpdateStyle("backgroundColor", v)}
          allowGradient={allowGradients}
        />
        <TextField
          label="Text color"
          value={styles?.textColor || ""}
          onChange={(v) => onUpdateStyle("textColor", v)}
          autoComplete="off"
        />
        <TextField
          label="Label color"
          value={styles?.labelColor || ""}
          onChange={(v) => onUpdateStyle("labelColor", v)}
          autoComplete="off"
        />
        <ColorControl
          label="Input border"
          value={styles?.inputBorderColor}
          onChange={(v) => onUpdateStyle("inputBorderColor", v)}
          allowGradient={allowGradients}
          fallback="#cccccc"
        />
        <ColorControl
          label="Focus border"
          value={styles?.focusBorderColor}
          onChange={(v) => onUpdateStyle("focusBorderColor", v)}
          allowGradient={allowGradients}
          fallback="#1a1a1a"
        />
        <TextField
          label="Error color"
          value={styles?.errorColor || ""}
          onChange={(v) => onUpdateStyle("errorColor", v)}
          autoComplete="off"
        />
      </DesignSection>

      <DesignSection title="Button" description="Submit button styling">
        <ColorControl
          label="Button background"
          value={styles?.buttonBackgroundColor}
          onChange={(v) => onUpdateStyle("buttonBackgroundColor", v)}
          allowGradient={allowGradients}
          fallback="#1a1a1a"
        />
        <TextField
          label="Button text color"
          value={styles?.buttonTextColor || ""}
          onChange={(v) => onUpdateStyle("buttonTextColor", v)}
          autoComplete="off"
        />
      </DesignSection>

      <DesignSection title="Layout & typography" description="Spacing, width, and font">
        <Select
          label="Field spacing"
          options={[
            { label: "Compact", value: "compact" },
            { label: "Comfortable", value: "comfortable" },
            { label: "Spacious", value: "spacious" },
          ]}
          value={styles?.fieldSpacing || "comfortable"}
          onChange={(v) => onUpdateStyle("fieldSpacing", v)}
        />
        <TextField
          label="Max width (px)"
          type="number"
          value={styles?.maxWidth || "640"}
          onChange={(v) => onUpdateStyle("maxWidth", v)}
          autoComplete="off"
        />
        <TextField
          label="Border radius (px)"
          type="number"
          value={styles?.borderRadius || "4"}
          onChange={(v) => onUpdateStyle("borderRadius", v)}
          autoComplete="off"
        />
        <TextField
          label="Input padding (px)"
          type="number"
          value={styles?.inputPadding || "12"}
          onChange={(v) => onUpdateStyle("inputPadding", v)}
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
          value={styles?.fontFamily || "inherit"}
          onChange={(v) => onUpdateStyle("fontFamily", v)}
        />
      </DesignSection>
    </div>
  );
}

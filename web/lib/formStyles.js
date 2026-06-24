export const SPACING = {
  compact: "8px",
  comfortable: "16px",
  spacious: "24px",
};

export function resolveColor(token, fallback) {
  if (!token) return fallback;
  if (typeof token === "string") return token;
  if (token.type === "gradient") {
    const angle = token.angle ?? 180;
    return `linear-gradient(${angle}deg, ${token.from || fallback}, ${token.to || fallback})`;
  }
  return token.color || fallback;
}

export function buildFormStyles(styles, customCss, formId) {
  const s = styles || {};
  const gap = SPACING[s.fieldSpacing] || SPACING.comfortable;
  const scope = formId ? `.integriti-form-${formId}` : ".integriti-form";

  const bg = resolveColor(s.backgroundColor, "#ffffff");
  const headerBg = resolveColor(s.headerBackground, "transparent");
  const btnBg = resolveColor(s.buttonBackgroundColor, "#1a1a1a");
  const inputBorder = resolveColor(s.inputBorderColor, "#cccccc");
  const focusBorder = resolveColor(s.focusBorderColor, "#1a1a1a");

  const headerPadding = s.headerPadding || "0";
  const headerRadius = s.headerBorderRadius || "0";
  const titleSize = s.titleSize || "24";
  const titleWeight = s.titleWeight || "600";
  const titleColor = s.titleColor || s.textColor || "#1a1a1a";
  const descSize = s.descriptionSize || s.inputSize || "16";
  const descColor = s.descriptionColor || s.textColor || "#1a1a1a";
  const descOpacity = s.descriptionOpacity ?? "0.85";

  return `
${scope} {
  background: ${bg};
  color: ${s.textColor || "#1a1a1a"};
  font-family: ${s.fontFamily || "inherit"};
  max-width: ${s.maxWidth || "640"}px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}
${scope} * { box-sizing: border-box; }
${scope} .integriti-form-header {
  background: ${headerBg};
  padding: ${headerPadding}px;
  border-radius: ${headerRadius}px;
  margin-bottom: 24px;
}
${scope} .integriti-form-title {
  margin: 0 0 8px;
  font-size: ${titleSize}px;
  font-weight: ${titleWeight};
  color: ${titleColor};
  line-height: 1.3;
}
${scope} .integriti-form-description {
  margin: 0;
  font-size: ${descSize}px;
  color: ${descColor};
  line-height: 1.5;
  opacity: ${descOpacity};
}
${scope} .integriti-form-fields {
  display: flex;
  flex-wrap: wrap;
  gap: ${gap};
}
${scope} .integriti-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
${scope} .integriti-field--half { width: calc(50% - ${gap} / 2); }
${scope} .integriti-field--full { width: 100%; }
@media (max-width: 600px) {
  ${scope} .integriti-field--half { width: 100%; }
}
${scope} .integriti-label {
  font-size: ${s.labelSize || "14"}px;
  color: ${s.labelColor || "#444444"};
  font-weight: 500;
}
${scope} .integriti-help {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}
${scope} .integriti-input,
${scope} .integriti-textarea,
${scope} .integriti-select,
${scope} .integriti-file {
  width: 100%;
  padding: ${s.inputPadding || "12"}px;
  font-size: ${s.inputSize || "16"}px;
  border: 1px solid ${inputBorder};
  border-radius: ${s.borderRadius || "4"}px;
  background: #ffffff;
  color: ${s.textColor || "#1a1a1a"};
}
${scope} .integriti-file { padding: 8px; }
${scope} .integriti-file-name {
  font-size: 12px;
  color: ${s.labelColor || "#444444"};
  margin-top: 4px;
}
${scope} .integriti-input:focus,
${scope} .integriti-textarea:focus,
${scope} .integriti-select:focus,
${scope} .integriti-file:focus {
  outline: none;
  border-color: ${focusBorder};
}
${scope} .integriti-textarea { min-height: 120px; resize: vertical; }
${scope} .integriti-heading {
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 600;
  width: 100%;
}
${scope} .integriti-paragraph {
  margin: 0;
  font-size: ${s.inputSize || "16"}px;
  line-height: 1.5;
  width: 100%;
}
${scope} .integriti-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
${scope} .integriti-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${s.inputSize || "16"}px;
}
${scope} .integriti-error {
  color: ${s.errorColor || "#b42318"};
  font-size: 12px;
  margin: 0;
}
${scope} .integriti-form-error {
  padding: 12px;
  border: 1px solid ${s.errorColor || "#b42318"};
  color: ${s.errorColor || "#b42318"};
  margin-bottom: 16px;
  font-size: 14px;
}
${scope} .integriti-form-success {
  padding: 16px;
  border: 1px solid ${inputBorder};
  font-size: ${s.inputSize || "16"}px;
}
${scope} .integriti-submit {
  margin-top: 8px;
  padding: 12px 24px;
  font-size: ${s.inputSize || "16"}px;
  font-weight: 500;
  background: ${btnBg};
  color: ${s.buttonTextColor || "#ffffff"};
  border: none;
  border-radius: ${s.borderRadius || "4"}px;
  cursor: pointer;
  width: 100%;
}
${scope} .integriti-submit:hover { opacity: 0.9; }
${scope} .integriti-submit:disabled { opacity: 0.5; cursor: not-allowed; }
${scope} .integriti-hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; overflow: hidden; }
${customCss || ""}
`;
}

export function getFormStyles(styles, customCss, formId) {
  return buildFormStyles(styles, customCss, formId);
}

export const CSS_CLASS_REFERENCE = `.integriti-form-title — Form title
.integriti-form-description — Form description
.integriti-form-header — Title + description wrapper
.integriti-field--{fieldId} — Individual field (e.g. .integriti-field--field_name)
.integriti-field--{type} — Field by type (e.g. .integriti-field--email)
.integriti-field--full / .integriti-field--half — Field width
.integriti-input, .integriti-textarea, .integriti-select, .integriti-file — Inputs
.integriti-label, .integriti-help, .integriti-error — Labels and messages
.integriti-submit — Submit button
.integriti-form-success, .integriti-form-error — Status messages`;

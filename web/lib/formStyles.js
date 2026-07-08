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
${scope} .integriti-step-progress { margin-bottom: 24px; }
${scope} .integriti-step-progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: ${s.labelColor || "#444444"};
  margin-bottom: 8px;
  font-weight: 500;
}
${scope} .integriti-step-progress-track {
  height: 6px;
  background: ${inputBorder};
  border-radius: 999px;
  overflow: hidden;
}
${scope} .integriti-step-progress-fill {
  height: 100%;
  background: ${btnBg};
  border-radius: 999px;
  transition: width 0.35s ease;
}
${scope} .integriti-step-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}
${scope} .integriti-step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${inputBorder};
  transition: background 0.25s ease, transform 0.25s ease;
}
${scope} .integriti-step-dot--active {
  background: ${focusBorder};
  transform: scale(1.15);
}
${scope} .integriti-step-dot--done {
  background: ${btnBg};
}
${scope} .integriti-step-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}
${scope} .integriti-step-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${inputBorder};
  background: #fff;
  font-size: 13px;
  font-family: inherit;
  color: ${s.labelColor || "#444444"};
  cursor: default;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
}
${scope} .integriti-step-pill:disabled { cursor: default; }
${scope} button.integriti-step-pill:not(:disabled) { cursor: pointer; }
${scope} button.integriti-step-pill:not(:disabled):hover {
  border-color: ${focusBorder};
}
${scope} .integriti-step-pill--active {
  border-color: ${focusBorder};
  background: ${btnBg};
  color: ${s.buttonTextColor || "#ffffff"};
}
${scope} .integriti-step-pill--done {
  border-color: ${focusBorder};
  background: rgba(0,0,0,0.04);
}
${scope} .integriti-step-pill-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: rgba(0,0,0,0.06);
}
${scope} .integriti-step-pill--active .integriti-step-pill-num {
  background: rgba(255,255,255,0.25);
}
${scope} .integriti-step-numbered {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 24px;
}
${scope} .integriti-step-numbered-item {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}
${scope} .integriti-step-connector {
  flex: 1;
  height: 2px;
  min-width: 12px;
  margin: 0 4px;
  background: ${inputBorder};
  border-radius: 1px;
}
${scope} .integriti-step-connector--done {
  background: ${btnBg};
}
${scope} .integriti-step-number {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${s.labelColor || "#444444"};
  opacity: 0.55;
  background: none;
  border: none;
  padding: 4px 0;
  font-family: inherit;
  cursor: default;
  white-space: nowrap;
}
${scope} button.integriti-step-number:not(:disabled) { cursor: pointer; }
${scope} button.integriti-step-number:not(:disabled):hover { opacity: 0.85; }
${scope} .integriti-step-number--active {
  opacity: 1;
  font-weight: 600;
  color: ${s.textColor || "#1a1a1a"};
}
${scope} .integriti-step-number-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid ${inputBorder};
  background: #fff;
}
${scope} .integriti-step-number--active .integriti-step-number-badge,
${scope} .integriti-step-number--done .integriti-step-number-badge {
  border-color: ${focusBorder};
  background: ${btnBg};
  color: ${s.buttonTextColor || "#ffffff"};
}
${scope} .integriti-step-number-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
${scope} .integriti-preview-hint {
  margin: 0 0 16px;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.4;
  color: ${s.labelColor || "#444444"};
  background: rgba(0,0,0,0.04);
  border-radius: ${s.borderRadius || "4"}px;
  border: 1px dashed ${inputBorder};
}
${scope} .integriti-step-empty {
  width: 100%;
  padding: 32px 20px;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
  color: ${s.labelColor || "#444444"};
  background: rgba(0,0,0,0.03);
  border: 1px dashed ${inputBorder};
  border-radius: ${s.borderRadius || "4"}px;
}
${scope} .integriti-step-header {
  margin-bottom: 20px;
}
${scope} .integriti-step-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: ${titleColor};
  line-height: 1.3;
}
${scope} .integriti-step-description {
  margin: 0;
  font-size: ${descSize}px;
  color: ${descColor};
  line-height: 1.5;
  opacity: ${descOpacity};
}
${scope} .integriti-step-fields {
  animation: integriti-step-in 0.3s ease;
}
@keyframes integriti-step-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
${scope} .integriti-step-nav {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  align-items: center;
}
${scope} .integriti-step-nav--split {
  justify-content: space-between;
}
${scope} .integriti-btn-back {
  padding: 12px 20px;
  font-size: ${s.inputSize || "16"}px;
  font-weight: 500;
  background: transparent;
  color: ${s.textColor || "#1a1a1a"};
  border: 1px solid ${inputBorder};
  border-radius: ${s.borderRadius || "4"}px;
  cursor: pointer;
  font-family: inherit;
}
${scope} .integriti-btn-back:hover { background: rgba(0,0,0,0.03); }
${scope} .integriti-btn-next {
  flex: 1;
  padding: 12px 24px;
  font-size: ${s.inputSize || "16"}px;
  font-weight: 500;
  background: ${btnBg};
  color: ${s.buttonTextColor || "#ffffff"};
  border: none;
  border-radius: ${s.borderRadius || "4"}px;
  cursor: pointer;
  font-family: inherit;
}
${scope} .integriti-step-nav--split .integriti-btn-next { flex: 0 1 auto; min-width: 140px; margin-left: auto; }
${scope} .integriti-btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
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
.integriti-step-progress, .integriti-step-dots, .integriti-step-numbered — Progress indicators
.integriti-step-title, .integriti-step-description — Per-step header
.integriti-btn-back, .integriti-btn-next — Multi-step navigation
.integriti-form-success, .integriti-form-error — Status messages`;

const SPACING = {
  compact: "8px",
  comfortable: "16px",
  spacious: "24px",
};

function buildStyles(styles, customCss, formId) {
  const s = styles || {};
  const gap = SPACING[s.fieldSpacing] || SPACING.comfortable;
  const scope = formId ? `.integriti-form-${formId}` : ".integriti-form";

  return `
${scope} {
  background: ${s.backgroundColor || "#ffffff"};
  color: ${s.textColor || "#1a1a1a"};
  font-family: ${s.fontFamily || "inherit"};
  max-width: ${s.maxWidth || "640"}px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}
${scope} * { box-sizing: border-box; }
${scope} .integriti-form-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
}
${scope} .integriti-form-description {
  margin: 0 0 24px;
  font-size: ${s.inputSize || "16"}px;
  line-height: 1.5;
  opacity: 0.85;
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
${scope} .integriti-select {
  width: 100%;
  padding: ${s.inputPadding || "12"}px;
  font-size: ${s.inputSize || "16"}px;
  border: 1px solid ${s.inputBorderColor || "#cccccc"};
  border-radius: ${s.borderRadius || "4"}px;
  background: #ffffff;
  color: ${s.textColor || "#1a1a1a"};
}
${scope} .integriti-input:focus,
${scope} .integriti-textarea:focus,
${scope} .integriti-select:focus {
  outline: none;
  border-color: ${s.focusBorderColor || "#1a1a1a"};
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
  border: 1px solid ${s.inputBorderColor || "#cccccc"};
  font-size: ${s.inputSize || "16"}px;
}
${scope} .integriti-submit {
  margin-top: 8px;
  padding: 12px 24px;
  font-size: ${s.inputSize || "16"}px;
  font-weight: 500;
  background: ${s.buttonBackgroundColor || "#1a1a1a"};
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
  return buildStyles(styles, customCss, formId);
}

export { SPACING };

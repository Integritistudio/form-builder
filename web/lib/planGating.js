import { hasFeature } from "../services/plans.js";

function isGradientToken(value) {
  return value && typeof value === "object" && value.type === "gradient";
}

function stylesUseGradients(styles) {
  if (!styles) return false;
  const keys = [
    "backgroundColor",
    "headerBackground",
    "buttonBackgroundColor",
    "inputBorderColor",
    "focusBorderColor",
  ];
  return keys.some((k) => isGradientToken(styles[k]));
}

export function schemaHasFileFields(schema) {
  return (schema?.fields || []).some((f) => f.type === "file");
}

export function validateFormForPlan(plan, { schema, styles, customCss }) {
  const errors = [];

  if (customCss?.trim() && !hasFeature(plan, "customCss")) {
    errors.push({
      field: "customCss",
      message: "Custom CSS requires a Pro or Premium plan.",
      code: "PLAN_FEATURE",
    });
  }

  if (schemaHasFileFields(schema) && !hasFeature(plan, "fileUpload")) {
    errors.push({
      field: "schema",
      message: "File upload fields require a Pro or Premium plan.",
      code: "PLAN_FEATURE",
    });
  }

  if (stylesUseGradients(styles) && !hasFeature(plan, "gradients")) {
    errors.push({
      field: "styles",
      message: "Gradient colors require a Pro or Premium plan.",
      code: "PLAN_FEATURE",
    });
  }

  return errors;
}

function stripGradients(styles) {
  if (!styles) return styles;
  const next = { ...styles };
  for (const key of Object.keys(next)) {
    if (isGradientToken(next[key])) {
      next[key] =
        next[key].from || next[key].color || "#ffffff";
    }
  }
  return next;
}

export function sanitizeFormForPublic(plan, form) {
  const customCss = hasFeature(plan, "customCss") ? form.customCss || "" : "";
  const styles = hasFeature(plan, "gradients")
    ? form.styles
    : stripGradients(form.styles);

  let schema = form.schema;
  if (!hasFeature(plan, "fileUpload") && schemaHasFileFields(schema)) {
    schema = {
      ...schema,
      fields: (schema.fields || []).filter((f) => f.type !== "file"),
    };
  }

  return { ...form, schema, styles, customCss };
}

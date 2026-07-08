const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEFAULT_MULTI_STEP = {
  enabled: false,
  showProgress: true,
  progressStyle: "bar",
  showStepTitles: true,
  allowBack: true,
  animateTransitions: true,
  backLabel: "Back",
};

export function createStep(title = "New step") {
  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    description: "",
    nextLabel: "Continue",
  };
}

export function isMultiStepActive(schema) {
  return Boolean(
    schema?.multiStep?.enabled &&
      Array.isArray(schema?.steps) &&
      schema.steps.length > 1
  );
}

export function getDefaultStepId(schema) {
  return schema?.steps?.[0]?.id || null;
}

export function getFieldsForStep(schema, stepId) {
  const fields = schema?.fields || [];
  const defaultStepId = getDefaultStepId(schema);
  const resolvedStepId = stepId || defaultStepId;
  if (!resolvedStepId) return fields;

  return fields.filter((field) => {
    const fieldStep = field.stepId || defaultStepId;
    return fieldStep === resolvedStepId;
  });
}

export function getStepFieldGroups(schema) {
  const steps = schema?.steps || [];
  if (!steps.length) {
    return [{ step: null, fields: schema?.fields || [] }];
  }

  const defaultStepId = steps[0]?.id;
  return steps.map((step) => ({
    step,
    fields: (schema?.fields || []).filter(
      (field) => (field.stepId || defaultStepId) === step.id
    ),
  }));
}

export function initializeMultiStepSchema(schema) {
  const fields = schema?.fields || [];
  const inputFields = fields.filter(
    (f) => f.type !== "heading" && f.type !== "paragraph"
  );
  const midpoint = Math.max(1, Math.ceil(inputFields.length / 2));

  const step1 = createStep("Your details");
  const step2 = createStep("Additional info");
  step2.nextLabel = schema?.submitLabel || "Submit";

  let inputIndex = 0;
  const nextFields = fields.map((field) => {
    if (field.type === "heading" || field.type === "paragraph") {
      return { ...field, stepId: step1.id };
    }
    inputIndex += 1;
    return {
      ...field,
      stepId: inputIndex <= midpoint ? step1.id : step2.id,
    };
  });

  return {
    ...schema,
    multiStep: { ...DEFAULT_MULTI_STEP, enabled: true },
    steps: [step1, step2],
    fields: nextFields,
  };
}

export function disableMultiStepSchema(schema) {
  return {
    ...schema,
    multiStep: { ...(schema?.multiStep || DEFAULT_MULTI_STEP), enabled: false },
  };
}

export function validateStepFieldsSync(schema, stepId, data) {
  const errors = {};
  const fields = getFieldsForStep(schema, stepId);

  for (const field of fields) {
    if (field.type === "heading" || field.type === "paragraph") continue;

    const value = data[field.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (field.type === "file" && (!value || !value.fileId));

    if (field.required && isEmpty) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }

    if (isEmpty) continue;

    if (field.type === "email" && !EMAIL_REGEX.test(String(value))) {
      errors[field.id] = "Enter a valid email address";
    }

    if (field.type === "number" && Number.isNaN(Number(value))) {
      errors[field.id] = "Enter a valid number";
    }

    if (field.type !== "file") {
      const strVal = String(value);
      if (field.minLength && strVal.length < field.minLength) {
        errors[field.id] = `Minimum ${field.minLength} characters`;
      }
      if (field.maxLength && strVal.length > field.maxLength) {
        errors[field.id] = `Maximum ${field.maxLength} characters`;
      }
    }
  }

  return errors;
}

export function assignFieldToStep(schema, fieldId, stepId) {
  return {
    ...schema,
    fields: (schema.fields || []).map((f) =>
      f.id === fieldId ? { ...f, stepId } : f
    ),
  };
}

export function getFieldsForStepId(schema, stepId) {
  return getFieldsForStep(schema, stepId);
}

export function fieldTypeLabel(type) {
  const labels = {
    text: "Text",
    email: "Email",
    tel: "Phone",
    textarea: "Long text",
    number: "Number",
    date: "Date",
    select: "Dropdown",
    radio: "Radio",
    checkbox: "Checkbox",
    checkbox_group: "Checkboxes",
    file: "File",
    heading: "Heading",
    paragraph: "Text block",
  };
  return labels[type] || type;
}

export function moveFieldWithinStep(schema, stepId, fieldId, direction) {
  const defaultStepId = getDefaultStepId(schema);
  const fields = [...(schema.fields || [])];
  const resolvedStepId = stepId || defaultStepId;

  const stepIndices = fields
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => (f.stepId || defaultStepId) === resolvedStepId)
    .map(({ i }) => i);

  const currentIndex = fields.findIndex((f) => f.id === fieldId);
  const posInStep = stepIndices.indexOf(currentIndex);
  if (posInStep < 0) return schema;

  const targetPos = posInStep + direction;
  if (targetPos < 0 || targetPos >= stepIndices.length) return schema;

  const swapIndex = stepIndices[targetPos];
  [fields[currentIndex], fields[swapIndex]] = [
    fields[swapIndex],
    fields[currentIndex],
  ];

  return { ...schema, fields };
}

export function moveFieldInSchema(schema, fieldIndex, direction) {
  const fields = [...(schema.fields || [])];
  const target = fieldIndex + direction;
  if (target < 0 || target >= fields.length) return schema;
  [fields[fieldIndex], fields[target]] = [fields[target], fields[fieldIndex]];
  return { ...schema, fields };
}

export function stripMultiStepFromSchema(schema) {
  if (!schema) return schema;
  const { multiStep, steps, ...rest } = schema;
  const fields = (rest.fields || []).map(({ stepId, ...field }) => field);
  return {
    ...rest,
    fields,
    multiStep: { ...DEFAULT_MULTI_STEP, enabled: false },
    steps: [],
  };
}

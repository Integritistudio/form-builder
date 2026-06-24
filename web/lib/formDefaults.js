export const DEFAULT_STYLES = {
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
  headerBackground: "transparent",
  headerPadding: "0",
  headerBorderRadius: "0",
  titleColor: "#1a1a1a",
  titleSize: "24",
  titleWeight: "600",
  descriptionColor: "#1a1a1a",
  descriptionSize: "16",
  descriptionOpacity: "0.85",
};

export const DEFAULT_FORM_SCHEMA = {
  title: "Contact us",
  description: "",
  submitLabel: "Submit",
  successMessage: "Thank you. Your submission has been received.",
  fields: [
    {
      id: "field_name",
      type: "text",
      label: "Name",
      placeholder: "Your name",
      required: true,
      width: "full",
      helpText: "",
      options: [],
      defaultValue: "",
      minLength: null,
      maxLength: null,
    },
    {
      id: "field_email",
      type: "email",
      label: "Email",
      placeholder: "you@example.com",
      required: true,
      width: "full",
      helpText: "",
      options: [],
      defaultValue: "",
      minLength: null,
      maxLength: null,
    },
    {
      id: "field_message",
      type: "textarea",
      label: "Message",
      placeholder: "How can we help?",
      required: false,
      width: "full",
      helpText: "",
      options: [],
      defaultValue: "",
      minLength: null,
      maxLength: null,
    },
  ],
};

export const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio buttons" },
  { value: "checkbox", label: "Single checkbox" },
  { value: "checkbox_group", label: "Checkbox group" },
  { value: "file", label: "File upload" },
  { value: "heading", label: "Heading" },
  { value: "paragraph", label: "Paragraph" },
];

export function createField(type) {
  const base = {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
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

  if (type === "heading") {
    base.label = "Section heading";
    base.required = false;
  }
  if (type === "paragraph") {
    base.label = "Add your text here.";
    base.required = false;
  }
  if (type === "checkbox") {
    base.label = "I agree to the terms";
  }
  if (type === "file") {
    base.label = "Upload file";
    base.placeholder = "Choose a file";
    base.helpText = "Maximum file size: 2 MB.";
  }

  return base;
}

export function fieldClassName(field) {
  const width = field.width === "half" ? "integriti-field--half" : "integriti-field--full";
  return `integriti-field integriti-field--${field.id} integriti-field--${field.type} ${width}`;
}

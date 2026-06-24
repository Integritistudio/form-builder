(function () {
  const SPACING = { compact: "8px", comfortable: "16px", spacious: "24px" };

  function getApiOrigin(block) {
    const shop = block.getAttribute("data-shop");
    if (shop) return `https://${shop}`;
    return "";
  }

  function proxyUrl(origin, path) {
    return `${origin}/apps/integriti-forms${path}`;
  }

  async function parseJsonResponse(res) {
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        "Form could not be loaded. Make sure the form is activated in the app and the app proxy is enabled."
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid response from server. Check that the form ID is correct and active.");
    }
  }

  function buildStyles(styles, customCss, formId) {
    const s = styles || {};
    const gap = SPACING[s.fieldSpacing] || SPACING.comfortable;
    const scope = `.integriti-form-${formId}`;
    return `
${scope}{background:${s.backgroundColor||"#fff"};color:${s.textColor||"#1a1a1a"};font-family:${s.fontFamily||"inherit"};max-width:${s.maxWidth||"640"}px;margin:0 auto;padding:24px;box-sizing:border-box;}
${scope} *{box-sizing:border-box;}
${scope} .integriti-form-title{margin:0 0 8px;font-size:24px;font-weight:600;}
${scope} .integriti-form-description{margin:0 0 24px;font-size:${s.inputSize||"16"}px;line-height:1.5;opacity:.85;}
${scope} .integriti-form-fields{display:flex;flex-wrap:wrap;gap:${gap};}
${scope} .integriti-field{display:flex;flex-direction:column;gap:6px;}
${scope} .integriti-field--half{width:calc(50% - ${gap}/2);}
${scope} .integriti-field--full{width:100%;}
@media(max-width:600px){${scope} .integriti-field--half{width:100%;}}
${scope} .integriti-label{font-size:${s.labelSize||"14"}px;color:${s.labelColor||"#444"};font-weight:500;}
${scope} .integriti-help{font-size:12px;opacity:.7;margin:0;}
${scope} .integriti-input,${scope} .integriti-textarea,${scope} .integriti-select{width:100%;padding:${s.inputPadding||"12"}px;font-size:${s.inputSize||"16"}px;border:1px solid ${s.inputBorderColor||"#ccc"};border-radius:${s.borderRadius||"4"}px;background:#fff;color:${s.textColor||"#1a1a1a"};}
${scope} .integriti-input:focus,${scope} .integriti-textarea:focus,${scope} .integriti-select:focus{outline:none;border-color:${s.focusBorderColor||"#1a1a1a"};}
${scope} .integriti-textarea{min-height:120px;resize:vertical;}
${scope} .integriti-heading{margin:8px 0 0;font-size:18px;font-weight:600;width:100%;}
${scope} .integriti-paragraph{margin:0;font-size:${s.inputSize||"16"}px;line-height:1.5;width:100%;}
${scope} .integriti-options{display:flex;flex-direction:column;gap:8px;}
${scope} .integriti-option{display:flex;align-items:center;gap:8px;}
${scope} .integriti-error{color:${s.errorColor||"#b42318"};font-size:12px;margin:0;}
${scope} .integriti-form-error{padding:12px;border:1px solid ${s.errorColor||"#b42318"};color:${s.errorColor||"#b42318"};margin-bottom:16px;}
${scope} .integriti-form-success{padding:16px;border:1px solid ${s.inputBorderColor||"#ccc"};}
${scope} .integriti-submit{margin-top:8px;padding:12px 24px;font-size:${s.inputSize||"16"}px;font-weight:500;background:${s.buttonBackgroundColor||"#1a1a1a"};color:${s.buttonTextColor||"#fff"};border:none;border-radius:${s.borderRadius||"4"}px;cursor:pointer;width:100%;}
${scope} .integriti-submit:disabled{opacity:.5;cursor:not-allowed;}
${scope} .integriti-hp{position:absolute;left:-9999px;opacity:0;height:0;width:0;}
${customCss||""}`;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "className") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else node.setAttribute(k, v);
      });
    }
    (children || []).forEach((c) => {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function renderField(field, values, errors, onChange) {
    const width = field.width === "half" ? "integriti-field--half" : "integriti-field--full";
    const wrap = el("div", { className: `integriti-field ${width}` });

    if (field.type === "heading") {
      wrap.appendChild(el("h3", { className: "integriti-heading", text: field.label }));
      return wrap;
    }
    if (field.type === "paragraph") {
      wrap.appendChild(el("p", { className: "integriti-paragraph", text: field.label }));
      return wrap;
    }

    const id = `integriti-${field.id}`;
    wrap.appendChild(
      el("label", { className: "integriti-label", for: id, text: field.label + (field.required ? " *" : "") })
    );

    let input;
    if (field.type === "textarea") {
      input = el("textarea", { id, className: "integriti-textarea", placeholder: field.placeholder || "" });
      input.value = values[field.id] || "";
      input.addEventListener("input", () => onChange(field.id, input.value));
    } else if (["text", "email", "tel", "number", "date"].includes(field.type)) {
      input = el("input", { id, type: field.type, className: "integriti-input", placeholder: field.placeholder || "" });
      input.value = values[field.id] || "";
      input.addEventListener("input", () => onChange(field.id, input.value));
    } else if (field.type === "select") {
      input = el("select", { id, className: "integriti-select" });
      input.appendChild(el("option", { value: "", text: "Select..." }));
      (field.options || []).forEach((opt) => input.appendChild(el("option", { value: opt, text: opt })));
      input.value = values[field.id] || "";
      input.addEventListener("change", () => onChange(field.id, input.value));
    } else if (field.type === "radio") {
      input = el("div", { className: "integriti-options" });
      (field.options || []).forEach((opt) => {
        const label = el("label", { className: "integriti-option" });
        const radio = el("input", { type: "radio", name: field.id, value: opt });
        if (values[field.id] === opt) radio.checked = true;
        radio.addEventListener("change", () => onChange(field.id, opt));
        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt));
        input.appendChild(label);
      });
    } else if (field.type === "checkbox") {
      input = el("label", { className: "integriti-option" });
      const cb = el("input", { id, type: "checkbox" });
      cb.checked = Boolean(values[field.id]);
      cb.addEventListener("change", () => onChange(field.id, cb.checked));
      input.appendChild(cb);
      input.appendChild(document.createTextNode(field.placeholder || field.label));
    } else if (field.type === "checkbox_group") {
      input = el("div", { className: "integriti-options" });
      const current = values[field.id] || [];
      (field.options || []).forEach((opt) => {
        const label = el("label", { className: "integriti-option" });
        const cb = el("input", { type: "checkbox", value: opt });
        cb.checked = current.includes(opt);
        cb.addEventListener("change", () => {
          const next = cb.checked ? [...current, opt] : current.filter((v) => v !== opt);
          onChange(field.id, next);
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(opt));
        input.appendChild(label);
      });
    }

    if (input) wrap.appendChild(input);
    if (field.helpText) wrap.appendChild(el("p", { className: "integriti-help", text: field.helpText }));
    if (errors[field.id]) wrap.appendChild(el("p", { className: "integriti-error", text: errors[field.id] }));

    return wrap;
  }

  function renderForm(container, formData, apiOrigin) {
    const { id, schema, styles, customCss } = formData;
    const scopeClass = `integriti-form integriti-form-${id}`;
    const values = {};
    const errors = {};

    function onChange(fieldId, value) {
      values[fieldId] = value;
      delete errors[fieldId];
    }

    function draw(successMessage) {
      container.innerHTML = "";
      const root = el("div", { className: scopeClass });
      const style = el("style");
      style.textContent = buildStyles(styles, customCss, id);
      root.appendChild(style);

      if (successMessage) {
        root.appendChild(el("div", { className: "integriti-form-success", text: successMessage }));
        container.appendChild(root);
        return;
      }

      if (schema.title) root.appendChild(el("h2", { className: "integriti-form-title", text: schema.title }));
      if (schema.description) root.appendChild(el("p", { className: "integriti-form-description", text: schema.description }));

      const formEl = el("form");
      formEl.appendChild(el("input", { type: "text", name: "_hp_field", className: "integriti-hp", tabindex: "-1", autocomplete: "off" }));

      const fieldsWrap = el("div", { className: "integriti-form-fields" });
      (schema.fields || []).forEach((field) => fieldsWrap.appendChild(renderField(field, values, errors, onChange)));
      formEl.appendChild(fieldsWrap);

      const submit = el("button", { type: "submit", className: "integriti-submit", text: schema.submitLabel || "Submit" });
      formEl.appendChild(submit);

      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        submit.disabled = true;
        submit.textContent = "Sending...";

        try {
          const res = await fetch(proxyUrl(apiOrigin, `/forms/${id}/submit`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: values }),
          });
          const data = await parseJsonResponse(res);
          if (!res.ok) {
            submit.disabled = false;
            submit.textContent = schema.submitLabel || "Submit";
            if (data.errors) {
              Object.keys(data.errors).forEach((k) => { errors[k] = data.errors[k]; });
              draw();
            } else {
              const errEl = el("div", { className: "integriti-form-error", text: data.error || "Submission failed." });
              if (!root.querySelector(".integriti-form-error")) root.insertBefore(errEl, formEl);
            }
            return;
          }
          draw(data.message || schema.successMessage);
        } catch {
          submit.disabled = false;
          submit.textContent = schema.submitLabel || "Submit";
        }
      });

      root.appendChild(formEl);
      container.appendChild(root);
    }

    draw();
  }

  async function init() {
    const blocks = document.querySelectorAll("[data-integriti-form-id]");
    for (const block of blocks) {
      const formId = block.getAttribute("data-integriti-form-id");
      if (!formId) continue;
      const apiOrigin = getApiOrigin(block);
      block.innerHTML = '<p style="padding:16px;color:#666;">Loading form...</p>';
      try {
        const res = await fetch(proxyUrl(apiOrigin, `/forms/${formId}`));
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error(data.error || "Form not found");
        block.innerHTML = "";
        renderForm(block, data.form, apiOrigin);
      } catch (err) {
        block.innerHTML = `<p style="padding:16px;color:#b42318;">${err.message}</p>`;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

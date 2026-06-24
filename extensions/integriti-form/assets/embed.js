(function () {
  const SPACING = { compact: "8px", comfortable: "16px", spacious: "24px" };

  function resolveColor(token, fallback) {
    if (!token) return fallback;
    if (typeof token === "string") return token;
    if (token.type === "gradient") {
      const angle = token.angle ?? 180;
      return `linear-gradient(${angle}deg, ${token.from || fallback}, ${token.to || fallback})`;
    }
    return token.color || fallback;
  }

  function fieldClassName(field) {
    const width = field.width === "half" ? "integriti-field--half" : "integriti-field--full";
    return `integriti-field integriti-field--${field.id} integriti-field--${field.type} ${width}`;
  }

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
    const bg = resolveColor(s.backgroundColor, "#ffffff");
    const headerBg = resolveColor(s.headerBackground, "transparent");
    const btnBg = resolveColor(s.buttonBackgroundColor, "#1a1a1a");
    const inputBorder = resolveColor(s.inputBorderColor, "#cccccc");
    const focusBorder = resolveColor(s.focusBorderColor, "#1a1a1a");
    const titleSize = s.titleSize || "24";
    const titleWeight = s.titleWeight || "600";
    const titleColor = s.titleColor || s.textColor || "#1a1a1a";
    const descSize = s.descriptionSize || s.inputSize || "16";
    const descColor = s.descriptionColor || s.textColor || "#1a1a1a";
    const descOpacity = s.descriptionOpacity ?? "0.85";

    return `
${scope}{background:${bg};color:${s.textColor||"#1a1a1a"};font-family:${s.fontFamily||"inherit"};max-width:${s.maxWidth||"640"}px;margin:0 auto;padding:24px;box-sizing:border-box;}
${scope} *{box-sizing:border-box;}
${scope} .integriti-form-header{background:${headerBg};padding:${s.headerPadding||"0"}px;border-radius:${s.headerBorderRadius||"0"}px;margin-bottom:24px;}
${scope} .integriti-form-title{margin:0 0 8px;font-size:${titleSize}px;font-weight:${titleWeight};color:${titleColor};line-height:1.3;}
${scope} .integriti-form-description{margin:0;font-size:${descSize}px;color:${descColor};line-height:1.5;opacity:${descOpacity};}
${scope} .integriti-form-fields{display:flex;flex-wrap:wrap;gap:${gap};}
${scope} .integriti-field{display:flex;flex-direction:column;gap:6px;}
${scope} .integriti-field--half{width:calc(50% - ${gap}/2);}
${scope} .integriti-field--full{width:100%;}
@media(max-width:600px){${scope} .integriti-field--half{width:100%;}}
${scope} .integriti-label{font-size:${s.labelSize||"14"}px;color:${s.labelColor||"#444"};font-weight:500;}
${scope} .integriti-help{font-size:12px;opacity:.7;margin:0;}
${scope} .integriti-input,${scope} .integriti-textarea,${scope} .integriti-select,${scope} .integriti-file{width:100%;padding:${s.inputPadding||"12"}px;font-size:${s.inputSize||"16"}px;border:1px solid ${inputBorder};border-radius:${s.borderRadius||"4"}px;background:#fff;color:${s.textColor||"#1a1a1a"};}
${scope} .integriti-file{padding:8px;}
${scope} .integriti-file-name{font-size:12px;color:${s.labelColor||"#444"};margin-top:4px;}
${scope} .integriti-input:focus,${scope} .integriti-textarea:focus,${scope} .integriti-select:focus,${scope} .integriti-file:focus{outline:none;border-color:${focusBorder};}
${scope} .integriti-textarea{min-height:120px;resize:vertical;}
${scope} .integriti-heading{margin:8px 0 0;font-size:18px;font-weight:600;width:100%;}
${scope} .integriti-paragraph{margin:0;font-size:${s.inputSize||"16"}px;line-height:1.5;width:100%;}
${scope} .integriti-options{display:flex;flex-direction:column;gap:8px;}
${scope} .integriti-option{display:flex;align-items:center;gap:8px;}
${scope} .integriti-error{color:${s.errorColor||"#b42318"};font-size:12px;margin:0;}
${scope} .integriti-form-error{padding:12px;border:1px solid ${s.errorColor||"#b42318"};color:${s.errorColor||"#b42318"};margin-bottom:16px;}
${scope} .integriti-form-success{padding:16px;border:1px solid ${inputBorder};}
${scope} .integriti-submit{margin-top:8px;padding:12px 24px;font-size:${s.inputSize||"16"}px;font-weight:500;background:${btnBg};color:${s.buttonTextColor||"#fff"};border:none;border-radius:${s.borderRadius||"4"}px;cursor:pointer;width:100%;}
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

  const MAX_FILE_BYTES = 2 * 1024 * 1024;

  async function uploadFile(apiOrigin, formId, fieldId, file) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("File must be 2 MB or smaller.");
    }
    const formData = new FormData();
    formData.append("fieldId", fieldId);
    formData.append("file", file);

    const res = await fetch(proxyUrl(apiOrigin, `/forms/${formId}/upload`), {
      method: "POST",
      body: formData,
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error || "Upload failed");

    return {
      fileId: data.fileId,
      originalName: data.originalName || file.name,
      mimeType: data.mimeType || file.type,
      viewUrl: data.viewUrl,
    };
  }

  function renderField(field, values, errors, onChange, apiOrigin, formId) {
    const wrap = el("div", { className: fieldClassName(field) });

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
      (field.options || []).forEach((opt) => {
        const label = el("label", { className: "integriti-option" });
        const cb = el("input", { type: "checkbox", value: opt });
        const current = values[field.id] || [];
        cb.checked = current.includes(opt);
        cb.addEventListener("change", () => {
          const cur = values[field.id] || [];
          const next = cb.checked ? [...cur, opt] : cur.filter((v) => v !== opt);
          onChange(field.id, next);
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(opt));
        input.appendChild(label);
      });
    } else if (field.type === "file") {
      input = el("input", { id, type: "file", className: "integriti-file" });
      const nameEl = el("p", { className: "integriti-file-name", text: "" });
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          onChange(field.id, null);
          nameEl.textContent = "";
          return;
        }
        nameEl.textContent = "Uploading...";
        input.disabled = true;
        try {
          const result = await uploadFile(apiOrigin, formId, field.id, file);
          onChange(field.id, result);
          nameEl.textContent = file.name;
        } catch (err) {
          nameEl.textContent = err.message || "Upload failed";
          onChange(field.id, null);
        } finally {
          input.disabled = false;
        }
      });
      wrap.appendChild(input);
      wrap.appendChild(nameEl);
      if (field.helpText) wrap.appendChild(el("p", { className: "integriti-help", text: field.helpText }));
      if (errors[field.id]) wrap.appendChild(el("p", { className: "integriti-error", text: errors[field.id] }));
      return wrap;
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

      if (schema.title || schema.description) {
        const header = el("div", { className: "integriti-form-header" });
        if (schema.title) header.appendChild(el("h2", { className: "integriti-form-title", text: schema.title }));
        if (schema.description) header.appendChild(el("p", { className: "integriti-form-description", text: schema.description }));
        root.appendChild(header);
      }

      const formEl = el("form");
      formEl.appendChild(el("input", { type: "text", name: "_hp_field", className: "integriti-hp", tabindex: "-1", autocomplete: "off" }));

      const fieldsWrap = el("div", { className: "integriti-form-fields" });
      (schema.fields || []).forEach((field) =>
        fieldsWrap.appendChild(renderField(field, values, errors, onChange, apiOrigin, id))
      );
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

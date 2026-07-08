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

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function isMultiStepActive(schema) {
    return Boolean(
      schema?.multiStep?.enabled &&
        Array.isArray(schema?.steps) &&
        schema.steps.length > 1
    );
  }

  function getStepFieldGroups(schema) {
    const steps = schema?.steps || [];
    if (!steps.length) return [{ step: null, fields: schema?.fields || [] }];
    const defaultStepId = steps[0]?.id;
    return steps.map((step) => ({
      step,
      fields: (schema?.fields || []).filter(
        (field) => (field.stepId || defaultStepId) === step.id
      ),
    }));
  }

  function validateStepFieldsSync(schema, stepId, data) {
    const errors = {};
    const defaultStepId = schema?.steps?.[0]?.id;
    const fields = (schema?.fields || []).filter(
      (field) => (field.stepId || defaultStepId) === stepId
    );

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
    }
    return errors;
  }

  function renderStepProgress(schema, currentStep, totalSteps, styles) {
    const config = schema.multiStep || {};
    if (!config.showProgress) return null;

    const style = config.progressStyle || "bar";
    const pct = Math.round(((currentStep + 1) / totalSteps) * 100);

    if (style === "dots") {
      const wrap = el("div", { className: "integriti-step-dots" });
      for (let i = 0; i < totalSteps; i += 1) {
        let cls = "integriti-step-dot";
        if (i === currentStep) cls += " integriti-step-dot--active";
        else if (i < currentStep) cls += " integriti-step-dot--done";
        wrap.appendChild(el("span", { className: cls }));
      }
      return wrap;
    }

    if (style === "pills") {
      const wrap = el("div", { className: "integriti-step-pills" });
      (schema.steps || []).forEach((step, i) => {
        let cls = "integriti-step-pill";
        if (i === currentStep) cls += " integriti-step-pill--active";
        else if (i < currentStep) cls += " integriti-step-pill--done";
        const pill = el("div", { className: cls });
        pill.appendChild(el("span", { className: "integriti-step-pill-num", text: String(i + 1) }));
        pill.appendChild(el("span", { className: "integriti-step-pill-text", text: step.title }));
        wrap.appendChild(pill);
      });
      return wrap;
    }

    if (style === "numbered") {
      const wrap = el("div", { className: "integriti-step-numbered" });
      (schema.steps || []).forEach((step, i) => {
        const itemWrap = el("div", { className: "integriti-step-numbered-item" });
        if (i > 0) {
          itemWrap.appendChild(el("span", {
            className: `integriti-step-connector${i <= currentStep ? " integriti-step-connector--done" : ""}`,
          }));
        }
        let cls = "integriti-step-number";
        if (i === currentStep) cls += " integriti-step-number--active";
        else if (i < currentStep) cls += " integriti-step-number--done";
        const item = el("div", { className: cls });
        item.appendChild(el("span", { className: "integriti-step-number-badge", text: String(i + 1) }));
        item.appendChild(el("span", { className: "integriti-step-number-label", text: step.title }));
        itemWrap.appendChild(item);
        wrap.appendChild(itemWrap);
      });
      return wrap;
    }

    const wrap = el("div", { className: "integriti-step-progress" });
    const stepTitle = schema.steps?.[currentStep]?.title;
    const label = el("div", { className: "integriti-step-progress-label" });
    label.appendChild(el("span", {
      text: `Step ${currentStep + 1} of ${totalSteps}${stepTitle ? ` — ${stepTitle}` : ""}`,
    }));
    label.appendChild(el("span", { text: `${pct}%` }));
    wrap.appendChild(label);
    const track = el("div", { className: "integriti-step-progress-track" });
    track.appendChild(el("div", { className: "integriti-step-progress-fill", style: `width:${pct}%` }));
    wrap.appendChild(track);
    return wrap;
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
${scope} .integriti-step-progress{margin-bottom:24px;}
${scope} .integriti-step-progress-label{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:${s.labelColor||"#444"};margin-bottom:8px;font-weight:500;}
${scope} .integriti-step-progress-track{height:6px;background:${inputBorder};border-radius:999px;overflow:hidden;}
${scope} .integriti-step-progress-fill{height:100%;background:${btnBg};border-radius:999px;transition:width .35s ease;}
${scope} .integriti-step-dots{display:flex;gap:8px;justify-content:center;margin-bottom:24px;}
${scope} .integriti-step-dot{width:10px;height:10px;border-radius:50%;background:${inputBorder};}
${scope} .integriti-step-dot--active{background:${focusBorder};transform:scale(1.15);}
${scope} .integriti-step-dot--done{background:${btnBg};}
${scope} .integriti-step-pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;}
${scope} .integriti-step-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid ${inputBorder};background:#fff;font-size:13px;color:${s.labelColor||"#444"};}
${scope} .integriti-step-pill--active{border-color:${focusBorder};background:${btnBg};color:${s.buttonTextColor||"#fff"};}
${scope} .integriti-step-pill--done{border-color:${focusBorder};background:rgba(0,0,0,0.04);}
${scope} .integriti-step-pill-num{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:rgba(0,0,0,0.06);}
${scope} .integriti-step-pill--active .integriti-step-pill-num{background:rgba(255,255,255,0.25);}
${scope} .integriti-step-numbered{display:flex;align-items:center;flex-wrap:wrap;margin-bottom:24px;}
${scope} .integriti-step-numbered-item{display:flex;align-items:center;flex:1 1 auto;}
${scope} .integriti-step-connector{flex:1;height:2px;min-width:12px;margin:0 4px;background:${inputBorder};}
${scope} .integriti-step-connector--done{background:${btnBg};}
${scope} .integriti-step-number-label{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
${scope} .integriti-step-empty{width:100%;padding:32px 20px;text-align:center;font-size:14px;color:${s.labelColor||"#444"};background:rgba(0,0,0,0.03);border:1px dashed ${inputBorder};border-radius:${s.borderRadius||"4"}px;}
${scope} .integriti-step-number{display:flex;align-items:center;gap:8px;font-size:13px;color:${s.labelColor||"#444"};opacity:.55;}
${scope} .integriti-step-number--active{opacity:1;font-weight:600;color:${s.textColor||"#1a1a1a"};}
${scope} .integriti-step-number-badge{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid ${inputBorder};background:#fff;}
${scope} .integriti-step-number--active .integriti-step-number-badge,${scope} .integriti-step-number--done .integriti-step-number-badge{border-color:${focusBorder};background:${btnBg};color:${s.buttonTextColor||"#fff"};}
${scope} .integriti-step-header{margin-bottom:20px;}
${scope} .integriti-step-title{margin:0 0 6px;font-size:20px;font-weight:600;color:${titleColor};line-height:1.3;}
${scope} .integriti-step-description{margin:0;font-size:${descSize}px;color:${descColor};line-height:1.5;opacity:${descOpacity};}
${scope} .integriti-step-fields{animation:integriti-step-in .3s ease;}
@keyframes integriti-step-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
${scope} .integriti-step-nav{display:flex;gap:12px;margin-top:20px;align-items:center;}
${scope} .integriti-step-nav--split{justify-content:space-between;}
${scope} .integriti-btn-back{padding:12px 20px;font-size:${s.inputSize||"16"}px;font-weight:500;background:transparent;color:${s.textColor||"#1a1a1a"};border:1px solid ${inputBorder};border-radius:${s.borderRadius||"4"}px;cursor:pointer;font-family:inherit;}
${scope} .integriti-btn-next{flex:1;padding:12px 24px;font-size:${s.inputSize||"16"}px;font-weight:500;background:${btnBg};color:${s.buttonTextColor||"#fff"};border:none;border-radius:${s.borderRadius||"4"}px;cursor:pointer;font-family:inherit;}
${scope} .integriti-step-nav--split .integriti-btn-next{flex:0 1 auto;min-width:140px;}
${scope} .integriti-btn-next:disabled{opacity:.5;cursor:not-allowed;}
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
    };
  }

  function renderField(field, values, errors, onChange, apiOrigin, formId, uploadState) {
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
        uploadState.active += 1;
        try {
          const result = await uploadFile(apiOrigin, formId, field.id, file);
          onChange(field.id, result);
          nameEl.textContent = file.name;
        } catch (err) {
          nameEl.textContent = err.message || "Upload failed";
          onChange(field.id, null);
        } finally {
          uploadState.active -= 1;
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
    const uploadState = { active: 0 };
    const multiStep = isMultiStepActive(schema);
    const stepGroups = multiStep ? getStepFieldGroups(schema) : [];
    const state = { currentStep: 0, root: null, formEl: null };

    function onChange(fieldId, value) {
      values[fieldId] = value;
      delete errors[fieldId];
    }

    function getVisibleFields() {
      if (!multiStep) return schema.fields || [];
      return stepGroups[state.currentStep]?.fields || [];
    }

    function validateCurrentStep() {
      if (!multiStep) return true;
      const stepId = stepGroups[state.currentStep]?.step?.id;
      const stepErrors = validateStepFieldsSync(schema, stepId, values);
      Object.keys(stepErrors).forEach((k) => { errors[k] = stepErrors[k]; });
      getVisibleFields().forEach((f) => {
        if (!stepErrors[f.id]) delete errors[f.id];
      });
      return Object.keys(stepErrors).length === 0;
    }

    function showFormError(message) {
      const existing = state.root.querySelector(".integriti-form-error");
      if (existing) existing.remove();
      state.root.insertBefore(
        el("div", { className: "integriti-form-error", text: message }),
        state.formEl
      );
    }

    function refreshFields() {
      const fieldsWrap = state.formEl.querySelector(".integriti-form-fields");
      fieldsWrap.innerHTML = "";
      fieldsWrap.className = `integriti-form-fields${
        multiStep && schema.multiStep?.animateTransitions !== false
          ? " integriti-step-fields"
          : ""
      }`;
      const visible = getVisibleFields();
      if (!visible.length) {
        fieldsWrap.appendChild(el("div", {
          className: "integriti-step-empty",
          text: "This step has no fields yet.",
        }));
        return;
      }
      visible.forEach((field) =>
        fieldsWrap.appendChild(
          renderField(field, values, errors, onChange, apiOrigin, id, uploadState)
        )
      );
    }

    function refreshStepChrome() {
      const stepConfig = schema.multiStep || {};
      const totalSteps = stepGroups.length;
      const isLast = state.currentStep >= totalSteps - 1;
      const activeStep = stepGroups[state.currentStep]?.step;

      state.root
        .querySelectorAll(
          ".integriti-step-progress, .integriti-step-dots, .integriti-step-numbered"
        )
        .forEach((node) => node.remove());
      const progress = renderStepProgress(schema, state.currentStep, totalSteps, styles);
      if (progress) state.root.insertBefore(progress, state.formEl);

      let stepHeader = state.root.querySelector(".integriti-step-header");
      if (stepHeader) stepHeader.remove();
      if (
        stepConfig.showStepTitles !== false &&
        activeStep &&
        (activeStep.title || activeStep.description)
      ) {
        stepHeader = el("div", { className: "integriti-step-header" });
        if (activeStep.title) {
          stepHeader.appendChild(el("h3", { className: "integriti-step-title", text: activeStep.title }));
        }
        if (activeStep.description) {
          stepHeader.appendChild(el("p", { className: "integriti-step-description", text: activeStep.description }));
        }
        state.root.insertBefore(stepHeader, state.formEl);
      }

      const nav = state.formEl.querySelector(".integriti-step-nav");
      if (nav) nav.remove();

      if (multiStep) {
        const navEl = el("div", {
          className: `integriti-step-nav${
            stepConfig.allowBack !== false && state.currentStep > 0
              ? " integriti-step-nav--split"
              : ""
          }`,
        });

        if (stepConfig.allowBack !== false && state.currentStep > 0) {
          const backBtn = el("button", {
            type: "button",
            className: "integriti-btn-back",
            text: stepConfig.backLabel || "Back",
          });
          backBtn.addEventListener("click", () => {
            state.currentStep -= 1;
            const err = state.root.querySelector(".integriti-form-error");
            if (err) err.remove();
            refreshStepChrome();
            refreshFields();
          });
          navEl.appendChild(backBtn);
        }

        const nextLabel = isLast
          ? schema.submitLabel || "Submit"
          : activeStep?.nextLabel || "Continue";

        if (isLast) {
          const submitBtn = el("button", {
            type: "submit",
            className: "integriti-btn-next",
            text: nextLabel,
          });
          navEl.appendChild(submitBtn);
        } else {
          const nextBtn = el("button", {
            type: "button",
            className: "integriti-btn-next",
            text: nextLabel,
          });
          nextBtn.addEventListener("click", () => {
            if (!validateCurrentStep()) {
              refreshFields();
              return;
            }
            const err = state.root.querySelector(".integriti-form-error");
            if (err) err.remove();
            state.currentStep += 1;
            refreshStepChrome();
            refreshFields();
          });
          navEl.appendChild(nextBtn);
        }

        state.formEl.appendChild(navEl);
      }
    }

    async function submitForm(submitBtn) {
      if (uploadState.active > 0) {
        showFormError("Please wait for file uploads to finish before submitting.");
        return;
      }

      for (const field of schema.fields || []) {
        if (field.type !== "file") continue;
        if (values[field.id] && !values[field.id].fileId) {
          showFormError("Please wait for the file upload to complete.");
          return;
        }
      }

      if (multiStep && !validateCurrentStep()) {
        refreshFields();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      try {
        const res = await fetch(proxyUrl(apiOrigin, `/forms/${id}/submit`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: values }),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          submitBtn.disabled = false;
          submitBtn.textContent = schema.submitLabel || "Submit";
          if (data.errors) {
            Object.keys(data.errors).forEach((k) => { errors[k] = data.errors[k]; });
            refreshFields();
          } else {
            showFormError(data.error || "Submission failed.");
          }
          return;
        }
        draw(data.message || schema.successMessage);
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = schema.submitLabel || "Submit";
      }
    }

    function draw(successMessage) {
      container.innerHTML = "";
      const root = el("div", { className: scopeClass });
      state.root = root;
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
      state.formEl = formEl;
      formEl.appendChild(el("input", { type: "text", name: "_hp_field", className: "integriti-hp", tabindex: "-1", autocomplete: "off" }));

      const fieldsWrap = el("div", { className: "integriti-form-fields" });
      formEl.appendChild(fieldsWrap);

      if (!multiStep) {
        getVisibleFields().forEach((field) =>
          fieldsWrap.appendChild(
            renderField(field, values, errors, onChange, apiOrigin, id, uploadState)
          )
        );
        const submit = el("button", { type: "submit", className: "integriti-submit", text: schema.submitLabel || "Submit" });
        formEl.appendChild(submit);
      } else {
        refreshStepChrome();
        refreshFields();
      }

      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = formEl.querySelector(
          multiStep ? ".integriti-btn-next[type='submit']" : ".integriti-submit"
        );
        if (!multiStep) {
          await submitForm(submitBtn);
          return;
        }
        const isLast = state.currentStep >= stepGroups.length - 1;
        if (!isLast) {
          if (!validateCurrentStep()) {
            refreshFields();
            return;
          }
          state.currentStep += 1;
          const err = root.querySelector(".integriti-form-error");
          if (err) err.remove();
          refreshStepChrome();
          refreshFields();
          return;
        }
        await submitForm(submitBtn);
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

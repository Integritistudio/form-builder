import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { forms, submissions, submissionFiles } from "../db/schema.js";
import { validateSubmission } from "../lib/validation.js";
import { getShopSettings } from "../services/shop.js";
import { sendSubmissionEmail } from "../services/email.js";
import { appProxyMiddleware } from "../middleware/verifyAppProxy.js";
import { submitRateLimiter } from "../middleware/rateLimit.js";
import { sanitizeFormForPublic } from "../lib/planGating.js";
import { hasFeature } from "../services/plans.js";
import { isMimeAllowed, getMaxFileSize, MAX_FILE_SIZE } from "../lib/fileTypes.js";
import {
  createPresignedUploadUrl,
  isStorageConfigured,
  getStorageConfigError,
  uploadBuffer,
  buildStorageKey,
} from "../services/storage.js";
import { buildSubmissionPayload, linkSubmissionFiles, linkFileToRecentSubmission } from "../lib/submissionFiles.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

router.use(appProxyMiddleware);

router.get("/forms/:id", async (req, res) => {
  try {
    const shopDomain = req.shopDomain;
    const [form] = await db
      .select({
        id: forms.id,
        name: forms.name,
        schema: forms.schema,
        styles: forms.styles,
        customCss: forms.customCss,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, req.params.id),
          eq(forms.shopDomain, shopDomain),
          eq(forms.status, "active")
        )
      )
      .limit(1);

    if (!form) {
      return res.status(404).json({ error: "Form not found or not active" });
    }

    const settings = await getShopSettings(shopDomain);
    const sanitized = sanitizeFormForPublic(settings.plan, form);

    res.json({ form: sanitized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function prepareFileUpload({ shopDomain, formId, fieldId, mimeType, sizeBytes }) {
  const configError = getStorageConfigError();
  if (configError) {
    const err = new Error(configError);
    err.status = 503;
    throw err;
  }

  const settings = await getShopSettings(shopDomain);

  if (!hasFeature(settings.plan, "fileUpload")) {
    const err = new Error("File uploads require a Pro or Premium plan.");
    err.status = 403;
    err.code = "PLAN_FEATURE";
    throw err;
  }

  const [form] = await db
    .select()
    .from(forms)
    .where(
      and(
        eq(forms.id, formId),
        eq(forms.shopDomain, shopDomain),
        eq(forms.status, "active")
      )
    )
    .limit(1);

  if (!form) {
    const err = new Error("Form not found or not active");
    err.status = 404;
    throw err;
  }

  const field = (form.schema?.fields || []).find((f) => f.id === fieldId);
  if (!field || field.type !== "file") {
    const err = new Error("Invalid file field");
    err.status = 400;
    throw err;
  }

  if (!isMimeAllowed(settings.plan, mimeType)) {
    const err = new Error(
      settings.plan === "pro"
        ? "Pro plan allows images only (JPEG, PNG, GIF, WebP)."
        : "File type not allowed. Premium allows images, PDF, and Word documents."
    );
    err.status = 400;
    throw err;
  }

  const maxSize = getMaxFileSize(settings.plan);
  if (sizeBytes > maxSize) {
    const err = new Error("File must be 2 MB or smaller.");
    err.status = 400;
    throw err;
  }

  return { form, settings };
}

router.post(
  "/forms/:id/upload",
  submitRateLimiter,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File must be 2 MB or smaller." });
      }
      if (err) return next(err);
      next();
    });
  },
  async (req, res) => {
    try {
      const shopDomain = req.shopDomain;
      const fieldId = req.body.fieldId;
      const file = req.file;

      if (!fieldId || !file) {
        return res.status(400).json({ error: "Missing file or fieldId" });
      }

      const { form } = await prepareFileUpload({
        shopDomain,
        formId: req.params.id,
        fieldId,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });

      const fileId = randomUUID();
      const storageKey = buildStorageKey(
        shopDomain,
        form.id,
        fileId,
        file.originalname
      );

      await uploadBuffer({
        storageKey,
        buffer: file.buffer,
        mimeType: file.mimetype,
      });

      await db.insert(submissionFiles).values({
        id: fileId,
        formId: form.id,
        shopDomain,
        fieldId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        status: "pending",
      });

      const fileRecord = {
        id: fileId,
        formId: form.id,
        shopDomain,
        fieldId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        createdAt: new Date(),
      };
      await linkFileToRecentSubmission(fileRecord);

      res.json({
        fileId,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
    } catch (err) {
      console.error("File upload error:", err);
      res.status(err.status || 500).json({
        error: err.message,
        code: err.code,
      });
    }
  }
);

router.post("/forms/:id/upload-url", submitRateLimiter, async (req, res) => {
  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({
        error: getStorageConfigError() || "File storage is not configured",
      });
    }

    const shopDomain = req.shopDomain;
    const { fieldId, originalName, mimeType, sizeBytes } = req.body;

    if (!fieldId || !originalName || !mimeType || !sizeBytes) {
      return res.status(400).json({ error: "Missing file metadata" });
    }

    const { form } = await prepareFileUpload({
      shopDomain,
      formId: req.params.id,
      fieldId,
      mimeType,
      sizeBytes,
    });

    const { fileId, storageKey, uploadUrl } = await createPresignedUploadUrl({
      shopDomain,
      formId: form.id,
      fieldId,
      originalName,
      mimeType,
      sizeBytes,
    });

    await db.insert(submissionFiles).values({
      id: fileId,
      formId: form.id,
      shopDomain,
      fieldId,
      originalName,
      mimeType,
      sizeBytes,
      storageKey,
      status: "pending",
    });

    res.json({ fileId, uploadUrl });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

router.post("/forms/:id/submit", submitRateLimiter, async (req, res) => {
  try {
    if (req.body._hp_field) {
      return res.json({ success: true });
    }

    const shopDomain = req.shopDomain;
    const [form] = await db
      .select()
      .from(forms)
      .where(
        and(
          eq(forms.id, req.params.id),
          eq(forms.shopDomain, shopDomain),
          eq(forms.status, "active")
        )
      )
      .limit(1);

    if (!form) {
      return res.status(404).json({ error: "Form not found or not active" });
    }

    const settings = await getShopSettings(shopDomain);
    const rawData = req.body.data || req.body;
    const errors = await validateSubmission(form.schema, rawData, {
      plan: settings.plan,
      shopDomain,
      formId: form.id,
    });

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const data = await buildSubmissionPayload(form.schema, rawData, {
      shopDomain,
      formId: form.id,
    });

    const [submission] = await db
      .insert(submissions)
      .values({
        formId: form.id,
        shopDomain,
        payload: data,
      })
      .returning();

    const fileIds = await linkSubmissionFiles({
      schema: form.schema,
      rawData,
      submissionId: submission.id,
      shopDomain,
      formId: form.id,
    });

    let finalPayload = data;
    if (fileIds.length > 0) {
      finalPayload = await buildSubmissionPayload(form.schema, rawData, {
        shopDomain,
        formId: form.id,
      });
      await db
        .update(submissions)
        .set({ payload: finalPayload })
        .where(eq(submissions.id, submission.id));
    }

    res.json({
      success: true,
      message: form.schema?.successMessage || "Thank you for your submission.",
      submissionId: submission.id,
    });

    const files = fileIds.length
      ? await db
          .select()
          .from(submissionFiles)
          .where(eq(submissionFiles.submissionId, submission.id))
      : [];

    sendSubmissionEmail({
      settings,
      formName: form.name,
      shopName: shopDomain.replace(".myshopify.com", ""),
      schema: form.schema,
      payload: finalPayload,
      files,
    }).catch((err) => console.error("Email send failed:", err));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

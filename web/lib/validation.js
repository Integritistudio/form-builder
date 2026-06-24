import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { submissionFiles } from "../db/schema.js";
import { hasFeature } from "../services/plans.js";
import { isMimeAllowed } from "../lib/fileTypes.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function validateSubmission(schema, data, context = {}) {
  const errors = {};
  const fields = schema?.fields || [];

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

    if (field.type === "file") {
      const plan = context.plan || "free";
      if (!hasFeature(plan, "fileUpload")) {
        errors[field.id] = "File uploads are not available on this plan";
        continue;
      }

      const fileId = value.fileId;
      const [file] = await db
        .select()
        .from(submissionFiles)
        .where(
          and(
            eq(submissionFiles.id, fileId),
            eq(submissionFiles.formId, context.formId),
            eq(submissionFiles.shopDomain, context.shopDomain),
            eq(submissionFiles.fieldId, field.id)
          )
        )
        .limit(1);

      if (!file) {
        errors[field.id] = "Invalid file upload";
        continue;
      }

      if (file.status !== "pending" && file.status !== "linked") {
        errors[field.id] = "File upload is no longer valid";
        continue;
      }

      if (!isMimeAllowed(plan, file.mimeType)) {
        errors[field.id] = "File type is not allowed for your plan";
      }
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

export function formatSubmissionForDisplay(schema, payload) {
  const rows = [];
  for (const field of schema?.fields || []) {
    if (field.type === "heading" || field.type === "paragraph") continue;
    let value = payload[field.id];
    if (Array.isArray(value)) value = value.join(", ");
    if (field.type === "checkbox") value = value ? "Yes" : "No";
    if (field.type === "file" && value?.originalName) {
      value = `${value.originalName} (attached)`;
    }
    rows.push({ label: field.label, value: value ?? "" });
  }
  return rows;
}

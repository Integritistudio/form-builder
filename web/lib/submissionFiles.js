import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { submissionFiles } from "../db/schema.js";

export function fileViewUrl(fileId) {
  return `/api/submissions/files/${fileId}/view`;
}

export function mapFileRecord(file) {
  return {
    fileId: file.id,
    id: file.id,
    fieldId: file.fieldId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    viewUrl: fileViewUrl(file.id),
  };
}

export async function fetchFilesBySubmissionIds(submissionIds, shopDomain) {
  if (!submissionIds.length) return new Map();

  const rows = await db
    .select()
    .from(submissionFiles)
    .where(
      and(
        inArray(submissionFiles.submissionId, submissionIds),
        eq(submissionFiles.shopDomain, shopDomain)
      )
    );

  const map = new Map();
  for (const row of rows) {
    const mapped = mapFileRecord(row);
    if (!map.has(row.submissionId)) map.set(row.submissionId, []);
    map.get(row.submissionId).push(mapped);
  }
  return map;
}

export async function attachFilesToSubmissions(submissions, shopDomain) {
  const ids = submissions.map((s) => s.id);
  const fileMap = await fetchFilesBySubmissionIds(ids, shopDomain);

  return submissions.map((submission) => {
    const files = fileMap.get(submission.id) || [];
    const payload = mergePayloadWithFiles(
      submission.formSchema || submission.schema,
      submission.payload,
      files
    );
    return { ...submission, files, payload };
  });
}

export function mergePayloadWithFiles(schema, payload, files) {
  const next = { ...(payload || {}) };
  for (const file of files || []) {
    const field = schema?.fields?.find((f) => f.id === file.fieldId);
    if (field?.type === "file" || file.fieldId) {
      next[file.fieldId] = {
        fileId: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        viewUrl: file.viewUrl,
      };
    }
  }
  return next;
}

export async function buildSubmissionPayload(schema, rawData, context) {
  const { shopDomain, formId } = context;
  const payload = { ...(rawData || {}) };

  for (const field of schema?.fields || []) {
    if (field.type !== "file") continue;
    const val = payload[field.id];
    if (!val?.fileId) continue;

    const [file] = await db
      .select()
      .from(submissionFiles)
      .where(
        and(
          eq(submissionFiles.id, val.fileId),
          eq(submissionFiles.formId, formId),
          eq(submissionFiles.shopDomain, shopDomain),
          eq(submissionFiles.fieldId, field.id)
        )
      )
      .limit(1);

    if (file) {
      payload[field.id] = mapFileRecord(file);
    } else if (val.fileId) {
      payload[field.id] = {
        ...val,
        viewUrl: fileViewUrl(val.fileId),
      };
    }
  }

  return payload;
}

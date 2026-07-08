import { eq, and, inArray, isNull, gte, lte, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { submissions, submissionFiles } from "../db/schema.js";
import { createPresignedDownloadUrl } from "../services/storage.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function fileViewUrl(fileId) {
  return `/api/submissions/files/${fileId}/view`;
}

export function mapFileRecord(file, publicUrl = null) {
  return {
    fileId: file.id,
    id: file.id,
    fieldId: file.fieldId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    publicUrl,
    viewUrl: publicUrl,
  };
}

export async function enrichFileRow(file) {
  let publicUrl = null;
  try {
    if (file.storageKey) {
      publicUrl = await createPresignedDownloadUrl(file.storageKey, 3600);
    }
  } catch (err) {
    console.error("Failed to create file URL:", err);
  }
  return mapFileRecord(file, publicUrl);
}

function addFileIdFromValue(value, ids) {
  if (!value) return;
  if (typeof value === "string" && UUID_RE.test(value)) {
    ids.add(value);
    return;
  }
  if (typeof value !== "object") return;
  if (value.fileId && UUID_RE.test(value.fileId)) ids.add(value.fileId);
  if (value.id && UUID_RE.test(value.id)) ids.add(value.id);
}

export function extractFileIds(schema, data) {
  const ids = new Set();

  for (const field of schema?.fields || []) {
    if (field.type !== "file") continue;
    addFileIdFromValue(data?.[field.id], ids);
  }

  for (const value of Object.values(data || {})) {
    addFileIdFromValue(value, ids);
  }

  return [...ids];
}

export async function linkSubmissionFiles({
  schema,
  rawData,
  submissionId,
  shopDomain,
  formId,
}) {
  const fileIds = extractFileIds(schema, rawData);
  if (!fileIds.length) return [];

  await db
    .update(submissionFiles)
    .set({ submissionId, status: "linked" })
    .where(
      and(
        inArray(submissionFiles.id, fileIds),
        eq(submissionFiles.formId, formId),
        eq(submissionFiles.shopDomain, shopDomain)
      )
    );

  return fileIds;
}

export async function linkFileToRecentSubmission(file) {
  const fileTime = new Date(file.createdAt || Date.now());
  const windowStart = new Date(fileTime);
  windowStart.setMinutes(windowStart.getMinutes() - 3);
  const windowEnd = new Date(fileTime);
  windowEnd.setSeconds(windowEnd.getSeconds() + 30);

  const recentSubs = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.formId, file.formId),
        eq(submissions.shopDomain, file.shopDomain),
        gte(submissions.createdAt, windowStart),
        lte(submissions.createdAt, windowEnd)
      )
    )
    .orderBy(desc(submissions.createdAt));

  for (const sub of recentSubs) {
    const [existing] = await db
      .select()
      .from(submissionFiles)
      .where(
        and(
          eq(submissionFiles.submissionId, sub.id),
          eq(submissionFiles.fieldId, file.fieldId)
        )
      )
      .limit(1);

    if (existing) continue;

    const fieldVal = sub.payload?.[file.fieldId];
    if (fieldVal?.fileId && fieldVal.fileId !== file.id) continue;

    await db
      .update(submissionFiles)
      .set({ submissionId: sub.id, status: "linked" })
      .where(eq(submissionFiles.id, file.id));

    const payload = {
      ...(sub.payload || {}),
      [file.fieldId]: await enrichFileRow(file),
    };
    await db
      .update(submissions)
      .set({ payload })
      .where(eq(submissions.id, sub.id));

    return sub.id;
  }

  return null;
}

function findSubmissionForOrphan(file, allSubmissions) {
  const fileTime = new Date(file.createdAt).getTime();

  const payloadMatch = allSubmissions.find((sub) => {
    if (sub.formId !== file.formId || sub.shopDomain !== file.shopDomain) {
      return false;
    }
    return extractFileIds(null, sub.payload).includes(file.id);
  });
  if (payloadMatch) return payloadMatch;

  const candidates = allSubmissions
    .filter((sub) => {
      if (sub.formId !== file.formId || sub.shopDomain !== file.shopDomain) {
        return false;
      }
      const subTime = new Date(sub.createdAt).getTime();
      const diffMs = Math.abs(subTime - fileTime);
      if (diffMs > 3 * 60 * 1000) return false;

      const fieldVal = sub.payload?.[file.fieldId];
      if (fieldVal?.fileId && fieldVal.fileId !== file.id) return false;

      return true;
    })
    .sort((a, b) => {
      const diffA = Math.abs(new Date(a.createdAt).getTime() - fileTime);
      const diffB = Math.abs(new Date(b.createdAt).getTime() - fileTime);
      return diffA - diffB;
    });

  return candidates[0] || null;
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
    const mapped = await enrichFileRow(row);
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
        fileId: file.fileId || file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        publicUrl: file.publicUrl,
        viewUrl: file.publicUrl || file.viewUrl,
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
      payload[field.id] = await enrichFileRow(file);
    } else if (val.fileId) {
      payload[field.id] = {
        ...val,
        viewUrl: fileViewUrl(val.fileId),
      };
    }
  }

  return payload;
}

export async function backfillSubmissionFileLinks() {
  const orphans = await db
    .select()
    .from(submissionFiles)
    .where(isNull(submissionFiles.submissionId));

  if (!orphans.length) return 0;

  const allSubmissions = await db.select().from(submissions);
  let linked = 0;

  for (const file of orphans) {
    const match = findSubmissionForOrphan(file, allSubmissions);

    if (!match) continue;

    await db
      .update(submissionFiles)
      .set({ submissionId: match.id, status: "linked" })
      .where(eq(submissionFiles.id, file.id));

    const payload = {
      ...(match.payload || {}),
      [file.fieldId]: await enrichFileRow(file),
    };
    await db
      .update(submissions)
      .set({ payload })
      .where(eq(submissions.id, match.id));

    linked += 1;
  }

  if (linked > 0) {
    console.log(`Backfilled submission_id for ${linked} file(s).`);
  }

  return linked;
}

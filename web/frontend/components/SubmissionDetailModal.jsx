import {
  Modal,
  Text,
  Stack,
  Badge,
  Button,
  Divider,
} from "@shopify/polaris";

import { formatFileSize, openFileInNewTab, downloadFile } from "../utils/files";

export function getFieldLabel(schema, fieldId) {
  const field = schema?.fields?.find((f) => f.id === fieldId);
  return field?.label || fieldId;
}

export function getFieldType(schema, fieldId) {
  const field = schema?.fields?.find((f) => f.id === fieldId);
  return field?.type;
}

export function formatFieldValue(value, fieldType) {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value && typeof value === "object" && value.originalName) {
    return value.originalName;
  }
  return String(value);
}

export function orderedPayloadEntries(schema, payload) {
  const fields = schema?.fields || [];
  const entries = [];

  for (const field of fields) {
    if (field.type === "heading" || field.type === "paragraph") continue;
    if (payload[field.id] !== undefined) {
      entries.push([field.id, payload[field.id], field]);
    }
  }

  for (const [key, value] of Object.entries(payload || {})) {
    if (!entries.some(([id]) => id === key)) {
      entries.push([key, value, null]);
    }
  }

  return entries;
}

export function submissionPreview(schema, payload, files = []) {
  if (files?.length) {
    return files.map((f) => f.originalName).join(", ");
  }

  const entries = orderedPayloadEntries(schema, payload);
  if (!entries.length) return "—";

  const fileEntry = entries.find(
    ([, value, field]) => field?.type === "file" || value?.fileId
  );
  if (fileEntry) {
    const [, value] = fileEntry;
    if (value?.originalName) return value.originalName;
  }

  const [, value, field] = entries[0];
  return formatFieldValue(value, field?.type).slice(0, 50);
}

function FileAttachmentCard({ file, fieldLabel }) {
  const fileId = file.fileId || file.id;
  const isImage = file.mimeType?.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";
  const publicUrl = file.publicUrl;

  return (
    <div className="app-file-card">
      <Stack vertical spacing="loose">
        <div className="app-flex-center" style={{ alignItems: "flex-start", gap: 16 }}>
          {isImage && publicUrl ? (
            <button
              type="button"
              onClick={() => openFileInNewTab(fileId, publicUrl)}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label={`Open ${file.originalName}`}
            >
              <img
                src={publicUrl}
                alt={file.originalName}
                className="app-file-thumb"
              />
            </button>
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                background: "var(--app-surface-low)",
                border: "1px solid var(--app-outline-variant)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--app-primary)",
              }}
            >
              {isPdf ? "PDF" : "DOC"}
            </div>
          )}
          <Stack vertical spacing="extraTight">
            <Text variant="bodyMd" fontWeight="semibold">
              {file.originalName}
            </Text>
            <Stack spacing="tight">
              {fieldLabel && <Badge size="small">{fieldLabel}</Badge>}
              {file.sizeBytes != null && (
                <Text variant="bodySm" color="subdued">
                  {formatFileSize(file.sizeBytes)}
                </Text>
              )}
              {isPdf && <Badge size="small">PDF</Badge>}
            </Stack>
          </Stack>
        </div>

        {isImage && publicUrl && (
          <button
            type="button"
            onClick={() => openFileInNewTab(fileId, publicUrl)}
            style={{
              width: "100%",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <img
              src={publicUrl}
              alt={file.originalName}
              className="app-file-preview"
            />
          </button>
        )}

        <Stack spacing="tight">
          <Button primary size="slim" onClick={() => openFileInNewTab(fileId, publicUrl)}>
            Open in new tab
          </Button>
          <Button size="slim" onClick={() => downloadFile(fileId, publicUrl)}>
            Download
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}

export default function SubmissionDetailModal({
  open,
  submission,
  schema,
  formName,
  onClose,
}) {
  if (!submission) return null;

  const files = submission.files || [];
  const payload = submission.payload || {};
  const fileFieldIds = new Set(files.map((f) => f.fieldId));
  const entries = orderedPayloadEntries(schema, payload).filter(
    ([fieldId, value, field]) => {
      if (fileFieldIds.has(fieldId)) return false;
      if (field?.type === "file" && files.length > 0) return false;
      return !(value?.fileId && files.some((f) => f.id === value.fileId));
    }
  );
  const submittedAt = new Date(submission.createdAt).toLocaleString();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formName ? `Submission — ${formName}` : "Submission details"}
      primaryAction={{ content: "Close", onAction: onClose }}
      large
    >
      <Modal.Section>
        <Stack vertical spacing="loose">
          <div className="app-modal-meta">
            <div className="app-stack-tight">
              <span className="app-subdued" style={{ fontSize: 12 }}>
                Submitted
              </span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{submittedAt}</span>
              <span className="app-subdued" style={{ fontSize: 12 }}>
                ID: {submission.id}
              </span>
            </div>
          </div>

          {files.length > 0 && (
            <Stack vertical spacing="loose">
              <Text variant="headingSm" as="h3">
                Attachments ({files.length})
              </Text>
              {files.map((file) => (
                <FileAttachmentCard
                  key={file.id}
                  file={file}
                  fieldLabel={getFieldLabel(schema, file.fieldId)}
                />
              ))}
            </Stack>
          )}

          {entries.length > 0 && (
            <Stack vertical spacing="loose">
              {files.length > 0 && (
                <>
                  <Divider />
                  <Text variant="headingSm" as="h3">
                    Form responses
                  </Text>
                </>
              )}
              <div className="app-response-grid">
                {entries.map(([fieldId, value, field]) => {
                  const label = field?.label || getFieldLabel(schema, fieldId);
                  const type = field?.type || getFieldType(schema, fieldId);
                  const isFile = type === "file" || value?.fileId;

                  if (isFile && value?.fileId) {
                    return (
                      <div key={fieldId} style={{ gridColumn: "1 / -1" }}>
                        <FileAttachmentCard file={value} fieldLabel={label} />
                      </div>
                    );
                  }

                  return (
                    <div key={fieldId} className="app-response-field">
                      <div className="app-flex-center" style={{ marginBottom: 4 }}>
                        <span className="app-response-field-label">{label}</span>
                        {type && <Badge size="small">{type}</Badge>}
                      </div>
                      <div className="app-response-field-value">
                        {formatFieldValue(value, type)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Stack>
          )}

          {entries.length === 0 && files.length === 0 && (
            <Text color="subdued">No field data in this submission.</Text>
          )}
        </Stack>
      </Modal.Section>
    </Modal>
  );
}

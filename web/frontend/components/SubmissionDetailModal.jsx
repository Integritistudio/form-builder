import {
  Modal,
  Text,
  Stack,
  Badge,
  Button,
  Box,
  Divider,
} from "@shopify/polaris";

import { fileViewPath } from "./FilePreviewModal";

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

export function getFileViewUrl(value) {
  if (!value?.fileId && !value?.id) return null;
  const fileId = value.fileId || value.id;
  return value.viewUrl || fileViewPath(fileId);
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

function FileActions({ file, onViewFile, onDownloadFile }) {
  const fileId = file.fileId || file.id;
  const fileName = file.originalName;
  const mimeType = file.mimeType;
  const viewUrl = getFileViewUrl(file);

  return (
    <Stack vertical spacing="tight">
      <Text variant="bodyMd">{fileName}</Text>
      {viewUrl && (
        <Text variant="bodySm" color="subdued">
          File URL: <code>{viewUrl}</code>
        </Text>
      )}
      <Stack spacing="tight">
        {onViewFile && fileId && (
          <Button
            size="slim"
            primary
            onClick={() => onViewFile(fileId, fileName, mimeType)}
          >
            View file
          </Button>
        )}
        {onDownloadFile && fileId && (
          <Button size="slim" onClick={() => onDownloadFile(fileId)}>
            Download
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export default function SubmissionDetailModal({
  open,
  submission,
  schema,
  formName,
  onClose,
  onDownloadFile,
  onViewFile,
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
      title="Submission details"
      primaryAction={{ content: "Close", onAction: onClose }}
      large={files.length > 0}
    >
      <Modal.Section>
        <Stack vertical spacing="loose">
          <Stack vertical spacing="extraTight">
            {formName && (
              <Text variant="bodyMd" fontWeight="semibold">
                {formName}
              </Text>
            )}
            <Text variant="bodySm" color="subdued">
              {submittedAt}
            </Text>
            <Text variant="bodySm" color="subdued">
              ID: <code>{submission.id}</code>
            </Text>
          </Stack>

          <Divider />

          {files.length > 0 && (
            <Stack vertical spacing="loose">
              <Text variant="headingSm" as="h3">
                Uploaded files
              </Text>
              {files.map((file) => (
                <Box
                  key={file.id}
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <Stack vertical spacing="tight">
                    <Stack spacing="tight" alignment="center">
                      <Text variant="bodySm" fontWeight="semibold">
                        {getFieldLabel(schema, file.fieldId)}
                      </Text>
                      <Badge size="small">file</Badge>
                    </Stack>
                    <FileActions
                      file={file}
                      onViewFile={onViewFile}
                      onDownloadFile={onDownloadFile}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          {entries.length === 0 && files.length === 0 ? (
            <Text color="subdued">No field data in this submission.</Text>
          ) : (
            entries.length > 0 && (
              <Stack vertical spacing="loose">
                {files.length > 0 && (
                  <Text variant="headingSm" as="h3">
                    Form fields
                  </Text>
                )}
                {entries.map(([fieldId, value, field]) => {
                  const label = field?.label || getFieldLabel(schema, fieldId);
                  const type = field?.type || getFieldType(schema, fieldId);
                  const isFile = type === "file" || value?.fileId;

                  return (
                    <Box
                      key={fieldId}
                      padding="300"
                      background="bg-surface-secondary"
                      borderRadius="200"
                    >
                      <Stack vertical spacing="tight">
                        <Stack spacing="tight" alignment="center">
                          <Text variant="bodySm" fontWeight="semibold">
                            {label}
                          </Text>
                          {type && <Badge size="small">{type}</Badge>}
                        </Stack>
                        {isFile && value?.fileId ? (
                          <FileActions
                            file={value}
                            onViewFile={onViewFile}
                            onDownloadFile={onDownloadFile}
                          />
                        ) : (
                          <Text variant="bodyMd">
                            {formatFieldValue(value, type)}
                          </Text>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )
          )}
        </Stack>
      </Modal.Section>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import {
  Modal,
  Text,
  Stack,
  Spinner,
  Banner,
  Button,
} from "@shopify/polaris";

export function fileViewPath(fileId) {
  return `/api/submissions/files/${fileId}/view`;
}

export default function FilePreviewModal({
  open,
  fileId,
  fileName,
  mimeType,
  onClose,
}) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !fileId) {
      setSrc(null);
      setError(null);
      return;
    }

    let objectUrl;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSrc(null);

      try {
        const response = await fetch(fileViewPath(fileId), {
          credentials: "include",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load file");
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load file");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, fileId]);

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fileName || "File preview"}
      large
      primaryAction={{ content: "Close", onAction: onClose }}
    >
      <Modal.Section>
        <Stack vertical spacing="loose">
          {loading && (
            <Stack alignment="center" distribution="center">
              <Spinner accessibilityLabel="Loading file" />
            </Stack>
          )}

          {error && <Banner status="critical">{error}</Banner>}

          {src && isImage && (
            <div style={{ textAlign: "center" }}>
              <img
                src={src}
                alt={fileName || "Uploaded file"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  borderRadius: "8px",
                  border: "1px solid var(--p-color-border)",
                }}
              />
            </div>
          )}

          {src && isPdf && (
            <iframe
              src={src}
              title={fileName || "PDF preview"}
              style={{
                width: "100%",
                height: "70vh",
                border: "1px solid var(--p-color-border)",
                borderRadius: "8px",
              }}
            />
          )}

          {src && !isImage && !isPdf && (
            <Stack vertical spacing="tight">
              <Text color="subdued">
                Preview is not available for this file type.
              </Text>
              <Button url={src} download={fileName || true} external>
                Download file
              </Button>
            </Stack>
          )}
        </Stack>
      </Modal.Section>
    </Modal>
  );
}

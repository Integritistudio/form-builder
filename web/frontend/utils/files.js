import { apiFetch } from "./api";

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getFileAccess(fileId) {
  return apiFetch(`/api/submissions/files/${fileId}/access`);
}

export async function openFileInNewTab(fileId, publicUrl) {
  const url =
    publicUrl || (await getFileAccess(fileId)).publicUrl;
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function downloadFile(fileId, publicUrl) {
  const url =
    publicUrl || (await getFileAccess(fileId)).publicUrl;
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

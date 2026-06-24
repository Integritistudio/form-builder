export const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const BLOCKED_MIMES = [
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
];

export const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function getAllowedMimes(plan) {
  if (plan === "premium") {
    return [...IMAGE_MIMES, ...DOCUMENT_MIMES];
  }
  if (plan === "pro") {
    return [...IMAGE_MIMES];
  }
  return [];
}

export function isMimeAllowed(plan, mime) {
  if (BLOCKED_MIMES.includes(mime)) return false;
  return getAllowedMimes(plan).includes(mime);
}

export function getMaxFileSize(plan) {
  if (plan === "premium" || plan === "pro") return MAX_FILE_SIZE;
  return 0;
}

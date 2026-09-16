export async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiDownload(url, defaultFilename = "export.csv") {
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || "Download failed");
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = defaultFilename;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

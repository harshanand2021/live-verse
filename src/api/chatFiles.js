// Chat file attachments are carried as plain text inside a normal CHAT
// message: "[[file]]{...json...}". This keeps the realtime service (Quarkus)
// untouched — it only ever sees a String content field — while Core owns the
// actual bytes on disk. See ChatPanel.jsx for the render side.
const FILE_MARKER = "[[file]]";

// Mirrors Core's spring.servlet.multipart.max-file-size (application.properties).
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip";

export function buildFileMessage(fileMeta) {
  return `${FILE_MARKER}${JSON.stringify(fileMeta)}`;
}

export function isFileMessage(content) {
  return typeof content === "string" && content.startsWith(FILE_MARKER);
}

/** Returns { fileUrl, fileName, fileType, fileSize } or null if unparsable. */
export function parseFileMessage(content) {
  if (!isFileMessage(content)) return null;
  try {
    const parsed = JSON.parse(content.slice(FILE_MARKER.length));
    if (!parsed || typeof parsed.fileUrl !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

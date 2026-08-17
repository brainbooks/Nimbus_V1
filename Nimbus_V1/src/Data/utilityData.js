// ==================================================
// UTILITIES AND CONSTANTS
// ==================================================

// ==================================================
// SIDEBAR NAVIGATION ITEMS
// ==================================================

export const sidebarItems = [
  { id: "home", label: "Home", icon: "lucide:home" },
  { id: "files", label: "Computer", icon: "lucide:monitor" },
  { id: "recent", label: "Recent", icon: "lucide:clock" },
  { id: "starred", label: "Starred", icon: "lucide:star" },
  { id: "trash", label: "Trash", icon: "lucide:trash-2" },
  { id: "storage", label: "Storage", icon: "lucide:hard-drive" },
];

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

/**
 * Format bytes to a human-readable size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return "0 B";
  const safeBytes = Number(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(safeBytes) / Math.log(1024)), units.length - 1);
  return `${(safeBytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format an ISO date string to a friendly display format.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Detect a normalized file kind from a name, MIME type, or backend type. */
export function kindFromName(name = "", mime = "", fallbackType = "") {
  const ext = String(name).split(".").pop()?.toLowerCase() || "";
  const mimeType = String(mime).toLowerCase();
  const fallback = String(fallbackType).toLowerCase();

  if (mimeType.startsWith("image/") || fallback === "image" || ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "heic"].includes(ext)) return "image";
  if (mimeType.startsWith("video/") || fallback === "video" || ["mp4", "mov", "mkv", "webm", "avi", "m4v"].includes(ext)) return "video";
  if (mimeType.startsWith("audio/") || ["audio", "music"].includes(fallback) || ["mp3", "wav", "flac", "m4a", "ogg", "aac"].includes(ext)) return "audio";
  if (fallback === "archive" || ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) return "archive";
  if (fallback === "document" || ["pdf", "doc", "docx", "txt", "md", "rtf", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext)) return "document";
  return "other";
}

/** Filter files with keyword and #tag terms. Every term must match. */
export function filterFiles(files, query, tagsByFile = {}) {
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return files;

  const tagTerms = terms.filter((term) => term.startsWith("#") && term.length > 1).map((term) => term.slice(1));
  const keywords = terms.filter((term) => !term.startsWith("#"));

  return files.filter((file) => {
    const name = `${file.name || ""}${file.extension || ""}`.toLowerCase();
    const fileTags = (tagsByFile[file.id] || file.tags || []).map((tag) => String(tag).toLowerCase());
    return keywords.every((term) => name.includes(term) || fileTags.some((tag) => tag.includes(term)))
      && tagTerms.every((term) => fileTags.some((tag) => tag.includes(term)));
  });
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysLeftInTrash(trashedAt, retentionDays = 30) {
  if (!trashedAt) return retentionDays;
  const deletedAt = typeof trashedAt === "number" ? trashedAt : new Date(trashedAt).getTime();
  if (!Number.isFinite(deletedAt)) return retentionDays;
  const elapsedDays = (Date.now() - deletedAt) / 86400000;
  return Math.max(0, Math.ceil(retentionDays - elapsedDays));
}

/**
 * Get the appropriate file type icon based on type.
 * @param {string} type
 * @returns {string}
 */
export function getFileIcon(type) {
  const icons = {
    image: "lucide:image",
    video: "lucide:film",
    document: "lucide:file-text",
    music: "lucide:music",
    audio: "lucide:music",
    archive: "lucide:archive",
    other: "lucide:file",
  };
  return icons[type] || icons.other;
}

/**
 * Get the appropriate file type color based on type.
 * @param {string} type
 * @returns {string}
 */
export function getFileTypeColor(type) {
  const colors = {
    image: "#3b82f6",
    video: "#ef4444",
    document: "#22c55e",
    music: "#a855f7",
    archive: "#f59e0b",
    other: "#6b7280",
  };
  return colors[type] || colors.other;
}

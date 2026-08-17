/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import TelegramService, { MAX_UPLOAD_SIZE } from "../services/TelegramService";
import useUploadProgress from "../hooks/useUploadProgress";
import { daysLeftInTrash, filterFiles } from "../Data/utilityData";

// ==================================================
// DASHBOARD CONTEXT — NIMBUS
// ==================================================
// Central state manager for the entire dashboard.
// Manages files, profile, virtual folders, tags,
// favorites, and trash. Metadata is synced to Telegram
// for cross-device persistence.
// ==================================================

const DashboardContext = createContext(null);

// Debounce metadata saves to avoid excessive API calls
const META_SAVE_DEBOUNCE_MS = 600;
const ACTIVITY_STORAGE_KEY = "nimbus_activity_log";
const METADATA_CACHE_PREFIX = "nimbus_metadata_cache";

// Random colors for virtual folders
const FOLDER_COLORS = [
  "var(--folder-1)", "var(--folder-2)", "var(--folder-3)",
  "var(--folder-4)", "var(--folder-5)", "var(--folder-6)",
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeMetadata(metadata = {}) {
  return {
    virtualFolders: Array.isArray(metadata.virtualFolders) ? metadata.virtualFolders : [],
    tags: metadata.tags && typeof metadata.tags === "object" ? metadata.tags : {},
    favorites: Array.isArray(metadata.favorites) ? metadata.favorites : [],
    trash: metadata.trash && typeof metadata.trash === "object" ? metadata.trash : {},
    version: Math.max(2, Number(metadata.version) || 1),
    updatedAt: metadata.updatedAt || null,
  };
}

function metadataCacheKey() {
  try {
    const token = sessionStorage.getItem("tg_session_token") || "anonymous";
    return `${METADATA_CACHE_PREFIX}:${token.slice(0, 24)}`;
  } catch {
    return `${METADATA_CACHE_PREFIX}:anonymous`;
  }
}

function readCachedMetadata() {
  try {
    const cached = JSON.parse(localStorage.getItem(metadataCacheKey()) || "null");
    return cached ? normalizeMetadata(cached) : null;
  } catch {
    return null;
  }
}

function writeCachedMetadata(metadata) {
  try {
    localStorage.setItem(metadataCacheKey(), JSON.stringify(metadata));
  } catch {
    // The Telegram copy remains the cross-device source of truth.
  }
}

function metadataTimestamp(metadata) {
  const timestamp = new Date(metadata?.updatedAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function restoreKnownFileNames(files, activities) {
  const knownNames = new Map();
  for (const activity of activities || []) {
    if (activity?.type !== "upload") continue;
    const originalName = activity.details?.originalName
      || (activity.message?.startsWith("Uploaded ") ? activity.message.slice(9) : null);
    if (!originalName) continue;
    if (activity.details?.fileId != null) knownNames.set(String(activity.details.fileId), originalName);
    if (activity.details?.messageId != null) knownNames.set(`message:${activity.details.messageId}`, originalName);
  }

  return (files || []).map((file) => {
    const originalName = knownNames.get(String(file.id)) || knownNames.get(`message:${file.messageId}`);
    if (!originalName) return file;
    const dotIndex = originalName.lastIndexOf(".");
    const hasExtension = dotIndex > 0 && dotIndex < originalName.length - 1;
    return {
      ...file,
      name: hasExtension ? originalName.slice(0, dotIndex) : originalName,
      extension: hasExtension ? originalName.slice(dotIndex) : "",
    };
  });
}

export function DashboardProvider({ children }) {
  // ==========================================
  // STATE
  // ==========================================

  // Telegram data
  const [files, setFiles] = useState([]);
  const [profile, setProfile] = useState({ name: "User", title: "", avatar: null, hasAvatar: false });
  const [storageData, setStorageData] = useState({ categories: [], totalBytes: 0, totalFormatted: "0 B" });

  // Metadata (synced to Telegram)
  const [virtualFolders, setVirtualFolders] = useState([]);
  const [tags, setTags] = useState({}); // { fileId: ["tag1", "tag2"] }
  const [favorites, setFavorites] = useState([]); // [fileId1, fileId2]
  const [trash, setTrash] = useState({}); // { fileId: { trashedAt: timestamp, messageId: number } }

  // UI state
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompact, setIsCompact] = useState(() => {
    try {
      return localStorage.getItem("nimbus_compact") === "true";
    } catch { return false; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState("synced");

  // Upload and activity state
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activityLog, setActivityLog] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const {
    items: uploadProgress,
    update: updateUploadProgress,
    finish: finishUploadProgress,
    clear: clearUploadProgress,
    overallProgress,
  } = useUploadProgress();

  // Refs for debounced save
  const metaSaveTimer = useRef(null);
  const metaLoaded = useRef(false);
  const metadataRef = useRef(normalizeMetadata());
  const metadataSaveChain = useRef(Promise.resolve());
  const syncRevision = useRef(0);
  const pendingUploads = useRef([]);
  const processingUploads = useRef(false);
  const activityLogRef = useRef(activityLog);

  useEffect(() => {
    activityLogRef.current = activityLog;
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityLog));
    } catch {
      // Activity history is helpful, but never blocks file operations.
    }
  }, [activityLog]);

  const logActivity = useCallback((type, message, details = {}) => {
    const entry = { id: generateId(), type, message, details, ts: Date.now() };
    setActivityLog((current) => [entry, ...current].slice(0, 500));
    return entry;
  }, []);

  // ==========================================
  // COMPACT MODE PERSISTENCE
  // ==========================================

  const toggleCompact = useCallback(() => {
    setIsCompact(prev => {
      const next = !prev;
      try { localStorage.setItem("nimbus_compact", String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ==========================================
  // METADATA SYNC — SAVE TO TELEGRAM
  // ==========================================

  const applyMetadataSnapshot = useCallback((metadata) => {
    const snapshot = normalizeMetadata(metadata);
    metadataRef.current = snapshot;
    setVirtualFolders(snapshot.virtualFolders);
    setTags(snapshot.tags);
    setFavorites(snapshot.favorites);
    setTrash(snapshot.trash);
    writeCachedMetadata(snapshot);
    return snapshot;
  }, []);

  const persistMetadata = useCallback((metadata) => {
    const snapshot = normalizeMetadata(metadata);
    const revision = ++syncRevision.current;
    setSyncStatus("syncing");

    const task = metadataSaveChain.current
      .catch(() => undefined)
      .then(() => TelegramService.saveMetadata(snapshot))
      .then(() => {
        if (revision === syncRevision.current) setSyncStatus("synced");
      })
      .catch((saveError) => {
        console.error("Failed to save metadata to Telegram:", saveError.message);
        if (revision === syncRevision.current) setSyncStatus("error");
      });
    metadataSaveChain.current = task;
    return task;
  }, []);

  // Merge every patch into one current snapshot before saving. This prevents a
  // favorite/tag update from overwriting a newer trash or folder update.
  const triggerMetaSave = useCallback((overrides = {}, immediate = false) => {
    const snapshot = normalizeMetadata({
      ...metadataRef.current,
      ...overrides,
      version: 2,
      updatedAt: new Date().toISOString(),
    });
    metadataRef.current = snapshot;
    writeCachedMetadata(snapshot);

    if (metaSaveTimer.current) clearTimeout(metaSaveTimer.current);
    if (immediate) return persistMetadata(snapshot);
    metaSaveTimer.current = window.setTimeout(() => persistMetadata(metadataRef.current), META_SAVE_DEBOUNCE_MS);
    return Promise.resolve();
  }, [persistMetadata]);

  // ==========================================
  // INITIAL DATA LOAD
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [profileData, filesData, storageResult, metadata] = await Promise.all([
          TelegramService.fetchProfileData(),
          TelegramService.fetchFiles(),
          TelegramService.fetchStorageData(),
          TelegramService.fetchMetadata(),
        ]);

        if (cancelled) return;

        // Profile
        setProfile({
          name: profileData.name,
          title: profileData.title,
          avatar: profileData.hasAvatar ? TelegramService.getAvatarUrl() : null,
          hasAvatar: profileData.hasAvatar,
        });

        // Files
        setFiles(restoreKnownFileNames(filesData, activityLogRef.current));

        // Storage
        setStorageData(storageResult);

        // Use the newest snapshot. The local copy closes the small race where a
        // user reloads immediately after an action while Telegram is still saving.
        const remoteMetadata = normalizeMetadata(metadata);
        const cachedMetadata = readCachedMetadata();
        const selectedMetadata = cachedMetadata
          && metadataTimestamp(cachedMetadata) > metadataTimestamp(remoteMetadata)
          ? cachedMetadata
          : remoteMetadata;
        applyMetadataSnapshot(selectedMetadata);
        metaLoaded.current = true;
        if (selectedMetadata === cachedMetadata) persistMetadata(selectedMetadata);

        // Auto-cleanup old trash items (30 days)
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const currentTrash = selectedMetadata.trash;
        const expiredIds = Object.entries(currentTrash)
          .filter(([, val]) => now - val.trashedAt > thirtyDays)
          .map(([id]) => id);

        if (expiredIds.length > 0) {
          const cleanedTrash = { ...currentTrash };
          for (const id of expiredIds) {
            // Permanently delete from Telegram
            try {
              if (cleanedTrash[id]?.messageId) {
                await TelegramService.deleteFile(cleanedTrash[id].messageId);
              }
            } catch (err) {
              console.warn(`Failed to auto-delete expired trash item ${id}:`, err.message);
            }
            delete cleanedTrash[id];
          }
          const cleanedMetadata = normalizeMetadata({
            ...selectedMetadata,
            trash: cleanedTrash,
            updatedAt: new Date().toISOString(),
          });
          applyMetadataSnapshot(cleanedMetadata);
          await persistMetadata(cleanedMetadata);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard load error:", err.message);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [applyMetadataSnapshot, persistMetadata]);

  // ==========================================
  // VIRTUAL FOLDER ACTIONS
  // ==========================================

  const createFolder = useCallback((name) => {
    const newFolder = {
      id: generateId(),
      name: name.trim(),
      color: FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      fileIds: [],
      createdAt: Date.now(),
    };
    setVirtualFolders(prev => {
      const updated = [...prev, newFolder];
      triggerMetaSave({ virtualFolders: updated });
      return updated;
    });
    logActivity("folder", `Created folder “${newFolder.name}”`, { folderId: newFolder.id });
    return newFolder;
  }, [triggerMetaSave, logActivity]);

  const deleteFolder = useCallback((folderId) => {
    const folderName = virtualFolders.find((folder) => folder.id === folderId)?.name || "folder";
    setVirtualFolders(prev => {
      const updated = prev.filter(f => f.id !== folderId);
      triggerMetaSave({ virtualFolders: updated });
      return updated;
    });
    logActivity("folder", `Deleted folder “${folderName}”`, { folderId });
  }, [virtualFolders, triggerMetaSave, logActivity]);

  const renameFolder = useCallback((folderId, newName) => {
    setVirtualFolders(prev => {
      const updated = prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f);
      triggerMetaSave({ virtualFolders: updated });
      return updated;
    });
  }, [triggerMetaSave]);

  const moveFileToFolder = useCallback((fileId, folderId) => {
    setVirtualFolders(prev => {
      const updated = prev.map(f => {
        if (f.id === folderId) {
          if (f.fileIds.includes(fileId)) return f;
          return { ...f, fileIds: [...f.fileIds, fileId] };
        }
        return f;
      });
      triggerMetaSave({ virtualFolders: updated });
      return updated;
    });
  }, [triggerMetaSave]);

  const removeFileFromFolder = useCallback((fileId, folderId) => {
    setVirtualFolders(prev => {
      const updated = prev.map(f => {
        if (f.id === folderId) {
          return { ...f, fileIds: f.fileIds.filter(id => id !== fileId) };
        }
        return f;
      });
      triggerMetaSave({ virtualFolders: updated });
      return updated;
    });
  }, [triggerMetaSave]);

  // ==========================================
  // TAG ACTIONS
  // ==========================================

  const addTag = useCallback((fileId, tagName) => {
    const tag = tagName.trim().toLowerCase();
    if (!tag) return;
    setTags(prev => {
      const fileTags = prev[fileId] || [];
      if (fileTags.includes(tag)) return prev;
      const updated = { ...prev, [fileId]: [...fileTags, tag] };
      triggerMetaSave({ tags: updated });
      return updated;
    });
    logActivity("tag", `Added #${tag} to a file`, { fileId, tag });
  }, [triggerMetaSave, logActivity]);

  const removeTag = useCallback((fileId, tagName) => {
    setTags(prev => {
      const fileTags = prev[fileId] || [];
      const updated = { ...prev, [fileId]: fileTags.filter(t => t !== tagName) };
      if (updated[fileId].length === 0) delete updated[fileId];
      triggerMetaSave({ tags: updated });
      return updated;
    });
  }, [triggerMetaSave]);

  // Get all unique tags across all files
  const allTags = Object.values(tags).flat().filter((v, i, a) => a.indexOf(v) === i);

  // ==========================================
  // FAVORITES ACTIONS
  // ==========================================

  const toggleFavorite = useCallback((fileId) => {
    setFavorites(prev => {
      const updated = prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId];
      triggerMetaSave({ favorites: updated });
      return updated;
    });
    logActivity("favorite", "Updated a file favorite", { fileId });
  }, [triggerMetaSave, logActivity]);

  const isFavorite = useCallback((fileId) => favorites.includes(fileId), [favorites]);

  // ==========================================
  // TRASH ACTIONS
  // ==========================================

  const moveToTrash = useCallback((fileId, messageId) => {
    const updatedTrash = {
      ...metadataRef.current.trash,
      [fileId]: { trashedAt: Date.now(), messageId },
    };
    const updatedFavorites = metadataRef.current.favorites.filter((id) => id !== fileId);
    setTrash(updatedTrash);
    setFavorites(updatedFavorites);
    triggerMetaSave({ trash: updatedTrash, favorites: updatedFavorites }, true);
    logActivity("delete", "Moved a file to trash", { fileId, messageId });
  }, [triggerMetaSave, logActivity]);

  const restoreFromTrash = useCallback((fileId) => {
    const updatedTrash = { ...metadataRef.current.trash };
    delete updatedTrash[fileId];
    setTrash(updatedTrash);
    triggerMetaSave({ trash: updatedTrash }, true);
    logActivity("restore", "Restored a file from trash", { fileId });
  }, [triggerMetaSave, logActivity]);

  const permanentDelete = useCallback(async (fileId) => {
    const trashEntry = trash[fileId];
    if (trashEntry?.messageId) {
      try {
        await TelegramService.deleteFile(trashEntry.messageId);
      } catch (err) {
        console.error("Permanent delete failed:", err.message);
        throw err;
      }
    }
    const updatedTrash = { ...metadataRef.current.trash };
    delete updatedTrash[fileId];
    const updatedFolders = metadataRef.current.virtualFolders.map((folder) => ({
      ...folder,
      fileIds: folder.fileIds.filter((id) => id !== fileId),
    }));
    const updatedTags = { ...metadataRef.current.tags };
    delete updatedTags[fileId];
    const updatedFavorites = metadataRef.current.favorites.filter((id) => id !== fileId);

    setTrash(updatedTrash);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setVirtualFolders(updatedFolders);
    setTags(updatedTags);
    setFavorites(updatedFavorites);
    triggerMetaSave({
      trash: updatedTrash,
      virtualFolders: updatedFolders,
      tags: updatedTags,
      favorites: updatedFavorites,
    }, true);
    logActivity("delete", "Permanently deleted a file", { fileId });
  }, [trash, triggerMetaSave, logActivity]);

  const isInTrash = useCallback((fileId) => fileId in trash, [trash]);

  const getTrashDaysRemaining = useCallback((fileId) => {
    const entry = trash[fileId];
    if (!entry) return 0;
    return daysLeftInTrash(entry.trashedAt);
  }, [trash]);

  // ==========================================
  // FILE UPLOAD
  // ==========================================

  const uploadFile = useCallback(async (file, folderId = null, onProgress) => {
    const uploaded = await TelegramService.uploadFile(file, onProgress);
    setFiles(prev => [uploaded, ...prev]);

    if (folderId) {
      setVirtualFolders(prev => {
        const updated = prev.map(f => {
          if (f.id === folderId) {
            return { ...f, fileIds: [...f.fileIds, uploaded.id] };
          }
          return f;
        });
        triggerMetaSave({ virtualFolders: updated }, true);
        return updated;
      });
    }

    logActivity("upload", `Uploaded ${file.name}`, {
      fileId: uploaded.id,
      messageId: uploaded.messageId,
      size: file.size,
      originalName: file.name,
    });
    return uploaded;
  }, [triggerMetaSave, logActivity]);

  const processUploadQueue = useCallback(async () => {
    if (processingUploads.current) return;
    processingUploads.current = true;
    setIsUploading(true);

    while (pendingUploads.current.length > 0) {
      const item = pendingUploads.current.shift();
      setUploadQueue((current) => current.map((queued) => (
        queued.id === item.id ? { ...queued, status: "uploading", progress: 0, error: null } : queued
      )));

      try {
        const uploaded = await uploadFile(item.file, item.folderId, (percent, sent, total) => {
          updateUploadProgress(item.id, percent, sent, total);
          setUploadQueue((current) => current.map((queued) => (
            queued.id === item.id ? { ...queued, progress: percent } : queued
          )));
        });
        finishUploadProgress(item.id, item.file.size);
        setUploadQueue((current) => current.map((queued) => (
          queued.id === item.id
            ? { ...queued, status: "completed", progress: 100, uploadedFile: uploaded }
            : queued
        )));
        window.setTimeout(() => {
          setUploadQueue((current) => current.filter((queued) => queued.id !== item.id || queued.status !== "completed"));
          clearUploadProgress(item.id);
        }, 2000);
      } catch (uploadError) {
        setUploadQueue((current) => current.map((queued) => (
          queued.id === item.id
            ? { ...queued, status: "error", error: uploadError.message || "Upload failed" }
            : queued
        )));
        logActivity("upload-error", `Could not upload ${item.file.name}`, { error: uploadError.message });
      }
    }

    processingUploads.current = false;
    setIsUploading(false);
  }, [uploadFile, updateUploadProgress, finishUploadProgress, clearUploadProgress, logActivity]);

  const queueFiles = useCallback((fileList, folderId = null) => {
    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return [];

    const items = selectedFiles.map((file) => ({
      id: `${generateId()}-${file.lastModified || 0}`,
      file,
      folderId,
      status: file.size > MAX_UPLOAD_SIZE ? "error" : "pending",
      progress: 0,
      error: file.size > MAX_UPLOAD_SIZE ? "File exceeds the 2GB upload limit" : null,
    }));

    setUploadQueue((current) => [...current, ...items]);
    pendingUploads.current.push(...items.filter((item) => item.status === "pending"));
    items.filter((item) => item.status === "error").forEach((item) => {
      logActivity("upload-error", `Rejected ${item.file.name}`, { error: item.error });
    });
    Promise.resolve().then(processUploadQueue);
    return items;
  }, [processUploadQueue, logActivity]);

  const removeFromUploadQueue = useCallback((id) => {
    pendingUploads.current = pendingUploads.current.filter((item) => item.id !== id);
    setUploadQueue((current) => current.filter((item) => item.id !== id || item.status === "uploading"));
    clearUploadProgress(id);
  }, [clearUploadProgress]);

  const clearUploadQueue = useCallback(() => {
    pendingUploads.current = [];
    setUploadQueue((current) => current.filter((item) => item.status === "uploading"));
    Object.keys(uploadProgress).forEach(clearUploadProgress);
  }, [uploadProgress, clearUploadProgress]);

  // ==========================================
  // REFRESH FILES
  // ==========================================

  const refreshFiles = useCallback(async () => {
    try {
      const [filesData, remoteResult] = await Promise.all([
        TelegramService.fetchFiles(),
        TelegramService.fetchMetadata(),
      ]);
      setFiles(restoreKnownFileNames(filesData, activityLogRef.current));
      const remoteMetadata = normalizeMetadata(remoteResult);
      if (metadataTimestamp(remoteMetadata) > metadataTimestamp(metadataRef.current)) {
        applyMetadataSnapshot(remoteMetadata);
      }
      setSyncStatus("synced");
    } catch (err) {
      console.error("Refresh files error:", err.message);
      setSyncStatus("error");
    }
  }, [applyMetadataSnapshot]);

  // Keep open dashboards aligned with changes made from another device.
  useEffect(() => {
    const refreshOnFocus = () => refreshFiles();
    const interval = window.setInterval(refreshFiles, 60000);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refreshFiles]);

  // ==========================================
  // SEARCH & FILTER HELPERS
  // ==========================================

  const getFilteredFiles = useCallback((overrideQuery = null) => {
    const query = overrideQuery !== null ? overrideQuery : searchQuery;
    return filterFiles(files.filter(f => !isInTrash(f.id)), query, tags);
  }, [files, searchQuery, tags, isInTrash]);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  // Files not in trash
  const activeFiles = files.filter(f => !isInTrash(f.id));

  // Trashed files
  const trashedFiles = files.filter(f => isInTrash(f.id));

  // Favorited files
  const starredFiles = activeFiles.filter(f => favorites.includes(f.id));

  // Get files for a specific folder
  const getFolderFiles = useCallback((folderId) => {
    const folder = virtualFolders.find(f => f.id === folderId);
    if (!folder) return [];
    return activeFiles.filter(f => folder.fileIds.includes(f.id));
  }, [virtualFolders, activeFiles]);

  // Get folder file count and size
  const getFolderStats = useCallback((folderId) => {
    const folderFiles = getFolderFiles(folderId);
    const totalSize = folderFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    return { count: folderFiles.length, totalSize };
  }, [getFolderFiles]);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = {
    // Telegram data
    files,
    profile,
    storageData,

    // Metadata
    virtualFolders,
    tags,
    favorites,
    trash,
    allTags,

    // UI state
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isCompact,
    toggleCompact,
    isLoading,
    error,
    syncStatus,
    mobileNavOpen,
    setMobileNavOpen,

    // Upload queue and local activity history
    uploadQueue,
    isUploading,
    uploadProgress,
    overallUploadProgress: overallProgress,
    activityLog,
    logActivity,

    // Folder actions
    createFolder,
    deleteFolder,
    renameFolder,
    moveFileToFolder,
    removeFileFromFolder,
    getFolderFiles,
    getFolderStats,

    // Tag actions
    addTag,
    removeTag,

    // Favorite actions
    toggleFavorite,
    isFavorite,

    // Trash actions
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    isInTrash,
    getTrashDaysRemaining,

    // File operations
    uploadFile,
    queueFiles,
    removeFromUploadQueue,
    clearUploadQueue,
    refreshFiles,
    getFilteredFiles,

    // Computed
    activeFiles,
    trashedFiles,
    starredFiles,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export default DashboardContext;

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import { formatFileSize, formatDate, getFileIcon, getFileTypeColor } from "../../../Data/utilityData";

// ==================================================
// TRASH VIEW — DELETED FILES WITH WARNING BANNER
// ==================================================

const TrashView = () => {
  const {
    trashedFiles,
    getTrashDaysRemaining,
    restoreFromTrash,
    permanentDelete,
  } = useDashboard();

  const [deletingId, setDeletingId] = useState(null);

  const handlePermanentDelete = async (fileId) => {
    if (!window.confirm("This will permanently delete the file from Telegram. This cannot be undone. Continue?")) {
      return;
    }
    setDeletingId(fileId);
    try {
      await permanentDelete(fileId);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="drive-view nimbus-fade-in">
      {/* Warning Banner */}
      <div className="trash-banner">
        <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold text-amber-200">Warning:</span>{" "}
          <span className="text-amber-100/80">
            Files in trash are permanently deleted after 30 days. This action cannot be undone.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Icon icon="lucide:trash-2" className="w-7 h-7 text-red-400 inline mr-2" />
            Trash
          </h1>
          <p className="view-subtitle">{trashedFiles.length} files in trash</p>
        </div>
      </div>

      {/* Trashed Files List */}
      {trashedFiles.length === 0 ? (
        <div className="empty-state">
          <Icon icon="lucide:trash-2" className="w-16 h-16 text-zinc-700" />
          <p className="text-zinc-500 mt-4">Trash is empty</p>
          <p className="text-zinc-600 text-sm mt-1">
            Files you delete will appear here for 30 days
          </p>
        </div>
      ) : (
        <div className="trash-list">
          {trashedFiles.map((file) => {
            const daysLeft = getTrashDaysRemaining(file.id);
            const typeColor = getFileTypeColor(file.type);
            const typeIcon = getFileIcon(file.type);
            const isDeleting = deletingId === file.id;

            return (
              <div key={file.id} className="trash-item glass-panel">
                <div className="trash-item-info">
                  <div
                    className="trash-item-icon"
                    style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                  >
                    <Icon icon={typeIcon} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white text-sm truncate">
                      {file.name}{file.extension || ""}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {formatFileSize(file.size || 0)} • {formatDate(file.uploadDate)}
                    </div>
                  </div>
                </div>

                <div className="trash-item-actions">
                  <span className={`trash-days-badge ${daysLeft <= 5 ? "urgent" : ""}`}>
                    {daysLeft} days left
                  </span>
                  <button
                    className="trash-restore-btn"
                    onClick={() => restoreFromTrash(file.id)}
                    disabled={isDeleting}
                  >
                    <Icon icon="lucide:undo-2" className="w-4 h-4" />
                    Restore
                  </button>
                  <button
                    className="trash-delete-btn"
                    onClick={() => handlePermanentDelete(file.id)}
                    disabled={isDeleting}
                  >
                    <Icon
                      icon={isDeleting ? "lucide:loader-2" : "lucide:trash-2"}
                      className={`w-4 h-4 ${isDeleting ? "animate-spin" : ""}`}
                    />
                    {isDeleting ? "Deleting..." : "Delete Forever"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrashView;

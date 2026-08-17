import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";

// ==================================================
// FILE CONTEXT MENU — THREE-DOT DROPDOWN
// ==================================================

const FileContextMenu = ({ file, onClose }) => {
  const {
    virtualFolders,
    isFavorite,
    toggleFavorite,
    moveFileToFolder,
    moveToTrash,
  } = useDashboard();

  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const handleFavorite = () => {
    toggleFavorite(file.id);
    onClose();
  };

  const handleMoveToFolder = (folderId) => {
    moveFileToFolder(file.id, folderId);
    onClose();
  };

  const handleTrash = () => {
    moveToTrash(file.id, file.messageId);
    onClose();
  };

  const handleDownload = () => {
    if (file.url) {
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name + (file.extension || "");
      a.click();
    }
    onClose();
  };

  const starred = isFavorite(file.id);

  return (
    <div
      ref={menuRef}
      className="nimbus-popover"
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        zIndex: 100,
        minWidth: "200px",
      }}
    >
      <div className="context-menu">
        {/* Add/Remove Favorites */}
        <button className="context-menu-item" onClick={handleFavorite}>
          <Icon
            icon={starred ? "lucide:star-off" : "lucide:star"}
            className="w-4 h-4"
            style={{ color: starred ? "var(--warning)" : undefined }}
          />
          <span>{starred ? "Remove from Favorites" : "Add to Favorites"}</span>
        </button>

        {/* Move to Folder */}
        <div className="flex flex-col">
          <button
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveSubmenu(!showMoveSubmenu);
            }}
          >
            <Icon icon="lucide:folder-input" className="w-4 h-4" />
            <span>Move File To</span>
            <Icon icon={showMoveSubmenu ? "lucide:chevron-down" : "lucide:chevron-right"} className="w-3 h-3 ml-auto" />
          </button>

          {showMoveSubmenu && (
            <div className="flex flex-col bg-white/5 rounded-lg mx-2 my-1 overflow-hidden">
              {virtualFolders.length > 0 ? (
                virtualFolders.map((folder) => (
                  <button
                    key={folder.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm text-zinc-300 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToFolder(folder.id);
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-zinc-500">No folders yet</div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="context-menu-divider" />

        {/* Download */}
        <button className="context-menu-item" onClick={handleDownload}>
          <Icon icon="lucide:download" className="w-4 h-4" />
          <span>Download</span>
        </button>

        {/* Move to Trash */}
        <button className="context-menu-item danger" onClick={handleTrash}>
          <Icon icon="lucide:trash-2" className="w-4 h-4" />
          <span>Move to Trash</span>
        </button>
      </div>
    </div>
  );
};

export default FileContextMenu;

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import { formatFileSize } from "../../../Data/utilityData";
import CreateFolderDialog from "./CreateFolderDialog";

const FolderRow = () => {
  const { virtualFolders, getFolderStats, setActiveTab, createFolder } = useDashboard();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="drive-section" aria-labelledby="virtual-folders-heading">
      <div className="drive-section-heading">
        <h2 id="virtual-folders-heading">Virtual folders</h2>
        <button className="drive-secondary-button" onClick={() => setDialogOpen(true)}>
          <Icon icon="lucide:plus" /> Create folder
        </button>
      </div>
      <div className="drive-folder-row nimbus-hide-scrollbar">
        {virtualFolders.length === 0 ? (
          <button className="drive-folder-card drive-folder-empty" onClick={() => setDialogOpen(true)}>
            <Icon icon="lucide:folder-plus" />
            <span>Create your first folder</span>
          </button>
        ) : virtualFolders.map((folder) => {
          const stats = getFolderStats(folder.id);
          return (
            <button
              key={folder.id}
              className="drive-folder-card"
              onClick={() => setActiveTab(`folder:${folder.id}`)}
            >
              <span
                className="drive-folder-icon"
                style={{ "--folder-color": folder.color || "var(--folder-1)" }}
              >
                <Icon icon="lucide:folder" />
              </span>
              <span className="drive-folder-copy">
                <strong title={folder.name}>{folder.name}</strong>
                <small>{stats.count} {stats.count === 1 ? "file" : "files"} · {formatFileSize(stats.totalSize)}</small>
              </span>
            </button>
          );
        })}
      </div>
      {dialogOpen && (
        <CreateFolderDialog onClose={() => setDialogOpen(false)} onCreate={createFolder} />
      )}
    </section>
  );
};

export default FolderRow;

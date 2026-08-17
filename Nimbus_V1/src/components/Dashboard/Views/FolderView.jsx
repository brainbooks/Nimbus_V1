import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import { formatFileSize } from "../../../Data/utilityData";
import FileGrid from "../Features/FileGrid";
import UploadQueue from "../Features/UploadQueue";

const FolderView = ({ folderId }) => {
  const { virtualFolders, getFolderFiles, getFolderStats, deleteFolder, setActiveTab } = useDashboard();
  const folder = virtualFolders.find((item) => item.id === folderId);
  const folderFiles = getFolderFiles(folderId);
  const stats = getFolderStats(folderId);

  if (!folder) {
    return (
      <div className="drive-empty-state nimbus-fade-in">
        <Icon icon="lucide:folder-x" />
        <strong>Folder not found</strong>
        <button className="drive-secondary-button" onClick={() => setActiveTab("home")}>Go home</button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`Delete folder “${folder.name}”? Its files will stay in your cloud.`)) {
      deleteFolder(folderId);
      setActiveTab("home");
    }
  };

  return (
    <div className="drive-view nimbus-fade-in">
      <div className="view-header folder-view-header">
        <div className="folder-view-title">
          <button className="drive-icon-button" onClick={() => setActiveTab("home")} aria-label="Back to home">
            <Icon icon="lucide:arrow-left" />
          </button>
          <span className="drive-folder-icon large" style={{ "--folder-color": folder.color || "var(--folder-1)" }}>
            <Icon icon="lucide:folder" />
          </span>
          <div>
            <h1 className="view-title">{folder.name}</h1>
            <p className="view-subtitle">{stats.count} {stats.count === 1 ? "file" : "files"} · {formatFileSize(stats.totalSize)}</p>
          </div>
        </div>
        <button className="drive-danger-button" onClick={handleDelete}>
          <Icon icon="lucide:trash-2" /> Delete folder
        </button>
      </div>
      <UploadQueue folderId={folderId} />
      <FileGrid files={folderFiles} emptyMessage="This folder is empty." />
    </div>
  );
};

export default FolderView;

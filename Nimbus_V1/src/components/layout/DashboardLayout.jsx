import { useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import UploadQueue from "../Dashboard/Features/UploadQueue";
import { useDashboard } from "../../contexts/DashboardContext";

const DashboardLayout = ({ children, onOpenSettings }) => {
  const { isCompact, queueFiles, activeTab } = useDashboard();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    if (event.target.closest?.(".upload-dropzone")) {
      setIsDragging(false);
      return;
    }
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    if (event.currentTarget === event.target) setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.target.closest?.(".upload-dropzone")) return;
    if (!event.dataTransfer?.files?.length) return;
    const folderId = activeTab.startsWith("folder:") ? activeTab.split(":")[1] : null;
    queueFiles(event.dataTransfer.files, folderId);
  }, [activeTab, queueFiles]);

  return (
    <div className="dashboard-shell" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Topbar onOpenSettings={onOpenSettings} />
      <div className="dashboard-frame">
        <Sidebar />
        <main className={`dashboard-main ${isCompact ? "compact" : ""}`}>
          <div className="dashboard-content">{children}</div>
        </main>
      </div>

      {isDragging && (
        <div className="dashboard-drop-overlay">
          <div>
            <Icon icon="lucide:upload-cloud" />
            <h2>Drop files to upload</h2>
            <p>{activeTab.startsWith("folder:") ? "Files will be added to this folder." : "Files will be added to your Telegram cloud."}</p>
          </div>
        </div>
      )}
      <UploadQueue compact />
    </div>
  );
};

export default DashboardLayout;

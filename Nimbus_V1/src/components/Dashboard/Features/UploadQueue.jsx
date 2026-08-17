import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import { formatFileSize } from "../../../Data/utilityData";

const statusIcon = {
  pending: "lucide:file-clock",
  uploading: "lucide:loader-circle",
  completed: "lucide:circle-check",
  error: "lucide:circle-x",
};

const UploadQueue = ({ folderId = null, compact = false }) => {
  const {
    uploadQueue,
    isUploading,
    overallUploadProgress,
    queueFiles,
    removeFromUploadQueue,
    clearUploadQueue,
  } = useDashboard();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (files) => {
    queueFiles(files, folderId);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (compact) {
    if (!uploadQueue.length) return null;
    const completed = uploadQueue.filter((item) => item.status === "completed").length;
    return (
      <aside className="upload-tray" aria-live="polite">
        <div className="upload-tray-heading">
          <Icon icon={isUploading ? "lucide:cloud-upload" : "lucide:list-checks"} />
          <span>{isUploading ? `Uploading ${completed + 1} of ${uploadQueue.length}` : `${uploadQueue.length} upload item${uploadQueue.length === 1 ? "" : "s"}`}</span>
          <strong>{overallUploadProgress}%</strong>
        </div>
        <div className="upload-progress"><span style={{ width: `${overallUploadProgress}%` }} /></div>
      </aside>
    );
  }

  return (
    <section className="upload-queue-card" aria-label="Upload files">
      <div
        className={`upload-dropzone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <Icon icon="lucide:upload-cloud" className="upload-dropzone-icon" />
        <div>
          <strong>Drag files here to upload</strong>
          <p>Up to 2GB per file. Uploads are sent securely to your Telegram storage.</p>
        </div>
        <button className="drive-primary-button" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(event) => addFiles(event.target.files)} />
      </div>

      {uploadQueue.length > 0 && (
        <div className="upload-queue-panel" aria-live="polite">
          <div className="upload-queue-header">
            <span>{uploadQueue.length} file{uploadQueue.length === 1 ? "" : "s"} in queue</span>
            <button onClick={clearUploadQueue} disabled={isUploading}>Clear queue</button>
          </div>
          <div className="upload-queue-list">
            {uploadQueue.map((item) => (
              <div className={`upload-queue-item status-${item.status}`} key={item.id}>
                <Icon icon={statusIcon[item.status]} className={item.status === "uploading" ? "upload-spin" : ""} />
                <div className="upload-file-copy">
                  <strong title={item.file.name}>{item.file.name}</strong>
                  <span>{formatFileSize(item.file.size)} · {item.status === "uploading" && item.progress === 100 ? "Saving to Telegram" : item.status}</span>
                  {item.error && <small>{item.error}</small>}
                  {item.status === "uploading" && (
                    <div className="upload-progress"><span style={{ width: `${item.progress}%` }} /></div>
                  )}
                </div>
                <span className="upload-percent">{item.progress}%</span>
                {item.status !== "uploading" && item.status !== "completed" && (
                  <button className="upload-remove" onClick={() => removeFromUploadQueue(item.id)} aria-label={`Remove ${item.file.name}`}>
                    <Icon icon="lucide:x" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isUploading && (
            <div className="upload-overall">
              <span>Overall progress</span><strong>{overallUploadProgress}%</strong>
              <div className="upload-progress"><span style={{ width: `${overallUploadProgress}%` }} /></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default UploadQueue;

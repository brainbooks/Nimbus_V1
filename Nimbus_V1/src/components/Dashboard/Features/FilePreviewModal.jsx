import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import { formatDateTime, formatFileSize, getFileIcon, kindFromName } from "../../../Data/utilityData";

const FilePreviewModal = ({ file, onClose }) => {
  const { tags, virtualFolders } = useDashboard();
  const closeButtonRef = useRef(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const fileTags = tags[file.id] || [];
  const folder = virtualFolders.find((item) => item.fileIds?.includes(file.id));
  const fileName = `${file.name || "File"}${file.extension || ""}`;
  const kind = kindFromName(fileName, file.mimeType, file.type);
  const canRenderPdf = file.mimeType === "application/pdf" || file.extension?.toLowerCase() === ".pdf";

  useEffect(() => {
    const handleKeyDown = (event) => event.key === "Escape" && onClose();
    const previousBodyOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [onClose]);

  const loaded = () => setMediaLoading(false);
  const failed = () => {
    setMediaLoading(false);
    setMediaError(true);
  };

  const renderMedia = () => {
    if (mediaError) {
      return (
        <div className="file-preview-placeholder preview-error">
          <Icon icon="lucide:circle-alert" />
          <strong>This file cannot be previewed in your browser</strong>
          <span>Its format or codec may not be supported. You can still download or open the original.</span>
        </div>
      );
    }

    if (kind === "image") {
      return <img className="file-preview-media" src={file.url} alt={fileName} onLoad={loaded} onError={failed} />;
    }

    if (kind === "video") {
      return (
        <video
          className="file-preview-media"
          src={file.url}
          poster={file.thumbnail || undefined}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={loaded}
          onCanPlay={loaded}
          onError={failed}
        >
          Your browser does not support this video.
        </video>
      );
    }

    if (kind === "audio") {
      return (
        <div className="file-preview-audio">
          <span><Icon icon="lucide:music-2" /></span>
          <strong>{fileName}</strong>
          <audio src={file.url} controls preload="metadata" onLoadedMetadata={loaded} onError={failed}>
            Your browser does not support this audio file.
          </audio>
        </div>
      );
    }

    if (canRenderPdf) {
      return (
        <object className="file-preview-media pdf" data={file.url} type="application/pdf" onLoad={loaded}>
          <div className="file-preview-placeholder">
            <Icon icon="lucide:file-text" />
            <span>PDF preview is unavailable in this browser.</span>
          </div>
        </object>
      );
    }

    return (
      <div className="file-preview-placeholder">
        <Icon icon={getFileIcon(kind)} />
        <strong>{kind}</strong>
        <span>Preview is not available for this file type.</span>
      </div>
    );
  };

  return createPortal(
    <div className="file-preview-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="file-preview-modal nimbus-scale-in" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <header>
          <div>
            <p>{kind} preview</p>
            <h2 id="preview-title" title={fileName}>{fileName}</h2>
          </div>
          <div className="file-preview-header-actions">
            <a href={file.url} target="_blank" rel="noreferrer" aria-label="Open original in new tab">
              <Icon icon="lucide:external-link" />
            </a>
            <button ref={closeButtonRef} onClick={onClose} aria-label="Close preview">
              <Icon icon="lucide:x" />
            </button>
          </div>
        </header>

        <div className={`file-preview-stage kind-${kind}${mediaLoading ? " is-loading" : ""}`}>
          {mediaLoading && !mediaError && ["image", "video", "audio"].includes(kind) && (
            <div className="file-preview-loading">
              <Icon icon="lucide:loader-circle" />
              <span>Loading preview…</span>
            </div>
          )}
          {renderMedia()}
        </div>

        <div className="file-preview-footer">
          <details className="file-preview-info">
            <summary><Icon icon="lucide:info" /> File details</summary>
            <dl className="file-preview-details">
              <div><dt>Size</dt><dd>{formatFileSize(file.size)}</dd></div>
              <div><dt>Uploaded</dt><dd>{formatDateTime(file.uploadDate)}</dd></div>
              <div><dt>Folder</dt><dd>{folder?.name || "None"}</dd></div>
              <div><dt>Type</dt><dd>{file.mimeType || kind}</dd></div>
              <div className="file-preview-tags"><dt>Tags</dt><dd>{fileTags.length ? fileTags.map((tag) => `#${tag}`).join(", ") : "None"}</dd></div>
            </dl>
          </details>
          <a className="drive-primary-button file-preview-download" href={file.url} download={fileName}>
            <Icon icon="lucide:download" /> Download
          </a>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default FilePreviewModal;

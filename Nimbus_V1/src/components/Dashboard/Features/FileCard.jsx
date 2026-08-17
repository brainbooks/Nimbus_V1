import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import { formatDateTime, formatFileSize, getFileIcon, getFileTypeColor, kindFromName } from "../../../Data/utilityData";
import FileContextMenu from "./FileContextMenu";
import FilePreviewModal from "./FilePreviewModal";
import TagEditor from "./TagEditor";

const FileCard = ({ file, onClick }) => {
  const { tags, isFavorite, toggleFavorite, setSearchQuery, setActiveTab } = useDashboard();
  const [showMenu, setShowMenu] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const menuButtonRef = useRef(null);
  const fileTags = tags[file.id] || [];
  const starred = isFavorite(file.id);
  const fileName = `${file.name || "File"}${file.extension || ""}`;
  const kind = kindFromName(fileName, file.mimeType, file.type);
  const typeColor = getFileTypeColor(kind);

  const openPreview = () => {
    setShowPreview(true);
    onClick?.(file);
  };

  return (
    <>
      <article className="drive-file-card">
        <header>
          <p title={fileName}>{fileName}</p>
          <button
            className={`drive-file-star ${starred ? "active" : ""}`}
            onClick={() => toggleFavorite(file.id)}
            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
          >
            <Icon icon="lucide:star" />
          </button>
          <div className="drive-file-menu-wrap" ref={menuButtonRef}>
            <button
              className="drive-file-menu-button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => setShowMenu((open) => !open)}
              aria-label={`Options for ${fileName}`}
            >
              <Icon icon="lucide:more-vertical" />
            </button>
            {showMenu && (
              <FileContextMenu file={file} onClose={() => setShowMenu(false)} />
            )}
          </div>
        </header>
        <button className="drive-file-preview" onClick={openPreview} aria-label={`Preview ${fileName}`}>
          {file.thumbnail ? (
            <img src={file.thumbnail} alt={fileName} loading="lazy" />
          ) : (
            <span style={{ "--file-kind-color": typeColor }}>
              <Icon icon={getFileIcon(kind)} />
              <small>{kind}</small>
            </span>
          )}
        </button>
        <footer>
          <div className="drive-file-meta">
            <span>{formatDateTime(file.uploadDate)}</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <div className="drive-file-tags">
            {fileTags.slice(0, 3).map((tag) => (
              <button key={tag} onClick={() => { setSearchQuery(`#${tag}`); setActiveTab("home"); }}>
                #{tag}
              </button>
            ))}
            {fileTags.length > 3 && <span>+{fileTags.length - 3}</span>}
            <button
              className="drive-add-tag"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => setShowTagEditor((open) => !open)}
            >
              <Icon icon="lucide:tag" /> Add tag
            </button>
          </div>
        </footer>
        {showTagEditor && (
          <div className="drive-tag-editor-wrap" onClick={(event) => event.stopPropagation()}>
            <TagEditor fileId={file.id} onClose={() => setShowTagEditor(false)} />
          </div>
        )}
      </article>
      {showPreview && <FilePreviewModal file={file} onClose={() => setShowPreview(false)} />}
    </>
  );
};

export default FileCard;

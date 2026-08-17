import { Icon } from "@iconify/react";
import FileCard from "./FileCard";
import { useDashboard } from "../../../contexts/DashboardContext";
import { filterFiles } from "../../../Data/utilityData";

const FileGrid = ({ files, emptyMessage = "Nothing here yet.", applySearch = false }) => {
  const { searchQuery, tags } = useDashboard();
  const visibleFiles = applySearch ? filterFiles(files, searchQuery, tags) : files;

  if (!visibleFiles.length) {
    return (
      <div className="drive-empty-state">
        <Icon icon="lucide:folder-open" />
        <strong>{searchQuery && applySearch ? `No files match “${searchQuery}”` : emptyMessage}</strong>
        <span>Files you add will appear here automatically.</span>
      </div>
    );
  }

  return (
    <div className="file-grid">
      {visibleFiles.map((file) => <FileCard key={file.id} file={file} />)}
    </div>
  );
};

export default FileGrid;

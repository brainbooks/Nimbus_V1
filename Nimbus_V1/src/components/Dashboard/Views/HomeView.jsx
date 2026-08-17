import { useDashboard } from "../../../contexts/DashboardContext";
import FileGrid from "../Features/FileGrid";
import FolderRow from "../Features/FolderRow";
import InfoCard from "../Features/InfoCard";
import TagRow from "../Features/TagRow";
import UploadQueue from "../Features/UploadQueue";

const HomeView = () => {
  const { activeFiles, getFilteredFiles, searchQuery } = useDashboard();
  const filteredFiles = getFilteredFiles();

  return (
    <div className="drive-view nimbus-fade-in">
      <InfoCard />
      <FolderRow />
      <TagRow />
      <UploadQueue />
      <section className="drive-section" aria-labelledby="files-heading">
        <div className="drive-section-heading">
          <div>
            <h2 id="files-heading">{searchQuery ? "Search results" : "Recent files"}</h2>
            <p>{searchQuery ? `${filteredFiles.length} match${filteredFiles.length === 1 ? "" : "es"}` : `${activeFiles.length} file${activeFiles.length === 1 ? "" : "s"} in your cloud`}</p>
          </div>
        </div>
        <FileGrid files={filteredFiles} emptyMessage={searchQuery ? "No matching files" : "Upload your first file to get started."} />
      </section>
    </div>
  );
};

export default HomeView;

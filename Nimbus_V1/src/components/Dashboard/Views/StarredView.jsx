import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import FileGrid from "../Features/FileGrid";

const StarredView = () => {
  const { starredFiles } = useDashboard();
  return (
    <div className="drive-view nimbus-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title"><Icon icon="lucide:star" className="view-title-icon warning" /> Starred files</h1>
          <p className="view-subtitle">The files you want close at hand.</p>
        </div>
      </div>
      <FileGrid files={starredFiles} emptyMessage="No starred files yet." />
    </div>
  );
};

export default StarredView;

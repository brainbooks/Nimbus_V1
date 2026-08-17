import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";
import useDeviceType from "../../../hooks/useDeviceType";
import FileGrid from "../Features/FileGrid";
import UploadQueue from "../Features/UploadQueue";

const FilesView = () => {
  const { activeFiles } = useDashboard();
  const { deviceLabel, deviceIcon } = useDeviceType();
  return (
    <div className="drive-view nimbus-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title"><Icon icon={deviceIcon} className="view-title-icon" /> {deviceLabel} files</h1>
          <p className="view-subtitle">All files from your Telegram Saved Messages.</p>
        </div>
      </div>
      <UploadQueue />
      <FileGrid files={activeFiles} emptyMessage="No files in your cloud yet." applySearch />
    </div>
  );
};

export default FilesView;

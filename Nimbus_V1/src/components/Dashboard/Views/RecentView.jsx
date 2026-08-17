import { useMemo, useState } from "react";
import { useDashboard } from "../../../contexts/DashboardContext";
import FileGrid from "../Features/FileGrid";

const FILTER_OPTIONS = [
  { id: "24h", label: "Last 24 hours", ms: 86400000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 86400000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 86400000 },
  { id: "all", label: "All time", ms: Infinity },
];

const RecentView = () => {
  const { activeFiles } = useDashboard();
  const [activeFilter, setActiveFilter] = useState("30d");
  const [openedAt] = useState(() => Date.now());
  const filteredFiles = useMemo(() => {
    const period = FILTER_OPTIONS.find((option) => option.id === activeFilter)?.ms ?? Infinity;
    const cutoff = period === Infinity ? 0 : openedAt - period;
    return [...activeFiles]
      .filter((file) => new Date(file.uploadDate).getTime() >= cutoff)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  }, [activeFiles, activeFilter, openedAt]);

  return (
    <div className="drive-view nimbus-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Recent files</h1>
          <p className="view-subtitle">Your latest Telegram uploads, newest first.</p>
        </div>
      </div>
      <div className="filter-row" aria-label="Filter recent files">
        {FILTER_OPTIONS.map((option) => (
          <button key={option.id} className={`filter-chip ${activeFilter === option.id ? "active" : ""}`} onClick={() => setActiveFilter(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      <FileGrid files={filteredFiles} emptyMessage="No files were uploaded in this period." />
    </div>
  );
};

export default RecentView;

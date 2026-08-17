import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";

// ==================================================
// STORAGE VIEW — FULL STORAGE BREAKDOWN
// ==================================================

const StorageView = () => {
  const { storageData } = useDashboard();
  const { categories, totalBytes, totalFormatted } = storageData;

  // Calculate percentages
  const categoryData = categories.map((cat) => ({
    ...cat,
    percentage: totalBytes > 0 ? ((cat.bytes / totalBytes) * 100).toFixed(1) : 0,
  }));

  return (
    <div className="drive-view nimbus-fade-in">
      {/* Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Icon icon="lucide:hard-drive" className="w-7 h-7 text-cyan-400 inline mr-2" />
            Storage Overview
          </h1>
          <p className="view-subtitle">How your Telegram Saved Messages storage is used</p>
        </div>
      </div>

      {/* Total usage card */}
      <div className="storage-total-card glass-panel">
        <div className="storage-total-header">
          <span className="text-lg font-bold text-white">Total Used</span>
          <span className="text-2xl font-black text-cyan-400">{totalFormatted}</span>
        </div>
        {/* Segmented bar */}
        <div className="storage-total-bar">
          {categoryData.map((cat) => (
            <div
              key={cat.name}
              className="storage-total-bar-segment"
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
                minWidth: cat.percentage > 0 ? "4px" : "0",
              }}
              title={`${cat.name}: ${cat.size} (${cat.percentage}%)`}
            />
          ))}
        </div>
      </div>

      {/* Category cards */}
      <div className="storage-categories">
        {categoryData.map((cat) => (
          <div key={cat.name} className="storage-category-card glass-panel">
            <div className="storage-category-header">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <Icon
                    icon={
                      cat.name === "Images" ? "lucide:image" :
                      cat.name === "Videos" ? "lucide:film" :
                      cat.name === "Documents" ? "lucide:file-text" :
                      "lucide:file"
                    }
                    className="w-5 h-5"
                    style={{ color: cat.color }}
                  />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{cat.name}</div>
                  <div className="text-xs text-zinc-500">{cat.percentage}% of total</div>
                </div>
              </div>
              <span className="text-lg font-bold text-white">{cat.size}</span>
            </div>
            {/* Individual bar */}
            <div className="storage-category-bar">
              <div
                className="storage-category-bar-fill nimbus-bar-fill"
                style={{
                  width: `${cat.percentage}%`,
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="storage-info-note glass-panel">
        <Icon icon="lucide:info" className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400">
          Telegram provides unlimited cloud storage. This breakdown shows how your files are distributed by type in your Saved Messages.
        </p>
      </div>
    </div>
  );
};

export default StorageView;

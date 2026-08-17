import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../contexts/DashboardContext";
import { formatFileSize, sidebarItems } from "../../Data/utilityData";
import useDeviceType from "../../hooks/useDeviceType";
import CreateFolderDialog from "../Dashboard/Features/CreateFolderDialog";

const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    isCompact,
    mobileNavOpen,
    setMobileNavOpen,
    virtualFolders,
    storageData,
    createFolder,
    getFolderStats,
  } = useDashboard();
  const { deviceIcon, deviceLabel } = useDeviceType();
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const navigate = (tabId) => {
    setActiveTab(tabId);
    setMobileNavOpen(false);
  };

  return (
    <>
      {mobileNavOpen && (
        <button className="nimbus-sidebar-overlay active" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />
      )}
      <aside className={`sidebar-root ${isCompact ? "compact" : ""} ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-mobile-logo">
          <span className="sidebar-logo-icon"><Icon icon="lucide:cloud" /></span>
          {!isCompact && <strong>Nimbus<span>Drive</span></strong>}
          <button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><Icon icon="lucide:x" /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {sidebarItems.map((item) => {
            const icon = item.id === "files" ? deviceIcon : item.icon;
            const label = item.id === "files" ? deviceLabel : item.label;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
                title={isCompact ? label : undefined}
              >
                <Icon icon={icon} />
                {!isCompact && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        <section className="sidebar-section">
          {!isCompact && <p className="sidebar-section-title">Virtual folders</p>}
          <button className="sidebar-create-folder" onClick={() => setShowCreateFolder(true)} title="Create folder">
            <Icon icon="lucide:plus" />
            {!isCompact && <span>Create folder</span>}
          </button>
          <div className="sidebar-folders">
            {virtualFolders.map((folder) => {
              const stats = getFolderStats(folder.id);
              return (
                <div key={folder.id} className="sidebar-folder-group">
                  <button
                    className={`sidebar-folder-item ${activeTab === `folder:${folder.id}` ? "active" : ""}`}
                    onClick={() => navigate(`folder:${folder.id}`)}
                    title={isCompact ? folder.name : undefined}
                  >
                    <span className="sidebar-folder-dot" style={{ backgroundColor: folder.color || "var(--folder-1)" }} />
                    {!isCompact && <span className="sidebar-folder-name">{folder.name}</span>}
                  </button>
                  {!isCompact && <small>{stats.count} files · {formatFileSize(stats.totalSize)}</small>}
                </div>
              );
            })}
          </div>
        </section>

        <div className="sidebar-footer">
          {!isCompact && (
            <div className="autosync-placeholder" title="Folder watching requires a desktop companion app">
              <Icon icon="lucide:refresh-cw" />
              <div><strong>Auto-sync</strong><span>Coming soon</span></div>
            </div>
          )}
          <div className="sidebar-storage">
            <div className="sidebar-storage-heading">
              <Icon icon="lucide:hard-drive" />
              {!isCompact && <span>{storageData.totalFormatted} used</span>}
            </div>
            {!isCompact && (
              <div className="sidebar-storage-bar">
                {storageData.categories.map((category) => (
                  <span
                    key={category.name}
                    style={{
                      width: `${storageData.totalBytes ? (category.bytes / storageData.totalBytes) * 100 : 0}%`,
                      backgroundColor: category.color,
                    }}
                    title={`${category.name}: ${category.size}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {showCreateFolder && <CreateFolderDialog onClose={() => setShowCreateFolder(false)} onCreate={createFolder} />}
    </>
  );
};

export default Sidebar;

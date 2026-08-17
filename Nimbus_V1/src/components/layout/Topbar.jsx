import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../contexts/DashboardContext";
import Avatar from "../common/Avatar";
import SearchBar from "../Dashboard/Features/SearchBar";
import ProfilePopup from "../Dashboard/Features/ProfilePopup";

const Topbar = ({ onOpenSettings }) => {
  const {
    isCompact,
    toggleCompact,
    mobileNavOpen,
    setMobileNavOpen,
    profile,
    syncStatus,
    refreshFiles,
  } = useDashboard();
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  return (
    <header className="topbar-root">
      <button
        className="topbar-icon-btn mobile-menu"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Toggle navigation"
      >
        <Icon icon="lucide:menu" />
      </button>

      <div className="topbar-logo">
        <span><Icon icon="lucide:cloud" /></span>
        <strong>Nimbus<em>Drive</em></strong>
      </div>

      <button className="topbar-icon-btn desktop-compact" onClick={toggleCompact} aria-label="Toggle compact sidebar">
        <Icon icon={isCompact ? "lucide:panel-left-open" : "lucide:panel-left-close"} />
      </button>

      <div className="topbar-search"><SearchBar /></div>

      <div className="topbar-actions">
        <button
          type="button"
          className={`sync-indicator ${syncStatus}`}
          onClick={syncStatus === "error" ? refreshFiles : undefined}
          title={syncStatus === "error" ? "Sync failed — click to retry" : syncStatus === "syncing" ? "Syncing with Telegram" : "Synced with Telegram"}
          aria-label={`Telegram sync: ${syncStatus}`}
        >
          <Icon icon={syncStatus === "error" ? "lucide:cloud-off" : syncStatus === "syncing" ? "lucide:cloud-cog" : "lucide:cloud-check"} />
          <span>{syncStatus === "error" ? "Retry sync" : syncStatus === "syncing" ? "Syncing" : "Synced"}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="topbar-icon-btn"
          aria-label="Settings"
          title={onOpenSettings ? "Settings" : "Settings"}
        >
          <Icon icon="lucide:settings" />
        </button>
        <div className="topbar-profile">
          <button className="topbar-profile-btn" onClick={() => setShowProfilePopup((open) => !open)}>
            <Avatar src={profile.avatar} name={profile.name} size="md" />
            <span>{profile.name}</span>
            <Icon icon="lucide:chevron-down" />
          </button>
          {showProfilePopup && (
            <ProfilePopup profile={profile} onClose={() => setShowProfilePopup(false)} onOpenSettings={onOpenSettings} />
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

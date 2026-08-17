import { useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import TelegramService from "../../../services/TelegramService";
import Avatar from "../../common/Avatar";

// ==================================================
// PROFILE POPUP — DROPDOWN MENU
// ==================================================

const ProfilePopup = ({ profile, onClose, onOpenSettings }) => {
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const handleSignOut = async () => {
    try {
      await TelegramService.logout();
    } catch {
      // Ignore errors
    }
    navigate("/");
  };

  return (
    <div ref={popoverRef} className="nimbus-popover profile-popup">
      {/* User info header */}
      <div className="profile-popup-header">
        <Avatar src={profile.avatar} name={profile.name} size="lg" />
        <div className="min-w-0">
          <div className="font-semibold text-white text-sm truncate">
            {profile.name}
          </div>
          <div className="text-xs text-zinc-400 truncate">
            {profile.title}
          </div>
        </div>
      </div>

      <div className="context-menu-divider" />

      {/* Menu items */}
      <button className="context-menu-item" onClick={() => { onClose(); }}>
        <Icon icon="lucide:user" className="w-4 h-4" />
        <span>Your Profile</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => {
          onClose();
          if (onOpenSettings) onOpenSettings();
        }}
      >
        <Icon icon="lucide:settings" className="w-4 h-4" />
        <span>Settings</span>
      </button>

      <div className="context-menu-divider" />

      <button className="context-menu-item danger" onClick={handleSignOut}>
        <Icon icon="lucide:log-out" className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );
};

export default ProfilePopup;

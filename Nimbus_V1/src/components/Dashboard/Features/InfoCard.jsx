import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";

const InfoCard = () => {
  const { profile, activeFiles, virtualFolders, allTags, storageData } = useDashboard();
  const stats = [
    { label: "Files", value: activeFiles.length, icon: "lucide:files" },
    { label: "Folders", value: virtualFolders.length, icon: "lucide:folder-tree" },
    { label: "Tags", value: allTags.length, icon: "lucide:tags" },
    { label: "Used", value: storageData.totalFormatted, icon: "lucide:hard-drive" },
  ];

  return (
    <section className="drive-info-card" aria-labelledby="dashboard-welcome">
      <div className="drive-info-copy">
        <p className="drive-eyebrow">Your cloud workspace</p>
        <h1 id="dashboard-welcome">Welcome back, {profile.name?.split(" ")[0] || "User"}</h1>
        <p>Everything in your Telegram cloud, organised with folders, tags, and stars.</p>
      </div>
      <div className="drive-info-stats">
        {stats.map((stat) => (
          <div className="drive-stat" key={stat.label}>
            <Icon icon={stat.icon} />
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InfoCard;

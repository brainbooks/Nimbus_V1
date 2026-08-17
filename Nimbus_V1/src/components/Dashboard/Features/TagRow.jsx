import { useDashboard } from "../../../contexts/DashboardContext";

const TagRow = () => {
  const { allTags, searchQuery, setSearchQuery, setActiveTab } = useDashboard();
  if (!allTags.length) return null;
  const activeTag = searchQuery.trim().startsWith("#") ? searchQuery.trim().slice(1).toLowerCase() : null;

  return (
    <section className="drive-tag-row" aria-label="Filter by tag">
      <span>Tags</span>
      {allTags.map((tag) => (
        <button
          key={tag}
          className={activeTag === tag.toLowerCase() ? "active" : ""}
          onClick={() => {
            setSearchQuery(activeTag === tag.toLowerCase() ? "" : `#${tag}`);
            setActiveTab("home");
          }}
        >
          #{tag}
        </button>
      ))}
    </section>
  );
};

export default TagRow;

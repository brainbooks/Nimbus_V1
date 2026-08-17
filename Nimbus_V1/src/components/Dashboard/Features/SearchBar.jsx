import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";

// ==================================================
// SEARCH BAR — KEYWORD + HASHTAG SEARCH
// ==================================================

const SearchBar = () => {
  const { searchQuery, setSearchQuery, allTags, setActiveTab } = useDashboard();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Show tag suggestions when # is typed
    if (value.includes("#")) {
      setShowSuggestions(true);
    }

    // Navigate to home when searching
    if (value.trim()) {
      setActiveTab("home");
    }
  }, [setSearchQuery, setActiveTab]);

  const handleTagClick = (tag) => {
    // Append or replace the hashtag in the search
    const parts = searchQuery.split(/\s+/);
    const lastPart = parts[parts.length - 1];

    if (lastPart.startsWith("#")) {
      parts[parts.length - 1] = `#${tag}`;
    } else {
      parts.push(`#${tag}`);
    }

    setSearchQuery(parts.join(" ").trim() + " ");
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Get the partial tag being typed
  const currentHashPart = searchQuery.split(/\s+/).find((p) => p.startsWith("#"));
  const partialTag = currentHashPart ? currentHashPart.slice(1).toLowerCase() : "";

  const suggestions = allTags.filter(
    (t) => !partialTag || t.toLowerCase().includes(partialTag)
  );

  return (
    <div ref={containerRef} className="search-bar-container">
      <div className={`search-bar ${isFocused ? "focused" : ""}`}>
        <Icon icon="lucide:search" className="search-bar-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search files, use #tags..."
          value={searchQuery}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            if (searchQuery.includes("#")) setShowSuggestions(true);
          }}
          className="search-bar-input"
        />
        {searchQuery && (
          <button onClick={clearSearch} className="search-bar-clear">
            <Icon icon="lucide:x" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tag suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions nimbus-popover">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">
            Tags
          </div>
          {suggestions.slice(0, 8).map((tag) => (
            <button
              key={tag}
              className="search-suggestion-item"
              onClick={() => handleTagClick(tag)}
            >
              <Icon icon="lucide:hash" className="w-3.5 h-3.5 text-cyan-400" />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

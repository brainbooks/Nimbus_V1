import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useDashboard } from "../../../contexts/DashboardContext";

// ==================================================
// TAG EDITOR — POPUP FOR MANAGING FILE TAGS
// ==================================================

const TagEditor = ({ fileId, onClose }) => {
  const { tags, allTags, addTag, removeTag } = useDashboard();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  const fileTags = tags[fileId] || [];

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

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

  const handleAddTag = (tagName) => {
    const tag = tagName || inputValue;
    if (tag.trim()) {
      addTag(fileId, tag.trim());
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Suggestions: tags not already on this file
  const suggestions = allTags
    .filter((t) => !fileTags.includes(t))
    .filter((t) => !inputValue || t.includes(inputValue.toLowerCase()));

  return (
    <div ref={popoverRef} className="nimbus-popover tag-editor">
      <div className="tag-editor-header">
        <span className="text-sm font-semibold text-zinc-200">Manage Tags</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Icon icon="lucide:x" className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Current tags */}
      <div className="tag-editor-tags">
        {fileTags.length === 0 && (
          <span className="text-xs text-zinc-500 italic">No tags yet</span>
        )}
        {fileTags.map((tag) => (
          <span key={tag} className="tag-pill">
            <span className="text-cyan-400">#</span>
            {tag}
            <button
              onClick={() => removeTag(fileId, tag)}
              className="tag-pill-remove"
            >
              <Icon icon="lucide:x" className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="tag-editor-input-row">
        <Icon icon="lucide:hash" className="w-4 h-4 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a tag..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          className="tag-editor-input"
        />
        {inputValue && (
          <button
            onClick={() => handleAddTag()}
            className="tag-editor-add-btn"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions */}
      {(showSuggestions || !inputValue) && suggestions.length > 0 && (
        <div className="tag-editor-suggestions">
          <span className="tag-suggestions-label">Suggestions</span>
          {suggestions.slice(0, 6).map((tag) => (
            <button
              key={tag}
              className="tag-suggestion"
              onClick={() => handleAddTag(tag)}
            >
              <span className="text-cyan-400">#</span>{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagEditor;

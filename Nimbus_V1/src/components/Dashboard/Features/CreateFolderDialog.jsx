import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

const CreateFolderDialog = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    onClose();
  };

  return (
    <div className="dialog-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="create-folder-dialog nimbus-scale-in" role="dialog" aria-modal="true" aria-labelledby="create-folder-title">
        <header className="dialog-header">
          <span className="dialog-icon"><Icon icon="lucide:folder-plus" /></span>
          <div>
            <h2 id="create-folder-title">Create a virtual folder</h2>
            <p>Give it a name. Nimbus will assign a colour automatically.</p>
          </div>
          <button onClick={onClose} aria-label="Close"><Icon icon="lucide:x" /></button>
        </header>
        <label className="dialog-field">
          <span>Folder name</span>
          <input
            ref={inputRef}
            value={name}
            maxLength={50}
            placeholder="e.g. Work documents"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleCreate()}
          />
        </label>
        <footer className="dialog-actions">
          <button className="drive-secondary-button" onClick={onClose}>Cancel</button>
          <button className="drive-primary-button" onClick={handleCreate} disabled={!name.trim()}>Create folder</button>
        </footer>
      </section>
    </div>
  );
};

export default CreateFolderDialog;

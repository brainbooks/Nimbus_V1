import React from 'react';
import { Icon } from '@iconify/react';

const VirtualFolders = () => {
  const folders = [
    { id: 1, name: 'Frontend', files: 12, size: '25 MB', color: '#3b82f6' },
    { id: 2, name: 'Resume', files: 3, size: '1 MB', color: '#10b981' },
    { id: 3, name: 'Design Assets', files: 45, size: '1.2 GB', color: '#f59e0b' },
    { id: 4, name: 'Archived', files: 120, size: '5 GB', color: '#6366f1' },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-zinc-200">Virtual Folders</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {folders.map(folder => (
          <div key={folder.id} className="glass-panel p-4 flex flex-col gap-3 cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="flex justify-between items-start">
              <div className="p-2 rounded-xl" style={{ backgroundColor: `${folder.color}20` }}>
                <Icon icon="lucide:folder" width="24" height="24" style={{ color: folder.color }} />
              </div>
              <button className="text-zinc-500 hover:text-white transition-colors">
                <Icon icon="lucide:more-vertical" width="20" height="20" />
              </button>
            </div>
            <div>
              <div className="font-semibold text-white">{folder.name}</div>
              <div className="text-xs text-zinc-400 mt-1">{folder.files} files • {folder.size}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualFolders;

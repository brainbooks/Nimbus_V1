import React from 'react';
import { Icon } from '@iconify/react';

const DuplicateFinder = () => {
  const duplicates = [
    { id: 1, original: 'image.png', dupes: ['image (1).png', 'image copy.png'], size: '4 MB' },
    { id: 2, original: 'report_final.pdf', dupes: ['report_final_v2.pdf'], size: '12 MB' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
          <Icon icon="lucide:copy" className="text-blue-500" />
          Duplicate Finder
        </h2>
        <button className="text-sm text-blue-400 hover:text-blue-300">Scan again</button>
      </div>

      <div className="space-y-4">
        {duplicates.map(group => (
          <div key={group.id} className="glass-panel p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="lucide:file" className="text-zinc-400" />
                <span className="font-medium text-white">{group.original}</span>
                <span className="text-xs text-zinc-500">{group.size}</span>
              </div>
              <button className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors">
                Keep Original & Delete Dupes
              </button>
            </div>
            
            <div className="pl-8 space-y-2 border-l-2 border-white/5 ml-2">
              {group.dupes.map(dupe => (
                <div key={dupe} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{dupe}</span>
                  <button className="text-red-400 hover:text-red-300 flex items-center gap-1">
                    <Icon icon="lucide:trash-2" width="14" /> Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuplicateFinder;

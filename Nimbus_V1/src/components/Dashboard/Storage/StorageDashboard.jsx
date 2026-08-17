import React from 'react';

const StorageDashboard = () => {
  const storageData = [
    { label: 'Videos', size: '53 GB', color: '#3b82f6', percentage: 50 },
    { label: 'Images', size: '18 GB', color: '#10b981', percentage: 17 },
    { label: 'Documents', size: '5 GB', color: '#f59e0b', percentage: 5 },
    { label: 'Music', size: '29 GB', color: '#8b5cf6', percentage: 28 },
  ];

  return (
    <div className="storage-overview glass-panel">
      <div className="text-sm font-semibold mb-2">Storage Overview</div>
      <div className="storage-bar-container">
        {storageData.map(item => (
          <div 
            key={item.label}
            className="storage-bar-segment"
            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
            title={`${item.label}: ${item.size}`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {storageData.map(item => (
          <div key={item.label} className="storage-stats">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
            <span className="font-medium text-zinc-300">{item.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorageDashboard;

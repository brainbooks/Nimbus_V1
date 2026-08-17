import React from 'react';
import { DashboardProvider, useDashboard } from '../contexts/DashboardContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import HomeView from '../components/Dashboard/Views/HomeView';
import RecentView from '../components/Dashboard/Views/RecentView';
import StarredView from '../components/Dashboard/Views/StarredView';
import TrashView from '../components/Dashboard/Views/TrashView';
import FolderView from '../components/Dashboard/Views/FolderView';
import StorageView from '../components/Dashboard/Views/StorageView';
import FilesView from '../components/Dashboard/Views/FilesView';
import '../styles/dashboard.css';

const MainContent = () => {
  const { activeTab, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-zinc-400 font-medium">Loading your cloud...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 p-8 glass-panel border-red-500/20 text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-2">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-white">Connection Error</h3>
          <p className="text-zinc-400">{error}</p>
          <button 
            className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === "home") return <HomeView />;
  if (activeTab === "recent") return <RecentView />;
  if (activeTab === "starred") return <StarredView />;
  if (activeTab === "trash") return <TrashView />;
  if (activeTab === "storage") return <StorageView />;
  if (activeTab === "files") return <FilesView />;
  if (activeTab.startsWith("folder:")) {
    const folderId = activeTab.split(":")[1];
    return <FolderView folderId={folderId} />;
  }

  return <HomeView />; // Fallback
};

const Dashboard = () => {
  return (
    <DashboardProvider>
      <DashboardLayout>
        <MainContent />
      </DashboardLayout>
    </DashboardProvider>
  );
};

export default Dashboard;

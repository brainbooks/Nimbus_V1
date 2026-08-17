import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

const MediaViewer = ({ file, onClose }) => {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderViewer = () => {
    switch (file.type) {
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img 
              src={file.url} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        );
        
      case 'video':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <video 
              src={file.url} 
              controls 
              autoPlay 
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />
          </div>
        );
      
      case 'music':
      case 'audio':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md p-8 glass-panel flex flex-col items-center mx-auto shadow-2xl rounded-2xl">
              <div className="w-32 h-32 rounded-full bg-linear-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mb-8">
                <Icon icon="lucide:music" className="text-white w-12 h-12" />
              </div>
              <h2 className="text-xl font-bold text-white text-center w-full truncate mb-6">{file.name}</h2>
              <audio 
                src={file.url} 
                controls 
                autoPlay 
                className="w-full"
              />
            </div>
          </div>
        );

      case 'pdf':
      case 'document':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <Icon icon="lucide:file-text" className="text-zinc-600 w-32 h-32 mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">{file.name}</h2>
            <p className="text-zinc-400 mb-8">Preview not available for this document type.</p>
            <a 
              href={file.url} 
              download={file.name + (file.extension || '')}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Download File
            </a>
          </div>
        );

      case 'archive':
      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <Icon icon="lucide:file" className="text-zinc-600 w-32 h-32 mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">{file.name}</h2>
            <p className="text-zinc-400 mb-8">No preview available for this file.</p>
            <a 
              href={file.url} 
              download={file.name + (file.extension || '')}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col"
      >
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/50">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium text-lg truncate max-w-md">{file.name}</span>
            <span className="text-xs text-zinc-400 bg-white/10 px-2 py-1 rounded-md shrink-0">{formatFileSize(file.size)}</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Share/Copy link */}
            <div className="relative">
              <button 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${copied ? 'bg-green-500/20 text-green-400' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`} 
                onClick={handleCopyLink}
                title="Copy Link"
              >
                <Icon icon={copied ? "lucide:check" : "lucide:link"} width="18" height="18" />
                <span className="text-sm font-medium">{copied ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
            
            <a 
              href={file.url} 
              download={file.name + (file.extension || '')}
              className="text-zinc-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors" 
              title="Download"
            >
              <Icon icon="lucide:download" width="20" height="20" />
            </a>
            
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            
            <button 
              className="text-zinc-400 hover:text-white hover:bg-red-500/20 p-2 rounded-lg transition-colors" 
              onClick={onClose}
              title="Close"
            >
              <Icon icon="lucide:x" width="24" height="24" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative group">
          {renderViewer()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper for formatting sizes inside MediaViewer without depending on external context
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default MediaViewer;

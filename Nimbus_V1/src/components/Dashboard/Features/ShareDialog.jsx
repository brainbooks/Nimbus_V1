import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

const ShareDialog = ({ file, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState('Public');

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://nimbus.app/share/${file.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Share "{file.name}"</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <Icon icon="lucide:x" width="24" height="24" />
            </button>
          </div>

          <div className="mb-6 space-y-3">
            {['Public', 'Private', 'Password Protected', 'One-time download'].map(option => (
              <label key={option} className="flex items-center gap-3 p-3 border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <input 
                  type="radio" 
                  name="access" 
                  value={option} 
                  checked={access === option}
                  onChange={(e) => setAccess(e.target.value)}
                  className="w-4 h-4 text-blue-500 bg-black border-white/20 focus:ring-blue-500 focus:ring-offset-black"
                />
                <span className="text-sm font-medium text-zinc-200">{option}</span>
              </label>
            ))}
          </div>

          {access === 'Password Protected' && (
            <input type="password" placeholder="Enter password" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white mb-6 focus:border-blue-500 outline-none" />
          )}

          <div className="flex gap-2">
            <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-400 truncate flex items-center">
              https://nimbus.app/share/{file.id}
            </div>
            <button 
              onClick={handleCopy}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Icon icon={copied ? "lucide:check" : "lucide:copy"} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareDialog;

import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: React.ReactNode;
  onClose: () => void;
  icon?: string;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, icon = 'notifications_active' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-full transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-[#1a1d24] border border-[#2a2d34] rounded-xl shadow-2xl shadow-black/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-amber-400 text-xl">{icon}</span>
          </div>
          <div className="flex-1 min-w-0 text-sm text-gray-300 leading-relaxed">
            {message}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;

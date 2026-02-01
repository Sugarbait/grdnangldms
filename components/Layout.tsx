
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: 'dashboard' },
    { id: 'vault', path: '/vault', label: 'Vault', icon: 'lock' },
    { id: 'recipients', path: '/recipients', label: 'Recipients', icon: 'group' },
    { id: 'settings', path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const showNav = !['/upload', '/add-recipient'].includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-background-dark max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-800">
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer Links */}
        <footer className="py-10 px-6 mt-auto border-t border-gray-900 bg-surface-darker/50">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Rules</Link>
            </div>
            <p className="text-[9px] text-gray-700 uppercase tracking-widest text-center">
              &copy; 2025 Guardian Angel DMS. Built for your peace of mind.
            </p>
          </div>
        </footer>
      </main>

      {showNav && (
        <nav className="fixed bottom-0 z-50 w-full max-w-md bg-surface-dark border-t border-gray-800 pb-safe pt-2">
          <div className="flex justify-around items-center px-2 h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                  isActive(item.path) ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive(item.path) ? 'filled' : ''}`}
                  style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;

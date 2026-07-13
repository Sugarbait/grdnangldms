import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserProfile } from '../App';
import { SessionTimer } from './SessionTimer';
import { APP_VERSION } from '../version';

interface LayoutProps {
  children: React.ReactNode;
  canAccessFeatures?: boolean;
  isTrialUser?: boolean;
  trialEndsAt?: number;
  userTier?: string;
  currentUser?: UserProfile | null;
  sessionTimeRemaining?: number;
  getSessionTimeRemaining?: () => number;
  onSessionTimeout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  canAccessFeatures,
  isTrialUser,
  trialEndsAt,
  userTier,
  currentUser,
  getSessionTimeRemaining,
  onSessionTimeout
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const navItems = [
    { id: 'dashboard', path: '/', label: 'Overview', icon: 'space_dashboard' },
    { id: 'vault', path: '/vault', label: 'Vault', icon: 'lock' },
    { id: 'recipients', path: '/recipients', label: 'Recipients', icon: 'group' },
    { id: 'subscription', path: '/pricing', label: 'Plan', icon: 'credit_card' },
    { id: 'settings', path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const showNav = true;
  const showMobileNav = !['/upload', '/add-recipient'].includes(location.pathname);

  return (
    <div className="ga-shell flex h-screen bg-background-dark overflow-hidden">

      {/* ── Desktop Sidebar (md and above) ── */}
      {showNav && (
        <nav className="ga-sidebar hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-surface-dark border-r border-gray-800 z-50 p-3">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center justify-start px-3 py-4 hover:opacity-85 transition-opacity">
            <img
              src="/images/New-GrdnAngl-Logo.png"
              alt="Guardian Angel DMS"
              className="w-full max-w-[215px] h-auto object-contain"
            />
          </button>

          {/* Profile */}
          {currentUser && (
            <button
              onClick={() => navigate('/settings')}
              className="ga-profile-card flex items-center gap-3 px-3 py-3 mt-2 hover:bg-white/[0.035] transition-colors w-full text-left"
            >
              <div className="size-9 rounded-xl bg-surface-darker flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} className="h-full w-full object-cover" alt="" />
                ) : (
                  <span className="text-[10px] font-black text-primary uppercase">{getInitials(currentUser.name)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{currentUser.email}</p>
              </div>
            </button>
          )}

          {/* Nav items */}
          <div className="flex-1 py-5 px-2 overflow-visible space-y-1">
            <p className="px-1 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-600">Workspace</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`ga-nav-item relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all text-left ${
                  isActive(item.path)
                    ? 'ga-nav-item-active text-primary bg-primary/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span
                  className="ga-nav-icon material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {!canAccessFeatures && item.id === 'subscription' && (
                  <div className="ml-auto size-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Session Timer - Desktop only */}
          {getSessionTimeRemaining && onSessionTimeout && (
            <div className="px-3 py-3 border-t border-white/[0.06]">
              <SessionTimer
                getTimeRemaining={getSessionTimeRemaining}
                onLogout={onSessionTimeout}
              />
            </div>
          )}

          {/* Sidebar footer */}
          <div className="px-3 py-4 border-t border-white/[0.06] flex flex-col gap-2">
            <div className="flex gap-4 text-[10px] font-semibold text-gray-600">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            </div>
            <p className="text-[9px] text-gray-700">
              &copy; 2026 Guardian Angel DMS
            </p>
            <p className="text-[8px] text-gray-600 pt-2 border-t border-white/[0.05]">
              v{APP_VERSION}
            </p>
          </div>
        </nav>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden md:ml-64">
        <div className={`ga-content-scroll flex-1 overflow-y-auto ${showMobileNav ? 'pb-32' : 'pb-0'} md:pb-0 no-scrollbar flex flex-col`}>
          {/* Content wrapper — constrained width on desktop so it doesn't stretch */}
          <div className="ga-content w-full md:max-w-3xl md:mx-auto px-4 md:px-8">
            {children}
          </div>

          {/* Footer — mobile only; desktop has it in the sidebar */}
          <footer className="py-10 px-6 mt-auto border-t border-white/[0.05] bg-surface-darker/30 md:hidden">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-6 text-[10px] font-semibold text-gray-500">
                <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Rules</Link>
              </div>
              <p className="text-[9px] text-gray-700 uppercase tracking-widest text-center">
                &copy; 2026 Guardian Angel DMS. Built for your peace of mind.
              </p>
              <p className="text-[8px] text-gray-600 uppercase tracking-widest pt-2 border-t border-gray-800">
                v{APP_VERSION}
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* ── Mobile Bottom Nav (below md) ── */}
      {showMobileNav && (
        <nav className="ga-mobile-nav md:hidden fixed bottom-0 z-50 w-full bg-surface-dark border-t border-gray-800 pb-safe">
          {/* Session Timer in mobile nav */}
          {getSessionTimeRemaining && onSessionTimeout && (
            <div className="px-4 py-2 border-t border-gray-800 bg-surface-dark/50">
              <SessionTimer
                getTimeRemaining={getSessionTimeRemaining}
                onLogout={onSessionTimeout}
              />
            </div>
          )}
          
          {/* Nav items */}
          <div className="flex justify-around items-center p-1.5 h-16">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                  isActive(item.path) ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="text-[9px] font-medium">{item.label}</span>
                {!canAccessFeatures && item.id === 'subscription' && (
                  <div className="absolute top-1 right-1/4 size-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </nav>
      )}

    </div>
  );
};

export default Layout;

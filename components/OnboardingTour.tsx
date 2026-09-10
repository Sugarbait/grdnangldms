import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';

interface TourStep {
  target: string;
  route: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'dashboard-timer',
    route: '/',
    title: 'Your check-in timer',
    description: "This countdown shows exactly when your protocol will activate if you don't check in.",
  },
  {
    target: 'dashboard-checkin-button',
    route: '/',
    title: 'Tap "I\'m Safe" to reset it',
    description: "Confirm you're okay anytime and the countdown starts over from the beginning.",
  },
  {
    target: 'nav-list',
    route: '/',
    title: 'Explore your sidebar',
    description: 'Add items to your Vault and manage trusted Recipients from here.',
  },
  {
    target: 'settings-checkin-window',
    route: '/settings',
    title: 'Set your check-in window',
    description: 'Control exactly how long you have between check-ins — from minutes to months.',
  },
  {
    target: 'settings-reminders',
    route: '/settings',
    title: 'Never miss a check-in',
    description: 'Turn on reminder emails before your window closes.',
  },
  {
    target: 'settings-restart-tour',
    route: '/settings',
    title: "That's the tour",
    description: 'Come back to this button anytime to see it again.',
  },
];

const STORAGE_KEY_PREFIX = 'guardian_tour_dismissed_';

// Scoped per user id — otherwise one account dismissing the tour on a shared
// browser would silently block it for every other account signed in later.
function getStorageKey(): string {
  const userId = localStorage.getItem('guardian_user_id') || 'anon';
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourContextValue {
  start: () => void;
}

const TourContext = createContext<TourContextValue>({ start: () => {} });

export const useTour = () => useContext(TourContext);

function getVisibleElement(tourId: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(`[data-tour-id="${tourId}"]`);
  for (const el of Array.from(matches)) {
    if (el.offsetParent !== null) return el;
  }
  return matches[0] || null;
}

function tooltipPosition(rect: Rect): React.CSSProperties {
  if (window.innerWidth < 640) {
    return {
      left: 12,
      right: 12,
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      top: 'auto',
    };
  }
  const width = 320;
  const estHeight = 190;
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const top = spaceBelow > estHeight + 24
    ? rect.top + rect.height + 16
    : Math.max(16, rect.top - estHeight - 16);
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(16, Math.min(left, window.innerWidth - width - 16));
  return { top, left };
}

interface TourProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, enabled }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const hasAutoStarted = useRef(false);

  const step = TOUR_STEPS[stepIndex];

  const measure = useCallback(() => {
    if (!step) return;
    const el = getVisibleElement(step.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  const dismiss = useCallback(() => {
    localStorage.setItem(getStorageKey(), 'true');
    setActive(false);
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    localStorage.removeItem(getStorageKey());
    setStepIndex(0);
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active || !step) return;
    if (location.pathname !== step.route) {
      setVisible(false);
      navigate(step.route);
      return;
    }

    setVisible(false);
    let cancelled = false;
    const tryMeasure = (attempt = 0) => {
      if (cancelled) return;
      const el = getVisibleElement(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (cancelled) return;
          measure();
          setVisible(true);
        }, 320);
      } else if (attempt < 20) {
        setTimeout(() => tryMeasure(attempt + 1), 100);
      }
    };
    tryMeasure();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, location.pathname]);

  useEffect(() => {
    if (!active) return;
    const onReposition = () => measure();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, dismiss]);

  useEffect(() => {
    if (hasAutoStarted.current || !enabled) return;
    if (localStorage.getItem(getStorageKey())) return;
    hasAutoStarted.current = true;
    const timer = setTimeout(() => {
      setStepIndex(0);
      setActive(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [enabled]);

  const next = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) { dismiss(); return; }
    setStepIndex((i) => i + 1);
  };

  const back = () => {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  };

  return (
    <TourContext.Provider value={{ start }}>
      {children}
      {active && rect && createPortal(
        <div className="fixed inset-0 z-[200] pointer-events-none">
          <div
            className={`absolute rounded-2xl transition-all duration-300 ease-out shadow-[0_0_0_9999px_rgba(10,13,20,0.78),0_0_0_2px_rgba(113,129,255,0.9),0_0_28px_rgba(113,129,255,0.35)] ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={{
              top: rect.top - 8,
              left: rect.left - 8,
              width: rect.width + 16,
              height: rect.height + 16,
            }}
          />
          <div
            className={`fixed z-[201] w-[calc(100vw-24px)] sm:w-80 max-w-sm bg-surface-dark border border-white/10 rounded-2xl shadow-2xl p-5 pointer-events-auto transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={tooltipPosition(rect)}
            role="dialog"
            aria-live="polite"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-[11px] font-semibold text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.08em] mb-2">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </p>
            <h3 className="text-base font-semibold tracking-tight text-white mb-1.5 pr-16">{step.title}</h3>
            <p className="text-[13px] text-gray-400 leading-relaxed mb-4">{step.description}</p>
            <div className="flex items-center justify-between">
              <button
                onClick={back}
                disabled={stepIndex === 0}
                className="text-xs font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                Back
              </button>
              <button
                onClick={next}
                className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
              >
                {stepIndex === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </TourContext.Provider>
  );
};

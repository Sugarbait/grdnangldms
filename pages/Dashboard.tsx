
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../App';
import { InfoTooltip } from '../components/InfoTooltip';

interface DashboardProps {
  timerSeconds: number;
  onCheckIn: () => void;
  fileCount: number;
  recipientCount: number;
  currentUser: UserProfile;
  canAccessFeatures: boolean;
  isTrialUser: boolean;
  trialEndsAt: number;
  subscriptionStatus: string;
  userTier: string;
}

const Dashboard: React.FC<DashboardProps> = ({ timerSeconds, onCheckIn, fileCount, recipientCount, currentUser, canAccessFeatures, isTrialUser, trialEndsAt, subscriptionStatus, userTier }) => {
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationClosing, setCelebrationClosing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const [trialRemaining, setTrialRemaining] = useState('');

  // Live trial countdown
  useEffect(() => {
    if (!isTrialUser || !trialEndsAt) return;
    const update = () => {
      const remaining = Math.max(0, trialEndsAt - Date.now());
      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTrialRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [isTrialUser, trialEndsAt]);

  const isExpired = userTier === 'expired' || userTier === 'guest';

  const days = Math.floor(timerSeconds / 86400);
  const hours = Math.floor((timerSeconds % 86400) / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const formatNum = (num: number) => num.toString().padStart(2, '0');

  const dismissCelebration = () => {
    if (celebrationClosing) return;
    setCelebrationClosing(true);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setShowCelebration(false);
      setCelebrationClosing(false);
    }, 400);
  };

  const handleCheckInClick = () => {
    onCheckIn();
    setCelebrationClosing(false);
    setShowCelebration(true);

    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    dismissTimeoutRef.current = setTimeout(() => {
      dismissCelebration();
    }, 3400);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    if (!showCelebration || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = window.devicePixelRatio || 1;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    setCanvasSize();

    const colors = ['#54d6a0', '#7181ff', '#818cf8', '#60a5fa', '#ffd166', '#ffffff'];

    // 1. Expanding shockwave ring
    let shockwaveRadius = 15;
    let shockwaveAlpha = 0.85;

    // 2. Confetti ribbons
    interface Ribbon {
      x: number;
      y: number;
      vx: number;
      vy: number;
      width: number;
      height: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      oscillation: number;
      oscillationSpeed: number;
      alpha: number;
      decay: number;
    }

    const ribbons: Ribbon[] = [];
    const ribbonCount = 50;
    for (let i = 0; i < ribbonCount; i++) {
      const angle = (Math.PI * 2 * i) / ribbonCount + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 7 + 4;
      ribbons.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 20,
        vx: Math.cos(angle) * speed * (Math.random() * 0.8 + 0.6),
        vy: Math.sin(angle) * speed - (Math.random() * 4 + 2),
        width: Math.random() * 5 + 4,
        height: Math.random() * 11 + 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.12,
        oscillation: Math.random() * Math.PI * 2,
        oscillationSpeed: Math.random() * 0.05 + 0.02,
        alpha: 1,
        decay: Math.random() * 0.005 + 0.003,
      });
    }

    // 3. Starlight sparks & glowing embers
    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      twinkleSpeed: number;
    }

    const sparks: Spark[] = [];
    const sparkCount = 65;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 3;
      sparks.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        size: Math.random() * 3 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.01 + 0.007,
        twinkleSpeed: Math.random() * 0.2 + 0.05,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw Shockwave
      if (shockwaveAlpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(window.innerWidth / 2, window.innerHeight / 2 - 20, shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(84, 214, 160, ${shockwaveAlpha * 0.6})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        shockwaveRadius += (380 - shockwaveRadius) * 0.08 + 2;
        shockwaveAlpha -= 0.025;
      }

      // Update & Draw Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.vy += 0.06;
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const flicker = Math.sin(Date.now() * s.twinkleSpeed) * 0.25 + 0.75;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha * flicker);
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update & Draw Confetti Ribbons
      for (let i = ribbons.length - 1; i >= 0; i--) {
        const r = ribbons[i];
        r.vx *= 0.97;
        r.vy = (r.vy + 0.12) * 0.98;
        r.oscillation += r.oscillationSpeed;
        r.x += r.vx + Math.sin(r.oscillation) * 1.2;
        r.y += r.vy;
        r.rotation += r.rotationSpeed;
        r.alpha -= r.decay;

        if (r.alpha <= 0 || r.y > window.innerHeight + 50) {
          ribbons.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rotation);
        const scaleX = Math.cos(r.oscillation * 2);
        ctx.scale(scaleX, 1);
        ctx.fillStyle = r.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = r.color;
        ctx.beginPath();
        ctx.roundRect(-r.width / 2, -r.height / 2, r.width, r.height, 2);
        ctx.fill();
        ctx.restore();
      }

      if (sparks.length > 0 || ribbons.length > 0 || shockwaveAlpha > 0) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();
    window.addEventListener('resize', setCanvasSize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [showCelebration]);

  return (
    <div className="ga-dashboard flex flex-col gap-6 px-1 sm:px-3 py-6 md:py-10 animate-in fade-in duration-700 relative min-h-screen overflow-hidden">
      {showCelebration && createPortal(
        <div
          onClick={dismissCelebration}
          className={`fixed inset-0 w-screen h-[100dvh] z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden transition-all duration-400 ease-out cursor-pointer ${
            celebrationClosing ? 'celebration-overlay-exit' : 'celebration-overlay-enter'
          }`}
        >
          {/* Particles canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Elegant Confirmation Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 max-w-md w-full rounded-3xl bg-[#0f1422]/95 backdrop-blur-2xl border border-white/15 p-8 sm:p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_60px_rgba(113,129,255,0.22)] transition-all duration-400 ease-out ${
              celebrationClosing ? 'celebration-card-exit' : 'celebration-card-enter'
            }`}
          >
            {/* Glowing Shield & Heart Emblem */}
            <div className="relative mx-auto mb-5 size-20 sm:size-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl animate-pulse pointer-events-none"></div>
              <div className="absolute -inset-2 rounded-full border border-emerald-400/20 animate-ping opacity-40 pointer-events-none"></div>

              <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-primary/15 to-surface-dark border border-emerald-400/40 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
                <span className="material-symbols-outlined text-emerald-400 text-3xl sm:text-4xl drop-shadow-[0_0_16px_rgba(52,211,153,0.8)]">
                  verified_user
                </span>
              </div>
            </div>

            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold tracking-wider uppercase mb-3 shadow-sm">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Check-In Confirmed
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">
              You're Safe & Protected
            </h2>

            {/* Body */}
            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed max-w-xs mx-auto">
              Your check-in timer has been reset. Your encrypted vault and emergency protocol remain on standby.
            </p>

            {/* Info Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 font-medium">
              <span className="material-symbols-outlined text-emerald-400 text-base">timer</span>
              <span>Next check-in active · Protocol secure</span>
            </div>

            {/* Done Button */}
            <button
              onClick={dismissCelebration}
              className="mt-6 w-full py-3 px-5 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 active:scale-[0.98] border border-white/15 text-xs font-semibold text-white tracking-wide transition-all shadow-lg shadow-primary/20"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>,
        document.body
      )}

      <header className="relative flex items-center justify-between min-h-12">
        <div className="flex items-center gap-3 md:hidden">
          <button onClick={() => navigate('/')} aria-label="Guardian Angel DMS home" className="transition-opacity hover:opacity-80">
            <img
              src="/images/New-GrdnAngl-Logo.png"
              alt="Guardian Angel DMS"
              className="w-44 h-auto object-contain"
            />
          </button>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="md:hidden rounded-xl bg-surface-dark border border-white/10 hover:border-white/20 transition-all active:scale-95 shadow-lg overflow-hidden"
        >
          <div className="size-8 rounded-full bg-surface-darker flex items-center justify-center overflow-hidden border border-gray-700">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} className="h-full w-full object-cover" alt="" />
            ) : (
              <span className="text-[10px] font-black text-primary uppercase">{getInitials(currentUser.name)}</span>
            )}
          </div>
        </button>
      </header>

      <div className="flex items-end justify-between gap-4 mt-2">
        <div>
          <p className="ga-eyebrow mb-1">Protection status</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Welcome back, {currentUser.name.split(' ')[0]}</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Protocol monitoring
        </div>
      </div>

      <section data-tour-id="dashboard-timer" className="ga-timer-panel relative group pt-2">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-72 sm:h-72 bg-primary/5 rounded-full blur-[60px] sm:blur-[80px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        <div className="relative z-10 text-center mb-5">
          <p className="ga-eyebrow flex items-center justify-center">
            Time until your protocol activates
            <InfoTooltip
              title="Dead Man's Switch"
              content="This countdown resets every time you press 'I'M SAFE'. If it reaches zero without a check-in, Guardian Angel DMS automatically emails your assigned vault files to your designated recipients."
            />
          </p>
        </div>
        <div className="flex gap-2 justify-center relative z-10">
          {[
            { label: 'Days', val: formatNum(days), accent: false },
            { label: 'Hours', val: formatNum(hours), accent: false },
            { label: 'Min', val: formatNum(minutes), accent: false },
            { label: 'Sec', val: formatNum(seconds), accent: true },
          ].map((unit, i) => (
            <React.Fragment key={unit.label}>
              <div className="flex flex-col items-center gap-2">
                <div className={`ga-timer-unit flex h-20 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-surface-dark/80 backdrop-blur-md border border-gray-800 transition-transform duration-500 hover:scale-[1.03] ${unit.accent ? 'ring-1 ring-accent-amber/20' : ''}`}>
                  <p className={`text-3xl sm:text-5xl font-semibold tracking-tight tabular-nums ${unit.accent ? 'text-accent-amber' : 'text-white'}`}>
                    {unit.val}
                  </p>
                </div>
                <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] ${unit.accent ? 'text-accent-amber' : 'text-gray-500'}`}>
                  {unit.label}
                </p>
              </div>
              {i < 3 && (
                <div className="flex h-20 sm:h-24 items-center pb-4 sm:pb-5">
                  <span className="text-xl sm:text-2xl text-gray-700 font-semibold">:</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      <div className="px-1 py-4 space-y-3">
        <button
          data-tour-id="dashboard-checkin-button"
          onClick={canAccessFeatures ? handleCheckInClick : () => navigate('/pricing')}
          className={`ga-checkin-button relative w-full group overflow-hidden h-28 sm:h-32 rounded-[24px] shadow-2xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] border ${canAccessFeatures
            ? 'bg-gradient-to-r from-[#1754cf] via-[#2163ee] to-[#1754cf] shadow-primary/30 hover:shadow-primary/50 border-white/20'
            : 'bg-surface-dark border-gray-700 hover:border-primary/50 cursor-pointer'
            }`}
        >
          {canAccessFeatures && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          )}
          <div className="text-center relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-emerald-300 text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                {isExpired ? 'lock' : 'verified_user'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
                {isExpired ? 'Subscribe to check in' : "I'M SAFE"}
              </h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-0.5 w-12 sm:w-16 bg-white/30 mb-1.5 rounded-full"></div>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium tracking-wide">
                {isExpired ? '$7.99/month for full access' : 'Tap to confirm safety & reset protocol timer'}
              </p>
            </div>
          </div>
          {canAccessFeatures && <div className="absolute inset-0 rounded-[24px] pulse-ring pointer-events-none"></div>}
        </button>

      </div>

      <div className="px-1">
        <button
          onClick={() => canAccessFeatures ? navigate('/upload') : navigate('/pricing')}
          className={`ga-action-card w-full group relative flex items-center justify-between p-4 sm:p-5 bg-surface-dark border border-gray-800 rounded-[20px] transition-all shadow-lg active:scale-[0.98] ${canAccessFeatures ? 'hover:border-primary/40' : 'opacity-50'
            }`}
        >
          <div className="flex items-center gap-4">
            <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
              <span className="ga-upload-icon material-symbols-outlined text-primary group-hover:text-white transition-colors text-xl sm:text-2xl">upload_file</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Add an item</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Upload a file or write a private message</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-600 group-hover:text-primary transition-colors">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-12">
        <div onClick={() => navigate('/vault')} className="ga-stat-card bg-surface-dark/40 backdrop-blur-sm p-6 sm:p-7 rounded-[22px] border border-gray-800/60 flex flex-col items-start justify-center gap-1 sm:gap-2 cursor-pointer hover:bg-surface-dark transition-all duration-300 group shadow-lg">
          <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-surface-dark flex items-center justify-center border border-gray-800 mb-1 sm:mb-2 group-hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform text-xl sm:text-2xl">lock</span>
          </div>
          <p className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-none mb-1">{fileCount}</p>
          <p className="text-[11px] font-medium text-gray-500">Items in your vault</p>
        </div>
        <div onClick={() => navigate('/recipients')} className="ga-stat-card bg-surface-dark/40 backdrop-blur-sm p-6 sm:p-7 rounded-[22px] border border-gray-800/60 flex flex-col items-start justify-center gap-1 sm:gap-2 cursor-pointer hover:bg-surface-dark transition-all duration-300 group shadow-lg">
          <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-surface-dark flex items-center justify-center border border-gray-800 mb-1 sm:mb-2 group-hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform text-xl sm:text-2xl">group</span>
          </div>
          <p className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-none mb-1">{recipientCount}</p>
          <p className="text-[11px] font-medium text-gray-500">Trusted recipients</p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .pulse-ring { box-shadow: 0 0 0 0 rgba(113, 129, 255, 0.3); animation: pulse-ring-anim 2.6s infinite; }
        @keyframes pulse-ring-anim { 0% { box-shadow: 0 0 0 0 rgba(113, 129, 255, 0.3); } 70% { box-shadow: 0 0 0 20px rgba(113, 129, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(113, 129, 255, 0); } }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }

        .celebration-overlay-enter { animation: overlayIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .celebration-overlay-exit { animation: overlayOut 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes overlayIn { from { background: rgba(0,0,0,0); backdrop-filter: blur(0px); opacity: 0; } to { background: rgba(0,0,0,0.65); backdrop-filter: blur(12px); opacity: 1; } }
        @keyframes overlayOut { from { background: rgba(0,0,0,0.65); backdrop-filter: blur(12px); opacity: 1; } to { background: rgba(0,0,0,0); backdrop-filter: blur(0px); opacity: 0; } }

        .celebration-card-enter { animation: cardIn 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .celebration-card-exit { animation: cardOut 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes cardIn { from { opacity: 0; transform: scale(0.88) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cardOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.92) translateY(16px); } }
      `}</style>
    </div>
  );
};

export default Dashboard;

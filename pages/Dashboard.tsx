
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../App';

interface DashboardProps {
  timerSeconds: number;
  onCheckIn: () => void;
  fileCount: number;
  recipientCount: number;
  currentUser: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ timerSeconds, onCheckIn, fileCount, recipientCount, currentUser }) => {
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const days = Math.floor(timerSeconds / 86400);
  const hours = Math.floor((timerSeconds % 86400) / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const formatNum = (num: number) => num.toString().padStart(2, '0');

  const handleCheckInClick = () => {
    onCheckIn();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 8000);
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
    const ctx = canvas.getContext('2d')!;
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

    const particles: any[] = [];
    const fireworks: any[] = [];
    const sparkles: any[] = [];
    const colors = ['#1754cf', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#FFFFFF', '#3B82F6', '#60A5FA', '#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA'];

    class Particle {
      x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number; gravity: number; friction: number; decay: number; isConfetti: boolean; rotation: number; rotationSpeed: number; shape: number;
      constructor(x: number, y: number, color: string, isConfetti = false) {
        this.x = x; this.y = y; this.color = color; this.isConfetti = isConfetti; this.alpha = 1;
        this.size = isConfetti ? Math.random() * 8 + 5 : Math.random() * 4 + 2;
        this.gravity = isConfetti ? 0.015 : 0.035;
        this.friction = 0.985;
        this.decay = Math.random() * 0.004 + 0.002;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        this.shape = Math.floor(Math.random() * 3); // 0: square, 1: circle, 2: star
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * (isConfetti ? 8 : 10) + 3;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity - (isConfetti ? 2 : 0);
      }
      update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.rotation += this.rotationSpeed;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        if (this.isConfetti) {
          if (this.shape === 0) {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
          } else if (this.shape === 1) {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Star shape
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
              const r = i === 0 ? this.size : this.size;
              ctx.lineTo(Math.cos(angle) * r * 0.5, Math.sin(angle) * r * 0.5);
              const angle2 = angle + (2 * Math.PI) / 10;
              ctx.lineTo(Math.cos(angle2) * r * 0.2, Math.sin(angle2) * r * 0.2);
            }
            ctx.closePath();
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 10;
          ctx.shadowColor = this.color;
        }
        ctx.restore();
      }
    }

    class Sparkle {
      x: number; y: number; alpha: number; size: number; decay: number; twinkle: number;
      constructor(x: number, y: number) {
        this.x = x; this.y = y; this.alpha = 1;
        this.size = Math.random() * 3 + 1;
        this.decay = Math.random() * 0.02 + 0.01;
        this.twinkle = Math.random() * 0.2;
      }
      update() { this.alpha -= this.decay; }
      draw() {
        const flicker = Math.sin(Date.now() * this.twinkle) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = this.alpha * flicker;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        // Draw cross sparkle
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.size * 2, this.y);
        ctx.lineTo(this.x + this.size * 2, this.y);
        ctx.moveTo(this.x, this.y - this.size * 2);
        ctx.lineTo(this.x, this.y + this.size * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    class Firework {
      x: number; y: number; targetY: number; vy: number; color: string; exploded: boolean; trail: {x: number, y: number, alpha: number}[];
      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = window.innerHeight;
        this.targetY = Math.random() * (window.innerHeight * 0.5) + 50;
        this.vy = -Math.random() * 4 - 8;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.exploded = false;
        this.trail = [];
      }
      update() {
        this.trail.push({x: this.x, y: this.y, alpha: 1});
        if (this.trail.length > 8) this.trail.shift();
        this.trail.forEach(t => t.alpha *= 0.8);

        this.y += this.vy;
        this.vy *= 0.985;
        if (this.y <= this.targetY || Math.abs(this.vy) < 0.5) {
          this.exploded = true;
          const particleCount = 80;
          for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(this.x, this.y, this.color));
          }
          // More confetti
          for (let i = 0; i < 30; i++) {
            particles.push(new Particle(this.x, this.y, colors[Math.floor(Math.random() * colors.length)], true));
          }
          // Add sparkles at explosion
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 50;
            sparkles.push(new Sparkle(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist));
          }
        }
      }
      draw() {
        // Draw trail
        this.trail.forEach((t, i) => {
          ctx.save();
          ctx.globalAlpha = t.alpha * 0.5;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 2 - i * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
          ctx.restore();
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.restore();
      }
    }

    const triggerInitialBurst = () => {
      // Massive confetti burst from center
      for (let i = 0; i < 150; i++) {
        particles.push(new Particle(window.innerWidth / 2, window.innerHeight / 2, colors[Math.floor(Math.random() * colors.length)], true));
      }
      // Add initial sparkles across screen
      for (let i = 0; i < 30; i++) {
        sparkles.push(new Sparkle(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.6));
      }
      // Launch initial fireworks
      for (let i = 0; i < 2; i++) {
        setTimeout(() => fireworks.push(new Firework()), i * 200);
      }
    };
    triggerInitialBurst();

    // Confetti cannon from sides
    const launchSideConfetti = () => {
      for (let i = 0; i < 40; i++) {
        const fromLeft = Math.random() > 0.5;
        const p = new Particle(
          fromLeft ? 0 : window.innerWidth,
          window.innerHeight * 0.7,
          colors[Math.floor(Math.random() * colors.length)],
          true
        );
        p.vx = fromLeft ? Math.random() * 8 + 4 : -(Math.random() * 8 + 4);
        p.vy = -(Math.random() * 10 + 5);
        particles.push(p);
      }
    };
    setTimeout(launchSideConfetti, 500);
    setTimeout(launchSideConfetti, 1500);
    setTimeout(launchSideConfetti, 3000);

    const animate = () => {
      ctx.fillStyle = 'rgba(15, 17, 21, 0.15)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Fireworks frequency (reduced by half)
      if (Math.random() < 0.06) fireworks.push(new Firework());

      // Random sparkles
      if (Math.random() < 0.15) {
        sparkles.push(new Sparkle(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.7));
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        if (fireworks[i].exploded) fireworks.splice(i, 1);
        else fireworks[i].draw();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
        else particles[i].draw();
      }

      for (let i = sparkles.length - 1; i >= 0; i--) {
        sparkles[i].update();
        if (sparkles[i].alpha <= 0) sparkles.splice(i, 1);
        else sparkles[i].draw();
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    window.addEventListener('resize', setCanvasSize);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [showCelebration]);

  return (
    <div className="flex flex-col gap-6 px-5 py-8 animate-in fade-in duration-700 relative min-h-screen overflow-hidden">
      {showCelebration && (
        <div className="fixed inset-0 z-[100] pointer-events-none bg-black/50 backdrop-blur-sm">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-500 p-6">
            <div className="bg-gradient-to-br from-primary/30 to-purple-600/20 backdrop-blur-xl border border-white/30 p-8 sm:p-12 rounded-[48px] text-center shadow-[0_0_150px_rgba(23,84,207,0.7),0_0_60px_rgba(139,92,246,0.5)] scale-100 sm:scale-110 w-full max-w-[300px] sm:max-w-none animate-pulse-slow">
              <div className="inline-flex size-20 sm:size-24 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-500/20 items-center justify-center mb-5 ring-4 ring-white/30 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                <span className="material-symbols-outlined text-white text-5xl sm:text-6xl drop-shadow-[0_0_30px_#10b981]">verified</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-white uppercase italic tracking-tighter mb-3 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">I AM ALIVE!</h2>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-0.5 w-8 bg-gradient-to-r from-transparent to-white/60 rounded-full"></div>
                <span className="material-symbols-outlined text-green-400 text-xl">check_circle</span>
                <div className="h-0.5 w-8 bg-gradient-to-l from-transparent to-white/60 rounded-full"></div>
              </div>
              <p className="text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.5em]">You're all set</p>
              <p className="text-green-400/90 text-[11px] sm:text-sm font-black uppercase tracking-[0.2em] mt-2 animate-pulse">Timer reset successfully</p>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div className="flex flex-col items-center gap-1">
          <img
            src="https://grdnangl.digitalac.app/images/grdnangl-full.png"
            alt="Guardian Angel DMS Logo"
            className="w-48 h-auto object-contain"
          />
          <p className="text-[9px] text-primary font-black uppercase tracking-widest">Your Digital Legacy</p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="rounded-full bg-surface-dark border border-gray-800 hover:border-gray-600 transition-all active:scale-95 shadow-lg overflow-hidden"
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

      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Active & Protected</span>
        </div>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{currentUser.name}</p>
      </div>

      <div className="relative group pt-2">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-72 sm:h-72 bg-primary/5 rounded-full blur-[60px] sm:blur-[80px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        <div className="flex gap-2 justify-center relative z-10">
          {[
            { label: 'Days', val: formatNum(days), accent: false },
            { label: 'Hours', val: formatNum(hours), accent: false },
            { label: 'Min', val: formatNum(minutes), accent: false },
            { label: 'Sec', val: formatNum(seconds), accent: true },
          ].map((unit, i) => (
            <React.Fragment key={unit.label}>
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-20 w-16 sm:h-24 sm:w-20 items-center justify-center rounded-[20px] sm:rounded-[24px] bg-surface-dark/80 backdrop-blur-md border border-gray-800 shadow-2xl shadow-black/40 transition-transform duration-500 hover:scale-105 ${unit.accent ? 'ring-1 ring-accent-amber/30' : ''}`}>
                  <p className={`text-3xl sm:text-5xl font-black tracking-tighter ${unit.accent ? 'text-accent-amber drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'text-white'}`}>
                    {unit.val}
                  </p>
                </div>
                <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] ${unit.accent ? 'text-accent-amber' : 'text-gray-500'}`}>
                  {unit.label}
                </p>
              </div>
              {i < 3 && (
                <div className="flex h-20 sm:h-24 items-center pb-4 sm:pb-5">
                  <span className="text-xl sm:text-2xl text-gray-700 font-black animate-pulse">:</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="px-1 py-4 space-y-3">
        <button
          onClick={handleCheckInClick}
          className="relative w-full group overflow-hidden h-32 sm:h-36 bg-primary rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-primary/40 flex flex-col items-center justify-center gap-1 hover:bg-blue-600 transition-all active:scale-[0.97] border border-white/20"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <div className="text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-[0.05em] drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] leading-none mb-2">
              I AM ALIVE!
            </h2>
            <div className="flex flex-col items-center">
              <div className="h-0.5 w-10 sm:w-12 bg-white/40 mb-2 rounded-full"></div>
              <p className="text-[10px] sm:text-[11px] text-white/80 font-black uppercase tracking-[0.5em]">Press to verify</p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-[32px] sm:rounded-[40px] pulse-ring pointer-events-none"></div>
        </button>

      </div>

      <div className="px-1">
        <button 
          onClick={() => navigate('/upload')}
          className="w-full group relative flex items-center justify-between p-4 sm:p-5 bg-surface-dark border border-gray-800 rounded-[24px] sm:rounded-[28px] hover:border-primary/40 transition-all shadow-lg active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors text-xl sm:text-2xl">upload_file</span>
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Add New Item</p>
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Upload files or write messages</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-600 group-hover:text-primary transition-colors">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-12">
        <div onClick={() => navigate('/vault')} className="bg-surface-dark/40 backdrop-blur-sm p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-gray-800/60 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:bg-surface-dark transition-all duration-300 group shadow-lg">
          <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-surface-dark flex items-center justify-center border border-gray-800 mb-1 sm:mb-2 group-hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform text-xl sm:text-2xl">lock</span>
          </div>
          <p className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none mb-1">{fileCount}</p>
          <p className="text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">Saved Items</p>
        </div>
        <div onClick={() => navigate('/recipients')} className="bg-surface-dark/40 backdrop-blur-sm p-6 sm:p-8 rounded-[28px] sm:rounded-[32px] border border-gray-800/60 flex flex-col items-center justify-center gap-1 sm:gap-2 cursor-pointer hover:bg-surface-dark transition-all duration-300 group shadow-lg">
          <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-surface-dark flex items-center justify-center border border-gray-800 mb-1 sm:mb-2 group-hover:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform text-xl sm:text-2xl">group</span>
          </div>
          <p className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none mb-1">{recipientCount}</p>
          <p className="text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">Recipients</p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .pulse-ring { box-shadow: 0 0 0 0 rgba(23, 84, 207, 0.4); animation: pulse-ring-anim 2s infinite; }
        @keyframes pulse-ring-anim { 0% { box-shadow: 0 0 0 0 rgba(23, 84, 207, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(23, 84, 207, 0); } 100% { box-shadow: 0 0 0 0 rgba(23, 84, 207, 0); } }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
      `}</style>
    </div>
  );
};

export default Dashboard;

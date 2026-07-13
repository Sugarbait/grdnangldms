
import React from 'react';
import { Link } from 'react-router-dom';

const Splash: React.FC = () => {
  return (
    <div className="ga-auth-shell min-h-screen flex flex-col bg-background-dark relative overflow-hidden font-display">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-accent-amber/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 w-full max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-4">
        <span aria-hidden="true"></span>
        <Link to="/" aria-label="Guardian Angel DMS home" className="flex items-center justify-self-center transition-opacity hover:opacity-85">
          <img
            src="/images/New-GrdnAngl-Logo.png"
            alt="Guardian Angel DMS"
            className="h-8 sm:h-12 w-auto max-w-[190px] sm:max-w-[250px] object-contain"
          />
        </Link>
        <Link to="/login" className="justify-self-end whitespace-nowrap text-sm font-semibold text-gray-300 hover:text-white transition-colors">Sign in</Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 md:px-8 text-center py-12">
        <div className="w-full max-w-3xl mx-auto space-y-7">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide text-indigo-200">
            <span className="material-symbols-outlined text-[13px]">shield</span>
            Secure Digital Legacy Management
          </div>

          <h1 className="text-4xl md:text-7xl font-semibold text-white tracking-[-0.045em] leading-[1.02]">
            Your digital legacy,<br />
            <span className="text-indigo-300">protected with care.</span>
          </h1>

          <p className="text-gray-400 text-base leading-relaxed max-w-xl mx-auto">
            Secure the files and messages that matter. If you miss a check-in, Guardian Angel privately delivers them to the people you trust.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-md mx-auto">
            <Link
              to="/login?mode=signup"
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all active:scale-[0.98] text-center shadow-xl shadow-primary/20"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="w-full border border-white/10 bg-white/[0.035] hover:bg-white/[0.06] text-gray-300 hover:text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all text-center"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl mx-auto">
          {[
            {
              icon: 'timer',
              title: "Dead Man's Switch",
              desc: 'A countdown timer resets each time you check in. If it expires, your protocol activates automatically.',
            },
            {
              icon: 'lock',
              title: 'End-to-End Encrypted',
              desc: 'Your files and messages are encrypted with AES-256 before being stored. Only you hold the key.',
            },
            {
              icon: 'group',
              title: 'Trusted Recipients',
              desc: 'Designate who receives what. Each recipient only sees the files you assign to them.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="ga-action-card bg-surface-dark border border-white/[0.07] rounded-2xl p-5 flex flex-col items-start gap-4 text-left"
            >
              <span className="material-symbols-outlined text-indigo-300 text-2xl shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <h3 className="text-white font-semibold tracking-tight text-sm mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 px-5 flex flex-col items-center gap-3 border-t border-gray-800/50">
        <div className="flex gap-6 text-[10px] font-semibold text-gray-600">
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </div>
        <p className="text-[10px] font-medium text-gray-700">
          © {new Date().getFullYear()} Guardian Angel DMS
        </p>
      </footer>
    </div>
  );
};

export default Splash;

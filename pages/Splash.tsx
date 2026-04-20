
import React from 'react';
import { Link } from 'react-router-dom';

const Splash: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f1115] relative overflow-hidden font-display">
      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-[#1754cf]/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-[#F59E0B]/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <img
          src="/images/New-GrdnAngl-Logo.png"
          alt="Guardian Angel DMS"
          className="h-8 w-auto object-contain max-w-[200px]"
        />
        <Link
          to="/login"
          className="shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors border border-gray-700 hover:border-gray-500 rounded-xl px-4 py-2 ml-3"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 text-center py-10">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-[#1754cf]/15 border border-[#1754cf]/30 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#1754cf]">
            <span className="material-symbols-outlined text-[13px]">shield</span>
            Secure Digital Legacy Management
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-none">
            Your Digital Legacy,<br />
            <span className="text-[#1754cf]">Protected.</span>
          </h1>

          <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
            Guardian Angel DMS automatically delivers your important files, messages, and documents to your designated recipients when your check-in timer expires.
          </p>

          <div className="flex flex-col items-center gap-3 pt-1 w-full max-w-xs mx-auto">
            <Link
              to="/login?mode=signup"
              className="w-full bg-[#1754cf] hover:bg-[#1754cf]/90 text-white font-black uppercase tracking-widest text-[11px] px-6 py-4 rounded-2xl transition-all active:scale-[0.98] text-center"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="w-full border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-black uppercase tracking-widest text-[11px] px-6 py-4 rounded-2xl transition-all text-center"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 mt-16 grid grid-cols-1 gap-4 w-full max-w-2xl mx-auto">
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
              className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-5 flex items-start gap-4 text-left"
            >
              <span className="material-symbols-outlined text-[#1754cf] text-2xl shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <h3 className="text-white font-black uppercase tracking-tight text-sm mb-1">{f.title}</h3>
                <p className="text-gray-500 text-[11px] leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 px-5 flex flex-col items-center gap-3 border-t border-gray-800/50">
        <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-gray-600">
          <Link to="/terms" className="hover:text-[#1754cf] transition-colors">Terms of Use</Link>
          <Link to="/privacy" className="hover:text-[#1754cf] transition-colors">Privacy Policy</Link>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
          © {new Date().getFullYear()} Guardian Angel DMS
        </p>
        <a href="https://digitalac.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#1754cf] transition-colors">
          Get more apps at digitalac.app
        </a>
      </footer>
    </div>
  );
};

export default Splash;

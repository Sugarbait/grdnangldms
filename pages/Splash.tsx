import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Splash: React.FC = () => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [simulatedCheckInDone, setSimulatedCheckInDone] = useState(false);

  // Default simulated timer: 29 days, 14 hours, 36 minutes, 42 seconds
  const DEFAULT_SIMULATED_SECONDS = 29 * 86400 + 14 * 3600 + 36 * 60 + 42;
  const [simulatedSeconds, setSimulatedSeconds] = useState(DEFAULT_SIMULATED_SECONDS);

  // Live countdown timer ticking down every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedSeconds((prev) => (prev > 0 ? prev - 1 : DEFAULT_SIMULATED_SECONDS));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSimulatedCheckIn = () => {
    // Reset to full 30 days on simulated check-in
    setSimulatedSeconds(30 * 86400);
    setSimulatedCheckInDone(true);
    setTimeout(() => {
      setSimulatedCheckInDone(false);
    }, 3500);
  };

  const simDays = Math.floor(simulatedSeconds / 86400);
  const simHours = Math.floor((simulatedSeconds % 86400) / 3600);
  const simMinutes = Math.floor((simulatedSeconds % 3600) / 60);
  const simSeconds = simulatedSeconds % 60;
  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="ga-auth-shell min-h-screen flex flex-col bg-background-dark relative overflow-x-hidden font-display text-white selection:bg-primary/30 selection:text-white">
      {/* Background ambient glow orbs */}
      <div className="absolute top-[-5%] left-[-10%] w-[42rem] h-[42rem] bg-primary/15 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] right-[-10%] w-[38rem] h-[38rem] bg-emerald-500/10 rounded-full blur-[180px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] left-[-5%] w-[36rem] h-[36rem] bg-indigo-600/10 rounded-full blur-[170px] pointer-events-none -z-10" />

      {/* Sticky Navigation Header */}
      <header className="sticky top-[8px] mt-[8px] z-50 w-full bg-[#0a0d14]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" aria-label="Guardian Angel DMS home" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <img
              src="/images/New-GrdnAngl-Logo.png"
              alt="Guardian Angel DMS"
              className="h-8 sm:h-10 w-auto max-w-[180px] sm:max-w-[240px] object-contain"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('security')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Security
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Pricing
              <span className="text-[10px] bg-primary/20 text-indigo-300 px-2 py-0.5 rounded-full border border-primary/30 font-semibold">
                Trial Free
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-300 hover:text-white px-4 py-2.5 rounded-xl transition-colors hover:bg-white/[0.04]"
            >
              Sign In
            </Link>
            <Link
              to="/login?mode=signup"
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0c1018]/95 border-b border-white/10 px-5 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col space-y-3 text-sm font-medium">
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="text-left text-gray-300 hover:text-white py-2"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="text-left text-gray-300 hover:text-white py-2"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('security')}
                className="text-left text-gray-300 hover:text-white py-2"
              >
                Security
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="text-left text-gray-300 hover:text-white py-2 flex items-center justify-between"
              >
                <span>Pricing & Plans</span>
                <span className="text-[10px] bg-primary/20 text-indigo-300 px-2 py-0.5 rounded-full border border-primary/30">
                  Save 37%
                </span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="text-left text-gray-300 hover:text-white py-2"
              >
                FAQ
              </button>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              <Link
                to="/login"
                className="w-full text-center py-3 text-sm font-medium text-gray-300 hover:text-white bg-white/[0.04] border border-white/10 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/login?mode=signup"
                className="w-full text-center py-3 text-sm font-semibold text-white bg-primary rounded-xl shadow-lg shadow-primary/30"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-200 mb-6 shadow-sm">
          <span className="flex size-2 rounded-full bg-primary animate-pulse" />
          <span className="material-symbols-outlined text-[15px]">verified_user</span>
          <span>Zero-Knowledge Digital Legacy Protection</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.04em] text-white leading-[1.05] max-w-4xl mx-auto mb-6">
          Your digital legacy,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-200 bg-clip-text text-transparent">
            protected with care.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
          Store sensitive documents, passwords, personal letters, and voice memos. If life happens and
          you stop checking in, Guardian Angel DMS automatically and privately delivers each item only
          to the recipients you designated.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-8">
          <Link
            to="/login?mode=signup"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-8 py-4 rounded-xl transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] flex items-center justify-center gap-2 text-center"
          >
            <span>Start 24-Hour Free Trial</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
          <button
            type="button"
            onClick={() => scrollToSection('pricing')}
            className="w-full sm:w-auto border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 hover:text-white font-semibold text-sm px-7 py-4 rounded-xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Pricing</span>
            <span className="material-symbols-outlined text-base text-gray-400">arrow_downward</span>
          </button>
        </div>

        {/* Trust Badges under CTA */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-indigo-400 text-base">check_circle</span>
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-indigo-400 text-base">lock</span>
            AES-256 Client Encryption
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-indigo-400 text-base">published_with_changes</span>
            Cancel anytime
          </span>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT PREVIEW / VAULT SHOWCASE */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#141925]/90 to-[#0d111a]/95 p-4 sm:p-7 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {/* Mock Browser/Window Chrome */}
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-red-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] font-mono text-gray-500 ml-2">guardian-angel-vault // live-status</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              <span className="size-1.5 rounded-full bg-indigo-400 animate-ping" />
              Vault Armed • Switch Active
            </div>
          </div>

          {/* Interactive Timer & Status Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Countdown Box */}
            <div className="lg:col-span-2 bg-[#090d14]/75 border border-white/10 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-400 text-xl">timer</span>
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Inactivity Countdown Timer</span>
                </div>
                <span className="text-[11px] text-gray-500">Auto-resets on check-in</span>
              </div>

              {/* Timer Units */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center my-3">
                <div className="ga-timer-unit bg-surface-dark border border-white/10 rounded-xl p-3 sm:p-4">
                  <span className="text-2xl sm:text-4xl font-bold font-mono text-white tabular-nums">{padZero(simDays)}</span>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Days</p>
                </div>
                <div className="ga-timer-unit bg-surface-dark border border-white/10 rounded-xl p-3 sm:p-4">
                  <span className="text-2xl sm:text-4xl font-bold font-mono text-white tabular-nums">{padZero(simHours)}</span>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Hours</p>
                </div>
                <div className="ga-timer-unit bg-surface-dark border border-white/10 rounded-xl p-3 sm:p-4">
                  <span className="text-2xl sm:text-4xl font-bold font-mono text-white tabular-nums">{padZero(simMinutes)}</span>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Mins</p>
                </div>
                <div className="ga-timer-unit bg-surface-dark border border-white/10 rounded-xl p-3 sm:p-4 relative overflow-hidden">
                  <span className="text-2xl sm:text-4xl font-bold font-mono text-indigo-300 tabular-nums">{padZero(simSeconds)}</span>
                  <p className="text-[10px] text-indigo-300/80 font-semibold uppercase tracking-wider mt-1">Secs</p>
                </div>
              </div>

              {/* Simulated Check In Button */}
              <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleSimulatedCheckIn}
                  className="w-full sm:w-auto flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm py-3 px-5 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{simulatedCheckInDone ? '✓ Check-In Confirmed! Timer Reset' : 'Try "Check In" Simulation'}</span>
                </button>
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-sm">notifications_active</span>
                  <span>Warning sent 48h before trigger</span>
                </div>
              </div>
            </div>

            {/* Quick Vault & Recipient Cards */}
            <div className="space-y-3">
              <div className="bg-[#090d14]/75 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-indigo-300">
                  <span className="material-symbols-outlined text-lg">description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Last Will & Instructions.pdf</p>
                  <p className="text-[10px] text-gray-400">Encrypted AES-256 • Assigned to Sarah</p>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-sm">lock</span>
              </div>

              <div className="bg-[#090d14]/75 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-indigo-300">
                  <span className="material-symbols-outlined text-lg">key</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Crypto Seed & Master Passwords</p>
                  <p className="text-[10px] text-gray-400">Encrypted AES-256 • Assigned to David</p>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-sm">lock</span>
              </div>

              <div className="bg-[#090d14]/75 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-indigo-300">
                  <span className="material-symbols-outlined text-lg">mic</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Personal Audio Message.m4a</p>
                  <p className="text-[10px] text-gray-400">Voice Recording • Assigned to Kids</p>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-sm">lock</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / STATS BAR */}
      <section className="relative z-10 border-y border-white/[0.08] bg-[#0c101a]/60 py-10 px-4 sm:px-6 lg:px-8 mb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">256-Bit</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">AES Client-Side Encryption</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Zero-Knowledge</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Only You Hold The Key</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">100% Automated</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Inactivity Protocol Delivery</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Granular</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Per-Recipient Isolation</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-24 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold text-indigo-300 mb-3">
            <span className="material-symbols-outlined text-sm">sync</span>
            <span>Simple 3-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            How Guardian Angel DMS works
          </h2>
          <p className="text-gray-400 text-base mt-4">
            A reliable safety net designed to protect your sensitive affairs without relying on third-party intermediaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="relative bg-surface-dark border border-white/[0.08] rounded-2xl p-7 flex flex-col justify-between hover:border-primary/40 transition-all group">
            <div className="mb-6">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-indigo-300 text-xl font-bold mb-5 group-hover:scale-105 transition-transform">
                01
              </div>
              <h3 className="text-xl font-semibold text-white mb-2.5">Upload & Encrypt</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Add written notes, PDFs, voice recordings, photos, and critical credentials. Everything is encrypted
                directly in your browser using AES-256 before being stored.
              </p>
            </div>
            <div className="pt-4 border-t border-white/[0.06] text-xs text-gray-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-base">enhanced_encryption</span>
              <span>Client-side zero-knowledge security</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative bg-surface-dark border border-white/[0.08] rounded-2xl p-7 flex flex-col justify-between hover:border-primary/40 transition-all group">
            <div className="mb-6">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-indigo-300 text-xl font-bold mb-5 group-hover:scale-105 transition-transform">
                02
              </div>
              <h3 className="text-xl font-semibold text-white mb-2.5">Assign Trusted Recipients</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Choose who receives what. Your spouse receives family instructions; your business partner receives server logins;
                your attorney receives legal directives. No one sees items not assigned to them.
              </p>
            </div>
            <div className="pt-4 border-t border-white/[0.06] text-xs text-gray-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-base">group</span>
              <span>Isolated per-recipient delivery</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative bg-surface-dark border border-white/[0.08] rounded-2xl p-7 flex flex-col justify-between hover:border-primary/40 transition-all group">
            <div className="mb-6">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-indigo-300 text-xl font-bold mb-5 group-hover:scale-105 transition-transform">
                03
              </div>
              <h3 className="text-xl font-semibold text-white mb-2.5">Set Your Check-In Schedule</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Pick your check-in interval (e.g., 7 days, 30 days). Each check-in resets your countdown. If you miss a check-in,
                we send email warnings. If no response is received, your files are securely distributed.
              </p>
            </div>
            <div className="pt-4 border-t border-white/[0.06] text-xs text-gray-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-base">emergency_home</span>
              <span>Automated peace of mind</span>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-24 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold text-indigo-300 mb-3">
            <span className="material-symbols-outlined text-sm">stars</span>
            <span>Feature-Rich Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Engineered for reliability & confidentiality
          </h2>
          <p className="text-gray-400 text-base mt-4">
            Everything you need to safeguard digital assets, family records, and vital messages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: 'timer',
              title: "Dead Man's Switch",
              desc: 'Customizable countdown timer that resets whenever you check in. If you stop checking in, your protocol executes seamlessly.',
            },
            {
              icon: 'lock',
              title: 'AES-256 Client-Side Encryption',
              desc: 'Your files and messages are encrypted on your device before transmission. We cannot read your plaintext data.',
            },
            {
              icon: 'person_search',
              title: 'Isolated Recipient Access',
              desc: 'Designate specific recipients for specific files. Recipients never see what you assigned to anyone else.',
            },
            {
              icon: 'folder_zip',
              title: 'Multi-Format Vault',
              desc: 'Support for text notes, PDFs, voice recordings, photos, and scanned documents up to standard limits.',
            },
            {
              icon: 'notification_important',
              title: 'Pre-Expiry Warning Reminders',
              desc: 'Gentle notification emails sent before your timer expires to prevent accidental activation when you are simply busy.',
            },
            {
              icon: 'security',
              title: 'Two-Factor Authentication (2FA)',
              desc: 'Protect your account and vault access with industry-standard time-based one-time password (TOTP) authenticator apps.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="ga-action-card bg-surface-dark border border-white/[0.07] rounded-2xl p-6 flex flex-col items-start gap-4 text-left transition-all hover:border-primary/40"
            >
              <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-indigo-300">
                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold tracking-tight text-base mb-2">{f.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING SECTION (COMPREHENSIVE PRICING CARDS) */}
      <section id="pricing" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-24 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 rounded-full px-3 py-1 text-xs font-semibold text-indigo-300 mb-3">
            <span className="material-symbols-outlined text-sm">payments</span>
            <span>Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-base mt-4">
            No setup fees. No surprises. Includes a 24-hour free trial with full functionality.
          </p>

          {/* Billing interval toggle */}
          <div className="flex justify-center mt-8">
            <div className="inline-flex items-center bg-surface-dark border border-white/10 rounded-full p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingInterval('month')}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  billingInterval === 'month'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('year')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  billingInterval === 'year'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Annual</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  billingInterval === 'year'
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/20 text-indigo-300'
                }`}>
                  Save 37%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Card 1: 24-Hour Free Trial */}
          <div className="bg-surface-dark border border-white/10 rounded-3xl p-7 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white tracking-tight">Free Trial</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  No Card Required
                </span>
              </div>
              <p className="text-gray-400 text-xs mb-6">
                Test drive the vault, configure your timer, and assign recipients risk-free.
              </p>

              <div className="mb-6">
                <div className="text-4xl font-extrabold text-white tracking-tight">$0</div>
                <p className="text-xs text-gray-400 mt-1">24 hours full feature access</p>
              </div>

              <Link
                to="/login?mode=signup"
                className="w-full block text-center bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm mb-8 border border-white/10"
              >
                Start 24-Hour Trial
              </Link>

              <div className="space-y-3 border-t border-white/[0.08] pt-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Up to 5 file uploads</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Unlimited trusted recipients</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Active check-in countdown timer</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Client-side AES-256 encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Two-Factor Authentication (2FA)</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.04] text-[11px] text-gray-500 text-center">
              Transitions to view-only after 24h
            </div>
          </div>

          {/* Card 2: Guardian Angel Plus (Monthly) */}
          <div className={`bg-surface-dark border rounded-3xl p-7 flex flex-col justify-between transition-all ${
            billingInterval === 'month'
              ? 'border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-primary/40'
              : 'border-white/10 hover:border-white/20'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white tracking-tight">Plus Monthly</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                  Flexible
                </span>
              </div>
              <p className="text-gray-400 text-xs mb-6">
                Full digital legacy coverage with flexible month-to-month billing.
              </p>

              <div className="mb-6">
                <div className="text-4xl font-extrabold text-white tracking-tight">
                  $7.99<span className="text-sm font-normal text-gray-400"> / mo</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Billed monthly, cancel anytime</p>
              </div>

              <Link
                to="/login?mode=signup"
                className={`w-full block text-center font-semibold py-3.5 rounded-xl transition-all text-sm mb-8 ${
                  billingInterval === 'month'
                    ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
              >
                Choose Monthly
              </Link>

              <div className="space-y-3 border-t border-white/[0.08] pt-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-white font-medium">Unlimited file uploads</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-white font-medium">Unlimited trusted recipients</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Continuous dead man's switch timer</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Advance reminder warning emails</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Multi-format file & audio delivery</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Priority email support</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.04] text-[11px] text-gray-500 text-center">
              Includes 24-hour free trial
            </div>
          </div>

          {/* Card 3: Guardian Angel Plus (Annual - Best Value) */}
          <div className="ga-plan-card rounded-3xl p-7 relative flex flex-col justify-between border-2 border-primary shadow-2xl shadow-primary/20 scale-[1.02] -my-2">
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md border border-white/20">
              Most Popular • Save 37%
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white tracking-tight">Plus Annual</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 bg-primary/20 border border-primary/30 px-2.5 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <p className="text-gray-300 text-xs mb-6">
                Uninterrupted year-round peace of mind for you and your family.
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">$59.99</span>
                  <span className="text-sm font-normal text-gray-400">/ year</span>
                </div>
                <div className="inline-block bg-primary/15 text-indigo-200 text-[11px] font-semibold px-2.5 py-0.5 rounded mt-1.5 border border-primary/25">
                  Just $5.00 / month (Save $35.89)
                </div>
              </div>

              <Link
                to="/login?mode=signup"
                className="w-full block text-center bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all text-sm mb-8 shadow-lg shadow-primary/30 active:scale-[0.98]"
              >
                Get Best Value Annual
              </Link>

              <div className="space-y-3 border-t border-white/[0.08] pt-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">verified</span>
                  <span className="text-xs text-white font-semibold">Everything in Plus Monthly</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-white font-medium">Unlimited file uploads & storage</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-white font-medium">Unlimited trusted recipients</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Full 365-day continuous switch coverage</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Customizable check-in intervals</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-indigo-400 text-lg flex-shrink-0">check_circle</span>
                  <span className="text-xs text-gray-300">Priority legacy support assistance</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.04] text-[11px] text-indigo-200 text-center font-medium">
              37% savings vs monthly billing • Cancel anytime
            </div>
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 bg-surface-dark border border-white/[0.08] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-3xl shrink-0">verified_user</span>
            <div>
              <p className="text-sm font-semibold text-white">Risk-Free Peace of Mind</p>
              <p className="text-xs text-gray-400">All signups include our 24-hour full access free trial. No card required to start.</p>
            </div>
          </div>
          <Link
            to="/login?mode=signup"
            className="text-xs font-semibold text-indigo-300 hover:text-white underline underline-offset-4 shrink-0"
          >
            Start Your Free Trial →
          </Link>
        </div>
      </section>

      {/* USE CASES SECTION */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold text-indigo-300 mb-3">
            <span className="material-symbols-outlined text-sm">shield_person</span>
            <span>Tailored For Your Needs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Who relies on Guardian Angel DMS?
          </h2>
          <p className="text-gray-400 text-base mt-4">
            From estate planning to business continuity, prepare for the unexpected with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-dark border border-white/[0.07] rounded-2xl p-5 text-left">
            <span className="material-symbols-outlined text-indigo-300 text-2xl mb-3">family_restroom</span>
            <h3 className="text-white font-semibold text-sm mb-1.5">Parents & Families</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Ensure wills, life insurance policies, property deeds, and personal letters are safely received by your spouse or children.
            </p>
          </div>

          <div className="bg-surface-dark border border-white/[0.07] rounded-2xl p-5 text-left">
            <span className="material-symbols-outlined text-indigo-300 text-2xl mb-3">currency_bitcoin</span>
            <h3 className="text-white font-semibold text-sm mb-1.5">Crypto & Asset Holders</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Don't lose seed phrases or private keys forever. Store encrypted recovery instructions for designated beneficiaries.
            </p>
          </div>

          <div className="bg-surface-dark border border-white/[0.07] rounded-2xl p-5 text-left">
            <span className="material-symbols-outlined text-indigo-300 text-2xl mb-3">business_center</span>
            <h3 className="text-white font-semibold text-sm mb-1.5">Founders & Solopreneurs</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Protect your business continuity. Deliver server credentials, domain registrations, and client account information to your team.
            </p>
          </div>

          <div className="bg-surface-dark border border-white/[0.07] rounded-2xl p-5 text-left">
            <span className="material-symbols-outlined text-indigo-300 text-2xl mb-3">flight</span>
            <h3 className="text-white font-semibold text-sm mb-1.5">Solo Travelers</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Keep medical directives, emergency contacts, and passport copies ready to trigger if you are unable to check in abroad.
            </p>
          </div>
        </div>
      </section>

      {/* SECURITY DEEP DIVE & PRIVACY */}
      <section id="security" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto mb-24 scroll-mt-24">
        <div className="bg-surface-dark border border-white/10 rounded-3xl p-8 sm:p-10 text-left space-y-8">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <span className="material-symbols-outlined text-2xl">lock</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Security & Zero-Knowledge Architecture</h2>
              <p className="text-xs text-gray-400 mt-0.5">Your files stay your files. We cannot access your plaintext vault.</p>
            </div>
          </div>

          {/* Purpose / about — states what the app does and how Google account data is used */}
          <div className="space-y-3 pt-4 border-t border-white/[0.08]">
            <h3 className="text-white font-semibold tracking-tight text-lg">
              What Guardian Angel DMS does
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Guardian Angel DMS (Digital Legacy Management System) safeguards the documents, photos,
              voice recordings, and written messages that matter most to you, and delivers them to the
              people you choose if you are no longer able to do so yourself.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              You upload your files to an encrypted vault and assign each item to specific trusted
              recipients. You then check in on a schedule you set, and every check-in resets your
              countdown timer. If that timer ever expires because you have stopped checking in,
              Guardian Angel DMS automatically emails each recipient only the items you assigned to
              them — nothing else, and no one else.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/[0.08]">
            <h3 className="text-white font-semibold tracking-tight text-lg">
              How Guardian Angel DMS uses your Google account
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Signing in with Google is optional, and we use it only to create and access your
              Guardian Angel DMS account. We request your basic profile and email address so we can
              identify your account and contact you about check-ins. We do not read, store, or share
              any other Google data, and we never sell your information. You can read the full{' '}
              <a href="/privacy.html" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2">
                Privacy Policy
              </a>{' '}
              for details.
            </p>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto mb-24 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold text-indigo-300 mb-3">
            <span className="material-symbols-outlined text-sm">help</span>
            <span>Questions & Answers</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Frequently asked questions
          </h2>
          <p className="text-gray-400 text-sm mt-3">
            Common questions regarding our dead man's switch, encryption, and subscriptions.
          </p>
        </div>

        {/* FAQ List — preserves exact copy for SEO & FAQPage schema in index.html */}
        <div className="space-y-4">
          {[
            {
              q: "What is a digital dead man's switch?",
              a: "A dead man's switch is a countdown timer that resets every time you check in. If you stop checking in and the timer expires, it automatically runs a protocol you configured in advance. In Guardian Angel DMS, that protocol emails your stored files and messages to the recipients you assigned them to.",
            },
            {
              q: 'How are my files protected?',
              a: 'Your files and messages are encrypted with AES-256 before they are stored. Each recipient can only ever receive the specific items you assigned to them — never your full vault.',
            },
            {
              q: 'What happens if I miss a check-in by accident?',
              a: 'You can set a reminder threshold so Guardian Angel DMS emails you before the timer expires. You can also stop or reset the timer at any time from your dashboard.',
            },
            {
              q: 'How much does Guardian Angel DMS cost?',
              a: 'Guardian Angel DMS is $7.99 per month billed monthly, or $59.99 per year billed annually, which works out to $5.00 per month.',
            },
            {
              q: 'Do my recipients need to create an account beforehand?',
              a: 'No. When your protocol activates upon timer expiration, your recipients receive an authenticated email link containing their specifically assigned files and messages. No pre-registration is required for them.',
            },
            {
              q: 'Can I change my files and recipients anytime?',
              a: 'Yes. You can add, edit, reassign, or delete files, messages, and recipients at any time from your dashboard. Your encryption keys remain under your control.',
            },
          ].map((item, idx) => (
            <div
              key={item.q}
              className="bg-surface-dark border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-white/20"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className="text-white font-semibold text-sm sm:text-base">{item.q}</span>
                <span className="material-symbols-outlined text-gray-400 transition-transform duration-200 shrink-0">
                  {activeFaq === idx ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                </span>
              </button>
              {(activeFaq === idx || activeFaq === null) && (
                <div className="px-5 pb-5 pt-0 text-gray-400 text-sm leading-relaxed border-t border-white/[0.04]">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20">
        <div className="rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-[#141925] border border-primary/30 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none -z-10" />

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Protect what matters most today
          </h2>
          <p className="text-gray-300 text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Give your loved ones clarity and security when they need it most. Set up your encrypted vault in under 2 minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/login?mode=signup"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-8 py-4 rounded-xl transition-all shadow-xl shadow-primary/30 active:scale-[0.98] text-center"
            >
              Start Free 24-Hour Trial
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white font-semibold text-sm px-8 py-4 rounded-xl transition-all text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#080b12]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          {/* Brand & Mission */}
          <div className="space-y-3 max-w-sm">
            <Link to="/" className="inline-block">
              <img
                src="/images/New-GrdnAngl-Logo.png"
                alt="Guardian Angel DMS"
                className="h-8 w-auto object-contain mx-auto md:mx-0"
              />
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              Secure digital legacy management system with inactivity-based dead man's switch protocols and client-side encryption.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400 font-medium">
            <button type="button" onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Features</button>
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors cursor-pointer">How It Works</button>
            <button type="button" onClick={() => scrollToSection('security')} className="hover:text-white transition-colors cursor-pointer">Security</button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">Pricing</button>
            <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">FAQ</button>
            <a href="mailto:support@ga.neoncell.ca" className="hover:text-white transition-colors">Support</a>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col md:items-end gap-2 text-xs text-gray-500">
            <div className="flex gap-4 font-semibold text-gray-400 justify-center md:justify-end">
              <a href="/terms.html" className="hover:text-primary transition-colors">Terms of Use</a>
              <a href="/privacy.html" className="hover:text-primary transition-colors">Privacy Policy</a>
            </div>
            <p>© {new Date().getFullYear()} Guardian Angel DMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Splash;

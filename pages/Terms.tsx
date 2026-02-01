
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-dark text-white p-6 max-w-md mx-auto font-display animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface-dark rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Terms of Use</h1>
      </header>

      <div className="space-y-8 pb-20">
        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">The Basics</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Guardian Angel DMS is a service designed to help you share important information with your loved ones in case of an emergency. By using our site, you agree to these simple rules.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Your Responsibility</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-primary font-black">1.</span>
              <p className="text-gray-400 text-sm">Keep your login details safe. If someone else gets in, they might see your private files.</p>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black">2.</span>
              <p className="text-gray-400 text-sm">Only upload content that belongs to you and isn't illegal. No viruses or bad stuff.</p>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black">3.</span>
              <p className="text-gray-400 text-sm">Make sure your emergency contacts actually want to be notified. Don't spam people.</p>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Our Responsibility</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We promise to do our absolute best to keep the site running and your data secure. However, we can't guarantee 100% uptime (nothing on the internet can). We aren't liable if a third-party service (like email or SMS) fails to deliver a notification.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Ending your account</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            You can delete everything and close your account at any time. When you do, we wipe your files from our system. It's permanent.
          </p>
        </section>

        <section className="bg-surface-dark p-6 rounded-2xl border border-gray-800 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
            If you have any questions about these terms, just reach out to our team. We're here to help.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;

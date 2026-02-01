
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-dark text-white p-6 max-w-md mx-auto font-display animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface-dark rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Privacy Rules</h1>
      </header>

      <div className="space-y-8 pb-20">
        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">What we collect</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We only collect what's necessary to make the service work: your email, your emergency contacts' details, and the files you choose to save.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">How we use it</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
              <p className="text-gray-400 text-sm">To verify you're really you.</p>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
              <p className="text-gray-400 text-sm">To send you check-in reminders.</p>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
              <p className="text-gray-400 text-sm">To share your files with your contacts when the timer runs out.</p>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Security</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your files are stored using heavy-duty security. Even our staff can't see the contents of your private messages or files without the unique access keys triggered by the emergency system.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Deleting Data</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            When you delete a file or a contact, it's gone. When you delete your account, we scrub everything. We don't keep "shadow copies" of your deleted life.
          </p>
        </section>

        <section className="bg-surface-dark p-6 rounded-2xl border border-gray-800">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed text-center">
            Last Updated: January 2025. We'll let you know if these rules ever change.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;

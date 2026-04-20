
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-dark text-white p-6 max-w-2xl mx-auto font-display animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface-dark rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Privacy Policy</h1>
      </header>

      <div className="space-y-8 pb-20 text-sm md:text-base">
        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">What We Collect</h2>
          <p className="text-gray-400 leading-relaxed">
            We only collect information necessary to make Guardian Angel DMS work:
          </p>
          <ul className="space-y-2 text-gray-400 mt-3">
            <li>• Your name and email address</li>
            <li>• Your emergency contacts' details (names, emails, phone numbers)</li>
            <li>• Files and messages you choose to save</li>
            <li>• Payment information (processed securely through Stripe)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">How We Use Your Information</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">check_circle</span>
              <div className="text-gray-400">
                <strong className="text-white">Authentication:</strong> To verify your identity and keep your account secure.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">check_circle</span>
              <div className="text-gray-400">
                <strong className="text-white">Service Delivery:</strong> To provide Guardian Angel DMS features, including check-in reminders, emergency notifications, and file distribution.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">check_circle</span>
              <div className="text-gray-400">
                <strong className="text-white">Billing:</strong> To process payments and manage your subscription.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">check_circle</span>
              <div className="text-gray-400">
                <strong className="text-white">Communication:</strong> To send you trial expiration notices, billing updates, and service announcements.
              </div>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Security & Encryption</h2>
          <p className="text-gray-400 leading-relaxed">
            Your data security is our top priority. Your files are protected with encryption both in transit and at rest. Even our staff cannot access the contents of your private messages or files without the unique encryption keys triggered by the emergency system. Your payment information is never directly stored on our servers—it's processed securely through Stripe, a PCI-DSS compliant payment processor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Subscription & Payment Data</h2>
          <p className="text-gray-400 leading-relaxed">
            When you subscribe to Guardian Angel DMS, your payment method is tokenized and stored securely by Stripe. We use Stripe to process recurring charges monthly. We retain billing history for accounting and dispute resolution purposes. You can view and manage your subscription at any time in your account settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Data Sharing</h2>
          <p className="text-gray-400 leading-relaxed mb-3">
            We don't sell your personal information. Your data is shared only when necessary:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li>• <strong className="text-white">Emergency Contacts:</strong> Your designated recipients receive files/messages only when your emergency protocol is triggered.</li>
            <li>• <strong className="text-white">Service Providers:</strong> We share limited data with Stripe (for payments), email providers (for notifications), and Convex (our database and hosting provider).</li>
            <li>• <strong className="text-white">Legal Requests:</strong> We may disclose information if required by law or government request.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Cookies & Session Storage</h2>
          <p className="text-gray-400 leading-relaxed">
            We use your browser's local storage solely to keep you logged in between sessions. We do not use tracking cookies, advertising cookies, or any third-party analytics. No browsing behaviour is tracked or transmitted.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Deleting Your Data</h2>
          <p className="text-gray-400 leading-relaxed">
            When you delete a file or contact, it is permanently removed. When you delete your account, we remove all your personal data from our systems, including files, contacts, and billing records. This is irreversible. Deleted data may be retained in infrastructure backups for up to 30 days before permanent removal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Third-Party Services</h2>
          <p className="text-gray-400 leading-relaxed">
            Guardian Angel DMS uses third-party services including Stripe (payment processing), Convex (database and hosting), and email delivery providers. These services have their own privacy policies. We encourage you to review them, as they process your data according to their own terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Your Rights</h2>
          <p className="text-gray-400 leading-relaxed mb-3">
            You have the following rights regarding your data:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li>• <strong className="text-white">Access:</strong> Request a copy of your personal data</li>
            <li>• <strong className="text-white">Correction:</strong> Update or correct inaccurate information</li>
            <li>• <strong className="text-white">Deletion:</strong> Request deletion of your account and data</li>
            <li>• <strong className="text-white">Opt-Out:</strong> Unsubscribe from marketing communications</li>
          </ul>
          <p className="text-gray-400 leading-relaxed mt-3">
            To exercise any of these rights, contact us at support@grdnangl.com.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Data Retention</h2>
          <p className="text-gray-400 leading-relaxed">
            We retain your personal data only as long as necessary to provide Guardian Angel DMS. Account data is retained until you delete your account. Billing records are retained for 7 years for tax and legal compliance. Deleted data may remain in infrastructure backups for up to 30 days before permanent removal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Children's Privacy</h2>
          <p className="text-gray-400 leading-relaxed">
            Guardian Angel DMS is not intended for children under 13. We do not knowingly collect information from children. If we discover we have collected data from a child under 13, we will delete it immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Changes to This Policy</h2>
          <p className="text-gray-400 leading-relaxed">
            We may update this privacy policy from time to time. Significant changes will be communicated via email or prominent notice on our site. Your continued use of Guardian Angel DMS after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="bg-surface-dark p-6 rounded-2xl border border-gray-800 space-y-3">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed text-center">
            Last Updated: March 2026
          </p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed text-center">
            Questions about privacy? Contact us at support@grdnangl.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;

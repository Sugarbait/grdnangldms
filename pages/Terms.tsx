
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-dark text-white p-6 max-w-2xl mx-auto font-display animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface-dark rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Terms of Use</h1>
      </header>

      <div className="space-y-8 pb-20 text-sm md:text-base">
        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">The Basics</h2>
          <p className="text-gray-400 leading-relaxed">
            Guardian Angel DMS is a digital legacy management service designed to help you securely share important information with your loved ones in case of an emergency. By using our service, you agree to these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Your Responsibility</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">1.</span>
              <p className="text-gray-400">Keep your login details safe. If someone else accesses your account, they may see your private files.</p>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">2.</span>
              <p className="text-gray-400">Only upload content that belongs to you and is legal. No malware, viruses, or illegal content.</p>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">3.</span>
              <p className="text-gray-400">Make sure your emergency contacts have consented to be notified. Don't use this service to spam or harass anyone.</p>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">4.</span>
              <p className="text-gray-400">Keep your contact information current so we can reach you if needed.</p>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Our Responsibility</h2>
          <p className="text-gray-400 leading-relaxed">
            We promise to do our best to keep the service running securely and protect your data. However, we cannot guarantee 100% uptime or zero security breaches (nothing on the internet can). We are not liable if third-party services (like email providers or SMS carriers) fail to deliver notifications, or if there are technical issues beyond our control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Subscription & Billing</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">•</span>
              <div className="text-gray-400">
                <strong className="text-white">Free Trial:</strong> New users receive a 24-hour trial with 5 file uploads included. No credit card required.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">•</span>
              <div className="text-gray-400">
                <strong className="text-white">Paid Subscription:</strong> Guardian Angel Plus costs $1.99/month for unlimited file uploads and all premium features.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">•</span>
              <div className="text-gray-400">
                <strong className="text-white">Automatic Renewal:</strong> Your subscription will automatically renew each month on the same date. We will charge the payment method on file.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">•</span>
              <div className="text-gray-400">
                <strong className="text-white">Cancellation:</strong> You can cancel your subscription anytime through your account settings. Your access will continue until the end of your current billing period. You will not be charged after cancellation.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">•</span>
              <div className="text-gray-400">
                <strong className="text-white">Billing Issues:</strong> We will attempt to charge your payment method on the due date. If payment fails, we may retry, and your account may be suspended until payment is successful.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-black flex-shrink-0">•</span>
              <div className="text-gray-400">
                <strong className="text-white">Refunds:</strong> Since Guardian Angel DMS is a service (not a product) and you have immediate access, refunds are not provided. However, you can cancel anytime to stop future charges.
              </div>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">File Upload Limits</h2>
          <p className="text-gray-400 leading-relaxed">
            File upload limits depend on your subscription status:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li>• <strong className="text-white">Free Trial (24 hours):</strong> 5 file uploads</li>
            <li>• <strong className="text-white">Guardian Angel Plus (Paid):</strong> Unlimited file uploads</li>
            <li>• <strong className="text-white">Trial Expired or Canceled:</strong> View-only (no new uploads)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Ending Your Account</h2>
          <p className="text-gray-400 leading-relaxed">
            You can delete everything and close your account at any time from your account settings. When you delete your account, we permanently remove all your files, contacts, and data from our system. This action is irreversible. If you have an active subscription, any remaining balance will be forfeited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Content Disclaimer</h2>
          <p className="text-gray-400 leading-relaxed">
            You are solely responsible for the content you upload to Guardian Angel DMS. Guardian Angel DMS does not claim ownership of your files. However, by uploading content to our service, you grant us permission to store, process, and transmit your content as necessary to provide the service and fulfill your emergency protocol requests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Liability Limitations</h2>
          <p className="text-gray-400 leading-relaxed">
            Guardian Angel DMS is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from your use of our service. This includes (but is not limited to) loss of data, business interruption, or personal injury. Our total liability is limited to the amount you paid for your subscription in the past 12 months.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-primary font-bold uppercase tracking-widest text-xs">Changes to Terms</h2>
          <p className="text-gray-400 leading-relaxed">
            We may update these terms at any time. If we make significant changes, we'll notify you by email or through the service. Your continued use of Guardian Angel DMS after changes means you accept the new terms.
          </p>
        </section>

        <section className="bg-surface-dark p-6 rounded-2xl border border-gray-800 text-center space-y-3">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
            Last Updated: February 2025
          </p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
            If you have any questions about these terms, please contact us at support@grdnangl.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;

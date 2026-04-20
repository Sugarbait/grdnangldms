
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const createCheckoutSession = useAction(api.stripeActions.createCheckoutSession);
  const getBillingPortalUrl = useAction(api.stripeActions.getPortalUrl);
  const verifySubscription = useAction(api.stripeActions.verifySubscription);

  const userId = localStorage.getItem('guardian_user_id') as Id<"users"> | null;
  const subscriptionData = useQuery(api.subscriptions.getSubscriptionStatus, userId ? { userId } : "skip");
  const isSubscriber = subscriptionData?.tier === 'subscriber';

  // Verify subscription with Stripe after successful checkout
  const hasVerified = useRef(false);
  useEffect(() => {
    const isSuccess = window.location.href.includes('success=true');
    if (isSuccess && userId && !isSubscriber && !hasVerified.current) {
      hasVerified.current = true;
      setIsVerifying(true);
      verifySubscription({ userId: userId as string })
        .then((result) => {
          console.log('[Pricing] Subscription verification result:', result);
        })
        .catch((err) => {
          console.error('[Pricing] Subscription verification failed:', err);
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [userId, isSubscriber]);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem('guardian_user_id');
      if (!userId) {
        navigate('/login');
        return;
      }

      const result = await createCheckoutSession({
        userId: userId,
        successUrl: `${window.location.origin}/#/pricing?success=true`,
        cancelUrl: `${window.location.origin}/#/pricing?cancel=true`,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to create checkout session. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-dark text-white animate-in fade-in duration-500 w-full pb-6">
      {/* Header */}
      <div className="px-6 pt-6 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 bg-surface-dark rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Pricing</h1>
        </div>

        {/* Success/Cancel Messages */}
        {window.location.href.includes('success=true') && (
          <div className="mb-6 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-4">
            <p className="text-green-300 text-sm font-semibold">
              {isVerifying ? '⏳ Verifying your payment...' : '✓ Payment successful! Your subscription is now active.'}
            </p>
          </div>
        )}

        {window.location.search.includes('cancel=true') && (
          <div className="mb-6 bg-amber-500 bg-opacity-20 border border-amber-500 rounded-lg p-4">
            <p className="text-amber-300 text-sm font-semibold">
              Payment was canceled. You can try again anytime.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4">
            <p className="text-red-300 text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2 leading-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 mb-1 text-sm">No setup fees. No surprises. Cancel anytime.</p>
        </div>

        {/* Premium Card - $1.99 or Already Subscribed */}
        {isSubscriber ? (
          <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-2xl p-6 relative ring-2 ring-green-500 ring-opacity-50 mb-10">
            <div className="absolute top-6 right-4 bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full">
              ACTIVE
            </div>

            <h3 className="text-xl font-black mb-2 pr-24">Guardian Angel Plus</h3>
            <p className="text-green-100 text-sm mb-1">You're subscribed</p>
            <p className="text-green-200 text-xs mb-6">Thank you for your support</p>

            <div className="mb-6">
              <div className="text-3xl font-black">$1.99</div>
              <p className="text-green-100 text-xs mt-1">per month, billed monthly</p>
            </div>

            <button
              onClick={async () => {
                if (!subscriptionData?.stripeCustomerId || subscriptionData.stripeCustomerId.startsWith('temp_')) return;
                setIsOpeningPortal(true);
                try {
                  const result = await getBillingPortalUrl({
                    userId: userId as string,
                    returnUrl: window.location.href,
                  });
                  if (result?.url) {
                    window.location.href = result.url;
                  }
                } catch (err: any) {
                  setError(err.message || 'Could not open billing portal.');
                } finally {
                  setIsOpeningPortal(false);
                }
              }}
              disabled={isOpeningPortal}
              className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-300 text-green-700 font-bold py-3 rounded-lg transition-colors mb-6 flex items-center justify-center gap-2"
            >
              {isOpeningPortal ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Opening Portal...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                  Manage Subscription
                </>
              )}
            </button>

            <div className="space-y-3 border-t border-green-400 border-opacity-30 pt-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Unlimited file uploads</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">All features included</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Priority email support</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Auto-renewal each month</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Cancel anytime</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary via-blue-600 to-blue-700 rounded-2xl p-6 relative ring-2 ring-primary ring-opacity-50 mb-10">
            <div className="absolute top-6 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMMENDED
            </div>

            <h3 className="text-xl font-black mb-2 pr-24">Guardian Angel Plus</h3>
            <p className="text-blue-100 text-sm mb-1">The complete solution</p>
            <p className="text-blue-200 text-xs mb-6">Includes 24-hour free trial</p>

            <div className="mb-6">
              <div className="text-3xl font-black">$1.99</div>
              <p className="text-blue-100 text-xs mt-1">per month, billed monthly</p>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-300 text-blue-700 font-bold py-3 rounded-lg transition-colors mb-6"
            >
              {loading ? 'Processing...' : 'Upgrade Now'}
            </button>

            <div className="space-y-3 border-t border-blue-400 border-opacity-30 pt-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Unlimited file uploads</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">All features included</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Priority email support</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Auto-renewal each month</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Cancel anytime</span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Comparison Table */}
        <div className="mb-10 bg-surface-dark rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900 bg-opacity-50">
                  <th className="px-3 py-3 text-left font-bold text-xs">Feature</th>
                  <th className="px-3 py-3 text-center font-bold text-xs">Free Trial</th>
                  <th className="px-3 py-3 text-center font-bold text-xs">Plus</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">File Uploads</td>
                  <td className="px-3 py-3 text-center text-xs">5</td>
                  <td className="px-3 py-3 text-center"><span className="text-primary font-bold text-xs">Unlimited</span></td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">Duration</td>
                  <td className="px-3 py-3 text-center text-xs">24h</td>
                  <td className="px-3 py-3 text-center text-xs">Monthly</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">Recipients</td>
                  <td className="px-3 py-3 text-center text-xs">Unlimited</td>
                  <td className="px-3 py-3 text-center text-xs">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">Timer</td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">Reminders</td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">Notifications</td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-3 text-gray-300 text-xs">2FA</td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                </tr>
                <tr>
                  <td className="px-3 py-3 text-gray-300 text-xs">Auto-Renewal</td>
                  <td className="px-3 py-3 text-center">—</td>
                  <td className="px-3 py-3 text-center"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-10">
          <h3 className="text-lg font-black mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>How does the trial work?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                When you sign up, you get a 24-hour free trial with full access to Guardian Angel DMS. No credit card required! After 24 hours, your account transitions to view-only mode. You can upload new files by upgrading to Guardian Angel Plus.
              </p>
            </details>

            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>Is billing automatic?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Yes! Once you upgrade to Guardian Angel Plus, your subscription will automatically renew every month on the same date. You'll never lose access due to a forgotten renewal. We'll charge your payment method on file each month.
              </p>
            </details>

            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>Can I cancel anytime?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Absolutely! You can cancel your subscription at any time through your account settings. Your access will continue until the end of your current billing period. No questions asked, no penalties.
              </p>
            </details>

            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>What happens to my files if I cancel?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Your files remain safe and accessible for viewing even after cancellation. You just won't be able to upload new files. If you decide to resubscribe later, you'll get access to upload again.
              </p>
            </details>

            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>What payment methods do you accept?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                We accept all major credit and debit cards (Visa, Mastercard, American Express, etc.) through Stripe, our secure payment processor. Your payment information is encrypted and never stored directly on our servers.
              </p>
            </details>

            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>Do you offer refunds?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Since Guardian Angel DMS is a service (not a product) and you have immediate access to all features, we don't offer refunds. However, you can cancel anytime and won't be charged again. We want you to be happy with our service!
              </p>
            </details>

            <details className="bg-surface-dark border border-gray-700 rounded-lg p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-bold text-gray-300">
                <span>Is my payment information secure?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Yes! We use Stripe, a PCI-DSS compliant payment processor trusted by millions of businesses worldwide. Your payment information is encrypted and handled securely. We never see your full credit card details.
              </p>
            </details>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-surface-dark border border-gray-700 rounded-2xl p-5">
          <h4 className="font-bold mb-2 text-sm">Money-Back Guarantee</h4>
          <p className="text-gray-400 text-xs mb-3">
            We're confident you'll love Guardian Angel DMS. If you're not happy with your subscription within the first 7 days, contact our support team for a full refund—no questions asked.
          </p>
          <p className="text-gray-500 text-xs">
            Contact us at support@grdnangl.com or through the help section in your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

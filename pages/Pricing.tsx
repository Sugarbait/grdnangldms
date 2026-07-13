
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
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');

  const PLANS = {
    month: { price: '$7.99', cadence: 'per month, billed monthly' },
    year: { price: '$59.99', cadence: 'per year ($5.00/mo), billed annually' },
  } as const;
  const plan = PLANS[billingInterval];

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
        interval: billingInterval,
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
          <button onClick={() => navigate('/')} className="size-10 rounded-xl bg-surface-dark border border-white/10 flex items-center justify-center hover:border-white/25 transition-colors">
            <span className="material-symbols-outlined text-gray-300">arrow_back</span>
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
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
          <h2 className="text-2xl font-semibold tracking-tight mb-2 leading-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 mb-1 text-sm">No setup fees. No surprises. Cancel anytime.</p>
        </div>

        {/* Billing interval toggle */}
        {!isSubscriber && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-surface-dark border border-white/10 rounded-full p-1">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-colors ${billingInterval === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-gray-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-colors ${billingInterval === 'year' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-gray-400 hover:text-white'}`}
              >
                Annual
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${billingInterval === 'year' ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400'}`}>Save 37%</span>
              </button>
            </div>
          </div>
        )}

        {/* Premium Card or Already Subscribed */}
        {isSubscriber ? (
          <div className="ga-plan-card ga-plan-card-active rounded-[24px] p-6 relative mb-10">
            <div className="absolute top-6 right-4 bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold uppercase tracking-[0.08em] px-3 py-1 rounded-full">
              Active
            </div>

            <h3 className="text-xl font-semibold tracking-tight mb-2 pr-24">Guardian Angel Plus</h3>
            <p className="text-emerald-200 text-sm mb-1">You're subscribed</p>
            <p className="text-gray-400 text-xs mb-6">Thank you for your support</p>

            <div className="mb-6">
              <div className="text-2xl font-semibold tracking-tight">Active</div>
              <p className="text-gray-400 text-xs mt-1">Manage your plan below</p>
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
              className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-300 text-emerald-800 font-semibold py-3 rounded-xl transition-colors mb-6 flex items-center justify-center gap-2"
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

            <div className="space-y-3 border-t border-white/10 pt-6">
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
                <span className="text-sm text-white">Automatic renewal</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-lg flex-shrink-0">check_circle</span>
                <span className="text-sm text-white">Cancel anytime</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="ga-plan-card rounded-[24px] p-6 relative mb-10">
            <div className="absolute top-6 right-4 bg-primary/15 text-primary border border-primary/30 text-[10px] font-semibold uppercase tracking-[0.08em] px-3 py-1 rounded-full">
              Recommended
            </div>

            <h3 className="text-xl font-semibold tracking-tight mb-2 pr-24">Guardian Angel Plus</h3>
            <p className="text-gray-300 text-sm mb-1">The complete solution</p>
            <p className="text-gray-500 text-xs mb-6">Includes 24-hour free trial</p>

            <div className="mb-6">
              <div className="text-3xl font-semibold tracking-tight">{plan.price}</div>
              <p className="text-gray-400 text-xs mt-1">{plan.cadence}</p>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mb-6 shadow-lg shadow-primary/25"
            >
              {loading ? 'Processing...' : 'Upgrade Now'}
            </button>

            <div className="space-y-3 border-t border-white/10 pt-6">
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
                <span className="text-sm text-white">Automatic renewal</span>
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
                  <td className="px-3 py-3 text-center text-xs">Ongoing</td>
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
          <h3 className="text-lg font-semibold tracking-tight mb-4">Frequently asked questions</h3>
          <div className="space-y-4">
            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
                <span>How does the trial work?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                When you sign up, you get a 24-hour free trial with full access to Guardian Angel DMS. No credit card required! After 24 hours, your account transitions to view-only mode. You can upload new files by upgrading to Guardian Angel Plus.
              </p>
            </details>

            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
                <span>Is billing automatic?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Yes! Once you upgrade to Guardian Angel Plus, your subscription automatically renews at the end of each billing period — monthly or annually, depending on the plan you choose. You'll never lose access due to a forgotten renewal, and you can switch plans or cancel anytime.
              </p>
            </details>

            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
                <span>Can I cancel anytime?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Absolutely! You can cancel your subscription at any time through your account settings. Your access will continue until the end of your current billing period. No questions asked, no penalties.
              </p>
            </details>

            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
                <span>What happens to my files if I cancel?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Your files remain safe and accessible for viewing even after cancellation. You just won't be able to upload new files. If you decide to resubscribe later, you'll get access to upload again.
              </p>
            </details>

            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
                <span>What payment methods do you accept?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                We accept all major credit and debit cards (Visa, Mastercard, American Express, etc.) through Stripe, our secure payment processor. Your payment information is encrypted and never stored directly on our servers.
              </p>
            </details>

            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
                <span>Do you offer refunds?</span>
                <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-gray-400 text-sm mt-3">
                Guardian Angel DMS is a service with immediate access to all features, so all sales are final and we don't offer refunds. You can cancel anytime, and you won't be charged again going forward.
              </p>
            </details>

            <details className="bg-surface-dark border border-white/10 rounded-xl p-4 cursor-pointer group">
              <summary className="flex items-center justify-between font-semibold text-sm text-gray-200">
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
          <h4 className="font-bold mb-2 text-sm">Questions?</h4>
          <p className="text-gray-500 text-xs">
            Contact us at support@ga.neoncell.ca or through the help section in your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

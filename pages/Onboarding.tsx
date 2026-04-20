import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface OnboardingProps {
  userId: Id<"users">;
  onLogout?: () => void;
  currentUser?: any;
}

const Onboarding: React.FC<OnboardingProps> = ({ userId, onLogout, currentUser }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  // Verify user is authenticated by checking if userId is valid
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background-dark">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center size-24 rounded-3xl bg-red-500/10 border border-red-500/20">
            <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">
              Authentication Required
            </h1>
            <p className="text-gray-400 text-sm">You must be logged in to access onboarding.</p>
          </div>
          <button
            onClick={() => {
              onLogout?.();
              navigate('/login');
            }}
            className="w-full h-12 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    {
      title: 'Welcome to Guardian Angel DMS',
      subtitle: 'Your Digital Legacy',
      description: 'A secure system to protect and distribute your digital legacy. You have a 24-hour free trial to explore all features -- no credit card required! Let\'s get you started.',
      icon: '',
      action: 'Next',
    },
    {
      title: 'Your Check-In Timer',
      subtitle: 'The Heart of Your Protection',
      description: 'Guardian Angel DMS monitors your activity. Press "I AM ALIVE!" regularly to reset your timer. If you don\'t check in within the set period, your emergency protocol activates and your files are distributed to your trusted recipients.',
      icon: 'schedule',
      action: 'Next',
    },
    {
      title: 'Add Trusted Recipients',
      subtitle: 'Your Emergency Contacts',
      description: 'Navigate to "Recipients" to add people you trust. They\'ll receive your important files if your timer expires. You can manage their access and assign specific files to each recipient.',
      icon: 'person_add',
      action: 'Next',
    },
    {
      title: 'Upload Your Files',
      subtitle: 'Secure Storage',
      description: 'Go to "My Items" to upload documents, photos, messages, and audio files. All content is encrypted with AES-256 military-grade encryption. Only you can decrypt your files.',
      icon: 'upload_file',
      action: 'Next',
    },
    {
      title: 'End-to-End Encryption',
      subtitle: 'Your Privacy Protected',
      description: 'Every file and message you upload is encrypted with a unique key derived from your password. Even our servers cannot access your content. Your privacy is guaranteed.',
      icon: 'lock',
      action: 'Next',
    },
    {
      title: 'Emergency Protocol',
      subtitle: 'When Timer Expires',
      description: 'When your check-in timer expires without a reset, your emergency protocol automatically activates. Your recipients receive emails with access to the files you assigned to them.',
      icon: 'warning',
      action: 'Next',
    },
    {
      title: 'Customize Your Settings',
      subtitle: 'Fine-Tune Your Protection',
      description: 'Visit Settings to customize your check-in timer duration, set up pre-expiry reminders, enable MFA for extra security, and manage your account preferences.',
      icon: 'settings',
      action: 'Next',
    },
    {
      title: 'You\'re All Set!',
      subtitle: 'Ready to Protect Your Legacy',
      description: 'You\'re now ready to use Guardian Angel DMS. Your 24-hour free trial is active -- explore all features and when you\'re ready, upgrade to Guardian Angel Plus for just $1.99/month. Remember to check in regularly!',
      icon: 'check_circle',
      action: 'Go to Dashboard',
      actionPath: '/',
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background-dark relative overflow-hidden font-display">
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-accent-amber/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold uppercase text-center animate-shake leading-relaxed shadow-lg">
            <p>{error}</p>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${index === step
                ? 'bg-primary w-8'
                : index < step
                  ? 'bg-primary/60 w-2'
                  : 'bg-gray-700 w-2'
                }`}
            ></div>
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {step === 0 ? (
              <img
                src="/images/New-GrdnAngl-Logo.png"
                alt="Guardian Angel DMS"
                className="h-auto w-56 object-contain"
              />
            ) : (
              <div className="inline-flex items-center justify-center size-24 rounded-3xl bg-primary/10 border border-primary/20 shadow-2xl shadow-primary/20 relative overflow-hidden">
                <span className="material-symbols-outlined text-primary text-6xl">{currentStep.icon}</span>
                <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Title and Subtitle */}
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2">
              {currentStep.title}
            </h1>
            <p className="text-primary text-[11px] font-black uppercase tracking-widest">
              {currentStep.subtitle}
            </p>
          </div>

          {/* Description */}
          <div className="bg-surface-dark rounded-3xl p-8 border border-gray-800 shadow-xl">
            <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex-1 h-16 bg-surface-dark text-white font-black rounded-2xl border border-gray-800 uppercase tracking-[0.2em] text-xs hover:border-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {step === steps.length - 1 ? (
            <button
              onClick={async () => {
                setIsLoading(true);
                setError(null);

                // If email is not verified, just redirect back to login without error
                if (!currentUser?.emailVerified) {
                  console.log("[Onboarding] Unverified user attempting to complete, redirecting to login");
                  onLogout?.();
                  navigate('/login');
                  return;
                }

                try {
                  console.log("[Onboarding] Completing onboarding for user:", userId);

                  // Verify user exists before completing onboarding
                  if (!userId) {
                    throw new Error("User ID is missing. Please log in again.");
                  }

                  await completeOnboarding({ userId });
                  console.log("[Onboarding] Success! Navigating to dashboard");
                  navigate(currentStep.actionPath || '/');
                } catch (err: any) {
                  console.error("[Onboarding] Error completing onboarding:", err);
                  const errorMsg = err.message || "Failed to complete onboarding. Please try again.";
                  setError(errorMsg);
                  setIsLoading(false);

                  // If user is not found, redirect to login
                  if (errorMsg.includes("User not found") || errorMsg.includes("missing")) {
                    setTimeout(() => {
                      onLogout?.();
                      navigate('/login');
                    }, 2000);
                  }
                }
              }}
              disabled={isLoading || !userId}
              className="flex-1 h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : currentStep.action}
            </button>
          ) : (
            <>
              <button
                onClick={async () => {
                  setIsLoading(true);
                  setError(null);

                  // If email is not verified, just redirect back to login without error
                  if (!currentUser?.emailVerified) {
                    console.log("[Onboarding] Unverified user attempting to skip, redirecting to login");
                    onLogout?.();
                    navigate('/login');
                    return;
                  }

                  try {
                    console.log("[Onboarding] Skipping tutorial for user:", userId);

                    // Verify user exists before completing onboarding
                    if (!userId) {
                      throw new Error("User ID is missing. Please log in again.");
                    }

                    await completeOnboarding({ userId });
                    console.log("[Onboarding] Success! Navigating to dashboard");
                    navigate('/');
                  } catch (err: any) {
                    console.error("[Onboarding] Error skipping tutorial:", err);
                    const errorMsg = err.message || "Failed to skip tutorial. Please try again.";
                    setError(errorMsg);
                    setIsLoading(false);

                    // If user is not found, redirect to login
                    if (errorMsg.includes("User not found") || errorMsg.includes("missing")) {
                      setTimeout(() => {
                        onLogout?.();
                        navigate('/login');
                      }, 2000);
                    }
                  }
                }}
                disabled={isLoading || !userId}
                className="flex-1 h-16 bg-surface-dark text-white font-black rounded-2xl border border-gray-800 uppercase tracking-[0.2em] text-xs hover:border-gray-600 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Skip Tutorial'}
              </button>
              <button
                onClick={() => {
                  if (currentStep.actionPath) {
                    navigate(currentStep.actionPath);
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={isLoading}
                className="flex-1 h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {currentStep.action}
              </button>
            </>
          )}
        </div>

        {/* Step Counter */}
        <div className="text-center text-gray-500 text-[10px] font-black uppercase tracking-widest">
          Step {step + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

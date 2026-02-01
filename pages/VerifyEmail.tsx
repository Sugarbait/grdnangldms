import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const verifyEmailToken = useMutation(api.users.verifyEmailToken);

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid verification link. Please check your email for a valid link.");
      setLoading(false);
      return;
    }

    // Auto-verify on page load
    const verify = async () => {
      try {
        setLoading(true);
        await verifyEmailToken({
          email: decodeURIComponent(email),
          verificationToken: token,
        });
        setVerified(true);
        setError(null);

        // Redirect to MFA setup after 3 seconds
        setTimeout(() => {
          navigate('/mfa-setup');
        }, 3000);
      } catch (err: any) {
        console.error("Verification error:", err);

        // Parse the error to provide a friendly message
        let friendlyError = "The verification link is invalid or has expired.";

        if (err.data) {
          const errorMsg = err.data.toLowerCase();
          if (errorMsg.includes("expired")) {
            friendlyError = "Your verification link has expired. We can send you a new one!";
          } else if (errorMsg.includes("invalid")) {
            friendlyError = "This verification link is invalid. Please check your email for the correct link.";
          } else if (errorMsg.includes("already verified")) {
            friendlyError = "This email has already been verified! You can now log in.";
          }
        } else if (err.message) {
          const errorMsg = err.message.toLowerCase();
          if (errorMsg.includes("expired")) {
            friendlyError = "Your verification link has expired. We can send you a new one!";
          } else if (errorMsg.includes("invalid")) {
            friendlyError = "This verification link is invalid. Please check your email for the correct link.";
          }
        }

        setError(friendlyError);
        setLoading(false);
      }
    };

    verify();
  }, [token, email, verifyEmailToken, navigate]);

  const resendVerificationEmailAction = useAction(api.auth.resendVerificationEmail);

  const handleResendEmail = async () => {
    if (!email) {
      setError("Email address not found. Please check your link.");
      return;
    }

    setResending(true);
    setError(null);
    
    try {
      console.log("[VerifyEmail] Resending verification email to:", email);
      const result = await resendVerificationEmailAction({
        email: decodeURIComponent(email),
      });

      if (result.success) {
        alert(result.message || "Verification email has been sent! Check your inbox.");
      } else {
        setError(result.error || "Failed to resend verification email. Please try again.");
      }
    } catch (err: any) {
      console.error("[VerifyEmail] Resend error:", err);
      setError(err.message || "Failed to resend verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-gray-800 rounded-[32px] p-8 max-w-md w-full text-center">
          <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-6 animate-pulse">
            <span className="material-symbols-outlined text-primary text-5xl">mail</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Verifying Email</h1>
          <p className="text-gray-400 mb-6">Please wait while we confirm your email address...</p>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-green-500/20 rounded-[32px] p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
          <div className="size-20 rounded-3xl bg-green-500/10 flex items-center justify-center border border-green-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Email Verified!</h1>
          <p className="text-gray-400 mb-6">
            Great! Your email address has been verified. Setting up multi-factor authentication...
          </p>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
      <div className="bg-surface-dark border border-red-500/20 rounded-[32px] p-8 max-w-md w-full text-center">
        <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-6">
          <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Verification Failed</h1>
        <p className="text-gray-400 mb-6">{error || "The verification link is invalid or has expired."}</p>

        {!token || !email ? (
          <p className="text-gray-500 text-sm mb-6">
            Please check your email for a valid verification link.
          </p>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">
              Would you like us to send you a new verification link?
            </p>
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full h-12 bg-primary text-white font-black rounded-xl hover:bg-blue-600 transition-colors uppercase tracking-wider text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </>
        )}

        <button
          onClick={() => navigate('/login')}
          className="w-full h-12 bg-gray-800 text-gray-300 font-black rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-[10px] mt-3"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;

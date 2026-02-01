import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { UserProfile } from '../App';

const RecipientCheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const userIdParam = searchParams.get('userId');
  const recipientIdParam = searchParams.get('recipientId');

  const resetViaAuthorization = useMutation(api.timer.resetViaRecipientAuthorization);
  const user = useQuery(api.users.get, userIdParam ? { userId: userIdParam as Id<"users"> } : "skip") as UserProfile | null | undefined;

  useEffect(() => {
    if (!token || !userIdParam || !recipientIdParam) {
      setError("Invalid check-in link. Please check the email for a valid link.");
    }
  }, [token, userIdParam, recipientIdParam]);

  const handleConfirmCheckIn = async () => {
    if (!token || !userIdParam || !recipientIdParam) {
      setError("Missing required parameters");
      return;
    }

    setLoading(true);
    try {
      const result = await resetViaAuthorization({
        userId: userIdParam as Id<"users">,
        recipientId: recipientIdParam as Id<"recipients">,
        authToken: token,
      });

      setConfirmed(true);
      setError(null);

      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error("Check-in error:", err);
      setError(err.message || "Failed to confirm check-in. The link may be invalid or expired.");
      setLoading(false);
    }
  };

  if (!token || !userIdParam || !recipientIdParam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-red-500/20 rounded-[32px] p-8 max-w-md w-full text-center">
          <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Invalid Link</h1>
          <p className="text-gray-400 mb-6">
            This check-in link is invalid or incomplete. Please check your email for a valid link.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 bg-primary text-white font-black rounded-xl hover:bg-blue-600 transition-colors uppercase tracking-wider text-[10px]"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-green-500/20 rounded-[32px] p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
          <div className="size-20 rounded-3xl bg-green-500/10 flex items-center justify-center border border-green-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Check-in Confirmed!</h1>
          <p className="text-gray-400 mb-6">
            Their timer has been reset successfully. Redirecting you now...
          </p>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
      <div className="bg-surface-dark border border-gray-800 rounded-[32px] p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-primary text-5xl">verified_user</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Confirm Check-in</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-8 p-4 bg-background-dark rounded-xl border border-gray-800 text-center">
            <p className="text-gray-400 text-sm mb-3">You're confirming for:</p>
            <p className="text-xl font-black text-white">{user.name}</p>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">
              {user.email}
            </p>
          </div>
        )}

        {/* Message */}
        <div className="mb-8 text-center">
          <p className="text-gray-400 text-sm leading-relaxed">
            By clicking below, you're confirming that <strong>{user?.name || 'this person'}</strong> is alive and safe.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleConfirmCheckIn}
            disabled={loading}
            className="w-full h-14 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition-colors uppercase tracking-wider text-[10px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">
                  <span className="material-symbols-outlined">progress_activity</span>
                </span>
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <span>Confirm Check-In</span>
                <span className="material-symbols-outlined">check_circle</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full h-12 bg-gray-800 text-gray-300 font-black rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-[10px]"
          >
            Cancel
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-[9px] text-gray-500 font-medium">
            This action will reset their check-in timer and prevent their digital legacy files from being sent to recipients.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipientCheckIn;

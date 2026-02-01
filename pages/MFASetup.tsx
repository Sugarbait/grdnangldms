import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

const MFASetup: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpSecret, setTotpSecret] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const generateTOTPSecret = useAction(api.auth.generateTOTPSecretAction);
  const setupMFAAction = useAction(api.auth.setupMFA);

  // Get userId from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('guardian_user_id');
    if (!storedUserId) {
      navigate('/login');
      return;
    }
    setUserId(storedUserId);
  }, [navigate]);

  // Query current user to ensure data is loaded
  const currentUser = useQuery(api.users.get, userId ? { userId } : "skip");

  // Generate TOTP secret when userId is set
  useEffect(() => {
    if (userId) {
      const generateSecret = async () => {
        try {
          const email = localStorage.getItem('guardian_user_email') || 'user@example.com';
          const secret = await generateTOTPSecret({ email });
          setTotpSecret(secret.secret);
        } catch (err: any) {
          console.error("Failed to generate TOTP secret:", err);
          setError("Failed to generate authentication code. Please refresh the page.");
        }
      };
      generateSecret();
    }
  }, [userId, generateTOTPSecret]);

  const handleVerifyCode = async () => {
    if (totpCode.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }

    if (!totpSecret) {
      setError("TOTP secret not loaded. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[MFASetup] Calling setupMFA with userId:", userId);
      const result = await setupMFAAction({
        userId: userId,
        totpSecret: totpSecret,
        totpCode: totpCode,
      });

      console.log("[MFASetup] MFA setup successful");
      setBackupCodes(result.backupCodes);
      setMode('backup');
    } catch (err: any) {
      console.error("[MFASetup] Setup MFA error:", err);
      const errorMsg = err.message || "Failed to verify code. Please try again.";
      console.error("[MFASetup] Error message:", errorMsg);
      console.error("[MFASetup] Full error object:", JSON.stringify(err, null, 2));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyTotpSecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const downloadBackupCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'guardian-angel-backup-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleProceedToDashboard = () => {
    // Wait for currentUser to be loaded before navigating
    if (currentUser === undefined) {
      setError("Loading user data...");
      return;
    }
    navigate('/');
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-gray-800 rounded-[32px] p-8 max-w-md w-full text-center animate-pulse">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-gray-800 rounded-[32px] p-8 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-5xl">verified_user</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Set Up 2FA</h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
          </div>

          {/* Authentication Code Section */}
          <div className="mb-8 p-4 bg-background-dark rounded-xl border border-gray-800">
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-3">Authentication Code</p>
            <div className="flex gap-2 items-center">
              <p className="text-gray-300 font-mono text-lg break-all flex-1">{totpSecret}</p>
              <button
                onClick={copyTotpSecret}
                className="h-10 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors flex-shrink-0"
                title="Copy code"
              >
                <span className="material-symbols-outlined text-lg">
                  {copiedSecret ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-400 text-sm">
              Enter this code manually in Google Authenticator, Authy, or Microsoft Authenticator.
            </p>
          </div>

          {/* Code Input */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-black uppercase tracking-wider mb-2">
              Enter 6-digit code
            </label>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full h-12 bg-background-dark border border-gray-700 rounded-xl text-white text-center text-2xl font-black tracking-widest placeholder-gray-600 focus:border-primary focus:outline-none"
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleVerifyCode}
            disabled={loading || totpCode.length !== 6}
            className="w-full h-12 bg-primary text-white font-black rounded-xl hover:bg-blue-600 transition-colors uppercase tracking-wider text-[10px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">
                  <span className="material-symbols-outlined">progress_activity</span>
                </span>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify Code</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              console.log("[MFASetup] Cancelling MFA setup, returning to login");
              navigate('/login');
            }}
            className="w-full h-12 bg-gray-800 text-gray-300 font-black rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-[10px] mt-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Skip MFA Setup</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'backup') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-gray-800 rounded-[32px] p-8 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="size-20 rounded-3xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mx-auto mb-6">
              <span className="material-symbols-outlined text-amber-500 text-5xl">key</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Save Backup Codes</h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-amber-400 text-sm">
              <strong>Save these codes in a safe place.</strong> You can use them to log in if you lose access to your authenticator app.
            </p>
          </div>

          {/* Backup Codes */}
          <div className="mb-6 p-4 bg-background-dark rounded-xl border border-gray-700 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="bg-surface-dark p-2 rounded border border-gray-700 text-center">
                  <code className="text-gray-300 text-xs font-mono">{code}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Copy Success Message */}
          {copiedBackup && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
              <p className="text-green-400 text-sm">Copied to clipboard!</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 mb-6">
            <button
              onClick={copyBackupCodes}
              className="w-full h-12 bg-gray-800 text-gray-300 font-black rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">content_copy</span>
              <span>{copiedBackup ? 'Copied!' : 'Copy All'}</span>
            </button>

            <button
              onClick={downloadBackupCodes}
              className="w-full h-12 bg-gray-800 text-gray-300 font-black rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">download</span>
              <span>Download</span>
            </button>
          </div>

          {/* Confirmation */}
          <div className="mb-6 p-4 bg-background-dark rounded-xl border border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="saved-codes"
                className="w-4 h-4 rounded"
              />
              <span className="text-gray-400 text-sm">I've saved my backup codes in a safe place</span>
            </label>
          </div>

          {/* Proceed Button */}
          <button
            onClick={handleProceedToDashboard}
            className="w-full h-12 bg-primary text-white font-black rounded-xl hover:bg-blue-600 transition-colors uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
          >
            <span>Proceed to Dashboard</span>
            <span className="material-symbols-outlined">home</span>
          </button>

          <button
            onClick={() => {
              console.log("[MFASetup] Going back to MFA setup");
              setMode('setup');
            }}
            className="w-full h-12 bg-gray-800 text-gray-300 font-black rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-[10px] mt-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
          </button>

          {/* Disclaimer */}
          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-[9px] text-gray-500 font-medium">
              These codes are single-use only. Each code can only be used once for account recovery.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MFASetup;

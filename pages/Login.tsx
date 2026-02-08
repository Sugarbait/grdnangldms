
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { useGoogleLogin } from '@react-oauth/google';

interface LoginProps {
  onLogin: (userId: Id<"users">) => void;
  onOAuthLogin?: (encryptionKey: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'totp' | 'reset' | 'reset-sent';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Getting ready...');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loginAction = useAction(api.auth.loginUser);
  const createAccountAction = useAction(api.auth.createAccount);
  const requestPasswordResetAction = useAction(api.auth.requestPasswordReset);
  const resetPasswordAction = useAction(api.auth.resetPassword);
  const usedBackupCode = useMutation(api.users.usedBackupCode);
  const deriveEncryptionKeyAction = useAction(api.auth.deriveEncryptionKeyAction);
  const createOrUpdateOAuthUserAction = useAction(api.auth.createOrUpdateOAuthUser);
  const verifyTOTPCodeForLoginAction = useAction(api.auth.verifyTOTPCodeForLogin);

  // Handle Microsoft OAuth redirect - index.tsx rewrites #id_token=... to #/login?ms_token=...
  useEffect(() => {
    const hashQuery = window.location.hash.split('?')[1];
    if (!hashQuery) return;
    const params = new URLSearchParams(hashQuery);
    const token = params.get('ms_token');
    if (!token) return;

    // Clean the URL
    window.history.replaceState(null, '', window.location.pathname + '#/login');

    // Decode the JWT
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);

      console.log('[Microsoft OAuth] Token decoded:', decoded);

      // Process the Microsoft sign-in
      setIsLoading(true);
      setProgress(0);
      setStatusText('Authenticating with Microsoft...');

      (async () => {
        try {
          const result = await createOrUpdateOAuthUserAction({
            provider: 'microsoft',
            providerId: decoded.oid || decoded.sub,
            email: decoded.preferred_username || decoded.email,
            name: decoded.name,
            avatarUrl: undefined,
          });

          sessionStorage.setItem('guardian_encryption_key_source', 'oauth');
          localStorage.setItem('guardian_encryption_key_source', 'oauth');

          const sequence = [
            { progress: 25, text: 'Loading your account...' },
            { progress: 50, text: 'Verifying...' },
            { progress: 80, text: 'Almost there...' },
            { progress: 100, text: 'Welcome!' }
          ];

          for (const step of sequence) {
            await new Promise(r => setTimeout(r, 150));
            setProgress(step.progress);
            setStatusText(step.text);
          }

          setTimeout(() => {
            localStorage.setItem('guardian_user_id', result.userId);
            onLogin(result.userId as Id<"users">);
          }, 300);
        } catch (err: any) {
          setError(err.data || err.message || "Microsoft sign-in failed");
          setIsLoading(false);
        }
      })();
    } catch (err) {
      console.error('[Microsoft OAuth] Failed to decode token:', err);
      setError("Microsoft sign-in failed. Please try again.");
    }
  }, []);

  const handleSystemReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleGoogleSignIn = async (tokenResponse: any) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setStatusText('Authenticating with Google...');

    try {
      // Fetch user profile using the access token
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google user info');
      const profile = await res.json();

      const result = await createOrUpdateOAuthUserAction({
        provider: 'google',
        providerId: profile.sub, // Google's unique user ID
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture || undefined,
      });

      // For OAuth users, the encryption key is server-generated
      sessionStorage.setItem('guardian_encryption_key_source', 'oauth');
      localStorage.setItem('guardian_encryption_key_source', 'oauth');

      const sequence = [
        { progress: 25, text: 'Loading your account...' },
        { progress: 50, text: 'Verifying...' },
        { progress: 80, text: 'Almost there...' },
        { progress: 100, text: 'Welcome!' }
      ];

      for (const step of sequence) {
        await new Promise(r => setTimeout(r, 150));
        setProgress(step.progress);
        setStatusText(step.text);
      }

      setTimeout(() => {
        localStorage.setItem('guardian_user_id', result.userId);
        onLogin(result.userId as Id<"users">);
      }, 300);
    } catch (err: any) {
      let message = err.data || err.message || "Google sign-in failed";
      setError(message);
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setStatusText('Authenticating with Microsoft...');

    try {
      // Microsoft OAuth configuration
      const clientId = import.meta.env.VITE_OAUTH_MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID';
      // Use origin + pathname only (no hash) — Microsoft will append #id_token=... to this
      const redirectUri = window.location.origin + window.location.pathname;
      const responseType = 'id_token';
      const scope = 'openid profile email';

      // Generate a nonce for security
      const nonce = Math.random().toString(36).substring(7);
      sessionStorage.setItem('ms_oauth_nonce', nonce);

      // Build Microsoft OAuth URL — response_mode=fragment returns id_token in URL hash
      const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=${encodeURIComponent(responseType)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&nonce=${encodeURIComponent(nonce)}&response_mode=fragment`;

      // Redirect to Microsoft login
      window.location.href = msAuthUrl;
    } catch (err: any) {
      let message = err.message || "Microsoft sign-in failed";
      setError(message);
      setIsLoading(false);
    }
  };

  const startAuthSequence = async (targetMode: AuthMode) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setStatusText('Signing in...');

    try {
      let newUserId: Id<"users"> | null = null;
      let mfaEnabled = false;

      if (targetMode === 'login') {
        const result = await loginAction({ email, password });
        newUserId = result.userId;
        mfaEnabled = result.mfaEnabled;
      } else if (targetMode === 'signup') {
        const result = await createAccountAction({ name, email, password });
        newUserId = result.userId;
        // New signups need email verification, not redirected to login yet
      }

      if (!newUserId && targetMode !== 'forgot') {
        throw new Error("Something went wrong. Please try again.");
      }

      const sequence = [
        { progress: 25, text: 'Loading your account...' },
        { progress: 50, text: 'Verifying...' },
        { progress: 80, text: 'Almost there...' },
        { progress: 100, text: 'Welcome!' }
      ];

      // Derive and store encryption key if login is successful
      if (newUserId && targetMode === 'login') {
        try {
          const keyResult = await deriveEncryptionKeyAction({ password });
          sessionStorage.setItem('guardian_encryption_key', keyResult.encryptionKey);
          // Also store in localStorage for multi-device support
          localStorage.setItem('guardian_encryption_key', keyResult.encryptionKey);
        } catch (keyError) {
          console.error("[LOGIN] Failed to derive encryption key:", keyError);
        }
      }

      for (const step of sequence) {
        await new Promise(r => setTimeout(r, 150));
        setProgress(step.progress);
        setStatusText(step.text);
      }

      setTimeout(async () => {
        if (targetMode === 'signup') {
          // Signup success - need to verify email
          localStorage.setItem('guardian_user_id', newUserId!.toString());
          localStorage.setItem('guardian_user_email', email);
          setSuccessMessage("Account created! Check your email to verify your address.");
          setTimeout(() => {
            setSuccessMessage(null);
            setMode('login');
          }, 8000);
        } else if (newUserId && mfaEnabled) {
          // MFA enabled - show TOTP input
          localStorage.setItem('guardian_user_id', newUserId.toString());
          localStorage.setItem('guardian_user_email', email);
          setUserId(newUserId);
          setMode('totp');
        } else if (newUserId) {
          // No MFA - proceed to dashboard directly (encryption key already derived)
          onLogin(newUserId);
        } else if (targetMode === 'forgot') {
          setSuccessMessage("A password reset email has been sent to you.");
          setTimeout(() => {
            setSuccessMessage(null);
            setMode('login');
          }, 8000);
        }
        setIsLoading(false);
      }, 300);

    } catch (err: any) {
      // CONVEX ERROR INTERCEPTOR
      // 'err.data' contains the ConvexError message.
      // Generic 'Server Error' means the function crashed or indices are missing.
      let message = err.data || err.message || "Unknown error occurred.";

      if (message.includes("Server Error")) {
        message = "Connection problem. This usually happens with old sessions. Please try 'Reset Session' below.";
      }

      setError(message);
      setIsLoading(false);
    }
  };

  const handleTOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setError("Session lost. Please login again.");
      return;
    }

    if (totpCode.length !== 6 && totpCode.length !== 8) {
      setError("Please enter a valid 6-digit code or 8-character backup code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let valid = false;

      if (totpCode.length === 8) {
        // Backup code - verify it's valid
        const result = await usedBackupCode({ userId, backupCode: totpCode });
        valid = result.valid;
      } else {
        // 6-digit TOTP code - verify against the user's TOTP secret
        const result = await verifyTOTPCodeForLoginAction({ userId: userId.toString(), token: totpCode });
        valid = result.valid;
      }

      if (!valid) {
        throw new Error("Invalid authentication code. Please try again.");
      }

      // Success - proceed to dashboard
      setTimeout(() => {
        onLogin(userId);
      }, 200);
    } catch (err: any) {
      // Better error handling for different error formats
      let errorMessage = "Failed to verify code.";

      if (err.data) {
        errorMessage = err.data;
      } else if (err.message) {
        errorMessage = err.message;
      }

      console.error("[TOTP] Error verifying code:", err);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError("Passwords don't match.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }

    try {
      await resetPasswordAction({ email, resetToken, newPassword });
      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        setSuccessMessage(null);
        setMode('login');
        setEmail('');
        setPassword('');
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsLoading(false);
      }, 2000);
    } catch (err: any) {
      setError(err.data || err.message || "Failed to reset password.");
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
      if (!name) {
        setError("Name is required.");
        return;
      }
      // Use normalized email for signup
      setEmail(normalizedEmail);
      startAuthSequence('signup');
    } else if (mode === 'forgot') {
      if (!email) {
        setError("Email is required.");
        return;
      }
      setError(null);
      requestPasswordResetAction({ email: normalizedEmail })
        .then(() => {
          setMode('reset-sent');
        })
        .catch((err: any) => {
          setError(err.data || err.message || "Failed to send reset email.");
        });
    } else {
      if (email && password) {
        // Use normalized email for login
        setEmail(normalizedEmail);
        startAuthSequence('login');
      } else {
        setError("Please enter your email and password.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark relative overflow-hidden font-display">
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-accent-amber/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center space-y-3">
            <img
              src="https://grdnangl.digitalac.app/images/grdnangl-full.png"
              alt="Guardian Angel DMS Logo"
              className="w-80 h-auto mx-auto object-contain"
            />
            <p className="text-gray-400 text-[11px] font-medium tracking-wide">Secure Digital Legacy Management</p>
            {mode !== 'login' && (
              <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : mode === 'reset' ? 'Set New Password' : mode === 'totp' ? 'Verify Code' : mode === 'reset-sent' ? 'Check Your Email' : ''}
                </h1>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Your Digital Legacy</p>
              </div>
            )}
          </div>


        {isLoading ? (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-surface-dark/50 border border-primary/20 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{statusText}</span>
                <span className="text-[10px] font-black text-white">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_#1754cf]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : mode === 'totp' ? (
          <form onSubmit={handleTOTPSubmit} className="space-y-4">
            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-[11px] font-bold uppercase text-center animate-in fade-in duration-300 leading-relaxed shadow-lg">
                <p>{successMessage}</p>
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold uppercase text-center animate-shake leading-relaxed shadow-lg">
                <div className="flex flex-col gap-3">
                  <p>{error}</p>
                  {error.includes("Connection problem") && (
                    <button
                      type="button"
                      onClick={handleSystemReset}
                      className="text-[9px] bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Reset Session
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Authentication Code
              </label>
              <p className="text-gray-400 text-[11px] mb-3">
                Enter the 6-digit code from your authenticator app, or use an 8-character backup code.
              </p>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))}
                placeholder="000000 or XXXXXXXX"
                className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white text-center text-lg font-mono focus:border-primary transition-all"
                maxLength={8}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || (totpCode.length !== 6 && totpCode.length !== 8)}
              className="w-full h-16 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setTotpCode('');
                  setError(null);
                  setUserId(null);
                }}
                className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
              >
                Back to <span className="text-primary">Sign In</span>
              </button>
            </div>
          </form>
        ) : mode === 'reset-sent' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 rounded-2xl p-8 space-y-4 text-center">
              <div className="flex justify-center mb-2">
                <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Email Sent!</h2>
              <p className="text-gray-300 text-[12px] leading-relaxed">
                We've sent a password reset link to:
              </p>
              <p className="text-primary font-bold text-sm">{email}</p>
            </div>

            <div className="bg-surface-dark border border-gray-700 rounded-2xl p-6 space-y-4">
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">info</span>
                  Next Steps
                </h3>
                <ol className="space-y-3 text-gray-300 text-[11px] leading-relaxed">
                  <li className="flex gap-3">
                    <span className="text-primary font-black flex-shrink-0">1.</span>
                    <span>Check your inbox and spam folder for an email from Guardian Angel DMS</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-black flex-shrink-0">2.</span>
                    <span>Click the "Reset Password" button or copy the reset link</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-black flex-shrink-0">3.</span>
                    <span>Enter your new password (minimum 8 characters)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-black flex-shrink-0">4.</span>
                    <span>You'll be signed back in automatically</span>
                  </li>
                </ol>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Security Note</p>
                <p className="text-gray-400 text-[10px] leading-relaxed">
                  This reset link expires in <span className="text-primary font-bold">1 hour</span>. If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setEmail('');
                  setError(null);
                }}
                className="w-full h-16 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-[0.98]"
              >
                Back to Sign In
              </button>
              <p className="text-gray-500 text-[10px] text-center">
                Didn't receive an email? <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        ) : mode === 'reset' ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-[11px] font-bold uppercase text-center animate-in fade-in duration-300 leading-relaxed shadow-lg">
                <p>{successMessage}</p>
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold uppercase text-center animate-shake leading-relaxed shadow-lg">
                <div className="flex flex-col gap-3">
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Reset Token</label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste token from reset email"
                className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !resetToken || !newPassword || !confirmNewPassword}
              className="w-full h-16 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetToken('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setError(null);
                }}
                className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
              >
                Back to <span className="text-primary">Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 text-[11px] font-bold uppercase text-center animate-in fade-in duration-300 leading-relaxed shadow-lg">
                <p>{successMessage}</p>
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[11px] font-bold uppercase text-center animate-shake leading-relaxed shadow-lg">
                <div className="flex flex-col gap-3">
                  <p>{error}</p>
                  {error.includes("Connection problem") && (
                    <button
                      type="button"
                      onClick={handleSystemReset}
                      className="text-[9px] bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Reset Session
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); setError(null); }} className="text-[10px] font-bold text-primary uppercase">Forgot?</button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full h-16 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-[0.98] mt-4"
            >
              {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Email' : 'Sign In'}
            </button>

            {mode === 'login' && (
              <div className="pt-6 space-y-4 border-t border-gray-700">
                <p className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Or sign in with</p>
                <div className="space-y-3">
                  <GoogleLoginButton
                    onSuccess={handleGoogleSignIn}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                    isLoading={isLoading}
                  />
                  <MicrosoftLoginButton
                    onSignIn={handleMicrosoftSignIn}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 text-center space-y-2">
              {mode === 'login' ? (
                <button type="button" onClick={() => { setMode('signup'); setError(null); }} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  New user? <span className="text-primary">Create Account</span>
                </button>
              ) : (
                <button type="button" onClick={() => { setMode('login'); setError(null); }} className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Back to Sign In
                </button>
              )}
              <p className="text-gray-600 text-[9px] flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                End-to-End Encrypted • AES-256 protected
              </p>
            </div>
          </form>
        )}
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

interface OAuthButtonProps {
  onSuccess: (response: any) => void;
  onError: () => void;
  isLoading: boolean;
}

/**
 * Google Login Button Component
 */
const GoogleLoginButton: React.FC<OAuthButtonProps> = ({ onSuccess, onError, isLoading }) => {
  const googleClientId = import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID;

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('[Google OAuth] Success:', tokenResponse);
      onSuccess(tokenResponse);
    },
    onError: () => {
      console.error('[Google OAuth] Error');
      onError();
    },
  });

  const handleClick = () => {
    if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      alert('❌ Google OAuth not configured!\n\nPlease add your Google Client ID to .env.local:\nVITE_OAUTH_GOOGLE_CLIENT_ID=your-client-id');
      return;
    }
    console.log('[Google OAuth] Initiating sign-in...');
    login();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full h-14 bg-gray-800 text-white font-bold rounded-2xl hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
      title="Sign in with Google"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span className="text-sm">Continue with Google</span>
    </button>
  );
};

/**
 * Microsoft Login Button Component
 */
const MicrosoftLoginButton: React.FC<{ onSignIn: () => void; isLoading: boolean }> = ({ onSignIn, isLoading }) => {
  const microsoftClientId = import.meta.env.VITE_OAUTH_MICROSOFT_CLIENT_ID;

  const handleClick = () => {
    if (!microsoftClientId || microsoftClientId === 'YOUR_MICROSOFT_CLIENT_ID_HERE') {
      alert('❌ Microsoft OAuth not configured!\n\nPlease add your Microsoft Client ID to .env.local:\nVITE_OAUTH_MICROSOFT_CLIENT_ID=your-client-id\n\nSee OAUTH_CREDENTIALS_SETUP.md for instructions.');
      return;
    }
    console.log('[Microsoft OAuth] Initiating sign-in...');
    onSignIn();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full h-14 bg-gray-800 text-white font-bold rounded-2xl hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
      title="Sign in with Microsoft"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
      <span className="text-sm">Continue with Microsoft</span>
    </button>
  );
};

export default Login;

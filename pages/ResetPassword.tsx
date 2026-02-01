import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const resetPassword = useAction(api.auth.resetPassword);

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid reset link. Please check your email for a valid link.");
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        email: decodeURIComponent(email!),
        resetToken: token!,
        newPassword: password,
      });
      setSuccess(true);
      setError(null);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "Failed to reset password. The link may have expired.");
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-red-500/20 rounded-[32px] p-8 max-w-md w-full text-center">
          <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Invalid Reset Link</h1>
          <p className="text-gray-400 mb-6">{error || "The reset link is invalid or missing required parameters."}</p>

          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-primary text-white font-black rounded-xl hover:bg-blue-600 transition-colors uppercase tracking-wider text-[10px]"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="bg-surface-dark border border-green-500/20 rounded-[32px] p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
          <div className="size-20 rounded-3xl bg-green-500/10 flex items-center justify-center border border-green-500/20 mx-auto mb-6">
            <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Password Reset!</h1>
          <p className="text-gray-400 mb-6">
            Your password has been successfully reset. Redirecting to login...
          </p>
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
      <div className="bg-surface-dark border border-gray-800 rounded-[32px] p-8 max-w-md w-full">
        <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-5xl">lock_reset</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2 text-center">Reset Password</h1>
        <p className="text-gray-400 text-center mb-6">Enter your new password below.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password Field */}
          <div className="relative">
            <label htmlFor="password" className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="w-full h-12 bg-gray-900 border border-gray-700 rounded-xl px-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors [appearance:textfield]"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full h-12 bg-gray-900 border border-gray-700 rounded-xl px-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors [appearance:textfield]"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white font-black rounded-xl hover:bg-blue-600 transition-colors uppercase tracking-wider text-[10px] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

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

export default ResetPassword;

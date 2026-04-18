
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient, useQuery, useMutation, useAction } from 'convex/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { api } from './convex/_generated/api';
import { Id } from './convex/_generated/dataModel';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Recipients from './pages/Recipients';
import Settings from './pages/Settings';
import UploadWizard from './pages/UploadWizard';
import AddRecipient from './pages/AddRecipient';
import ProtocolActive from './pages/ProtocolActive';
import RecipientCheckIn from './pages/RecipientCheckIn';
import VerifyEmail from './pages/VerifyEmail';
import MFASetup from './pages/MFASetup';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Pricing from './pages/Pricing';
import Onboarding from './pages/Onboarding';
import Splash from './pages/Splash';
import Toast from './components/Toast';

// Initialize Convex Client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Get Google OAuth Client ID from environment
const googleClientId = import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID || 'your-google-client-id';

// Component to scroll to top on route change
const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
};

export interface UserProfile {
  _id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  mfaSetupRequired?: boolean;
  subscriptionStatus?: string;
}

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('guardian_user_id'));
  const [userId, setUserId] = useState<Id<"users"> | null>(localStorage.getItem('guardian_user_id') as Id<"users"> | null);
  const [testModeActive, setTestModeActive] = useState(false);

  const currentUser = useQuery(api.users.get, userId ? { userId } : "skip") as UserProfile | null | undefined;
  const files = useQuery(api.files.list, userId ? { userId } : "skip") || [];
  const recipients = useQuery(api.recipients.list, userId ? { userId } : "skip") || [];
  const timerData = useQuery(api.timer.get, userId ? { userId } : "skip");
  const subscriptionData = useQuery(api.subscriptions.getSubscriptionStatus, userId ? { userId } : "skip");

  // Trial/subscription gating
  // Default canAccessFeatures to true ONLY while loading (subscriptionData undefined)
  // Once loaded, use actual value — guest/expired users get false
  const isSubLoading = subscriptionData === undefined;
  const canAccessFeatures = isSubLoading ? true : (subscriptionData?.canAccessPaidFeatures ?? false);
  const isTrialUser = subscriptionData?.isTrialActive ?? false;
  const trialEndsAt = subscriptionData?.trialEndsAt ?? 0;
  const subStatus = subscriptionData?.status ?? "guest";
  const userTier = (subscriptionData as any)?.tier ?? "guest";

  // Check-in alert notification query
  const checkInAlert = useQuery(api.timer.getCheckInAlertNotification, userId ? { userId } : "skip");

  const resetTimer = useMutation(api.timer.reset);
  const fullReset = useMutation(api.users.fullReset);
  const checkAndTriggerTimer = useMutation(api.timer.checkAndTrigger);
  const checkAndSendReminder = useAction(api.emails.checkAndSendReminder);
  const stopTimer = useMutation(api.timer.stop);

  // 15-minute session timeout (900,000 milliseconds)
  const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
  const { getTimeRemaining: getSessionTimeRemaining } = useSessionTimeout({
    timeout: SESSION_TIMEOUT_MS,
    onTimeout: () => handleLogout(),
    enabled: isAuthenticated && currentUser?.emailVerified
  });

  // SESSION VALIDATION: Only logout if user is confirmed deleted after multiple failed attempts
  // This prevents logout during server restarts, code changes, or temporary connection issues
  const [nullCheckCount, setNullCheckCount] = useState(0);
  const nullCheckTimeoutRef = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (userId && currentUser === null) {
      // Increment the null check count
      setNullCheckCount(prev => {
        const newCount = prev + 1;
        console.log(`[SESSION] User not found on server (attempt ${newCount})`);

        // Only logout after 5 consecutive null checks over 15+ seconds
        // This ensures temporary connection issues don't cause logout
        if (newCount >= 5) {
          console.warn("Session expired. User not found on server after multiple checks. Logging out.");
          handleLogout();
          return 0;
        }

        // Reset count after 5 seconds if we get a successful load
        if (!nullCheckTimeoutRef.current) {
          nullCheckTimeoutRef.current = setTimeout(() => {
            setNullCheckCount(0);
            nullCheckTimeoutRef.current = undefined;
          }, 5000);
        }

        return newCount;
      });
    } else if (userId && currentUser !== undefined && currentUser !== null) {
      // User successfully loaded, reset the null check counter
      setNullCheckCount(0);
      if (nullCheckTimeoutRef.current) {
        clearTimeout(nullCheckTimeoutRef.current);
        nullCheckTimeoutRef.current = undefined;
      }
    }
  }, [userId, currentUser]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (nullCheckTimeoutRef.current) {
        clearTimeout(nullCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleLogin = (newUserId: Id<"users">) => {
    localStorage.setItem('guardian_user_id', newUserId);
    setUserId(newUserId);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('guardian_user_id');
    localStorage.removeItem('guardian_encryption_key');
    sessionStorage.removeItem('guardian_encryption_key');
    sessionStorage.removeItem('guardian_encryption_key_source');
    setUserId(null);
    setIsAuthenticated(false);
  };

  // Track whether we've locally determined trigger state (persists across renders)
  const [localTriggerState, setLocalTriggerState] = useState(false);

  // Determine if protocol should be active based on server status OR local trigger
  const isTriggered = testModeActive ||
                      timerData?.status === 'triggered' ||
                      localTriggerState;

  // Timer state: track server time and when we received it
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null);
  const [lastServerSeconds, setLastServerSeconds] = useState<number | null>(null);
  const [serverRefreshTime, setServerRefreshTime] = useState<number>(Date.now());

  // When server data changes, sync our display
  useEffect(() => {
    if (timerData) {
      // If server says triggered, sync local state
      if (timerData.status === 'triggered') {
        setLocalTriggerState(true);
      }
      // If server says stopped, stop the countdown
      else if (timerData.status === 'stopped') {
        setLocalTriggerState(false);
        setLastServerSeconds(null);
        setDisplaySeconds(0);
      }
      // If server says active and we're not in test mode, reset local trigger state
      else if (timerData.status === 'active' && !testModeActive) {
        setLocalTriggerState(false);
        setLastServerSeconds(timerData.remainingSeconds);
        setDisplaySeconds(timerData.remainingSeconds);
        // CRITICAL: Calculate when lastReset happened to properly sync countdown
        // The server's remainingSeconds is calculated at the server's time
        // When we receive it, we're immediately in the past relative to the server
        // So we use Date.now() as the sync point, not a calculated past time
        //
        // This prevents the accumulation of small time discrepancies that cause
        // the client to trigger ~10 seconds early on short timers
        //
        // We set serverRefreshTime to RIGHT NOW when we get the data
        setServerRefreshTime(Date.now());
        setLastServerSeconds(timerData.remainingSeconds);
      }
    }
  }, [timerData?.remainingSeconds, timerData?.lastReset, timerData?.status, testModeActive, timerData?.durationSeconds]);

  // Client-side countdown: subtract elapsed milliseconds from server value
  useEffect(() => {
    if (!isAuthenticated || isTriggered || lastServerSeconds === null || !canAccessFeatures) return;

    let hasTriggered = false;

    const interval = setInterval(async () => {
      const elapsedMs = Date.now() - serverRefreshTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const newDisplay = Math.max(0, lastServerSeconds - elapsedSeconds);
      setDisplaySeconds(newDisplay);

      // If we reach 0 or go negative, trigger the mutation to update server status
      // Note: We trigger at 0 (not a higher threshold) because the server uses a 2-second
      // tolerance window (remaining <= 2) to handle network latency and client-server sync issues
      if (newDisplay <= 0 && !hasTriggered) {
        hasTriggered = true;
        clearInterval(interval as any);
        if (userId) {
          try {
            console.log("[TIMER] Client countdown reached 0, triggering emergency mode...");
            const result = await checkAndTriggerTimer({ userId });
            console.log("[TIMER] checkAndTriggerTimer result:", result);
            // Immediately set local trigger state to show ProtocolActive
            // This prevents waiting for server query to refresh
            setLocalTriggerState(true);
          } catch (error) {
            console.error("[TIMER] Failed to trigger timer:", error);
            // Still trigger locally even if server call fails
            setLocalTriggerState(true);
          }
        }
      }
    }, 100); // Update more frequently for smooth display

    return () => clearInterval(interval);
  }, [isAuthenticated, isTriggered, lastServerSeconds, serverRefreshTime, userId, checkAndTriggerTimer, canAccessFeatures]);

  // Check for reminder emails periodically (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated || !userId || isTriggered) return;

    const checkReminder = async () => {
      try {
        await checkAndSendReminder({ userId });
      } catch (error) {
        console.log("[Reminder Check] No reminder action needed or error:", error);
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, userId, isTriggered, checkAndSendReminder]);

  // Check-in alert toast notification
  const [dismissedAlertAt, setDismissedAlertAt] = useState<number | null>(null);
  const showCheckInAlertToast = checkInAlert &&
    checkInAlert.sentAt &&
    dismissedAlertAt !== checkInAlert.sentAt;

  const timerSeconds = displaySeconds ?? 604800;

  // Loading State
  if (userId && currentUser === undefined && isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-10 text-center">
        <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Loading</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Getting your account ready...</p>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      {showCheckInAlertToast && checkInAlert && (
        <Toast
          icon="notifications_active"
          onClose={() => setDismissedAlertAt(checkInAlert.sentAt)}
          message={
            <div>
              <p className="font-semibold text-white mb-1">Check-in alert sent</p>
              {checkInAlert.recipients.map((r, i) => (
                <p key={i}>
                  <span className="text-amber-400 font-medium">{r.name}</span>
                  {' — '}
                  {new Date(checkInAlert.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' at '}
                  {new Date(checkInAlert.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              ))}
            </div>
          }
        />
      )}
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated && currentUser?.emailVerified ? 
              <Navigate to="/" replace /> 
            : 
              <Login onLogin={handleLogin} />
          }
        />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/mfa-setup" element={<MFASetup />} />
        <Route path="/recipient-checkin" element={<RecipientCheckIn />} />
        <Route
          path="/onboarding"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !currentUser?.emailVerified ? (
              // Redirect unverified users back to login
              <Navigate to="/login" replace />
            ) : currentUser?.onboardingComplete ? (
              <Navigate to="/" replace />
            ) : (
              <Onboarding userId={userId!} onLogout={handleLogout} currentUser={currentUser} />
            )
          }
        />
        <Route
          path="/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/splash" replace />
            ) : !currentUser?.emailVerified ? (
              <Navigate to="/login" replace />
            ) : (
              <Layout
                canAccessFeatures={canAccessFeatures}
                isTrialUser={isTrialUser}
                trialEndsAt={trialEndsAt}
                userTier={userTier}
                currentUser={currentUser}
                getSessionTimeRemaining={getSessionTimeRemaining}
                onSessionTimeout={handleLogout}
              >
                <Routes>
                  <Route
                    path="/"
                    element={
                      !currentUser?.onboardingComplete ? (
                        <Navigate to="/onboarding" replace />
                      ) : isTriggered ? (
                        <ProtocolActive
                          recipients={recipients}
                          files={files}
                          onCancel={() => {
                            setTestModeActive(false);
                            setLocalTriggerState(false);
                            userId && resetTimer({ userId });
                          }}
                          isTestMode={testModeActive}
                          userId={userId}
                        />
                      ) : (
                        <Dashboard
                          timerSeconds={timerSeconds}
                          onCheckIn={() => userId && resetTimer({ userId })}
                          fileCount={files.length}
                          recipientCount={recipients.length}
                          currentUser={currentUser || { name: 'Identity', email: '', avatarUrl: '' }}
                          canAccessFeatures={canAccessFeatures}
                          isTrialUser={isTrialUser}
                          userTier={userTier}
                          trialEndsAt={trialEndsAt}
                          subscriptionStatus={subStatus}
                        />
                      )
                    }
                  />
                  <Route path="/vault" element={<Vault userId={userId!} canAccessFeatures={canAccessFeatures} />} />
                  <Route path="/recipients" element={<Recipients recipients={recipients} files={files} canAccessFeatures={canAccessFeatures} />} />
                  <Route path="/settings" element={
                    <Settings
                      onResetAll={() => userId && fullReset({ userId })}
                      onTestTrigger={() => setTestModeActive(true)}
                      onLogout={handleLogout}
                      onStopTimer={() => userId && stopTimer({ userId })}
                      currentUser={currentUser || { name: 'Identity', email: '', avatarUrl: '' }}
                      userId={userId!}
                      fileCount={files.length}
                      recipientCount={recipients.length}
                      userTier={userTier}
                      isTrialUser={isTrialUser}
                      trialEndsAt={trialEndsAt}
                    />
                  } />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/upload" element={<UploadWizard recipients={recipients} userId={userId!} canAccessFeatures={canAccessFeatures} />} />
                  <Route path="/add-recipient" element={<AddRecipient userId={userId!} recipientCount={recipients.length} canAccessFeatures={canAccessFeatures} />} />
                </Routes>
              </Layout>
            )
          } 
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => (
  <ConvexProvider client={convex}>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppContent />
    </GoogleOAuthProvider>
  </ConvexProvider>
);

export default App;

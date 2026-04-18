import { useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutProps {
  timeout: number; // in milliseconds
  onTimeout: () => void;
  enabled?: boolean;
}

export const useSessionTimeout = ({
  timeout,
  onTimeout,
  enabled = true
}: UseSessionTimeoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  }, [timeout, onTimeout, enabled]);

  const getTimeRemaining = useCallback((): number => {
    const elapsed = Date.now() - lastActivityRef.current;
    return Math.max(0, timeout - elapsed);
  }, [timeout]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Activity events to monitor
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Reset timeout on any activity
    const handleActivity = () => {
      resetTimeout();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout, enabled]);

  return {
    resetTimeout,
    getTimeRemaining
  };
};

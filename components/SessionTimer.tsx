import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  getTimeRemaining: () => number;
  onLogout: () => void;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  getTimeRemaining,
  onLogout
}) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining());
    };

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    // Update immediately
    updateTimer();

    return () => clearInterval(interval);
  }, [getTimeRemaining]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerState = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));

    if (minutes <= 2) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        iconColor: 'text-red-500',
        pulse: true,
        urgency: 'critical'
      };
    } else if (minutes <= 5) {
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        iconColor: 'text-amber-500',
        pulse: false,
        urgency: 'warning'
      };
    } else {
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        iconColor: 'text-green-500',
        pulse: false,
        urgency: 'normal'
      };
    }
  };

  const timerState = getTimerState(timeRemaining);

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-300 ${timerState.bgColor} ${timerState.borderColor} ${timerState.pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="material-symbols-outlined text-lg" style={{ color: timerState.iconColor === 'text-red-500' ? '#ef4444' : timerState.iconColor === 'text-amber-500' ? '#f59e0b' : '#10b981' }}>
          {timerState.urgency === 'critical' ? 'schedule' : 'schedule'}
        </span>

        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-semibold ${timerState.color}`}>
            {formatTime(timeRemaining)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {timerState.urgency === 'critical'
              ? 'Session expiring!'
              : timerState.urgency === 'warning'
              ? 'Session ending soon'
              : 'Session time'
            }
          </span>
        </div>
      </div>

      {timerState.urgency === 'critical' && (
        <button
          onClick={onLogout}
          className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors whitespace-nowrap"
          title="Logout now"
        >
          Logout
        </button>
      )}
    </div>
  );
};

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
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-transparent',
        borderColor: 'border-gray-700 dark:border-gray-700',
        iconColor: 'text-gray-500',
        pulse: false,
        urgency: 'normal'
      };
    }
  };

  const timerState = getTimerState(timeRemaining);

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-b transition-all duration-300 ${timerState.bgColor} ${timerState.borderColor}`}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm" style={{ color: timerState.iconColor === 'text-red-500' ? '#ef4444' : timerState.iconColor === 'text-amber-500' ? '#f59e0b' : '#6b7280' }}>
          schedule
        </span>
        <span className={`text-xs font-mono font-medium ${timerState.color}`}>
          {formatTime(timeRemaining)}
        </span>
      </div>

      {timerState.urgency === 'critical' && (
        <button
          onClick={onLogout}
          className="text-xs font-medium px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          title="Logout now"
        >
          Logout
        </button>
      )}
    </div>
  );
};

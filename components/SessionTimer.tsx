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

    const interval = setInterval(updateTimer, 1000);
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
        bgColor: 'bg-red-900/30',
        borderColor: 'border-red-700',
        textColor: 'text-red-400',
        pulse: true,
        urgency: 'critical'
      };
    } else if (minutes <= 5) {
      return {
        bgColor: 'bg-amber-900/30',
        borderColor: 'border-amber-700',
        textColor: 'text-amber-400',
        pulse: false,
        urgency: 'warning'
      };
    } else {
      return {
        bgColor: 'bg-gray-800/40',
        borderColor: 'border-gray-700',
        textColor: 'text-gray-400',
        pulse: false,
        urgency: 'normal'
      };
    }
  };

  const timerState = getTimerState(timeRemaining);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className={`flex items-center justify-between gap-2 ${isMobile ? '' : 'flex-col'} p-3 rounded border ${timerState.bgColor} ${timerState.borderColor} transition-all ${timerState.pulse ? 'animate-pulse' : ''}`}>
      {/* Desktop layout */}
      <div className="hidden md:flex md:flex-col md:gap-2 md:w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Session
          </span>
          {timerState.urgency === 'critical' && (
            <span className="text-[10px] font-bold text-red-400">Expiring!</span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-lg font-mono font-bold ${timerState.textColor}`}>
            {formatTime(timeRemaining)}
          </span>
          {timerState.urgency === 'critical' && (
            <button
              onClick={onLogout}
              className="text-[10px] font-medium px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              title="Logout now"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex md:hidden items-center justify-between w-full gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap">
          Session
        </span>
        <span className={`text-sm font-mono font-bold ${timerState.textColor}`}>
          {formatTime(timeRemaining)}
        </span>
        {timerState.urgency === 'critical' && (
          <button
            onClick={onLogout}
            className="text-[9px] font-medium px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors whitespace-nowrap ml-auto"
            title="Logout now"
          >
            Exit
          </button>
        )}
      </div>
    </div>
  );
};

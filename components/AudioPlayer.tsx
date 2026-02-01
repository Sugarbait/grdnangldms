import React, { useState, useRef } from 'react';

interface AudioPlayerProps {
  src: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-gradient-to-br from-surface-dark to-surface-darker p-6 rounded-3xl border border-gray-800 shadow-lg">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 size-14 rounded-full bg-primary hover:bg-blue-600 flex items-center justify-center transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          <span className="material-symbols-outlined text-2xl text-white">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <div className="relative flex items-center py-2">
              <div className="absolute w-full h-1 bg-gray-700 rounded-full"></div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full appearance-none cursor-pointer bg-transparent relative z-10"
              />
              <style>{`
                input[type="range"] {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 100%;
                  height: 18px;
                  padding: 0;
                }

                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
                  border: 2px solid white;
                  margin-top: -6.5px;
                }

                input[type="range"]::-moz-range-thumb {
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
                  margin-top: 0;
                  transform: translateY(-50%);
                }

                input[type="range"]::-webkit-slider-runnable-track {
                  background: transparent;
                  height: 1px;
                  border: none;
                }

                input[type="range"]::-moz-range-track {
                  background: transparent;
                  border: none;
                  height: 1px;
                }
              `}</style>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

import React, { useEffect, useRef, useState } from 'react';

interface LiveAudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  recordingTime: number; // in seconds
  onStop: () => void;
}

const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  stream,
  isRecording,
  recordingTime,
  onStop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [voiceDetected, setVoiceDetected] = useState<boolean>(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isRecording || !stream) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setAudioLevel(0);
      setVoiceDetected(false);
      return;
    }

    let isMounted = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[AUDIO_VISUALIZER] AudioContext not supported');
        return;
      }

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount; // 64 bins
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;

      const draw = () => {
        if (!isMounted || !canvas) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume across speech-relevant frequency range (first 28 bins)
        let sum = 0;
        const speechBins = Math.min(28, bufferLength);
        for (let i = 0; i < speechBins; i++) {
          sum += dataArray[i];
        }
        const average = speechBins > 0 ? sum / speechBins : 0;
        const normalizedLevel = Math.min(1, average / 90); // 0 to 1

        setAudioLevel(normalizedLevel);
        setVoiceDetected(normalizedLevel > 0.07);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // Draw frequency bars waveform
        const numBars = 36;
        const barSpacing = 4;
        const totalSpacing = barSpacing * (numBars - 1);
        const barWidth = Math.max(3, (width - totalSpacing) / numBars);

        // Gradient for active waveform
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#ef4444'); // Red-500
        gradient.addColorStop(0.5, '#f43f5e'); // Rose-500
        gradient.addColorStop(1, '#fb7185'); // Rose-400

        const idleGradient = ctx.createLinearGradient(0, height, 0, 0);
        idleGradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
        idleGradient.addColorStop(1, 'rgba(244, 63, 94, 0.4)');

        // Center line
        const centerY = height / 2;

        for (let i = 0; i < numBars; i++) {
          // Center-mirrored: Center bars represent core voice frequencies (bins 1-12)
          // Outer bars represent lower / upper vocal harmonics
          const dist = Math.abs(i - (numBars - 1) / 2) / ((numBars - 1) / 2); // 0 at center, 1 at edges
          const binIndex = Math.min(bufferLength - 1, Math.max(0, Math.floor((1 - dist * 0.75) * 24)));
          const rawValue = dataArray[binIndex] || 0;
          const barHeightFactor = Math.min(1, (rawValue / 220) * (1 - dist * 0.2));

          // Ambient idle breathing wave so bars are alive even during short pauses
          const idleWave = Math.sin(Date.now() * 0.005 + i * 0.35) * 2.5 + 4;
          const calculatedHeight = Math.max(idleWave, barHeightFactor * (height * 0.85));

          const x = i * (barWidth + barSpacing);
          const y = centerY - calculatedHeight / 2;

          ctx.fillStyle = normalizedLevel > 0.05 ? gradient : idleGradient;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, calculatedHeight, [barWidth / 2]);
          } else {
            ctx.rect(x, y, barWidth, calculatedHeight);
          }
          ctx.fill();
        }

        ctx.restore();

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.error('[AUDIO_VISUALIZER] Error initializing audio analyzer:', err);
    }

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isRecording, stream]);

  // Handle high-DPI canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full bg-gradient-to-b from-surface-darker/95 to-surface-dark border border-red-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header: Recording status, voice detection, and live timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex size-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-red-500">
            {voiceDetected ? 'Recording Voice' : 'Listening...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {voiceDetected && (
            <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider animate-in fade-in">
              Voice Active
            </span>
          )}
          <span className="font-mono text-lg sm:text-xl font-black text-white tracking-widest bg-black/40 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
            {formatTime(recordingTime)}
          </span>
        </div>
      </div>

      {/* Live Waveform Canvas */}
      <div className="relative w-full h-24 sm:h-28 bg-black/50 rounded-2xl border border-red-500/20 overflow-hidden flex items-center justify-center px-4">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Subtle grid line overlay */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-red-500/15 pointer-events-none" />
      </div>

      {/* Dynamic Voice Level Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <span>Mic Input</span>
          <span className={voiceDetected ? 'text-red-400 font-bold' : 'text-gray-500'}>
            {Math.round(audioLevel * 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 transition-all duration-75 rounded-full"
            style={{ width: `${Math.min(100, Math.max(6, audioLevel * 100))}%` }}
          />
        </div>
      </div>

      {/* Reactive Pulsing Stop Button */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className="relative flex items-center justify-center">
          {/* Animated voice-reactive pulse ring */}
          <div
            className="absolute rounded-full bg-red-500/20 transition-transform duration-100 pointer-events-none"
            style={{
              width: '84px',
              height: '84px',
              transform: `scale(${1 + audioLevel * 0.5})`,
              opacity: isRecording ? 0.8 : 0,
            }}
          />
          <button
            type="button"
            onClick={onStop}
            title="Stop & Save Recording"
            className="relative size-16 sm:size-18 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-xl shadow-red-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/20"
          >
            <span className="material-symbols-outlined text-3xl sm:text-4xl">stop</span>
          </button>
        </div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-3">
          Tap to Stop & Save
        </p>
      </div>
    </div>
  );
};

export default LiveAudioVisualizer;

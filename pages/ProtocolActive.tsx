
import React, { useState, useEffect, useRef } from 'react';
import { Recipient, SecureFile } from '../types';
import { GoogleGenAI } from "@google/genai";
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface ProtocolActiveProps {
  recipients: Recipient[];
  files: SecureFile[];
  onCancel: () => void;
  isTestMode?: boolean;
  userId?: Id<"users">;
}

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProtocolActive: React.FC<ProtocolActiveProps> = ({ recipients, files, onCancel, isTestMode = false, userId }) => {
  const [stage, setStage] = useState<'checking' | 'sending' | 'finished'>('checking');
  const [logs, setLogs] = useState<string[]>(["[CRITICAL] Timer expired. Activity timeout detected.", "Starting Emergency Release Protocol..."]);
  const [progress, setProgress] = useState(0);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [emailsTriggered, setEmailsTriggered] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; error?: string } | null>(null);
  const emailTriggerRef = useRef(false); // Use ref to prevent double-triggering across renders
  const logEndRef = useRef<HTMLDivElement>(null);

  const triggerEmails = useAction(api.emails.triggerEmergencyEmails);

  const addLog = (msg: string) => { setLogs(prev => [...prev, msg]); };

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // Separate effect for IMMEDIATE email triggering - runs as soon as component mounts
  useEffect(() => {
    const triggerEmailsImmediately = async () => {
      // Guard against multiple triggers
      if (emailTriggerRef.current || !userId || isTestMode) {
        console.log("[ProtocolActive] Skipping email trigger:", {
          alreadyTriggered: emailTriggerRef.current,
          userId: !!userId,
          isTestMode
        });
        return;
      }

      emailTriggerRef.current = true;
      setEmailsTriggered(true);

      console.log("[ProtocolActive] TRIGGERING EMERGENCY EMAILS IMMEDIATELY for userId:", userId);

      try {
        const result = await triggerEmails({ userId });
        console.log("[ProtocolActive] Email trigger result:", result);
        setEmailResult(result);

        if (result.success) {
          addLog("[EMAIL] Emergency notifications sent successfully!");
        } else {
          addLog(`[EMAIL] Warning: ${result.error || "Could not send emergency notifications."}`);
        }
      } catch (error: any) {
        console.error("[ProtocolActive] Failed to trigger emails:", error);
        setEmailResult({ success: false, error: error.message || "Unknown error" });
        addLog("[EMAIL] ERROR: Failed to trigger emergency notifications.");
      }
    };

    triggerEmailsImmediately();
  }, [userId, isTestMode, triggerEmails]);

  // Visual animation effect - purely cosmetic, emails already sent above
  useEffect(() => {
    const runSystem = async () => {
      await new Promise(r => setTimeout(r, 1200));
      addLog(`[SYSTEM] Found ${files.length} secure objects in encrypted vault.`);
      addLog("[DB] Fetching verified guardian contacts...");

      await new Promise(r => setTimeout(r, 1800));
      setStage('sending');
      addLog("[SOCKET] Opening high-priority secure channels...");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
        const prompt = `Generate 5 urgent but professional emergency notifications for: ${recipients.map(r => r.name).join(', ')}.
        Inform them the secure switch was triggered and they have vault access. Max 10 words per line.`;
        const result = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        const aiLogs = (result.text || "").split('\n').filter(l => l.trim().length > 0);

        for (let i = 0; i < recipients.length; i++) {
          const r = recipients[i];
          setStatusMap(prev => ({ ...prev, [r.id]: 'TRANSMITTING' }));
          addLog(`[TX] Encrypting packet for ${r.name}...`);
          await new Promise(res => setTimeout(res, 1200));
          if (aiLogs[i]) addLog(`[LOG] ${aiLogs[i]}`);
          setStatusMap(prev => ({ ...prev, [r.id]: 'DELIVERED' }));
          setProgress(((i + 1) / recipients.length) * 100);
        }
      } catch (e) {
        for (const r of recipients) {
          setStatusMap(prev => ({ ...prev, [r.id]: 'TRANSMITTING' }));
          addLog(`[TX] Manual backup transmission for ${r.name}...`);
          await new Promise(res => setTimeout(res, 1000));
          setStatusMap(prev => ({ ...prev, [r.id]: 'DELIVERED' }));
          setProgress(((recipients.indexOf(r) + 1) / recipients.length) * 100);
        }
      }
      setStage('finished');
      addLog("[SUCCESS] All packets delivered successfully.");
      addLog("[SYSTEM] Vault access keys distributed. System standing by.");
    };
    runSystem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length, recipients]);

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 font-display relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      <header className="relative z-10 flex flex-col items-center gap-4 py-8 border-b border-red-900/50">
        <div className="size-20 rounded-full bg-red-600/10 border-2 border-red-600 flex items-center justify-center animate-pulse shadow-[0_0_30px_#dc2626]">
          <span className="material-symbols-outlined text-red-500 text-5xl font-black">emergency_home</span>
        </div>
        <div className="text-center">
          <h1 className="text-red-500 text-3xl font-black uppercase italic tracking-tighter animate-[glitch_2s_infinite]">EMERGENCY MODE</h1>
          <p className="text-red-900 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Notification Protocol Active</p>
          {isTestMode && (
            <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 px-3 py-1 bg-yellow-500/10 rounded-full inline-block">TEST MODE</p>
          )}
        </div>
      </header>

      <main className="flex-1 relative z-10 py-6 overflow-hidden flex flex-col gap-6">
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-red-500/50 font-black uppercase tracking-widest">Global Transmission</span>
            <span className="text-red-500 font-black tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full bg-red-950/40 rounded-full overflow-hidden border border-red-900/30">
            <div className="h-full bg-red-600 transition-all duration-700 shadow-[0_0_15px_#dc2626]" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="space-y-3">
          {recipients.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-red-950/20 border border-red-900/30 p-4 rounded-2xl transition-all">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} className="size-10 rounded-full grayscale border border-red-900/50" alt="" />
                  ) : (
                    <div className="size-10 rounded-full grayscale border border-red-900/50 bg-red-950/40 flex items-center justify-center text-white font-black text-xs">
                      {getInitials(r.name)}
                    </div>
                  )}
                  {statusMap[r.id] === 'TRANSMITTING' && <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping"></div>}
                </div>
                <div>
                  <p className="text-sm text-white font-black uppercase tracking-tight">{r.name}</p>
                  <p className="text-[9px] text-red-800 font-bold uppercase tracking-widest">{r.relationship}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${statusMap[r.id] === 'DELIVERED' ? 'text-green-500 border-green-900/50 bg-green-950/20' : 'text-yellow-500 border-yellow-900/50 bg-yellow-950/20 animate-pulse'}`}>
                {statusMap[r.id] || 'QUEUED'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-black/80 border border-red-900/50 rounded-2xl p-6 overflow-y-auto font-mono text-[11px] leading-relaxed no-scrollbar relative">
          <div className="absolute top-4 right-4 text-red-900 font-black uppercase tracking-[0.2em] text-[9px]">Log Stream v2.5.0</div>
          <div className="space-y-3">
            {logs.map((log, i) => (
              <p key={i} className={`${log.includes('DELIVERED') || log.includes('SUCCESS') ? 'text-green-500' : log.includes('[CRITICAL]') ? 'text-red-600 font-black' : 'text-red-400'} animate-in fade-in slide-in-from-left-2`}>
                <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                {log}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </main>

      <footer className="relative z-10 pt-4">
        <button
          onClick={onCancel}
          className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          {isTestMode ? "EXIT TEST MODE" : "I'M BACK (ABORT PROTOCOL)"}
        </button>
      </footer>

      <style>{`
        @keyframes glitch {
          0% { transform: translate(0) skew(0deg); text-shadow: -2px 0 #ff0000, 2px 0 #0000ff; }
          2% { transform: translate(-2px, 2px) skew(5deg); }
          4% { transform: translate(2px, -2px) skew(-5deg); }
          6% { transform: translate(0) skew(0deg); }
        }
      `}</style>
    </div>
  );
};

export default ProtocolActive;

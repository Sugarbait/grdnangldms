
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { UserProfile } from '../App';

interface SettingsProps {
  onResetAll?: () => void;
  onTestTrigger?: () => void;
  onLogout?: () => void;
  onStopTimer?: () => void;
  currentUser: UserProfile;
  userId: Id<"users">;
  fileCount?: number;
  recipientCount?: number;
}

// Helper to convert seconds to display format
const secondsToDisplay = (seconds: number): { value: number; unit: string } => {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    return { value: seconds / 86400, unit: 'days' };
  } else if (seconds >= 3600 && seconds % 3600 === 0) {
    return { value: seconds / 3600, unit: 'hours' };
  } else {
    return { value: seconds / 60, unit: 'minutes' };
  }
};

// Helper to convert value and unit to seconds
const toSeconds = (value: number, unit: string): number => {
  switch (unit) {
    case 'minutes': return value * 60;
    case 'hours': return value * 3600;
    case 'days': return value * 86400;
    default: return value * 3600;
  }
};

const Settings: React.FC<SettingsProps> = ({ onResetAll, onTestTrigger, onLogout, onStopTimer, currentUser, userId, fileCount = 0, recipientCount = 0 }) => {
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState(currentUser);
  const [modal, setModal] = useState<{type: string; title: string; message: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer duration state
  const [customValue, setCustomValue] = useState(48);
  const [customUnit, setCustomUnit] = useState('hours');

  // Reminder state
  const [reminderValue, setReminderValue] = useState<number | null>(null);
  const [reminderUnit, setReminderUnit] = useState('minutes');
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // MFA state
  const [showMFAStatus, setShowMFAStatus] = useState(false);

  // Stop timer confirmation state
  const [timerStopped, setTimerStopped] = useState(false);

  // Convex hooks
  const updateUser = useMutation(api.users.update);
  const updateTimerDuration = useMutation(api.timer.updateDuration);
  const updateTimerReminder = useMutation(api.timer.updateReminder);
  const deleteAccountMutation = useMutation(api.users.deleteAccount);
  const timer = useQuery(api.timer.get, { userId });

  // Load current timer duration when data is available
  useEffect(() => {
    if (timer?.durationSeconds) {
      const { value, unit } = secondsToDisplay(timer.durationSeconds);
      setCustomValue(value);
      setCustomUnit(unit);
    }
    // Load reminder if set
    if (timer?.reminderSeconds) {
      const { value, unit } = secondsToDisplay(timer.reminderSeconds);
      setReminderValue(value);
      setReminderUnit(unit);
    } else {
      setReminderValue(null);
    }
  }, [timer?.durationSeconds, timer?.reminderSeconds]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfile({...tempProfile, avatarUrl: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoutClick = () => {
    setModal({
      type: 'logout',
      title: 'Sign Out',
      message: 'Do you want to sign out?'
    });
  };


  const confirmModal = async () => {
    if (modal?.type === 'logout') {
      onLogout?.();
      navigate('/login');
    } else if (modal?.type === 'deleteAccount') {
      try {
        // Permanently delete the account and all associated data
        await deleteAccountMutation({ userId });
        setModal({
          type: 'info',
          title: 'Account Deleted',
          message: 'Your account has been permanently deleted.'
        });
        setTimeout(() => {
          onLogout?.();
          navigate('/login');
        }, 2000);
      } catch (error: any) {
        setModal({
          type: 'error',
          title: 'Error',
          message: error.message || 'Failed to delete account. Please try again.'
        });
      }
    } else if (modal?.type === 'info' || modal?.type === 'error') {
      // Just close the modal for info/error types
    }
    setModal(null);
  };

  const saveProfile = async () => {
    await updateUser({
      userId,
      name: tempProfile.name,
      email: tempProfile.email,
      avatarUrl: tempProfile.avatarUrl
    });
    setIsEditingProfile(false);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleExportData = () => {
    const exportData = {
      user: {
        name: currentUser.name,
        email: currentUser.email,
        createdAt: new Date().toISOString()
      },
      statistics: {
        files: fileCount,
        recipients: recipientCount,
        lastCheckIn: timer?.lastReset ? new Date(timer.lastReset).toISOString() : 'Never'
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guardian-angel-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setModal({
      type: 'info',
      title: 'Data Exported',
      message: 'Your account data has been downloaded as a JSON file.'
    });
  };

  const handleDeleteAccount = () => {
    setModal({
      type: 'deleteAccount',
      title: 'Delete Account',
      message: 'This will permanently delete your account and all associated data. This cannot be undone.'
    });
  };

  return (
    <div className="p-4 flex flex-col gap-8 animate-in slide-in-from-right duration-300">
      <header className="sticky top-0 z-50 flex items-center bg-background-dark py-2 justify-between">
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
            <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
          </button>
          <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
            <span className="material-symbols-outlined text-xl text-primary">home</span>
          </button>
        </div>
        <h2 className="text-lg font-bold">Settings</h2>
        <button onClick={handleLogoutClick} className="text-[10px] font-black text-red-500 uppercase tracking-widest px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">Sign Out</button>
      </header>

      {/* User Identity Section */}
      <section className="bg-surface-dark border border-gray-800 p-6 rounded-[32px] shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <div className="size-16 rounded-full bg-surface-darker border-2 border-primary flex items-center justify-center overflow-hidden shadow-xl shadow-primary/10">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} className="h-full w-full object-cover" alt="" />
              ) : (
                <span className="text-lg font-black text-primary uppercase">{getInitials(currentUser.name)}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 size-6 bg-primary rounded-full border-2 border-surface-dark flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px] text-white">verified_user</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-lg truncate tracking-tight">{currentUser.name}</h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest truncate">{currentUser.email}</p>
          </div>
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">{isEditingProfile ? 'close' : 'edit_square'}</span>
          </button>
        </div>

        {isEditingProfile && (
          <div className="space-y-4 pt-4 border-t border-gray-800 animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Your Name</label>
              <input 
                type="text" 
                value={tempProfile.name}
                onChange={e => setTempProfile({...tempProfile, name: e.target.value})}
                className="w-full h-12 bg-background-dark border border-gray-800 rounded-xl px-4 text-sm text-white focus:border-primary transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
              <input 
                type="email" 
                value={tempProfile.email}
                onChange={e => setTempProfile({...tempProfile, email: e.target.value})}
                className="w-full h-12 bg-background-dark border border-gray-800 rounded-xl px-4 text-sm text-white focus:border-primary transition-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Profile Picture</label>
              <div className="flex gap-3 items-center">
                <div className="size-16 rounded-xl bg-background-dark border border-gray-800 flex items-center justify-center overflow-hidden">
                  {tempProfile.avatarUrl ? (
                    <img src={tempProfile.avatarUrl} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-gray-600">person</span>
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">upload</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">Upload</span>
                  </button>
                  {tempProfile.avatarUrl && (
                    <button
                      onClick={() => setTempProfile({...tempProfile, avatarUrl: ''})}
                      className="h-12 px-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={saveProfile}
              className="w-full h-12 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        )}
      </section>


      {/* Check-in Window */}
      <section className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold">Check-in Window</h3>
          {timer?.durationSeconds && (timer.durationSeconds !== toSeconds(customValue, customUnit)) && (
            <span className="text-[10px] font-black text-primary uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-full">
              Unsaved Changes
            </span>
          )}
        </div>
        <div className="bg-surface-dark rounded-[28px] p-6 border border-gray-800 shadow-sm">
          <div className="text-center py-4">
            <div className="text-4xl font-black tracking-tighter mb-1 uppercase italic">
              {customValue} {customUnit.charAt(0).toUpperCase() + customUnit.slice(1)}
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Until Check-in Required</p>
          </div>

          {/* Custom time input */}
          <div className="mt-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block">Amount</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customValue}
                  onChange={e => setCustomValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-14 bg-background-dark border border-gray-800 rounded-xl px-4 text-2xl font-black text-white text-center focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-2 top-[1.875rem] flex flex-col gap-1">
                  <button
                    onClick={() => setCustomValue(customValue + 1)}
                    className="w-5 h-4 bg-primary/10 hover:bg-primary/20 rounded-sm flex items-center justify-center text-primary transition-colors"
                    type="button"
                    title="Increase"
                  >
                    <span className="material-symbols-outlined text-[10px]">expand_less</span>
                  </button>
                  <button
                    onClick={() => setCustomValue(Math.max(1, customValue - 1))}
                    className="w-5 h-4 bg-primary/10 hover:bg-primary/20 rounded-sm flex items-center justify-center text-primary transition-colors"
                    type="button"
                    title="Decrease"
                  >
                    <span className="material-symbols-outlined text-[10px]">expand_more</span>
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block">Unit</label>
                <select
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                  className="w-full h-14 bg-background-dark border border-gray-800 rounded-xl px-4 text-sm font-bold text-white focus:border-primary transition-all"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex w-full bg-gray-950 p-1.5 rounded-2xl">
              {[
                { label: '24h', value: 24, unit: 'hours' },
                { label: '48h', value: 48, unit: 'hours' },
                { label: '7d', value: 7, unit: 'days' },
                { label: '30d', value: 30, unit: 'days' },
              ].map(preset => {
                const isActive = customValue === preset.value && customUnit === preset.unit;
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setCustomValue(preset.value);
                      setCustomUnit(preset.unit);
                    }}
                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isActive ? 'bg-primary text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Save Button */}
            <button
              onClick={async () => {
                if (customValue <= 0) {
                  setModal({
                    type: 'error',
                    title: 'Invalid Value',
                    message: 'Check-in window must be at least 1 minute.'
                  });
                  return;
                }
                setIsSaving(true);
                try {
                  const durationSeconds = toSeconds(customValue, customUnit);
                  await updateTimerDuration({ userId, durationSeconds });
                  setModal({
                    type: 'info',
                    title: 'Settings Saved',
                    message: `Your check-in window has been set to ${customValue} ${customUnit}. The timer has been reset.`
                  });
                } catch (error: any) {
                  setModal({
                    type: 'error',
                    title: 'Save Failed',
                    message: `Could not save settings: ${error.message}`
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving || customValue <= 0}
              className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/40 uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all disabled:opacity-50 mt-4"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </section>

      {/* Pre-Expiry Reminder */}
      <section className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold">Pre-Expiry Reminder</h3>
          <p className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">Optional</p>
        </div>
        <div className="bg-surface-dark rounded-[28px] p-6 border border-gray-800 shadow-sm">
          <p className="text-gray-400 text-[11px] leading-relaxed mb-6">
            Get a reminder email before your check-in window expires so you don't miss the deadline.
          </p>

          <div className="space-y-4">
            {/* Quick presets for reminders */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 block">Quick Select</label>
              <div className="flex flex-col gap-2">
                {[
                  { label: '1 minute before', value: 60, unit: 'seconds' },
                  { label: '5 minutes before', value: 5, unit: 'minutes' },
                  { label: '10 minutes before', value: 10, unit: 'minutes' },
                  { label: '25 minutes before', value: 25, unit: 'minutes' },
                  { label: 'No Reminder', value: null, unit: 'minutes' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (preset.value === null) {
                        setReminderValue(null);
                      } else {
                        setReminderValue(preset.value);
                        setReminderUnit(preset.unit);
                      }
                    }}
                    className={`h-12 px-4 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${
                      (preset.value === null && reminderValue === null) ||
                      (preset.value !== null && reminderValue === preset.value && reminderUnit === preset.unit)
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800 border border-gray-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom reminder */}
            <div className="border-t border-gray-800 pt-4">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block">Custom Reminder</label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={reminderValue ?? ''}
                    placeholder="0"
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      setReminderValue(val);
                    }}
                    className="w-full h-14 bg-background-dark border border-gray-800 rounded-xl px-4 text-2xl font-black text-white text-center focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                    <button
                      onClick={() => setReminderValue((reminderValue || 0) + 1)}
                      className="w-5 h-4 bg-primary/10 hover:bg-primary/20 rounded-sm flex items-center justify-center text-primary transition-colors"
                      type="button"
                      title="Increase"
                    >
                      <span className="material-symbols-outlined text-[10px]">expand_less</span>
                    </button>
                    <button
                      onClick={() => setReminderValue(Math.max(1, (reminderValue || 0) - 1))}
                      className="w-5 h-4 bg-primary/10 hover:bg-primary/20 rounded-sm flex items-center justify-center text-primary transition-colors"
                      type="button"
                      title="Decrease"
                    >
                      <span className="material-symbols-outlined text-[10px]">expand_more</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <select
                    value={reminderUnit}
                    onChange={e => setReminderUnit(e.target.value)}
                    className="w-full h-14 bg-background-dark border border-gray-800 rounded-xl px-4 text-sm font-bold text-white focus:border-primary transition-all"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Reminder Button */}
            <button
              onClick={async () => {
                setIsSavingReminder(true);
                try {
                  let reminderSeconds: number | undefined;
                  if (reminderValue !== null && reminderValue > 0) {
                    reminderSeconds = toSeconds(reminderValue, reminderUnit);
                  }
                  await updateTimerReminder({ userId, reminderSeconds });
                  setModal({
                    type: 'info',
                    title: 'Reminder Saved',
                    message: reminderSeconds
                      ? `You'll receive a reminder email ${reminderValue} ${reminderUnit} before expiry.`
                      : 'Reminder has been disabled.'
                  });
                } catch (error: any) {
                  setModal({
                    type: 'error',
                    title: 'Save Failed',
                    message: `Could not save reminder: ${error.message}`
                  });
                } finally {
                  setIsSavingReminder(false);
                }
              }}
              disabled={isSavingReminder}
              className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/40 uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all disabled:opacity-50 mt-4"
            >
              {isSavingReminder ? 'Saving...' : 'Save Reminder'}
            </button>
          </div>
        </div>
      </section>

      {/* Stop Timer */}
      <section className="bg-red-950/20 border border-red-500/20 p-8 rounded-[32px] flex flex-col items-center text-center gap-5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/40 to-transparent"></div>

        <div className="size-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-105 transition-transform duration-500 shadow-2xl shadow-red-500/10">
          <span className="material-symbols-outlined text-red-500 text-5xl font-bold">stop_circle</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Stop Timer</h3>
          <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.4em]">Pause Countdown</p>
        </div>

        <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed font-medium">
          Pause your check-in timer. You can resume by checking in again from the Dashboard.
        </p>

        <button
          onClick={() => {
            onStopTimer?.();
            setTimerStopped(true);
            // Auto-hide confirmation after 4 seconds
            setTimeout(() => setTimerStopped(false), 4000);
          }}
          className="w-full h-16 bg-red-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <span>Stop Timer</span>
          <span className="material-symbols-outlined">stop_circle</span>
        </button>

        {timerStopped && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-0 sm:top-6 sm:right-6 sm:inset-auto animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-green-500/20 border border-green-500/40 backdrop-blur-sm rounded-2xl p-5 shadow-2xl shadow-green-500/20 max-w-sm w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-green-400 text-xl">check_circle</span>
                </div>
                <div className="text-left">
                  <p className="text-green-400 font-black text-sm uppercase tracking-wider">Timer Stopped</p>
                  <p className="text-green-300/80 text-xs mt-1">Your check-in timer has been paused. Resume by checking in from the Dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Check-in Helpers */}
      <section className="bg-primary/5 border border-primary/20 p-8 rounded-[32px] flex flex-col items-center text-center gap-5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

        <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform duration-500 shadow-2xl shadow-primary/10">
          <span className="material-symbols-outlined text-primary text-5xl font-bold">emergency_share</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Check-in Helpers</h3>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">Emergency Assistance</p>
        </div>

        <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed font-medium">
          Allow trusted recipients to help keep your account active if you're unavailable.
        </p>

        <button
          onClick={() => navigate('/recipients')}
          className="w-full h-16 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <span>Manage Check-in Helpers</span>
          <span className="material-symbols-outlined">person_add</span>
        </button>
      </section>

      {/* Account Statistics */}
      <section className="bg-surface-dark border border-gray-800 p-6 rounded-[28px] shadow-lg">
        <h3 className="text-lg font-bold mb-4">Account Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background-dark p-4 rounded-2xl text-center">
            <p className="text-3xl font-black text-primary">{fileCount}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Items Saved</p>
          </div>
          <div className="bg-background-dark p-4 rounded-2xl text-center">
            <p className="text-3xl font-black text-primary">{recipientCount}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Recipients</p>
          </div>
          <div className="bg-background-dark p-4 rounded-2xl text-center">
            <p className="text-3xl font-black text-green-500">✓</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Active</p>
          </div>
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="bg-surface-dark border border-gray-800 p-6 rounded-[28px] shadow-lg">
        <h3 className="text-lg font-bold mb-4">Data & Privacy</h3>
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full h-14 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center gap-3 hover:bg-primary/20 transition-colors font-bold uppercase tracking-wider text-[10px]"
          >
            <span className="material-symbols-outlined">download</span>
            Export Account Data
          </button>
          <p className="text-[9px] text-gray-500 px-2">Download your account information as a JSON file for backup or transfer.</p>
        </div>
      </section>

      {/* Multi-Factor Authentication */}
      <section className="bg-primary/10 border border-primary/20 p-6 rounded-[28px] shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Multi-Factor Auth</h3>
          </div>
        </div>

        <div className="bg-surface-dark rounded-xl p-5 border border-primary/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300 font-bold mb-1">Two-Factor Authentication</p>
              <p className="text-[11px] text-gray-500">
                {currentUser?.mfaEnabled
                  ? 'Multi-factor authentication is enabled on your account'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
            <div className={`size-12 rounded-full flex items-center justify-center ${currentUser?.mfaEnabled ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-800/50 border border-gray-700'}`}>
              <span className={`material-symbols-outlined ${currentUser?.mfaEnabled ? 'text-green-500' : 'text-gray-500'}`}>
                {currentUser?.mfaEnabled ? 'check_circle' : 'radio_button_unchecked'}
              </span>
            </div>
          </div>

          {!currentUser?.mfaEnabled && (
            <button
              onClick={() => navigate('/mfa-setup')}
              className="w-full h-12 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Enable 2FA
            </button>
          )}

          {currentUser?.mfaEnabled && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/mfa-setup')}
                className="w-full h-12 bg-primary/20 border border-primary/30 text-primary rounded-xl hover:bg-primary/30 transition-colors font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">refresh</span>
                Regenerate Codes
              </button>
              <p className="text-[9px] text-gray-500 text-center">
                Get a new set of backup codes. Your authenticator app will still work.
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-[10px] text-blue-400">
          <p>
            <strong>What is 2FA?</strong> Multi-factor authentication adds a second layer of security by requiring a code from your authenticator app (Google Authenticator, Authy, etc.) in addition to your password when logging in.
          </p>
        </div>
      </section>

      {/* Help & Support */}
      <section className="bg-primary/10 border border-primary/20 p-6 rounded-[28px] shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-primary uppercase tracking-tight">Help & Support</h3>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full">LEARN</span>
        </div>

        <div className="space-y-4">
          {/* Getting Started */}
          <div className="bg-background-dark p-4 rounded-lg border border-primary/20">
            <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">school</span>
              Getting Started
            </h4>
            <p className="text-xs text-gray-400 mb-3">Learn the basics of Guardian Angel DMS and set up your digital legacy plan.</p>
            <div className="space-y-2">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('📚 Getting Started Guide\n\n1. Set Your Check-in Timer\nConfigure how often you need to check in (weekly, monthly, etc.)\n\n2. Upload Important Files\nAdd messages, documents, photos, and audio files to your vault.\n\n3. Add Recipients\nDesignate who should receive your files when the timer expires.\n\n4. Assign Files to Recipients\nDecide which files each recipient gets.\n\n5. Your Plan is Ready\nJust check in regularly - the app handles the rest!');
                }}
                className="text-xs text-primary hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                How to Set Up Your Legacy Plan
              </a>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('⏱️ Check-in Timer Explained\n\nYour timer counts down from your configured duration (7 days by default).\n\nEach time you "Check In", the timer resets.\n\nWhen the timer reaches 0, the emergency protocol triggers automatically:\n\n✓ Recipient notifications sent\n✓ Your files distributed\n✓ Recipients can download their files\n\nYou can stop the timer anytime, or adjust the duration in Settings.');
                }}
                className="text-xs text-primary hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                Understanding the Check-in Timer
              </a>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-background-dark p-4 rounded-lg border border-primary/20">
            <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">help</span>
              FAQ
            </h4>
            <div className="space-y-2">
              <button 
                onClick={() => alert('🔐 Encryption & Security\n\nGuardian Angel uses end-to-end encryption:\n\n• Your encryption key is derived from your password\n• Only you can decrypt your files\n• Even our servers cannot access your data\n• Files remain encrypted until delivery\n\nYour data is protected with AES-256 encryption.')}
                className="w-full text-left text-xs text-primary hover:text-blue-400 transition-colors py-1 px-2 hover:bg-primary/5 rounded flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">expand_more</span>
                How is my data encrypted?
              </button>
              <button 
                onClick={() => alert('📧 Multi-Device Support\n\nYes! You can access your account from multiple devices:\n\n• Your encryption key is securely stored\n• You can log in from phone, tablet, or computer\n• Your vault syncs across all devices\n• Timer state remains synchronized\n\nJust log in with the same email and password.')}
                className="w-full text-left text-xs text-primary hover:text-blue-400 transition-colors py-1 px-2 hover:bg-primary/5 rounded flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">expand_more</span>
                Can I use this on multiple devices?
              </button>
              <button 
                onClick={() => alert('👥 Recipient Notifications\n\nRecipients are notified when your timer expires:\n\n• They receive an email with download links\n• Links remain active for 90 days\n• They can download assigned files anytime\n• No special account needed\n• You can preview emails before sending\n\nRecipients see only the files you assign to them.')}
                className="w-full text-left text-xs text-primary hover:text-blue-400 transition-colors py-1 px-2 hover:bg-primary/5 rounded flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">expand_more</span>
                How do recipients get notified?
              </button>
              <button 
                onClick={() => alert('🛑 Emergency Protocol\n\nIf you miss check-ins, the protocol automatically triggers:\n\n1. Timer Expires → All recipients notified\n2. Files Distributed → Sent via secure email\n3. Download Links → Active for 90 days\n4. Proof of Delivery → You can verify delivery\n\nYou can cancel anytime by checking in or stopping the timer.')}
                className="w-full text-left text-xs text-primary hover:text-blue-400 transition-colors py-1 px-2 hover:bg-primary/5 rounded flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">expand_more</span>
                What happens when my timer expires?
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-background-dark p-4 rounded-lg border border-amber-500/20">
            <h4 className="text-sm font-black text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
              Pro Tips
            </h4>
            <ul className="text-xs text-gray-400 space-y-1 ml-4">
              <li>✓ Set a calendar reminder to check in regularly</li>
              <li>✓ Tell your recipients about this service beforehand</li>
              <li>✓ Keep your recovery codes in a safe place</li>
              <li>✓ Update your files periodically</li>
              <li>✓ Test email delivery to ensure recipients get notified</li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="bg-background-dark p-4 rounded-lg border border-primary/20">
            <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">mail</span>
              Need More Help?
            </h4>
            <p className="text-xs text-gray-400 mb-3">If you have questions or issues, we're here to help.</p>
            <button 
              onClick={() => {
                const email = 'support@grdnangl.digitalac.app';
                window.location.href = `mailto:${email}?subject=Guardian Angel DMS Support Request`;
              }}
              className="w-full h-10 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">mail</span>
              Email Support
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-950/20 border border-red-500/20 p-6 rounded-[28px] shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-red-500 uppercase tracking-tight">Danger Zone</h3>
          <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full">IRREVERSIBLE</span>
        </div>

        {!showDangerZone ? (
          <button
            onClick={() => setShowDangerZone(true)}
            className="w-full h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors font-bold uppercase tracking-wider text-[10px]"
          >
            Show Options
          </button>
        ) : (
          <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
            <p className="text-[10px] text-red-400 bg-red-500/10 p-3 rounded-lg">
              Warning: These actions cannot be undone. Please be certain before proceeding.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full h-12 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Permanently Delete Account
            </button>
            <button
              onClick={() => setShowDangerZone(false)}
              className="w-full h-12 bg-gray-800 text-gray-200 rounded-xl hover:bg-gray-700 transition-colors font-bold uppercase tracking-wider text-[10px]"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* In-App Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white mb-2">{modal.title}</h3>
            <p className="text-gray-400 text-sm mb-6">{modal.message}</p>
            {modal.type === 'info' || modal.type === 'error' ? (
              <button
                onClick={confirmModal}
                className={`w-full h-12 ${modal.type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors`}
              >
                OK
              </button>
            ) : modal.type === 'deleteAccount' ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 h-12 bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal}
                  className="flex-1 h-12 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete Forever
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 h-12 bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal}
                  className="flex-1 h-12 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
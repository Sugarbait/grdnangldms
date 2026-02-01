
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

const RECIPIENT_CAP = 5;

interface AddRecipientProps {
  userId: Id<"users">;
  recipientCount?: number;
}

const AddRecipient: React.FC<AddRecipientProps> = ({ userId, recipientCount = 0 }) => {
  const navigate = useNavigate();
  const isAtCap = recipientCount >= RECIPIENT_CAP;
  
  // Redirect if at cap
  React.useEffect(() => {
    if (isAtCap) {
      navigate('/recipients');
    }
  }, [isAtCap, navigate]);
  // Fix: Use imported api object instead of string literal for Convex mutation
  const addMutation = useMutation(api.recipients.add);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'Friend',
    avatarUrl: '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) return;
    await addMutation({
      userId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      relationship: formData.relationship,
      avatarUrl: formData.avatarUrl || undefined,
    });
    navigate('/recipients');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      <header className="px-4 py-6 border-b border-gray-800 flex items-center gap-4 justify-between">
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
            <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
          </button>
          <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
            <span className="material-symbols-outlined text-xl text-primary">home</span>
          </button>
        </div>
        <h1 className="text-lg font-bold flex-1 text-center">Add Recipient</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="size-24 rounded-full bg-surface-darker border-2 border-gray-800 flex items-center justify-center overflow-hidden">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} className="h-full w-full object-cover" alt={formData.name} />
            ) : (
              <span className="text-3xl font-black text-primary uppercase">{getInitials(formData.name)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-12 px-6 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors font-bold uppercase tracking-wider text-[10px]"
            >
              <span className="material-symbols-outlined text-lg">photo_camera</span>
              Upload Photo
            </button>
            {formData.avatarUrl && (
              <button
                onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                className="h-12 px-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors font-bold uppercase tracking-wider text-[10px]"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Full Name"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full h-14 bg-surface-dark border border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
          />
          <input
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full h-14 bg-surface-dark border border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
          />
          <input
            placeholder="Phone Number (optional)"
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full h-14 bg-surface-dark border border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
          />
          <select
            value={formData.relationship}
            onChange={e => setFormData({...formData, relationship: e.target.value})}
            className="w-full h-14 bg-surface-dark border border-gray-800 rounded-2xl px-5 text-white focus:border-primary transition-all"
          >
            <option value="Spouse">Spouse / Partner</option>
            <option value="Family">Family Member</option>
            <option value="Friend">Trusted Friend</option>
            <option value="Lawyer">Lawyer / Executor</option>
            <option value="Journalist">Journalist</option>
            <option value="Investigator">Investigator</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {isAtCap ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <p className="text-red-400 font-bold text-center text-sm mb-2">Recipient Limit Reached</p>
            <p className="text-red-400/80 text-xs text-center mb-4">You have reached the maximum of {RECIPIENT_CAP} recipients. You cannot add more recipients at this time.</p>
            <button
              onClick={() => navigate('/recipients')}
              className="w-full h-12 bg-primary text-white font-black uppercase rounded-xl hover:bg-blue-600 transition-all"
            >
              Back to Recipients
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={!formData.name || !formData.email}
            className="w-full h-16 bg-primary text-white font-black uppercase rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Recipient
          </button>
        )}
      </main>
    </div>
  );
};

export default AddRecipient;

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Recipient, SecureFile } from '../types';

const RECIPIENT_CAP = 5;

interface RecipientsProps {
  recipients: Recipient[];
  files?: SecureFile[];
}

const Recipients: React.FC<RecipientsProps> = ({ recipients, files = [] }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [formData, setFormData] = useState<Partial<Recipient>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSavingPermission, setIsSavingPermission] = useState(false);

  // Convex Mutations
  const updateRecipient = useMutation(api.recipients.update);
  const removeRecipient = useMutation(api.recipients.remove);
  const updateCheckInPermission = useAction(api.recipients.updateCheckInPermission);

  // Get files assigned to a specific recipient
  const getRecipientFiles = (recipientId: Id<"recipients">) => {
    return files.filter(file => file.recipientIds.includes(recipientId as any));
  };

  const handleEditClick = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setFormData({ ...recipient });
  };

  const handleCloseEdit = () => {
    setEditingRecipient(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (editingRecipient && formData.name && formData.email) {
      const userId = localStorage.getItem('guardian_user_id') as Id<"users">;
      await updateRecipient({
        userId,
        recipientId: editingRecipient._id,
        name: formData.name,
        relationship: formData.relationship || 'Friend',
        email: formData.email,
        phone: formData.phone || '',
        avatarUrl: formData.avatarUrl
      });
      handleCloseEdit();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (editingRecipient) {
      const userId = localStorage.getItem('guardian_user_id') as Id<"users">;
      await removeRecipient({
        userId,
        recipientId: editingRecipient._id
      });
      setShowDeleteModal(false);
      handleCloseEdit();
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, avatarUrl: '' });
  };

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

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const Avatar = ({ url, name, size = 'size-14', borderClass = 'border-gray-800' }: { url?: string, name: string, size?: string, borderClass?: string }) => (
    <div className={`${size} rounded-full border-2 flex items-center justify-center overflow-hidden bg-surface-darker transition-colors ${borderClass}`}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-primary font-black text-sm uppercase tracking-tighter">{getInitials(name)}</span>
      )}
    </div>
  );

  if (editingRecipient) {
    return (
      <div className="p-4 flex flex-col gap-6 animate-in slide-in-from-right duration-300 min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={handleCloseEdit} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
              <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
            </button>
            <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
              <span className="material-symbols-outlined text-xl text-primary">home</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold">Edit Recipient</h1>
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            <Avatar
              url={formData.avatarUrl}
              name={formData.name || ''}
              size="size-24"
              borderClass="border-primary shadow-2xl shadow-primary/20"
            />
            <div className="absolute -bottom-1 -right-1 flex gap-1">
              {formData.avatarUrl && (
                <button
                  onClick={handleRemoveImage}
                  className="size-8 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 shadow-lg backdrop-blur-sm hover:bg-red-500/20 transition-colors"
                  title="Remove Image"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="size-8 bg-surface-dark border border-gray-800 rounded-full flex items-center justify-center text-primary shadow-lg hover:bg-surface-darker transition-colors"
                title="Upload Photo"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white">{formData.name || 'New Recipient'}</h2>
          </div>
        </div>

        <div className="space-y-5 flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              type="text" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary focus:ring-0" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Relationship</label>
            <select
              value={formData.relationship || ''}
              onChange={e => setFormData({...formData, relationship: e.target.value})}
              className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary focus:ring-0 appearance-none"
            >
              <option value="Spouse">Spouse / Partner</option>
              <option value="Family">Family Member</option>
              <option value="Lawyer">Lawyer / Executor</option>
              <option value="Friend">Trusted Friend</option>
              <option value="Journalist">Journalist</option>
              <option value="Investigator">Investigator</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              value={formData.email || ''} 
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary focus:ring-0" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
            <input 
              type="tel" 
              value={formData.phone || ''} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full h-14 bg-surface-dark border-gray-800 rounded-2xl px-5 text-white focus:border-primary focus:ring-0" 
            />
          </div>
        </div>

        {/* Files Section */}
        {editingRecipient && getRecipientFiles(editingRecipient._id).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-primary text-lg">lock</span>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                Files ({getRecipientFiles(editingRecipient._id).length})
              </h3>
            </div>
            <div className="space-y-2">
              {getRecipientFiles(editingRecipient._id).map(file => (
                <div
                  key={file._id}
                  className="flex items-center gap-3 p-3 bg-surface-darker border border-gray-800 rounded-xl hover:border-primary/30 transition-colors"
                >
                  <div className="size-10 rounded-lg bg-surface-dark flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm text-blue-400">
                      {file.type.startsWith('audio') ? 'mic' : file.type.startsWith('video') ? 'videocam' : 'description'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{file.name}</p>
                    <p className="text-gray-500 text-[9px] font-medium">{file.size}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {file.isEncrypted && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[8px] font-black text-green-400 bg-green-500/10 border border-green-500/20 rounded-full"
                      >
                        <span className="material-symbols-outlined text-[10px]">shield</span>
                        Encrypted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check-in Permission Section */}
        <div className="space-y-3 border-t border-gray-800 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-lg">emergency_share</span>
              <h3 className="text-sm font-bold text-white">Allow Check-in</h3>
            </div>
            <button
              onClick={async () => {
                if (!editingRecipient) return;
                setIsSavingPermission(true);
                try {
                  const userId = localStorage.getItem('guardian_user_id') as Id<"users">;
                  await updateCheckInPermission({
                    userId,
                    recipientId: editingRecipient._id,
                    canTriggerCheckIn: !editingRecipient.canTriggerCheckIn,
                  });
                  // Update local state
                  setEditingRecipient({
                    ...editingRecipient,
                    canTriggerCheckIn: !editingRecipient.canTriggerCheckIn,
                  });
                } catch (error) {
                  console.error("Error updating permission:", error);
                } finally {
                  setIsSavingPermission(false);
                }
              }}
              disabled={isSavingPermission}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                editingRecipient?.canTriggerCheckIn
                  ? 'bg-green-500/40 border border-green-500/60'
                  : 'bg-gray-800 border border-gray-700'
              } disabled:opacity-50`}
            >
              <div
                className={`absolute top-[1px] left-0.5 w-5 h-5 rounded-full transition-all ${
                  editingRecipient?.canTriggerCheckIn
                    ? 'bg-green-500 translate-x-6'
                    : 'bg-gray-600'
                }`}
              />
            </button>
          </div>
          <p className="text-gray-500 text-[11px] leading-relaxed">
            If enabled, they'll receive an email when your timer gets low with an option to confirm you're alive.
          </p>
          {editingRecipient?.canTriggerCheckIn && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-[10px] font-bold uppercase tracking-widest mb-1">Enabled</p>
              <p className="text-green-400/80 text-[11px] leading-relaxed">
                They can reset your timer by clicking the link in their email.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 pb-24">
          <button
            onClick={handleSave}
            className="w-full h-16 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <span>Update Profile</span>
            <span className="material-symbols-outlined">save</span>
          </button>

          <button
            onClick={handleDeleteClick}
            className="w-full h-14 bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98]"
          >
            Remove Recipient
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-dark border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-xl font-black text-white mb-2">Remove Recipient</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to remove {editingRecipient?.name}? They will no longer receive your saved items.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 h-12 bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 h-12 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-6 animate-in slide-in-from-right duration-300 min-h-full">
      <header className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
            <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
          </button>
          <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
            <span className="material-symbols-outlined text-xl text-primary">home</span>
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold">Recipients</h1>
          <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
        </div>
        <button onClick={() => navigate('/add-recipient')} className="size-10 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors" title="Add new recipient">
          <span className="material-symbols-outlined">person_add</span>
        </button>
      </header>

      <div className="px-1 text-center">
        <p className="text-gray-400 text-[11px] font-medium leading-relaxed max-w-[280px] mx-auto">
          People who will receive your saved items if you don't check in.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {recipients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="size-20 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center mb-6 shadow-2xl">
              <span className="material-symbols-outlined text-4xl text-gray-700">group_off</span>
            </div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">No Recipients Yet</h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 mb-8 max-w-[200px] leading-relaxed">
              Add someone you trust to receive your items.
            </p>
            <button onClick={() => navigate('/add-recipient')} className="px-8 py-4 bg-primary rounded-2xl text-white font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all">
              <span className="material-symbols-outlined">person_add</span>
              Add Recipient
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map(recipient => (
              <div 
                key={recipient._id} 
                onClick={() => handleEditClick(recipient)}
                className="group relative flex gap-4 bg-surface-dark p-4 rounded-[28px] shadow-lg border border-gray-800 hover:border-primary/40 transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="shrink-0">
                  <Avatar
                    url={recipient.avatarUrl}
                    name={recipient.name}
                    borderClass="border-gray-800"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-center min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white text-base font-bold truncate group-hover:text-primary transition-colors">{recipient.name}</p>
                      <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-0.5">{recipient.relationship}</p>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 self-center opacity-40 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-primary">edit</span>
                </div>
              </div>
            ))}
            
            {/* Recipient Cap Section */}
            <div className="mt-6 pt-4 border-t border-gray-800">
              {recipients.length >= RECIPIENT_CAP ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-lg flex-shrink-0 mt-0.5">info</span>
                    <div className="flex-1">
                      <p className="text-amber-400 text-sm font-bold">Recipient Limit Reached</p>
                      <p className="text-amber-400/80 text-xs mt-1">You have reached the maximum of {RECIPIENT_CAP} recipients. You cannot add more recipients at this time.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/add-recipient')}
                  className="w-full h-11 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Add Recipient ({recipients.length}/{RECIPIENT_CAP})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Recipients;

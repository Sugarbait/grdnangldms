
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id, Doc } from '../convex/_generated/dataModel';
import AudioPlayer from '../components/AudioPlayer';
import CryptoJS from 'crypto-js';

interface VaultProps {
  userId: Id<"users">;
  canAccessFeatures?: boolean;
}

// Image Preview Component
const ImagePreviewThumbnail: React.FC<{ storageId: string; fileName: string }> = ({ storageId, fileName }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const getFileUrl = useAction(api.fileStorage.getFileUrl);

  useEffect(() => {
    const loadImagePreview = async () => {
      try {
        const url = await getFileUrl({ storageId });
        if (url) {
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error('Failed to load image preview:', error);
      }
    };

    loadImagePreview();
  }, [storageId, getFileUrl]);

  if (previewUrl) {
    return (
      <img src={previewUrl} alt={fileName} className="w-full h-full object-cover" />
    );
  }

  return <span className="material-symbols-outlined text-3xl">image</span>;
};

const Vault: React.FC<VaultProps> = ({ userId, canAccessFeatures }) => {
  const navigate = useNavigate();
  const [editingFile, setEditingFile] = useState<Doc<"files"> | null>(null);
  const [tempRecipientIds, setTempRecipientIds] = useState<string[]>([]);
  const [tempFileName, setTempFileName] = useState<string>('');
  const [tempContent, setTempContent] = useState<string>('');
  const [tempIsEncrypted, setTempIsEncrypted] = useState<boolean>(false);
  const [modal, setModal] = useState<{type: 'delete' | 'purge' | 'listDelete', fileId?: string, fileName?: string} | null>(null);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [previewingFile, setPreviewingFile] = useState<Doc<"files"> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [closingModal, setClosingModal] = useState<'delete' | 'purge' | 'preview' | 'listDelete' | null>(null);
  const getFileUrl = useAction(api.fileStorage.getFileUrl);

  // Load encryption key on mount — sessionStorage only (cleared on browser close)
  useEffect(() => {
    const stored = sessionStorage.getItem('guardian_encryption_key');
    if (stored) {
      setEncryptionKey(stored);
    }
  }, []);

  // Convex Data
  const files = useQuery(api.files.list, { userId }) ?? [];
  const recipients = useQuery(api.recipients.list, { userId }) ?? [];

  // Log when files are loaded
  useEffect(() => {
    console.log(`[VAULT] Loaded ${files.length} files:`, files.map(f => ({
      id: f._id,
      name: f.name,
      type: f.type,
      hasAudioStorageId: !!f.audioStorageId,
      hasImageStorageId: !!f.imageStorageId,
      hasDocumentStorageId: !!f.documentStorageId,
      recipientIds: f.recipientIds,
      recipientCount: f.recipientIds?.length || 0
    })));
  }, [files]);
  
  // Convex Mutations
  // Fix: Use imported api object instead of string literals for Convex functions
  const updateFileAccess = useMutation(api.files.updateAccess);
  const deleteFile = useMutation(api.files.remove);
  const purgeAll = useMutation(api.files.purge);
  const renameFile = useMutation(api.files.rename);
  const updateFileContent = useMutation(api.files.updateContent);

  const getRecipientName = (ids: string[]) => {
    if (ids.length === 0) return 'No Contact';
    if (ids.length === 1) return recipients.find(r => r._id === ids[0])?.name || 'Unknown';
    return `${ids.length} Recipients`;
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'pdf': return 'picture_as_pdf';
      case 'image': return 'image';
      case 'audio': return 'mic';
      case 'note': return 'history_edu';
      default: return 'description';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const decryptContent = (encryptedContent: string): string => {
    if (!encryptionKey || !encryptedContent) return encryptedContent;
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, encryptionKey).toString(CryptoJS.enc.Utf8);
      return decrypted || encryptedContent;
    } catch (error) {
      console.error('[DECRYPT] Failed to decrypt content:', error);
      return encryptedContent;
    }
  };

  const handlePurge = () => {
    if (files.length === 0) return;
    setModal({ type: 'purge' });
  };

  const confirmPurge = () => {
    purgeAll({ userId });
    setModal(null);
  };

  const handleDeleteFile = () => {
    setModal({ type: 'delete' });
  };

  const confirmDelete = () => {
    if (editingFile) {
      deleteFile({ userId, fileId: editingFile._id });
      setModal(null);
      closeEdit();
    }
  };

  const handleDeleteFromList = (fileId: string, fileName: string) => {
    setModal({ type: 'listDelete', fileId, fileName });
  };

  const confirmDeleteFromList = () => {
    if (modal?.type === 'listDelete' && modal?.fileId) {
      deleteFile({ userId, fileId: modal.fileId as unknown as Id<"files"> });
      setModal(null);
    }
  };

  const openEdit = (file: Doc<"files">) => {
    setEditingFile(file);
    setTempRecipientIds([...(file.recipientIds || [])]);
    setTempFileName(file.name);
    // For notes, show the decrypted content; for other types, show empty
    if (file.type === 'note' && file.content) {
      setTempContent(file.isEncrypted ? decryptContent(file.content) : file.content);
    } else {
      setTempContent('');
    }
    setTempIsEncrypted(file.isEncrypted);
  };

  const closeEdit = () => {
    setEditingFile(null);
    setTempContent('');
    setTempIsEncrypted(false);
  };

  const closeWithAnimation = (type: 'delete' | 'purge' | 'preview' | 'listDelete', onComplete: () => void) => {
    setClosingModal(type);
    setTimeout(() => {
      setClosingModal(null);
      onComplete();
    }, 180);
  };

  const openPreview = async (file: Doc<"files">) => {
    setPreviewingFile(file);
    setPreviewUrl(null); // Reset preview URL

    console.log(`[PREVIEW] Opening preview for ${file.type}`, {
      imageStorageId: file.imageStorageId,
      audioStorageId: file.audioStorageId,
      hasAudioData: !!file.audioData
    });

    // Load the file URL for preview
    const hasImageStorage = file.type === 'image' && file.imageStorageId;
    const hasDocumentStorage = (file.type === 'pdf' || file.type === 'document') && file.documentStorageId;
    const hasAudioStorage = file.type === 'audio' && file.audioStorageId;

    if (hasImageStorage || hasDocumentStorage || hasAudioStorage) {
      try {
        const storageId = file.imageStorageId || file.documentStorageId || file.audioStorageId;
        console.log(`[PREVIEW] Loading ${file.type} with storageId:`, storageId);
        if (storageId) {
          const url = await getFileUrl({ storageId });
          console.log(`[PREVIEW] Got URL for ${file.type}:`, url);
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error('[PREVIEW] Failed to load preview URL:', error);
      }
    } else {
      console.log(`[PREVIEW] No storage ID for ${file.type}. File may use legacy audioData format.`);
    }
  };

  const openEditFromPreview = () => {
    if (previewingFile) {
      closePreview();
      openEdit(previewingFile);
    }
  };

  const closePreview = () => {
    closeWithAnimation('preview', () => {
      setPreviewingFile(null);
      setPreviewUrl(null);
    });
  };

  const toggleRecipient = (id: string | Id<"recipients">) => {
    const idString = typeof id === 'string' ? id : id.toString();
    setTempRecipientIds(prev =>
      prev.includes(idString) ? prev.filter(rId => rId !== idString) : [...prev, idString]
    );
  };

  const saveEdit = async () => {
    if (editingFile) {
      setIsSaving(true);
      setSaveError(null);
      try {
        // Update recipient access
        await updateFileAccess({
          userId,
          fileId: editingFile._id,
          recipientIds: tempRecipientIds
        });

        // Update file name if it changed
        if (tempFileName !== editingFile.name && tempFileName.trim()) {
          await renameFile({
            userId,
            fileId: editingFile._id,
            newName: tempFileName.trim()
          });
        }

        // Update content if it's a note and content changed
        if (editingFile.type === 'note') {
          const originalContent = editingFile.isEncrypted ? decryptContent(editingFile.content || '') : (editingFile.content || '');
          if (tempContent !== originalContent) {
            let encryptedContent = tempContent;
            if (tempIsEncrypted && encryptionKey) {
              encryptedContent = CryptoJS.AES.encrypt(tempContent, encryptionKey).toString();
            }
            await updateFileContent({
              userId,
              fileId: editingFile._id,
              content: encryptedContent,
              plaintext: tempContent,
              isEncrypted: tempIsEncrypted,
            });
          }
        }

        setIsSaving(false);
        closeEdit();
      } catch (error: any) {
        console.error('Error saving file details:', error);
        setSaveError(error.message || 'Failed to save changes. Please try again.');
        setIsSaving(false);
      }
    }
  };

  if (editingFile) {
    return (
      <div className="p-4 pb-64 flex flex-col gap-6 animate-in slide-in-from-right duration-300 min-h-screen">
        <header className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={closeEdit} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go back">
              <span className="material-symbols-outlined text-xl text-primary">arrow_back</span>
            </button>
            <button onClick={() => navigate('/')} className="size-10 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center hover:bg-surface-darker transition-colors" title="Go home">
              <span className="material-symbols-outlined text-xl text-primary">home</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold">Edit Item</h1>
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="bg-surface-dark p-6 rounded-[32px] border border-gray-800 shadow-xl space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-2xl h-14 w-14 border bg-primary/10 text-primary border-primary/20">
              <span className="material-symbols-outlined text-3xl">{getIcon(editingFile.type)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">File Name</p>
              <input
                type="text"
                value={tempFileName}
                onChange={(e) => setTempFileName(e.target.value)}
                className="w-full bg-surface-darker border border-gray-800 rounded-xl px-4 py-2 text-white font-bold text-base focus:border-primary/50 focus:outline-none transition-colors"
                placeholder="Enter file name"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{editingFile.size}</p>
            <span className="text-gray-700 text-[10px]">•</span>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{editingFile.addedDate}</p>
          </div>
        </div>

        {editingFile.type === 'note' && editingFile.content && (
          <div className="bg-surface-dark p-6 rounded-[32px] border border-primary/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Message Content</h3>
              <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={tempIsEncrypted}
                  onChange={(e) => setTempIsEncrypted(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="font-bold uppercase">Encrypt</span>
              </label>
            </div>
            <textarea
              value={tempContent}
              onChange={(e) => setTempContent(e.target.value)}
              className="w-full bg-surface-darker border border-gray-800 rounded-2xl px-4 py-3 text-white text-sm leading-relaxed focus:border-primary/50 focus:outline-none transition-colors font-sans min-h-[200px] resize-none"
              placeholder="Edit your message here..."
            />
          </div>
        )}

        {editingFile.type === 'audio' && editingFile.audioData && (
          <div className="bg-surface-dark p-6 rounded-[32px] border border-primary/20 shadow-xl">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Audio Recording</h3>
            <AudioPlayer src={editingFile.audioData} />
          </div>
        )}

        <div className="flex-1 space-y-4">
          {tempRecipientIds.length === 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <p className="text-yellow-500 text-sm font-bold uppercase tracking-wide">No recipients assigned</p>
              <p className="text-yellow-500/80 text-xs mt-1">Select recipients below to assign this item, or save for later</p>
            </div>
          )}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Who should receive this?</h2>
            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
              {tempRecipientIds.length} Selected
            </span>
          </div>
          
          <div className="space-y-3">
            {recipients.length === 0 ? (
              <div className="py-12 text-center bg-surface-dark/40 rounded-3xl border border-dashed border-gray-800">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No recipients yet</p>
                <button onClick={() => navigate('/add-recipient')} className="text-primary text-[10px] font-black uppercase tracking-widest mt-2 hover:underline">Add someone</button>
              </div>
            ) : (
              recipients.map(r => (
                <label
                  key={r._id}
                  className={`flex items-center gap-4 p-4 rounded-[24px] bg-surface-dark border transition-all cursor-pointer select-none ${(tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())) ? 'border-primary shadow-[0_0_15px_rgba(23,84,207,0.1)]' : 'border-gray-800'}`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all bg-surface-darker ${(tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())) ? 'border-primary grayscale-0' : 'border-gray-800 grayscale'}`}>
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} className="h-full w-full object-cover" alt={r.name} />
                      ) : (
                        <span className="text-primary font-black text-xs uppercase">{getInitials(r.name)}</span>
                      )}
                    </div>
                    {(tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())) && (
                      <div className="absolute -top-1 -right-1 size-5 bg-primary rounded-full border-2 border-surface-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px] text-white font-black">check</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold transition-colors ${(tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())) ? 'text-white' : 'text-gray-400'}`}>{r.name}</p>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{r.relationship}</p>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())}
                    onChange={() => toggleRecipient(r._id)} 
                  />
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${(tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())) ? 'bg-primary border-primary' : 'border-gray-700'}`}>
                    {(tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())) && <span className="material-symbols-outlined text-[16px] text-white">check</span>}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 md:left-56 right-0 p-4 bg-background-dark/95 border-t border-gray-800 z-[60] space-y-3">
          {saveError && (
            <div className="md:max-w-2xl md:mx-auto p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-bold">
              {saveError}
            </div>
          )}
          <div className="md:max-w-2xl md:mx-auto flex gap-3">
            <button
              onClick={handleDeleteFile}
              disabled={isSaving}
              className="flex-1 h-16 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
            <button
              onClick={saveEdit}
              disabled={isSaving}
              className="flex-[2] h-16 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              <span className="material-symbols-outlined">{isSaving ? 'hourglass_empty' : 'check'}</span>
            </button>
          </div>
        </div>

        {/* Delete Modal */}
        {modal?.type === 'delete' && ReactDOM.createPortal(
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm ${closingModal === 'delete' ? 'animate-out fade-out duration-[180ms]' : 'animate-in fade-in duration-200'}`}>
            <div className={`bg-surface-dark border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl ${closingModal === 'delete' ? 'animate-out zoom-out-95 slide-out-to-bottom-2 duration-[180ms]' : 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'}`}>
              <h3 className="text-xl font-black text-white mb-2">Delete Item</h3>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to permanently delete "{editingFile.name}"? This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => closeWithAnimation('delete', () => setModal(null))}
                  className="flex-1 h-12 bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 h-12 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
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
          <h1 className="text-xl font-bold">My Items</h1>
          <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Guardian Angel DMS</p>
        </div>
        <div className="flex gap-2">
          {canAccessFeatures !== false && (
            <button onClick={() => navigate('/upload')} className="size-10 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors" title="Add new item">
              <span className="material-symbols-outlined">add</span>
            </button>
          )}
          <button onClick={handlePurge} className={`size-10 rounded-full flex items-center justify-center transition-colors ${files.length > 0 ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-700'}`}>
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
      </header>

      {files.length > 0 && canAccessFeatures !== false && (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Synced & Secure</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col space-y-4">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="size-20 rounded-full bg-surface-dark border border-gray-800 flex items-center justify-center mb-6 shadow-2xl">
              <span className="material-symbols-outlined text-4xl text-gray-700">lock_open</span>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">No Items Yet</h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 mb-8 max-w-[200px] leading-relaxed">
              Add files, messages, or recordings to share.
            </p>
            <button onClick={() => canAccessFeatures !== false ? navigate('/upload') : navigate('/pricing')} className="px-8 py-4 bg-primary rounded-2xl text-white font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all">
              <span className="material-symbols-outlined">{canAccessFeatures !== false ? 'upload_file' : 'lock'}</span>
              {canAccessFeatures !== false ? 'Add First Item' : 'Upgrade to Add Items'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-1">{files.length} {files.length === 1 ? 'Item' : 'Items'}</h2>
            <div className="space-y-3">
              {files.map(file => (
                <div
                  key={file._id}
                  onClick={() => openPreview(file)}
                  className="group relative flex items-center justify-between gap-4 p-5 rounded-[28px] bg-surface-dark border border-gray-800 shadow-lg hover:border-primary/40 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex items-center justify-center rounded-2xl h-14 w-14 border bg-primary/10 text-primary border-primary/20 shadow-inner group-hover:bg-primary/20 transition-colors overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary/60"
                    >
                      {file.type === 'image' && file.imageStorageId ? (
                        <ImagePreviewThumbnail storageId={file.imageStorageId} fileName={file.name} />
                      ) : file.type === 'audio' && file.audioStorageId ? (
                        <span className="material-symbols-outlined text-3xl">volume_2</span>
                      ) : file.type === 'note' ? (
                        <span className="material-symbols-outlined text-3xl">note</span>
                      ) : (
                        <span className="material-symbols-outlined text-3xl">{getIcon(file.type)}</span>
                      )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <p className="text-white text-base font-bold truncate group-hover:text-primary transition-colors">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-blue-300 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider truncate bg-primary/20">
                          {getRecipientName(file.recipientIds || [])}
                        </span>
                        <span className="text-gray-600 text-[9px] font-black uppercase tracking-wider truncate">{file.size}</span>
                      </div>
                      {file.type === 'note' && file.content && (
                        <p className="text-gray-400 text-[9px] mt-2 line-clamp-2">{file.content}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFromList(file._id as unknown as string, file.name);
                      }}
                      className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 text-gray-500"
                      title="Delete this item"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                      <span className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">Delete</span>
                    </button>
                    <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-primary">manage_accounts</span>
                      <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Access</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* File Preview Modal — rendered via portal so fixed positioning is relative to viewport, not the animated Vault container */}
      {previewingFile && ReactDOM.createPortal(
        <div
          onClick={closePreview}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm ${closingModal === 'preview' ? 'animate-out fade-out duration-[180ms]' : 'animate-in fade-in duration-200'}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-surface-dark border border-gray-800 rounded-3xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden ${closingModal === 'preview' ? 'animate-out zoom-out-95 slide-out-to-bottom-4 duration-[180ms]' : 'animate-in zoom-in-95 slide-in-from-bottom-8 duration-300'}`}
            style={{ maxHeight: '75vh' }}
          >
            {/* Fixed header — never scrolls away */}
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-800 bg-surface-dark rounded-t-3xl">
              <h3 className="text-sm sm:text-lg md:text-xl font-black text-white truncate pr-2">{previewingFile.name}</h3>
              <button
                onClick={closePreview}
                className="size-10 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-2xl text-gray-400">close</span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {previewingFile.type === 'image' && previewUrl ? (
                <img src={previewUrl} alt={previewingFile.name} className="w-full h-auto rounded-2xl" />
              ) : previewingFile.type === 'pdf' && previewUrl ? (
                <iframe
                  src={`${previewUrl}#toolbar=1`}
                  className="w-full h-[40vh] sm:h-[60vh] md:h-[70vh] rounded-2xl border border-gray-700"
                  title="PDF Preview"
                />
              ) : previewingFile.type === 'note' && previewingFile.content ? (
                <div className="bg-background-dark rounded-2xl p-6 border border-gray-800">
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">{previewingFile.isEncrypted ? decryptContent(previewingFile.content) : previewingFile.content}</p>
                </div>
              ) : previewingFile.type === 'document' && previewUrl ? (
                <div className="bg-background-dark rounded-2xl p-6 border border-gray-800 text-center">
                  <p className="text-gray-400 mb-4">Preview not available for this document type</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    Download Document
                  </a>
                </div>
              ) : previewingFile.type === 'audio' ? (
                <div className="bg-background-dark rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-5xl md:text-7xl text-primary mx-auto block mb-6">volume_2</span>
                  {previewUrl ? (
                    <>
                      <p className="text-gray-400 mb-6 text-sm">Audio Preview</p>
                      <div className="w-full max-w-sm">
                        <AudioPlayer src={previewUrl} />
                      </div>
                    </>
                  ) : previewingFile.audioData ? (
                    <>
                      <p className="text-gray-400 mb-6 text-sm">Audio Preview</p>
                      <div className="w-full max-w-sm">
                        <AudioPlayer src={previewingFile.audioData} />
                      </div>
                    </>
                  ) : previewingFile.audioStorageId ? (
                    <p className="text-gray-400 text-sm">Loading audio...</p>
                  ) : (
                    <p className="text-gray-500 text-sm">No audio file attached</p>
                  )}
                </div>
              ) : (
                <div className="bg-background-dark rounded-2xl p-8 text-center">
                  <p className="text-gray-400">Preview not available for this file type</p>
                </div>
              )}
            </div>

            {/* Fixed footer — never scrolls away */}
            <div className="flex-shrink-0 flex flex-row gap-3 p-5 border-t border-gray-800 bg-surface-dark items-center justify-between">
              <p className="text-gray-500 text-sm whitespace-nowrap">
                {previewingFile.size} • {previewingFile.type.toUpperCase()}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={openEditFromPreview}
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors text-sm"
                >
                  Edit Details
                </button>
                <button
                  onClick={closePreview}
                  className="px-5 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Purge Modal */}
      {modal?.type === 'purge' && ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm ${closingModal === 'purge' ? 'animate-out fade-out duration-[180ms]' : 'animate-in fade-in duration-200'}`}>
          <div className={`bg-surface-dark border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl ${closingModal === 'purge' ? 'animate-out zoom-out-95 slide-out-to-bottom-2 duration-[180ms]' : 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'}`}>
            <h3 className="text-xl font-black text-white mb-2">Delete All Items</h3>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete all {files.length} items? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => closeWithAnimation('purge', () => setModal(null))}
                className="flex-1 h-12 bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurge}
                className="flex-1 h-12 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* List Delete Modal */}
      {modal?.type === 'listDelete' && ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm ${closingModal === 'listDelete' ? 'animate-out fade-out duration-[180ms]' : 'animate-in fade-in duration-200'}`}>
          <div className={`bg-surface-dark border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl ${closingModal === 'listDelete' ? 'animate-out zoom-out-95 slide-out-to-bottom-2 duration-[180ms]' : 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'}`}>
            <h3 className="text-xl font-black text-white mb-2">Delete Item</h3>
            <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete "{modal.fileName}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => closeWithAnimation('listDelete', () => setModal(null))}
                className="flex-1 h-12 bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => closeWithAnimation('listDelete', () => confirmDeleteFromList())}
                className="flex-1 h-12 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Vault;